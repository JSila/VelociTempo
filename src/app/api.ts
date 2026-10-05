import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Translator } from '../i18n'

/** RTK Query base for the backend (`../api`); features add their endpoints with `api.injectEndpoints`. */
export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: ['Settings'],
    endpoints: () => ({}),
})

/** Backend error body: English `error`, plus `code` + `params` for a translated message. */
export interface ApiError {
    error: string
    code?: string
    params?: Record<string, string | number>
}

function toApiError(error: unknown): ApiError | undefined {
    if (typeof error === 'object' && error !== null && 'data' in error) {
        const data = (error as { data: unknown }).data
        if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
            return data as ApiError
        }
    }
    return undefined
}

/** Translated message for a backend error; Jira's own messages are passed through as they are. */
export function describeError(error: ApiError, tr: Translator): string {
    const params = { ...error.params }
    if (error.code === 'invalid_duration' && (params.field === 'worked' || params.field === 'billable')) {
        params.field = tr.t(`worklog.${params.field}`)
    }
    return (error.code && tr.tryT(`errors.api.${error.code}`, params)) || error.error
}

/** Message for a failed RTK Query request, or a generic one when the server isn't reachable. */
export function errorMessage(error: unknown, tr: Translator): string {
    const apiError = toApiError(error)
    return apiError ? describeError(apiError, tr) : tr.t('errors.serverUnreachable')
}
