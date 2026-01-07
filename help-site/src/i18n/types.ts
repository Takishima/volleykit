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

  // Getting Started page content
  gettingStarted: {
    heading: string;
    lead: string;
    whatIs: {
      title: string;
      description: string;
      features: {
        viewAssignments: string;
        manageExchanges: string;
        trackCompensations: string;
        offlineAccess: string;
        travelTime: string;
      };
      infoBox: string;
    };
    howToLogin: {
      title: string;
      description: string;
      calendarMode: {
        title: string;
        description: string;
        steps: {
          findUrl: { title: string; description: string };
          selectMode: { title: string; description: string };
          pasteUrl: { title: string; description: string };
        };
        infoBox: string;
      };
      fullLogin: {
        title: string;
        description: string;
        steps: {
          openApp: { title: string; description: string };
          enterCredentials: { title: string; description: string };
          stayLoggedIn: { title: string; description: string };
        };
        screenshotAlt: string;
        screenshotCaption: string;
        tipTitle: string;
        tipContent: string;
      };
    };
    quickTour: {
      title: string;
      description: string;
      assignments: { title: string; description: string };
      exchanges: { title: string; description: string };
      compensations: { title: string; description: string };
      settings: { title: string; description: string };
    };
    nextSteps: {
      title: string;
      description: string;
      links: {
        assignments: string;
        exchanges: string;
        compensations: string;
      };
    };
  };

  // Assignments page content
  assignments: {
    heading: string;
    lead: string;
    whatAre: {
      title: string;
      description: string;
      details: {
        dateTime: string;
        teams: string;
        venue: string;
        role: string;
        league: string;
      };
    };
    viewing: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
    };
    details: {
      title: string;
      description: string;
      items: {
        gameInfo: string;
        venueAddress: string;
        travelTime: string;
        otherReferees: string;
        swipeActions: string;
      };
      screenshotAlt: string;
      screenshotCaption: string;
    };
    actions: {
      title: string;
      description: string;
      swipeRight: {
        title: string;
        description: string;
        screenshotAlt: string;
        screenshotCaption: string;
        warning: string;
      };
      swipeLeft: {
        title: string;
        description: string;
        validate: string;
        edit: string;
        screenshotAlt: string;
        screenshotCaption: string;
        tip: string;
      };
      directions: {
        title: string;
        description: string;
      };
    };
    upcomingPast: {
      title: string;
      description: string;
      upcoming: string;
      validationClosed: string;
      tip: string;
    };
  };

  // Exchanges page content
  exchanges: {
    heading: string;
    lead: string;
    whatAre: {
      title: string;
      description: string;
      features: {
        postGames: string;
        browseGames: string;
        acceptGames: string;
      };
      infoBox: string;
    };
    requesting: {
      title: string;
      description: string;
      steps: {
        findAssignment: { title: string; description: string };
        swipeRight: { title: string; description: string };
      };
      screenshotAlt: string;
      screenshotCaption: string;
      warningTitle: string;
      warningContent: string;
    };
    viewing: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
      filtering: {
        title: string;
        description: string;
        distance: string;
        travelTime: string;
        usage: string;
        tip: string;
      };
    };
    accepting: {
      title: string;
      description: string;
      steps: {
        review: { title: string; description: string };
        swipeLeft: { title: string; description: string };
        confirm: { title: string; description: string };
        gameAdded: { title: string; description: string };
      };
      tip: string;
    };
    managing: {
      title: string;
      description: string;
      canceling: {
        title: string;
        description: string;
        steps: {
          goToExchanges: string;
          selectAddedByMe: string;
          swipeRight: string;
          confirmCancellation: string;
        };
        infoBox: string;
      };
    };
  };

  // Compensations page content
  compensations: {
    heading: string;
    lead: string;
    whatAre: {
      title: string;
      description: string;
      details: {
        gameDetails: string;
        date: string;
        amount: string;
        paymentStatus: string;
        role: string;
      };
      infoBox: string;
    };
    viewing: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
      paymentStatus: {
        title: string;
        pending: string;
        processing: string;
        paid: string;
      };
    };
    filtering: {
      title: string;
      description: string;
      tabs: {
        pendingPast: string;
        pendingFuture: string;
        closed: string;
      };
      screenshotAlt: string;
      screenshotCaption: string;
      tip: string;
    };
    exportPdf: {
      title: string;
      description: string;
      usage: string;
      infoBox: string;
    };
    paymentSchedule: {
      title: string;
      description: string;
      details: {
        processing: string;
        bankTransfer: string;
        timing: string;
      };
      warning: string;
    };
  };

  // Calendar Mode page content
  calendarMode: {
    heading: string;
    lead: string;
    whatIs: {
      title: string;
      description: string;
      features: {
        viewAssignments: string;
        seeDetails: string;
        noPassword: string;
        safeToShare: string;
      };
    };
    whoIsFor: {
      title: string;
      description: string;
      useCases: {
        quickChecks: string;
        familyMembers: string;
        calendarIntegration: string;
        publicDevices: string;
      };
      tip: string;
    };
    howToAccess: {
      title: string;
      description: string;
      steps: {
        findCode: { title: string; description: string };
        openApp: { title: string; description: string };
        selectMode: { title: string; description: string };
        enterCode: { title: string; description: string };
      };
      screenshotAlt: string;
      screenshotCaption: string;
    };
    viewingSchedule: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
    };
    limitations: {
      title: string;
      description: string;
      table: {
        feature: string;
        fullLogin: string;
        calendarMode: string;
        viewAssignments: string;
        viewDetails: string;
        travelTime: string;
        confirmAssignments: string;
        requestExchanges: string;
        viewCompensations: string;
        acceptExchanges: string;
      };
      infoBox: string;
    };
    security: {
      title: string;
      description: string;
      tips: {
        shareWithTrust: string;
        dontPostPublicly: string;
        ifCompromised: string;
      };
      warning: string;
    };
  };

  // Travel Time page content
  travelTime: {
    heading: string;
    lead: string;
    howItWorks: {
      title: string;
      description: string;
      considerations: {
        schedules: string;
        walkingTime: string;
        transferTimes: string;
        gameStartTime: string;
      };
      infoBox: string;
    };
    settingHome: {
      title: string;
      description: string;
      steps: {
        openSettings: { title: string; description: string };
        findHomeLocation: { title: string; description: string };
        enterAddress: { title: string; description: string };
        saveSettings: { title: string; description: string };
      };
      screenshotAlt: string;
      screenshotCaption: string;
      tip: string;
    };
    viewingTimes: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
      whatsShown: {
        title: string;
        duration: string;
        departureTime: string;
        transportType: string;
      };
    };
    journeyDetails: {
      title: string;
      description: string;
      features: {
        stepByStep: string;
        connectionDetails: string;
        walkingSegments: string;
        transferTimes: string;
      };
      sbbLink: string;
      screenshotAlt: string;
      screenshotCaption: string;
    };
    arrivalBuffer: {
      title: string;
      description: string;
      details: {
        standardBuffer: string;
        timeFor: string;
        accountForDelays: string;
      };
      warning: string;
    };
    offlineAvailability: {
      title: string;
      description: string;
      details: {
        cachedAvailable: string;
        requiresConnection: string;
        outdatedIndicator: string;
      };
      tip: string;
    };
  };

  // Offline & PWA page content
  offlinePwa: {
    heading: string;
    lead: string;
    whatIsPwa: {
      title: string;
      description: string;
      benefits: {
        homeScreen: string;
        ownWindow: string;
        worksOffline: string;
        autoUpdates: string;
        minimalStorage: string;
      };
      tip: string;
    };
    installing: {
      title: string;
      description: string;
      ios: {
        title: string;
        steps: {
          openSafari: { title: string; description: string };
          tapShare: { title: string; description: string };
          selectAddHome: { title: string; description: string };
          confirmInstall: { title: string; description: string };
        };
      };
      android: {
        title: string;
        steps: {
          openChrome: { title: string; description: string };
          lookForPrompt: { title: string; description: string };
          tapInstall: { title: string; description: string };
        };
      };
      screenshotAlt: string;
      screenshotCaption: string;
      desktop: {
        title: string;
        description: string;
      };
    };
    whatWorksOffline: {
      title: string;
      description: string;
      table: {
        feature: string;
        offline: string;
        notes: string;
        viewAssignments: string;
        viewAssignmentsNote: string;
        viewDetails: string;
        viewDetailsNote: string;
        travelTimes: string;
        travelTimesNote: string;
        confirmAssignments: string;
        confirmAssignmentsNote: string;
        requestExchanges: string;
        requestExchangesNote: string;
        viewCompensations: string;
        viewCompensationsNote: string;
      };
      infoBox: string;
    };
    offlineIndicator: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
    };
    updating: {
      title: string;
      description: string;
      steps: {
        backgroundDownload: string;
        notificationAppears: string;
        tapReload: string;
      };
      screenshotAlt: string;
      screenshotCaption: string;
      tip: string;
    };
    storage: {
      title: string;
      description: string;
      warning: string;
    };
  };

  // Settings page content
  settings: {
    heading: string;
    lead: string;
    accessing: {
      title: string;
      description: string;
      screenshotAlt: string;
      screenshotCaption: string;
    };
    profile: {
      title: string;
      description: string;
      fields: {
        name: string;
        licenseNumber: string;
        email: string;
        sessionStatus: string;
      };
      infoBox: string;
      loggingOut: {
        title: string;
        description: string;
      };
    };
    language: {
      title: string;
      description: string;
      options: {
        deutsch: string;
        english: string;
        francais: string;
        italiano: string;
      };
      autoDetect: string;
      screenshotAlt: string;
      screenshotCaption: string;
    };
    homeLocation: {
      title: string;
      description: string;
      instructions: {
        enterAddress: string;
        useAutocomplete: string;
        travelTimesAppear: string;
      };
      screenshotAlt: string;
      screenshotCaption: string;
      tip: string;
      seeGuide: string;
    };
    dataPrivacy: {
      title: string;
      description: string;
      localStorage: {
        title: string;
        description: string;
        items: {
          assignmentCache: string;
          preferences: string;
          travelData: string;
        };
      };
      clearData: {
        title: string;
        description: string;
        effects: {
          removeCached: string;
          resetPreferences: string;
          requireLogin: string;
        };
        warning: string;
      };
      screenshotAlt: string;
      screenshotCaption: string;
    };
    about: {
      title: string;
      description: string;
      items: {
        versionNumber: string;
        lastUpdated: string;
        links: string;
      };
      infoBox: string;
    };
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
