import * as VanillaCalendarPro from 'vanilla-calendar-pro'

declare global {
    interface Window {
        VanillaCalendarPro?: typeof VanillaCalendarPro
    }
}

// Tabler's Datepicker looks up Vanilla Calendar Pro on window; it must be set
// before any Datepicker is constructed.
window.VanillaCalendarPro = VanillaCalendarPro

// Only the components we use, straight from Tabler's sources: the package entry pulls in all of Tabler/Bootstrap JS.
// Dropdown and Modal register their own `data-bs-toggle` / `data-bs-dismiss` click handlers when imported.
export { default as Datepicker } from '@tabler/core/js/src/datepicker'
export { default as Dropdown } from '@tabler/core/js/src/bootstrap/dropdown'
export { default as Modal } from '@tabler/core/js/src/bootstrap/modal'
