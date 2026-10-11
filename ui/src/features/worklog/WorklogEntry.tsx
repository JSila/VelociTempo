import { memo, type ReactNode } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { ChoiceText } from '../../components/ChoiceText'
import { DateInput } from '../../components/DateInput'
import { TicketAutocomplete } from '../../components/TicketAutocomplete'
import { useT } from '../../i18n'
import { isValidDuration, normalizeDuration } from './duration'
import { WORK_LOCATIONS, WORK_TYPES, type WorklogRow } from './types'
import { rowRemoved, rowUpdated } from './worklogSlice'

const YES_NO = ['yes', 'no'] as const

interface Props {
    row: WorklogRow
    index: number
    canDelete: boolean
    /** Mark missing or malformed fields (after a submit attempt). */
    showErrors: boolean
    /** Jira/Tempo error from the last submit. */
    error: string | undefined
}

/**
 * One entry block. Memoised: rows keep their identity in the store until edited, so typing in one entry doesn't
 * re-render the others.
 */
export const WorklogEntry = memo(function WorklogEntry({ row, index, canDelete, showErrors, error }: Props) {
    const dispatch = useAppDispatch()
    const tr = useT()
    const { t } = tr
    const id = (field: string) => `${row.id}-${field}`
    const update = <K extends keyof Omit<WorklogRow, 'id'>>(field: K, value: WorklogRow[K]) =>
        dispatch(rowUpdated({ id: row.id, field, value } as Parameters<typeof rowUpdated>[0]))

    return (
        <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary fw-medium">#{index + 1}</span>
                <button
                    type="button"
                    className="btn"
                    onClick={() => dispatch(rowRemoved(row.id))}
                    disabled={!canDelete}
                >
                    {t('worklog.delete')}
                </button>
            </div>
            {error && (
                <div className="text-danger mb-2" role="alert">
                    {error}
                </div>
            )}
            <div className="row g-3">
                <div className={`col-sm-6 col-md-3 ${showErrors && !row.ticket ? 'ticket-invalid' : ''}`}>
                    <label className="form-label" htmlFor={id('ticket')}>
                        {t('worklog.issue')}
                    </label>
                    <TicketAutocomplete
                        id={id('ticket')}
                        value={row.ticket}
                        onChange={(key) => update('ticket', key)}
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
                        onChange={(e) => update('description', e.target.value)}
                    />
                </div>
                <div className="col-6 col-md-2">
                    <label className="form-label" htmlFor={id('worked')}>
                        {t('worklog.worked')}
                    </label>
                    <DurationInput
                        id={id('worked')}
                        value={row.worked}
                        showErrors={showErrors}
                        onChange={(value) => update('worked', value)}
                    />
                </div>
                <div className="col-6 col-md-2">
                    <label className="form-label" htmlFor={id('billable')}>
                        {t('worklog.billable')}
                    </label>
                    <DurationInput
                        id={id('billable')}
                        value={row.billable}
                        showErrors={showErrors}
                        onChange={(value) => update('billable', value)}
                    />
                </div>
                {/* Line 2: the rarely changed fields, shown as text with the label on its left. */}
                <div className="w-100 mt-0" />
                <InlineField id={id('date')} label={t('worklog.date')}>
                    <DateInput
                        id={id('date')}
                        locale={tr.locale}
                        placeholder={t('date.placeholder')}
                        value={row.date}
                        invalid={showErrors && !row.date}
                        onChange={(date) => update('date', date)}
                    />
                </InlineField>
                <InlineField id={id('type')} label={t('worklog.type')}>
                    <ChoiceText
                        id={id('type')}
                        value={row.type}
                        options={WORK_TYPES}
                        label={(type) => t(`worklog.types.${type}`)}
                        onChange={(type) => update('type', type)}
                    />
                </InlineField>
                <InlineField id={id('location')} label={t('worklog.workLocation')}>
                    <ChoiceText
                        id={id('location')}
                        value={row.workLocation}
                        options={WORK_LOCATIONS}
                        label={(l) => t(`worklog.locations.${l}`)}
                        onChange={(l) => update('workLocation', l)}
                    />
                </InlineField>
                <InlineField id={id('orwh')} label={t('worklog.orwh')} title={t('worklog.orwhTitle')}>
                    <ChoiceText
                        id={id('orwh')}
                        value={row.orwh ? 'yes' : 'no'}
                        options={YES_NO}
                        label={(answer) => t(`common.${answer}`)}
                        onChange={(answer) => update('orwh', answer === 'yes')}
                    />
                </InlineField>
            </div>
        </div>
    )
})

/** Worked / Billable: flexible input, normalised to `Xh Ym` on blur. */
function DurationInput(props: { id: string; value: string; showErrors: boolean; onChange: (value: string) => void }) {
    const { id, value, showErrors, onChange } = props
    return (
        <input
            id={id}
            type="text"
            className={`form-control ${showErrors && !isValidDuration(value) ? 'is-invalid' : ''}`}
            placeholder="1h 30m"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
                const normalized = normalizeDuration(value)
                if (normalized !== value) onChange(normalized)
            }}
        />
    )
}

/** A line-2 field: the label on the left of the picker text. */
function InlineField(props: { id: string; label: string; title?: string; children: ReactNode }) {
    return (
        <div className="col-6 col-md-auto d-flex flex-wrap align-items-baseline column-gap-2">
            <label className="form-label mb-0 text-nowrap" htmlFor={props.id} title={props.title}>
                {props.label}:
            </label>
            {props.children}
        </div>
    )
}
