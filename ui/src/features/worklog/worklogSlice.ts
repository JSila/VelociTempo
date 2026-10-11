import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import type { WorklogRow } from './types'
import { isRowComplete } from './validation'

function today(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function createRow(overrides: Partial<WorklogRow> = {}): WorklogRow {
    return {
        id: nanoid(),
        date: today(),
        ticket: '',
        description: '',
        worked: '',
        billable: '',
        type: 'Development',
        workLocation: 'Mikrografija',
        orwh: false,
        ...overrides,
    }
}

interface WorklogState {
    rows: WorklogRow[]
}

const initialState: WorklogState = {
    rows: [createRow()],
}

/** Keep an empty row at the end once the last one is filled in. */
function ensureTrailingRow(rows: WorklogRow[]) {
    const last = rows.at(-1)
    if (!last) {
        rows.push(createRow())
    } else if (isRowComplete(last)) {
        // Carry date and location over; they usually repeat.
        rows.push(createRow({ date: last.date, workLocation: last.workLocation }))
    }
}

type RowUpdate = {
    [K in keyof Omit<WorklogRow, 'id'>]: { id: string; field: K; value: WorklogRow[K] }
}[keyof Omit<WorklogRow, 'id'>]

export const worklogSlice = createSlice({
    name: 'worklog',
    initialState,
    reducers: {
        rowRemoved(state, action: PayloadAction<string>) {
            state.rows = state.rows.filter((r) => r.id !== action.payload)
            ensureTrailingRow(state.rows)
        },
        rowsRemoved(state, action: PayloadAction<string[]>) {
            const ids = new Set(action.payload)
            state.rows = state.rows.filter((r) => !ids.has(r.id))
            ensureTrailingRow(state.rows)
        },
        rowUpdated(state, action: PayloadAction<RowUpdate>) {
            const { id, field, value } = action.payload
            const row = state.rows.find((r) => r.id === id)
            if (!row) return
            // Billable mirrors Worked until the user gives it a different value.
            if (field === 'worked' && row.billable === row.worked) row.billable = value
            Object.assign(row, { [field]: value })
            if (row === state.rows.at(-1)) ensureTrailingRow(state.rows)
        },
        rowsReset(state) {
            state.rows = [createRow()]
        },
    },
})

export const { rowRemoved, rowsRemoved, rowUpdated, rowsReset } = worklogSlice.actions

export const selectRows = (state: RootState) => state.worklog.rows
