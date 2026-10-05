import { useState } from 'react'
import { describeError, errorMessage } from '../../app/api'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { ChoiceText } from '../../components/ChoiceText'
import { DateInput } from '../../components/DateInput'
import { TicketAutocomplete } from '../../components/TicketAutocomplete'
import { useT } from '../../i18n'
import { useGetSettingsQuery } from '../settings/settingsApi'
import { SettingsModal } from '../settings/SettingsModal'
import { LoggedSummary, type LoggedWorklog } from './LoggedSummary'
import { formatMinutes, isValidDuration, normalizeDuration, parseDuration } from './duration'
import { WORK_LOCATIONS, WORK_TYPES, type WorklogRow } from './types'
import { useSubmitWorklogsMutation } from './worklogApi'
import { rowRemoved, rowsReset, rowUpdated, selectRows } from './worklogSlice'
import { isRowBlank, isRowComplete } from './validation'

const YES_NO = ['yes', 'no'] as const

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

    const update = <K extends keyof Omit<WorklogRow, 'id'>>(id: string, field: K, value: WorklogRow[K]) =>
        dispatch(rowUpdated({ id, field, value } as Parameters<typeof rowUpdated>[0]))

    const totalWorked = rows.reduce((sum, r) => sum + (parseDuration(r.worked) ?? 0), 0)

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
            const errors: Record<string, string> = {}
            filled.forEach((row, i) => {
                const r = res.results[i]
                if (r?.ok) dispatch(rowRemoved(row.id))
                else errors[row.id] = r ? describeError(r, tr) : t('worklog.notCreated')
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
                {notConfigured && !submitError && (
                    <div className="card-body pb-0">
                        <div className="alert alert-warning mb-0" role="alert">
                            {t('worklog.notConfigured')}
                        </div>
                    </div>
                )}
                {settingsFailed && !submitError && (
                    <div className="card-body pb-0">
                        <div className="alert alert-danger mb-0" role="alert">
                            {t('errors.serverUnreachable')}
                        </div>
                    </div>
                )}
                {submitError && (
                    <div className="card-body pb-0">
                        <div className="alert alert-danger mb-0" role="alert">
                            {submitError}
                        </div>
                    </div>
                )}
                <div className="worklog-entries">
                    {rows.map((row, index) => {
                        const showErrors = checkedRows[row.id]
                        const id = (field: string) => `${row.id}-${field}`
                        return (
                            <div key={row.id} className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary fw-medium">#{index + 1}</span>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => dispatch(rowRemoved(row.id))}
                                        disabled={rows.length === 1}
                                    >
                                        {t('worklog.delete')}
                                    </button>
                                </div>
                                {rowErrors[row.id] && (
                                    <div className="text-danger mb-2" role="alert">
                                        {rowErrors[row.id]}
                                    </div>
                                )}
                                <div className="row g-3">
                                    <div
                                        className={`col-sm-6 col-md-3 ${showErrors && !row.ticket ? 'ticket-invalid' : ''}`}
                                    >
                                        <label className="form-label" htmlFor={id('ticket')}>
                                            {t('worklog.issue')}
                                        </label>
                                        <TicketAutocomplete
                                            id={id('ticket')}
                                            value={row.ticket}
                                            onChange={(key) => update(row.id, 'ticket', key)}
                                        />
                                    </div>
                                    <div className="col-sm-6 col-md">
                                        <label className="form-label" htmlFor={id('description')}>
                                            {t('worklog.description')}
                                        </label>
                                        <input
                                            id={id('description')}
                                            type="text"
                                            className={`form-control ${showErrors && !row.description.trim() ? 'is-invalid' : ''}`}
                                            value={row.description}
                                            onChange={(e) => update(row.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="form-label" htmlFor={id('worked')}>
                                            {t('worklog.worked')}
                                        </label>
                                        <input
                                            id={id('worked')}
                                            type="text"
                                            className={`form-control ${showErrors && !isValidDuration(row.worked) ? 'is-invalid' : ''}`}
                                            placeholder="1h 30m"
                                            value={row.worked}
                                            onChange={(e) => update(row.id, 'worked', e.target.value)}
                                            onBlur={(e) => {
                                                const normalized = normalizeDuration(e.target.value)
                                                if (normalized !== row.worked) update(row.id, 'worked', normalized)
                                            }}
                                        />
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="form-label" htmlFor={id('billable')}>
                                            {t('worklog.billable')}
                                        </label>
                                        <input
                                            id={id('billable')}
                                            type="text"
                                            className={`form-control ${showErrors && !isValidDuration(row.billable) ? 'is-invalid' : ''}`}
                                            placeholder="1h 30m"
                                            value={row.billable}
                                            onChange={(e) => update(row.id, 'billable', e.target.value)}
                                            onBlur={(e) => {
                                                const normalized = normalizeDuration(e.target.value)
                                                if (normalized !== row.billable) update(row.id, 'billable', normalized)
                                            }}
                                        />
                                    </div>
                                    {/* Line 2: the rarely changed fields, shown as text with the label on its left. */}
                                    <div className="w-100 mt-0" />
                                    <div className="col-6 col-md-auto d-flex flex-wrap align-items-baseline column-gap-2">
                                        <label className="form-label mb-0 text-nowrap" htmlFor={id('date')}>
                                            {t('worklog.date')}:
                                        </label>
                                        <DateInput
                                            id={id('date')}
                                            locale={tr.locale}
                                            placeholder={t('date.placeholder')}
                                            value={row.date}
                                            invalid={showErrors && !row.date}
                                            onChange={(date) => update(row.id, 'date', date)}
                                        />
                                    </div>
                                    <div className="col-6 col-md-auto d-flex flex-wrap align-items-baseline column-gap-2">
                                        <label className="form-label mb-0 text-nowrap" htmlFor={id('type')}>
                                            {t('worklog.type')}:
                                        </label>
                                        <ChoiceText
                                            id={id('type')}
                                            value={row.type}
                                            options={WORK_TYPES}
                                            label={(type) => t(`worklog.types.${type}`)}
                                            onChange={(type) => update(row.id, 'type', type)}
                                        />
                                    </div>
                                    <div className="col-6 col-md-auto d-flex flex-wrap align-items-baseline column-gap-2">
                                        <label className="form-label mb-0 text-nowrap" htmlFor={id('location')}>
                                            {t('worklog.workLocation')}:
                                        </label>
                                        <ChoiceText
                                            id={id('location')}
                                            value={row.workLocation}
                                            options={WORK_LOCATIONS}
                                            label={(l) => t(`worklog.locations.${l}`)}
                                            onChange={(l) => update(row.id, 'workLocation', l)}
                                        />
                                    </div>
                                    <div className="col-6 col-md-auto d-flex flex-wrap align-items-baseline column-gap-2">
                                        <label
                                            className="form-label mb-0 text-nowrap"
                                            htmlFor={id('orwh')}
                                            title={t('worklog.orwhTitle')}
                                        >
                                            {t('worklog.orwh')}:
                                        </label>
                                        <ChoiceText
                                            id={id('orwh')}
                                            value={row.orwh ? 'yes' : 'no'}
                                            options={YES_NO}
                                            label={(answer) => t(`common.${answer}`)}
                                            onChange={(answer) => update(row.id, 'orwh', answer === 'yes')}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="card-footer d-flex align-items-center justify-content-between">
                    <div className="text-secondary">
                        {t('worklog.totalWorked')} <strong className="text-body">{formatMinutes(totalWorked)}</strong>
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
