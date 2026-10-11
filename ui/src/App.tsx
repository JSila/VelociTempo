import { useEffect } from 'react'
import { AppSkeleton } from './components/AppSkeleton'
import { useGetSettingsQuery } from './features/settings/settingsApi'
import { WorklogForm } from './features/worklog/WorklogForm'
import { useLanguage } from './i18n'

export function App() {
    // The language is part of the saved settings; render nothing translated until it's known.
    const { isLoading } = useGetSettingsQuery()
    const language = useLanguage()
    useEffect(() => {
        document.documentElement.lang = language
    }, [language])
    return (
        <div className="page page-center bg-pattern-grid bg-pattern-xl">
            <div className="container-narrow py-4">{isLoading ? <AppSkeleton /> : <WorklogForm />}</div>
        </div>
    )
}
