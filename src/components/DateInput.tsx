import { useEffect, useRef } from 'react'
import { Datepicker, Dropdown } from '../lib/tabler'

const pad = (n: number) => String(n).padStart(2, '0')
const formatDate = (d: Date) => `${pad(d.getDate())}. ${pad(d.getMonth() + 1)}. ${d.getFullYear()}`

/** "2026-10-03" → "03. 10. 2026", the format the date fields show. */
export function formatIsoDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    return y && m && d ? formatDate(new Date(y, m - 1, d)) : iso
}

interface Props {
    id?: string
    /** ISO date, YYYY-MM-DD */
    value: string
    onChange: (value: string) => void
    invalid?: boolean
    /** BCP 47 locale for the calendar's month and day names, e.g. `sl-SI`. */
    locale?: string
    placeholder?: string
}

/**
 * The date shown as text ("DD. MM. YYYY"); clicking it opens a Tabler dropdown with an inline Tabler datepicker.
 * The calendar renders into an element created here, outside React: Vanilla Calendar replaces the element it's given.
 */
export function DateInput({ id, value, onChange, invalid, locale, placeholder }: Props) {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const hostRef = useRef<HTMLDivElement>(null)
    const pickerRef = useRef<Datepicker | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const valueRef = useRef(value)
    valueRef.current = value

    useEffect(() => {
        const host = hostRef.current!
        const element = document.createElement('div')
        host.append(element)
        const picker = new Datepicker(element, {
            inline: true,
            firstWeekday: 1,
            locale,
            selectedDates: valueRef.current ? [valueRef.current] : [],
        })
        pickerRef.current = picker
        const handleChange = (e: Event) => {
            const [date] = (e as Event & { dates: string[] }).dates
            // Clicking the picked day again deselects it; keep the date instead.
            if (date) onChangeRef.current(date)
            else picker.setSelectedDates(valueRef.current ? [valueRef.current] : [])
            ;(Dropdown.getOrCreateInstance(buttonRef.current!) as Dropdown).hide()
        }
        element.addEventListener('change.bs.datepicker', handleChange)
        return () => {
            element.removeEventListener('change.bs.datepicker', handleChange)
            picker.dispose()
            pickerRef.current = null
            host.replaceChildren()
        }
        // Created once per locale; value changes are pushed in below.
    }, [locale])

    useEffect(() => {
        const picker = pickerRef.current
        if (picker && picker.getSelectedDates()[0] !== value) picker.setSelectedDates(value ? [value] : [])
    }, [value])

    return (
        <div className="dropdown">
            <button
                ref={buttonRef}
                id={id}
                type="button"
                className={`picker-text dropdown-toggle ${invalid ? 'text-danger' : value ? '' : 'text-secondary'}`}
                data-bs-toggle="dropdown"
                // Month navigation inside the calendar must not close it.
                data-bs-auto-close="outside"
                aria-expanded="false"
                aria-invalid={invalid || undefined}
            >
                {value ? formatIsoDate(value) : placeholder}
            </button>
            <div className="dropdown-menu p-0">
                <div ref={hostRef} />
            </div>
        </div>
    )
}
