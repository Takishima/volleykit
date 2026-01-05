/**
 * Mock Reference Data
 *
 * Generates fake player reference lists for comparison with OCR results.
 * These lists simulate what would come from the VolleyManager API.
 *
 * The mock data is designed to:
 * 1. Match most players from the OCR result (successful matches)
 * 2. Have some players missing (player on sheet but not in reference)
 * 3. Have some extra players (player in reference but not on sheet)
 */

/**
 * @typedef {Object} ReferencePlayer
 * @property {string} id - Unique identifier
 * @property {number | null} shirtNumber - Player's shirt number
 * @property {string} firstName - Player's first name
 * @property {string} lastName - Player's last name
 * @property {string} displayName - Full display name
 * @property {string} birthday - Birthday in YYYY-MM-DD format
 * @property {string} licenseCategory - License category (e.g., "SEN", "JUN")
 * @property {boolean} isLibero - Whether player is a libero
 */

/**
 * @typedef {Object} ReferenceTeam
 * @property {string} id - Team identifier
 * @property {string} name - Team name
 * @property {ReferencePlayer[]} players - All players (including liberos)
 */

// Helper to create a reference player
function createPlayer(
  id,
  shirtNumber,
  firstName,
  lastName,
  birthday,
  licenseCategory = 'SEN',
  isLibero = false,
) {
  return {
    id,
    shirtNumber,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    birthday,
    licenseCategory,
    isLibero,
  };
}

/**
 * Mock reference data for Team A (BTV Aarau 1)
 * - Matches most players from OCR
 * - Missing: KADRIU VENERË (17), KOSTADINOVA VIOLETA (19)
 * - Extra: MARTINEZ ELENA (who isn't on the sheet)
 * @returns {ReferenceTeam}
 */
export function getMockTeamA() {
  return {
    id: 'team-a-btv-aarau',
    name: 'BTV Aarau 1',
    players: [
      // Players that MATCH the OCR
      createPlayer('p-a-1', 5, 'Maria', 'Tortarolo', '1998-03-15', 'SEN'),
      createPlayer('p-a-2', 6, 'Anna Stefanie', 'Loosli', '1999-07-22', 'SEN'),
      createPlayer('p-a-3', 7, 'Alina Sarah', 'Stäuble', '2001-11-08', 'JUN'),
      createPlayer('p-a-4', 9, 'Marina Chiara', 'Baumli', '1997-05-30', 'SEN'),
      createPlayer('p-a-5', 10, 'Ellen Elisabeth', 'Schibli', '2000-09-12', 'SEN'),
      createPlayer('p-a-6', 11, 'Jasmin Tian Yi', 'Kuch', '1996-02-18', 'SEN'),
      createPlayer('p-a-7', 12, 'Luana', 'Petris', '2002-06-25', 'JUN'),
      createPlayer('p-a-8', 14, 'Renée', 'De Courten', '1998-12-03', 'SEN'),
      createPlayer('p-a-9', 16, 'Sheyla', 'Bögli', '2000-04-17', 'SEN'),
      createPlayer('p-a-10', 20, 'Charlotte', 'Schneider', '1999-08-29', 'SEN'),
      // Liberos that MATCH
      createPlayer('p-a-11', 1, 'Milena Timea', 'Zoller', '2001-01-11', 'JUN', true),
      createPlayer('p-a-12', 2, 'Debora', 'Reinhard', '1997-03-05', 'SEN', true),
      // EXTRA player not on sheet (to show "in reference but not on sheet")
      createPlayer('p-a-extra', 21, 'Elena', 'Martinez', '1998-06-20', 'SEN'),
      // Note: KADRIU VENERË (17) and KOSTADINOVA VIOLETA (19) are NOT included
      // to demonstrate "on sheet but not in reference"
    ],
  };
}

/**
 * Mock reference data for Team B (VBC NUC II A)
 * - Matches most players from OCR
 * - Missing: SCRUCCA NINA (14)
 * - Extra: DUBOIS CLAIRE (who isn't on the sheet)
 * @returns {ReferenceTeam}
 */
export function getMockTeamB() {
  return {
    id: 'team-b-vbc-nuc',
    name: 'VBC NUC II A',
    players: [
      // Players that MATCH the OCR
      createPlayer('p-b-1', 2, 'Sophie', 'Balmer', '1999-03-15', 'SEN'),
      createPlayer('p-b-2', 3, 'Yvana', 'Modjo', '2000-07-22', 'SEN'),
      createPlayer('p-b-3', 5, 'Aurélie', 'Fréchelin', '1998-11-08', 'SEN'),
      createPlayer('p-b-4', 6, 'Anaïs', 'Waeber', '2001-05-30', 'JUN'),
      createPlayer('p-b-5', 8, 'Sara', 'Milz', '1997-09-12', 'SEN'),
      createPlayer('p-b-6', 10, 'Julie', 'Bovet', '2000-02-18', 'SEN'),
      createPlayer('p-b-7', 11, 'Julie', 'Schweizer', '1999-06-25', 'SEN'),
      createPlayer('p-b-8', 13, 'Jill Ewa', 'Münstermann', '2002-12-03', 'JUN'),
      createPlayer('p-b-9', 17, 'Amélie', 'Lengweiler', '1998-04-17', 'SEN'),
      // Liberos that MATCH
      createPlayer('p-b-10', 7, 'Asia', 'Marzocchella', '2001-08-29', 'JUN', true),
      createPlayer('p-b-11', 16, 'Nora', 'Sojcic', '2000-01-11', 'SEN', true),
      // EXTRA player not on sheet
      createPlayer('p-b-extra', 18, 'Claire', 'Dubois', '1997-03-05', 'SEN'),
      // Note: SCRUCCA NINA (14) is NOT included to demonstrate "on sheet but not in reference"
    ],
  };
}

/**
 * Get both mock teams
 * @returns {{ teamA: ReferenceTeam, teamB: ReferenceTeam }}
 */
export function getMockReferenceData() {
  return {
    teamA: getMockTeamA(),
    teamB: getMockTeamB(),
  };
}

/**
 * Get mock team by name (fuzzy match)
 * @param {string} teamName - Team name to search for
 * @returns {ReferenceTeam | null}
 */
export function findTeamByName(teamName) {
  if (!teamName) return null;

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
  if (teamA.name.toLowerCase().includes(normalized.slice(0, 5))) {
    return teamA;
  }
  if (teamB.name.toLowerCase().includes(normalized.slice(0, 5))) {
    return teamB;
  }

  return null;
}
