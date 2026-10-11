import { useState, type ReactNode } from 'react'
import { describeError, errorMessage } from '../../app/api'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useT } from '../../i18n'
import { useGetSettingsQuery } from '../settings/settingsApi'
import { SettingsModal } from '../settings/SettingsModal'
import { LoggedSummary, type LoggedWorklog } from './LoggedSummary'
import { formatMinutes, normalizeDuration, parseDuration } from './duration'
import { useSubmitWorklogsMutation } from './worklogApi'
import { WorklogEntry } from './WorklogEntry'
import { rowsRemoved, rowsReset, selectRows } from './worklogSlice'
import { isRowBlank, isRowComplete } from './validation'

export function WorklogForm() {
    const dispatch = useAppDispatch()
    const rows = useAppSelector(selectRows)
    const [submitWorklogs, { isLoading }] = useSubmitWorklogsMutation()
    const [checkedRows, setCheckedRows] = useState<Record<string, boolean>>({})
    const tr = useT()
    const { t } = tr
    /** Error shown at the top of the card (whole request failed, or some entries did). */
    const [submitError, setSubmitError] = useState<string | null>(null)
    /** What the last submit created, listed below the card. */
    const [logged, setLogged] = useState<LoggedWorklog[] | null>(null)
    /** Jira/Tempo errors of entries that failed on the last submit. */
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
    const [settingsOpen, setSettingsOpen] = useState(false)
    const { data: settings, isError: settingsFailed } = useGetSettingsQuery()
    const notConfigured = settings !== undefined && (!settings.jiraUrl || !settings.hasToken)

    const totalLogged = rows.reduce((sum, r) => sum + (parseDuration(r.worked) ?? 0), 0)

    function clear() {
        dispatch(rowsReset())
        setCheckedRows({})
        setRowErrors({})
        setSubmitError(null)
        setLogged(null)
    }

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        // The trailing empty entry is just a placeholder for the next one.
        const filled = rows.filter((r) => !isRowBlank(r))
        const toCheck = filled.length > 0 ? filled : rows.slice(0, 1)
        if (!toCheck.every(isRowComplete)) {
            setCheckedRows(Object.fromEntries(toCheck.map((r) => [r.id, true])))
            return
        }
        setSubmitError(null)
        setLogged(null)
        setRowErrors({})
        try {
            const res = await submitWorklogs(
                filled.map(({ id: _id, ...rest }) => ({
                    ...rest,
                    worked: normalizeDuration(rest.worked),
                    billable: normalizeDuration(rest.billable),
                })),
            ).unwrap()
            setCheckedRows({})
            const created = filled.filter((_, i) => res.results[i]?.ok)
            setLogged(
                created.length > 0
                    ? created.map((r) => ({
                          key: r.ticket,
                          date: r.date,
                          worked: normalizeDuration(r.worked),
                          description: r.description.trim(),
                      }))
                    : null,
            )
            if (created.length === filled.length) {
                dispatch(rowsReset())
                return
            }
            // Drop what was created so a resubmit can't duplicate it; keep failed entries with their error.
            dispatch(rowsRemoved(created.map((r) => r.id)))
            const errors: Record<string, string> = {}
            filled.forEach((row, i) => {
                const r = res.results[i]
                if (!r?.ok) errors[row.id] = r ? describeError(r, tr) : t('worklog.notCreated')
            })
            setRowErrors(errors)
            setSubmitError(tr.tn('worklog.someFailed', filled.length - created.length))
        } catch (err) {
            setSubmitError(errorMessage(err, tr))
        }
    }

    return (
        <>
            <form className="card" onSubmit={onSubmit} noValidate>
                <div className="card-status-top bg-blue"></div>
                <div className="card-header">
                    <h2 className="card-title strong">VelociTempo</h2>
                    <div className="card-actions">
                        <button
                            type="button"
                            className="btn btn-icon"
                            onClick={() => setSettingsOpen(true)}
                            aria-label={t('common.settings')}
                            title={t('common.settings')}
                        >
                            {/* Tabler icon "settings" */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="icon"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
                                <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                            </svg>
                        </button>
                    </div>
                    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
                </div>
                {notConfigured && !submitError && <CardAlert variant="warning">{t('worklog.notConfigured')}</CardAlert>}
                {settingsFailed && !submitError && (
                    <CardAlert variant="danger">{t('errors.serverUnreachable')}</CardAlert>
                )}
                {submitError && <CardAlert variant="danger">{submitError}</CardAlert>}
                <div className="worklog-entries">
                    {rows.map((row, index) => (
                        <WorklogEntry
                            key={row.id}
                            row={row}
                            index={index}
                            canDelete={rows.length > 1}
                            showErrors={!!checkedRows[row.id]}
                            error={rowErrors[row.id]}
                        />
                    ))}
                </div>
                <div className="card-footer d-flex align-items-center justify-content-between">
                    <div className="text-secondary">
                        {t('worklog.totalLogged')} <strong className="text-body">{formatMinutes(totalLogged)}</strong>
                    </div>
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-link" onClick={clear} disabled={isLoading}>
                            {t('worklog.clear')}
                        </button>
                        {/* Tabler's btn-loading hides the label (keeping the width) and draws a spinner. */}
                        <button
                            type="submit"
                            className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-label={isLoading ? t('worklog.submitting') : undefined}
                        >
                            {t('worklog.submit')}
                        </button>
                    </div>
                </div>
            </form>
            {logged && settings && (
                <LoggedSummary worklogs={logged} jiraUrl={settings.jiraUrl} onDismiss={() => setLogged(null)} />
            )}
        </>
    )
}

/** Alert at the top of the card. */
function CardAlert({ variant, children }: { variant: 'warning' | 'danger'; children: ReactNode }) {
    return (
        <div className="card-body pb-0">
            <div className={`alert alert-${variant} mb-0`} role="alert">
                {children}
            </div>
        </div>
    )
}
