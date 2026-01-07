import type { TranslationKeys } from './types';

export const it: TranslationKeys = {
  nav: {
    home: 'Home',
    gettingStarted: 'Primi passi',
    assignments: 'Designazioni',
    exchanges: 'Scambi',
    compensations: 'Compensi',
    calendarMode: 'Modalità calendario',
    travelTime: 'Tempo di viaggio',
    offlinePwa: 'Offline & PWA',
    settings: 'Impostazioni',
  },

  common: {
    openApp: 'Apri App',
    learnMore: 'Scopri di più',
    readMore: 'Leggi di più',
    back: 'Indietro',
    next: 'Avanti',
    previous: 'Precedente',
    close: 'Chiudi',
    menu: 'Menu',
    search: 'Cerca',
    viewOnGithub: 'Vedi su GitHub',
  },

  home: {
    title: 'Aiuto VolleyKit',
    subtitle: 'La tua guida all\'app VolleyKit',
    description:
      'Scopri come utilizzare VolleyKit per gestire le tue designazioni arbitrali, gli scambi e i compensi.',
    ctaOpenApp: 'Apri App',
    ctaGetStarted: 'Inizia',
    featuresTitle: 'Esplora la documentazione',
    readyToStart: 'Pronto per iniziare?',
    features: {
      gettingStarted: {
        title: 'Primi passi',
        description:
          'Guida rapida per configurare e utilizzare VolleyKit per la prima volta.',
      },
      assignments: {
        title: 'Designazioni',
        description:
          'Visualizza e gestisci le tue prossime partite arbitrali di pallavolo.',
      },
      exchanges: {
        title: 'Scambi',
        description:
          'Richiedi scambi di partite e offri le tue designazioni ad altri arbitri.',
      },
      compensations: {
        title: 'Compensi',
        description:
          'Monitora i tuoi guadagni arbitrali e lo storico dei compensi.',
      },
      calendarMode: {
        title: 'Modalità calendario',
        description:
          'Accesso in sola lettura alle designazioni senza effettuare il login.',
      },
      travelTime: {
        title: 'Tempo di viaggio',
        description:
          'Calcola i tempi di viaggio con i trasporti pubblici svizzeri.',
      },
      offlinePwa: {
        title: 'Offline & PWA',
        description:
          'Installa l\'app e usala offline sul tuo dispositivo.',
      },
      settings: {
        title: 'Impostazioni',
        description:
          'Personalizza lingua, tema e preferenze di notifica.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Primi passi',
      description:
        'Scopri come configurare e iniziare a usare VolleyKit per le tue designazioni arbitrali.',
    },
    assignments: {
      title: 'Designazioni',
      description:
        'Scopri come visualizzare e gestire le tue designazioni arbitrali in VolleyKit.',
    },
    exchanges: {
      title: 'Scambi',
      description:
        'Scopri come richiedere e gestire gli scambi di designazioni con altri arbitri.',
    },
    compensations: {
      title: 'Compensi',
      description:
        'Scopri come monitorare e comprendere i tuoi compensi arbitrali.',
    },
    calendarMode: {
      title: 'Modalità calendario',
      description:
        'Scopri la modalità calendario per l\'accesso in sola lettura alle designazioni arbitrali.',
    },
    travelTime: {
      title: 'Tempo di viaggio',
      description:
        'Scopri come VolleyKit calcola i tempi di viaggio verso le sedi delle partite con i trasporti pubblici svizzeri.',
    },
    offlinePwa: {
      title: 'Offline & PWA',
      description:
        'Scopri come usare VolleyKit offline e installarlo come app progressiva.',
    },
    settings: {
      title: 'Impostazioni',
      description:
        'Scopri come personalizzare le impostazioni e le preferenze di VolleyKit.',
    },
  },

  search: {
    placeholder: 'Cerca nella documentazione...',
    placeholderShort: 'Cerca...',
    noResults: 'Nessun risultato trovato',
    tryDifferent: 'Prova con parole chiave diverse',
    initialHint: 'Digita per iniziare la ricerca',
    initialSubhint: 'Cerca in tutte le pagine della documentazione',
    searching: 'Ricerca in corso...',
    unavailable: 'Ricerca non disponibile',
    unavailableHint:
      'Esegui una build di produzione per abilitare la ricerca',
    resultsCount: '{count} risultati',
    navigateHint: 'per navigare',
    selectHint: 'per selezionare',
    poweredBy: 'Powered by Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Creato con Astro',
    forReferees: 'Per gli arbitri di pallavolo svizzeri',
    copyright: '© {year} VolleyKit',
    mainApp: 'App principale',
    documentation: 'Documentazione',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Apri menu di navigazione',
    closeMenu: 'Chiudi menu',
    openSearch: 'Cerca nella documentazione',
    closeSearch: 'Chiudi ricerca',
    skipToContent: 'Vai al contenuto',
    breadcrumb: 'Breadcrumb',
    mainNavigation: 'Navigazione principale',
    mobileNavigation: 'Navigazione mobile',
    externalLink: 'Si apre in una nuova scheda',
  },

  screenshot: {
    placeholder: 'Segnaposto screenshot',
    captureInstructions: 'Istruzioni di cattura',
  },

  infoBox: {
    info: 'Info',
    tip: 'Suggerimento',
    warning: 'Avviso',
  },

  gettingStarted: {
    heading: 'Primi passi con VolleyKit',
    lead: "VolleyKit è un'applicazione web progressiva che offre un'interfaccia migliorata per gestire le tue designazioni arbitrali di pallavolo tramite il sistema volleymanager della Federazione Svizzera di Pallavolo.",
    whatIs: {
      title: "Cos'è VolleyKit?",
      description: "VolleyKit si connette alla piattaforma ufficiale volleymanager.volleyball.ch e offre agli arbitri un'interfaccia moderna e ottimizzata per dispositivi mobili per:",
      features: {
        viewAssignments: 'Visualizzare le prossime designazioni',
        manageExchanges: 'Richiedere e gestire scambi con altri arbitri',
        trackCompensations: 'Monitorare i pagamenti dei compensi',
        offlineAccess: 'Accedere alle designazioni offline',
        travelTime: 'Calcolare i tempi di viaggio con i trasporti pubblici svizzeri',
      },
      infoBox: "VolleyKit è un'app non ufficiale creata per migliorare l'esperienza degli arbitri. Tutti i dati provengono dal sistema volleymanager ufficiale.",
    },
    howToLogin: {
      title: 'Come accedere',
      description: 'VolleyKit offre due modi per accedere alle tue designazioni:',
      calendarMode: {
        title: 'Opzione 1: Modalità calendario (Consigliata)',
        description: "Per un accesso rapido al tuo calendario senza inserire la password, puoi usare la modalità calendario con il tuo URL o codice calendario univoco da volleymanager.",
        steps: {
          findUrl: {
            title: 'Trova il tuo URL calendario',
            description: 'In volleymanager, vai su "Le mie designazioni" e copia il tuo URL di abbonamento al calendario.',
          },
          selectMode: {
            title: 'Seleziona Modalità calendario',
            description: 'Nella pagina di login di VolleyKit, tocca la scheda "Modalità calendario".',
          },
          pasteUrl: {
            title: 'Incolla il tuo URL o codice',
            description: 'Inserisci il tuo URL calendario o solo il codice per accedere al tuo programma.',
          },
        },
        infoBox: "La modalità calendario offre accesso in sola lettura – puoi vedere le designazioni ma non puoi confermare partite, richiedere scambi o accedere ai compensi. Vedi la guida alla modalità calendario per maggiori dettagli.",
      },
      fullLogin: {
        title: 'Opzione 2: Login completo',
        description: "Usa le tue credenziali volleymanager.volleyball.ch per l'accesso completo a tutte le funzionalità.",
        steps: {
          openApp: {
            title: 'Apri VolleyKit',
            description: "Naviga all'app VolleyKit nel tuo browser o apri l'app installata.",
          },
          enterCredentials: {
            title: 'Inserisci le tue credenziali',
            description: 'Usa il tuo nome utente e password volleymanager per accedere.',
          },
          stayLoggedIn: {
            title: 'Resta connesso',
            description: 'Attiva "Ricordami" per restare connesso tra le sessioni.',
          },
        },
        screenshotAlt: 'Pagina di login VolleyKit con campi nome utente e password',
        screenshotCaption: 'La pagina di login VolleyKit',
        tipTitle: 'Password dimenticata?',
        tipContent: 'VolleyKit usa le stesse credenziali di volleymanager.volleyball.ch. Usa la funzione di recupero password sul sito ufficiale se hai dimenticato la password.',
      },
    },
    quickTour: {
      title: 'Tour rapido',
      description: 'Dopo il login, vedrai la dashboard principale con le tue prossime designazioni. Ecco una panoramica rapida delle sezioni principali:',
      assignments: {
        title: 'Designazioni',
        description: 'Visualizza tutte le tue prossime partite arbitrali. Ogni designazione mostra data, ora, squadre, sede e il tuo ruolo (1° arbitro, 2° arbitro o giudice di linea).',
      },
      exchanges: {
        title: 'Scambi',
        description: 'Sfoglia gli scambi disponibili da altri arbitri o richiedi uno scambio per una delle tue designazioni.',
      },
      compensations: {
        title: 'Compensi',
        description: "Monitora i tuoi pagamenti arbitrali e lo storico dei compensi. Filtra per periodo ed esporta i tuoi dati.",
      },
      settings: {
        title: 'Impostazioni',
        description: 'Personalizza la tua esperienza includendo lingua, posizione di casa per i calcoli di viaggio e preferenze di notifica.',
      },
    },
    nextSteps: {
      title: 'Prossimi passi',
      description: 'Ora che hai familiarità con le basi, esplora le guide dettagliate per ogni funzionalità:',
      links: {
        assignments: 'Gestire le tue designazioni',
        exchanges: 'Richiedere e accettare scambi',
        compensations: 'Monitorare i tuoi compensi',
      },
    },
  },

  assignments: {
    heading: 'Gestire le tue designazioni',
    lead: 'La sezione Designazioni è il tuo centro principale per visualizzare tutte le tue prossime partite arbitrali di pallavolo e gestire il tuo programma.',
    whatAre: {
      title: 'Cosa sono le designazioni?',
      description: 'Le designazioni sono le partite per cui sei stato programmato come arbitro. Ogni designazione include:',
      details: {
        dateTime: 'Data e ora – Quando si svolge la partita',
        teams: 'Squadre – Nomi delle squadre di casa e ospite',
        venue: 'Sede – Luogo della partita con indirizzo',
        role: 'Il tuo ruolo – 1° arbitro, 2° arbitro o giudice di linea',
        league: 'Lega – Il livello di competizione (es. NLA, NLB, 1ª Lega)',
      },
    },
    viewing: {
      title: 'Visualizzare le tue designazioni',
      description: "La lista delle designazioni mostra tutte le tue prossime partite in ordine cronologico. Le partite sono raggruppate per data per vedere facilmente cosa c'è in arrivo.",
      screenshotAlt: 'Lista designazioni con più partite in arrivo raggruppate per data',
      screenshotCaption: 'La vista lista designazioni con le prossime partite',
    },
    details: {
      title: 'Dettagli designazione',
      description: 'Tocca una designazione per vedere tutti i dettagli. La vista dettagliata include:',
      items: {
        gameInfo: 'Informazioni complete della partita',
        venueAddress: 'Indirizzo sede con link mappa',
        travelTime: 'Tempo di viaggio dalla tua posizione di casa',
        otherReferees: 'Altri arbitri assegnati alla stessa partita',
        swipeActions: 'Azioni disponibili tramite gesti di scorrimento',
      },
      screenshotAlt: 'Vista dettagliata designazione con tutte le informazioni della partita',
      screenshotCaption: 'Vista dettagliata di una singola designazione',
    },
    actions: {
      title: 'Eseguire azioni',
      description: 'VolleyKit usa gesti di scorrimento per accedere rapidamente alle azioni sulle tue schede designazione. A seconda dello stato della partita, potrebbero essere disponibili azioni diverse.',
      swipeRight: {
        title: 'Scorri a destra – Aggiungi allo scambio',
        description: 'Scorri una scheda designazione verso destra per rivelare l\'azione di scambio. Se non puoi partecipare a una partita, puoi aggiungerla alla bacheca scambi per altri arbitri.',
        screenshotAlt: 'Scheda designazione scorsa a destra che mostra azione di scambio',
        screenshotCaption: 'Scorri a destra per aggiungere una designazione alla bacheca scambi',
        warning: 'Assicurati di richiedere uno scambio con largo anticipo. Le richieste dell\'ultimo minuto potrebbero non trovare un sostituto in tempo.',
      },
      swipeLeft: {
        title: 'Scorri a sinistra – Valida & Modifica',
        description: 'Scorri una scheda designazione verso sinistra per rivelare azioni aggiuntive:',
        validate: 'Valida – Invia i risultati della partita e valida (disponibile per i primi arbitri dopo la partita)',
        edit: 'Modifica – Modifica i dettagli del tuo compenso per questa designazione',
        screenshotAlt: 'Scheda designazione scorsa a sinistra che mostra azioni valida e modifica',
        screenshotCaption: 'Scorri a sinistra per rivelare le azioni valida e modifica',
        tip: "Puoi anche eseguire uno scorrimento completo per attivare immediatamente l'azione principale senza toccare il pulsante.",
      },
      directions: {
        title: 'Ottieni indicazioni',
        description: 'Tocca una scheda designazione per espanderla, poi usa il pulsante indicazioni per aprire la tua app mappe preferita con le indicazioni per la sede.',
      },
    },
    upcomingPast: {
      title: 'Partite future e passate',
      description: 'Usa le schede in alto per passare tra:',
      upcoming: 'In arrivo – Partite che non si sono ancora svolte',
      validationClosed: 'Validazione chiusa – Partite passate dove la validazione è completa',
      tip: 'Imposta la tua posizione di casa nelle Impostazioni per vedere le stime dei tempi di viaggio su ogni scheda designazione.',
    },
  },

  exchanges: {
    heading: 'Scambi di partite',
    lead: 'Il sistema di scambio permette agli arbitri di scambiare partite quando non possono partecipare alle loro designazioni programmate. Puoi richiedere scambi per le tue partite o prendere partite da altri arbitri.',
    whatAre: {
      title: 'Cosa sono gli scambi?',
      description: 'Uno scambio è una richiesta da un arbitro che non può partecipare alla sua partita programmata e cerca un sostituto. Il sistema volleymanager mantiene una bacheca scambi dove gli arbitri possono:',
      features: {
        postGames: 'Pubblicare le loro partite per lo scambio',
        browseGames: 'Sfogliare le partite disponibili da altri arbitri',
        acceptGames: 'Accettare partite che si adattano al loro programma',
      },
      infoBox: 'Gli scambi sono gestiti tramite il sistema volleymanager ufficiale. VolleyKit offre un\'interfaccia più user-friendly alla stessa bacheca scambi.',
    },
    requesting: {
      title: 'Richiedere uno scambio',
      description: 'Quando non puoi partecipare a una delle tue partite programmate, puoi richiedere uno scambio per trovare un arbitro sostituto.',
      steps: {
        findAssignment: {
          title: 'Trova la designazione',
          description: 'Vai alla scheda Designazioni e trova la partita che vuoi scambiare.',
        },
        swipeRight: {
          title: 'Scorri a destra sulla scheda',
          description: "Scorri la scheda designazione verso destra per rivelare l'azione di scambio, poi toccala. La partita verrà pubblicata sulla bacheca scambi.",
        },
      },
      screenshotAlt: 'Scheda designazione con azione di scorrimento scambio rivelata',
      screenshotCaption: 'Richiedere uno scambio per una partita',
      warningTitle: 'Richiedi presto',
      warningContent: 'Prima richiedi uno scambio, più probabilità hai di trovare un sostituto. Le richieste dell\'ultimo minuto spesso restano senza risposta.',
    },
    viewing: {
      title: 'Visualizzare gli scambi disponibili',
      description: 'La scheda Scambi mostra tutte le partite attualmente disponibili per lo scambio. Queste sono partite che altri arbitri hanno pubblicato e per cui cercano sostituti.',
      screenshotAlt: 'Lista delle partite di scambio disponibili da altri arbitri',
      screenshotCaption: 'Partite disponibili sulla bacheca scambi',
      filtering: {
        title: 'Filtrare gli scambi',
        description: 'Filtra la lista scambi per trovare partite che ti convengono. I filtri diventano disponibili dopo aver configurato le impostazioni richieste:',
        distance: 'Distanza – Filtra per distanza massima dalla tua posizione di casa. Richiede di impostare la posizione di casa nelle Impostazioni.',
        travelTime: "Tempo di viaggio – Filtra per tempo di viaggio massimo con i trasporti pubblici. Richiede sia una posizione di casa che l'attivazione dell'API dei trasporti pubblici nelle Impostazioni.",
        usage: "Una volta disponibili, i filtri appaiono come chip toggle accanto all'icona ingranaggio. Tocca l'ingranaggio per configurare i valori massimi per ogni filtro.",
        tip: "Imposta la tua posizione di casa nelle Impostazioni per sbloccare il filtraggio per distanza. Attiva l'API dei trasporti pubblici per filtrare anche per tempo di viaggio.",
      },
    },
    accepting: {
      title: 'Accettare uno scambio',
      description: 'Quando trovi una partita che vorresti prendere, puoi accettare lo scambio:',
      steps: {
        review: {
          title: 'Verifica i dettagli della partita',
          description: 'Controlla data, ora, sede e requisiti di viaggio.',
        },
        swipeLeft: {
          title: 'Scorri a sinistra sulla scheda',
          description: "Scorri la scheda scambio verso sinistra per rivelare l'azione di presa in carico, poi toccala.",
        },
        confirm: {
          title: 'Conferma la tua accettazione',
          description: 'Verifica i dettagli e conferma la tua accettazione.',
        },
        gameAdded: {
          title: 'Partita aggiunta al tuo programma',
          description: 'La partita ora appare nelle tue designazioni.',
        },
      },
      tip: "Assicurati di poter effettivamente partecipare alla partita prima di accettare. Una volta accettato, l'arbitro originale viene liberato dalla designazione.",
    },
    managing: {
      title: 'Gestire le tue richieste di scambio',
      description: "Puoi visualizzare e gestire le tue richieste di scambio attive dalla scheda Scambi. Se non hai più bisogno di uno scambio (es. il tuo programma è cambiato), puoi annullare la richiesta prima che qualcuno la accetti.",
      canceling: {
        title: 'Annullare una richiesta',
        description: 'Per annullare una richiesta di scambio che hai fatto:',
        steps: {
          goToExchanges: 'Vai alla scheda Scambi',
          selectAddedByMe: 'Seleziona la scheda "Aggiunti da me" per vedere le tue richieste in sospeso',
          swipeRight: "Scorri a destra sulla scheda richiesta per rivelare l'azione di rimozione, poi toccala",
          confirmCancellation: "Conferma l'annullamento",
        },
        infoBox: "Puoi annullare una richiesta di scambio solo se nessuno l'ha ancora accettata. Una volta accettato, lo scambio è definitivo.",
      },
    },
  },

  compensations: {
    heading: 'Monitorare i tuoi compensi',
    lead: 'La sezione Compensi ti aiuta a monitorare i tuoi guadagni arbitrali e lo storico dei pagamenti. Visualizza i pagamenti passati, filtra per periodo ed esporta i tuoi dati per i tuoi archivi.',
    whatAre: {
      title: 'Cosa sono i compensi?',
      description: 'I compensi sono i pagamenti che ricevi per arbitrare partite di pallavolo. Ogni voce di compenso include tipicamente:',
      details: {
        gameDetails: 'Dettagli partita – La partita che hai arbitrato',
        date: 'Data – Quando si è svolta la partita',
        amount: 'Importo – L\'importo del compenso in CHF',
        paymentStatus: 'Stato pagamento – In sospeso, pagato o elaborato',
        role: 'Ruolo – La tua funzione nella partita',
      },
      infoBox: 'Gli importi dei compensi sono stabiliti da Swiss Volley e variano in base al livello di lega e al tuo ruolo nella partita.',
    },
    viewing: {
      title: 'Visualizzare i tuoi compensi',
      description: "La lista compensi mostra tutti i tuoi pagamenti registrati in ordine cronologico. Ogni voce mostra le informazioni chiave a colpo d'occhio.",
      screenshotAlt: 'Lista compensi che mostra lo storico pagamenti con importi e date',
      screenshotCaption: 'Il tuo storico compensi',
      paymentStatus: {
        title: 'Capire lo stato del pagamento',
        pending: 'In sospeso – Partita completata, pagamento non ancora elaborato',
        processing: 'In elaborazione – Il pagamento è in corso di elaborazione',
        paid: 'Pagato – Il pagamento è stato effettuato sul tuo conto',
      },
    },
    filtering: {
      title: 'Filtrare per stato',
      description: 'Usa le schede in alto per filtrare i compensi per stato:',
      tabs: {
        pendingPast: 'In sospeso (Passato) – Partite passate in attesa di pagamento',
        pendingFuture: 'In sospeso (Futuro) – Partite future non ancora giocate',
        closed: 'Chiuso – Compensi completati e pagati',
      },
      screenshotAlt: 'Schede compensi che mostrano le opzioni in sospeso e chiuso',
      screenshotCaption: 'Filtrare i compensi per stato',
      tip: 'I compensi sono automaticamente filtrati sulla stagione corrente (settembre a maggio) per concentrarti sulle partite recenti.',
    },
    exportPdf: {
      title: 'Esporta in PDF',
      description: "Puoi esportare singoli record di compenso come documenti PDF. Scorri a sinistra su una scheda compenso per rivelare l'azione di esportazione PDF.",
      usage: "Il PDF esportato include i dettagli della partita e le informazioni sul compenso in un documento formattato. Questo è utile per le squadre che devono pagare l'arbitro direttamente.",
      infoBox: "L'esportazione PDF crea un documento dall'aspetto ufficiale con tutti i dettagli della partita e del compenso che le squadre potrebbero richiedere per i loro archivi.",
    },
    paymentSchedule: {
      title: 'Calendario pagamenti',
      description: 'I pagamenti dei compensi sono tipicamente elaborati mensilmente da Swiss Volley. Il calendario esatto può variare, ma generalmente:',
      details: {
        processing: "Le partite del mese precedente vengono elaborate all'inizio di ogni mese",
        bankTransfer: 'I pagamenti vengono effettuati tramite bonifico bancario sul tuo conto registrato',
        timing: "L'elaborazione può richiedere 2-4 settimane dopo la fine del mese",
      },
      warning: 'Assicurati che i tuoi dati bancari siano aggiornati nel sistema volleymanager per evitare ritardi nei pagamenti.',
    },
  },

  calendarMode: {
    heading: 'Modalità calendario',
    lead: 'La modalità calendario offre accesso in sola lettura per visualizzare le designazioni arbitrali senza un login completo. Perfetta per controllare rapidamente il tuo programma o condividerlo con i familiari.',
    whatIs: {
      title: "Cos'è la modalità calendario?",
      description: "La modalità calendario è un metodo di accesso leggero in sola lettura che ti permette di vedere le tue prossime designazioni senza inserire la password. Usa un codice calendario univoco collegato al tuo account arbitro.",
      features: {
        viewAssignments: 'Visualizzare le tue prossime designazioni di partite',
        seeDetails: 'Vedere i dettagli delle partite inclusi data, ora, squadre e sede',
        noPassword: 'Nessuna password richiesta – solo il tuo codice calendario',
        safeToShare: 'Sicuro da condividere con la famiglia o aggiungere ai calendari condivisi',
      },
    },
    whoIsFor: {
      title: 'Per chi è la modalità calendario?',
      description: 'La modalità calendario è ideale per:',
      useCases: {
        quickChecks: 'Controlli rapidi del programma – Visualizza le tue partite senza accedere',
        familyMembers: 'Membri della famiglia – Condividi il tuo programma con partner o famiglia',
        calendarIntegration: 'Integrazione calendario – Aggiungi partite ad app calendario esterne',
        publicDevices: 'Dispositivi pubblici – Controlla il tuo programma su computer condivisi',
      },
      tip: 'La modalità calendario è perfetta per far sapere alla tua famiglia quando hai partite senza dare loro accesso al tuo account completo.',
    },
    howToAccess: {
      title: 'Come accedere alla modalità calendario',
      description: 'Per usare la modalità calendario, hai bisogno del tuo codice calendario univoco dal sistema volleymanager.',
      steps: {
        findCode: {
          title: 'Trova il tuo codice calendario',
          description: 'Accedi a volleymanager.volleyball.ch e trova il tuo codice calendario nelle impostazioni del profilo.',
        },
        openApp: {
          title: 'Apri VolleyKit',
          description: "Naviga all'app VolleyKit.",
        },
        selectMode: {
          title: 'Seleziona "Modalità calendario"',
          description: 'Nella pagina di login, tocca l\'opzione "Modalità calendario".',
        },
        enterCode: {
          title: 'Inserisci il tuo codice',
          description: 'Inserisci il tuo codice calendario per accedere al tuo programma in sola lettura.',
        },
      },
      screenshotAlt: "Schermata di ingresso modalità calendario con campo inserimento codice",
      screenshotCaption: 'Entrare in modalità calendario con il tuo codice',
    },
    viewingSchedule: {
      title: 'Visualizzare il tuo programma',
      description: 'In modalità calendario, vedrai le tue prossime designazioni in una vista semplificata. L\'interfaccia mostra le informazioni essenziali per ogni partita.',
      screenshotAlt: 'Modalità calendario che mostra le prossime designazioni in vista sola lettura',
      screenshotCaption: 'Vista designazioni in modalità calendario',
    },
    limitations: {
      title: 'Limitazioni vs login completo',
      description: 'La modalità calendario è in sola lettura, il che significa che alcune funzionalità non sono disponibili:',
      table: {
        feature: 'Funzionalità',
        fullLogin: 'Login completo',
        calendarMode: 'Modalità calendario',
        viewAssignments: 'Visualizza designazioni',
        viewDetails: 'Visualizza dettagli partita',
        travelTime: 'Info tempo di viaggio',
        confirmAssignments: 'Conferma designazioni',
        requestExchanges: 'Richiedi scambi',
        viewCompensations: 'Visualizza compensi',
        acceptExchanges: 'Accetta scambi',
      },
      infoBox: 'Per azioni come confermare designazioni o richiedere scambi, dovrai accedere con le tue credenziali complete.',
    },
    security: {
      title: 'Mantenere il tuo codice sicuro',
      description: 'Anche se la modalità calendario è in sola lettura, il tuo codice calendario dovrebbe comunque essere trattato con cura:',
      tips: {
        shareWithTrust: 'Condividi solo con persone di fiducia',
        dontPostPublicly: 'Non pubblicare il tuo codice pubblicamente online',
        ifCompromised: 'Se sospetti che il tuo codice sia stato compromesso, contatta Swiss Volley',
      },
      warning: 'Il tuo codice calendario rivela il tuo programma completo di partite. Condividilo solo con persone con cui ti fidi di condividere i tuoi spostamenti.',
    },
  },

  travelTime: {
    heading: 'Funzionalità tempo di viaggio',
    lead: 'VolleyKit integra i dati dei trasporti pubblici svizzeri per mostrarti quanto tempo ci vuole per raggiungere ogni sede di partita. Pianifica meglio i tuoi viaggi e non arrivare mai in ritardo a una partita.',
    howItWorks: {
      title: 'Come funziona',
      description: "La funzionalità tempo di viaggio usa l'API dei trasporti pubblici svizzeri (FFS/öV) per calcolare i tempi di viaggio dalla tua posizione di casa a ogni sede di partita. Considera:",
      considerations: {
        schedules: 'Orari in tempo reale di treni, bus e tram',
        walkingTime: 'Tempo di cammino da/per le stazioni',
        transferTimes: 'Tempi di cambio tra connessioni',
        gameStartTime: "L'ora effettiva di inizio partita",
      },
      infoBox: 'I tempi di viaggio sono calcolati usando i trasporti pubblici. Se guidi abitualmente, usa i tempi come stima approssimativa o per pianificare opzioni di trasporto alternative.',
    },
    settingHome: {
      title: 'Impostare la tua posizione di casa',
      description: "Per ottenere tempi di viaggio accurati, devi impostare la tua posizione di casa nelle impostazioni dell'app.",
      steps: {
        openSettings: {
          title: 'Apri Impostazioni',
          description: 'Naviga alla pagina Impostazioni in VolleyKit.',
        },
        findHomeLocation: {
          title: 'Trova "Posizione casa"',
          description: 'Scorri fino alla sezione impostazioni di viaggio.',
        },
        enterAddress: {
          title: 'Inserisci il tuo indirizzo',
          description: 'Digita il tuo indirizzo di casa o la stazione da cui viaggi abitualmente.',
        },
        saveSettings: {
          title: 'Salva le tue impostazioni',
          description: 'Conferma la tua posizione per iniziare a vedere i tempi di viaggio.',
        },
      },
      screenshotAlt: 'Pagina impostazioni che mostra il campo di inserimento posizione casa',
      screenshotCaption: 'Impostare la tua posizione di casa',
      tip: 'Usa la stazione ferroviaria più vicina come posizione di casa se cammini o vai in bici abitualmente alla stazione – questo dà tempi di trasporto pubblico più accurati.',
    },
    viewingTimes: {
      title: 'Visualizzare i tempi di viaggio',
      description: 'Una volta impostata la posizione di casa, i tempi di viaggio appaiono sulle tue schede designazione e nella vista dettagliata della designazione.',
      screenshotAlt: 'Scheda designazione che mostra informazioni sul tempo di viaggio',
      screenshotCaption: 'Tempo di viaggio visualizzato su una designazione',
      whatsShown: {
        title: 'Cosa viene mostrato',
        duration: 'Durata – Tempo di viaggio totale da casa alla sede',
        departureTime: 'Ora di partenza – Quando dovresti partire per arrivare in tempo',
        transportType: 'Tipo di trasporto – Icona treno, bus o trasporto misto',
      },
    },
    journeyDetails: {
      title: 'Dettagli del viaggio',
      description: 'Tocca il tempo di viaggio per vedere i dettagli completi del viaggio:',
      features: {
        stepByStep: 'Indicazioni passo passo',
        connectionDetails: 'Dettagli connessioni (numeri treno, binari)',
        walkingSegments: 'Segmenti a piedi',
        transferTimes: 'Tempi di cambio',
      },
      sbbLink: "Puoi anche aprire il viaggio direttamente nell'app o sito FFS per aggiornamenti in tempo reale e acquisto biglietti.",
      screenshotAlt: 'Informazioni dettagliate del viaggio con connessioni e orari',
      screenshotCaption: 'Dettagli completi del viaggio per la pianificazione',
    },
    arrivalBuffer: {
      title: "Margine d'arrivo",
      description: "L'ora di partenza suggerita include un margine per assicurarsi di arrivare prima dell'inizio della partita:",
      details: {
        standardBuffer: "Margine standard: 15-30 minuti prima dell'ora della partita",
        timeFor: 'Tempo per trovare la sede, cambiarsi e riscaldarsi',
        accountForDelays: 'Tenere conto di potenziali piccoli ritardi',
      },
      warning: 'Prevedi sempre tempo extra per partite importanti o sedi sconosciute. I trasporti pubblici possono subire ritardi imprevisti.',
    },
    offlineAvailability: {
      title: 'Disponibilità offline',
      description: 'I tempi di viaggio vengono memorizzati nella cache quando li visualizzi online. Se sei offline:',
      details: {
        cachedAvailable: 'I tempi di viaggio visualizzati in precedenza restano disponibili',
        requiresConnection: 'I nuovi calcoli richiedono una connessione internet',
        outdatedIndicator: "L'app indica quando i dati potrebbero essere obsoleti",
      },
      tip: 'Controlla i tuoi tempi di viaggio online prima di andare in una zona con scarsa connettività. I dati in cache saranno disponibili offline.',
    },
  },

  offlinePwa: {
    heading: 'Funzionalità offline & PWA',
    lead: "VolleyKit è una Progressive Web App (PWA) che puoi installare sul tuo dispositivo e usare offline. Accedi alle tue designazioni anche senza connessione internet.",
    whatIsPwa: {
      title: "Cos'è una PWA?",
      description: "Una Progressive Web App è un sito web che funziona come un'app nativa. Quando installi VolleyKit:",
      benefits: {
        homeScreen: "Appare sulla tua schermata home come un'app normale",
        ownWindow: 'Si apre in una propria finestra senza interfaccia browser',
        worksOffline: 'Funziona offline per contenuti visualizzati in precedenza',
        autoUpdates: 'Riceve aggiornamenti automaticamente',
        minimalStorage: 'Usa spazio di archiviazione minimo rispetto alle app native',
      },
      tip: "Le PWA combinano il meglio del web e delle app native – installazione facile, aggiornamenti automatici e capacità offline senza download dall'app store.",
    },
    installing: {
      title: "Installare l'app",
      description: 'Puoi installare VolleyKit su qualsiasi dispositivo moderno – telefoni, tablet o computer.',
      ios: {
        title: 'Su iOS (iPhone/iPad)',
        steps: {
          openSafari: {
            title: 'Apri VolleyKit in Safari',
            description: 'La funzione di installazione funziona solo in Safari su iOS.',
          },
          tapShare: {
            title: 'Tocca il pulsante Condividi',
            description: "Trova l'icona di condivisione in fondo allo schermo.",
          },
          selectAddHome: {
            title: 'Seleziona "Aggiungi a Home"',
            description: 'Scorri nel menu di condivisione per trovare questa opzione.',
          },
          confirmInstall: {
            title: "Conferma l'installazione",
            description: 'Tocca "Aggiungi" per installare VolleyKit sulla tua schermata home.',
          },
        },
      },
      android: {
        title: 'Su Android',
        steps: {
          openChrome: {
            title: 'Apri VolleyKit in Chrome',
            description: "Altri browser come Firefox supportano anche l'installazione PWA.",
          },
          lookForPrompt: {
            title: "Cerca il prompt di installazione",
            description: "Dovrebbe apparire un banner o prompt che chiede di installare l'app.",
          },
          tapInstall: {
            title: 'Tocca "Installa" o "Aggiungi a schermata Home"',
            description: "Conferma per aggiungere l'app al tuo dispositivo.",
          },
        },
      },
      screenshotAlt: "Prompt di installazione PWA che mostra l'opzione Aggiungi a schermata Home",
      screenshotCaption: 'Installare VolleyKit sul tuo dispositivo',
      desktop: {
        title: 'Su Desktop (Chrome/Edge)',
        description: "Cerca l'icona di installazione nella barra degli indirizzi (di solito un + o icona computer), o usa il menu del browser per trovare \"Installa VolleyKit\".",
      },
    },
    whatWorksOffline: {
      title: 'Cosa funziona offline',
      description: 'Quando sei offline, puoi ancora accedere ai contenuti che hai visualizzato in precedenza:',
      table: {
        feature: 'Funzionalità',
        offline: 'Offline',
        notes: 'Note',
        viewAssignments: 'Visualizza designazioni',
        viewAssignmentsNote: 'Designazioni caricate in precedenza',
        viewDetails: 'Visualizza dettagli partita',
        viewDetailsNote: 'Se visualizzati in precedenza',
        travelTimes: 'Tempi di viaggio',
        travelTimesNote: 'Dati di viaggio in cache',
        confirmAssignments: 'Conferma designazioni',
        confirmAssignmentsNote: 'Richiede connessione',
        requestExchanges: 'Richiedi scambi',
        requestExchangesNote: 'Richiede connessione',
        viewCompensations: 'Visualizza compensi',
        viewCompensationsNote: 'Se caricati in precedenza',
      },
      infoBox: "L'app si sincronizza automaticamente quando torni online. Qualsiasi modifica ai dati verrà recuperata e visualizzata.",
    },
    offlineIndicator: {
      title: 'Indicatore offline',
      description: "Quando sei offline, VolleyKit mostra un indicatore visivo per farti sapere che stai visualizzando dati in cache. Cerca il badge offline nell'intestazione o un banner in cima allo schermo.",
      screenshotAlt: "Indicatore offline che mostra che l'app funziona senza internet",
      screenshotCaption: 'Indicatore modalità offline',
    },
    updating: {
      title: "Aggiornare l'app",
      description: 'VolleyKit si aggiorna automaticamente in background. Quando una nuova versione è disponibile:',
      steps: {
        backgroundDownload: "L'app scarica l'aggiornamento in background",
        notificationAppears: "Appare una notifica quando l'aggiornamento è pronto",
        tapReload: 'Tocca "Ricarica" per attivare la nuova versione',
      },
      screenshotAlt: 'Notifica di aggiornamento app che invita a ricaricare',
      screenshotCaption: 'Notifica aggiornamento disponibile',
      tip: "Se ignori la notifica di aggiornamento, la nuova versione si attiverà la prossima volta che chiudi e riapri l'app.",
    },
    storage: {
      title: 'Utilizzo dello spazio',
      description: "VolleyKit usa spazio di archiviazione minimo sul tuo dispositivo – tipicamente meno di 5MB per l'app stessa più i dati in cache. Puoi svuotare la cache dalle impostazioni del browser se necessario.",
      warning: 'Svuotare i dati del browser o "Svuota cache" rimuoverà i tuoi dati offline. Potresti dover ricaricare le designazioni la prossima volta che apri l\'app.',
    },
  },

  settings: {
    heading: "Impostazioni dell'app",
    lead: 'Personalizza VolleyKit secondo le tue preferenze. Configura lingua, posizione di casa e opzioni di privacy.',
    accessing: {
      title: 'Accedere alle impostazioni',
      description: 'Apri le impostazioni toccando l\'icona ingranaggio nella barra di navigazione, o selezionando "Impostazioni" dal menu principale.',
      screenshotAlt: 'Pagina impostazioni che mostra tutte le opzioni disponibili',
      screenshotCaption: 'Pagina impostazioni VolleyKit',
    },
    profile: {
      title: 'Sezione profilo',
      description: 'La sezione profilo mostra le informazioni del tuo account:',
      fields: {
        name: 'Nome – Il tuo nome arbitro registrato',
        licenseNumber: 'Numero licenza – La tua licenza arbitro Swiss Volley',
        email: 'Email – Il tuo indirizzo email registrato',
        sessionStatus: 'Stato sessione – Il tuo stato di login attuale',
      },
      infoBox: 'Le informazioni del profilo provengono da volleymanager e possono essere modificate solo sul sito ufficiale, non in VolleyKit.',
      loggingOut: {
        title: 'Disconnessione',
        description: 'Tocca "Disconnetti" per uscire dal tuo account. Questo cancella la tua sessione e tutti i dati memorizzati localmente.',
      },
    },
    language: {
      title: 'Impostazioni lingua',
      description: 'VolleyKit supporta più lingue secondo la tua preferenza:',
      options: {
        deutsch: 'Deutsch – Tedesco',
        english: 'English – Inglese',
        francais: 'Français – Francese',
        italiano: 'Italiano – Italiano',
      },
      autoDetect: "L'app userà automaticamente la lingua del tuo browser se supportata, ma puoi cambiarla nelle impostazioni.",
      screenshotAlt: 'Selezione lingua che mostra le opzioni disponibili',
      screenshotCaption: "Cambiare la lingua dell'app",
    },
    homeLocation: {
      title: 'Posizione casa',
      description: 'Imposta la tua posizione di casa per abilitare i calcoli dei tempi di viaggio. Questo viene usato per mostrare quanto tempo ci vuole per raggiungere ogni sede di partita.',
      instructions: {
        enterAddress: 'Inserisci il tuo indirizzo o la stazione più vicina',
        useAutocomplete: "Usa i suggerimenti di autocompletamento per l'accuratezza",
        travelTimesAppear: 'I tempi di viaggio appariranno sulle tue schede designazione',
      },
      screenshotAlt: 'Inserimento posizione casa con ricerca indirizzo',
      screenshotCaption: 'Impostare la tua posizione di casa',
      tip: 'Se prendi abitualmente i trasporti pubblici, usa la stazione più vicina come posizione di casa per tempi di viaggio più accurati.',
      seeGuide: 'Vedi la guida Tempo di viaggio per maggiori dettagli su questa funzionalità.',
    },
    dataPrivacy: {
      title: 'Dati & Privacy',
      description: 'Controlla come vengono gestiti i tuoi dati:',
      localStorage: {
        title: 'Archiviazione locale',
        description: "VolleyKit memorizza dati localmente per abilitare l'accesso offline e migliorare le prestazioni:",
        items: {
          assignmentCache: 'Cache designazioni – Le tue designazioni recenti',
          preferences: 'Preferenze – Le tue impostazioni e preferenze',
          travelData: 'Dati viaggio – Informazioni di viaggio in cache',
        },
      },
      clearData: {
        title: 'Cancella dati locali',
        description: 'Puoi cancellare tutti i dati memorizzati localmente dalla pagina impostazioni. Questo:',
        effects: {
          removeCached: 'Rimuoverà designazioni in cache e dati di viaggio',
          resetPreferences: 'Ripristinerà tutte le preferenze ai valori predefiniti',
          requireLogin: 'Richiederà un nuovo login',
        },
        warning: "La cancellazione dei dati locali non può essere annullata. Dovrai ricaricare le tue designazioni la prossima volta che apri l'app.",
      },
      screenshotAlt: 'Sezione impostazioni dati e privacy con pulsante cancella dati',
      screenshotCaption: 'Opzioni dati e privacy',
    },
    about: {
      title: 'Info su VolleyKit',
      description: 'La sezione Info mostra:',
      items: {
        versionNumber: "Numero versione – Versione attuale dell'app",
        lastUpdated: "Ultimo aggiornamento – Quando l'app è stata aggiornata l'ultima volta",
        links: 'Link – Repository GitHub, tracker problemi, sito aiuto',
      },
      infoBox: 'Controlla il numero di versione quando segnali problemi – ci aiuta a identificare e risolvere i problemi più velocemente.',
    },
  },
};
