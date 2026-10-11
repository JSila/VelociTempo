/** Plural forms by `Intl.PluralRules` category; Slovenian uses one/two/few/other, English one/other. */
export interface Plural {
    one: string
    two?: string
    few?: string
    other: string
}

export const plural = (forms: Plural): Plural => forms

/** Same shape as the English dictionary, but any text. */
export type Dictionary<T> = {
    [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Dictionary<T[K]>
}

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`

/** Dotted keys of plain strings, e.g. `worklog.submit`. */
export type TextKey<T, P extends string = ''> = {
    [K in keyof T & string]: T[K] extends string ? Join<P, K> : T[K] extends Plural ? never : TextKey<T[K], Join<P, K>>
}[keyof T & string]

/** Dotted keys of plural forms, e.g. `logged.heading`. */
export type PluralKey<T, P extends string = ''> = {
    [K in keyof T & string]: T[K] extends string
        ? never
        : T[K] extends Plural
          ? Join<P, K>
          : PluralKey<T[K], Join<P, K>>
}[keyof T & string]
