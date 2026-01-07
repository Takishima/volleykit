import type { TranslationKeys } from './types';

export const fr: TranslationKeys = {
  nav: {
    home: 'Accueil',
    gettingStarted: 'Premiers pas',
    assignments: 'Désignations',
    exchanges: 'Échanges',
    compensations: 'Indemnités',
    calendarMode: 'Mode calendrier',
    travelTime: 'Temps de trajet',
    offlinePwa: 'Hors ligne & PWA',
    settings: 'Paramètres',
  },

  common: {
    openApp: "Ouvrir l'app",
    learnMore: 'En savoir plus',
    readMore: 'Lire la suite',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    close: 'Fermer',
    menu: 'Menu',
    search: 'Rechercher',
    viewOnGithub: 'Voir sur GitHub',
  },

  home: {
    title: 'Aide VolleyKit',
    subtitle: "Votre guide de l'application VolleyKit",
    description:
      "Apprenez à utiliser VolleyKit pour gérer vos désignations d'arbitrage, échanges et indemnités.",
    ctaOpenApp: "Ouvrir l'app",
    ctaGetStarted: 'Commencer',
    featuresTitle: 'Explorer la documentation',
    readyToStart: 'Prêt à commencer ?',
    features: {
      gettingStarted: {
        title: 'Premiers pas',
        description:
          'Guide de démarrage rapide pour configurer et utiliser VolleyKit.',
      },
      assignments: {
        title: 'Désignations',
        description:
          "Consultez et gérez vos prochains matchs d'arbitrage de volleyball.",
      },
      exchanges: {
        title: 'Échanges',
        description:
          "Demandez des échanges et proposez vos désignations à d'autres arbitres.",
      },
      compensations: {
        title: 'Indemnités',
        description:
          "Suivez vos gains d'arbitrage et l'historique de vos indemnités.",
      },
      calendarMode: {
        title: 'Mode calendrier',
        description:
          'Accès en lecture seule aux désignations sans connexion.',
      },
      travelTime: {
        title: 'Temps de trajet',
        description:
          'Calculez les temps de trajet avec les transports publics suisses.',
      },
      offlinePwa: {
        title: 'Hors ligne & PWA',
        description:
          "Installez l'app et utilisez-la hors ligne sur votre appareil.",
      },
      settings: {
        title: 'Paramètres',
        description:
          'Personnalisez la langue, le thème et les préférences de notification.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Premiers pas',
      description:
        "Apprenez à configurer et commencer à utiliser VolleyKit pour vos désignations d'arbitrage.",
    },
    assignments: {
      title: 'Désignations',
      description:
        "Apprenez à consulter et gérer vos désignations d'arbitrage de volleyball dans VolleyKit.",
    },
    exchanges: {
      title: 'Échanges',
      description:
        "Apprenez à demander et gérer les échanges de désignations avec d'autres arbitres.",
    },
    compensations: {
      title: 'Indemnités',
      description:
        "Apprenez à suivre et comprendre vos paiements d'indemnités d'arbitrage.",
    },
    calendarMode: {
      title: 'Mode calendrier',
      description:
        "Découvrez le mode calendrier pour un accès en lecture seule aux désignations d'arbitrage.",
    },
    travelTime: {
      title: 'Temps de trajet',
      description:
        'Découvrez comment VolleyKit calcule les temps de trajet vers les salles de match en utilisant les transports publics suisses.',
    },
    offlinePwa: {
      title: 'Hors ligne & PWA',
      description:
        "Apprenez à utiliser VolleyKit hors ligne et à l'installer comme application web progressive.",
    },
    settings: {
      title: 'Paramètres',
      description:
        'Apprenez à personnaliser les paramètres et préférences de VolleyKit.',
    },
  },

  search: {
    placeholder: 'Rechercher dans la documentation...',
    placeholderShort: 'Rechercher...',
    noResults: 'Aucun résultat trouvé',
    tryDifferent: "Essayez d'autres mots-clés",
    initialHint: 'Tapez pour commencer la recherche',
    initialSubhint: 'Rechercher dans toutes les pages de documentation',
    searching: 'Recherche en cours...',
    unavailable: 'Recherche non disponible',
    unavailableHint:
      'Exécutez une build de production pour activer la recherche',
    resultsCount: '{count} résultats',
    navigateHint: 'pour naviguer',
    selectHint: 'pour sélectionner',
    poweredBy: 'Propulsé par Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Créé avec Astro',
    forReferees: 'Pour les arbitres de volleyball suisses',
    copyright: '© {year} VolleyKit',
    mainApp: 'Application principale',
    documentation: 'Documentation',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Ouvrir le menu de navigation',
    closeMenu: 'Fermer le menu',
    openSearch: 'Rechercher dans la documentation',
    closeSearch: 'Fermer la recherche',
    skipToContent: 'Aller au contenu',
    breadcrumb: "Fil d'Ariane",
    mainNavigation: 'Navigation principale',
    mobileNavigation: 'Navigation mobile',
    externalLink: "S'ouvre dans un nouvel onglet",
  },

  screenshot: {
    placeholder: "Emplacement de capture d'écran",
    captureInstructions: 'Instructions de capture',
  },

  infoBox: {
    info: 'Info',
    tip: 'Astuce',
    warning: 'Avertissement',
  },
};
