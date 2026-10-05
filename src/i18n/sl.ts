import type { en } from './en'
import { plural, type Dictionary } from './types'

export const sl: Dictionary<typeof en> = {
    common: {
        settings: 'Nastavitve',
        close: 'Zapri',
        cancel: 'Prekliči',
        save: 'Shrani',
        yes: 'Da',
        no: 'Ne',
    },
    worklog: {
        delete: 'Izbriši',
        date: 'Datum',
        issue: 'Zahtevek',
        type: 'Vrsta',
        description: 'Opis',
        worked: 'Opravljeno',
        billable: 'Obračunljivo',
        workLocation: 'Lokacija dela',
        orwh: 'IRDČ',
        orwhTitle: 'Izven rednega delovnega časa',
        types: {
            Development: 'Razvoj',
            Support: 'Podpora',
            Meeting: 'Sestanek',
            Reclamation: 'Reklamacija',
            Analysis: 'Analiza',
        },
        locations: {
            Mikrografija: 'Mikrografija',
            'Home Office': 'Delo od doma',
        },
        totalWorked: 'Skupaj opravljeno:',
        clear: 'Počisti',
        submit: 'Pošlji',
        submitting: 'Pošiljanje vnosov v Jiro',
        notConfigured: 'Jira še ni nastavljena. V nastavitvah vnesite URL strežnika in osebni dostopni žeton.',
        someFailed: plural({
            one: '{count} vnos ni bil zabeležen; napako si oglejte spodaj.',
            two: '{count} vnosa nista bila zabeležena; napaki si oglejte spodaj.',
            few: '{count} vnosi niso bili zabeleženi; napake si oglejte spodaj.',
            other: '{count} vnosov ni bilo zabeleženih; napake si oglejte spodaj.',
        }),
        notCreated: 'Ni bilo ustvarjeno.',
    },
    logged: {
        heading: plural({
            one: 'V Jiro je zabeležen {count} vnos',
            two: 'V Jiro sta zabeležena {count} vnosa',
            few: 'V Jiro so zabeleženi {count} vnosi',
            other: 'V Jiro je zabeleženih {count} vnosov',
        }),
        openInJira: 'Odpri {key} v Jiri',
    },
    ticket: {
        searchPlaceholder: 'Iskanje…',
        noResults: 'Ni najdenih zahtevkov',
    },
    date: {
        placeholder: 'DD. MM. LLLL',
    },
    settings: {
        jiraUrl: 'URL strežnika Jira',
        jiraUrlPlaceholder: 'https://jira.example.com',
        token: 'Osebni dostopni žeton',
        tokenSaved: 'Shranjen — pustite prazno, da ga obdržite',
        language: 'Jezik',
    },
    errors: {
        serverUnreachable: 'Strežnika ni mogoče doseči. Ali zaledje teče?',
        api: {
            not_configured:
                'Jira ni nastavljena. Odprite nastavitve ter vnesite URL strežnika in osebni dostopni žeton.',
            invalid_url: 'URL strežnika Jira se mora začeti s https:// ali http://.',
            invalid_language: 'Jezik »{value}« ni podprt.',
            token_rejected: 'Jira je zavrnila osebni dostopni žeton. Preverite ga v nastavitvah.',
            jira: 'Jira je odgovorila z napako {status}: {detail}',
            unreachable: 'Jire ni mogoče doseči: {detail}',
            io: 'Nastavitev ni mogoče shraniti: {detail}',
            invalid_duration: '{field}: »{value}« ni veljaven čas.',
            missing_fields: 'Zahtevek in datum sta obvezna.',
            unknown_option: '»{value}« ni možnost polja Tempo »{attribute}«.',
            missing_attribute: 'Polje Tempo {key} v Jiri ne obstaja.',
        },
    },
}
