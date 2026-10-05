import { useEffect, useId, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { errorMessage } from '../app/api'
import { useT } from '../i18n'
import { useSearchTicketsQuery } from '../features/worklog/worklogApi'
import type { JiraIssue } from '../features/worklog/types'

const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/i
const MIN_QUERY_LENGTH = 2

function useDebounced<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(t)
    }, [value, delayMs])
    return debounced
}

interface Props {
    id?: string
    /** Selected Jira issue key */
    value: string
    onChange: (key: string) => void
}

/**
 * Text input that searches Jira issues while typing. Only the issue key is
 * committed as the value; free text that already looks like a key is accepted too.
 */
export function TicketAutocomplete({ id, value, onChange }: Props) {
    const tr = useT()
    const listId = useId()
    const [text, setText] = useState(value)
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)

    // Follow external changes (e.g. table reset).
    useEffect(() => setText(value), [value])

    const query = useDebounced(text.trim(), 250)
    const shouldSearch = open && query.length >= MIN_QUERY_LENGTH && query !== value
    const { data: issues = [], isFetching, isError, error } = useSearchTicketsQuery(shouldSearch ? query : skipToken)
    // While the first results for a query load, the spinner in the input is enough; no empty menu.
    const showMenu = shouldSearch && !(isFetching && issues.length === 0)

    function select(issue: JiraIssue) {
        setText(issue.key)
        setOpen(false)
        onChange(issue.key)
    }

    function commitText() {
        setOpen(false)
        const trimmed = text.trim()
        if (trimmed === '') {
            onChange('')
        } else if (ISSUE_KEY_RE.test(trimmed)) {
            const key = trimmed.toUpperCase()
            setText(key)
            onChange(key)
        } else {
            setText(value)
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!showMenu || issues.length === 0) {
            if (e.key === 'Enter') commitText()
            return
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActive((i) => (i + 1) % issues.length)
                break
            case 'ArrowUp':
                e.preventDefault()
                setActive((i) => (i - 1 + issues.length) % issues.length)
                break
            case 'Enter':
                e.preventDefault()
                select(issues[active] ?? issues[0])
                break
            case 'Escape':
                setOpen(false)
                break
        }
    }

    return (
        // The menu sits outside .input-icon: Tabler only puts the addon on the right while it's the last child.
        <div className="position-relative">
            <div className="input-icon">
                <input
                    id={id}
                    type="text"
                    className="form-control"
                    placeholder={tr.t('ticket.searchPlaceholder')}
                    value={text}
                    role="combobox"
                    aria-expanded={showMenu}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    autoComplete="off"
                    onChange={(e) => {
                        setText(e.target.value)
                        setActive(0)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={commitText}
                    onKeyDown={onKeyDown}
                />
                <span className="input-icon-addon">
                    {isFetching ? (
                        <span className="spinner-border spinner-border-sm text-secondary" role="status" />
                    ) : (
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
                            <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                            <path d="M21 21l-6 -6" />
                        </svg>
                    )}
                </span>
            </div>
            {showMenu && (
                <div id={listId} role="listbox" className="dropdown-menu show ticket-menu">
                    {isError && (
                        <span className="dropdown-item disabled text-danger text-wrap">{errorMessage(error, tr)}</span>
                    )}
                    {!isFetching && !isError && issues.length === 0 && (
                        <span className="dropdown-item disabled">{tr.t('ticket.noResults')}</span>
                    )}
                    {issues.map((issue, i) => (
                        <button
                            key={issue.key}
                            type="button"
                            role="option"
                            aria-selected={i === active}
                            className={`dropdown-item ${i === active ? 'active' : ''}`}
                            // Keep focus in the input so blur doesn't fire before selection.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => select(issue)}
                            onMouseEnter={() => setActive(i)}
                        >
                            <span className="fw-medium me-2">{issue.key}</span>
                            <span className="text-truncate">{issue.summary}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
