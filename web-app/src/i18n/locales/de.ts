import type { Translations } from "../types";

const de: Translations = {
  tour: {
    banner: {
      title: "Einführung",
      subtitle: "Üben Sie mit Beispieldaten",
      exit: "Tour beenden",
    },
    badge: {
      example: "Beispiel",
    },
    actions: {
      skip: "Überspringen",
      next: "Weiter",
      previous: "Zurück",
      finish: "Fertig",
    },
    stepCurrent: "Schritt {step} von {total}",
    assignments: {
      welcome: {
        title: "Ihre Einsätze",
        description:
          "Hier sehen Sie Ihre bevorstehenden Schiedsrichtereinsätze. Jede Karte zeigt die Spieldetails.",
      },
      swipeValidate: {
        title: "Wischen zum Validieren",
        description:
          "Wischen Sie auf einer Karte nach links, um Aktionen wie das Validieren des Spiels oder das Bearbeiten Ihrer Entschädigung anzuzeigen.",
      },
      tapDetails: {
        title: "Details anzeigen",
        description:
          "Tippen Sie auf eine Karte, um sie zu erweitern und weitere Details zum Einsatz zu sehen.",
      },
    },
    compensations: {
      overview: {
        title: "Ihre Entschädigungen",
        description:
          "Hier können Sie alle Ihre Schiedsrichterentschädigungen einsehen, einschliesslich Spielgebühren und Reisekosten.",
      },
      tapEdit: {
        title: "Entschädigung bearbeiten",
        description:
          "Tippen Sie auf eine Entschädigung, um die Distanz zu bearbeiten oder einen Korrekturgrund hinzuzufügen.",
      },
      downloadPdf: {
        title: "PDF herunterladen",
        description:
          "Laden Sie eine PDF-Zusammenfassung Ihrer Entschädigungen für Ihre Unterlagen herunter.",
      },
    },
    exchange: {
      browse: {
        title: "Tauschbörse durchsuchen",
        description:
          "Sehen Sie Spiele, die andere Schiedsrichter zum Tausch angeboten haben. Sie können Einsätze übernehmen, die Ihrem Niveau entsprechen.",
      },
      apply: {
        title: "Für Tausch bewerben",
        description:
          "Wischen Sie nach rechts, um sich für den Tausch zu bewerben und den Einsatz zu übernehmen.",
      },
      filter: {
        title: "Nach Niveau filtern",
        description:
          "Verwenden Sie diesen Schalter, um nur Spiele anzuzeigen, die Ihrem Schiedsrichterniveau entsprechen.",
      },
    },
    settings: {
      language: {
        title: "Sprache ändern",
        description:
          "Wählen Sie Ihre bevorzugte Sprache. Die App unterstützt Deutsch, Englisch, Französisch und Italienisch.",
      },
      complete: {
        title: "Tour abgeschlossen!",
        description:
          "Sie haben die Einführung abgeschlossen. Sie können sie jederzeit in den Einstellungen neu starten.",
      },
      tourSection: {
        title: "Einführungstouren",
        description:
          "Interaktive Tipps, die Sie mit Beispieldaten durch jeden Bereich der App führen.",
        restart: "Touren neu starten",
        statusCompleted: "Abgeschlossen",
        statusSkipped: "Übersprungen",
        statusNotStarted: "Nicht gestartet",
      },
    },
    feedback: {
      swipeSuccess: "Tolle Wischbewegung! Sie haben den Dreh raus.",
      tapSuccess: "Perfekt! Tippen Sie, um mehr Details zu entdecken.",
    },
  },
  common: {
    loading: "Laden...",
    error: "Ein Fehler ist aufgetreten",
    retry: "Erneut versuchen",
    cancel: "Abbrechen",
    save: "Speichern",
    close: "Schliessen",
    done: "Fertig",
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
    tbd: "TBD",
    locationTbd: "Ort unbekannt",
    selectRole: "Rolle wählen",
    selectOccupation: "Funktion wählen",
    vs: "vs",
    unknown: "Unbekannt",
    unknownDate: "Datum?",
    currencyChf: "CHF",
    distanceUnit: "km",
    dismissNotification: "Benachrichtigung schliessen",
    notifications: "Benachrichtigungen",
    cardActions: "Kartenaktionen",
    wizardProgress: "Assistentenfortschritt",
    stepIndicatorCurrent: "(aktuell)",
    stepIndicatorDone: "(erledigt)",
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
    checkingSession: "Sitzung wird überprüft...",
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
    active: "Aktiv",
    archived: "Archiviert",
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
    reportGenerated: "Bericht erfolgreich erstellt",
    invalidKilometers: "Bitte geben Sie eine gültige positive Zahl ein",
    failedToLoadData: "Daten konnten nicht geladen werden",
  },
  compensations: {
    title: "Entschädigungen",
    noCompensations: "Keine Entschädigungen gefunden",
    paid: "Bezahlt",
    unpaid: "Unbezahlt",
    pending: "Ausstehend",
    total: "Total",
    gameFee: "Spielgebühr",
    travel: "Reise",
    distance: "Distanz",
    status: "Status",
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
    loading: "Tauschangebote werden geladen...",
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
    applySuccess: "Erfolgreich für Tausch beworben",
    applyError: "Bewerbung für Tausch fehlgeschlagen. Bitte erneut versuchen.",
    withdrawSuccess: "Erfolgreich vom Tausch zurückgezogen",
    withdrawError:
      "Rückzug vom Tausch fehlgeschlagen. Bitte erneut versuchen.",
    addedToExchangeSuccess: "Einsatz zur Tauschbörse hinzugefügt",
    addedToExchangeError: "Einsatz konnte nicht zur Tauschbörse hinzugefügt werden",
    submittedBy: "Von:",
    levelRequired: "Niveau {level}+",
    errorLoading: "Fehler beim Laden der Tauschangebote",
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
    demoData: "Demo-Daten",
    demoDataDescription:
      "Ihre Demo-Daten werden im Browser gespeichert. Zurücksetzen, um mit neuen Demo-Daten zu starten.",
    resetDemoData: "Demo-Daten zurücksetzen",
    demoDataReset: "Demo-Daten wurden zurückgesetzt",
  },
  pwa: {
    offlineReady: "App bereit für Offline-Nutzung",
    newVersionAvailable: "Neue Version verfügbar",
    offlineReadyDescription: "Inhalte wurden für den Offline-Zugriff gespeichert.",
    newVersionDescription: "Klicken Sie auf Neu laden, um auf die neueste Version zu aktualisieren.",
    reload: "Neu laden",
    reloading: "Wird neu geladen...",
    dismiss: "Schliessen",
    reloadAriaLabel: "Anwendung neu laden, um auf die neueste Version zu aktualisieren",
    dismissAriaLabel: "Update-Benachrichtigung schliessen",
    closeAriaLabel: "Benachrichtigung schliessen",
  },
  pdf: {
    exportTitle: "PDF exportieren",
    selectLanguage: "Sprache für das PDF-Dokument auswählen:",
    export: "Exportieren",
    generating: "Wird erstellt...",
    exportError: "PDF konnte nicht erstellt werden",
    sportsHallReport: "Hallenrapport",
  },
  errorBoundary: {
    connectionProblem: "Verbindungsproblem",
    somethingWentWrong: "Etwas ist schiefgelaufen",
    networkErrorDescription:
      "Verbindung zum Server nicht möglich. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
    applicationErrorDescription:
      "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.",
    errorDetails: "Fehlerdetails",
    tryAgain: "Erneut versuchen",
    refreshPage: "Seite neu laden",
    page: {
      networkDescription:
        "Diese Seite konnte aufgrund eines Verbindungsproblems nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung.",
      errorDescription:
        "Auf dieser Seite ist ein Fehler aufgetreten. Sie können es erneut versuchen oder zur Startseite zurückkehren.",
      goHome: "Zur Startseite",
    },
    modal: {
      networkDescription:
        "Diese Aktion konnte aufgrund eines Verbindungsproblems nicht abgeschlossen werden.",
      errorDescription:
        "Bei dieser Aktion ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.",
      closeModal: "Schliessen",
    },
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
      added: "hinzugefügt",
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
      noScorersFound: "Keine Schreiber gefunden",
      searchResults: "Suchergebnisse",
      resultsCount: "{count} Ergebnisse gefunden",
      resultsCountOne: "1 Ergebnis gefunden",
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
      scoresheetUploaded: "Spielbericht hochgeladen",
      noScoresheet: "Kein Spielbericht hochgeladen",
    },
    state: {
      unsavedChangesTitle: "Ungespeicherte Änderungen",
      unsavedChangesMessage:
        "Sie haben ungespeicherte Änderungen. Was möchten Sie tun?",
      continueEditing: "Weiter bearbeiten",
      discardChanges: "Verwerfen",
      discardAndClose: "Verwerfen und schliessen",
      saveAndClose: "Speichern und schliessen",
      saveSuccess: "Validierung erfolgreich gespeichert",
      saveError: "Validierung konnte nicht gespeichert werden",
      markAllStepsTooltip:
        "Markieren Sie alle erforderlichen Schritte als geprüft, um abzuschliessen",
    },
    wizard: {
      previous: "Zurück",
      next: "Weiter",
      validate: "Validieren",
      finish: "Abschliessen",
      stepOf: "Schritt {current} von {total}",
      saving: "Speichern...",
      markAsReviewed: "Als geprüft markieren",
      alreadyValidated: "Dieses Spiel wurde bereits validiert",
      validatedBy: "Schreiber: {scorer}",
    },
  },
};

export default de;
