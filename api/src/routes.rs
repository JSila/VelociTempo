use std::{path::PathBuf, sync::Arc};

use axum::{
    Json, Router,
    extract::{Query, State},
    routing::get,
};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use tokio::sync::RwLock;

use crate::{
    duration,
    error::AppError,
    jira::{Issue, Jira, WorkAttribute},
    settings::{self, Settings},
};

// Tempo work attribute keys configured on our Jira (see GET /rest/tempo-core/1/work-attribute).
const TYPE_ATTRIBUTE: &str = "_Type_";
const LOCATION_ATTRIBUTE: &str = "_WorkLocation_";
const ORWH_ATTRIBUTE: &str = "_Outsideregularworkinghours_";

pub struct AppState {
    pub http: reqwest::Client,
    pub settings_path: PathBuf,
    pub settings: RwLock<Settings>,
}

type SharedState = State<Arc<AppState>>;

pub fn router(state: Arc<AppState>) -> Router {
    let router = Router::new()
        .route("/api/settings", get(get_settings).put(put_settings))
        .route("/api/tickets", get(search_tickets))
        .route("/api/worklogs", axum::routing::post(create_worklogs));
    #[cfg(feature = "embed-ui")]
    let router = router.fallback(crate::ui::serve);
    router.with_state(state)
}

// --- Settings ---

/// The token is never sent back to the browser; the UI only learns whether one is saved.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsView {
    jira_url: String,
    has_token: bool,
    language: String,
}

