import type { TranslationKeys } from './types';

export const de: TranslationKeys = {
  nav: {
    home: 'Startseite',
    gettingStarted: 'Erste Schritte',
    assignments: 'Einsätze',
    exchanges: 'Tauschbörse',
    compensations: 'Vergütungen',
    calendarMode: 'Kalendermodus',
    travelTime: 'Reisezeit',
    offlinePwa: 'Offline & PWA',
    settings: 'Einstellungen',
  },

  common: {
    openApp: 'App öffnen',
    learnMore: 'Mehr erfahren',
    readMore: 'Weiterlesen',
    back: 'Zurück',
    next: 'Weiter',
    previous: 'Zurück',
    close: 'Schliessen',
    menu: 'Menü',
    search: 'Suchen',
    viewOnGithub: 'Auf GitHub ansehen',
  },

  home: {
    title: 'VolleyKit Hilfe',
    subtitle: 'Ihr Leitfaden zur VolleyKit App',
    description:
      'Erfahren Sie, wie Sie VolleyKit nutzen können, um Ihre Volleyball-Schiedsrichtereinsätze, Tauschbörse und Vergütungen zu verwalten.',
    ctaOpenApp: 'App öffnen',
    ctaGetStarted: 'Jetzt starten',
    featuresTitle: 'Dokumentation erkunden',
    readyToStart: 'Bereit loszulegen?',
    features: {
      gettingStarted: {
        title: 'Erste Schritte',
        description:
          'Schnellstartanleitung zur Einrichtung und Nutzung von VolleyKit.',
      },
      assignments: {
        title: 'Einsätze',
        description:
          'Sehen und verwalten Sie Ihre anstehenden Volleyball-Schiedsrichterspiele.',
      },
      exchanges: {
        title: 'Tauschbörse',
        description:
          'Fordern Sie Spieltausche an und bieten Sie Ihre Einsätze anderen Schiedsrichtern an.',
      },
      compensations: {
        title: 'Vergütungen',
        description:
          'Verfolgen Sie Ihre Schiedsrichtervergütungen und deren Verlauf.',
      },
      calendarMode: {
        title: 'Kalendermodus',
        description:
          'Nur-Lese-Zugriff auf Einsätze ohne Anmeldung.',
      },
      travelTime: {
        title: 'Reisezeit',
        description:
          'Reisezeiten mit Schweizer ÖV-Integration berechnen.',
      },
      offlinePwa: {
        title: 'Offline & PWA',
        description:
          'App installieren und offline auf Ihrem Gerät nutzen.',
      },
      settings: {
        title: 'Einstellungen',
        description:
          'Sprache, Design und Benachrichtigungen anpassen.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Erste Schritte',
      description:
        'Erfahren Sie, wie Sie VolleyKit einrichten und für Ihre Schiedsrichtereinsätze nutzen können.',
    },
    assignments: {
      title: 'Einsätze',
      description:
        'Erfahren Sie, wie Sie Ihre Volleyball-Schiedsrichtereinsätze in VolleyKit anzeigen und verwalten können.',
    },
    exchanges: {
      title: 'Tauschbörse',
      description:
        'Erfahren Sie, wie Sie Einsatztausche mit anderen Schiedsrichtern anfordern und verwalten können.',
    },
    compensations: {
      title: 'Vergütungen',
      description:
        'Erfahren Sie, wie Sie Ihre Schiedsrichtervergütungen verfolgen und verstehen können.',
    },
    calendarMode: {
      title: 'Kalendermodus',
      description:
        'Erfahren Sie mehr über den Kalendermodus für den Nur-Lese-Zugriff auf Schiedsrichtereinsätze.',
    },
    travelTime: {
      title: 'Reisezeit',
      description:
        'Erfahren Sie, wie VolleyKit Reisezeiten zu Spielorten mit dem öffentlichen Verkehr in der Schweiz berechnet.',
    },
    offlinePwa: {
      title: 'Offline & PWA',
      description:
        'Erfahren Sie, wie Sie VolleyKit offline nutzen und als Progressive Web App installieren können.',
    },
    settings: {
      title: 'Einstellungen',
      description:
        'Erfahren Sie, wie Sie VolleyKit-Einstellungen und -Präferenzen anpassen können.',
    },
  },

  search: {
    placeholder: 'Dokumentation durchsuchen...',
    placeholderShort: 'Suchen...',
    noResults: 'Keine Ergebnisse gefunden',
    tryDifferent: 'Versuchen Sie andere Suchbegriffe',
    initialHint: 'Tippen Sie, um zu suchen',
    initialSubhint: 'Durchsuchen Sie alle Dokumentationsseiten',
    searching: 'Suche läuft...',
    unavailable: 'Suche nicht verfügbar',
    unavailableHint:
      'Führen Sie einen Produktions-Build aus, um die Suche zu aktivieren',
    resultsCount: '{count} Ergebnisse',
    navigateHint: 'zum Navigieren',
    selectHint: 'zum Auswählen',
    poweredBy: 'Unterstützt von Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Erstellt mit Astro',
    forReferees: 'Für Schweizer Volleyball-Schiedsrichter',
    copyright: '© {year} VolleyKit',
    mainApp: 'Haupt-App',
    documentation: 'Dokumentation',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Navigationsmenü öffnen',
    closeMenu: 'Menü schliessen',
    openSearch: 'Dokumentation durchsuchen',
    closeSearch: 'Suche schliessen',
    skipToContent: 'Zum Inhalt springen',
    breadcrumb: 'Brotkrümel-Navigation',
    mainNavigation: 'Hauptnavigation',
    mobileNavigation: 'Mobile Navigation',
    externalLink: 'Öffnet in neuem Tab',
  },

  screenshot: {
    placeholder: 'Screenshot-Platzhalter',
    captureInstructions: 'Aufnahmeanweisungen',
  },

  infoBox: {
    info: 'Info',
    tip: 'Tipp',
    warning: 'Warnung',
  },

  gettingStarted: {
    heading: 'Erste Schritte mit VolleyKit',
    lead: 'VolleyKit ist eine progressive Web-Anwendung, die eine verbesserte Oberfläche zur Verwaltung Ihrer Volleyball-Schiedsrichtereinsätze über das volleymanager-System des Schweizerischen Volleyball-Verbandes bietet.',
    whatIs: {
      title: 'Was ist VolleyKit?',
      description: 'VolleyKit verbindet sich mit der offiziellen volleymanager.volleyball.ch-Plattform und bietet Schiedsrichtern eine moderne, mobilfreundliche Oberfläche für:',
      features: {
        viewAssignments: 'Anstehende Spieleinsätze anzeigen',
        manageExchanges: 'Spieltausche mit anderen Schiedsrichtern anfordern und verwalten',
        trackCompensations: 'Vergütungszahlungen verfolgen',
        offlineAccess: 'Offline auf Einsätze zugreifen',
        travelTime: 'Reisezeiten mit dem Schweizer ÖV berechnen',
      },
      infoBox: 'VolleyKit ist eine inoffizielle App, die zur Verbesserung der Schiedsrichtererfahrung erstellt wurde. Alle Daten stammen aus dem offiziellen volleymanager-System.',
    },
    howToLogin: {
      title: 'So melden Sie sich an',
      description: 'VolleyKit bietet zwei Möglichkeiten, auf Ihre Einsätze zuzugreifen:',
      calendarMode: {
        title: 'Option 1: Kalendermodus (Empfohlen)',
        description: 'Für einen schnellen Zugriff auf Ihren Spielplan ohne Passwort können Sie den Kalendermodus mit Ihrer eindeutigen Kalender-URL oder Ihrem Code aus volleymanager nutzen.',
        steps: {
          findUrl: {
            title: 'Kalender-URL finden',
            description: 'Gehen Sie in volleymanager zu "Meine Einsätze" und kopieren Sie Ihre Kalender-Abonnement-URL.',
          },
          selectMode: {
            title: 'Kalendermodus auswählen',
            description: 'Tippen Sie auf der VolleyKit-Anmeldeseite auf den Tab "Kalendermodus".',
          },
          pasteUrl: {
            title: 'URL oder Code einfügen',
            description: 'Geben Sie Ihre Kalender-URL oder nur den Code-Teil ein, um auf Ihren Spielplan zuzugreifen.',
          },
        },
        infoBox: 'Der Kalendermodus bietet nur Lesezugriff – Sie können Einsätze anzeigen, aber keine Spiele bestätigen, Tausche anfordern oder auf Vergütungen zugreifen. Weitere Details finden Sie im Kalendermodus-Leitfaden.',
      },
      fullLogin: {
        title: 'Option 2: Vollständige Anmeldung',
        description: 'Verwenden Sie Ihre volleymanager.volleyball.ch-Anmeldedaten für vollen Zugriff auf alle Funktionen.',
        steps: {
          openApp: {
            title: 'VolleyKit öffnen',
            description: 'Navigieren Sie zur VolleyKit-App in Ihrem Browser oder öffnen Sie die installierte App.',
          },
          enterCredentials: {
            title: 'Anmeldedaten eingeben',
            description: 'Verwenden Sie Ihren volleymanager-Benutzernamen und Ihr Passwort zur Anmeldung.',
          },
          stayLoggedIn: {
            title: 'Angemeldet bleiben',
            description: 'Aktivieren Sie "Angemeldet bleiben", um zwischen Sitzungen angemeldet zu bleiben.',
          },
        },
        screenshotAlt: 'VolleyKit-Anmeldeseite mit Benutzernamen- und Passwortfeldern',
        screenshotCaption: 'Die VolleyKit-Anmeldeseite',
        tipTitle: 'Passwort vergessen?',
        tipContent: 'VolleyKit verwendet dieselben Anmeldedaten wie volleymanager.volleyball.ch. Nutzen Sie die Passwort-Zurücksetzen-Funktion auf der offiziellen Seite, wenn Sie Ihr Passwort vergessen haben.',
      },
    },
    quickTour: {
      title: 'Schnellübersicht',
      description: 'Nach der Anmeldung sehen Sie das Haupt-Dashboard mit Ihren anstehenden Einsätzen. Hier ist ein kurzer Überblick über die Hauptbereiche:',
      assignments: {
        title: 'Einsätze',
        description: 'Alle Ihre anstehenden Schiedsrichterspiele anzeigen. Jeder Einsatz zeigt Datum, Uhrzeit, Teams, Spielort und Ihre Rolle (1. Schiedsrichter, 2. Schiedsrichter oder Linienrichter).',
      },
      exchanges: {
        title: 'Tauschbörse',
        description: 'Verfügbare Spieltausche von anderen Schiedsrichtern durchsuchen oder einen Tausch für einen Ihrer eigenen Einsätze anfordern.',
      },
      compensations: {
        title: 'Vergütungen',
        description: 'Ihre Schiedsrichterzahlungen und Vergütungshistorie verfolgen. Nach Datum filtern und Daten exportieren.',
      },
      settings: {
        title: 'Einstellungen',
        description: 'Passen Sie Ihre Erfahrung an, einschliesslich Sprache, Heimatstandort für Reisezeitberechnungen und Benachrichtigungseinstellungen.',
      },
    },
    nextSteps: {
      title: 'Nächste Schritte',
      description: 'Nachdem Sie nun mit den Grundlagen vertraut sind, erkunden Sie die detaillierten Anleitungen für jede Funktion:',
      links: {
        assignments: 'Ihre Einsätze verwalten',
        exchanges: 'Tausche anfordern und annehmen',
        compensations: 'Ihre Vergütungen verfolgen',
      },
    },
  },

  assignments: {
    heading: 'Ihre Einsätze verwalten',
    lead: 'Der Einsätze-Bereich ist Ihre zentrale Anlaufstelle für alle anstehenden Volleyball-Schiedsrichterspiele und die Verwaltung Ihres Spielplans.',
    whatAre: {
      title: 'Was sind Einsätze?',
      description: 'Einsätze sind die Spiele, für die Sie als Schiedsrichter eingeteilt wurden. Jeder Einsatz enthält:',
      details: {
        dateTime: 'Datum und Uhrzeit – Wann das Spiel stattfindet',
        teams: 'Teams – Heim- und Gastmannschaftsnamen',
        venue: 'Spielort – Ort des Spiels mit Adresse',
        role: 'Ihre Rolle – 1. Schiedsrichter, 2. Schiedsrichter oder Linienrichter',
        league: 'Liga – Die Wettbewerbsstufe (z.B. NLA, NLB, 1. Liga)',
      },
    },
    viewing: {
      title: 'Ihre Einsätze anzeigen',
      description: 'Die Einsatzliste zeigt alle Ihre anstehenden Spiele in chronologischer Reihenfolge. Spiele sind nach Datum gruppiert, damit Sie leicht sehen können, was ansteht.',
      screenshotAlt: 'Einsatzliste mit mehreren anstehenden Spielen, nach Datum gruppiert',
      screenshotCaption: 'Die Einsatzlistenansicht mit anstehenden Spielen',
    },
    details: {
      title: 'Einsatzdetails',
      description: 'Tippen Sie auf einen Einsatz, um alle Details zu sehen. Die Detailansicht enthält:',
      items: {
        gameInfo: 'Vollständige Spielinformationen',
        venueAddress: 'Spielortadresse mit Kartenlink',
        travelTime: 'Reisezeit von Ihrem Heimatstandort',
        otherReferees: 'Andere Schiedsrichter, die demselben Spiel zugewiesen sind',
        swipeActions: 'Verfügbare Aktionen über Wischgesten',
      },
      screenshotAlt: 'Einsatzdetailansicht mit allen Spielinformationen',
      screenshotCaption: 'Detaillierte Ansicht eines einzelnen Einsatzes',
    },
    actions: {
      title: 'Aktionen durchführen',
      description: 'VolleyKit verwendet Wischgesten für schnellen Zugriff auf Aktionen bei Ihren Einsatzkarten. Je nach Spielstatus stehen Ihnen verschiedene Aktionen zur Verfügung.',
      swipeRight: {
        title: 'Nach rechts wischen – Zur Tauschbörse hinzufügen',
        description: 'Wischen Sie eine Einsatzkarte nach rechts, um die Tauschaktion anzuzeigen. Wenn Sie ein Spiel nicht wahrnehmen können, können Sie es zur Tauschbörse für andere Schiedsrichter hinzufügen.',
        screenshotAlt: 'Einsatzkarte nach rechts gewischt mit Tauschaktion',
        screenshotCaption: 'Nach rechts wischen, um einen Einsatz zur Tauschbörse hinzuzufügen',
        warning: 'Fordern Sie einen Tausch rechtzeitig an. Last-Minute-Anfragen finden möglicherweise keinen Ersatz rechtzeitig.',
      },
      swipeLeft: {
        title: 'Nach links wischen – Validieren & Bearbeiten',
        description: 'Wischen Sie eine Einsatzkarte nach links, um zusätzliche Aktionen anzuzeigen:',
        validate: 'Validieren – Spielergebnisse einreichen und das Spiel validieren (für Erstschiedsrichter nach dem Spiel verfügbar)',
        edit: 'Bearbeiten – Ihre Vergütungsdetails für diesen Einsatz bearbeiten',
        screenshotAlt: 'Einsatzkarte nach links gewischt mit Validieren- und Bearbeiten-Aktionen',
        screenshotCaption: 'Nach links wischen, um Validieren- und Bearbeiten-Aktionen anzuzeigen',
        tip: 'Sie können auch einen vollständigen Wisch durchführen, um die primäre Aktion sofort auszulösen, ohne auf die Schaltfläche zu tippen.',
      },
      directions: {
        title: 'Wegbeschreibung abrufen',
        description: 'Tippen Sie auf eine Einsatzkarte, um sie zu erweitern, und verwenden Sie dann die Wegbeschreibungsschaltfläche, um Ihre bevorzugte Kartenanwendung mit der Route zum Spielort zu öffnen.',
      },
    },
    upcomingPast: {
      title: 'Anstehende und vergangene Spiele',
      description: 'Verwenden Sie die Tabs oben, um zwischen folgenden Ansichten zu wechseln:',
      upcoming: 'Anstehend – Spiele, die noch nicht stattgefunden haben',
      validationClosed: 'Validierung abgeschlossen – Vergangene Spiele, deren Validierung abgeschlossen ist',
      tip: 'Legen Sie Ihren Heimatstandort in den Einstellungen fest, um Reisezeitschätzungen auf jeder Einsatzkarte zu sehen.',
    },
  },

  exchanges: {
    heading: 'Spieltausche',
    lead: 'Das Tauschsystem ermöglicht es Schiedsrichtern, Spiele zu tauschen, wenn sie ihre geplanten Einsätze nicht wahrnehmen können. Sie können Tausche für Ihre Spiele anfordern oder Spiele von anderen Schiedsrichtern übernehmen.',
    whatAre: {
      title: 'Was sind Tausche?',
      description: 'Ein Tausch ist eine Anfrage von einem Schiedsrichter, der sein geplantes Spiel nicht wahrnehmen kann und einen Ersatz sucht. Das volleymanager-System pflegt eine Tauschbörse, wo Schiedsrichter:',
      features: {
        postGames: 'Ihre Spiele zum Tausch anbieten können',
        browseGames: 'Verfügbare Spiele von anderen Schiedsrichtern durchsuchen können',
        acceptGames: 'Spiele annehmen können, die in ihren Zeitplan passen',
      },
      infoBox: 'Tausche werden über das offizielle volleymanager-System verwaltet. VolleyKit bietet eine benutzerfreundlichere Oberfläche für dieselbe Tauschbörse.',
    },
    requesting: {
      title: 'Einen Tausch anfordern',
      description: 'Wenn Sie eines Ihrer geplanten Spiele nicht wahrnehmen können, können Sie einen Tausch anfordern, um einen Ersatzschiedsrichter zu finden.',
      steps: {
        findAssignment: {
          title: 'Den Einsatz finden',
          description: 'Gehen Sie zu Ihrem Einsätze-Tab und suchen Sie das Spiel, das Sie tauschen möchten.',
        },
        swipeRight: {
          title: 'Nach rechts auf die Karte wischen',
          description: 'Wischen Sie die Einsatzkarte nach rechts, um die Tauschaktion anzuzeigen, und tippen Sie darauf. Das Spiel wird in der Tauschbörse veröffentlicht.',
        },
      },
      screenshotAlt: 'Einsatzkarte mit angezeigter Tausch-Wischaktion',
      screenshotCaption: 'Einen Tausch für ein Spiel anfordern',
      warningTitle: 'Frühzeitig anfragen',
      warningContent: 'Je früher Sie einen Tausch anfordern, desto wahrscheinlicher finden Sie einen Ersatz. Last-Minute-Anfragen bleiben oft unbesetzt.',
    },
    viewing: {
      title: 'Verfügbare Tausche anzeigen',
      description: 'Der Tauschbörse-Tab zeigt alle derzeit zum Tausch verfügbaren Spiele. Dies sind Spiele, die andere Schiedsrichter angeboten haben und für die sie Ersatz suchen.',
      screenshotAlt: 'Liste der verfügbaren Tauschspiele von anderen Schiedsrichtern',
      screenshotCaption: 'Verfügbare Spiele in der Tauschbörse',
      filtering: {
        title: 'Tausche filtern',
        description: 'Filtern Sie die Tauschliste, um Spiele zu finden, die für Sie passen. Filter werden verfügbar, nachdem Sie die erforderlichen Einstellungen konfiguriert haben:',
        distance: 'Entfernung – Nach maximaler Entfernung von Ihrem Heimatstandort filtern. Erfordert das Festlegen Ihres Heimatstandorts in den Einstellungen.',
        travelTime: 'Reisezeit – Nach maximaler Reisezeit mit öffentlichen Verkehrsmitteln filtern. Erfordert sowohl einen Heimatstandort als auch die Aktivierung der ÖV-API in den Einstellungen.',
        usage: 'Sobald Filter verfügbar sind, erscheinen sie als Umschalt-Chips neben dem Einstellungszahnrad-Symbol. Tippen Sie auf das Zahnrad, um die Maximalwerte für jeden Filter zu konfigurieren.',
        tip: 'Legen Sie Ihren Heimatstandort in den Einstellungen fest, um die Entfernungsfilterung freizuschalten. Aktivieren Sie die ÖV-API, um auch nach Reisezeit zu filtern.',
      },
    },
    accepting: {
      title: 'Einen Tausch annehmen',
      description: 'Wenn Sie ein Spiel finden, das Sie übernehmen möchten, können Sie den Tausch annehmen:',
      steps: {
        review: {
          title: 'Spieldetails prüfen',
          description: 'Überprüfen Sie Datum, Uhrzeit, Spielort und Reiseanforderungen.',
        },
        swipeLeft: {
          title: 'Nach links auf die Karte wischen',
          description: 'Wischen Sie die Tauschkarte nach links, um die Übernahmeaktion anzuzeigen, und tippen Sie darauf.',
        },
        confirm: {
          title: 'Ihre Annahme bestätigen',
          description: 'Überprüfen Sie die Details und bestätigen Sie Ihre Annahme.',
        },
        gameAdded: {
          title: 'Spiel zu Ihrem Spielplan hinzugefügt',
          description: 'Das Spiel erscheint nun in Ihren Einsätzen.',
        },
      },
      tip: 'Stellen Sie sicher, dass Sie das Spiel tatsächlich wahrnehmen können, bevor Sie annehmen. Nach der Annahme wird der ursprüngliche Schiedsrichter vom Einsatz entbunden.',
    },
    managing: {
      title: 'Ihre Tauschanfragen verwalten',
      description: 'Sie können Ihre aktiven Tauschanfragen über den Tauschbörse-Tab anzeigen und verwalten. Wenn Sie keinen Tausch mehr benötigen (z.B. Ihr Zeitplan hat sich geändert), können Sie die Anfrage stornieren, bevor jemand sie annimmt.',
      canceling: {
        title: 'Eine Anfrage stornieren',
        description: 'Um eine von Ihnen gestellte Tauschanfrage zu stornieren:',
        steps: {
          goToExchanges: 'Gehen Sie zum Tauschbörse-Tab',
          selectAddedByMe: 'Wählen Sie den Tab "Von mir hinzugefügt", um Ihre ausstehenden Anfragen zu sehen',
          swipeRight: 'Wischen Sie nach rechts auf die Anfragekarte, um die Entfernen-Aktion anzuzeigen, und tippen Sie darauf',
          confirmCancellation: 'Bestätigen Sie die Stornierung',
        },
        infoBox: 'Sie können eine Tauschanfrage nur stornieren, wenn sie noch niemand angenommen hat. Nach der Annahme ist der Tausch endgültig.',
      },
    },
  },

  compensations: {
    heading: 'Ihre Vergütungen verfolgen',
    lead: 'Der Vergütungsbereich hilft Ihnen, Ihre Schiedsrichtereinnahmen und Zahlungshistorie zu verfolgen. Vergangene Zahlungen anzeigen, nach Datum filtern und Daten für Ihre Unterlagen exportieren.',
    whatAre: {
      title: 'Was sind Vergütungen?',
      description: 'Vergütungen sind die Zahlungen, die Sie für das Leiten von Volleyballspielen erhalten. Jeder Vergütungseintrag enthält typischerweise:',
      details: {
        gameDetails: 'Spieldetails – Das Spiel, das Sie geleitet haben',
        date: 'Datum – Wann das Spiel stattfand',
        amount: 'Betrag – Der Vergütungsbetrag in CHF',
        paymentStatus: 'Zahlungsstatus – Ausstehend, bezahlt oder verarbeitet',
        role: 'Rolle – Ihre Funktion im Spiel',
      },
      infoBox: 'Vergütungsbeträge werden von Swiss Volley festgelegt und variieren je nach Ligastufe und Ihrer Rolle im Spiel.',
    },
    viewing: {
      title: 'Ihre Vergütungen anzeigen',
      description: 'Die Vergütungsliste zeigt alle Ihre erfassten Zahlungen in chronologischer Reihenfolge. Jeder Eintrag zeigt die wichtigsten Informationen auf einen Blick.',
      screenshotAlt: 'Vergütungsliste mit Zahlungshistorie mit Beträgen und Daten',
      screenshotCaption: 'Ihre Vergütungshistorie',
      paymentStatus: {
        title: 'Zahlungsstatus verstehen',
        pending: 'Ausstehend – Spiel abgeschlossen, Zahlung noch nicht verarbeitet',
        processing: 'In Bearbeitung – Zahlung wird verarbeitet',
        paid: 'Bezahlt – Zahlung wurde auf Ihr Konto überwiesen',
      },
    },
    filtering: {
      title: 'Nach Status filtern',
      description: 'Verwenden Sie die Tabs oben, um Vergütungen nach Status zu filtern:',
      tabs: {
        pendingPast: 'Ausstehend (Vergangenheit) – Vergangene Spiele, die auf Zahlung warten',
        pendingFuture: 'Ausstehend (Zukunft) – Kommende Spiele, die noch nicht gespielt wurden',
        closed: 'Abgeschlossen – Abgeschlossene und bezahlte Vergütungen',
      },
      screenshotAlt: 'Vergütungs-Tabs mit Ausstehend- und Abgeschlossen-Optionen',
      screenshotCaption: 'Vergütungen nach Status filtern',
      tip: 'Vergütungen werden automatisch auf die aktuelle Saison (September bis Mai) gefiltert, damit Sie sich auf aktuelle Spiele konzentrieren können.',
    },
    exportPdf: {
      title: 'Als PDF exportieren',
      description: 'Sie können einzelne Vergütungsdatensätze als PDF-Dokumente exportieren. Wischen Sie nach links auf einer Vergütungskarte, um die PDF-Export-Aktion anzuzeigen.',
      usage: 'Das exportierte PDF enthält die Spieldetails und Vergütungsinformationen in einem formatierten Dokument. Dies ist nützlich für Teams, die den Schiedsrichter direkt bezahlen müssen.',
      infoBox: 'Der PDF-Export erstellt ein offiziell aussehendes Dokument mit allen Spiel- und Vergütungsdetails, die Teams für ihre Unterlagen benötigen könnten.',
    },
    paymentSchedule: {
      title: 'Zahlungsplan',
      description: 'Vergütungszahlungen werden typischerweise monatlich von Swiss Volley verarbeitet. Der genaue Zahlungsplan kann variieren, aber generell:',
      details: {
        processing: 'Spiele des Vormonats werden zu Beginn jedes Monats verarbeitet',
        bankTransfer: 'Zahlungen erfolgen per Banküberweisung auf Ihr registriertes Konto',
        timing: 'Die Verarbeitung kann 2-4 Wochen nach Monatsende dauern',
      },
      warning: 'Stellen Sie sicher, dass Ihre Bankdaten im volleymanager-System aktuell sind, um Zahlungsverzögerungen zu vermeiden.',
    },
  },

  calendarMode: {
    heading: 'Kalendermodus',
    lead: 'Der Kalendermodus bietet Lesezugriff auf Schiedsrichtereinsätze ohne vollständige Anmeldung. Perfekt für schnelle Spielplanprüfungen oder zum Teilen mit Familienmitgliedern.',
    whatIs: {
      title: 'Was ist der Kalendermodus?',
      description: 'Der Kalendermodus ist eine leichtgewichtige Nur-Lese-Zugriffsmethode, mit der Sie Ihre anstehenden Einsätze sehen können, ohne Ihr Passwort einzugeben. Er verwendet einen eindeutigen Kalendercode, der mit Ihrem Schiedsrichterkonto verknüpft ist.',
      features: {
        viewAssignments: 'Ihre anstehenden Spieleinsätze anzeigen',
        seeDetails: 'Spieldetails einschliesslich Datum, Uhrzeit, Teams und Spielort sehen',
        noPassword: 'Kein Passwort erforderlich – nur Ihr Kalendercode',
        safeToShare: 'Sicher zum Teilen mit Familie oder Hinzufügen zu gemeinsamen Kalendern',
      },
    },
    whoIsFor: {
      title: 'Für wen ist der Kalendermodus?',
      description: 'Der Kalendermodus ist ideal für:',
      useCases: {
        quickChecks: 'Schnelle Spielplanprüfungen – Ihre Spiele ohne Anmeldung anzeigen',
        familyMembers: 'Familienmitglieder – Ihren Spielplan mit Partnern oder Familie teilen',
        calendarIntegration: 'Kalenderintegration – Spiele zu externen Kalender-Apps hinzufügen',
        publicDevices: 'Öffentliche Geräte – Ihren Spielplan auf gemeinsamen Computern prüfen',
      },
      tip: 'Der Kalendermodus ist perfekt, um Ihrer Familie mitzuteilen, wann Sie Spiele haben, ohne ihnen Zugriff auf Ihr vollständiges Konto zu geben.',
    },
    howToAccess: {
      title: 'So greifen Sie auf den Kalendermodus zu',
      description: 'Um den Kalendermodus zu nutzen, benötigen Sie Ihren eindeutigen Kalendercode aus dem volleymanager-System.',
      steps: {
        findCode: {
          title: 'Ihren Kalendercode finden',
          description: 'Melden Sie sich bei volleymanager.volleyball.ch an und finden Sie Ihren Kalendercode in Ihren Profileinstellungen.',
        },
        openApp: {
          title: 'VolleyKit öffnen',
          description: 'Navigieren Sie zur VolleyKit-App.',
        },
        selectMode: {
          title: '"Kalendermodus" auswählen',
          description: 'Tippen Sie auf der Anmeldeseite auf die Option "Kalendermodus".',
        },
        enterCode: {
          title: 'Ihren Code eingeben',
          description: 'Geben Sie Ihren Kalendercode ein, um auf Ihren Nur-Lese-Spielplan zuzugreifen.',
        },
      },
      screenshotAlt: 'Kalendermodus-Eingabebildschirm mit Code-Eingabefeld',
      screenshotCaption: 'Kalendermodus mit Ihrem Code aufrufen',
    },
    viewingSchedule: {
      title: 'Ihren Spielplan anzeigen',
      description: 'Im Kalendermodus sehen Sie Ihre anstehenden Einsätze in einer vereinfachten Ansicht. Die Oberfläche zeigt die wesentlichen Informationen für jedes Spiel.',
      screenshotAlt: 'Kalendermodus mit anstehenden Einsätzen in Nur-Lese-Ansicht',
      screenshotCaption: 'Kalendermodus-Einsatzansicht',
    },
    limitations: {
      title: 'Einschränkungen vs. vollständige Anmeldung',
      description: 'Der Kalendermodus ist schreibgeschützt, was bedeutet, dass einige Funktionen nicht verfügbar sind:',
      table: {
        feature: 'Funktion',
        fullLogin: 'Vollständige Anmeldung',
        calendarMode: 'Kalendermodus',
        viewAssignments: 'Einsätze anzeigen',
        viewDetails: 'Spieldetails anzeigen',
        travelTime: 'Reisezeitinfo',
        confirmAssignments: 'Einsätze bestätigen',
        requestExchanges: 'Tausche anfordern',
        viewCompensations: 'Vergütungen anzeigen',
        acceptExchanges: 'Tausche annehmen',
      },
      infoBox: 'Für Aktionen wie das Bestätigen von Einsätzen oder das Anfordern von Tauschen müssen Sie sich mit Ihren vollständigen Anmeldedaten anmelden.',
    },
    security: {
      title: 'Ihren Code sicher aufbewahren',
      description: 'Obwohl der Kalendermodus schreibgeschützt ist, sollten Sie Ihren Kalendercode mit Vorsicht behandeln:',
      tips: {
        shareWithTrust: 'Nur mit vertrauenswürdigen Personen teilen',
        dontPostPublicly: 'Ihren Code nicht öffentlich online veröffentlichen',
        ifCompromised: 'Bei Verdacht auf Kompromittierung Ihres Codes Swiss Volley kontaktieren',
      },
      warning: 'Ihr Kalendercode offenbart Ihren vollständigen Spielplan. Teilen Sie ihn nur mit Personen, denen Sie Ihren Aufenthaltsort anvertrauen möchten.',
    },
  },

  travelTime: {
    heading: 'Reisezeit-Funktion',
    lead: 'VolleyKit integriert Schweizer ÖV-Daten, um Ihnen zu zeigen, wie lange Sie brauchen, um jeden Spielort zu erreichen. Planen Sie Ihre Reisen besser und kommen Sie nie zu spät zu einem Spiel.',
    howItWorks: {
      title: 'So funktioniert es',
      description: 'Die Reisezeit-Funktion verwendet die Schweizer ÖV-API (SBB/öV), um Reisezeiten von Ihrem Heimatstandort zu jedem Spielort zu berechnen. Sie berücksichtigt:',
      considerations: {
        schedules: 'Echtzeit-Zug-, Bus- und Tram-Fahrpläne',
        walkingTime: 'Gehzeit zu/von Stationen',
        transferTimes: 'Umsteigezeiten zwischen Verbindungen',
        gameStartTime: 'Die tatsächliche Spielstartzeit',
      },
      infoBox: 'Reisezeiten werden mit öffentlichen Verkehrsmitteln berechnet. Wenn Sie normalerweise fahren, nutzen Sie die Zeiten als grobe Schätzung oder zur Planung alternativer Transportmöglichkeiten.',
    },
    settingHome: {
      title: 'Ihren Heimatstandort festlegen',
      description: 'Um genaue Reisezeiten zu erhalten, müssen Sie Ihren Heimatstandort in den App-Einstellungen festlegen.',
      steps: {
        openSettings: {
          title: 'Einstellungen öffnen',
          description: 'Navigieren Sie zur Einstellungsseite in VolleyKit.',
        },
        findHomeLocation: {
          title: '"Heimatstandort" finden',
          description: 'Scrollen Sie zum Reiseeinstellungen-Bereich.',
        },
        enterAddress: {
          title: 'Ihre Adresse eingeben',
          description: 'Geben Sie Ihre Heimadresse oder die Station ein, von der Sie normalerweise reisen.',
        },
        saveSettings: {
          title: 'Ihre Einstellungen speichern',
          description: 'Bestätigen Sie Ihren Standort, um Reisezeiten zu sehen.',
        },
      },
      screenshotAlt: 'Einstellungsseite mit Heimatstandort-Eingabefeld',
      screenshotCaption: 'Ihren Heimatstandort festlegen',
      tip: 'Verwenden Sie Ihren nächsten Bahnhof als Heimatstandort, wenn Sie normalerweise zu Fuss oder mit dem Fahrrad zum Bahnhof kommen – dies gibt genauere ÖV-Zeiten.',
    },
    viewingTimes: {
      title: 'Reisezeiten anzeigen',
      description: 'Sobald Ihr Heimatstandort festgelegt ist, erscheinen Reisezeiten auf Ihren Einsatzkarten und in der Einsatzdetailansicht.',
      screenshotAlt: 'Einsatzkarte mit Reisezeitinformationen',
      screenshotCaption: 'Reisezeit auf einem Einsatz angezeigt',
      whatsShown: {
        title: 'Was angezeigt wird',
        duration: 'Dauer – Gesamtreisezeit von zu Hause zum Spielort',
        departureTime: 'Abfahrtszeit – Wann Sie losfahren sollten, um pünktlich anzukommen',
        transportType: 'Transportart – Zug-, Bus- oder gemischtes Transportsymbol',
      },
    },
    journeyDetails: {
      title: 'Reisedetails',
      description: 'Tippen Sie auf die Reisezeit, um vollständige Reisedetails zu sehen:',
      features: {
        stepByStep: 'Schritt-für-Schritt-Anleitung',
        connectionDetails: 'Verbindungsdetails (Zugnummern, Gleise)',
        walkingSegments: 'Fusswegabschnitte',
        transferTimes: 'Umsteigezeiten',
      },
      sbbLink: 'Sie können die Reise auch direkt in der SBB-App oder Website öffnen für Echtzeit-Updates und Ticketkauf.',
      screenshotAlt: 'Detaillierte Reiseinformationen mit Verbindungen und Zeiten',
      screenshotCaption: 'Vollständige Reisedetails für die Reiseplanung',
    },
    arrivalBuffer: {
      title: 'Ankunftspuffer',
      description: 'Die vorgeschlagene Abfahrtszeit enthält einen Puffer, um sicherzustellen, dass Sie vor Spielbeginn ankommen:',
      details: {
        standardBuffer: 'Standardpuffer: 15-30 Minuten vor Spielbeginn',
        timeFor: 'Zeit zum Finden des Spielorts, Umziehen und Aufwärmen',
        accountForDelays: 'Berücksichtigung möglicher kleiner Verspätungen',
      },
      warning: 'Planen Sie immer zusätzliche Zeit für wichtige Spiele oder unbekannte Spielorte ein. Öffentliche Verkehrsmittel können unerwartete Verspätungen haben.',
    },
    offlineAvailability: {
      title: 'Offline-Verfügbarkeit',
      description: 'Reisezeiten werden zwischengespeichert, wenn Sie sie online anzeigen. Wenn Sie offline sind:',
      details: {
        cachedAvailable: 'Zuvor angesehene Reisezeiten bleiben verfügbar',
        requiresConnection: 'Neue Berechnungen erfordern eine Internetverbindung',
        outdatedIndicator: 'Die App zeigt an, wenn Daten möglicherweise veraltet sind',
      },
      tip: 'Prüfen Sie Ihre Reisezeiten online, bevor Sie in ein Gebiet mit schlechter Verbindung gehen. Die zwischengespeicherten Daten sind offline verfügbar.',
    },
  },

  offlinePwa: {
    heading: 'Offline & PWA-Funktionen',
    lead: 'VolleyKit ist eine Progressive Web App (PWA), die Sie auf Ihrem Gerät installieren und offline nutzen können. Greifen Sie auf Ihre Einsätze zu, auch ohne Internetverbindung.',
    whatIsPwa: {
      title: 'Was ist eine PWA?',
      description: 'Eine Progressive Web App ist eine Website, die wie eine native App funktioniert. Wenn Sie VolleyKit installieren:',
      benefits: {
        homeScreen: 'Erscheint auf Ihrem Startbildschirm wie eine reguläre App',
        ownWindow: 'Öffnet sich in einem eigenen Fenster ohne Browser-Oberfläche',
        worksOffline: 'Funktioniert offline für zuvor angesehene Inhalte',
        autoUpdates: 'Erhält automatisch Updates',
        minimalStorage: 'Verwendet minimalen Speicher im Vergleich zu nativen Apps',
      },
      tip: 'PWAs kombinieren das Beste aus Web- und nativen Apps – einfache Installation, automatische Updates und Offline-Fähigkeit ohne App-Store-Downloads.',
    },
    installing: {
      title: 'Die App installieren',
      description: 'Sie können VolleyKit auf jedem modernen Gerät installieren – Handys, Tablets oder Computer.',
      ios: {
        title: 'Auf iOS (iPhone/iPad)',
        steps: {
          openSafari: {
            title: 'VolleyKit in Safari öffnen',
            description: 'Die Installationsfunktion funktioniert nur in Safari auf iOS.',
          },
          tapShare: {
            title: 'Auf den Teilen-Button tippen',
            description: 'Finden Sie das Teilen-Symbol am unteren Bildschirmrand.',
          },
          selectAddHome: {
            title: '"Zum Home-Bildschirm" auswählen',
            description: 'Scrollen Sie im Teilen-Menü nach unten, um diese Option zu finden.',
          },
          confirmInstall: {
            title: 'Installation bestätigen',
            description: 'Tippen Sie auf "Hinzufügen", um VolleyKit auf Ihrem Startbildschirm zu installieren.',
          },
        },
      },
      android: {
        title: 'Auf Android',
        steps: {
          openChrome: {
            title: 'VolleyKit in Chrome öffnen',
            description: 'Andere Browser wie Firefox unterstützen ebenfalls PWA-Installation.',
          },
          lookForPrompt: {
            title: 'Nach der Installationsaufforderung suchen',
            description: 'Ein Banner oder eine Aufforderung sollte erscheinen, um die App zu installieren.',
          },
          tapInstall: {
            title: 'Auf "Installieren" oder "Zum Startbildschirm hinzufügen" tippen',
            description: 'Bestätigen Sie, um die App zu Ihrem Gerät hinzuzufügen.',
          },
        },
      },
      screenshotAlt: 'PWA-Installationsaufforderung mit "Zum Startbildschirm hinzufügen"-Option',
      screenshotCaption: 'VolleyKit auf Ihrem Gerät installieren',
      desktop: {
        title: 'Auf Desktop (Chrome/Edge)',
        description: 'Suchen Sie nach dem Installationssymbol in der Adressleiste (normalerweise ein + oder Computersymbol) oder verwenden Sie das Browsermenü, um "VolleyKit installieren" zu finden.',
      },
    },
    whatWorksOffline: {
      title: 'Was offline funktioniert',
      description: 'Wenn Sie offline sind, können Sie weiterhin auf zuvor angesehene Inhalte zugreifen:',
      table: {
        feature: 'Funktion',
        offline: 'Offline',
        notes: 'Hinweise',
        viewAssignments: 'Einsätze anzeigen',
        viewAssignmentsNote: 'Zuvor geladene Einsätze',
        viewDetails: 'Spieldetails anzeigen',
        viewDetailsNote: 'Wenn zuvor angesehen',
        travelTimes: 'Reisezeiten',
        travelTimesNote: 'Zwischengespeicherte Reisedaten',
        confirmAssignments: 'Einsätze bestätigen',
        confirmAssignmentsNote: 'Erfordert Verbindung',
        requestExchanges: 'Tausche anfordern',
        requestExchangesNote: 'Erfordert Verbindung',
        viewCompensations: 'Vergütungen anzeigen',
        viewCompensationsNote: 'Wenn zuvor geladen',
      },
      infoBox: 'Die App synchronisiert automatisch, wenn Sie wieder online sind. Alle Datenänderungen werden abgerufen und angezeigt.',
    },
    offlineIndicator: {
      title: 'Offline-Anzeige',
      description: 'Wenn Sie offline sind, zeigt VolleyKit eine visuelle Anzeige, damit Sie wissen, dass Sie zwischengespeicherte Daten sehen. Achten Sie auf das Offline-Abzeichen im Header oder ein Banner am oberen Bildschirmrand.',
      screenshotAlt: 'Offline-Anzeige, die zeigt, dass die App ohne Internet läuft',
      screenshotCaption: 'Offline-Modus-Anzeige',
    },
    updating: {
      title: 'Die App aktualisieren',
      description: 'VolleyKit aktualisiert sich automatisch im Hintergrund. Wenn eine neue Version verfügbar ist:',
      steps: {
        backgroundDownload: 'Die App lädt das Update im Hintergrund herunter',
        notificationAppears: 'Eine Benachrichtigung erscheint, wenn das Update bereit ist',
        tapReload: 'Tippen Sie auf "Neu laden", um die neue Version zu aktivieren',
      },
      screenshotAlt: 'App-Update-Benachrichtigung mit Aufforderung zum Neu laden',
      screenshotCaption: 'Update verfügbar-Benachrichtigung',
      tip: 'Wenn Sie die Update-Benachrichtigung ablehnen, wird die neue Version beim nächsten Schliessen und erneuten Öffnen der App aktiviert.',
    },
    storage: {
      title: 'Speichernutzung',
      description: 'VolleyKit verwendet minimalen Speicher auf Ihrem Gerät – typischerweise weniger als 5MB für die App selbst plus zwischengespeicherte Daten. Sie können den Cache bei Bedarf in Ihren Browsereinstellungen löschen.',
      warning: 'Das Löschen von Browserdaten oder "Cache leeren" entfernt Ihre Offline-Daten. Sie müssen möglicherweise Einsätze beim nächsten Öffnen der App neu laden.',
    },
  },

  settings: {
    heading: 'App-Einstellungen',
    lead: 'Passen Sie VolleyKit an Ihre Präferenzen an. Konfigurieren Sie Sprache, Heimatstandort und Datenschutzoptionen.',
    accessing: {
      title: 'Auf Einstellungen zugreifen',
      description: 'Öffnen Sie die Einstellungen durch Tippen auf das Zahnradsymbol in der Navigationsleiste oder durch Auswählen von "Einstellungen" im Hauptmenü.',
      screenshotAlt: 'Einstellungsseite mit allen verfügbaren Optionen',
      screenshotCaption: 'VolleyKit-Einstellungsseite',
    },
    profile: {
      title: 'Profilbereich',
      description: 'Der Profilbereich zeigt Ihre Kontoinformationen:',
      fields: {
        name: 'Name – Ihr registrierter Schiedsrichtername',
        licenseNumber: 'Lizenznummer – Ihre Swiss Volley Schiedsrichterlizenz',
        email: 'E-Mail – Ihre registrierte E-Mail-Adresse',
        sessionStatus: 'Sitzungsstatus – Ihr aktueller Anmeldestatus',
      },
      infoBox: 'Profilinformationen stammen aus volleymanager und können nur auf der offiziellen Website geändert werden, nicht in VolleyKit.',
      loggingOut: {
        title: 'Abmelden',
        description: 'Tippen Sie auf "Abmelden", um sich von Ihrem Konto abzumelden. Dies löscht Ihre Sitzung und alle lokal gespeicherten Daten.',
      },
    },
    language: {
      title: 'Spracheinstellungen',
      description: 'VolleyKit unterstützt mehrere Sprachen entsprechend Ihrer Präferenz:',
      options: {
        deutsch: 'Deutsch – Deutsch',
        english: 'English – Englisch',
        francais: 'Français – Französisch',
        italiano: 'Italiano – Italienisch',
      },
      autoDetect: 'Die App verwendet automatisch die Sprache Ihres Browsers, wenn sie unterstützt wird, aber Sie können dies in den Einstellungen überschreiben.',
      screenshotAlt: 'Sprachauswahl mit verfügbaren Optionen',
      screenshotCaption: 'Die App-Sprache ändern',
    },
    homeLocation: {
      title: 'Heimatstandort',
      description: 'Legen Sie Ihren Heimatstandort fest, um Reisezeitberechnungen zu aktivieren. Dies wird verwendet, um zu zeigen, wie lange Sie brauchen, um jeden Spielort zu erreichen.',
      instructions: {
        enterAddress: 'Ihre Adresse oder den nächsten Bahnhof eingeben',
        useAutocomplete: 'Die Autovervollständigungs-Vorschläge für Genauigkeit verwenden',
        travelTimesAppear: 'Reisezeiten erscheinen auf Ihren Einsatzkarten',
      },
      screenshotAlt: 'Heimatstandort-Eingabe mit Adresssuche',
      screenshotCaption: 'Ihren Heimatstandort festlegen',
      tip: 'Wenn Sie normalerweise öffentliche Verkehrsmittel nehmen, verwenden Sie Ihren nächsten Bahnhof als Heimatstandort für genauere Reisezeiten.',
      seeGuide: 'Weitere Details zu dieser Funktion finden Sie im Reisezeit-Leitfaden.',
    },
    dataPrivacy: {
      title: 'Daten & Datenschutz',
      description: 'Kontrollieren Sie, wie Ihre Daten behandelt werden:',
      localStorage: {
        title: 'Lokaler Speicher',
        description: 'VolleyKit speichert Daten lokal, um Offline-Zugriff zu ermöglichen und die Leistung zu verbessern:',
        items: {
          assignmentCache: 'Einsatz-Cache – Ihre letzten Einsätze',
          preferences: 'Einstellungen – Ihre Einstellungen und Präferenzen',
          travelData: 'Reisedaten – Zwischengespeicherte Reiseinformationen',
        },
      },
      clearData: {
        title: 'Lokale Daten löschen',
        description: 'Sie können alle lokal gespeicherten Daten von der Einstellungsseite löschen. Dies wird:',
        effects: {
          removeCached: 'Zwischengespeicherte Einsätze und Reisedaten entfernen',
          resetPreferences: 'Alle Einstellungen auf Standardwerte zurücksetzen',
          requireLogin: 'Erfordert erneute Anmeldung',
        },
        warning: 'Das Löschen lokaler Daten kann nicht rückgängig gemacht werden. Sie müssen Ihre Einsätze beim nächsten Öffnen der App neu laden.',
      },
      screenshotAlt: 'Daten- und Datenschutzeinstellungen mit Daten-löschen-Schaltfläche',
      screenshotCaption: 'Daten- und Datenschutzoptionen',
    },
    about: {
      title: 'Über VolleyKit',
      description: 'Der Über-Bereich zeigt:',
      items: {
        versionNumber: 'Versionsnummer – Aktuelle App-Version',
        lastUpdated: 'Zuletzt aktualisiert – Wann die App zuletzt aktualisiert wurde',
        links: 'Links – GitHub-Repository, Issue-Tracker, Hilfeseite',
      },
      infoBox: 'Überprüfen Sie die Versionsnummer beim Melden von Problemen – dies hilft uns, Probleme schneller zu identifizieren und zu beheben.',
    },
  },
};
