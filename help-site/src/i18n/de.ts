import type { TranslationKeys } from './types';

// TODO: Translate all strings to German
export const de: TranslationKeys = {
  nav: {
    home: 'Home', // TODO: Startseite
    gettingStarted: 'Getting Started', // TODO: Erste Schritte
    assignments: 'Assignments', // TODO: Einsätze
    exchanges: 'Exchanges', // TODO: Tauschbörse
    compensations: 'Compensations', // TODO: Vergütungen
    calendarMode: 'Calendar Mode', // TODO: Kalendermodus
    travelTime: 'Travel Time', // TODO: Reisezeit
    offlinePwa: 'Offline & PWA', // TODO: Offline & PWA
    settings: 'Settings', // TODO: Einstellungen
  },

  common: {
    openApp: 'Open App', // TODO: App öffnen
    learnMore: 'Learn more', // TODO: Mehr erfahren
    readMore: 'Read more', // TODO: Weiterlesen
    back: 'Back', // TODO: Zurück
    next: 'Next', // TODO: Weiter
    previous: 'Previous', // TODO: Zurück
    close: 'Close', // TODO: Schliessen
    menu: 'Menu', // TODO: Menü
    search: 'Search', // TODO: Suchen
  },

  home: {
    title: 'VolleyKit Help', // TODO: VolleyKit Hilfe
    subtitle: 'Your guide to the VolleyKit app', // TODO: Ihr Leitfaden zur VolleyKit App
    description:
      'Learn how to use VolleyKit to manage your volleyball referee assignments, exchanges, and compensations.', // TODO
    ctaOpenApp: 'Open App', // TODO: App öffnen
    ctaGetStarted: 'Get Started', // TODO: Jetzt starten
    featuresTitle: 'Features', // TODO: Funktionen
    features: {
      assignments: {
        title: 'Assignments', // TODO: Einsätze
        description:
          'View and manage your upcoming referee assignments with all the details you need.', // TODO
      },
      exchanges: {
        title: 'Exchanges', // TODO: Tauschbörse
        description:
          'Request and accept assignment exchanges with other referees easily.', // TODO
      },
      compensations: {
        title: 'Compensations', // TODO: Vergütungen
        description:
          'Track your referee compensation payments and history in one place.', // TODO
      },
      calendarMode: {
        title: 'Calendar Mode', // TODO: Kalendermodus
        description:
          'Quick read-only access to your schedule without full login.', // TODO
      },
      travelTime: {
        title: 'Travel Time', // TODO: Reisezeit
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
      title: 'Getting Started', // TODO: Erste Schritte
      description:
        'Learn how to set up and start using VolleyKit for your referee assignments.', // TODO
    },
    assignments: {
      title: 'Assignments', // TODO: Einsätze
      description:
        'Learn how to view and manage your volleyball referee assignments in VolleyKit.', // TODO
    },
    exchanges: {
      title: 'Exchanges', // TODO: Tauschbörse
      description:
        'Learn how to request and manage assignment exchanges with other referees.', // TODO
    },
    compensations: {
      title: 'Compensations', // TODO: Vergütungen
      description:
        'Learn how to track and understand your referee compensation payments.', // TODO
    },
    calendarMode: {
      title: 'Calendar Mode', // TODO: Kalendermodus
      description:
        'Learn about calendar mode for read-only access to referee assignments.', // TODO
    },
    travelTime: {
      title: 'Travel Time', // TODO: Reisezeit
      description:
        'Learn how VolleyKit calculates travel times to game venues using Swiss public transport.', // TODO
    },
    offlinePwa: {
      title: 'Offline & PWA', // TODO: Offline & PWA
      description:
        'Learn how to use VolleyKit offline and install it as a progressive web app.', // TODO
    },
    settings: {
      title: 'Settings', // TODO: Einstellungen
      description:
        'Learn how to customize VolleyKit settings and preferences.', // TODO
    },
  },

  search: {
    placeholder: 'Search documentation...', // TODO: Dokumentation durchsuchen...
    placeholderShort: 'Search...', // TODO: Suchen...
    noResults: 'No results found', // TODO: Keine Ergebnisse gefunden
    tryDifferent: 'Try different keywords', // TODO: Versuchen Sie andere Suchbegriffe
    initialHint: 'Type to start searching', // TODO: Tippen Sie, um zu suchen
    initialSubhint: 'Search across all documentation pages', // TODO: Durchsuchen Sie alle Dokumentationsseiten
    searching: 'Searching...', // TODO: Suche läuft...
    unavailable: 'Search not available', // TODO: Suche nicht verfügbar
    unavailableHint: 'Run a production build to enable search', // TODO: Führen Sie einen Produktions-Build aus, um die Suche zu aktivieren
    resultsCount: '{count} results', // TODO: {count} Ergebnisse
    navigateHint: 'to navigate', // TODO: zum Navigieren
    selectHint: 'to select', // TODO: zum Auswählen
    poweredBy: 'Powered by Pagefind', // TODO: Unterstützt von Pagefind
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Built with Astro', // TODO: Erstellt mit Astro
    forReferees: 'For Swiss volleyball referees', // TODO: Für Schweizer Volleyball-Schiedsrichter
    copyright: '© {year} VolleyKit',
    mainApp: 'Main App', // TODO: Haupt-App
    documentation: 'Documentation', // TODO: Dokumentation
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Open navigation menu', // TODO: Navigationsmenü öffnen
    closeMenu: 'Close menu', // TODO: Menü schliessen
    openSearch: 'Search documentation', // TODO: Dokumentation durchsuchen
    closeSearch: 'Close search', // TODO: Suche schliessen
    skipToContent: 'Skip to content', // TODO: Zum Inhalt springen
    breadcrumb: 'Breadcrumb', // TODO: Brotkrümel-Navigation
    mainNavigation: 'Main navigation', // TODO: Hauptnavigation
    mobileNavigation: 'Mobile navigation', // TODO: Mobile Navigation
    externalLink: 'Opens in new tab', // TODO: Öffnet in neuem Tab
  },

  screenshot: {
    placeholder: 'Screenshot placeholder', // TODO: Screenshot-Platzhalter
    captureInstructions: 'Capture instructions', // TODO: Aufnahmeanweisungen
  },

  infoBox: {
    info: 'Info', // TODO: Info
    tip: 'Tip', // TODO: Tipp
    warning: 'Warning', // TODO: Warnung
  },
};
