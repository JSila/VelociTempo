import { useEffect, useMemo } from 'react'
import { useGetSettingsQuery } from '../features/settings/settingsApi'
import { en } from './en'
import { sl } from './sl'
import type { Dictionary, Plural, PluralKey, TextKey } from './types'

type Messages = Dictionary<typeof en>
type Params = Record<string, string | number>

export type Language = 'en' | 'sl'

/** Shown in the language picker by their own names. */
export const LANGUAGES: { code: Language; name: string; locale: string }[] = [
    { code: 'en', name: 'English', locale: 'en-GB' },
    { code: 'sl', name: 'Slovenščina', locale: 'sl-SI' },
]

const DICTIONARIES: Record<Language, Messages> = { en, sl }

/** Saved language, else the browser's if we have it, else English. */
export function resolveLanguage(saved: string | undefined): Language {
    const known = (code: string | undefined) => LANGUAGES.find((l) => code?.toLowerCase().startsWith(l.code))?.code
    return known(saved) ?? known(navigator.language) ?? 'en'
}

function lookup(messages: Messages, key: string): unknown {
    return key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages)
}

const interpolate = (text: string, params: Params = {}) =>
    text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))

export function createTranslator(language: Language) {
    const messages = DICTIONARIES[language]
    const locale = LANGUAGES.find((l) => l.code === language)!.locale
    const pluralRules = new Intl.PluralRules(locale)
    return {
        language,
        locale,
        t: (key: TextKey<typeof en>, params?: Params) => interpolate(lookup(messages, key) as string, params),
        tn: (key: PluralKey<typeof en>, count: number, params?: Params) => {
            const forms = lookup(messages, key) as Plural
            const form = forms[pluralRules.select(count) as keyof Plural] ?? forms.other
            return interpolate(form, { count, ...params })
        },
        /** Untyped lookup for dynamic keys (e.g. backend error codes); undefined if missing. */
        tryT: (key: string, params?: Params) => {
            const text = lookup(messages, key)
            return typeof text === 'string' ? interpolate(text, params) : undefined
        },
    }
}

export type Translator = ReturnType<typeof createTranslator>

export function useLanguage(): Language {
    const { data } = useGetSettingsQuery()
    return resolveLanguage(data?.language)
}

export function useT(): Translator {
    const language = useLanguage()
    const translator = useMemo(() => createTranslator(language), [language])
    useEffect(() => {
        document.documentElement.lang = language
    }, [language])
    return translator
}
