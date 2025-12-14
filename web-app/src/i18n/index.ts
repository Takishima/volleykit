/**
 * Internationalization (i18n) module for VolleyKit.
 *
 * Supports Swiss national languages: German (de), French (fr), Italian (it).
 * English is used as the fallback language.
 *
 * Usage:
 *   import { t, setLocale, getLocale } from '@/i18n';
 *   const label = t('assignments.title');
 */

export type Locale = "de" | "fr" | "it" | "en";

// Translation keys organized by feature
interface Translations {
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    close: string;
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
    subtitle: string;
    or: string;
    demoMode: string;
    loginInfo: string;
    privacyNote: string;
    loadingDemo: string;
  };
  occupations: {
    referee: string;
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
    editCompensation: string;
    validateGame: string;
    kilometers: string;
    reason: string;
    reasonPlaceholder: string;
    homeScore: string;
    awayScore: string;
    numberOfSets: string;
    gameReportNotAvailable: string;
  };
  compensations: {
    title: string;
    noCompensations: string;
    paid: string;
    unpaid: string;
    pending: string;
    total: string;
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
    takeOverTitle: string;
    takeOverConfirm: string;
    takeOverButton: string;
    removeTitle: string;
    removeConfirm: string;
    removeButton: string;
    filterByLevel: string;
    noExchangesAtLevel: string;
    noOpenExchangesTitle: string;
    noOpenExchangesDescription: string;
    noApplicationsTitle: string;
    noApplicationsDescription: string;
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
      searchResults: string;
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
    };
    state: {
      unsavedChangesTitle: string;
      unsavedChangesMessage: string;
      continueEditing: string;
      discardChanges: string;
      saveSuccess: string;
      saveError: string;
      saveDisabledTooltip: string;
    };
  };
}

