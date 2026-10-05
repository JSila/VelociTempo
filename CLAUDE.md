# Velocitempo UI

Frontend for logging work hours to Jira (Server 10.3 + Tempo Timesheets). The user enters worklogs in a multi-line
form; Submit sends them to our backend (`../api`, Rust/axum — see its CLAUDE.md), which creates Tempo worklogs. The
Jira server URL and personal access token are entered in the Settings modal and saved by the backend in
`~/.config/velocitempo.json`; the token is never sent back to the browser.

## Stack

- React 19, TypeScript 7 (native `tsc`), Vite 8 (rolldown), Redux Toolkit + RTK Query, react-redux
- UI: Tabler (`@tabler/core`) CSS + JS components. No other UI kit, no icon library, default system font (Inter
  was deliberately removed — don't re-add custom fonts).
- Package manager: **yarn** (v1). Node 22.

## Commands

```sh
yarn dev            # dev server; /api is proxied to http://localhost:3000 (override: VELOCITEMPO_API=http://…)
yarn build          # tsc -b && vite build
yarn release        # build + `cargo build --release --features embed-ui` in ../api: one binary serving UI and API
yarn typecheck      # tsc -b
yarn format         # prettier --write .
yarn format:check
```

There are no automated tests yet. Verify UI changes by running the app (e.g. headless Playwright screenshots).
**Never test against the real Jira** (it creates real worklogs), and don't assume :3000 is free: the user often has
their own backend running there, pointed at the real Jira. Run a separate test stack instead:
`cd ../api && XDG_CONFIG_HOME=<tmp> VELOCITEMPO_ADDR=127.0.0.1:3001 cargo run` (settings pointing at a throwaway mock
Jira/Tempo) and `VELOCITEMPO_API=http://localhost:3001 yarn dev --port <free>`. Before submitting anything, check
`GET /api/settings` through the dev server returns the mock's URL. Only stop processes you started.

## Code style

- **4-space indentation**, no semicolons, single quotes, 120 columns — enforced by Prettier (`.prettierrc.json`) and
  `.editorconfig`. Run `yarn format` after edits; yarn may rewrite `package.json` with 2 spaces.
- Strict TS with `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax` (use `import type`).
- Typed hooks from `src/app/hooks.ts` (`useAppDispatch`, `useAppSelector`) — not the raw react-redux ones.
- Prefer stock Tabler markup/classes over custom CSS; the look should match Tabler's preview pages
  (reference: "HTTP Request" card on https://preview.tabler.io/form-elements.html). Keep `src/index.css` minimal.
- Buttons use plain `btn` (secondary actions) / `btn btn-primary` (submit); no ghost/icon buttons. Busy buttons use
  Tabler's `btn-loading` (spinner only, width kept, Ladda-like fade from `index.css`) plus `disabled` + `aria-busy`.
  Exceptions (at the user's request): the header "Settings" button is `btn border-0 shadow-none`, and footer "Clear"
  is `btn btn-link`.

## Structure

```
src/
  main.tsx                  # Provider, imports tabler.min.css + index.css
  App.tsx                   # page-center layout, container-narrow; AppSkeleton until settings (language) load
  index.css                 # entry striping, ticket dropdown, small overrides
  app/store.ts, hooks.ts    # store setup, typed hooks
  app/api.ts                # RTK Query base (`api`, endpoints injected per feature), errorMessage()/describeError()
  i18n/
    en.ts                   # English dictionary — the reference shape; nested keys, {param} placeholders, plural()
    sl.ts                   # Slovenian, typed `Dictionary<typeof en>` so missing keys fail typecheck
    types.ts                # Plural, Dictionary, TextKey/PluralKey (typed dotted keys)
    index.ts                # useT() → { t, tn, tryT, language, locale }, LANGUAGES, resolveLanguage()
  lib/tabler.ts             # sets window.VanillaCalendarPro, re-exports Tabler Datepicker, Modal
  components/
    AppSkeleton.tsx         # text-free placeholder-glow copy of the card shown during startup
    DateInput.tsx           # Tabler datepicker wrapper (ISO value, shows "DD. MM. YYYY")
    TicketAutocomplete.tsx  # debounced Jira issue search; value is the issue key only
  features/settings/
    settingsApi.ts          # getSettings / saveSettings ({ jiraUrl, hasToken, language }; empty token = keep)
    SettingsModal.tsx       # Tabler Modal (static backdrop), portalled to <body>; URL, token, language
  features/worklog/
    types.ts                # WorklogRow, WORK_TYPES, WORK_LOCATIONS, JiraIssue
    worklogSlice.ts         # rows state (rowUpdated / rowRemoved / rowsReset)
    worklogApi.ts           # searchTickets, submitWorklogs
    validation.ts           # isRowComplete, isRowBlank
    duration.ts             # parse flexible input ("1.5", "1:30", "1h30m", "1d"=8h), normalise to "1h 30m"
    WorklogForm.tsx         # the card + entry blocks + total + submit
    LoggedSummary.tsx       # success alert below the card: what the last submit created, linked to <jiraUrl>/browse/KEY
```

## Worklog form behaviour

Each worklog is an entry block: a `card-body` inside `.worklog-entries`, even ones striped like `.table-striped`.
Labels sit above inputs (`form-label`, not floating). Each block has a header with `#n` and Delete (disabled while
there is only one entry), then three lines: Date / Issue / Type; Description (full width); Worked / Billable / Work
location / ORWH. ORWH is a checkbox labelled "ORWH", centred in its column.
Field ids are `${row.id}-<field>` so labels are clickable (`DateInput` / `TicketAutocomplete` take an `id` prop).

- Defaults: Date = today, Type = `Development`, Work location = `Mikrografija`.
- Type options: Development, Support, Meeting, Reclamation, Analysis. Locations: Mikrografija, Home Office. These are a
  chosen subset of the Tempo static-list options and must match their **names** exactly (Tempo also has e.g.
  "Education & Training", "Customer Site"); the backend maps names to Tempo values. Adding one → also add its label
  under `worklog.types` / `worklog.locations` in both dictionaries (typecheck enforces it).
- Worked and Billable accept flexible input and are normalised to `Xh Ym` on blur (and again on submit); plain
  numbers are hours, `d` = 8h, `w` = 5d (Jira defaults). The footer shows the total of Worked.
- Worked and Billable are Jira duration strings. **Billable mirrors Worked** until the user edits it to a different
  value (handled in the `rowUpdated` reducer).
- ORWH = "outside regular working hours" (Tempo checkbox attribute `_Outsideregularworkinghours_`).
- **No "Add row" button**: when the last row becomes complete (`isRowComplete`: date, ticket, description, valid
  worked + billable), a blank row is appended automatically (`ensureTrailingRow`), copying date and location.
  Deleting rows also re-ensures a trailing row; there is always at least one.
- On submit, blank rows (`isRowBlank`) are dropped; every remaining row must be complete or its fields get
  `is-invalid`. Created entries are removed from the form (all created → reset to one fresh entry) and listed in
  `LoggedSummary` below the card (dismissible, replaced by the next submit); failed ones stay with the Jira/Tempo error
  shown above their fields (`rowErrors`) and a count in the danger alert at the top of the card.
- A warning alert shows while Jira isn't configured (no URL or no saved token).
- Footer: total worked on the left; Clear (resets to one fresh entry, no confirmation) and Submit on the right.

## Backend API

Contract is documented in `../api/CLAUDE.md`: `GET/PUT /api/settings`, `GET /api/tickets?q=`,
`POST /api/worklogs` → `{ created, results: [{ ok } | { ok: false, error, code, params }] }`. Errors come back as
`{ error, code, params }` — show them with `errorMessage(err, tr)` / `describeError(body, tr)` from `src/app/api.ts`,
which translate known codes via `errors.api.<code>` and otherwise show the English `error` (Jira's own text).

## Languages

English and Slovenian. Every visible string (labels, placeholders, aria/title texts, alerts) goes through `useT()`;
add each new key to **both** `en.ts` and `sl.ts`. Plurals use `tn()` with `Intl.PluralRules` (Slovenian needs
one/two/few/other). Type/Work location options are translated for display only (`worklog.types.<name>`,
`worklog.locations.<name>`, keyed by the Tempo name); the `<option value>` and the state stay the Tempo name, which
is what the backend matches. ORWH is "IRDČ" in Slovenian. Not translated: the product name and Jira duration syntax
(`1h 30m`). `AppSkeleton` shows only language-neutral text (product name, `#1`) and placeholders for the rest. The language is saved in the backend settings (`language`), falls back to
the browser language, then English; `App` shows `AppSkeleton` until settings load so the language never flips on
screen. The datepicker gets `locale` (`en-GB` / `sl-SI`) and is re-created when it changes.

## Gotchas

- **Tabler Datepicker** (`@tabler/core` 1.6 `Datepicker`) wraps Vanilla Calendar Pro and silently does nothing unless
  `window.VanillaCalendarPro` is set before construction — always import `Datepicker` from `src/lib/tabler.ts`.
  Calendar styles are already in `tabler.min.css`. The picker is created once per input (imperatively, uncontrolled
  input, `readOnly`); value changes are pushed in with `setSelectedDates`, and picks arrive via the
  `change.bs.datepicker` DOM event (`event.dates: string[]`).
- Importing `@tabler/core` JS pulls in all of Tabler/Bootstrap JS, hence Vite's >500 kB chunk warning. Known, harmless.
- `TicketAutocomplete` debounces (250 ms, min 2 chars) so fast typing makes one request; RTK Query caches results
  per query for 5 min. The Tabler `input-icon` addon on the right of the input shows a search icon, replaced by a
  spinner while fetching; the menu stays hidden until the first results arrive. The menu must stay outside
  `.input-icon`: Tabler only right-aligns the addon while it's `:last-child`, otherwise it jumps over the text.
- `TicketAutocomplete` commits on blur: a picked suggestion, or free text that looks like an issue key
  (`ABC-123`, uppercased); anything else reverts. Suggestion items use `onMouseDown` preventDefault so blur doesn't
  fire before the click.
- `SettingsModal` is portalled out of the worklog `<form>` (no nested forms), but React events still bubble
  through portals, so its submit handler calls `stopPropagation()`.
- React 19 types deprecate `React.FormEvent`; use `React.SubmitEvent<HTMLFormElement>` / `ChangeEvent` etc.
