/**
 * Mock Reference Data
 *
 * Generates fake player reference lists for comparison with OCR results.
 * These lists simulate what would come from the VolleyManager API.
 *
 * IMPORTANT: VolleyManager API does NOT provide:
 * - Shirt numbers (players don't have numbers in the nomination list)
 * - Player positions (libero status is not indicated)
 *
 * The mock data is designed to:
 * 1. Match most players from the OCR result (successful matches)
 * 2. Have some players missing (player on sheet but not in reference)
 * 3. Have some extra players (player in reference but not on sheet)
 */

/**
 * @typedef {Object} ReferencePlayer
 * @property {string} id - Unique identifier
 * @property {string} firstName - Player's first name
 * @property {string} lastName - Player's last name
 * @property {string} displayName - Full display name
 * @property {string} birthday - Birthday in YYYY-MM-DD format
 * @property {string} licenseCategory - License category (e.g., "SEN", "JUN")
 */

/**
 * @typedef {Object} ReferenceOfficial
 * @property {string} id - Unique identifier
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} displayName - Full display name
 * @property {string} role - Role: 'C' (coach), 'AC' (assistant)
 */

/**
 * @typedef {Object} ReferenceTeam
 * @property {string} id - Team identifier
 * @property {string} name - Team name
 * @property {ReferencePlayer[]} players - All players
 * @property {ReferenceOfficial[]} officials - Coaches and assistant coaches
 */

/**
 * Minimum characters to match when doing fuzzy team name lookups.
 * Used as a fallback when specific keywords don't match.
 */
const MINIMUM_MATCH_PREFIX_LENGTH = 5;

// Helper to create a reference player (no shirt number - API doesn't provide it)
function createPlayer(id, firstName, lastName, birthday, licenseCategory = 'SEN') {
  return {
    id,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    birthday,
    licenseCategory,
  };
}

// Helper to create a reference official
function createOfficial(id, firstName, lastName, role) {
  return {
    id,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    role,
  };
}

/**
 * Mock reference data for Team A (BTV Aarau 1)
 * Based on sample OCR output.
 * - Matches most players
 * - Missing: KADRIU VENERË, KOSTADINOVA VIOLETA (to show "on sheet but not in reference")
 * - Extra: MARTINEZ ELENA (to show "in reference but not on sheet")
 * @returns {ReferenceTeam}
 */
export function getMockTeamA() {
  return {
    id: 'team-a-btv-aarau',
    name: 'BTV Aarau 1',
    players: [
      // Players that MATCH the OCR (names only, no numbers)
      createPlayer('p-a-1', 'Maria', 'Tortarolo', '1998-03-15', 'SEN'),
      createPlayer('p-a-2', 'Anna Stefanie', 'Loosli', '1999-07-22', 'SEN'),
      createPlayer('p-a-3', 'Alina Sarah', 'Stäuble', '2001-11-08', 'JUN'),
      createPlayer('p-a-4', 'Marina Chiara', 'Baumli', '1997-05-30', 'SEN'),
      createPlayer('p-a-5', 'Ellen Elisabeth', 'Schibli', '2000-09-12', 'SEN'),
      createPlayer('p-a-6', 'Jasmin Tian Yi', 'Kuch', '1996-02-18', 'SEN'),
      createPlayer('p-a-7', 'Luana', 'Petris', '2002-06-25', 'JUN'),
      createPlayer('p-a-8', 'Renée', 'De Courten', '1998-12-03', 'SEN'),
      createPlayer('p-a-9', 'Sheyla', 'Bögli', '2000-04-17', 'SEN'),
      createPlayer('p-a-10', 'Charlotte', 'Schneider', '1999-08-29', 'SEN'),
      // Liberos (also just players in reference, no position indicated)
      createPlayer('p-a-11', 'Milena Timea', 'Zoller', '2001-01-11', 'JUN'),
      createPlayer('p-a-12', 'Debora', 'Reinhard', '1997-03-05', 'SEN'),
      // EXTRA player not on sheet (to show "in reference but not on sheet")
      createPlayer('p-a-extra', 'Elena', 'Martinez', '1998-06-20', 'SEN'),
      // Note: KADRIU VENERË and KOSTADINOVA VIOLETA are NOT included
      // to demonstrate "on sheet but not in reference"
    ],
    officials: [
      // Coach - matches OCR "Lippuner Timo"
      createOfficial('o-a-1', 'Timo', 'Lippuner', 'C'),
      // Assistant Coach - matches OCR "Rosa Geremia Giuliano"
      createOfficial('o-a-2', 'Giuliano', 'Rosa Geremia', 'AC'),
      // AC2 - matches OCR "Tasca Denise"
      createOfficial('o-a-3', 'Denise', 'Tasca', 'AC'),
      // AC3 - matches OCR "Rohrer Michelle Claudia"
      createOfficial('o-a-4', 'Michelle Claudia', 'Rohrer', 'AC'),
    ],
  };
}

