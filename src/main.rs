mod duration;
mod error;
mod jira;
mod routes;
mod settings;
#[cfg(feature = "embed-ui")]
mod ui;

use std::{sync::Arc, time::Duration};

use tokio::sync::RwLock;
use tracing_subscriber::EnvFilter;

const DEFAULT_ADDR: &str = "127.0.0.1:3000";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let open = parse_args()?;
    let settings_path = settings::path();
    let settings =
        settings::load(&settings_path).map_err(|e| format!("could not read {}: {e}", settings_path.display()))?;
    tracing::info!("settings: {}", settings_path.display());

    let state = Arc::new(routes::AppState {
        http: reqwest::Client::builder().timeout(Duration::from_secs(30)).build()?,
        settings_path,
        settings: RwLock::new(settings),
    });

    // Localhost only by default: the server holds the Jira token and has no auth of its own.
    let addr = std::env::var("VELOCITEMPO_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.into());
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("listening on http://{addr}");
    #[cfg(feature = "embed-ui")]
    if open {
        ui::open_browser(listener.local_addr()?);
    }
    #[cfg(not(feature = "embed-ui"))]
    let _ = open;
    axum::serve(listener, routes::router(state)).await?;
    Ok(())
}

/// Returns whether `--open` was given: open the embedded UI in the default browser once listening. Only release
/// builds (feature `embed-ui`) accept it; in development the UI comes from Vite.
fn parse_args() -> Result<bool, String> {
    let mut open = false;
    for arg in std::env::args().skip(1) {
        match arg.as_str() {
            "--open" if cfg!(feature = "embed-ui") => open = true,
            _ => return Err(format!("unknown argument {arg:?}")),
        }
    }
    Ok(open)
}
