import type { TranslationKeys } from './types';

// TODO: Translate all strings to French
export const fr: TranslationKeys = {
  nav: {
    home: 'Home', // TODO: Accueil
    gettingStarted: 'Getting Started', // TODO: Premiers pas
    assignments: 'Assignments', // TODO: Désignations
    exchanges: 'Exchanges', // TODO: Échanges
    compensations: 'Compensations', // TODO: Indemnités
    calendarMode: 'Calendar Mode', // TODO: Mode calendrier
    travelTime: 'Travel Time', // TODO: Temps de trajet
    offlinePwa: 'Offline & PWA', // TODO: Hors ligne & PWA
    settings: 'Settings', // TODO: Paramètres
  },

  common: {
    openApp: 'Open App', // TODO: Ouvrir l'app
    learnMore: 'Learn more', // TODO: En savoir plus
    readMore: 'Read more', // TODO: Lire la suite
    back: 'Back', // TODO: Retour
    next: 'Next', // TODO: Suivant
    previous: 'Previous', // TODO: Précédent
    close: 'Close', // TODO: Fermer
    menu: 'Menu', // TODO: Menu
    search: 'Search', // TODO: Rechercher
  },

  home: {
    title: 'VolleyKit Help', // TODO: Aide VolleyKit
    subtitle: 'Your guide to the VolleyKit app', // TODO: Votre guide de l'application VolleyKit
    description:
      'Learn how to use VolleyKit to manage your volleyball referee assignments, exchanges, and compensations.', // TODO
    ctaOpenApp: 'Open App', // TODO: Ouvrir l'app
    ctaGetStarted: 'Get Started', // TODO: Commencer
    featuresTitle: 'Features', // TODO: Fonctionnalités
    features: {
      assignments: {
        title: 'Assignments', // TODO: Désignations
        description:
          'View and manage your upcoming referee assignments with all the details you need.', // TODO
      },
      exchanges: {
        title: 'Exchanges', // TODO: Échanges
        description:
          'Request and accept assignment exchanges with other referees easily.', // TODO
      },
      compensations: {
        title: 'Compensations', // TODO: Indemnités
        description:
          'Track your referee compensation payments and history in one place.', // TODO
      },
      calendarMode: {
        title: 'Calendar Mode', // TODO: Mode calendrier
        description:
          'Quick read-only access to your schedule without full login.', // TODO
      },
      travelTime: {
        title: 'Travel Time', // TODO: Temps de trajet
        description:
          'See how long it takes to reach each venue using Swiss public transport.', // TODO
      },
      offlinePwa: {
        title: 'Offline & PWA', // TODO: Hors ligne & PWA
        description:
          'Access your assignments even without internet. Install as an app.', // TODO
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Getting Started', // TODO: Premiers pas
      description:
        'Learn how to set up and start using VolleyKit for your referee assignments.', // TODO
    },
    assignments: {
      title: 'Assignments', // TODO: Désignations
      description:
        'Learn how to view and manage your volleyball referee assignments in VolleyKit.', // TODO
    },
    exchanges: {
      title: 'Exchanges', // TODO: Échanges
      description:
        'Learn how to request and manage assignment exchanges with other referees.', // TODO
    },
    compensations: {
      title: 'Compensations', // TODO: Indemnités
      description:
        'Learn how to track and understand your referee compensation payments.', // TODO
    },
    calendarMode: {
      title: 'Calendar Mode', // TODO: Mode calendrier
      description:
        'Learn about calendar mode for read-only access to referee assignments.', // TODO
    },
    travelTime: {
      title: 'Travel Time', // TODO: Temps de trajet
      description:
        'Learn how VolleyKit calculates travel times to game venues using Swiss public transport.', // TODO
    },
    offlinePwa: {
      title: 'Offline & PWA', // TODO: Hors ligne & PWA
      description:
        'Learn how to use VolleyKit offline and install it as a progressive web app.', // TODO
    },
    settings: {
      title: 'Settings', // TODO: Paramètres
      description:
        'Learn how to customize VolleyKit settings and preferences.', // TODO
    },
  },

  search: {
    placeholder: 'Search documentation...', // TODO: Rechercher dans la documentation...
    placeholderShort: 'Search...', // TODO: Rechercher...
    noResults: 'No results found', // TODO: Aucun résultat trouvé
    tryDifferent: 'Try different keywords', // TODO: Essayez d'autres mots-clés
    initialHint: 'Type to start searching', // TODO: Tapez pour commencer la recherche
    initialSubhint: 'Search across all documentation pages', // TODO: Rechercher dans toutes les pages de documentation
    searching: 'Searching...', // TODO: Recherche en cours...
    unavailable: 'Search not available', // TODO: Recherche non disponible
    unavailableHint: 'Run a production build to enable search', // TODO: Exécutez une build de production pour activer la recherche
    resultsCount: '{count} results', // TODO: {count} résultats
    navigateHint: 'to navigate', // TODO: pour naviguer
    selectHint: 'to select', // TODO: pour sélectionner
    poweredBy: 'Powered by Pagefind', // TODO: Propulsé par Pagefind
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Built with Astro', // TODO: Créé avec Astro
    forReferees: 'For Swiss volleyball referees', // TODO: Pour les arbitres de volleyball suisses
    copyright: '© {year} VolleyKit',
    mainApp: 'Main App', // TODO: Application principale
    documentation: 'Documentation', // TODO: Documentation
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Open navigation menu', // TODO: Ouvrir le menu de navigation
    closeMenu: 'Close menu', // TODO: Fermer le menu
    openSearch: 'Search documentation', // TODO: Rechercher dans la documentation
    closeSearch: 'Close search', // TODO: Fermer la recherche
    skipToContent: 'Skip to content', // TODO: Aller au contenu
    breadcrumb: 'Breadcrumb', // TODO: Fil d'Ariane
    mainNavigation: 'Main navigation', // TODO: Navigation principale
    mobileNavigation: 'Mobile navigation', // TODO: Navigation mobile
    externalLink: 'Opens in new tab', // TODO: S'ouvre dans un nouvel onglet
  },

  screenshot: {
    placeholder: 'Screenshot placeholder', // TODO: Emplacement de capture d'écran
    captureInstructions: 'Capture instructions', // TODO: Instructions de capture
  },

  infoBox: {
    info: 'Info', // TODO: Info
    tip: 'Tip', // TODO: Astuce
    warning: 'Warning', // TODO: Avertissement
  },
};
