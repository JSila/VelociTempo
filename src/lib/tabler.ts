import * as VanillaCalendarPro from 'vanilla-calendar-pro'

declare global {
    interface Window {
        VanillaCalendarPro?: typeof VanillaCalendarPro
    }
}

// Tabler's Datepicker looks up Vanilla Calendar Pro on window; it must be set
// before any Datepicker is constructed.
window.VanillaCalendarPro = VanillaCalendarPro

export { Datepicker, Dropdown, Modal } from '@tabler/core'
