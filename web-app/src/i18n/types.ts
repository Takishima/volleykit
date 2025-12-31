/**
 * Translation keys organized by feature.
 * Shared type definition for all locale files.
 */
export interface Translations {
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    close: string;
    done: string;
    confirm: string;
    noResults: string;
    today: string;
    tomorrow: string;
    home: string;
    away: string;
    men: string;
    women: string;
    match: string;
    dateTime: string;
    location: string;
    position: string;
    requiredLevel: string;
    demoModeBanner: string;
    optional: string;
    tbd: string;
    locationTbd: string;
    selectRole: string;
    selectOccupation: string;
    vs: string;
    unknown: string;
    unknownDate: string;
    currencyChf: string;
    distanceUnit: string;
    minutesUnit: string;
    hoursUnit: string;
    dismissNotification: string;
    notifications: string;
    cardActions: string;
    wizardProgress: string;
    stepIndicatorCurrent: string;
    stepIndicatorDone: string;
    dob: string;
  };
  auth: {
    login: string;
    logout: string;
    username: string;
    password: string;
    loginButton: string;
    loggingIn: string;
    invalidCredentials: string;
    sessionExpired: string;
    checkingSession: string;
    subtitle: string;
    or: string;
    demoMode: string;
    loginInfo: string;
    privacyNote: string;
    loadingDemo: string;
  };
  occupations: {
    referee: string;
    linesmen: string;
    player: string;
    clubAdmin: string;
    associationAdmin: string;
  };
  assignments: {
    title: string;
    upcoming: string;
    past: string;
    validationClosed: string;
    loading: string;
    noAssignments: string;
    noUpcomingTitle: string;
    noUpcomingDescription: string;
    noClosedTitle: string;
    noClosedDescription: string;
    confirmed: string;
    pending: string;
    cancelled: string;
    active: string;
    archived: string;
    editCompensation: string;
    validateGame: string;
    kilometers: string;
    reason: string;
    reasonPlaceholder: string;
    homeScore: string;
    awayScore: string;
    numberOfSets: string;
    gameReportNotAvailable: string;
    reportGenerated: string;
    openSbbConnection: string;
    openInGoogleMaps: string;
    openAddressInMaps: string;
    invalidKilometers: string;
    failedToLoadData: string;
  };
  compensations: {
    title: string;
    noCompensations: string;
    paid: string;
    unpaid: string;
    pending: string;
    total: string;
    gameFee: string;
    travel: string;
    distance: string;
    status: string;
    all: string;
    received: string;
    loading: string;
    noCompensationsTitle: string;
    noCompensationsDescription: string;
    noPaidTitle: string;
    noPaidDescription: string;
    noUnpaidTitle: string;
    noUnpaidDescription: string;
    errorLoading: string;
    pdfNotAvailableDemo: string;
    pdfDownloadFailed: string;
    editingRestrictedByRegion: string;
    assignmentNotFoundInCache: string;
    compensationNotFound: string;
    compensationMissingId: string;
  };
  exchange: {
    title: string;
    noExchanges: string;
    apply: string;
    withdraw: string;
    open: string;
    applied: string;
    closed: string;
    all: string;
    myApplications: string;
    loading: string;
    takeOverTitle: string;
    takeOverConfirm: string;
    takeOverButton: string;
    removeTitle: string;
    removeConfirm: string;
    removeButton: string;
    filters: string;
    filterByLevel: string;
    filterByDistance: string;
    filterByTravelTime: string;
    travelTime: string;
    calculatingTravelTime: string;
    noExchangesAtLevel: string;
    noExchangesWithFilters: string;
    noOpenExchangesTitle: string;
    noOpenExchangesDescription: string;
    noApplicationsTitle: string;
    noApplicationsDescription: string;
    applySuccess: string;
    applyError: string;
    withdrawSuccess: string;
    withdrawError: string;
    addedToExchangeSuccess: string;
    addedToExchangeError: string;
    submittedBy: string;
    levelRequired: string;
    errorLoading: string;
    settings: {
      title: string;
      maxDistance: string;
      maxTravelTime: string;
      description: string;
    };
  };
  positions: {
    "head-one": string;
    "head-two": string;
    "linesman-one": string;
    "linesman-two": string;
    "linesman-three": string;
    "linesman-four": string;
    "standby-head": string;
    "standby-linesman": string;
  };
  nav: {
    assignments: string;
    compensations: string;
    exchange: string;
    settings: string;
  };
  settings: {
    title: string;
    profile: string;
    language: string;
    homeLocation: {
      title: string;
      description: string;
      currentLocation: string;
      useCurrentLocation: string;
      locating: string;
      searchLabel: string;
      searchPlaceholder: string;
      searchError: string;
      noResults: string;
      clear: string;
      errorPermissionDenied: string;
      errorPositionUnavailable: string;
      errorTimeout: string;
      errorUnknown: string;
    };
    transport: {
      title: string;
      description: string;
      enableCalculations: string;
      requiresHomeLocation: string;
      apiNotConfigured: string;
      maxTravelTime: string;
      arrivalTime: string;
      arrivalTimeDescription: string;
      cacheInfo: string;
      cacheEntries: string;
      refreshCache: string;
      refreshCacheConfirm: string;
      cacheCleared: string;
    };
    dataRetention: {
      title: string;
      description: string;
      homeLocation: string;
      filterPreferences: string;
      travelTimeCache: string;
      languagePreference: string;
      clearData: string;
      clearDataConfirm: string;
      externalServices: string;
      transportApiNote: string;
    };
    accessibility: {
      title: string;
      description: string;
      preventZoom: string;
      preventZoomDescription: string;
      preventZoomEnabled: string;
      preventZoomDisabled: string;
    };
    safeMode: string;
    safeModeDescription: string;
    safeModeEnabled: string;
    safeModeDisabled: string;
    safeModeWarningTitle: string;
    safeModeWarningMessage: string;
    safeModeWarningPoint1: string;
    safeModeWarningPoint2: string;
    safeModeWarningPoint3: string;
    safeModeConfirmButton: string;
    safeModeDangerous: string;
    safeModeBlocked: string;
    privacy: string;
    privacyNoCollection: string;
    privacyDirectComm: string;
    privacyNoAnalytics: string;
    about: string;
    version: string;
    platform: string;
    openWebsite: string;
    roles: string;
    dataSource: string;
    disclaimer: string;
    updates: string;
    checkForUpdates: string;
    checking: string;
    upToDate: string;
    updateAvailable: string;
    lastChecked: string;
    updateNow: string;
    updateCheckFailed: string;
    demoData: string;
    demoDataDescription: string;
    resetDemoData: string;
    demoDataReset: string;
  };
  pwa: {
    offlineReady: string;
    newVersionAvailable: string;
    offlineReadyDescription: string;
    newVersionDescription: string;
    reload: string;
    reloading: string;
    dismiss: string;
    reloadAriaLabel: string;
    dismissAriaLabel: string;
    closeAriaLabel: string;
  };
  pdf: {
    exportTitle: string;
    selectLanguage: string;
    export: string;
    generating: string;
    exportError: string;
    sportsHallReport: string;
  };
  errorBoundary: {
    connectionProblem: string;
    somethingWentWrong: string;
    networkErrorDescription: string;
    applicationErrorDescription: string;
    errorDetails: string;
    tryAgain: string;
    refreshPage: string;
    page: {
      networkDescription: string;
      errorDescription: string;
      goHome: string;
    };
    modal: {
      networkDescription: string;
      errorDescription: string;
      closeModal: string;
    };
  };
  validation: {
    homeRoster: string;
    awayRoster: string;
    scorer: string;
    scoresheet: string;
    homeRosterPlaceholder: string;
    awayRosterPlaceholder: string;
    scorerPlaceholder: string;
    scoresheetPlaceholder: string;
    addPlayer: string;
    searchPlayers: string;
    noPlayersFound: string;
    loadPlayersError: string;
    playerAlreadyAdded: string;
    jerseyNumber: string;
    license: string;
    roster: {
      addPlayer: string;
      removePlayer: string;
      undoRemoval: string;
      newlyAdded: string;
      added: string;
      captain: string;
      libero: string;
      emptyRoster: string;
      loadingRoster: string;
      errorLoading: string;
      playerCount: string;
    };
    scorerSearch: {
      searchPlaceholder: string;
      searchHint: string;
      searchError: string;
      noScorerSelected: string;
      noScorersFound: string;
      searchResults: string;
      resultsCount: string;
      resultsCountOne: string;
    };
    scoresheetUpload: {
      title: string;
      description: string;
      acceptedFormats: string;
      maxFileSize: string;
      selectFile: string;
      takePhoto: string;
      uploading: string;
      uploadComplete: string;
      replace: string;
      remove: string;
      fileTooLarge: string;
      invalidFileType: string;
      demoModeNote: string;
      previewAlt: string;
      scoresheetUploaded: string;
      noScoresheet: string;
      notRequired: string;
      notRequiredDescription: string;
    };
    state: {
      unsavedChangesTitle: string;
      unsavedChangesMessage: string;
      continueEditing: string;
      discardChanges: string;
      discardAndClose: string;
      saveAndClose: string;
      saveSuccess: string;
      saveError: string;
      markAllStepsTooltip: string;
    };
    wizard: {
      previous: string;
      next: string;
      validate: string;
      finish: string;
      stepOf: string;
      saving: string;
      markAsReviewed: string;
      alreadyValidated: string;
      validatedBy: string;
    };
  };
  tour: {
    banner: {
      title: string;
      subtitle: string;
      exit: string;
    };
    badge: {
      example: string;
    };
    actions: {
      skip: string;
      next: string;
      previous: string;
      finish: string;
    };
    stepCurrent: string;
    assignments: {
      welcome: {
        title: string;
        description: string;
      };
      swipeValidate: {
        title: string;
        description: string;
      };
      swipeExchange: {
        title: string;
        description: string;
      };
      tapDetails: {
        title: string;
        description: string;
      };
    };
    compensations: {
      overview: {
        title: string;
        description: string;
      };
      swipeEdit: {
        title: string;
        description: string;
      };
      tapDetails: {
        title: string;
        description: string;
      };
    };
    exchange: {
      browse: {
        title: string;
        description: string;
      };
      apply: {
        title: string;
        description: string;
      };
      filter: {
        title: string;
        description: string;
      };
    };
    settings: {
      language: {
        title: string;
        description: string;
      };
      homeLocation: {
        title: string;
        description: string;
      };
      arrivalTime: {
        title: string;
        description: string;
      };
      complete: {
        title: string;
        description: string;
      };
      tourSection: {
        title: string;
        description: string;
        safeModeNote: string;
        restart: string;
        statusCompleted: string;
        statusSkipped: string;
        statusNotStarted: string;
      };
    };
    feedback: {
      swipeSuccess: string;
      tapSuccess: string;
    };
  };
}
