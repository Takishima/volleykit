import type { Translations } from "../types";

const it: Translations = {
  tour: {
    banner: {
      title: "Tour guidato",
      subtitle: "Esercitati con dati di esempio",
      exit: "Esci dal tour",
    },
    badge: {
      example: "Esempio",
    },
    actions: {
      skip: "Salta",
      next: "Avanti",
      previous: "Indietro",
      finish: "Termina",
    },
    stepCurrent: "Passo {step} di {total}",
    assignments: {
      welcome: {
        title: "Le tue designazioni",
        description:
          "Qui vedrai le tue prossime designazioni arbitrali. Ogni scheda mostra i dettagli della partita.",
      },
      swipeValidate: {
        title: "Scorri verso sinistra",
        description:
          "Scorri verso sinistra per rivelare i pulsanti d'azione: Valida (conferma la partita), Modifica (regola il compenso) e Rapporto (genera il rapporto palestra per NLA/NLB).",
      },
      swipeExchange: {
        title: "Scorri verso destra",
        description:
          "Scorri verso destra per offrire la designazione alla borsa. Altri arbitri potranno quindi prendere in carico la partita.",
      },
      tapDetails: {
        title: "Visualizza dettagli",
        description:
          "Tocca una scheda per espanderla e vedere maggiori dettagli sulla designazione.",
      },
    },
    compensations: {
      overview: {
        title: "I tuoi compensi",
        description:
          "Qui puoi vedere tutti i tuoi compensi arbitrali, incluse le tariffe delle partite e le spese di viaggio.",
      },
      swipeEdit: {
        title: "Scorri per modificare",
        description:
          "Scorri verso sinistra per rivelare il pulsante di modifica. Toccalo per regolare la distanza o aggiungere un motivo di correzione.",
      },
      tapDetails: {
        title: "Visualizza dettagli",
        description:
          "Tocca una scheda per espanderla e vedere maggiori dettagli sul compenso.",
      },
    },
    exchange: {
      browse: {
        title: "Scambi disponibili",
        description:
          "Qui puoi vedere le designazioni che altri arbitri vogliono cedere. Assumine una se si adatta ai tuoi impegni!",
      },
      apply: {
        title: "Scorri per candidarti",
        description:
          "Scorri verso sinistra per candidarti allo scambio. Assumerai la designazione se approvato.",
      },
      filter: {
        title: "Filtra per livello",
        description:
          "Usa questo pulsante per mostrare solo le partite che corrispondono al tuo livello arbitrale.",
      },
    },
    settings: {
      language: {
        title: "Cambia lingua",
        description:
          "Seleziona la tua lingua preferita. L'app supporta tedesco, inglese, francese e italiano.",
      },
      complete: {
        title: "Tour completato!",
        description:
          "Hai completato il tour guidato. Puoi riavviarlo in qualsiasi momento dalle impostazioni.",
      },
      tourSection: {
        title: "Tour guidati",
        description:
          "Suggerimenti interattivi che ti guidano attraverso ogni sezione dell'app usando dati di esempio.",
        safeModeNote:
          "Nota: La modalità sicura è attiva per impostazione predefinita e blocca alcune operazioni. Per validare partite o gestire gli scambi, disattiva la modalità sicura nella sezione sottostante.",
        restart: "Riavvia tour",
        statusCompleted: "Completato",
        statusSkipped: "Saltato",
        statusNotStarted: "Non iniziato",
      },
    },
    feedback: {
      swipeSuccess: "Ottimo scorrimento! Hai capito come funziona.",
      tapSuccess: "Perfetto! Tocca per esplorare più dettagli.",
    },
  },
  common: {
    loading: "Caricamento...",
    error: "Si è verificato un errore",
    retry: "Riprova",
    cancel: "Annulla",
    save: "Salva",
    close: "Chiudi",
    done: "Fatto",
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
    tbd: "Da definire",
    locationTbd: "Luogo da definire",
    selectRole: "Seleziona ruolo",
    selectOccupation: "Seleziona funzione",
    vs: "vs",
    unknown: "Sconosciuto",
    unknownDate: "Data?",
    currencyChf: "CHF",
    distanceUnit: "km",
    dismissNotification: "Ignora notifica",
    notifications: "Notifiche",
    cardActions: "Azioni della scheda",
    wizardProgress: "Progresso procedura guidata",
    stepIndicatorCurrent: "(corrente)",
    stepIndicatorDone: "(completato)",
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
    checkingSession: "Verifica sessione in corso...",
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
    active: "Attivo",
    archived: "Archiviato",
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
    reportGenerated: "Rapporto generato con successo",
    invalidKilometers: "Inserisci un numero positivo valido",
    failedToLoadData: "Impossibile caricare i dati",
  },
  compensations: {
    title: "Compensi",
    noCompensations: "Nessun compenso trovato",
    paid: "Pagato",
    unpaid: "Non pagato",
    pending: "In attesa",
    total: "Totale",
    gameFee: "Tariffa partita",
    travel: "Viaggio",
    distance: "Distanza",
    status: "Stato",
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
    editingRestrictedByRegion:
      "La modifica non è disponibile per questa regione. Il compenso viene pagato sul posto.",
    assignmentNotFoundInCache:
      "Designazione non trovata nella cache. Aggiorna la pagina e riprova.",
    compensationNotFound:
      "Record di compenso non trovato. La partita potrebbe essere troppo lontana nel futuro.",
    compensationMissingId:
      "Il record di compenso non ha un identificatore. Riprova più tardi.",
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
    loading: "Caricamento scambi...",
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
    applySuccess: "Candidatura allo scambio riuscita",
    applyError: "Candidatura fallita. Riprova.",
    withdrawSuccess: "Ritiro dallo scambio riuscito",
    withdrawError: "Ritiro dallo scambio fallito. Riprova.",
    addedToExchangeSuccess: "Designazione aggiunta alla borsa scambi",
    addedToExchangeError: "Impossibile aggiungere la designazione alla borsa",
    submittedBy: "Da:",
    levelRequired: "Livello {level}+",
    errorLoading: "Impossibile caricare gli scambi",
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
    demoData: "Dati demo",
    demoDataDescription:
      "Le modifiche ai dati demo vengono salvate nel browser. Reimposta per ricominciare con nuovi dati demo.",
    resetDemoData: "Reimposta dati demo",
    demoDataReset: "I dati demo sono stati reimpostati",
  },
  pwa: {
    offlineReady: "App pronta per l'uso offline",
    newVersionAvailable: "Nuova versione disponibile",
    offlineReadyDescription: "I contenuti sono stati salvati per l'accesso offline.",
    newVersionDescription: "Clicca Ricarica per aggiornare all'ultima versione.",
    reload: "Ricarica",
    reloading: "Ricaricamento...",
    dismiss: "Ignora",
    reloadAriaLabel: "Ricarica l'applicazione per aggiornare all'ultima versione",
    dismissAriaLabel: "Ignora notifica di aggiornamento",
    closeAriaLabel: "Chiudi notifica",
  },
  pdf: {
    exportTitle: "Esporta PDF",
    selectLanguage: "Seleziona la lingua del documento PDF:",
    export: "Esporta",
    generating: "Generazione...",
    exportError: "Generazione PDF fallita",
    sportsHallReport: "Rapporto sala sportiva",
  },
  errorBoundary: {
    connectionProblem: "Problema di connessione",
    somethingWentWrong: "Qualcosa è andato storto",
    networkErrorDescription:
      "Impossibile connettersi al server. Verifica la tua connessione internet e riprova.",
    applicationErrorDescription:
      "Si è verificato un errore imprevisto. Ricarica la pagina.",
    errorDetails: "Dettagli errore",
    tryAgain: "Riprova",
    refreshPage: "Ricarica pagina",
    page: {
      networkDescription:
        "Impossibile caricare questa pagina a causa di un problema di connessione. Verifica la tua connessione internet.",
      errorDescription:
        "Questa pagina ha riscontrato un errore. Puoi riprovare o tornare alla home.",
      goHome: "Vai alla home",
    },
    modal: {
      networkDescription:
        "Impossibile completare questa azione a causa di un problema di connessione.",
      errorDescription:
        "Qualcosa è andato storto con questa azione. Riprova.",
      closeModal: "Chiudi",
    },
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
      added: "aggiunto/i",
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
      noScorersFound: "Nessun segnapunti trovato",
      searchResults: "Risultati della ricerca",
      resultsCount: "{count} risultati trovati",
      resultsCountOne: "1 risultato trovato",
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
      scoresheetUploaded: "Referto caricato",
      noScoresheet: "Nessun referto caricato",
      notRequired: "Referto non richiesto",
      notRequiredDescription:
        "Questa competizione non richiede il caricamento del referto.",
    },
    state: {
      unsavedChangesTitle: "Modifiche non salvate",
      unsavedChangesMessage:
        "Hai modifiche non salvate. Cosa vuoi fare?",
      continueEditing: "Continua a modificare",
      discardChanges: "Scarta",
      discardAndClose: "Scarta e chiudi",
      saveAndClose: "Salva e chiudi",
      saveSuccess: "Validazione salvata con successo",
      saveError: "Impossibile salvare la validazione",
      markAllStepsTooltip:
        "Segna tutti i passaggi richiesti come verificati per terminare",
    },
    wizard: {
      previous: "Precedente",
      next: "Avanti",
      validate: "Valida",
      finish: "Termina",
      stepOf: "Passo {current} di {total}",
      saving: "Salvataggio...",
      markAsReviewed: "Segna come verificato",
      alreadyValidated: "Questa partita è già stata validata",
      validatedBy: "Segnapunti: {scorer}",
    },
  },
};

export default it;
