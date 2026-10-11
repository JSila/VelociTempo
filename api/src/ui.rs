//! The built UI (`../ui/dist`) compiled into the binary, served for everything outside `/api` (feature `embed-ui`).

use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr};

use axum::{
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../ui/dist"]
struct Assets;

/// Router fallback: a file from `dist`, otherwise `index.html` so client-side routes survive a reload.
pub async fn serve(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    if let Some(response) = file(path) {
        return response;
    }
    if path == "api" || path.starts_with("api/") {
        return StatusCode::NOT_FOUND.into_response();
    }
    file("index.html").unwrap_or_else(|| StatusCode::NOT_FOUND.into_response())
}

fn file(path: &str) -> Option<Response> {
    let file = Assets::get(path)?;
    // Vite puts content-hashed names under assets/; index.html must be revalidated to pick up a new build.
    let cache = if path.starts_with("assets/") {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };
    Some(
        (
            [
                (header::CONTENT_TYPE, file.metadata.mimetype().to_owned()),
                (header::CACHE_CONTROL, cache.to_owned()),
            ],
            file.data,
        )
            .into_response(),
    )
}

/// For `--open`. A wildcard bind address (`0.0.0.0`) isn't browsable, so that one goes to localhost.
pub fn open_browser(addr: SocketAddr) {
    let mut addr = addr;
    if addr.ip().is_unspecified() {
        addr.set_ip(if addr.is_ipv4() {
            Ipv4Addr::LOCALHOST.into()
        } else {
            Ipv6Addr::LOCALHOST.into()
        });
    }
    let url = format!("http://{addr}/");
    // Not fatal: the server is up either way and the URL is in the log.
    if let Err(e) = open::that_detached(&url) {
        tracing::warn!("could not open {url} in a browser: {e}");
    }
}
