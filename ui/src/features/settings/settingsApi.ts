import { api } from '../../app/api'

/** Saved in `~/.config/velocitempo.json` by the backend; the token itself never comes back. */
export interface JiraSettings {
    jiraUrl: string
    hasToken: boolean
    /** `en` / `sl`; the backend defaults to `en`. */
    language: string
}

export interface JiraSettingsUpdate {
    jiraUrl: string
    /** Empty keeps the saved token. */
    jiraToken: string
    language: string
}

export const settingsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getSettings: build.query<JiraSettings, void>({
            query: () => 'settings',
            providesTags: ['Settings'],
        }),
        saveSettings: build.mutation<JiraSettings, JiraSettingsUpdate>({
            query: (body) => ({ url: 'settings', method: 'PUT', body }),
            invalidatesTags: ['Settings'],
        }),
    }),
})

export const { useGetSettingsQuery, useSaveSettingsMutation } = settingsApi
