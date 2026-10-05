use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};

/// Errors are sent as `{ error, code, params }`: `error` is an English message, `code` + `params` let the UI show a
/// translated one. Codes are part of the API contract (see CLAUDE.md).
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Jira is not configured. Open Settings and enter the server URL and personal access token.")]
    NotConfigured,
    #[error("Jira server URL must start with https:// or http://")]
    InvalidUrl,
    #[error("Unsupported language {0:?}")]
    InvalidLanguage(String),
    #[error("Jira rejected the personal access token")]
    TokenRejected,
    #[error("Jira responded with {status}: {detail}")]
    Jira { status: u16, detail: String },
    #[error("Could not reach Jira: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Could not save settings: {0}")]
    Io(#[from] std::io::Error),
    // Per-worklog validation (reported in the worklog results, not as a response status).
    #[error("Invalid {field} time {value:?}")]
    InvalidDuration { field: &'static str, value: String },
    #[error("Issue and date are required")]
    MissingFields,
    #[error("{value:?} is not an option of Tempo attribute {attribute:?}")]
    UnknownOption { value: String, attribute: String },
    #[error("Tempo work attribute {0} not found")]
    MissingAttribute(&'static str),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::NotConfigured => "not_configured",
            AppError::InvalidUrl => "invalid_url",
            AppError::InvalidLanguage(_) => "invalid_language",
            AppError::TokenRejected => "token_rejected",
            AppError::Jira { .. } => "jira",
            AppError::Http(_) => "unreachable",
            AppError::Io(_) => "io",
            AppError::InvalidDuration { .. } => "invalid_duration",
            AppError::MissingFields => "missing_fields",
            AppError::UnknownOption { .. } => "unknown_option",
            AppError::MissingAttribute(_) => "missing_attribute",
        }
    }

    fn params(&self) -> Value {
        match self {
            AppError::InvalidLanguage(language) => json!({ "value": language }),
            AppError::Jira { status, detail } => json!({ "status": status, "detail": detail }),
            AppError::Http(e) => json!({ "detail": e.to_string() }),
            AppError::Io(e) => json!({ "detail": e.to_string() }),
            AppError::InvalidDuration { field, value } => json!({ "field": field, "value": value }),
            AppError::UnknownOption { value, attribute } => json!({ "value": value, "attribute": attribute }),
            AppError::MissingAttribute(key) => json!({ "key": key }),
            _ => json!({}),
        }
    }

    /// `{ error, code, params }`
    pub fn body(&self) -> Value {
        json!({ "error": self.to_string(), "code": self.code(), "params": self.params() })
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::Jira { .. } | AppError::Http(_) | AppError::TokenRejected => StatusCode::BAD_GATEWAY,
            AppError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
            _ => StatusCode::BAD_REQUEST,
        };
        if status.is_server_error() {
            tracing::warn!("{self}");
        }
        (status, Json(self.body())).into_response()
    }
}
