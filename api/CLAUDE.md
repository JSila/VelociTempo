# Velocitempo API

Backend for `../ui`. Rust (edition 2024) + axum 0.8 + reqwest 0.13 (rustls). Stores the Jira settings, searches Jira
issues for the UI's autocomplete, and creates worklogs through **Tempo Timesheets** on our **Jira Server 10.3**.

## Commands

```sh
cargo run           # 127.0.0.1:3000 (override: VELOCITEMPO_ADDR); the UI's Vite dev server proxies /api here
cargo test          # unit tests (duration parsing)
cargo clippy --all-targets
cargo fmt           # rustfmt.toml: max_width = 120
RUST_LOG=debug cargo run
```

Release is a single binary that also serves the UI: `cd ../ui && yarn release` (= `yarn build` + `cargo build
--release --features embed-ui`) → `target/release/velocitempo` (the `[[bin]]` name; the package is still
`velocitempo-api`). Feature `embed-ui` (`src/ui.rs`, rust-embed) compiles `../ui/dist` in and adds a router fallback:
files from `dist` (`assets/*` cached immutable, the rest `no-cache`), unknown `/api/*` → 404, anything else →
`index.html`. It also enables `velocitempo --open`, which opens the UI in the default browser once listening (`open`
crate; failure only logs a warning). It's off by default; in development Vite serves the UI and proxies `/api`, and
any argument, `--open` included, is rejected as unknown.

Settings live in `$XDG_CONFIG_HOME/velocitempo.json` (default `~/.config/velocitempo.json`), written atomically with
mode 0600 because it holds the token. For local testing point `XDG_CONFIG_HOME` at a temp dir, run a mock Jira (the
real one creates real worklogs) and bind elsewhere (`VELOCITEMPO_ADDR=127.0.0.1:3001`): the user's own instance often
runs on :3000 against the real Jira, and a second `cargo run` there fails with "Address already in use".

## Structure

```
src/
  main.rs       # tracing, load settings, bind, serve
  ui.rs         # embedded ../ui/dist + SPA fallback (feature embed-ui)
  routes.rs     # AppState, router, handlers, Tempo worklog body + attribute mapping
  jira.rs       # Jira/Tempo HTTP client (Bearer PAT), error-message extraction
  settings.rs   # load/save velocitempo.json
  duration.rs   # "1h 30m" → seconds (d = 8h, w = 5d)
  error.rs      # AppError → JSON { error } with status
```

## HTTP API (consumed by ../ui)

- `GET /api/settings` → `{ jiraUrl, hasToken, language }` — the token is never returned; `language` is `en`/`sl` or
  empty (not chosen yet).
- `PUT /api/settings` `{ jiraUrl, jiraToken?, language? }` → same shape; empty/missing token and missing language keep
  the saved ones. URL is trimmed of trailing `/` and must be http(s); language must be one of `settings::LANGUAGES`.
- `GET /api/tickets?q=` → `[{ key, summary }]` (max 20) via Jira's `GET /rest/api/2/issue/picker` with
  `currentJQL=ORDER BY updated DESC` so it searches all issues, not just history; sections are de-duplicated by key.
- `POST /api/worklogs` `{ worklogs: [{ date, ticket, description, worked, billable, type, workLocation, orwh }] }` →
  `{ created, results: [{ ok: true } | { ok: false, error, code, params }] }` — one result per worklog, in order.
  Created sequentially; a failing entry doesn't stop the rest, and the UI removes the succeeded ones so a resubmit
  can't duplicate them.
- Errors: `{ error, code, params }` (`AppError::body`) with 400 (not configured / bad input), 502 (Jira error, rejected
  token, unreachable), 500 (file I/O). `error` is English; the UI translates by `code`, so codes and params are API:
  `not_configured`, `invalid_url`, `invalid_language {value}`, `token_rejected`, `jira {status, detail}`,
  `unreachable {detail}`, `io {detail}`, and per worklog `invalid_duration {field, value}`, `missing_fields`,
  `unknown_option {value, attribute}`, `missing_attribute {key}`. Adding a code → add `errors.api.<code>` to both UI
  dictionaries.

## Jira / Tempo specifics

- Auth: `Authorization: Bearer <personal access token>` (Jira Server/DC). Worker = `GET /rest/api/2/myself` → `key`
  (e.g. `JIRAUSER12345`).
- Create: `POST /rest/tempo-timesheets/4/worklogs` with `worker`, `originTaskId` (issue key), `started` (YYYY-MM-DD),
  `timeSpentSeconds`, `billableSeconds`, `comment`, `includeNonWorkingDays: true`, and `attributes`
  `{ <key>: { name, workAttributeId, value } }`.
- Work attributes are read per submit from `GET /rest/tempo-core/1/work-attribute`. Keys on our Jira:
  `_Type_` (static list), `_WorkLocation_` (static list), `_Outsideregularworkinghours_` (checkbox, value
  `"true"`/`"false"`). The UI sends static-list **names** ("Home Office"); the backend maps them to Tempo **values**
  ("HomeOffice") case-insensitively, skipping removed options.

### Inspecting Tempo attributes and their options

To see the attribute keys and the allowed option names/values for Type and Work location, e.g. after an admin changes
them in Tempo → Settings → Work Attributes (fish; keep the token out of the command line and shell history):

```fish
set -x TOKEN (read -s -P 'Token: ')
# Deployment type and version (no auth needed): expect "Server", "10.3.x"
curl -s https://jira.mikrografija.si/rest/api/2/serverInfo | jq '.deploymentType, .version'
# Work attributes: key, name, type and, for static lists, staticListValues[{ name, value, removed }]
curl -s -H "Authorization: Bearer $TOKEN" https://jira.mikrografija.si/rest/tempo-core/1/work-attribute | jq
# Just option name → value per static-list attribute
curl -s -H "Authorization: Bearer $TOKEN" https://jira.mikrografija.si/rest/tempo-core/1/work-attribute \
    | jq '.[] | select(.type.value == "STATIC_LIST")
          | {key, options: [.staticListValues[] | select(.removed | not) | {name, value}]}'
```

The UI's option lists (`ui/src/features/worklog/types.ts`, `WORK_TYPES` / `WORK_LOCATIONS`) must use the `name`s
from this response; the backend sends the matching `value` to Tempo. If a key changes, update the `*_ATTRIBUTE`
constants in `src/routes.rs`.
