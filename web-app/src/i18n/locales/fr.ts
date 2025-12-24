import type { Translations } from "../types";

const fr: Translations = {
  tour: {
    banner: {
      title: "Visite guidée",
      subtitle: "Entraînez-vous avec des données d'exemple",
      exit: "Quitter la visite",
    },
    badge: {
      example: "Exemple",
    },
    actions: {
      skip: "Passer",
      next: "Suivant",
      previous: "Retour",
      finish: "Terminer",
    },
    stepCurrent: "Étape {step} sur {total}",
    assignments: {
      welcome: {
        title: "Vos désignations",
        description:
          "Ici vous verrez vos prochaines désignations d'arbitre. Chaque carte affiche les détails du match.",
      },
      swipeValidate: {
        title: "Glissez vers la gauche",
        description:
          "Glissez vers la gauche pour révéler les boutons d'action: Valider (confirmer le match), Modifier (ajuster l'indemnité) et Rapport (générer le rapport de salle pour NLA/NLB).",
      },
      swipeExchange: {
        title: "Glissez vers la droite",
        description:
          "Glissez vers la droite pour proposer la désignation à la bourse. D'autres arbitres pourront alors reprendre le match.",
      },
      tapDetails: {
        title: "Voir les détails",
        description:
          "Appuyez sur une carte pour la développer et voir plus de détails sur la désignation.",
      },
    },
    compensations: {
      overview: {
        title: "Vos indemnités",
        description:
          "Ici vous pouvez voir toutes vos indemnités d'arbitre, y compris les frais de match et les frais de déplacement.",
      },
      swipeEdit: {
        title: "Glissez pour modifier",
        description:
          "Glissez vers la gauche pour révéler le bouton de modification. Appuyez dessus pour ajuster la distance ou ajouter un motif de correction.",
      },
      tapDetails: {
        title: "Voir les détails",
        description:
          "Appuyez sur une carte pour la développer et voir plus de détails sur l'indemnité.",
      },
    },
    exchange: {
      browse: {
        title: "Parcourir les échanges",
        description:
          "Voyez les matchs que d'autres arbitres ont mis à l'échange. Vous pouvez reprendre des désignations correspondant à votre niveau.",
      },
      apply: {
        title: "Postuler pour l'échange",
        description:
          "Glissez vers la droite sur un match pour postuler à l'échange et reprendre la désignation.",
      },
      filter: {
        title: "Filtrer par niveau",
        description:
          "Utilisez ce bouton pour n'afficher que les matchs correspondant à votre niveau d'arbitre.",
      },
    },
    settings: {
      language: {
        title: "Changer de langue",
        description:
          "Sélectionnez votre langue préférée. L'application prend en charge l'allemand, l'anglais, le français et l'italien.",
      },
      complete: {
        title: "Visite terminée !",
        description:
          "Vous avez terminé la visite guidée. Vous pouvez la recommencer à tout moment depuis les paramètres.",
      },
      tourSection: {
        title: "Visites guidées",
        description:
          "Conseils interactifs qui vous guident à travers chaque section de l'application avec des données d'exemple.",
        restart: "Recommencer les visites",
        statusCompleted: "Terminé",
        statusSkipped: "Ignoré",
        statusNotStarted: "Non commencé",
      },
    },
    feedback: {
      swipeSuccess: "Excellent glissement ! Vous avez compris le principe.",
      tapSuccess: "Parfait ! Appuyez pour découvrir plus de détails.",
    },
  },
  common: {
    loading: "Chargement...",
    error: "Une erreur est survenue",
    retry: "Réessayer",
    cancel: "Annuler",
    save: "Enregistrer",
    close: "Fermer",
    done: "Terminé",
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
    tbd: "À déterminer",
    locationTbd: "Lieu à déterminer",
    selectRole: "Sélectionner le rôle",
    selectOccupation: "Sélectionner la fonction",
    vs: "vs",
    unknown: "Inconnu",
    unknownDate: "Date ?",
    currencyChf: "CHF",
    distanceUnit: "km",
    dismissNotification: "Ignorer la notification",
    notifications: "Notifications",
    cardActions: "Actions de la carte",
    wizardProgress: "Progression de l'assistant",
    stepIndicatorCurrent: "(actuel)",
    stepIndicatorDone: "(terminé)",
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
    checkingSession: "Vérification de la session...",
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
    active: "Actif",
    archived: "Archivé",
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
    reportGenerated: "Rapport généré avec succès",
    invalidKilometers: "Veuillez entrer un nombre positif valide",
    failedToLoadData: "Échec du chargement des données",
  },
  compensations: {
    title: "Indemnités",
    noCompensations: "Aucune indemnité trouvée",
    paid: "Payé",
    unpaid: "Non payé",
    pending: "En attente",
    total: "Total",
    gameFee: "Frais de match",
    travel: "Voyage",
    distance: "Distance",
    status: "Statut",
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
    loading: "Chargement des échanges...",
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
    applySuccess: "Candidature à l'échange réussie",
    applyError: "Échec de la candidature. Veuillez réessayer.",
    withdrawSuccess: "Retrait de l'échange réussi",
    withdrawError: "Échec du retrait de l'échange. Veuillez réessayer.",
    addedToExchangeSuccess: "Désignation ajoutée à la bourse aux échanges",
    addedToExchangeError: "Impossible d'ajouter la désignation à la bourse",
    submittedBy: "Par :",
    levelRequired: "Niveau {level}+",
    errorLoading: "Échec du chargement des échanges",
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
    demoData: "Données de démonstration",
    demoDataDescription:
      "Vos modifications de démonstration sont enregistrées dans le navigateur. Réinitialisez pour repartir avec de nouvelles données.",
    resetDemoData: "Réinitialiser les données",
    demoDataReset: "Données de démonstration réinitialisées",
  },
  pwa: {
    offlineReady: "Application prête pour le mode hors ligne",
    newVersionAvailable: "Nouvelle version disponible",
    offlineReadyDescription: "Le contenu a été mis en cache pour l'accès hors ligne.",
    newVersionDescription: "Cliquez sur Recharger pour mettre à jour vers la dernière version.",
    reload: "Recharger",
    reloading: "Rechargement...",
    dismiss: "Ignorer",
    reloadAriaLabel: "Recharger l'application pour mettre à jour vers la dernière version",
    dismissAriaLabel: "Ignorer la notification de mise à jour",
    closeAriaLabel: "Fermer la notification",
  },
  pdf: {
    exportTitle: "Exporter PDF",
    selectLanguage: "Sélectionner la langue du document PDF :",
    export: "Exporter",
    generating: "Génération...",
    exportError: "Échec de la génération du PDF",
    sportsHallReport: "Rapport de salle",
  },
  errorBoundary: {
    connectionProblem: "Problème de connexion",
    somethingWentWrong: "Une erreur est survenue",
    networkErrorDescription:
      "Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet et réessayer.",
    applicationErrorDescription:
      "Une erreur inattendue s'est produite. Veuillez actualiser la page.",
    errorDetails: "Détails de l'erreur",
    tryAgain: "Réessayer",
    refreshPage: "Actualiser la page",
    page: {
      networkDescription:
        "Impossible de charger cette page en raison d'un problème de connexion. Veuillez vérifier votre connexion internet.",
      errorDescription:
        "Cette page a rencontré une erreur. Vous pouvez réessayer ou retourner à l'accueil.",
      goHome: "Retour à l'accueil",
    },
    modal: {
      networkDescription:
        "Impossible de terminer cette action en raison d'un problème de connexion.",
      errorDescription:
        "Une erreur s'est produite avec cette action. Veuillez réessayer.",
      closeModal: "Fermer",
    },
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
      added: "ajouté(s)",
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
      noScorersFound: "Aucun marqueur trouvé",
      searchResults: "Résultats de recherche",
      resultsCount: "{count} résultats trouvés",
      resultsCountOne: "1 résultat trouvé",
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
      scoresheetUploaded: "Feuille de match téléchargée",
      noScoresheet: "Aucune feuille de match téléchargée",
    },
    state: {
      unsavedChangesTitle: "Modifications non enregistrées",
      unsavedChangesMessage:
        "Vous avez des modifications non enregistrées. Que voulez-vous faire?",
      continueEditing: "Continuer l'édition",
      discardChanges: "Abandonner",
      discardAndClose: "Abandonner et fermer",
      saveAndClose: "Enregistrer et fermer",
      saveSuccess: "Validation enregistrée avec succès",
      saveError: "Échec de l'enregistrement de la validation",
      markAllStepsTooltip:
        "Marquez toutes les étapes requises comme vérifiées pour terminer",
    },
    wizard: {
      previous: "Précédent",
      next: "Suivant",
      validate: "Valider",
      finish: "Terminer",
      stepOf: "Étape {current} sur {total}",
      saving: "Enregistrement...",
      markAsReviewed: "Marquer comme vérifié",
      alreadyValidated: "Ce match a déjà été validé",
      validatedBy: "Marqueur: {scorer}",
    },
  },
};

export default fr;
