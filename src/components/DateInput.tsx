import { useEffect, useRef } from 'react'
import { Datepicker } from '../lib/tabler'

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

/** Tabler datepicker bound to an ISO date; shows the date as "DD. MM. YYYY". */
export function DateInput({ id, value, onChange, invalid, locale, placeholder }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const pickerRef = useRef<Datepicker | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const valueRef = useRef(value)
    valueRef.current = value

    useEffect(() => {
        const input = inputRef.current!
        const picker = new Datepicker(input, {
            dateFormat: formatDate,
            firstWeekday: 1,
            locale,
            selectedDates: valueRef.current ? [valueRef.current] : [],
        })
        pickerRef.current = picker
        const handleChange = (e: Event) => {
            const [date = ''] = (e as Event & { dates: string[] }).dates
            onChangeRef.current(date)
        }
        input.addEventListener('change.bs.datepicker', handleChange)
        return () => {
            input.removeEventListener('change.bs.datepicker', handleChange)
            picker.dispose()
            pickerRef.current = null
        }
        // Created once per locale; value changes are pushed in below.
    }, [locale])

    useEffect(() => {
        const picker = pickerRef.current
        if (picker && picker.getSelectedDates()[0] !== value) picker.setSelectedDates(value ? [value] : [])
    }, [value])

    return (
        <input
            ref={inputRef}
            id={id}
            type="text"
            className={`form-control ${invalid ? 'is-invalid' : ''}`}
            placeholder={placeholder}
            autoComplete="off"
            readOnly
        />
    )
}
