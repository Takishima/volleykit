import type { TranslationKeys } from './types';

export const en: TranslationKeys = {
  nav: {
    home: 'Home',
    gettingStarted: 'Getting Started',
    assignments: 'Assignments',
    exchanges: 'Exchanges',
    compensations: 'Compensations',
    calendarMode: 'Calendar Mode',
    travelTime: 'Travel Time',
    offlinePwa: 'Offline & PWA',
    settings: 'Settings',
  },

  common: {
    openApp: 'Open App',
    learnMore: 'Learn more',
    readMore: 'Read more',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    menu: 'Menu',
    search: 'Search',
  },

  home: {
    title: 'VolleyKit Help',
    subtitle: 'Your guide to the VolleyKit app',
    description:
      'Learn how to use VolleyKit to manage your volleyball referee assignments, exchanges, and compensations.',
    ctaOpenApp: 'Open App',
    ctaGetStarted: 'Get Started',
    featuresTitle: 'Features',
    features: {
      assignments: {
        title: 'Assignments',
        description:
          'View and manage your upcoming referee assignments with all the details you need.',
      },
      exchanges: {
        title: 'Exchanges',
        description:
          'Request and accept assignment exchanges with other referees easily.',
      },
      compensations: {
        title: 'Compensations',
        description:
          'Track your referee compensation payments and history in one place.',
      },
      calendarMode: {
        title: 'Calendar Mode',
        description:
          'Quick read-only access to your schedule without full login.',
      },
      travelTime: {
        title: 'Travel Time',
        description:
          'See how long it takes to reach each venue using Swiss public transport.',
      },
      offlinePwa: {
        title: 'Offline & PWA',
        description:
          'Access your assignments even without internet. Install as an app.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Getting Started',
      description:
        'Learn how to set up and start using VolleyKit for your referee assignments.',
    },
    assignments: {
      title: 'Assignments',
      description:
        'Learn how to view and manage your volleyball referee assignments in VolleyKit.',
    },
    exchanges: {
      title: 'Exchanges',
      description:
        'Learn how to request and manage assignment exchanges with other referees.',
    },
    compensations: {
      title: 'Compensations',
      description:
        'Learn how to track and understand your referee compensation payments.',
    },
    calendarMode: {
      title: 'Calendar Mode',
      description:
        'Learn about calendar mode for read-only access to referee assignments.',
    },
    travelTime: {
      title: 'Travel Time',
      description:
        'Learn how VolleyKit calculates travel times to game venues using Swiss public transport.',
    },
    offlinePwa: {
      title: 'Offline & PWA',
      description:
        'Learn how to use VolleyKit offline and install it as a progressive web app.',
    },
    settings: {
      title: 'Settings',
      description:
        'Learn how to customize VolleyKit settings and preferences.',
    },
  },

  search: {
    placeholder: 'Search documentation...',
    placeholderShort: 'Search...',
    noResults: 'No results found',
    tryDifferent: 'Try different keywords',
    initialHint: 'Type to start searching',
    initialSubhint: 'Search across all documentation pages',
    searching: 'Searching...',
    unavailable: 'Search not available',
    unavailableHint: 'Run a production build to enable search',
    resultsCount: '{count} results',
    navigateHint: 'to navigate',
    selectHint: 'to select',
    poweredBy: 'Powered by Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Built with Astro',
    forReferees: 'For Swiss volleyball referees',
    copyright: '© {year} VolleyKit',
    mainApp: 'Main App',
    documentation: 'Documentation',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Open navigation menu',
    closeMenu: 'Close menu',
    openSearch: 'Search documentation',
    closeSearch: 'Close search',
    skipToContent: 'Skip to content',
    breadcrumb: 'Breadcrumb',
    mainNavigation: 'Main navigation',
    mobileNavigation: 'Mobile navigation',
    externalLink: 'Opens in new tab',
  },

  screenshot: {
    placeholder: 'Screenshot placeholder',
    captureInstructions: 'Capture instructions',
  },

  infoBox: {
    info: 'Info',
    tip: 'Tip',
    warning: 'Warning',
  },
};