// English translations (default/fallback)
const en: Translations = {
  common: {
    loading: "Loading...",
    error: "An error occurred",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    confirm: "Confirm",
    noResults: "No results found",
    today: "Today",
    tomorrow: "Tomorrow",
    home: "Home",
    away: "Away",
    men: "Men",
    women: "Women",
    match: "Match",
    dateTime: "Date & Time",
    location: "Location",
    position: "Position",
    requiredLevel: "Required Level",
    demoModeBanner: "Demo Mode - Viewing sample data",
    optional: "Optional",
  },
  auth: {
    login: "Login",
    logout: "Logout",
    username: "Username",
    password: "Password",
    loginButton: "Sign in",
    loggingIn: "Signing in...",
    invalidCredentials: "Invalid username or password",
    sessionExpired: "Session expired. Please log in again.",
    subtitle: "Swiss Volleyball Referee Management",
    or: "or",
    demoMode: "Try Demo Mode",
    loginInfo: "Use your VolleyManager credentials to login.",
    privacyNote: "Your password is never stored.",
    loadingDemo: "Loading demo mode...",
  },
  occupations: {
    referee: "Referee",
    player: "Player",
    clubAdmin: "Club Admin",
    associationAdmin: "Association",
  },
  assignments: {
    title: "Assignments",
    upcoming: "Upcoming",
    past: "Past",
    validationClosed: "Validation Closed",
    loading: "Loading assignments...",
    noAssignments: "No assignments found",
    noUpcomingTitle: "No upcoming assignments",
    noUpcomingDescription:
      "You have no upcoming referee assignments scheduled.",
    noClosedTitle: "No closed assignments",
    noClosedDescription:
      "No assignments with closed validation in this season.",
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    editCompensation: "Edit Compensation",
    validateGame: "Validate Game Details",
    kilometers: "Kilometers",
    reason: "Reason",
    reasonPlaceholder: "Enter reason for compensation change",
    homeScore: "Home Score",
    awayScore: "Away Score",
    numberOfSets: "Number of Sets",
    gameReportNotAvailable:
      "Game reports are only available for NLA and NLB games.",
  },
  compensations: {
    title: "Compensations",
    noCompensations: "No compensations found",
    paid: "Paid",
    unpaid: "Unpaid",
    pending: "Pending",
    total: "Total",
    all: "All",
    received: "Received",
    loading: "Loading compensations...",
    noCompensationsTitle: "No compensations",
    noCompensationsDescription: "You have no compensation records yet.",
    noPaidTitle: "No paid compensations",
    noPaidDescription: "No paid compensations found.",
    noUnpaidTitle: "No pending compensations",
    noUnpaidDescription: "No pending compensations. All caught up!",
    errorLoading: "Failed to load compensations",
    pdfNotAvailableDemo: "PDF downloads are not available in demo mode",
    pdfDownloadFailed:
      "Failed to download compensation PDF. Please try again later.",
  },
  exchange: {
    title: "Exchange",
    noExchanges: "No exchanges available",
    apply: "Apply",
    withdraw: "Withdraw",
    open: "Open",
    applied: "Applied",
    closed: "Closed",
    all: "All",
    myApplications: "My Applications",
    takeOverTitle: "Take Over Assignment",
    takeOverConfirm: "Are you sure you want to take over this assignment?",
    takeOverButton: "Confirm Take Over",
    removeTitle: "Remove from Exchange",
    removeConfirm:
      "Are you sure you want to remove this assignment from the exchange?",
    removeButton: "Remove from Exchange",
    filterByLevel: "My level only",
    noExchangesAtLevel: "No exchanges available at your level.",
    noOpenExchangesTitle: "No open exchanges",
    noOpenExchangesDescription:
      "There are currently no referee positions available for exchange.",
    noApplicationsTitle: "No applications",
    noApplicationsDescription: "You haven't applied for any exchanges yet.",
  },
  positions: {
    "head-one": "1st Referee",
    "head-two": "2nd Referee",
    "linesman-one": "Linesman 1",
    "linesman-two": "Linesman 2",
    "linesman-three": "Linesman 3",
    "linesman-four": "Linesman 4",
    "standby-head": "Standby Head",
    "standby-linesman": "Standby Linesman",
  },
  nav: {
    assignments: "Assignments",
    compensations: "Compensations",
    exchange: "Exchange",
    settings: "Settings",
  },
  settings: {
    title: "Settings",
    profile: "Profile",
    language: "Language",
    safeMode: "Safe Mode",
    safeModeDescription:
      "Safe mode restricts dangerous operations like adding/taking games from exchange or validating games. This helps prevent accidental modifications while the app is being tested.",
    safeModeEnabled: "Safe mode is enabled",
    safeModeDisabled: "Safe mode is disabled",
    safeModeWarningTitle: "Disable Safe Mode?",
    safeModeWarningMessage:
      "Disabling safe mode will enable operations that may modify your assignments and games.",
    safeModeWarningPoint1:
      "volleymanager.volleyball.ch is the only authoritative source of truth",
    safeModeWarningPoint2:
      "Always verify your changes on the official VolleyManager website",
    safeModeWarningPoint3:
      "VolleyKit takes no responsibility for any errors that may occur",
    safeModeConfirmButton: "I Understand, Disable",
    safeModeDangerous: "Dangerous operations are enabled",
    safeModeBlocked:
      "This operation is blocked in safe mode. Disable safe mode in Settings to proceed.",
    privacy: "Privacy",
    privacyNoCollection:
      "VolleyKit does not collect or store any personal data.",
    privacyDirectComm:
      "All data flows directly between your browser and Swiss Volley's servers.",
    privacyNoAnalytics: "No tracking, analytics, or telemetry.",
    about: "About",
    version: "Version",
    platform: "Platform",
    openWebsite: "Open VolleyManager website",
    roles: "Roles",
    dataSource: "Data from volleymanager.volleyball.ch",
    disclaimer:
      "Unofficial app for personal use. All data is property of Swiss Volley.",
    updates: "Updates",
    checkForUpdates: "Check for Updates",
    checking: "Checking...",
    upToDate: "App is up to date",
    updateAvailable: "Update available",
    lastChecked: "Last checked",
    updateNow: "Update Now",
    updateCheckFailed: "Update check failed",
  },
  validation: {
    homeRoster: "Home Roster",
    awayRoster: "Away Roster",
    scorer: "Scorer",
    scoresheet: "Scoresheet",
    homeRosterPlaceholder:
      "Home team roster verification will be available here.",
    awayRosterPlaceholder:
      "Away team roster verification will be available here.",
    scorerPlaceholder: "Scorer identification will be available here.",
    scoresheetPlaceholder: "Scoresheet upload will be available here.",
    addPlayer: "Add Player",
    searchPlayers: "Search players...",
    noPlayersFound: "No players found",
    loadPlayersError: "Failed to load players",
    playerAlreadyAdded: "Already on roster",
    jerseyNumber: "Jersey #",
    license: "License",
    roster: {
      addPlayer: "Add Player",
      removePlayer: "Remove player",
      undoRemoval: "Undo removal",
      newlyAdded: "New",
      captain: "Captain",
      libero: "Libero",
      emptyRoster: "No players in roster",
      loadingRoster: "Loading roster...",
      errorLoading: "Failed to load roster",
      playerCount: "{count} players",
    },
    scorerSearch: {
      searchPlaceholder: "Search scorer by name...",
      searchHint:
        "Enter name (e.g., 'Müller' or 'Hans Müller') or add birth year (e.g., 'Müller 1985')",
      searchError: "Failed to search scorers",
      noScorerSelected:
        "No scorer selected. Use the search above to find and select a scorer.",
      searchResults: "Search results",
    },
    scoresheetUpload: {
      title: "Upload Scoresheet",
      description: "Upload a photo or scan of the physical scoresheet",
      acceptedFormats: "JPEG, PNG, or PDF",
      maxFileSize: "Max 10 MB",
      selectFile: "Select File",
      takePhoto: "Take Photo",
      uploading: "Uploading...",
      uploadComplete: "Upload complete",
      replace: "Replace",
      remove: "Remove",
      fileTooLarge: "File is too large. Maximum size is 10 MB.",
      invalidFileType: "Invalid file type. Please use JPEG, PNG, or PDF.",
      demoModeNote: "Demo mode: uploads are simulated",
      previewAlt: "Scoresheet preview",
    },
    state: {
      unsavedChangesTitle: "Unsaved Changes",
      unsavedChangesMessage:
        "You have unsaved changes. Are you sure you want to discard them?",
      continueEditing: "Continue Editing",
      discardChanges: "Discard Changes",
      saveSuccess: "Validation saved successfully",
      saveError: "Failed to save validation",
      saveDisabledTooltip:
        "Complete all required panels (Home Roster, Away Roster, Scorer) to save",
    },
  },
};

