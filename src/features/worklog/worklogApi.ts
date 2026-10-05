import { api, type ApiError } from '../../app/api'
import type { JiraIssue, WorklogRow } from './types'

export interface SubmitWorklogsResult {
    created: number
    /** One per submitted worklog, in order. */
    results: ({ ok: true } | ({ ok: false } & ApiError))[]
}

export const worklogApi = api.injectEndpoints({
    endpoints: (build) => ({
        searchTickets: build.query<JiraIssue[], string>({
            query: (q) => ({ url: 'tickets', params: { q } }),
            keepUnusedDataFor: 300,
        }),
        submitWorklogs: build.mutation<SubmitWorklogsResult, Omit<WorklogRow, 'id'>[]>({
            query: (worklogs) => ({ url: 'worklogs', method: 'POST', body: { worklogs } }),
        }),
    }),
})

export const { useSearchTicketsQuery, useSubmitWorklogsMutation } = worklogApi
