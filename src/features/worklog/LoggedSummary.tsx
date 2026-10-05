import { formatIsoDate } from '../../components/DateInput'
import { useT } from '../../i18n'

export interface LoggedWorklog {
    key: string
    /** ISO date, YYYY-MM-DD */
    date: string
    worked: string
    description: string
}

interface Props {
    worklogs: LoggedWorklog[]
    jiraUrl: string
    onDismiss: () => void
}

/** Success alert below the card listing what the last submit created, with links to check it in Jira. */
export function LoggedSummary({ worklogs, jiraUrl, onDismiss }: Props) {
    const { t, tn } = useT()
    return (
        <div className="alert alert-success alert-dismissible bg-surface mt-3" role="alert">
            <div className="alert-icon">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="icon alert-icon icon-2"
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
                    <path d="M5 12l5 5l10 -10" />
                </svg>
            </div>
            <div>
                <h4 className="alert-heading">{tn('logged.heading', worklogs.length)}</h4>
                <div className="alert-description">
                    <ul className="list-unstyled mb-0">
                        {worklogs.map((w, i) => (
                            <li key={i}>
                                <a
                                    href={`${jiraUrl}/browse/${encodeURIComponent(w.key)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="alert-link ms-0"
                                    title={t('logged.openInJira', { key: w.key })}
                                >
                                    {w.key}
                                </a>{' '}
                                · {formatIsoDate(w.date)} · {w.worked} — {w.description}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <button type="button" className="btn-close" aria-label={t('common.close')} onClick={onDismiss} />
        </div>
    )
}