// German translations
const de: Translations = {
  common: {
    loading: "Laden...",
    error: "Ein Fehler ist aufgetreten",
    retry: "Erneut versuchen",
    cancel: "Abbrechen",
    save: "Speichern",
    close: "Schliessen",
    confirm: "Bestätigen",
    noResults: "Keine Ergebnisse gefunden",
    today: "Heute",
    tomorrow: "Morgen",
    home: "Heim",
    away: "Gast",
    men: "Herren",
    women: "Damen",
    match: "Spiel",
    dateTime: "Datum & Zeit",
    location: "Ort",
    position: "Position",
    requiredLevel: "Erforderliches Niveau",
    demoModeBanner: "Demo-Modus - Beispieldaten werden angezeigt",
    optional: "Optional",
  },
  auth: {
    login: "Anmelden",
    logout: "Abmelden",
    username: "Benutzername",
    password: "Passwort",
    loginButton: "Anmelden",
    loggingIn: "Anmeldung...",
    invalidCredentials: "Ungültiger Benutzername oder Passwort",
    sessionExpired: "Sitzung abgelaufen. Bitte erneut anmelden.",
    subtitle: "Schweizer Volleyball Schiedsrichter Management",
    or: "oder",
    demoMode: "Demo-Modus ausprobieren",
    loginInfo: "Verwenden Sie Ihre VolleyManager-Anmeldeinformationen.",
    privacyNote: "Ihr Passwort wird niemals gespeichert.",
    loadingDemo: "Demo-Modus wird geladen...",
  },
  occupations: {
    referee: "Schiedsrichter",
    player: "Spieler",
    clubAdmin: "Vereinsadministrator",
    associationAdmin: "Verband",
  },
  assignments: {
    title: "Einsätze",
    upcoming: "Bevorstehend",
    past: "Vergangen",
    validationClosed: "Validierung geschlossen",
    loading: "Einsätze werden geladen...",
    noAssignments: "Keine Einsätze gefunden",
    noUpcomingTitle: "Keine bevorstehenden Einsätze",
    noUpcomingDescription:
      "Sie haben keine bevorstehenden Schiedsrichtereinsätze geplant.",
    noClosedTitle: "Keine abgeschlossenen Einsätze",
    noClosedDescription:
      "Keine Einsätze mit abgeschlossener Validierung in dieser Saison.",
    confirmed: "Bestätigt",
    pending: "Ausstehend",
    cancelled: "Abgesagt",
    editCompensation: "Entschädigung bearbeiten",
    validateGame: "Spieldetails validieren",
    kilometers: "Kilometer",
    reason: "Grund",
    reasonPlaceholder: "Grund für Änderung der Entschädigung eingeben",
    homeScore: "Heimscore",
    awayScore: "Gastscore",
    numberOfSets: "Anzahl Sätze",
    gameReportNotAvailable:
      "Spielberichte sind nur für NLA- und NLB-Spiele verfügbar.",
  },
  compensations: {
    title: "Entschädigungen",
    noCompensations: "Keine Entschädigungen gefunden",
    paid: "Bezahlt",
    unpaid: "Unbezahlt",
    pending: "Ausstehend",
    total: "Total",
    all: "Alle",
    received: "Erhalten",
    loading: "Entschädigungen werden geladen...",
    noCompensationsTitle: "Keine Entschädigungen",
    noCompensationsDescription: "Sie haben noch keine Entschädigungseinträge.",
    noPaidTitle: "Keine bezahlten Entschädigungen",
    noPaidDescription: "Keine bezahlten Entschädigungen gefunden.",
    noUnpaidTitle: "Keine ausstehenden Entschädigungen",
    noUnpaidDescription: "Keine ausstehenden Entschädigungen. Alles erledigt!",
    errorLoading: "Entschädigungen konnten nicht geladen werden",
    pdfNotAvailableDemo: "PDF-Downloads sind im Demo-Modus nicht verfügbar",
    pdfDownloadFailed:
      "PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es später erneut.",
  },
  exchange: {
    title: "Tauschbörse",
    noExchanges: "Keine Tauschangebote verfügbar",
    apply: "Bewerben",
    withdraw: "Zurückziehen",
    open: "Offen",
    applied: "Beworben",
    closed: "Geschlossen",
    all: "Alle",
    myApplications: "Meine Bewerbungen",
    takeOverTitle: "Einsatz übernehmen",
    takeOverConfirm: "Möchten Sie diesen Einsatz wirklich übernehmen?",
    takeOverButton: "Übernahme bestätigen",
    removeTitle: "Aus Tauschbörse entfernen",
    removeConfirm:
      "Möchten Sie diesen Einsatz wirklich aus der Tauschbörse entfernen?",
    removeButton: "Aus Tauschbörse entfernen",
    filterByLevel: "Nur mein Niveau",
    noExchangesAtLevel: "Keine Tauschangebote auf Ihrem Niveau verfügbar.",
    noOpenExchangesTitle: "Keine offenen Tauschangebote",
    noOpenExchangesDescription:
      "Derzeit sind keine Schiedsrichterpositionen zum Tausch verfügbar.",
    noApplicationsTitle: "Keine Bewerbungen",
    noApplicationsDescription:
      "Sie haben sich noch für keine Tauschangebote beworben.",
  },
  positions: {
    "head-one": "1. Schiedsrichter",
    "head-two": "2. Schiedsrichter",
    "linesman-one": "Linienrichter 1",
    "linesman-two": "Linienrichter 2",
    "linesman-three": "Linienrichter 3",
    "linesman-four": "Linienrichter 4",
    "standby-head": "Ersatz Schiedsrichter",
    "standby-linesman": "Ersatz Linienrichter",
  },
  nav: {
    assignments: "Einsätze",
    compensations: "Entschädigungen",
    exchange: "Tauschbörse",
    settings: "Einstellungen",
  },
  settings: {
    title: "Einstellungen",
    profile: "Profil",
    language: "Sprache",
    safeMode: "Sicherheitsmodus",
    safeModeDescription:
      "Der Sicherheitsmodus beschränkt gefährliche Operationen wie das Hinzufügen/Übernehmen von Spielen zur/von Tauschbörse oder das Validieren von Spielen. Dies hilft, versehentliche Änderungen während des Testens der App zu vermeiden.",
    safeModeEnabled: "Sicherheitsmodus ist aktiviert",
    safeModeDisabled: "Sicherheitsmodus ist deaktiviert",
    safeModeWarningTitle: "Sicherheitsmodus deaktivieren?",
    safeModeWarningMessage:
      "Das Deaktivieren des Sicherheitsmodus ermöglicht Operationen, die Ihre Einsätze und Spiele ändern können.",
    safeModeWarningPoint1:
      "volleymanager.volleyball.ch ist die einzige massgebende Quelle",
    safeModeWarningPoint2:
      "Überprüfen Sie Ihre Änderungen immer auf der offiziellen VolleyManager-Website",
    safeModeWarningPoint3:
      "VolleyKit übernimmt keine Verantwortung für allfällige Fehler",
    safeModeConfirmButton: "Ich verstehe, deaktivieren",
    safeModeDangerous: "Gefährliche Operationen sind aktiviert",
    safeModeBlocked:
      "Diese Operation ist im Sicherheitsmodus gesperrt. Deaktivieren Sie den Sicherheitsmodus in den Einstellungen, um fortzufahren.",
    privacy: "Datenschutz",
    privacyNoCollection:
      "VolleyKit sammelt oder speichert keine persönlichen Daten.",
    privacyDirectComm:
      "Alle Daten fliessen direkt zwischen Ihrem Browser und den Servern von Swiss Volley.",
    privacyNoAnalytics: "Kein Tracking, keine Analysen, keine Telemetrie.",
    about: "Über",
    version: "Version",
    platform: "Plattform",
    openWebsite: "VolleyManager-Website öffnen",
    roles: "Rollen",
    dataSource: "Daten von volleymanager.volleyball.ch",
    disclaimer:
      "Inoffizielle App für den persönlichen Gebrauch. Alle Daten sind Eigentum von Swiss Volley.",
    updates: "Updates",
    checkForUpdates: "Nach Updates suchen",
    checking: "Überprüfen...",
    upToDate: "App ist aktuell",
    updateAvailable: "Update verfügbar",
    lastChecked: "Zuletzt geprüft",
    updateNow: "Jetzt aktualisieren",
    updateCheckFailed: "Update-Prüfung fehlgeschlagen",
  },
  validation: {
    homeRoster: "Heimkader",
    awayRoster: "Gastkader",
    scorer: "Schreiber",
    scoresheet: "Spielbericht",
    homeRosterPlaceholder:
      "Die Überprüfung des Heimkaders wird hier verfügbar sein.",
    awayRosterPlaceholder:
      "Die Überprüfung des Gastkaders wird hier verfügbar sein.",
    scorerPlaceholder: "Die Schreiberidentifikation wird hier verfügbar sein.",
    scoresheetPlaceholder:
      "Der Upload des Spielberichts wird hier verfügbar sein.",
    addPlayer: "Spieler hinzufügen",
    searchPlayers: "Spieler suchen...",
    noPlayersFound: "Keine Spieler gefunden",
    loadPlayersError: "Spieler konnten nicht geladen werden",
    playerAlreadyAdded: "Bereits im Kader",
    jerseyNumber: "Trikot #",
    license: "Lizenz",
    roster: {
      addPlayer: "Spieler hinzufügen",
      removePlayer: "Spieler entfernen",
      undoRemoval: "Entfernung rückgängig",
      newlyAdded: "Neu",
      captain: "Kapitän",
      libero: "Libero",
      emptyRoster: "Keine Spieler im Kader",
      loadingRoster: "Kader wird geladen...",
      errorLoading: "Kader konnte nicht geladen werden",
      playerCount: "{count} Spieler",
    },
    scorerSearch: {
      searchPlaceholder: "Schreiber nach Name suchen...",
      searchHint:
        "Namen eingeben (z.B. 'Müller' oder 'Hans Müller') oder Geburtsjahr hinzufügen (z.B. 'Müller 1985')",
      searchError: "Schreibersuche fehlgeschlagen",
      noScorerSelected:
        "Kein Schreiber ausgewählt. Verwenden Sie die Suche oben, um einen Schreiber zu finden und auszuwählen.",
      searchResults: "Suchergebnisse",
    },
    scoresheetUpload: {
      title: "Spielbericht hochladen",
      description:
        "Laden Sie ein Foto oder einen Scan des physischen Spielberichts hoch",
      acceptedFormats: "JPEG, PNG oder PDF",
      maxFileSize: "Max. 10 MB",
      selectFile: "Datei auswählen",
      takePhoto: "Foto aufnehmen",
      uploading: "Wird hochgeladen...",
      uploadComplete: "Upload abgeschlossen",
      replace: "Ersetzen",
      remove: "Entfernen",
      fileTooLarge: "Datei ist zu gross. Maximale Grösse ist 10 MB.",
      invalidFileType:
        "Ungültiger Dateityp. Bitte verwenden Sie JPEG, PNG oder PDF.",
      demoModeNote: "Demo-Modus: Uploads werden simuliert",
      previewAlt: "Spielbericht-Vorschau",
    },
    state: {
      unsavedChangesTitle: "Ungespeicherte Änderungen",
      unsavedChangesMessage:
        "Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?",
      continueEditing: "Weiter bearbeiten",
      discardChanges: "Änderungen verwerfen",
      saveSuccess: "Validierung erfolgreich gespeichert",
      saveError: "Validierung konnte nicht gespeichert werden",
      saveDisabledTooltip:
        "Füllen Sie alle erforderlichen Bereiche aus (Heimkader, Gastkader, Schreiber), um zu speichern",
    },
  },
};

