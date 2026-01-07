import type { TranslationKeys } from './types';

export const de: TranslationKeys = {
  nav: {
    home: 'Startseite',
    gettingStarted: 'Erste Schritte',
    assignments: 'Einsätze',
    exchanges: 'Tauschbörse',
    compensations: 'Vergütungen',
    calendarMode: 'Kalendermodus',
    travelTime: 'Reisezeit',
    offlinePwa: 'Offline & PWA',
    settings: 'Einstellungen',
  },

  common: {
    openApp: 'App öffnen',
    learnMore: 'Mehr erfahren',
    readMore: 'Weiterlesen',
    back: 'Zurück',
    next: 'Weiter',
    previous: 'Zurück',
    close: 'Schliessen',
    menu: 'Menü',
    search: 'Suchen',
    viewOnGithub: 'Auf GitHub ansehen',
  },

  home: {
    title: 'VolleyKit Hilfe',
    subtitle: 'Ihr Leitfaden zur VolleyKit App',
    description:
      'Erfahren Sie, wie Sie VolleyKit nutzen können, um Ihre Volleyball-Schiedsrichtereinsätze, Tauschbörse und Vergütungen zu verwalten.',
    ctaOpenApp: 'App öffnen',
    ctaGetStarted: 'Jetzt starten',
    featuresTitle: 'Dokumentation erkunden',
    readyToStart: 'Bereit loszulegen?',
    features: {
      gettingStarted: {
        title: 'Erste Schritte',
        description:
          'Schnellstartanleitung zur Einrichtung und Nutzung von VolleyKit.',
      },
      assignments: {
        title: 'Einsätze',
        description:
          'Sehen und verwalten Sie Ihre anstehenden Volleyball-Schiedsrichterspiele.',
      },
      exchanges: {
        title: 'Tauschbörse',
        description:
          'Fordern Sie Spieltausche an und bieten Sie Ihre Einsätze anderen Schiedsrichtern an.',
      },
      compensations: {
        title: 'Vergütungen',
        description:
          'Verfolgen Sie Ihre Schiedsrichtervergütungen und deren Verlauf.',
      },
      calendarMode: {
        title: 'Kalendermodus',
        description:
          'Nur-Lese-Zugriff auf Einsätze ohne Anmeldung.',
      },
      travelTime: {
        title: 'Reisezeit',
        description:
          'Reisezeiten mit Schweizer ÖV-Integration berechnen.',
      },
      offlinePwa: {
        title: 'Offline & PWA',
        description:
          'App installieren und offline auf Ihrem Gerät nutzen.',
      },
      settings: {
        title: 'Einstellungen',
        description:
          'Sprache, Design und Benachrichtigungen anpassen.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Erste Schritte',
      description:
        'Erfahren Sie, wie Sie VolleyKit einrichten und für Ihre Schiedsrichtereinsätze nutzen können.',
    },
    assignments: {
      title: 'Einsätze',
      description:
        'Erfahren Sie, wie Sie Ihre Volleyball-Schiedsrichtereinsätze in VolleyKit anzeigen und verwalten können.',
    },
    exchanges: {
      title: 'Tauschbörse',
      description:
        'Erfahren Sie, wie Sie Einsatztausche mit anderen Schiedsrichtern anfordern und verwalten können.',
    },
    compensations: {
      title: 'Vergütungen',
      description:
        'Erfahren Sie, wie Sie Ihre Schiedsrichtervergütungen verfolgen und verstehen können.',
    },
    calendarMode: {
      title: 'Kalendermodus',
      description:
        'Erfahren Sie mehr über den Kalendermodus für den Nur-Lese-Zugriff auf Schiedsrichtereinsätze.',
    },
    travelTime: {
      title: 'Reisezeit',
      description:
        'Erfahren Sie, wie VolleyKit Reisezeiten zu Spielorten mit dem öffentlichen Verkehr in der Schweiz berechnet.',
    },
    offlinePwa: {
      title: 'Offline & PWA',
      description:
        'Erfahren Sie, wie Sie VolleyKit offline nutzen und als Progressive Web App installieren können.',
    },
    settings: {
      title: 'Einstellungen',
      description:
        'Erfahren Sie, wie Sie VolleyKit-Einstellungen und -Präferenzen anpassen können.',
    },
  },

  search: {
    placeholder: 'Dokumentation durchsuchen...',
    placeholderShort: 'Suchen...',
    noResults: 'Keine Ergebnisse gefunden',
    tryDifferent: 'Versuchen Sie andere Suchbegriffe',
    initialHint: 'Tippen Sie, um zu suchen',
    initialSubhint: 'Durchsuchen Sie alle Dokumentationsseiten',
    searching: 'Suche läuft...',
    unavailable: 'Suche nicht verfügbar',
    unavailableHint:
      'Führen Sie einen Produktions-Build aus, um die Suche zu aktivieren',
    resultsCount: '{count} Ergebnisse',
    navigateHint: 'zum Navigieren',
    selectHint: 'zum Auswählen',
    poweredBy: 'Unterstützt von Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Erstellt mit Astro',
    forReferees: 'Für Schweizer Volleyball-Schiedsrichter',
    copyright: '© {year} VolleyKit',
    mainApp: 'Haupt-App',
    documentation: 'Dokumentation',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Navigationsmenü öffnen',
    closeMenu: 'Menü schliessen',
    openSearch: 'Dokumentation durchsuchen',
    closeSearch: 'Suche schliessen',
    skipToContent: 'Zum Inhalt springen',
    breadcrumb: 'Brotkrümel-Navigation',
    mainNavigation: 'Hauptnavigation',
    mobileNavigation: 'Mobile Navigation',
    externalLink: 'Öffnet in neuem Tab',
  },

  screenshot: {
    placeholder: 'Screenshot-Platzhalter',
    captureInstructions: 'Aufnahmeanweisungen',
  },

  infoBox: {
    info: 'Info',
    tip: 'Tipp',
    warning: 'Warnung',
  },
};
