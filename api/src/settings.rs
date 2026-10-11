use std::{io, path::Path, path::PathBuf};

use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize, Serializer};

/// Contents of `~/.config/velocitempo.json`.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub jira_url: String,
    /// Kept in a `SecretString` so it can't end up in logs or `Debug` output; only the settings file gets it.
    #[serde(default, serialize_with = "expose")]
    pub jira_token: SecretString,
    /// UI language, one of `LANGUAGES`.
    #[serde(default = "default_language")]
    pub language: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            jira_url: String::new(),
            jira_token: SecretString::default(),
            language: default_language(),
        }
    }
}

pub const LANGUAGES: [&str; 2] = ["en", "sl"];
pub const DEFAULT_LANGUAGE: &str = "en";

fn default_language() -> String {
    DEFAULT_LANGUAGE.to_owned()
}

/// `SecretString` deliberately isn't `Serialize`; the settings file is the one place the token is written.
fn expose<S: Serializer>(token: &SecretString, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(token.expose_secret())
}

/// `$XDG_CONFIG_HOME/velocitempo.json`, i.e. `~/.config/velocitempo.json` by default.
pub fn path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("velocitempo.json")
}

pub fn load(path: &Path) -> io::Result<Settings> {
    match std::fs::read(path) {
        Ok(bytes) => {
            let mut settings: Settings = serde_json::from_slice(&bytes).map_err(io::Error::other)?;
            // Files from before English became the default store "" for "not chosen yet".
            if settings.language.is_empty() {
                settings.language = default_language();
            }
            Ok(settings)
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(e) => Err(e),
    }
}

/// Writes atomically (temp file + rename), readable by the owner only since it holds the token.
pub fn save(path: &Path, settings: &Settings) -> io::Result<()> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn language_defaults_to_english() {
        assert_eq!(Settings::default().language, "en");
        let missing: Settings = serde_json::from_str(r#"{ "jiraUrl": "https://jira" }"#).unwrap();
        assert_eq!(missing.language, "en");
    }

    #[test]
    fn token_round_trips_through_the_file() {
        let dir = std::env::temp_dir().join(format!("velocitempo-test-{}", std::process::id()));
        let path = dir.join("velocitempo.json");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            &path,
            r#"{ "jiraUrl": "https://jira", "jiraToken": "pat", "language": "" }"#,
        )
        .unwrap();

        let settings = load(&path).unwrap();
        assert_eq!(settings.jira_token.expose_secret(), "pat");
        assert_eq!(settings.language, "en");

        save(&path, &settings).unwrap();
        let saved: serde_json::Value = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert_eq!(saved["jiraToken"], "pat");
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
