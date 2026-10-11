use std::{io, path::PathBuf};

use serde::{Deserialize, Serialize};

/// Contents of `~/.config/velocitempo.json`.
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub jira_url: String,
    #[serde(default)]
    pub jira_token: String,
    /// UI language (`en`, `sl`); empty until the user picks one.
    #[serde(default)]
    pub language: String,
}

pub const LANGUAGES: [&str; 2] = ["en", "sl"];

/// `$XDG_CONFIG_HOME/velocitempo.json`, i.e. `~/.config/velocitempo.json` by default.
pub fn path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("velocitempo.json")
}

pub fn load(path: &PathBuf) -> io::Result<Settings> {
    match std::fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(io::Error::other),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(e) => Err(e),
    }
}

/// Writes atomically (temp file + rename), readable by the owner only since it holds the token.
pub fn save(path: &PathBuf, settings: &Settings) -> io::Result<()> {
    use std::io::Write;

    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
    let mut file = options.open(&tmp)?;
    file.write_all(&serde_json::to_vec_pretty(settings).map_err(io::Error::other)?)?;
    file.sync_all()?;
    std::fs::rename(&tmp, path)
}
