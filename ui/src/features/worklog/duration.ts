// Flexible duration input, normalised to Jira's "1h 30m" format.
// Accepts "1.5" / "1,5" / "2" (hours), "1:30", "1h30m", "90m", "1.5h", "1d" (8h), "1w" (5d).
const UNIT_MINUTES: Record<string, number> = { w: 5 * 8 * 60, d: 8 * 60, h: 60, m: 1 }
const NUMBER = String.raw`\d+(?:[.,]\d+)?`
const HOURS_RE = new RegExp(`^${NUMBER}$`)
const CLOCK_RE = /^(\d+):([0-5]\d)$/
const UNITS_RE = new RegExp(`^(?:${NUMBER}\\s*[wdhm]\\s*)+$`, 'i')
const UNIT_PART_RE = new RegExp(`(${NUMBER})\\s*([wdhm])`, 'gi')

const toNumber = (s: string) => Number(s.replace(',', '.'))

/** Duration in whole minutes, or null if the input isn't a positive duration. */
export function parseDuration(value: string): number | null {
    const s = value.trim()
    let minutes: number
    let clock: RegExpMatchArray | null
    if (HOURS_RE.test(s)) {
        minutes = toNumber(s) * 60
    } else if ((clock = s.match(CLOCK_RE))) {
        minutes = Number(clock[1]) * 60 + Number(clock[2])
    } else if (UNITS_RE.test(s)) {
        minutes = 0
        for (const [, n, unit] of s.matchAll(UNIT_PART_RE)) minutes += toNumber(n) * UNIT_MINUTES[unit.toLowerCase()]
    } else {
        return null
    }
    minutes = Math.round(minutes)
    return minutes > 0 ? minutes : null
}

export function formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return m === 0 ? '0h' : `${m}m`
    return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** "1.5" → "1h 30m"; unparseable input is returned unchanged so it can be flagged. */
export function normalizeDuration(value: string): string {
    const minutes = parseDuration(value)
    return minutes === null ? value : formatMinutes(minutes)
}

export function isValidDuration(value: string): boolean {
    return parseDuration(value) !== null
}
