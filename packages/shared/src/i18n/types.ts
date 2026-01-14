/**
 * Translation key types for VolleyKit.
 * Shared between web and mobile apps.
 *
 * Extracted from web-app/src/i18n/types.ts with mobile-relevant translations.
 */

export type Language = 'de' | 'en' | 'fr' | 'it';

export const SUPPORTED_LANGUAGES: Language[] = ['de', 'en', 'fr', 'it'];

export const LANGUAGE_NAMES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
};

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
    vs: string;
    unknown: string;
    unknownDate: string;
    currencyChf: string;
    distanceUnit: string;
    minutesUnit: string;
    hoursUnit: string;
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
    noRefereeRole: string;
    biometricPrompt: string;
    biometricFailed: string;
    biometricNotAvailable: string;
    biometricNotEnrolled: string;
    enableBiometric: string;
    disableBiometric: string;
  };
  assignments: {
    title: string;
    upcoming: string;
    past: string;
    loading: string;
    noAssignments: string;
    noUpcomingTitle: string;
    noUpcomingDescription: string;
    confirmed: string;
    pending: string;
    cancelled: string;
    active: string;
    archived: string;
    editCompensation: string;
    validateGame: string;
    addToExchange: string;
    kilometers: string;
    reason: string;
    openSbbConnection: string;
    openInGoogleMaps: string;
    hall: string;
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
    received: string;
    loading: string;
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
    filters: string;
    filterByLevel: string;
    filterByDistance: string;
    filterByTravelTime: string;
    travelTime: string;
    applySuccess: string;
    applyError: string;
    withdrawSuccess: string;
    withdrawError: string;
    submittedBy: string;
    levelRequired: string;
    hideOwn: string;
  };
  positions: {
    'head-one': string;
    'head-two': string;
    'linesman-one': string;
    'linesman-two': string;
    'linesman-three': string;
    'linesman-four': string;
    'standby-head': string;
    'standby-linesman': string;
  };
  nav: {
    assignments: string;
    compensations: string;
    exchange: string;
    settings: string;
  };
  notifications: {
    gameReminder: string;
    gameReminderBody: string;
  };
  settings: {
    title: string;
    profile: string;
    svNumber: string;
    language: string;
    biometric: {
      title: string;
      description: string;
      enable: string;
      disable: string;
      notAvailable: string;
      notEnrolled: string;
    };
    calendar: {
      title: string;
      description: string;
      sync: string;
      synced: string;
      selectCalendar: string;
      permissionDenied: string;
    };
    departure: {
      title: string;
      description: string;
      enable: string;
      disable: string;
      bufferTime: string;
      bufferTimeDescription: string;
      locationRequired: string;
      permissionDenied: string;
    };
    homeLocation: {
      title: string;
      description: string;
      currentLocation: string;
      useCurrentLocation: string;
      locating: string;
      searchLabel: string;
      searchPlaceholder: string;
      clear: string;
      errorPermissionDenied: string;
      errorPositionUnavailable: string;
      errorTimeout: string;
    };
    transport: {
      title: string;
      description: string;
      enableCalculations: string;
      maxTravelTime: string;
      arrivalTime: string;
    };
    privacy: string;
    privacyNoCollection: string;
    privacyDirectComm: string;
    privacyNoAnalytics: string;
    about: string;
    version: string;
    logout: string;
  };
  departure: {
    notification: {
      title: string;
      body: string;
      noRoute: string;
      delayed: string;
      cancelled: string;
    };
    widget: {
      title: string;
      nextGame: string;
      departIn: string;
      noUpcoming: string;
      routeUnavailable: string;
    };
  };
  errorBoundary: {
    connectionProblem: string;
    somethingWentWrong: string;
    networkErrorDescription: string;
    applicationErrorDescription: string;
    tryAgain: string;
    refreshPage: string;
  };
}

/**
 * Flat translation key type for dot-notation access.
 * e.g., 'common.loading', 'auth.login'
 */
export type TranslationKey = FlattenKeys<Translations>;

/**
 * Helper type to flatten nested object keys with dot notation.
 */
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? FlattenKeys<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
          : Prefix extends ''
            ? K
            : `${Prefix}.${K}`
        : never;
    }[keyof T]
  : never;