// French translations
const fr: Translations = {
  common: {
    loading: "Chargement...",
    error: "Une erreur est survenue",
    retry: "Réessayer",
    cancel: "Annuler",
    save: "Enregistrer",
    close: "Fermer",
    confirm: "Confirmer",
    noResults: "Aucun résultat trouvé",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    home: "Domicile",
    away: "Visiteur",
    men: "Hommes",
    women: "Femmes",
    match: "Match",
    dateTime: "Date & Heure",
    location: "Lieu",
    position: "Position",
    requiredLevel: "Niveau requis",
    demoModeBanner: "Mode Démo - Données d'exemple",
    optional: "Optionnel",
  },
  auth: {
    login: "Connexion",
    logout: "Déconnexion",
    username: "Nom d'utilisateur",
    password: "Mot de passe",
    loginButton: "Se connecter",
    loggingIn: "Connexion...",
    invalidCredentials: "Nom d'utilisateur ou mot de passe invalide",
    sessionExpired: "Session expirée. Veuillez vous reconnecter.",
    subtitle: "Gestion des arbitres de volleyball suisse",
    or: "ou",
    demoMode: "Essayer le mode démo",
    loginInfo: "Utilisez vos identifiants VolleyManager pour vous connecter.",
    privacyNote: "Votre mot de passe n'est jamais stocké.",
    loadingDemo: "Chargement du mode démo...",
  },
  occupations: {
    referee: "Arbitre",
    player: "Joueur",
    clubAdmin: "Admin club",
    associationAdmin: "Association",
  },
  assignments: {
    title: "Désignations",
    upcoming: "À venir",
    past: "Passées",
    validationClosed: "Validation fermée",
    loading: "Chargement des désignations...",
    noAssignments: "Aucune désignation trouvée",
    noUpcomingTitle: "Aucune désignation à venir",
    noUpcomingDescription: "Vous n'avez aucune désignation d'arbitre prévue.",
    noClosedTitle: "Aucune désignation clôturée",
    noClosedDescription:
      "Aucune désignation avec validation fermée cette saison.",
    confirmed: "Confirmé",
    pending: "En attente",
    cancelled: "Annulé",
    editCompensation: "Modifier l'indemnité",
    validateGame: "Valider les détails du match",
    kilometers: "Kilomètres",
    reason: "Raison",
    reasonPlaceholder: "Entrer la raison du changement d'indemnité",
    homeScore: "Score domicile",
    awayScore: "Score visiteur",
    numberOfSets: "Nombre de sets",
    gameReportNotAvailable:
      "Les rapports de match sont uniquement disponibles pour les matchs NLA et NLB.",
  },
  compensations: {
    title: "Indemnités",
    noCompensations: "Aucune indemnité trouvée",
    paid: "Payé",
    unpaid: "Non payé",
    pending: "En attente",
    total: "Total",
    all: "Toutes",
    received: "Reçu",
    loading: "Chargement des indemnités...",
    noCompensationsTitle: "Aucune indemnité",
    noCompensationsDescription: "Vous n'avez pas encore d'entrées d'indemnité.",
    noPaidTitle: "Aucune indemnité payée",
    noPaidDescription: "Aucune indemnité payée trouvée.",
    noUnpaidTitle: "Aucune indemnité en attente",
    noUnpaidDescription: "Aucune indemnité en attente. Tout est à jour!",
    errorLoading: "Échec du chargement des indemnités",
    pdfNotAvailableDemo:
      "Les téléchargements PDF ne sont pas disponibles en mode démo",
    pdfDownloadFailed:
      "Échec du téléchargement du PDF. Veuillez réessayer plus tard.",
  },
  exchange: {
    title: "Bourse aux échanges",
    noExchanges: "Aucun échange disponible",
    apply: "Postuler",
    withdraw: "Retirer",
    open: "Ouvert",
    applied: "Postulé",
    closed: "Fermé",
    all: "Tous",
    myApplications: "Mes candidatures",
    takeOverTitle: "Reprendre la désignation",
    takeOverConfirm: "Êtes-vous sûr de vouloir reprendre cette désignation?",
    takeOverButton: "Confirmer la reprise",
    removeTitle: "Retirer de la bourse",
    removeConfirm:
      "Êtes-vous sûr de vouloir retirer cette désignation de la bourse?",
    removeButton: "Retirer de la bourse",
    filterByLevel: "Mon niveau uniquement",
    noExchangesAtLevel: "Aucun échange disponible à votre niveau.",
    noOpenExchangesTitle: "Aucun échange ouvert",
    noOpenExchangesDescription:
      "Il n'y a actuellement aucun poste d'arbitre disponible pour échange.",
    noApplicationsTitle: "Aucune candidature",
    noApplicationsDescription:
      "Vous n'avez pas encore postulé pour des échanges.",
  },
  positions: {
    "head-one": "1er Arbitre",
    "head-two": "2ème Arbitre",
    "linesman-one": "Juge de ligne 1",
    "linesman-two": "Juge de ligne 2",
    "linesman-three": "Juge de ligne 3",
    "linesman-four": "Juge de ligne 4",
    "standby-head": "Arbitre remplaçant",
    "standby-linesman": "Juge de ligne remplaçant",
  },
  nav: {
    assignments: "Désignations",
    compensations: "Indemnités",
    exchange: "Échanges",
    settings: "Paramètres",
  },
  settings: {
    title: "Paramètres",
    profile: "Profil",
    language: "Langue",
    safeMode: "Mode sécurisé",
    safeModeDescription:
      "Le mode sécurisé restreint les opérations dangereuses comme l'ajout/la prise de matchs depuis la bourse aux échanges ou la validation de matchs. Cela aide à éviter les modifications accidentelles pendant les tests de l'application.",
    safeModeEnabled: "Le mode sécurisé est activé",
    safeModeDisabled: "Le mode sécurisé est désactivé",
    safeModeWarningTitle: "Désactiver le mode sécurisé?",
    safeModeWarningMessage:
      "La désactivation du mode sécurisé activera des opérations pouvant modifier vos désignations et matchs.",
    safeModeWarningPoint1:
      "volleymanager.volleyball.ch est la seule source faisant autorité",
    safeModeWarningPoint2:
      "Vérifiez toujours vos modifications sur le site officiel VolleyManager",
    safeModeWarningPoint3:
      "VolleyKit décline toute responsabilité pour les erreurs éventuelles",
    safeModeConfirmButton: "Je comprends, désactiver",
    safeModeDangerous: "Les opérations dangereuses sont activées",
    safeModeBlocked:
      "Cette opération est bloquée en mode sécurisé. Désactivez le mode sécurisé dans les paramètres pour continuer.",
    privacy: "Confidentialité",
    privacyNoCollection:
      "VolleyKit ne collecte ni ne stocke aucune donnée personnelle.",
    privacyDirectComm:
      "Toutes les données transitent directement entre votre navigateur et les serveurs de Swiss Volley.",
    privacyNoAnalytics: "Aucun suivi, analyse ou télémétrie.",
    about: "À propos",
    version: "Version",
    platform: "Plateforme",
    openWebsite: "Ouvrir le site VolleyManager",
    roles: "Rôles",
    dataSource: "Données de volleymanager.volleyball.ch",
    disclaimer:
      "Application non officielle pour usage personnel. Toutes les données sont la propriété de Swiss Volley.",
    updates: "Mises à jour",
    checkForUpdates: "Vérifier les mises à jour",
    checking: "Vérification...",
    upToDate: "L'application est à jour",
    updateAvailable: "Mise à jour disponible",
    lastChecked: "Dernière vérification",
    updateNow: "Mettre à jour",
    updateCheckFailed: "Échec de la vérification",
  },
  validation: {
    homeRoster: "Effectif domicile",
    awayRoster: "Effectif visiteur",
    scorer: "Marqueur",
    scoresheet: "Feuille de match",
    homeRosterPlaceholder:
      "La vérification de l'effectif domicile sera disponible ici.",
    awayRosterPlaceholder:
      "La vérification de l'effectif visiteur sera disponible ici.",
    scorerPlaceholder: "L'identification du marqueur sera disponible ici.",
    scoresheetPlaceholder:
      "Le téléchargement de la feuille de match sera disponible ici.",
    addPlayer: "Ajouter un joueur",
    searchPlayers: "Rechercher des joueurs...",
    noPlayersFound: "Aucun joueur trouvé",
    loadPlayersError: "Échec du chargement des joueurs",
    playerAlreadyAdded: "Déjà dans l'effectif",
    jerseyNumber: "Maillot #",
    license: "Licence",
    roster: {
      addPlayer: "Ajouter un joueur",
      removePlayer: "Retirer le joueur",
      undoRemoval: "Annuler le retrait",
      newlyAdded: "Nouveau",
      captain: "Capitaine",
      libero: "Libéro",
      emptyRoster: "Aucun joueur dans l'effectif",
      loadingRoster: "Chargement de l'effectif...",
      errorLoading: "Échec du chargement de l'effectif",
      playerCount: "{count} joueurs",
    },
    scorerSearch: {
      searchPlaceholder: "Rechercher un marqueur par nom...",
      searchHint:
        "Entrez le nom (ex. 'Müller' ou 'Hans Müller') ou ajoutez l'année de naissance (ex. 'Müller 1985')",
      searchError: "Échec de la recherche de marqueurs",
      noScorerSelected:
        "Aucun marqueur sélectionné. Utilisez la recherche ci-dessus pour trouver et sélectionner un marqueur.",
      searchResults: "Résultats de recherche",
    },
    scoresheetUpload: {
      title: "Télécharger la feuille de match",
      description:
        "Téléchargez une photo ou un scan de la feuille de match physique",
      acceptedFormats: "JPEG, PNG ou PDF",
      maxFileSize: "Max 10 Mo",
      selectFile: "Sélectionner un fichier",
      takePhoto: "Prendre une photo",
      uploading: "Téléchargement...",
      uploadComplete: "Téléchargement terminé",
      replace: "Remplacer",
      remove: "Supprimer",
      fileTooLarge: "Le fichier est trop volumineux. Taille maximale: 10 Mo.",
      invalidFileType:
        "Type de fichier invalide. Veuillez utiliser JPEG, PNG ou PDF.",
      demoModeNote: "Mode démo: les téléchargements sont simulés",
      previewAlt: "Aperçu de la feuille de match",
    },
    state: {
      unsavedChangesTitle: "Modifications non enregistrées",
      unsavedChangesMessage:
        "Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir les abandonner?",
      continueEditing: "Continuer l'édition",
      discardChanges: "Abandonner les modifications",
      saveSuccess: "Validation enregistrée avec succès",
      saveError: "Échec de l'enregistrement de la validation",
      saveDisabledTooltip:
        "Complétez tous les panneaux requis (Effectif domicile, Effectif visiteur, Marqueur) pour enregistrer",
    },
  },
};

