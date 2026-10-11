mod duration;
mod error;
mod jira;
mod routes;
mod settings;
#[cfg(feature = "embed-ui")]
mod ui;

use std::{sync::Arc, time::Duration};

use clap::Parser;
use tokio::sync::RwLock;
use tracing_subscriber::EnvFilter;

const DEFAULT_ADDR: &str = "127.0.0.1:3000";

/// Logs work to Jira Tempo. Listens on VELOCITEMPO_ADDR (default 127.0.0.1:3000).
#[derive(Parser)]
#[command(version, about)]
struct Args {
    /// Open the UI in the default browser once listening.
    // Only release builds serve the UI; in development it comes from Vite.
    #[cfg(feature = "embed-ui")]
    #[arg(long)]
    open: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let args = Args::parse();
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
    if args.open {
        ui::open_browser(listener.local_addr()?);
    }
    #[cfg(not(feature = "embed-ui"))]
    let _ = args;
    axum::serve(listener, routes::router(state)).await?;
    Ok(())
}
