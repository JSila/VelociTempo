# VelociTempo

Log work hours to Jira through Tempo Timesheets. You enter several worklogs at once in a form (date, ticket,
description, time worked, billable time, type, work location, ORWH), and VelociTempo creates them in Tempo on submit.
Ticket fields autocomplete from Jira. The UI is available in English and Slovenian.

Built for Jira Server / Data Center (tested on 10.3) with Tempo Timesheets, using a personal access token.

| Folder | What it is                                                                     |
| ------ | ------------------------------------------------------------------------------ |
| `api/` | Backend: Rust, axum. Stores settings, talks to Jira and Tempo.                 |
| `ui/`  | Frontend: React 19, TypeScript, Vite, Redux Toolkit, Tabler.                   |

## Requirements

- Rust 1.85 or newer (edition 2024)
- Node 22 and Yarn 1

## Development

Run the backend and the frontend in two terminals:

```sh
# terminal 1: API on 127.0.0.1:3000
cd api
cargo run

# terminal 2: UI dev server, proxies /api to the backend
cd ui
yarn install
yarn dev
```

Open the URL Vite prints, click **Settings** and enter your Jira URL and personal access token.

> **Careful:** submitting creates real worklogs in the Jira instance you configured. For testing, point the app at a
> mock Jira, and use a separate settings file and port (see below).

### Configuration

| Variable          | Used by | Default          | Purpose                                     |
| ----------------- | ------- | ---------------- | ------------------------------------------- |
| `VELOCITEMPO_ADDR` | api     | `127.0.0.1:3000` | Address the backend listens on              |
| `VELOCITEMPO_API`  | ui      | `http://localhost:3000` | Backend the Vite dev server proxies `/api` to |
| `XDG_CONFIG_HOME` | api     | `~/.config`      | Folder that holds `velocitempo.json`        |
| `RUST_LOG`        | api     | `info`           | Log level, e.g. `RUST_LOG=debug`            |

Settings (Jira URL, token, language) are saved in `$XDG_CONFIG_HOME/velocitempo.json` with mode `0600`. The token is
never sent back to the browser.

A separate test stack, for example:

```sh
cd api && XDG_CONFIG_HOME=/tmp/vt-test VELOCITEMPO_ADDR=127.0.0.1:3001 cargo run
cd ui  && VELOCITEMPO_API=http://localhost:3001 yarn dev --port 5174
```

### Useful commands

```sh
# api/
cargo test
cargo clippy --all-targets
cargo fmt

# ui/
yarn typecheck
yarn format
yarn build
```

## Release build

The release is a single binary that serves both the UI and the API:

```sh
cd ui
yarn install
yarn release
```

This builds the UI into `ui/dist`, then compiles it into the backend with the `embed-ui` feature. The output is
`api/target/release/velocitempo`.

Run it:

```sh
./velocitempo          # serves on http://127.0.0.1:3000
./velocitempo --open   # also opens the UI in your default browser
./velocitempo --help
```

Copy the binary anywhere, for example `~/.local/bin/`. It needs no other files. Settings are read from and saved to
`~/.config/velocitempo.json`, the same as in development. Use `VELOCITEMPO_ADDR` to listen on a different address.