// Italian translations
const it: Translations = {
  common: {
    loading: "Caricamento...",
    error: "Si è verificato un errore",
    retry: "Riprova",
    cancel: "Annulla",
    save: "Salva",
    close: "Chiudi",
    confirm: "Conferma",
    noResults: "Nessun risultato trovato",
    today: "Oggi",
    tomorrow: "Domani",
    home: "Casa",
    away: "Ospite",
    men: "Uomini",
    women: "Donne",
    match: "Partita",
    dateTime: "Data e Ora",
    location: "Luogo",
    position: "Posizione",
    requiredLevel: "Livello richiesto",
    demoModeBanner: "Modalità Demo - Dati di esempio",
    optional: "Opzionale",
  },
  auth: {
    login: "Accesso",
    logout: "Esci",
    username: "Nome utente",
    password: "Password",
    loginButton: "Accedi",
    loggingIn: "Accesso in corso...",
    invalidCredentials: "Nome utente o password non validi",
    sessionExpired: "Sessione scaduta. Effettua nuovamente il login.",
    subtitle: "Gestione arbitri di pallavolo svizzera",
    or: "o",
    demoMode: "Prova la modalità demo",
    loginInfo: "Usa le tue credenziali VolleyManager per accedere.",
    privacyNote: "La tua password non viene mai memorizzata.",
    loadingDemo: "Caricamento modalità demo...",
  },
  occupations: {
    referee: "Arbitro",
    player: "Giocatore",
    clubAdmin: "Admin club",
    associationAdmin: "Associazione",
  },
  assignments: {
    title: "Designazioni",
    upcoming: "In programma",
    past: "Passate",
    validationClosed: "Validazione chiusa",
    loading: "Caricamento designazioni...",
    noAssignments: "Nessuna designazione trovata",
    noUpcomingTitle: "Nessuna designazione in programma",
    noUpcomingDescription: "Non hai designazioni arbitrali in programma.",
    noClosedTitle: "Nessuna designazione chiusa",
    noClosedDescription:
      "Nessuna designazione con validazione chiusa in questa stagione.",
    confirmed: "Confermato",
    pending: "In attesa",
    cancelled: "Annullato",
    editCompensation: "Modifica compenso",
    validateGame: "Valida dettagli partita",
    kilometers: "Chilometri",
    reason: "Motivo",
    reasonPlaceholder: "Inserisci motivo per cambio compenso",
    homeScore: "Punteggio casa",
    awayScore: "Punteggio ospite",
    numberOfSets: "Numero di set",
    gameReportNotAvailable:
      "I rapporti delle partite sono disponibili solo per le partite NLA e NLB.",
  },
  compensations: {
    title: "Compensi",
    noCompensations: "Nessun compenso trovato",
    paid: "Pagato",
    unpaid: "Non pagato",
    pending: "In attesa",
    total: "Totale",
    all: "Tutti",
    received: "Ricevuto",
    loading: "Caricamento compensi...",
    noCompensationsTitle: "Nessun compenso",
    noCompensationsDescription: "Non hai ancora voci di compenso.",
    noPaidTitle: "Nessun compenso pagato",
    noPaidDescription: "Nessun compenso pagato trovato.",
    noUnpaidTitle: "Nessun compenso in attesa",
    noUnpaidDescription: "Nessun compenso in attesa. Tutto aggiornato!",
    errorLoading: "Impossibile caricare i compensi",
    pdfNotAvailableDemo: "I download PDF non sono disponibili in modalità demo",
    pdfDownloadFailed: "Impossibile scaricare il PDF. Riprova più tardi.",
  },
  exchange: {
    title: "Borsa scambi",
    noExchanges: "Nessuno scambio disponibile",
    apply: "Candidati",
    withdraw: "Ritira",
    open: "Aperto",
    applied: "Candidato",
    closed: "Chiuso",
    all: "Tutti",
    myApplications: "Le mie candidature",
    takeOverTitle: "Assumere la designazione",
    takeOverConfirm: "Sei sicuro di voler assumere questa designazione?",
    takeOverButton: "Conferma assunzione",
    removeTitle: "Rimuovere dalla borsa",
    removeConfirm:
      "Sei sicuro di voler rimuovere questa designazione dalla borsa?",
    removeButton: "Rimuovere dalla borsa",
    filterByLevel: "Solo il mio livello",
    noExchangesAtLevel: "Nessuno scambio disponibile al tuo livello.",
    noOpenExchangesTitle: "Nessuno scambio aperto",
    noOpenExchangesDescription:
      "Al momento non ci sono posizioni arbitrali disponibili per lo scambio.",
    noApplicationsTitle: "Nessuna candidatura",
    noApplicationsDescription:
      "Non hai ancora fatto domanda per nessuno scambio.",
  },
  positions: {
    "head-one": "1° Arbitro",
    "head-two": "2° Arbitro",
    "linesman-one": "Giudice di linea 1",
    "linesman-two": "Giudice di linea 2",
    "linesman-three": "Giudice di linea 3",
    "linesman-four": "Giudice di linea 4",
    "standby-head": "Arbitro riserva",
    "standby-linesman": "Giudice di linea riserva",
  },
  nav: {
    assignments: "Designazioni",
    compensations: "Compensi",
    exchange: "Scambi",
    settings: "Impostazioni",
  },
  settings: {
    title: "Impostazioni",
    profile: "Profilo",
    language: "Lingua",
    safeMode: "Modalità sicura",
    safeModeDescription:
      "La modalità sicura limita operazioni pericolose come l'aggiunta/assunzione di partite dalla borsa scambi o la convalida di partite. Questo aiuta a prevenire modifiche accidentali durante il test dell'app.",
    safeModeEnabled: "La modalità sicura è attivata",
    safeModeDisabled: "La modalità sicura è disattivata",
    safeModeWarningTitle: "Disattivare la modalità sicura?",
    safeModeWarningMessage:
      "La disattivazione della modalità sicura abiliterà operazioni che potrebbero modificare le tue designazioni e partite.",
    safeModeWarningPoint1:
      "volleymanager.volleyball.ch è l'unica fonte autorevole",
    safeModeWarningPoint2:
      "Verifica sempre le tue modifiche sul sito ufficiale VolleyManager",
    safeModeWarningPoint3:
      "VolleyKit non si assume alcuna responsabilità per eventuali errori",
    safeModeConfirmButton: "Ho capito, disattiva",
    safeModeDangerous: "Le operazioni pericolose sono abilitate",
    safeModeBlocked:
      "Questa operazione è bloccata in modalità sicura. Disattiva la modalità sicura nelle Impostazioni per procedere.",
    privacy: "Privacy",
    privacyNoCollection:
      "VolleyKit non raccoglie né memorizza alcun dato personale.",
    privacyDirectComm:
      "Tutti i dati fluiscono direttamente tra il tuo browser e i server di Swiss Volley.",
    privacyNoAnalytics: "Nessun tracciamento, analisi o telemetria.",
    about: "Informazioni",
    version: "Versione",
    platform: "Piattaforma",
    openWebsite: "Apri sito VolleyManager",
    roles: "Ruoli",
    dataSource: "Dati da volleymanager.volleyball.ch",
    disclaimer:
      "App non ufficiale per uso personale. Tutti i dati sono proprietà di Swiss Volley.",
    updates: "Aggiornamenti",
    checkForUpdates: "Verifica aggiornamenti",
    checking: "Verifica in corso...",
    upToDate: "L'app è aggiornata",
    updateAvailable: "Aggiornamento disponibile",
    lastChecked: "Ultimo controllo",
    updateNow: "Aggiorna ora",
    updateCheckFailed: "Verifica aggiornamenti fallita",
  },
  validation: {
    homeRoster: "Rosa di casa",
    awayRoster: "Rosa ospite",
    scorer: "Segnapunti",
    scoresheet: "Referto",
    homeRosterPlaceholder:
      "La verifica della rosa di casa sarà disponibile qui.",
    awayRosterPlaceholder:
      "La verifica della rosa ospite sarà disponibile qui.",
    scorerPlaceholder: "L'identificazione del segnapunti sarà disponibile qui.",
    scoresheetPlaceholder: "Il caricamento del referto sarà disponibile qui.",
    addPlayer: "Aggiungi giocatore",
    searchPlayers: "Cerca giocatori...",
    noPlayersFound: "Nessun giocatore trovato",
    loadPlayersError: "Impossibile caricare i giocatori",
    playerAlreadyAdded: "Già nella rosa",
    jerseyNumber: "Maglia #",
    license: "Licenza",
    roster: {
      addPlayer: "Aggiungi giocatore",
      removePlayer: "Rimuovi giocatore",
      undoRemoval: "Annulla rimozione",
      newlyAdded: "Nuovo",
      captain: "Capitano",
      libero: "Libero",
      emptyRoster: "Nessun giocatore nella rosa",
      loadingRoster: "Caricamento rosa...",
      errorLoading: "Caricamento rosa fallito",
      playerCount: "{count} giocatori",
    },
    scorerSearch: {
      searchPlaceholder: "Cerca segnapunti per nome...",
      searchHint:
        "Inserisci il nome (es. 'Müller' o 'Hans Müller') o aggiungi l'anno di nascita (es. 'Müller 1985')",
      searchError: "Ricerca segnapunti fallita",
      noScorerSelected:
        "Nessun segnapunti selezionato. Usa la ricerca sopra per trovare e selezionare un segnapunti.",
      searchResults: "Risultati della ricerca",
    },
    scoresheetUpload: {
      title: "Carica referto",
      description: "Carica una foto o una scansione del referto fisico",
      acceptedFormats: "JPEG, PNG o PDF",
      maxFileSize: "Max 10 MB",
      selectFile: "Seleziona file",
      takePhoto: "Scatta foto",
      uploading: "Caricamento...",
      uploadComplete: "Caricamento completato",
      replace: "Sostituisci",
      remove: "Rimuovi",
      fileTooLarge: "Il file è troppo grande. Dimensione massima: 10 MB.",
      invalidFileType: "Tipo di file non valido. Usa JPEG, PNG o PDF.",
      demoModeNote: "Modalità demo: i caricamenti sono simulati",
      previewAlt: "Anteprima referto",
    },
    state: {
      unsavedChangesTitle: "Modifiche non salvate",
      unsavedChangesMessage:
        "Hai modifiche non salvate. Sei sicuro di volerle scartare?",
      continueEditing: "Continua a modificare",
      discardChanges: "Scarta le modifiche",
      saveSuccess: "Validazione salvata con successo",
      saveError: "Impossibile salvare la validazione",
      saveDisabledTooltip:
        "Completa tutti i pannelli richiesti (Rosa di casa, Rosa ospite, Segnapunti) per salvare",
    },
  },
};

