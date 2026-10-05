export const WORK_TYPES = ['Development', 'Support', 'Meeting', 'Reclamation', 'Analysis'] as const
export type WorkType = (typeof WORK_TYPES)[number]

export const WORK_LOCATIONS = ['Mikrografija', 'Home Office'] as const
export type WorkLocation = (typeof WORK_LOCATIONS)[number]

export interface WorklogRow {
    id: string
    /** ISO date, YYYY-MM-DD */
    date: string
    /** Jira issue key, e.g. "VT-123" */
    ticket: string
    description: string
    /** Jira duration format, e.g. "1h 30m" */
    worked: string
    /** Jira duration format; follows `worked` until edited */
    billable: string
    type: WorkType
    workLocation: WorkLocation
    /** Outside regular working hours */
    orwh: boolean
}

export interface JiraIssue {
    key: string
    summary: string
}
