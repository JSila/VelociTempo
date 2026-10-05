import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { errorMessage } from '../../app/api'
import { LANGUAGES, useT, type Language } from '../../i18n'
import { Modal } from '../../lib/tabler'
import { useGetSettingsQuery, useSaveSettingsMutation } from './settingsApi'

interface Props {
    open: boolean
    onClose: () => void
}

/** Tabler modal for the Jira server URL, personal access token and UI language. */
export function SettingsModal({ open, onClose }: Props) {
    const tr = useT()
    const { t } = tr
    const { data: settings } = useGetSettingsQuery()
    const [saveSettings, { isLoading: saving }] = useSaveSettingsMutation()
    const [draft, setDraft] = useState({ jiraUrl: '', jiraToken: '', language: tr.language as Language })
    const [error, setError] = useState<string | null>(null)
    const elRef = useRef<HTMLDivElement>(null)
    const modalRef = useRef<Modal | null>(null)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        const el = elRef.current!
        // Static backdrop: a click outside doesn't close it (Esc, × and Cancel still do).
        const modal = new Modal(el, { backdrop: 'static' })
        modalRef.current = modal
        const handleHidden = () => onCloseRef.current()
        el.addEventListener('hidden.bs.modal', handleHidden)
        return () => {
            el.removeEventListener('hidden.bs.modal', handleHidden)
            modal.dispose()
            modalRef.current = null
        }
    }, [])

    useEffect(() => {
        if (open) {
            setDraft({ jiraUrl: settings?.jiraUrl ?? '', jiraToken: '', language: tr.language })
            setError(null)
            modalRef.current?.show()
        } else {
            modalRef.current?.hide()
        }
        // Only reset the draft when the modal opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        // React events bubble through portals; keep this from submitting the worklog form.
        e.stopPropagation()
        setError(null)
        try {
            await saveSettings({
                jiraUrl: draft.jiraUrl.trim(),
                jiraToken: draft.jiraToken.trim(),
                language: draft.language,
            }).unwrap()
            modalRef.current?.hide()
        } catch (err) {
            setError(errorMessage(err, tr))
        }
    }

    // Portalled to <body>: the worklog card is itself a <form>, and forms can't nest.
    return createPortal(
        <div ref={elRef} className="modal modal-blur fade" tabIndex={-1} aria-labelledby="settings-title">
            <div className="modal-dialog modal-dialog-centered">
                <form className="modal-content" onSubmit={onSubmit}>
                    <div className="modal-header">
                        <h5 className="modal-title" id="settings-title">
                            {t('common.settings')}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label={t('common.close')}
                        />
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}
                        <div className="mb-3">
                            <label className="form-label" htmlFor="jira-url">
                                {t('settings.jiraUrl')}
                            </label>
                            <input
                                id="jira-url"
                                type="url"
                                className="form-control"
                                placeholder={t('settings.jiraUrlPlaceholder')}
                                autoComplete="url"
                                value={draft.jiraUrl}
                                onChange={(e) => setDraft({ ...draft, jiraUrl: e.target.value })}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="jira-token">
                                {t('settings.token')}
                            </label>
                            <input
                                id="jira-token"
                                type="password"
                                className="form-control"
                                autoComplete="off"
                                placeholder={settings?.hasToken ? t('settings.tokenSaved') : ''}
                                value={draft.jiraToken}
                                onChange={(e) => setDraft({ ...draft, jiraToken: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="language">
                                {t('settings.language')}
                            </label>
                            <select
                                id="language"
                                className="form-select"
                                value={draft.language}
                                onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}
                            >
                                {LANGUAGES.map((l) => (
                                    <option key={l.code} value={l.code} lang={l.code}>
                                        {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" data-bs-dismiss="modal">
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                            disabled={saving}
                            aria-busy={saving}
                        >
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    )
}
