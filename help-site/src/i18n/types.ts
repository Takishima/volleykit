/**
 * Translation keys for the help site
 * All UI strings should be defined here for type safety
 */

export interface TranslationKeys {
  // Navigation items
  nav: {
    home: string;
    gettingStarted: string;
    assignments: string;
    exchanges: string;
    compensations: string;
    calendarMode: string;
    travelTime: string;
    offlinePwa: string;
    settings: string;
  };

  // Common UI elements
  common: {
    openApp: string;
    learnMore: string;
    readMore: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    menu: string;
    search: string;
    viewOnGithub: string;
  };

  // Landing page
  home: {
    title: string;
    subtitle: string;
    description: string;
    ctaOpenApp: string;
    ctaGetStarted: string;
    featuresTitle: string;
    readyToStart: string;
    features: {
      gettingStarted: {
        title: string;
        description: string;
      };
      assignments: {
        title: string;
        description: string;
      };
      exchanges: {
        title: string;
        description: string;
      };
      compensations: {
        title: string;
        description: string;
      };
      calendarMode: {
        title: string;
        description: string;
      };
      travelTime: {
        title: string;
        description: string;
      };
      offlinePwa: {
        title: string;
        description: string;
      };
      settings: {
        title: string;
        description: string;
      };
    };
  };

  // Page titles and descriptions
  pages: {
    gettingStarted: {
      title: string;
      description: string;
    };
    assignments: {
      title: string;
      description: string;
    };
    exchanges: {
      title: string;
      description: string;
    };
    compensations: {
      title: string;
      description: string;
    };
    calendarMode: {
      title: string;
      description: string;
    };
    travelTime: {
      title: string;
      description: string;
    };
    offlinePwa: {
      title: string;
      description: string;
    };
    settings: {
      title: string;
      description: string;
    };
  };

  // Search UI
  search: {
    placeholder: string;
    placeholderShort: string;
    noResults: string;
    tryDifferent: string;
    initialHint: string;
    initialSubhint: string;
    searching: string;
    unavailable: string;
    unavailableHint: string;
    resultsCount: string;
    navigateHint: string;
    selectHint: string;
    poweredBy: string;
    shortcut: string;
  };

  // Footer
  footer: {
    builtWith: string;
    forReferees: string;
    copyright: string;
    mainApp: string;
    documentation: string;
    github: string;
  };

  // Accessibility labels
  a11y: {
    openMenu: string;
    closeMenu: string;
    openSearch: string;
    closeSearch: string;
    skipToContent: string;
    breadcrumb: string;
    mainNavigation: string;
    mobileNavigation: string;
    externalLink: string;
  };

  // Screenshot placeholders
  screenshot: {
    placeholder: string;
    captureInstructions: string;
  };

  // Info boxes
  infoBox: {
    info: string;
    tip: string;
    warning: string;
  };
}

export type Language = 'en' | 'de' | 'fr' | 'it';

export const languages: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
};

export const defaultLanguage: Language = 'en';
