import type { TranslationKeys } from './types';

export const fr: TranslationKeys = {
  nav: {
    home: 'Accueil',
    gettingStarted: 'Premiers pas',
    assignments: 'Désignations',
    exchanges: 'Échanges',
    compensations: 'Indemnités',
    calendarMode: 'Mode calendrier',
    travelTime: 'Temps de trajet',
    offlinePwa: 'Hors ligne & PWA',
    settings: 'Paramètres',
  },

  common: {
    openApp: "Ouvrir l'app",
    learnMore: 'En savoir plus',
    readMore: 'Lire la suite',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    close: 'Fermer',
    menu: 'Menu',
    search: 'Rechercher',
    viewOnGithub: 'Voir sur GitHub',
  },

  home: {
    title: 'Aide VolleyKit',
    subtitle: "Votre guide de l'application VolleyKit",
    description:
      "Apprenez à utiliser VolleyKit pour gérer vos désignations d'arbitrage, échanges et indemnités.",
    ctaOpenApp: "Ouvrir l'app",
    ctaGetStarted: 'Commencer',
    featuresTitle: 'Explorer la documentation',
    readyToStart: 'Prêt à commencer ?',
    features: {
      gettingStarted: {
        title: 'Premiers pas',
        description:
          'Guide de démarrage rapide pour configurer et utiliser VolleyKit.',
      },
      assignments: {
        title: 'Désignations',
        description:
          "Consultez et gérez vos prochains matchs d'arbitrage de volleyball.",
      },
      exchanges: {
        title: 'Échanges',
        description:
          "Demandez des échanges et proposez vos désignations à d'autres arbitres.",
      },
      compensations: {
        title: 'Indemnités',
        description:
          "Suivez vos gains d'arbitrage et l'historique de vos indemnités.",
      },
      calendarMode: {
        title: 'Mode calendrier',
        description:
          'Accès en lecture seule aux désignations sans connexion.',
      },
      travelTime: {
        title: 'Temps de trajet',
        description:
          'Calculez les temps de trajet avec les transports publics suisses.',
      },
      offlinePwa: {
        title: 'Hors ligne & PWA',
        description:
          "Installez l'app et utilisez-la hors ligne sur votre appareil.",
      },
      settings: {
        title: 'Paramètres',
        description:
          'Personnalisez la langue, le thème et les préférences de notification.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Premiers pas',
      description:
        "Apprenez à configurer et commencer à utiliser VolleyKit pour vos désignations d'arbitrage.",
    },
    assignments: {
      title: 'Désignations',
      description:
        "Apprenez à consulter et gérer vos désignations d'arbitrage de volleyball dans VolleyKit.",
    },
    exchanges: {
      title: 'Échanges',
      description:
        "Apprenez à demander et gérer les échanges de désignations avec d'autres arbitres.",
    },
    compensations: {
      title: 'Indemnités',
      description:
        "Apprenez à suivre et comprendre vos paiements d'indemnités d'arbitrage.",
    },
    calendarMode: {
      title: 'Mode calendrier',
      description:
        "Découvrez le mode calendrier pour un accès en lecture seule aux désignations d'arbitrage.",
    },
    travelTime: {
      title: 'Temps de trajet',
      description:
        'Découvrez comment VolleyKit calcule les temps de trajet vers les salles de match en utilisant les transports publics suisses.',
    },
    offlinePwa: {
      title: 'Hors ligne & PWA',
      description:
        "Apprenez à utiliser VolleyKit hors ligne et à l'installer comme application web progressive.",
    },
    settings: {
      title: 'Paramètres',
      description:
        'Apprenez à personnaliser les paramètres et préférences de VolleyKit.',
    },
  },

  search: {
    placeholder: 'Rechercher dans la documentation...',
    placeholderShort: 'Rechercher...',
    noResults: 'Aucun résultat trouvé',
    tryDifferent: "Essayez d'autres mots-clés",
    initialHint: 'Tapez pour commencer la recherche',
    initialSubhint: 'Rechercher dans toutes les pages de documentation',
    searching: 'Recherche en cours...',
    unavailable: 'Recherche non disponible',
    unavailableHint:
      'Exécutez une build de production pour activer la recherche',
    resultsCount: '{count} résultats',
    navigateHint: 'pour naviguer',
    selectHint: 'pour sélectionner',
    poweredBy: 'Propulsé par Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Créé avec Astro',
    forReferees: 'Pour les arbitres de volleyball suisses',
    copyright: '© {year} VolleyKit',
    mainApp: 'Application principale',
    documentation: 'Documentation',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Ouvrir le menu de navigation',
    closeMenu: 'Fermer le menu',
    openSearch: 'Rechercher dans la documentation',
    closeSearch: 'Fermer la recherche',
    skipToContent: 'Aller au contenu',
    breadcrumb: "Fil d'Ariane",
    mainNavigation: 'Navigation principale',
    mobileNavigation: 'Navigation mobile',
    externalLink: "S'ouvre dans un nouvel onglet",
  },

  screenshot: {
    placeholder: "Emplacement de capture d'écran",
    captureInstructions: 'Instructions de capture',
  },

  infoBox: {
    info: 'Info',
    tip: 'Astuce',
    warning: 'Avertissement',
  },

  gettingStarted: {
    heading: 'Premiers pas avec VolleyKit',
    lead: "VolleyKit est une application web progressive qui offre une interface améliorée pour gérer vos désignations d'arbitrage de volleyball via le système volleymanager de la Fédération Suisse de Volleyball.",
    whatIs: {
      title: "Qu'est-ce que VolleyKit ?",
      description: "VolleyKit se connecte à la plateforme officielle volleymanager.volleyball.ch et offre aux arbitres une interface moderne et adaptée aux mobiles pour :",
      features: {
        viewAssignments: 'Voir les prochaines désignations',
        manageExchanges: "Demander et gérer les échanges avec d'autres arbitres",
        trackCompensations: 'Suivre les paiements d\'indemnités',
        offlineAccess: 'Accéder aux désignations hors ligne',
        travelTime: 'Calculer les temps de trajet avec les transports publics suisses',
      },
      infoBox: "VolleyKit est une application non officielle créée pour améliorer l'expérience des arbitres. Toutes les données proviennent du système volleymanager officiel.",
    },
    howToLogin: {
      title: 'Comment se connecter',
      description: "VolleyKit offre deux façons d'accéder à vos désignations :",
      calendarMode: {
        title: 'Option 1 : Mode calendrier (Recommandé)',
        description: 'Pour un accès rapide à votre planning sans entrer votre mot de passe, vous pouvez utiliser le mode calendrier avec votre URL ou code de calendrier unique de volleymanager.',
        steps: {
          findUrl: {
            title: 'Trouver votre URL de calendrier',
            description: 'Dans volleymanager, allez dans "Mes désignations" et copiez votre URL d\'abonnement au calendrier.',
          },
          selectMode: {
            title: 'Sélectionner le mode calendrier',
            description: 'Sur la page de connexion VolleyKit, appuyez sur l\'onglet "Mode calendrier".',
          },
          pasteUrl: {
            title: 'Coller votre URL ou code',
            description: 'Entrez votre URL de calendrier ou juste le code pour accéder à votre planning.',
          },
        },
        infoBox: "Le mode calendrier offre un accès en lecture seule – vous pouvez voir les désignations mais ne pouvez pas confirmer les matchs, demander des échanges ou accéder aux indemnités. Voir le guide du mode calendrier pour plus de détails.",
      },
      fullLogin: {
        title: 'Option 2 : Connexion complète',
        description: 'Utilisez vos identifiants volleymanager.volleyball.ch pour un accès complet à toutes les fonctionnalités.',
        steps: {
          openApp: {
            title: 'Ouvrir VolleyKit',
            description: "Naviguez vers l'application VolleyKit dans votre navigateur ou ouvrez l'application installée.",
          },
          enterCredentials: {
            title: 'Entrer vos identifiants',
            description: 'Utilisez votre nom d\'utilisateur et mot de passe volleymanager pour vous connecter.',
          },
          stayLoggedIn: {
            title: 'Rester connecté',
            description: 'Activez "Se souvenir de moi" pour rester connecté entre les sessions.',
          },
        },
        screenshotAlt: "Page de connexion VolleyKit montrant les champs nom d'utilisateur et mot de passe",
        screenshotCaption: 'La page de connexion VolleyKit',
        tipTitle: 'Mot de passe oublié ?',
        tipContent: "VolleyKit utilise les mêmes identifiants que volleymanager.volleyball.ch. Utilisez la fonction de réinitialisation du mot de passe sur le site officiel si vous avez oublié votre mot de passe.",
      },
    },
    quickTour: {
      title: 'Visite rapide',
      description: "Après la connexion, vous verrez le tableau de bord principal avec vos prochaines désignations. Voici un aperçu rapide des sections principales :",
      assignments: {
        title: 'Désignations',
        description: "Voir tous vos prochains matchs d'arbitrage. Chaque désignation affiche la date, l'heure, les équipes, le lieu et votre rôle (1er arbitre, 2e arbitre ou juge de ligne).",
      },
      exchanges: {
        title: 'Échanges',
        description: "Parcourir les échanges disponibles d'autres arbitres ou demander un échange pour l'une de vos désignations.",
      },
      compensations: {
        title: 'Indemnités',
        description: "Suivre vos paiements d'arbitrage et l'historique des indemnités. Filtrer par période et exporter vos données.",
      },
      settings: {
        title: 'Paramètres',
        description: 'Personnaliser votre expérience incluant la langue, le lieu de domicile pour les calculs de trajet et les préférences de notification.',
      },
    },
    nextSteps: {
      title: 'Prochaines étapes',
      description: 'Maintenant que vous êtes familier avec les bases, explorez les guides détaillés pour chaque fonctionnalité :',
      links: {
        assignments: 'Gérer vos désignations',
        exchanges: 'Demander et accepter des échanges',
        compensations: 'Suivre vos indemnités',
      },
    },
  },

  assignments: {
    heading: 'Gérer vos désignations',
    lead: "La section Désignations est votre centre principal pour voir tous vos prochains matchs d'arbitrage de volleyball et gérer votre planning.",
    whatAre: {
      title: 'Que sont les désignations ?',
      description: 'Les désignations sont les matchs pour lesquels vous avez été programmé comme arbitre. Chaque désignation comprend :',
      details: {
        dateTime: 'Date et heure – Quand le match a lieu',
        teams: 'Équipes – Noms des équipes à domicile et visiteuses',
        venue: 'Lieu – Emplacement du match avec adresse',
        role: 'Votre rôle – 1er arbitre, 2e arbitre ou juge de ligne',
        league: 'Ligue – Le niveau de compétition (ex: LNA, LNB, 1ère Ligue)',
      },
    },
    viewing: {
      title: 'Voir vos désignations',
      description: 'La liste des désignations affiche tous vos prochains matchs dans l\'ordre chronologique. Les matchs sont groupés par date pour voir facilement ce qui arrive.',
      screenshotAlt: 'Liste de désignations montrant plusieurs matchs à venir groupés par date',
      screenshotCaption: 'La vue liste des désignations avec les prochains matchs',
    },
    details: {
      title: 'Détails de désignation',
      description: 'Appuyez sur une désignation pour voir tous les détails. La vue détaillée comprend :',
      items: {
        gameInfo: 'Informations complètes du match',
        venueAddress: 'Adresse du lieu avec lien carte',
        travelTime: 'Temps de trajet depuis votre domicile',
        otherReferees: 'Autres arbitres assignés au même match',
        swipeActions: 'Actions disponibles via gestes de balayage',
      },
      screenshotAlt: 'Vue détaillée de désignation montrant toutes les informations du match',
      screenshotCaption: 'Vue détaillée d\'une désignation unique',
    },
    actions: {
      title: 'Effectuer des actions',
      description: 'VolleyKit utilise des gestes de balayage pour accéder rapidement aux actions sur vos cartes de désignation. Selon le statut du match, différentes actions peuvent être disponibles.',
      swipeRight: {
        title: 'Balayer à droite – Ajouter à l\'échange',
        description: 'Balayez une carte de désignation vers la droite pour révéler l\'action d\'échange. Si vous ne pouvez pas assister à un match, vous pouvez l\'ajouter au tableau d\'échange pour d\'autres arbitres.',
        screenshotAlt: 'Carte de désignation balayée à droite montrant l\'action d\'échange',
        screenshotCaption: 'Balayer à droite pour ajouter une désignation au tableau d\'échange',
        warning: 'Assurez-vous de demander un échange bien à l\'avance. Les demandes de dernière minute peuvent ne pas trouver de remplaçant à temps.',
      },
      swipeLeft: {
        title: 'Balayer à gauche – Valider & Modifier',
        description: 'Balayez une carte de désignation vers la gauche pour révéler des actions supplémentaires :',
        validate: 'Valider – Soumettre les résultats du match et valider (disponible pour les premiers arbitres après le match)',
        edit: 'Modifier – Modifier vos détails d\'indemnité pour cette désignation',
        screenshotAlt: 'Carte de désignation balayée à gauche montrant les actions valider et modifier',
        screenshotCaption: 'Balayer à gauche pour révéler les actions valider et modifier',
        tip: 'Vous pouvez aussi effectuer un balayage complet pour déclencher immédiatement l\'action principale sans appuyer sur le bouton.',
      },
      directions: {
        title: 'Obtenir l\'itinéraire',
        description: 'Appuyez sur une carte de désignation pour l\'agrandir, puis utilisez le bouton d\'itinéraire pour ouvrir votre application de cartes préférée avec les directions vers le lieu.',
      },
    },
    upcomingPast: {
      title: 'Matchs à venir et passés',
      description: 'Utilisez les onglets en haut pour basculer entre :',
      upcoming: 'À venir – Matchs qui n\'ont pas encore eu lieu',
      validationClosed: 'Validation terminée – Matchs passés où la validation est complète',
      tip: 'Définissez votre domicile dans les Paramètres pour voir les estimations de temps de trajet sur chaque carte de désignation.',
    },
  },

  exchanges: {
    heading: 'Échanges de matchs',
    lead: "Le système d'échange permet aux arbitres d'échanger des matchs quand ils ne peuvent pas assister à leurs désignations programmées. Vous pouvez demander des échanges pour vos matchs ou prendre des matchs d'autres arbitres.",
    whatAre: {
      title: 'Que sont les échanges ?',
      description: "Un échange est une demande d'un arbitre qui ne peut pas assister à son match programmé et cherche un remplaçant. Le système volleymanager maintient un tableau d'échange où les arbitres peuvent :",
      features: {
        postGames: 'Publier leurs matchs pour échange',
        browseGames: "Parcourir les matchs disponibles d'autres arbitres",
        acceptGames: 'Accepter des matchs qui correspondent à leur planning',
      },
      infoBox: "Les échanges sont gérés via le système volleymanager officiel. VolleyKit offre une interface plus conviviale au même tableau d'échange.",
    },
    requesting: {
      title: 'Demander un échange',
      description: 'Quand vous ne pouvez pas assister à l\'un de vos matchs programmés, vous pouvez demander un échange pour trouver un arbitre remplaçant.',
      steps: {
        findAssignment: {
          title: 'Trouver la désignation',
          description: 'Allez dans l\'onglet Désignations et localisez le match que vous voulez échanger.',
        },
        swipeRight: {
          title: 'Balayer à droite sur la carte',
          description: "Balayez la carte de désignation vers la droite pour révéler l'action d'échange, puis appuyez dessus. Le match sera publié sur le tableau d'échange.",
        },
      },
      screenshotAlt: "Carte de désignation avec action de balayage d'échange révélée",
      screenshotCaption: 'Demander un échange pour un match',
      warningTitle: 'Demandez tôt',
      warningContent: 'Plus vous demandez un échange tôt, plus vous avez de chances de trouver un remplaçant. Les demandes de dernière minute restent souvent sans réponse.',
    },
    viewing: {
      title: 'Voir les échanges disponibles',
      description: "L'onglet Échanges affiche tous les matchs actuellement disponibles pour échange. Ce sont des matchs que d'autres arbitres ont publiés et pour lesquels ils cherchent des remplaçants.",
      screenshotAlt: "Liste des matchs d'échange disponibles d'autres arbitres",
      screenshotCaption: "Matchs disponibles sur le tableau d'échange",
      filtering: {
        title: 'Filtrer les échanges',
        description: 'Filtrez la liste d\'échanges pour trouver des matchs qui vous conviennent. Les filtres deviennent disponibles après avoir configuré les paramètres requis :',
        distance: 'Distance – Filtrer par distance maximale depuis votre domicile. Nécessite de définir votre domicile dans les Paramètres.',
        travelTime: "Temps de trajet – Filtrer par temps de trajet maximum en transports publics. Nécessite à la fois un domicile et l'activation de l'API des transports publics dans les Paramètres.",
        usage: "Une fois les filtres disponibles, ils apparaissent comme des puces à bascule à côté de l'icône d'engrenage. Appuyez sur l'engrenage pour configurer les valeurs maximales pour chaque filtre.",
        tip: "Définissez votre domicile dans les Paramètres pour débloquer le filtrage par distance. Activez l'API des transports publics pour aussi filtrer par temps de trajet.",
      },
    },
    accepting: {
      title: 'Accepter un échange',
      description: 'Quand vous trouvez un match que vous aimeriez prendre, vous pouvez accepter l\'échange :',
      steps: {
        review: {
          title: 'Vérifier les détails du match',
          description: 'Vérifiez la date, l\'heure, le lieu et les exigences de trajet.',
        },
        swipeLeft: {
          title: 'Balayer à gauche sur la carte',
          description: "Balayez la carte d'échange vers la gauche pour révéler l'action de reprise, puis appuyez dessus.",
        },
        confirm: {
          title: 'Confirmer votre acceptation',
          description: 'Vérifiez les détails et confirmez votre acceptation.',
        },
        gameAdded: {
          title: 'Match ajouté à votre planning',
          description: 'Le match apparaît maintenant dans vos désignations.',
        },
      },
      tip: "Assurez-vous de pouvoir vraiment assister au match avant d'accepter. Une fois accepté, l'arbitre original est libéré de la désignation.",
    },
    managing: {
      title: 'Gérer vos demandes d\'échange',
      description: "Vous pouvez voir et gérer vos demandes d'échange actives depuis l'onglet Échanges. Si vous n'avez plus besoin d'un échange (ex: votre planning a changé), vous pouvez annuler la demande avant que quelqu'un l'accepte.",
      canceling: {
        title: 'Annuler une demande',
        description: 'Pour annuler une demande d\'échange que vous avez faite :',
        steps: {
          goToExchanges: 'Allez dans l\'onglet Échanges',
          selectAddedByMe: 'Sélectionnez l\'onglet "Ajoutés par moi" pour voir vos demandes en attente',
          swipeRight: "Balayez à droite sur la carte de demande pour révéler l'action de suppression, puis appuyez dessus",
          confirmCancellation: 'Confirmez l\'annulation',
        },
        infoBox: "Vous ne pouvez annuler une demande d'échange que si personne ne l'a encore acceptée. Une fois accepté, l'échange est définitif.",
      },
    },
  },

  compensations: {
    heading: 'Suivre vos indemnités',
    lead: "La section Indemnités vous aide à suivre vos gains d'arbitrage et l'historique des paiements. Voir les paiements passés, filtrer par période et exporter vos données pour vos archives.",
    whatAre: {
      title: 'Que sont les indemnités ?',
      description: "Les indemnités sont les paiements que vous recevez pour arbitrer des matchs de volleyball. Chaque entrée d'indemnité comprend généralement :",
      details: {
        gameDetails: 'Détails du match – Le match que vous avez arbitré',
        date: 'Date – Quand le match a eu lieu',
        amount: 'Montant – Le montant de l\'indemnité en CHF',
        paymentStatus: 'Statut de paiement – En attente, payé ou traité',
        role: 'Rôle – Votre fonction dans le match',
      },
      infoBox: "Les montants d'indemnité sont fixés par Swiss Volley et varient selon le niveau de ligue et votre rôle dans le match.",
    },
    viewing: {
      title: 'Voir vos indemnités',
      description: "La liste des indemnités affiche tous vos paiements enregistrés dans l'ordre chronologique. Chaque entrée affiche les informations clés d'un coup d'œil.",
      screenshotAlt: "Liste d'indemnités montrant l'historique des paiements avec montants et dates",
      screenshotCaption: 'Votre historique d\'indemnités',
      paymentStatus: {
        title: 'Comprendre le statut de paiement',
        pending: 'En attente – Match terminé, paiement pas encore traité',
        processing: 'En traitement – Le paiement est en cours de traitement',
        paid: 'Payé – Le paiement a été effectué sur votre compte',
      },
    },
    filtering: {
      title: 'Filtrer par statut',
      description: 'Utilisez les onglets en haut pour filtrer les indemnités par leur statut :',
      tabs: {
        pendingPast: 'En attente (Passé) – Matchs passés en attente de paiement',
        pendingFuture: 'En attente (Futur) – Matchs à venir pas encore joués',
        closed: 'Fermé – Indemnités complétées et payées',
      },
      screenshotAlt: "Onglets d'indemnités montrant les options en attente et fermé",
      screenshotCaption: 'Filtrer les indemnités par statut',
      tip: 'Les indemnités sont automatiquement filtrées sur la saison actuelle (septembre à mai) pour vous concentrer sur les matchs récents.',
    },
    exportPdf: {
      title: 'Exporter en PDF',
      description: "Vous pouvez exporter des enregistrements d'indemnités individuels en documents PDF. Balayez à gauche sur une carte d'indemnité pour révéler l'action d'export PDF.",
      usage: "Le PDF exporté inclut les détails du match et les informations d'indemnité dans un document formaté. C'est utile pour les équipes qui doivent payer l'arbitre directement.",
      infoBox: "L'export PDF crée un document d'aspect officiel avec tous les détails du match et de l'indemnité que les équipes peuvent requérir pour leurs archives.",
    },
    paymentSchedule: {
      title: 'Calendrier de paiement',
      description: 'Les paiements d\'indemnités sont généralement traités mensuellement par Swiss Volley. Le calendrier exact peut varier, mais généralement :',
      details: {
        processing: 'Les matchs du mois précédent sont traités au début de chaque mois',
        bankTransfer: 'Les paiements sont effectués par virement bancaire sur votre compte enregistré',
        timing: 'Le traitement peut prendre 2-4 semaines après la fin du mois',
      },
      warning: 'Assurez-vous que vos coordonnées bancaires sont à jour dans le système volleymanager pour éviter les retards de paiement.',
    },
  },

  calendarMode: {
    heading: 'Mode calendrier',
    lead: "Le mode calendrier offre un accès en lecture seule pour voir les désignations d'arbitrage sans connexion complète. Parfait pour vérifier rapidement votre planning ou le partager avec des membres de la famille.",
    whatIs: {
      title: 'Qu\'est-ce que le mode calendrier ?',
      description: "Le mode calendrier est une méthode d'accès légère en lecture seule qui vous permet de voir vos prochaines désignations sans entrer votre mot de passe. Il utilise un code de calendrier unique lié à votre compte d'arbitre.",
      features: {
        viewAssignments: 'Voir vos prochaines désignations de matchs',
        seeDetails: 'Voir les détails des matchs incluant date, heure, équipes et lieu',
        noPassword: 'Pas de mot de passe requis – juste votre code de calendrier',
        safeToShare: 'Sûr à partager avec la famille ou à ajouter aux calendriers partagés',
      },
    },
    whoIsFor: {
      title: 'Pour qui est le mode calendrier ?',
      description: 'Le mode calendrier est idéal pour :',
      useCases: {
        quickChecks: 'Vérifications rapides de planning – Voir vos matchs sans vous connecter',
        familyMembers: 'Membres de la famille – Partager votre planning avec partenaires ou famille',
        calendarIntegration: 'Intégration calendrier – Ajouter des matchs à des applications de calendrier externes',
        publicDevices: 'Appareils publics – Vérifier votre planning sur des ordinateurs partagés',
      },
      tip: "Le mode calendrier est parfait pour informer votre famille de vos matchs sans leur donner accès à votre compte complet.",
    },
    howToAccess: {
      title: 'Comment accéder au mode calendrier',
      description: 'Pour utiliser le mode calendrier, vous avez besoin de votre code de calendrier unique du système volleymanager.',
      steps: {
        findCode: {
          title: 'Trouver votre code de calendrier',
          description: 'Connectez-vous à volleymanager.volleyball.ch et trouvez votre code de calendrier dans les paramètres de votre profil.',
        },
        openApp: {
          title: 'Ouvrir VolleyKit',
          description: "Naviguez vers l'application VolleyKit.",
        },
        selectMode: {
          title: 'Sélectionner "Mode calendrier"',
          description: 'Sur la page de connexion, appuyez sur l\'option "Mode calendrier".',
        },
        enterCode: {
          title: 'Entrer votre code',
          description: 'Entrez votre code de calendrier pour accéder à votre planning en lecture seule.',
        },
      },
      screenshotAlt: "Écran d'entrée du mode calendrier avec champ de saisie de code",
      screenshotCaption: 'Entrer en mode calendrier avec votre code',
    },
    viewingSchedule: {
      title: 'Voir votre planning',
      description: 'En mode calendrier, vous verrez vos prochaines désignations dans une vue simplifiée. L\'interface affiche les informations essentielles pour chaque match.',
      screenshotAlt: 'Mode calendrier montrant les prochaines désignations en vue lecture seule',
      screenshotCaption: 'Vue désignation en mode calendrier',
    },
    limitations: {
      title: 'Limitations vs connexion complète',
      description: 'Le mode calendrier est en lecture seule, ce qui signifie que certaines fonctionnalités ne sont pas disponibles :',
      table: {
        feature: 'Fonctionnalité',
        fullLogin: 'Connexion complète',
        calendarMode: 'Mode calendrier',
        viewAssignments: 'Voir les désignations',
        viewDetails: 'Voir les détails des matchs',
        travelTime: 'Info temps de trajet',
        confirmAssignments: 'Confirmer les désignations',
        requestExchanges: 'Demander des échanges',
        viewCompensations: 'Voir les indemnités',
        acceptExchanges: 'Accepter des échanges',
      },
      infoBox: "Pour des actions comme confirmer des désignations ou demander des échanges, vous devrez vous connecter avec vos identifiants complets.",
    },
    security: {
      title: 'Garder votre code sécurisé',
      description: 'Bien que le mode calendrier soit en lecture seule, votre code de calendrier doit quand même être traité avec soin :',
      tips: {
        shareWithTrust: 'Ne partagez qu\'avec des personnes de confiance',
        dontPostPublicly: 'Ne publiez pas votre code publiquement en ligne',
        ifCompromised: 'Si vous suspectez que votre code a été compromis, contactez Swiss Volley',
      },
      warning: "Votre code de calendrier révèle votre planning de matchs complet. Ne le partagez qu'avec des personnes à qui vous faites confiance pour connaître vos déplacements.",
    },
  },

  travelTime: {
    heading: 'Fonctionnalité temps de trajet',
    lead: 'VolleyKit intègre les données des transports publics suisses pour vous montrer combien de temps il faut pour atteindre chaque lieu de match. Planifiez mieux vos déplacements et n\'arrivez jamais en retard à un match.',
    howItWorks: {
      title: 'Comment ça fonctionne',
      description: "La fonctionnalité temps de trajet utilise l'API des transports publics suisses (CFF/öV) pour calculer les temps de trajet depuis votre domicile vers chaque lieu de match. Elle prend en compte :",
      considerations: {
        schedules: 'Horaires en temps réel des trains, bus et trams',
        walkingTime: 'Temps de marche vers/depuis les gares',
        transferTimes: 'Temps de correspondance entre connexions',
        gameStartTime: 'L\'heure réelle de début du match',
      },
      infoBox: 'Les temps de trajet sont calculés avec les transports publics. Si vous conduisez habituellement, utilisez les temps comme estimation approximative ou pour planifier des options de transport alternatives.',
    },
    settingHome: {
      title: 'Définir votre domicile',
      description: "Pour obtenir des temps de trajet précis, vous devez définir votre domicile dans les paramètres de l'application.",
      steps: {
        openSettings: {
          title: 'Ouvrir les Paramètres',
          description: 'Naviguez vers la page Paramètres dans VolleyKit.',
        },
        findHomeLocation: {
          title: 'Trouver "Domicile"',
          description: 'Faites défiler jusqu\'à la section paramètres de trajet.',
        },
        enterAddress: {
          title: 'Entrer votre adresse',
          description: 'Tapez votre adresse ou la gare depuis laquelle vous voyagez habituellement.',
        },
        saveSettings: {
          title: 'Sauvegarder vos paramètres',
          description: 'Confirmez votre emplacement pour commencer à voir les temps de trajet.',
        },
      },
      screenshotAlt: 'Page paramètres montrant le champ de saisie du domicile',
      screenshotCaption: 'Définir votre domicile',
      tip: "Utilisez votre gare la plus proche comme domicile si vous marchez ou faites du vélo habituellement jusqu'à la gare – cela donne des temps de transport public plus précis.",
    },
    viewingTimes: {
      title: 'Voir les temps de trajet',
      description: 'Une fois votre domicile défini, les temps de trajet apparaissent sur vos cartes de désignation et dans la vue détaillée de désignation.',
      screenshotAlt: 'Carte de désignation montrant les informations de temps de trajet',
      screenshotCaption: 'Temps de trajet affiché sur une désignation',
      whatsShown: {
        title: 'Ce qui est affiché',
        duration: 'Durée – Temps de trajet total du domicile au lieu',
        departureTime: 'Heure de départ – Quand vous devriez partir pour arriver à temps',
        transportType: 'Type de transport – Icône train, bus ou transport mixte',
      },
    },
    journeyDetails: {
      title: 'Détails du trajet',
      description: 'Appuyez sur le temps de trajet pour voir les détails complets du trajet :',
      features: {
        stepByStep: 'Instructions étape par étape',
        connectionDetails: 'Détails des connexions (numéros de train, quais)',
        walkingSegments: 'Segments de marche',
        transferTimes: 'Temps de correspondance',
      },
      sbbLink: "Vous pouvez aussi ouvrir le trajet directement dans l'application ou le site CFF pour des mises à jour en temps réel et l'achat de billets.",
      screenshotAlt: 'Informations détaillées du trajet avec connexions et horaires',
      screenshotCaption: 'Détails complets du trajet pour la planification',
    },
    arrivalBuffer: {
      title: "Marge d'arrivée",
      description: "L'heure de départ suggérée inclut une marge pour s'assurer que vous arrivez avant le début du match :",
      details: {
        standardBuffer: 'Marge standard : 15-30 minutes avant l\'heure du match',
        timeFor: 'Temps pour trouver le lieu, se changer et s\'échauffer',
        accountForDelays: 'Tenir compte des petits retards potentiels',
      },
      warning: 'Prévoyez toujours du temps supplémentaire pour les matchs importants ou les lieux inconnus. Les transports publics peuvent subir des retards inattendus.',
    },
    offlineAvailability: {
      title: 'Disponibilité hors ligne',
      description: 'Les temps de trajet sont mis en cache quand vous les consultez en ligne. Si vous êtes hors ligne :',
      details: {
        cachedAvailable: 'Les temps de trajet consultés précédemment restent disponibles',
        requiresConnection: 'Les nouveaux calculs nécessitent une connexion internet',
        outdatedIndicator: "L'application indique quand les données peuvent être obsolètes",
      },
      tip: 'Vérifiez vos temps de trajet en ligne avant de vous rendre dans une zone avec une mauvaise connectivité. Les données en cache seront disponibles hors ligne.',
    },
  },

  offlinePwa: {
    heading: 'Fonctionnalités hors ligne & PWA',
    lead: "VolleyKit est une Progressive Web App (PWA) que vous pouvez installer sur votre appareil et utiliser hors ligne. Accédez à vos désignations même sans connexion internet.",
    whatIsPwa: {
      title: "Qu'est-ce qu'une PWA ?",
      description: 'Une Progressive Web App est un site web qui fonctionne comme une application native. Quand vous installez VolleyKit :',
      benefits: {
        homeScreen: "Elle apparaît sur votre écran d'accueil comme une application normale",
        ownWindow: "S'ouvre dans sa propre fenêtre sans interface de navigateur",
        worksOffline: 'Fonctionne hors ligne pour le contenu précédemment consulté',
        autoUpdates: 'Reçoit automatiquement les mises à jour',
        minimalStorage: 'Utilise un stockage minimal comparé aux applications natives',
      },
      tip: "Les PWA combinent le meilleur du web et des applications natives – installation facile, mises à jour automatiques et capacité hors ligne sans téléchargement d'app store.",
    },
    installing: {
      title: "Installer l'application",
      description: 'Vous pouvez installer VolleyKit sur n\'importe quel appareil moderne – téléphones, tablettes ou ordinateurs.',
      ios: {
        title: 'Sur iOS (iPhone/iPad)',
        steps: {
          openSafari: {
            title: 'Ouvrir VolleyKit dans Safari',
            description: 'La fonctionnalité d\'installation ne fonctionne que dans Safari sur iOS.',
          },
          tapShare: {
            title: 'Appuyer sur le bouton Partager',
            description: 'Trouvez l\'icône de partage en bas de l\'écran.',
          },
          selectAddHome: {
            title: 'Sélectionner "Ajouter à l\'écran d\'accueil"',
            description: 'Faites défiler dans le menu de partage pour trouver cette option.',
          },
          confirmInstall: {
            title: 'Confirmer l\'installation',
            description: 'Appuyez sur "Ajouter" pour installer VolleyKit sur votre écran d\'accueil.',
          },
        },
      },
      android: {
        title: 'Sur Android',
        steps: {
          openChrome: {
            title: 'Ouvrir VolleyKit dans Chrome',
            description: "D'autres navigateurs comme Firefox supportent aussi l'installation PWA.",
          },
          lookForPrompt: {
            title: "Chercher l'invite d'installation",
            description: "Une bannière ou invite devrait apparaître demandant d'installer l'application.",
          },
          tapInstall: {
            title: 'Appuyer sur "Installer" ou "Ajouter à l\'écran d\'accueil"',
            description: 'Confirmez pour ajouter l\'application à votre appareil.',
          },
        },
      },
      screenshotAlt: "Invite d'installation PWA montrant l'option Ajouter à l'écran d'accueil",
      screenshotCaption: 'Installer VolleyKit sur votre appareil',
      desktop: {
        title: 'Sur ordinateur (Chrome/Edge)',
        description: "Cherchez l'icône d'installation dans la barre d'adresse (généralement un + ou icône d'ordinateur), ou utilisez le menu du navigateur pour trouver \"Installer VolleyKit\".",
      },
    },
    whatWorksOffline: {
      title: 'Ce qui fonctionne hors ligne',
      description: 'Quand vous êtes hors ligne, vous pouvez toujours accéder au contenu que vous avez consulté précédemment :',
      table: {
        feature: 'Fonctionnalité',
        offline: 'Hors ligne',
        notes: 'Notes',
        viewAssignments: 'Voir les désignations',
        viewAssignmentsNote: 'Désignations chargées précédemment',
        viewDetails: 'Voir les détails des matchs',
        viewDetailsNote: 'Si consultés précédemment',
        travelTimes: 'Temps de trajet',
        travelTimesNote: 'Données de trajet en cache',
        confirmAssignments: 'Confirmer les désignations',
        confirmAssignmentsNote: 'Nécessite une connexion',
        requestExchanges: 'Demander des échanges',
        requestExchangesNote: 'Nécessite une connexion',
        viewCompensations: 'Voir les indemnités',
        viewCompensationsNote: 'Si chargées précédemment',
      },
      infoBox: "L'application se synchronise automatiquement quand vous êtes de retour en ligne. Tous les changements de données seront récupérés et affichés.",
    },
    offlineIndicator: {
      title: 'Indicateur hors ligne',
      description: "Quand vous êtes hors ligne, VolleyKit affiche un indicateur visuel pour que vous sachiez que vous consultez des données en cache. Cherchez le badge hors ligne dans l'en-tête ou une bannière en haut de l'écran.",
      screenshotAlt: "Indicateur hors ligne montrant que l'application fonctionne sans internet",
      screenshotCaption: 'Indicateur mode hors ligne',
    },
    updating: {
      title: "Mettre à jour l'application",
      description: 'VolleyKit se met à jour automatiquement en arrière-plan. Quand une nouvelle version est disponible :',
      steps: {
        backgroundDownload: "L'application télécharge la mise à jour en arrière-plan",
        notificationAppears: 'Une notification apparaît quand la mise à jour est prête',
        tapReload: 'Appuyez sur "Recharger" pour activer la nouvelle version',
      },
      screenshotAlt: 'Notification de mise à jour invitant à recharger',
      screenshotCaption: 'Notification mise à jour disponible',
      tip: "Si vous ignorez la notification de mise à jour, la nouvelle version s'activera la prochaine fois que vous fermerez et rouvrirez l'application.",
    },
    storage: {
      title: 'Utilisation du stockage',
      description: "VolleyKit utilise un stockage minimal sur votre appareil – généralement moins de 5Mo pour l'application elle-même plus les données en cache. Vous pouvez vider le cache depuis les paramètres de votre navigateur si nécessaire.",
      warning: 'Vider les données du navigateur ou "Vider le cache" supprimera vos données hors ligne. Vous devrez peut-être recharger les désignations la prochaine fois que vous ouvrirez l\'application.',
    },
  },

  settings: {
    heading: "Paramètres de l'application",
    lead: 'Personnalisez VolleyKit selon vos préférences. Configurez la langue, le domicile et les options de confidentialité.',
    accessing: {
      title: 'Accéder aux paramètres',
      description: 'Ouvrez les paramètres en appuyant sur l\'icône d\'engrenage dans la barre de navigation, ou en sélectionnant "Paramètres" dans le menu principal.',
      screenshotAlt: 'Page paramètres montrant toutes les options disponibles',
      screenshotCaption: 'Page paramètres VolleyKit',
    },
    profile: {
      title: 'Section profil',
      description: 'La section profil affiche les informations de votre compte :',
      fields: {
        name: 'Nom – Votre nom d\'arbitre enregistré',
        licenseNumber: 'Numéro de licence – Votre licence d\'arbitre Swiss Volley',
        email: 'Email – Votre adresse email enregistrée',
        sessionStatus: 'Statut de session – Votre statut de connexion actuel',
      },
      infoBox: 'Les informations de profil proviennent de volleymanager et ne peuvent être modifiées que sur le site officiel, pas dans VolleyKit.',
      loggingOut: {
        title: 'Déconnexion',
        description: 'Appuyez sur "Déconnexion" pour vous déconnecter de votre compte. Cela efface votre session et toutes les données stockées localement.',
      },
    },
    language: {
      title: 'Paramètres de langue',
      description: 'VolleyKit supporte plusieurs langues selon votre préférence :',
      options: {
        deutsch: 'Deutsch – Allemand',
        english: 'English – Anglais',
        francais: 'Français – Français',
        italiano: 'Italiano – Italien',
      },
      autoDetect: "L'application utilisera automatiquement la langue de votre navigateur si elle est supportée, mais vous pouvez la modifier dans les paramètres.",
      screenshotAlt: 'Sélection de langue montrant les options disponibles',
      screenshotCaption: "Changer la langue de l'application",
    },
    homeLocation: {
      title: 'Domicile',
      description: 'Définissez votre domicile pour activer les calculs de temps de trajet. Ceci est utilisé pour montrer combien de temps il faut pour atteindre chaque lieu de match.',
      instructions: {
        enterAddress: 'Entrez votre adresse ou la gare la plus proche',
        useAutocomplete: 'Utilisez les suggestions d\'autocomplétion pour la précision',
        travelTimesAppear: 'Les temps de trajet apparaîtront sur vos cartes de désignation',
      },
      screenshotAlt: "Saisie du domicile avec recherche d'adresse",
      screenshotCaption: 'Définir votre domicile',
      tip: 'Si vous prenez habituellement les transports publics, utilisez votre gare la plus proche comme domicile pour des temps de trajet plus précis.',
      seeGuide: 'Voir le guide Temps de trajet pour plus de détails sur cette fonctionnalité.',
    },
    dataPrivacy: {
      title: 'Données & Confidentialité',
      description: 'Contrôlez comment vos données sont gérées :',
      localStorage: {
        title: 'Stockage local',
        description: "VolleyKit stocke des données localement pour permettre l'accès hors ligne et améliorer les performances :",
        items: {
          assignmentCache: 'Cache de désignations – Vos désignations récentes',
          preferences: 'Préférences – Vos paramètres et préférences',
          travelData: 'Données de trajet – Informations de trajet en cache',
        },
      },
      clearData: {
        title: 'Effacer les données locales',
        description: 'Vous pouvez effacer toutes les données stockées localement depuis la page paramètres. Cela va :',
        effects: {
          removeCached: 'Supprimer les désignations en cache et les données de trajet',
          resetPreferences: 'Réinitialiser toutes les préférences aux valeurs par défaut',
          requireLogin: 'Nécessiter une nouvelle connexion',
        },
        warning: "L'effacement des données locales ne peut pas être annulé. Vous devrez recharger vos désignations la prochaine fois que vous ouvrirez l'application.",
      },
      screenshotAlt: 'Section paramètres données et confidentialité avec bouton effacer données',
      screenshotCaption: 'Options données et confidentialité',
    },
    about: {
      title: 'À propos de VolleyKit',
      description: 'La section À propos affiche :',
      items: {
        versionNumber: "Numéro de version – Version actuelle de l'application",
        lastUpdated: "Dernière mise à jour – Quand l'application a été mise à jour pour la dernière fois",
        links: 'Liens – Dépôt GitHub, suivi des problèmes, site d\'aide',
      },
      infoBox: 'Vérifiez le numéro de version lors de la signalisation de problèmes – cela nous aide à identifier et corriger les problèmes plus rapidement.',
    },
  },
};