/**
 * Mock reference data for Team B (VBC NUC II A)
 * Based on sample OCR output.
 * - Matches most players
 * - Missing: SCRUCCA NINA (to show "on sheet but not in reference")
 * - Extra: DUBOIS CLAIRE (to show "in reference but not on sheet")
 * @returns {ReferenceTeam}
 */
export function getMockTeamB() {
  return {
    id: 'team-b-vbc-nuc',
    name: 'VBC NUC II A',
    players: [
      // Players that MATCH the OCR
      createPlayer('p-b-1', 'Sophie', 'Balmer', '1999-03-15', 'SEN'),
      createPlayer('p-b-2', 'Yvana', 'Modjo', '2000-07-22', 'SEN'),
      createPlayer('p-b-3', 'Aurélie', 'Fréchelin', '1998-11-08', 'SEN'),
      createPlayer('p-b-4', 'Anaïs', 'Waeber', '2001-05-30', 'JUN'),
      createPlayer('p-b-5', 'Sara', 'Milz', '1997-09-12', 'SEN'),
      createPlayer('p-b-6', 'Julie', 'Bovet', '2000-02-18', 'SEN'),
      createPlayer('p-b-7', 'Julie', 'Schweizer', '1999-06-25', 'SEN'),
      createPlayer('p-b-8', 'Jill Ewa', 'Münstermann', '2002-12-03', 'JUN'),
      createPlayer('p-b-9', 'Amélie', 'Lengweiler', '1998-04-17', 'SEN'),
      // Liberos
      createPlayer('p-b-10', 'Asia', 'Marzocchella', '2001-08-29', 'JUN'),
      createPlayer('p-b-11', 'Nora', 'Sojcic', '2000-01-11', 'SEN'),
      // EXTRA player not on sheet
      createPlayer('p-b-extra', 'Claire', 'Dubois', '1997-03-05', 'SEN'),
      // Note: SCRUCCA NINA is NOT included to demonstrate "on sheet but not in reference"
    ],
    officials: [
      // Coach - matches OCR "Léonor Guyot"
      createOfficial('o-b-1', 'Léonor', 'Guyot', 'C'),
      // Assistant Coach - matches OCR "Girolami Laura"
      createOfficial('o-b-2', 'Laura', 'Girolami', 'AC'),
      // AC2 - matches OCR "Meessen Maelle"
      createOfficial('o-b-3', 'Maelle', 'Meessen', 'AC'),
    ],
  };
}

/**
 * Get both mock teams (electronic scoresheet)
 * @returns {{ teamA: ReferenceTeam, teamB: ReferenceTeam }}
 */
export function getMockReferenceData() {
  return {
    teamA: getMockTeamA(),
    teamB: getMockTeamB(),
  };
}

// =============================================================================
// MANUSCRIPT SCORESHEET MOCK DATA
// =============================================================================

/**
 * Mock reference data for Manuscript Team A (TV St. Johann)
 * Based on manuscript scoresheet OCR sample.
 * - Matches most players from the handwritten roster
 * - Missing: One player to show "on sheet but not in reference"
 * - Extra: One player to show "in reference but not on sheet"
 * @returns {ReferenceTeam}
 */
export function getMockManuscriptTeamA() {
  return {
    id: 'team-a-tv-st-johann',
    name: 'TV St. Johann',
    players: [
      // Players that MATCH the OCR (from official roster)
      createPlayer('ms-a-1', 'Sotiria', 'Angeli', '1997-02-20', 'SEN'),
      createPlayer('ms-a-2', 'Lea', 'Cottier', '1990-09-21', 'SEN'),
      createPlayer('ms-a-3', 'Oceane', 'Follonier', '1997-11-19', 'SEN'),
      createPlayer('ms-a-4', 'Sara', 'Gürtler', '1981-01-13', 'SEN'),
      createPlayer('ms-a-5', 'Martina Stephanie', 'Kaptanoglu - Griner', '1976-12-27', 'SEN'),
      createPlayer('ms-a-6', 'Marianne', 'Lorentz', '1980-04-06', 'SEN'),
      createPlayer('ms-a-7', 'Jeanine', 'Monnier', '1981-07-21', 'SEN'),
      createPlayer('ms-a-8', 'Laura', 'Montero', '1997-06-19', 'SEN'),
      // Missing Suter to demonstrate "on sheet but not in reference"
      // createPlayer('ms-a-9', 'Andrea', 'Suter', '1982-10-07', 'SEN'),
      createPlayer('ms-a-10', 'Aline Hélène', 'Vonwiller', '1991-03-16', 'SEN'),
      // EXTRA player not on sheet (to show "in reference but not on sheet")
      createPlayer('ms-a-extra', 'Sophie', 'Müller', '1995-05-15', 'SEN'),
    ],
    officials: [
      // Coach - Marianne Lorentz (also a player)
      createOfficial('ms-o-a-1', 'Marianne', 'Lorentz', 'C'),
    ],
  };
}

