import type { TranslationKeys } from './types';

export const it: TranslationKeys = {
  nav: {
    home: 'Home',
    gettingStarted: 'Primi passi',
    assignments: 'Designazioni',
    exchanges: 'Scambi',
    compensations: 'Compensi',
    calendarMode: 'Modalità calendario',
    travelTime: 'Tempo di viaggio',
    offlinePwa: 'Offline & PWA',
    settings: 'Impostazioni',
  },

  common: {
    openApp: 'Apri App',
    learnMore: 'Scopri di più',
    readMore: 'Leggi di più',
    back: 'Indietro',
    next: 'Avanti',
    previous: 'Precedente',
    close: 'Chiudi',
    menu: 'Menu',
    search: 'Cerca',
  },

  home: {
    title: 'Aiuto VolleyKit',
    subtitle: 'La tua guida all\'app VolleyKit',
    description:
      'Scopri come utilizzare VolleyKit per gestire le tue designazioni arbitrali, gli scambi e i compensi.',
    ctaOpenApp: 'Apri App',
    ctaGetStarted: 'Inizia',
    featuresTitle: 'Funzionalità',
    features: {
      assignments: {
        title: 'Designazioni',
        description:
          'Visualizza e gestisci le tue prossime designazioni arbitrali con tutti i dettagli necessari.',
      },
      exchanges: {
        title: 'Scambi',
        description:
          'Richiedi e accetta scambi di designazioni con altri arbitri in modo semplice.',
      },
      compensations: {
        title: 'Compensi',
        description:
          'Tieni traccia dei tuoi compensi arbitrali e dello storico in un unico posto.',
      },
      calendarMode: {
        title: 'Modalità calendario',
        description:
          'Accesso rapido in sola lettura al tuo programma senza login completo.',
      },
      travelTime: {
        title: 'Tempo di viaggio',
        description:
          'Scopri quanto tempo ci vuole per raggiungere ogni sede con i trasporti pubblici svizzeri.',
      },
      offlinePwa: {
        title: 'Offline & PWA',
        description:
          'Accedi alle tue designazioni anche senza internet. Installabile come app.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Primi passi',
      description:
        'Scopri come configurare e iniziare a usare VolleyKit per le tue designazioni arbitrali.',
    },
    assignments: {
      title: 'Designazioni',
      description:
        'Scopri come visualizzare e gestire le tue designazioni arbitrali in VolleyKit.',
    },
    exchanges: {
      title: 'Scambi',
      description:
        'Scopri come richiedere e gestire gli scambi di designazioni con altri arbitri.',
    },
    compensations: {
      title: 'Compensi',
      description:
        'Scopri come monitorare e comprendere i tuoi compensi arbitrali.',
    },
    calendarMode: {
      title: 'Modalità calendario',
      description:
        'Scopri la modalità calendario per l\'accesso in sola lettura alle designazioni arbitrali.',
    },
    travelTime: {
      title: 'Tempo di viaggio',
      description:
        'Scopri come VolleyKit calcola i tempi di viaggio verso le sedi delle partite con i trasporti pubblici svizzeri.',
    },
    offlinePwa: {
      title: 'Offline & PWA',
      description:
        'Scopri come usare VolleyKit offline e installarlo come app progressiva.',
    },
    settings: {
      title: 'Impostazioni',
      description:
        'Scopri come personalizzare le impostazioni e le preferenze di VolleyKit.',
    },
  },

  search: {
    placeholder: 'Cerca nella documentazione...',
    placeholderShort: 'Cerca...',
    noResults: 'Nessun risultato trovato',
    tryDifferent: 'Prova con parole chiave diverse',
    initialHint: 'Digita per iniziare la ricerca',
    initialSubhint: 'Cerca in tutte le pagine della documentazione',
    searching: 'Ricerca in corso...',
    unavailable: 'Ricerca non disponibile',
    unavailableHint:
      'Esegui una build di produzione per abilitare la ricerca',
    resultsCount: '{count} risultati',
    navigateHint: 'per navigare',
    selectHint: 'per selezionare',
    poweredBy: 'Powered by Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Creato con Astro',
    forReferees: 'Per gli arbitri di pallavolo svizzeri',
    copyright: '© {year} VolleyKit',
    mainApp: 'App principale',
    documentation: 'Documentazione',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Apri menu di navigazione',
    closeMenu: 'Chiudi menu',
    openSearch: 'Cerca nella documentazione',
    closeSearch: 'Chiudi ricerca',
    skipToContent: 'Vai al contenuto',
    breadcrumb: 'Breadcrumb',
    mainNavigation: 'Navigazione principale',
    mobileNavigation: 'Navigazione mobile',
    externalLink: 'Si apre in una nuova scheda',
  },

  screenshot: {
    placeholder: 'Segnaposto screenshot',
    captureInstructions: 'Istruzioni di cattura',
  },

  infoBox: {
    info: 'Info',
    tip: 'Suggerimento',
    warning: 'Avviso',
  },
};
