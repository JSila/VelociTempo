interface Props<T extends string> {
    id?: string
    value: T
    options: readonly T[]
    /** Display text of an option; the value itself stays what's stored. */
    label: (option: T) => string
    onChange: (value: T) => void
}

/** The current choice shown as text; clicking it opens a Tabler dropdown with the options. */
export function ChoiceText<T extends string>({ id, value, options, label, onChange }: Props<T>) {
    return (
        <div className="dropdown">
            <button
                id={id}
                type="button"
                className="picker-text dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {label(value)}
            </button>
            <div className="dropdown-menu">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        className={`dropdown-item ${option === value ? 'active' : ''}`}
                        aria-current={option === value || undefined}
                        onClick={() => onChange(option)}
                    >
                        {label(option)}
                    </button>
                ))}
            </div>
        </div>
    )
}
