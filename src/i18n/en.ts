import { plural } from './types'

export const en = {
    common: {
        settings: 'Settings',
        close: 'Close',
        cancel: 'Cancel',
        save: 'Save',
    },
    worklog: {
        delete: 'Delete',
        date: 'Date',
        issue: 'Issue',
        type: 'Type',
        description: 'Description',
        worked: 'Worked',
        billable: 'Billable',
        workLocation: 'Work location',
        orwh: 'ORWH',
        orwhTitle: 'Outside regular working hours',
        // Display names of the Tempo options, keyed by their Tempo name (`WORK_TYPES` / `WORK_LOCATIONS`).
        types: {
            Development: 'Development',
            Support: 'Support',
            Meeting: 'Meeting',
            Reclamation: 'Reclamation',
            Analysis: 'Analysis',
        },
        locations: {
            Mikrografija: 'Mikrografija',
            'Home Office': 'Home Office',
        },
        totalWorked: 'Total worked:',
        clear: 'Clear',
        submit: 'Submit',
        submitting: 'Sending worklogs to Jira',
        notConfigured: "Jira isn't configured yet. Open Settings to enter the server URL and personal access token.",
        someFailed: plural({
            one: "{count} entry wasn't logged; see the error below.",
            other: "{count} entries weren't logged; see the errors below.",
        }),
        notCreated: 'Not created.',
    },
    logged: {
        heading: plural({ one: 'Logged {count} worklog to Jira', other: 'Logged {count} worklogs to Jira' }),
        openInJira: 'Open {key} in Jira',
    },
    ticket: {
        searchPlaceholder: 'Search…',
        noResults: 'No issues found',
    },
    date: {
        placeholder: 'DD. MM. YYYY',
    },
    settings: {
        jiraUrl: 'Jira server URL',
        jiraUrlPlaceholder: 'https://jira.example.com',
        token: 'Personal access token',
        tokenSaved: 'Saved — leave empty to keep it',
        language: 'Language',
    },
    // Keys under `api` match the backend's error `code`s (see ../api/CLAUDE.md).
    errors: {
        serverUnreachable: 'Could not reach the server. Is the backend running?',
        api: {
            not_configured: 'Jira is not configured. Open Settings and enter the server URL and personal access token.',
            invalid_url: 'Jira server URL must start with https:// or http://.',
            invalid_language: 'Unsupported language "{value}".',
            token_rejected: 'Jira rejected the personal access token. Check it in Settings.',
            jira: 'Jira responded with {status}: {detail}',
            unreachable: 'Could not reach Jira: {detail}',
            io: 'Could not save settings: {detail}',
            invalid_duration: '{field}: "{value}" is not a valid time.',
            missing_fields: 'Issue and date are required.',
            unknown_option: '"{value}" is not an option of the Tempo field "{attribute}".',
            missing_attribute: "Tempo field {key} doesn't exist in Jira.",
        },
    },
}
