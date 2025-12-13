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
    noAssignments: string;
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
    noAssignments: "No assignments found",
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
    noAssignments: "Keine Einsätze gefunden",
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
    noAssignments: "Aucune désignation trouvée",
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
    noAssignments: "Nessuna designazione trovata",
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