impl From<&Settings> for SettingsView {
    fn from(s: &Settings) -> Self {
        Self {
            jira_url: s.jira_url.clone(),
            has_token: !s.jira_token.expose_secret().is_empty(),
            language: s.language.clone(),
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsUpdate {
    jira_url: String,
    /// Omitted or empty keeps the saved token.
    #[serde(default)]
    jira_token: Option<SecretString>,
    /// Omitted keeps the saved language.
    #[serde(default)]
    language: Option<String>,
}

async fn get_settings(State(state): SharedState) -> Json<SettingsView> {
    Json(SettingsView::from(&*state.settings.read().await))
}

async fn put_settings(
    State(state): SharedState,
    Json(update): Json<SettingsUpdate>,
) -> Result<Json<SettingsView>, AppError> {
    let jira_url = update.jira_url.trim().trim_end_matches('/').to_owned();
    if !jira_url.is_empty() && !(jira_url.starts_with("https://") || jira_url.starts_with("http://")) {
        return Err(AppError::InvalidUrl);
    }
    if let Some(language) = &update.language
        && !settings::LANGUAGES.contains(&language.as_str())
    {
        return Err(AppError::InvalidLanguage(language.clone()));
    }

    let mut settings = state.settings.write().await;
    let mut next = settings.clone();
    next.jira_url = jira_url;
    if let Some(token) = update
        .jira_token
        .as_ref()
        .map(|t| t.expose_secret().trim())
        .filter(|t| !t.is_empty())
    {
        next.jira_token = token.into();
    }
    if let Some(language) = update.language {
        next.language = language;
    }
    settings::save(&state.settings_path, &next)?;
    *settings = next;
    Ok(Json(SettingsView::from(&*settings)))
}

// --- Issue search ---

#[derive(Deserialize)]
struct SearchParams {
    q: String,
}

async fn search_tickets(
    State(state): SharedState,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<Issue>>, AppError> {
    let settings = state.settings.read().await.clone();
    let query = params.q.trim();
    if query.is_empty() {
        return Ok(Json(Vec::new()));
    }
    Ok(Json(Jira::new(&state.http, &settings)?.search_issues(query).await?))
}

// --- Worklogs ---

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorklogIn {
    /// ISO date, YYYY-MM-DD
    date: String,
    ticket: String,
    description: String,
    worked: String,
    billable: String,
    r#type: String,
    work_location: String,
    orwh: bool,
}

#[derive(Deserialize)]
struct WorklogsRequest {
    worklogs: Vec<WorklogIn>,
}

#[derive(Serialize)]
struct WorklogsResponse {
    created: usize,
    /// One per submitted worklog, in order: `{ ok: true }` or `{ ok: false, error, code, params }`, so the UI can
    /// keep only the failed ones.
    results: Vec<Value>,
}

async fn create_worklogs(
    State(state): SharedState,
    Json(request): Json<WorklogsRequest>,
) -> Result<Json<WorklogsResponse>, AppError> {
    let settings = state.settings.read().await.clone();
    let jira = Jira::new(&state.http, &settings)?;
    let (worker, attributes) = tokio::try_join!(jira.my_user_key(), jira.work_attributes())?;

    let mut results = Vec::with_capacity(request.worklogs.len());
    // Sequential on purpose: keeps Tempo's per-day validation (e.g. daily limits) deterministic.
    for worklog in &request.worklogs {
        let outcome = match tempo_worklog(worklog, &worker, &attributes) {
            Ok(body) => jira.create_tempo_worklog(&body).await,
            Err(e) => Err(e),
        };
        results.push(match outcome {
            Ok(()) => json!({ "ok": true }),
            Err(e) => {
                tracing::warn!(ticket = worklog.ticket, "worklog not created: {e}");
                let mut result = e.body();
                result["ok"] = json!(false);
                result
            }
        });
    }
    let created = results.iter().filter(|r| r["ok"] == true).count();
    Ok(Json(WorklogsResponse { created, results }))
}

/// Builds the body for `POST /rest/tempo-timesheets/4/worklogs`.
fn tempo_worklog(worklog: &WorklogIn, worker: &str, attributes: &[WorkAttribute]) -> Result<Value, AppError> {
    let seconds = |field: &'static str, value: &str| {
        duration::parse_seconds(value).ok_or_else(|| AppError::InvalidDuration {
            field,
            value: value.to_owned(),
        })
    };
    let worked = seconds("worked", &worklog.worked)?;
    let billable = seconds("billable", &worklog.billable)?;
    if worklog.ticket.trim().is_empty() || worklog.date.trim().is_empty() {
        return Err(AppError::MissingFields);
    }

    let mut attrs = Map::new();
    for (key, label) in [
        (TYPE_ATTRIBUTE, &worklog.r#type),
        (LOCATION_ATTRIBUTE, &worklog.work_location),
    ] {
        let attribute = find_attribute(attributes, key)?;
        // The UI sends display names ("Home Office"); Tempo stores values ("HomeOffice").
        let option = attribute
            .static_list_values
            .iter()
            .find(|v| !v.removed && v.name.eq_ignore_ascii_case(label))
            .ok_or_else(|| AppError::UnknownOption {
                value: label.clone(),
                attribute: attribute.name.clone(),
            })?;
        attrs.insert(key.into(), attribute_value(attribute, &option.value));
    }
    let orwh = find_attribute(attributes, ORWH_ATTRIBUTE)?;
    attrs.insert(
        ORWH_ATTRIBUTE.into(),
        attribute_value(orwh, if worklog.orwh { "true" } else { "false" }),
    );

    Ok(json!({
        "worker": worker,
        "originTaskId": worklog.ticket.trim(),
        "started": worklog.date.trim(),
        "timeSpentSeconds": worked,
        "billableSeconds": billable,
        "comment": worklog.description.trim(),
        "includeNonWorkingDays": true,
        "attributes": attrs,
    }))
}

fn find_attribute<'a>(attributes: &'a [WorkAttribute], key: &'static str) -> Result<&'a WorkAttribute, AppError> {
    attributes
        .iter()
        .find(|a| a.key == key)
        .ok_or(AppError::MissingAttribute(key))
}

fn attribute_value(attribute: &WorkAttribute, value: &str) -> Value {
    json!({ "name": attribute.name, "workAttributeId": attribute.id, "value": value })
}