/**
 * Mock reference data for Manuscript Team B (VTV Horw 1)
 * Based on manuscript scoresheet OCR sample.
 * - Matches most players from the handwritten roster
 * - Missing: One player to show "on sheet but not in reference"
 * - Extra: One player to show "in reference but not on sheet"
 * @returns {ReferenceTeam}
 */
export function getMockManuscriptTeamB() {
  return {
    id: 'team-b-vtv-horw',
    name: 'VTV Horw 1',
    players: [
      // Players that MATCH the OCR (from official roster)
      createPlayer('ms-b-1', 'Nicole', 'Hentschel', '1990-05-03', 'SEN'),
      createPlayer('ms-b-2', 'Julia', 'Brunner', '1992-06-28', 'SEN'),
      createPlayer('ms-b-3', 'Silvia', 'Candido', '1992-06-10', 'SEN'),
      createPlayer('ms-b-4', 'Fabienne Viviane', 'Stalder', '1989-03-12', 'SEN'),
      createPlayer('ms-b-5', 'Sabrina', 'Wirz', '1990-06-01', 'SEN'),
      createPlayer('ms-b-6', 'Corinne', 'Michel', '1998-11-19', 'SEN'),
      // Missing Morgenthaler to demonstrate "on sheet but not in reference"
      // createPlayer('ms-b-7', 'Miryam Nicole', 'Morgenthaler', '1993-01-15', 'SEN'),
      createPlayer('ms-b-8', 'Monika Kamila', 'Brzozowska', '2001-08-28', 'JUN'),
      createPlayer('ms-b-9', 'Marina Julia', 'Erne', '1992-10-17', 'SEN'),
      // EXTRA player not on sheet (to show "in reference but not on sheet")
      createPlayer('ms-b-extra', 'Lena', 'Fischer', '1994-08-22', 'SEN'),
    ],
    officials: [
      // Coach - A. Zbinden (first name unknown from sheet)
      createOfficial('ms-o-b-1', 'A.', 'Zbinden', 'C'),
    ],
  };
}

/**
 * Get both mock teams for manuscript scoresheet
 * @returns {{ teamA: ReferenceTeam, teamB: ReferenceTeam }}
 */
export function getMockManuscriptReferenceData() {
  return {
    teamA: getMockManuscriptTeamA(),
    teamB: getMockManuscriptTeamB(),
  };
}

/**
 * Get mock team by name (fuzzy match) - electronic scoresheet
 * @param {string} teamName - Team name to search for
 * @returns {ReferenceTeam | null}
 */
export function findTeamByName(teamName) {
  if (!teamName) {
    return null;
  }

  const normalized = teamName.toLowerCase().trim();
  const teamA = getMockTeamA();
  const teamB = getMockTeamB();

  // Check if name contains key parts
  if (normalized.includes('aarau') || normalized.includes('btv')) {
    return teamA;
  }
  if (normalized.includes('nuc') || normalized.includes('vbc nuc')) {
    return teamB;
  }

  // Fallback: check if team name is similar
  if (teamA.name.toLowerCase().includes(normalized.slice(0, MINIMUM_MATCH_PREFIX_LENGTH))) {
    return teamA;
  }
  if (teamB.name.toLowerCase().includes(normalized.slice(0, MINIMUM_MATCH_PREFIX_LENGTH))) {
    return teamB;
  }

  return null;
}

/**
 * Get mock team by name (fuzzy match) - manuscript scoresheet
 * @param {string} teamName - Team name to search for
 * @returns {ReferenceTeam | null}
 */
export function findManuscriptTeamByName(teamName) {
  if (!teamName) {
    return null;
  }

  const normalized = teamName.toLowerCase().trim();
  const teamA = getMockManuscriptTeamA();
  const teamB = getMockManuscriptTeamB();

  // Check if name contains key parts for TV St. Johann
  if (normalized.includes('johann') || normalized.includes('st. johann') || normalized.includes('tv st')) {
    return teamA;
  }
  // Check if name contains key parts for VTV Horw
  if (normalized.includes('horw') || normalized.includes('vtv')) {
    return teamB;
  }

  // Fallback: check if team name is similar
  if (teamA.name.toLowerCase().includes(normalized.slice(0, MINIMUM_MATCH_PREFIX_LENGTH))) {
    return teamA;
  }
  if (teamB.name.toLowerCase().includes(normalized.slice(0, MINIMUM_MATCH_PREFIX_LENGTH))) {
    return teamB;
  }

  return null;
}
