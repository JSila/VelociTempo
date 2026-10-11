//! Minimal client for Jira Server/Data Center (REST API v2) and Tempo Timesheets, authenticated with a
//! personal access token.

use reqwest::{Client, RequestBuilder};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;

use crate::{error::AppError, settings::Settings};

const MAX_ISSUES: usize = 20;

pub struct Jira<'a> {
    http: &'a Client,
    base_url: &'a str,
    token: &'a SecretString,
}

#[derive(Serialize)]
pub struct Issue {
    pub key: String,
    pub summary: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkAttribute {
    pub id: u64,
    pub key: String,
    pub name: String,
    #[serde(default)]
    pub static_list_values: Vec<StaticListValue>,
}

#[derive(Deserialize)]
pub struct StaticListValue {
    pub name: String,
    pub value: String,
    #[serde(default)]
    pub removed: bool,
}

impl<'a> Jira<'a> {
    pub fn new(http: &'a Client, settings: &'a Settings) -> Result<Self, AppError> {
        if settings.jira_url.is_empty() || settings.jira_token.expose_secret().is_empty() {
            return Err(AppError::NotConfigured);
        }
        Ok(Self {
            http,
            base_url: &settings.jira_url,
            token: &settings.jira_token,
        })
    }

    /// Issues whose key or summary matches `query`, via Jira's issue picker (the same search the Jira UI uses).
    pub async fn search_issues(&self, query: &str) -> Result<Vec<Issue>, AppError> {
        #[derive(Deserialize)]
        struct Picker {
            #[serde(default)]
            sections: Vec<Section>,
        }
        #[derive(Deserialize)]
        struct Section {
            #[serde(default)]
            issues: Vec<PickerIssue>,
        }
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct PickerIssue {
            key: String,
            summary_text: String,
        }

        let picker: Picker = self
            .send(self.get("/rest/api/2/issue/picker").query(&[
                ("query", query),
                // Search all issues, not only the ones in the user's history.
                ("currentJQL", "ORDER BY updated DESC"),
                ("showSubTasks", "true"),
                ("showSubTaskParent", "true"),
            ]))
            .await?;

        // History and current-search sections overlap; keep the first occurrence of each key.
        let mut issues: Vec<Issue> = Vec::new();
        for issue in picker.sections.into_iter().flat_map(|s| s.issues) {
            if !issues.iter().any(|i| i.key == issue.key) {
                issues.push(Issue {
                    key: issue.key,
                    summary: issue.summary_text,
                });
            }
        }
        issues.truncate(MAX_ISSUES);
        Ok(issues)
    }

    /// The Jira user key (e.g. `JIRAUSER12345`) of the token's owner, which Tempo calls the worker.
    pub async fn my_user_key(&self) -> Result<String, AppError> {
        #[derive(Deserialize)]
        struct Myself {
            key: String,
        }
        let me: Myself = self.send(self.get("/rest/api/2/myself")).await?;
        Ok(me.key)
    }

    pub async fn work_attributes(&self) -> Result<Vec<WorkAttribute>, AppError> {
        self.send(self.get("/rest/tempo-core/1/work-attribute")).await
    }

    pub async fn create_tempo_worklog(&self, body: &Value) -> Result<(), AppError> {
        let _: Value = self
            .send(self.http.post(self.url("/rest/tempo-timesheets/4/worklogs")).json(body))
            .await?;
        Ok(())
    }

    fn url(&self, path: &str) -> String {
        format!("{}{path}", self.base_url)
    }

    fn get(&self, path: &str) -> RequestBuilder {
        self.http.get(self.url(path))
    }

    async fn send<T: DeserializeOwned>(&self, request: RequestBuilder) -> Result<T, AppError> {
        let response = request.bearer_auth(self.token.expose_secret()).send().await?;
        let status = response.status();
        if status.is_success() {
            return Ok(response.json().await?);
        }
        let body = response.text().await.unwrap_or_default();
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(AppError::TokenRejected);
        }
        let detail = error_message(&body).unwrap_or_else(|| status.canonical_reason().unwrap_or("error").to_owned());
        Err(AppError::Jira {
            status: status.as_u16(),
            detail,
        })
    }
}

/// Pulls readable messages out of Jira (`errorMessages`, `errors: {field: msg}`) and Tempo
/// (`errors: [{message}]`, `message`) error bodies.
fn error_message(body: &str) -> Option<String> {
    let json: Value = serde_json::from_str(body).ok()?;
    let mut messages: Vec<String> = Vec::new();
    let mut push = |v: &Value| match v {
        Value::String(s) => messages.push(s.clone()),
        Value::Object(o) => {
            if let Some(Value::String(s)) = o.get("message") {
                messages.push(s.clone());
            }
        }
        _ => {}
    };
    if let Some(Value::Array(items)) = json.get("errorMessages") {
        items.iter().for_each(&mut push);
    }
    match json.get("errors") {
        Some(Value::Array(items)) => items.iter().for_each(&mut push),
        Some(Value::Object(fields)) => fields.values().for_each(&mut push),
        _ => {}
    }
    if let Some(message) = json.get("message") {
        push(message);
    }
    (!messages.is_empty()).then(|| messages.join("; "))
}