// All translations
const translations: Record<Locale, Translations> = { en, de, fr, it };

// Current locale state
let currentLocale: Locale = "en";

/**
 * Detect user's preferred locale from browser settings.
 * Defaults to German if a Swiss German locale is detected.
 */
function detectLocale(): Locale {
  const browserLang = navigator.language.toLowerCase();

  // Swiss locale detection
  if (browserLang.startsWith("de") || browserLang === "gsw") return "de";
  if (browserLang.startsWith("fr")) return "fr";
  if (browserLang.startsWith("it")) return "it";

  return "en";
}

/**
 * Initialize locale from stored preference or browser detection.
 * Note: Persistence is handled by the language store, this just detects the initial locale.
 */
export function initLocale(): Locale {
  currentLocale = detectLocale();
  return currentLocale;
}

/**
 * Get current locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set locale and persist preference.
 * Note: Persistence is handled by the language store.
 */
export function setLocale(locale: Locale): void {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

/**
 * Get available locales with their native names.
 */
export function getAvailableLocales(): Array<{ code: Locale; name: string }> {
  return [
    { code: "de", name: "Deutsch" },
    { code: "fr", name: "Français" },
    { code: "it", name: "Italiano" },
    { code: "en", name: "English" },
  ];
}

// Type-safe key path type
type PathKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? PathKeys<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>
          : `${Prefix}${Prefix extends "" ? "" : "."}${K}`
        : never;
    }[keyof T]
  : never;

type TranslationKey = PathKeys<Translations>;

/**
 * Get translation by dot-notation key.
 * Falls back to English if key not found in current locale.
 *
 * @example t('auth.login') // Returns "Login" or "Anmelden" depending on locale
 */
export function t(key: TranslationKey): string {
  const keys = key.split(".");
  let result: unknown = translations[currentLocale];

  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      // Fallback to English
      result = translations.en;
      for (const fallbackKey of keys) {
        if (result && typeof result === "object" && fallbackKey in result) {
          result = (result as Record<string, unknown>)[fallbackKey];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }

  return typeof result === "string" ? result : key;
}

// Initialize locale on module load
initLocale();
