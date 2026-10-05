import { isValidDuration } from './duration'
import type { WorklogRow } from './types'

/** Every field the user has to fill in is present and well-formed. */
export function isRowComplete(row: WorklogRow): boolean {
    return (
        row.date !== '' &&
        row.ticket !== '' &&
        row.description.trim() !== '' &&
        isValidDuration(row.worked) &&
        isValidDuration(row.billable)
    )
}

/** Nothing typed yet, e.g. the auto-appended trailing row. */
export function isRowBlank(row: WorklogRow): boolean {
    return row.ticket === '' && row.description.trim() === '' && row.worked === '' && row.billable === ''
}
