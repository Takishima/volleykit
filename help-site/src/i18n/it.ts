import type { TranslationKeys } from './types';

// TODO: Translate all strings to Italian
export const it: TranslationKeys = {
  nav: {
    home: 'Home', // TODO: Home
    gettingStarted: 'Getting Started', // TODO: Iniziare
    assignments: 'Assignments', // TODO: Designazioni
    exchanges: 'Exchanges', // TODO: Scambi
    compensations: 'Compensations', // TODO: Compensi
    calendarMode: 'Calendar Mode', // TODO: Modalità calendario
    travelTime: 'Travel Time', // TODO: Tempo di viaggio
    offlinePwa: 'Offline & PWA', // TODO: Offline & PWA
    settings: 'Settings', // TODO: Impostazioni
  },

  common: {
    openApp: 'Open App', // TODO: Apri App
    learnMore: 'Learn more', // TODO: Scopri di più
    readMore: 'Read more', // TODO: Leggi di più
    back: 'Back', // TODO: Indietro
    next: 'Next', // TODO: Avanti
    previous: 'Previous', // TODO: Precedente
    close: 'Close', // TODO: Chiudi
    menu: 'Menu', // TODO: Menu
    search: 'Search', // TODO: Cerca
  },

  home: {
    title: 'VolleyKit Help', // TODO: Aiuto VolleyKit
    subtitle: 'Your guide to the VolleyKit app', // TODO: La tua guida all'app VolleyKit
    description:
      'Learn how to use VolleyKit to manage your volleyball referee assignments, exchanges, and compensations.', // TODO
    ctaOpenApp: 'Open App', // TODO: Apri App
    ctaGetStarted: 'Get Started', // TODO: Inizia
    featuresTitle: 'Features', // TODO: Funzionalità
    features: {
      assignments: {
        title: 'Assignments', // TODO: Designazioni
        description:
          'View and manage your upcoming referee assignments with all the details you need.', // TODO
      },
      exchanges: {
        title: 'Exchanges', // TODO: Scambi
        description:
          'Request and accept assignment exchanges with other referees easily.', // TODO
      },
      compensations: {
        title: 'Compensations', // TODO: Compensi
        description:
          'Track your referee compensation payments and history in one place.', // TODO
      },
      calendarMode: {
        title: 'Calendar Mode', // TODO: Modalità calendario
        description:
          'Quick read-only access to your schedule without full login.', // TODO
      },
      travelTime: {
        title: 'Travel Time', // TODO: Tempo di viaggio
        description:
          'See how long it takes to reach each venue using Swiss public transport.', // TODO
      },
      offlinePwa: {
        title: 'Offline & PWA', // TODO: Offline & PWA
        description:
          'Access your assignments even without internet. Install as an app.', // TODO
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Getting Started', // TODO: Iniziare
      description:
        'Learn how to set up and start using VolleyKit for your referee assignments.', // TODO
    },
    assignments: {
      title: 'Assignments', // TODO: Designazioni
      description:
        'Learn how to view and manage your volleyball referee assignments in VolleyKit.', // TODO
    },
    exchanges: {
      title: 'Exchanges', // TODO: Scambi
      description:
        'Learn how to request and manage assignment exchanges with other referees.', // TODO
    },
    compensations: {
      title: 'Compensations', // TODO: Compensi
      description:
        'Learn how to track and understand your referee compensation payments.', // TODO
    },
    calendarMode: {
      title: 'Calendar Mode', // TODO: Modalità calendario
      description:
        'Learn about calendar mode for read-only access to referee assignments.', // TODO
    },
    travelTime: {
      title: 'Travel Time', // TODO: Tempo di viaggio
      description:
        'Learn how VolleyKit calculates travel times to game venues using Swiss public transport.', // TODO
    },
    offlinePwa: {
      title: 'Offline & PWA', // TODO: Offline & PWA
      description:
        'Learn how to use VolleyKit offline and install it as a progressive web app.', // TODO
    },
    settings: {
      title: 'Settings', // TODO: Impostazioni
      description:
        'Learn how to customize VolleyKit settings and preferences.', // TODO
    },
  },

  search: {
    placeholder: 'Search documentation...', // TODO: Cerca nella documentazione...
    placeholderShort: 'Search...', // TODO: Cerca...
    noResults: 'No results found', // TODO: Nessun risultato trovato
    tryDifferent: 'Try different keywords', // TODO: Prova con parole chiave diverse
    initialHint: 'Type to start searching', // TODO: Digita per iniziare la ricerca
    initialSubhint: 'Search across all documentation pages', // TODO: Cerca in tutte le pagine della documentazione
    searching: 'Searching...', // TODO: Ricerca in corso...
    unavailable: 'Search not available', // TODO: Ricerca non disponibile
    unavailableHint: 'Run a production build to enable search', // TODO: Esegui una build di produzione per abilitare la ricerca
    resultsCount: '{count} results', // TODO: {count} risultati
    navigateHint: 'to navigate', // TODO: per navigare
    selectHint: 'to select', // TODO: per selezionare
    poweredBy: 'Powered by Pagefind', // TODO: Powered by Pagefind
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Built with Astro', // TODO: Creato con Astro
    forReferees: 'For Swiss volleyball referees', // TODO: Per gli arbitri di pallavolo svizzeri
    copyright: '© {year} VolleyKit',
    mainApp: 'Main App', // TODO: App principale
    documentation: 'Documentation', // TODO: Documentazione
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Open navigation menu', // TODO: Apri menu di navigazione
    closeMenu: 'Close menu', // TODO: Chiudi menu
    openSearch: 'Search documentation', // TODO: Cerca nella documentazione
    closeSearch: 'Close search', // TODO: Chiudi ricerca
    skipToContent: 'Skip to content', // TODO: Vai al contenuto
    breadcrumb: 'Breadcrumb', // TODO: Breadcrumb
    mainNavigation: 'Main navigation', // TODO: Navigazione principale
    mobileNavigation: 'Mobile navigation', // TODO: Navigazione mobile
    externalLink: 'Opens in new tab', // TODO: Si apre in una nuova scheda
  },

  screenshot: {
    placeholder: 'Screenshot placeholder', // TODO: Segnaposto screenshot
    captureInstructions: 'Capture instructions', // TODO: Istruzioni di cattura
  },

  infoBox: {
    info: 'Info', // TODO: Info
    tip: 'Tip', // TODO: Suggerimento
    warning: 'Warning', // TODO: Avviso
  },
};
