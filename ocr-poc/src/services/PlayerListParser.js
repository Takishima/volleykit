/**
 * Player List Parser
 *
 * Parses OCR text output into structured player lists for both teams.
 * Handles the tab-separated format from Mistral OCR.
 *
 * Expected OCR format:
 * Row 1: TeamA Name<tab>TeamB Name
 * Row 2: N.<tab>Name of the player<tab>N.<tab>Name of the player (headers)
 * Row 3+: Number<tab>LASTNAME FIRSTNAME<tab>License<tab>Number<tab>LASTNAME FIRSTNAME<tab>License
 * ...
 * LIBERO section: L1<tab>Number LASTNAME FIRSTNAME<tab>License<tab>L1<tab>Number LASTNAME FIRSTNAME<tab>License
 * OFFICIAL MEMBERS section: C<tab>Name<tab>C<tab>Name (coaches), AC<tab>Name<tab>AC<tab>Name (assistants)
 */

/**
 * @typedef {Object} ParsedPlayer
 * @property {number | null} shirtNumber - Player's shirt number (from OCR, not used for matching)
 * @property {string} lastName - Player's last name (normalized)
 * @property {string} firstName - Player's first name (normalized)
 * @property {string} displayName - Full display name
 * @property {string} rawName - Original name from OCR
 * @property {string} licenseStatus - License status (NOT/LFP)
 */

/**
 * @typedef {Object} ParsedOfficial
 * @property {string} role - Role: 'C' (coach), 'AC' (assistant coach), 'AC2', 'AC3'
 * @property {string} lastName - Last name (normalized)
 * @property {string} firstName - First name (normalized)
 * @property {string} displayName - Full display name
 * @property {string} rawName - Original name from OCR
 */

/**
 * @typedef {Object} ParsedTeam
 * @property {string} name - Team name
 * @property {ParsedPlayer[]} players - All players (including liberos)
 * @property {ParsedOfficial[]} officials - Coaches and assistant coaches
 */

/**
 * @typedef {Object} ParsedGameSheet
 * @property {ParsedTeam} teamA - First team (left column)
 * @property {ParsedTeam} teamB - Second team (right column)
 * @property {string[]} warnings - Any parsing warnings
 */

/**
 * Normalize a name from OCR (UPPERCASE) to title case
 * @param {string} name - Name in uppercase
 * @returns {string} - Name in title case
 */
function normalizeName(name) {
  if (!name) {
    return '';
  }
  return name
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Parse a player name in "LASTNAME FIRSTNAME [MIDDLENAME]" format
 * @param {string} rawName - Raw name from OCR
 * @returns {{ lastName: string, firstName: string, displayName: string }}
 */
function parsePlayerName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' };
  }

  const trimmed = rawName.trim();
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' };
  }

  if (parts.length === 1) {
    const lastName = normalizeName(parts[0]);
    return { lastName, firstName: '', displayName: lastName };
  }

  // First part is always last name, rest are first names
  const lastName = normalizeName(parts[0]);
  const firstName = parts.slice(1).map(normalizeName).join(' ');
  const displayName = `${firstName} ${lastName}`;

  return { lastName, firstName, displayName };
}

/**
 * Parse an official name - format is "Firstname Lastname" (not reversed like players)
 * @param {string} rawName - Raw name from OCR
 * @returns {{ lastName: string, firstName: string, displayName: string }}
 */
function parseOfficialName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' };
  }

  const trimmed = rawName.trim();
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' };
  }

  if (parts.length === 1) {
    const name = normalizeName(parts[0]);
    return { lastName: name, firstName: '', displayName: name };
  }

  // For officials, format is "Firstname Lastname" - last part is last name
  const lastName = normalizeName(parts[parts.length - 1]);
  const firstName = parts.slice(0, -1).map(normalizeName).join(' ');
  const displayName = `${firstName} ${lastName}`;

  return { lastName, firstName, displayName };
}

/**
 * Parse a libero entry which has format "Number LASTNAME FIRSTNAME"
 * @param {string} entry - Libero entry like "1 ZOLLER MILENA TIMEA"
 * @returns {{ number: number | null, name: string }}
 */
function parseLiberoEntry(entry) {
  if (!entry || typeof entry !== 'string') {
    return { number: null, name: '' };
  }

  const trimmed = entry.trim();
  const match = trimmed.match(/^(\d+)\s+(.+)$/);

  if (match) {
    return {
      number: parseInt(match[1], 10),
      name: match[2],
    };
  }

  return { number: null, name: trimmed };
}

/**
 * Check if a line starts the officials section
 * @param {string} line - Line to check
 * @returns {boolean}
 */
function isOfficialsHeader(line) {
  const upper = line.toUpperCase();
  return upper.includes('OFFICIAL MEMBERS') || upper.includes('ADMITTED ON THE BENCH');
}

/**
 * Check if a line marks the end of all data (signatures section)
 * @param {string} line - Line to check
 * @returns {boolean}
 */
function isSignaturesSection(line) {
  const upper = line.toUpperCase();
  return upper.includes('SIGNATURES') || upper.includes('TEAM CAPTAIN');
}

/**
 * Check if a role string is a valid official role
 * @param {string} role - Role to check
 * @returns {boolean}
 */
function isOfficialRole(role) {
  const normalized = role.toUpperCase().trim();
  return ['C', 'AC', 'AC2', 'AC3', 'AC4'].includes(normalized);
}

/**
 * Check if a line is a section header
 * @param {string} line - Line to check
 * @returns {boolean}
 */
function isSectionHeader(line) {
  const headers = ['LIBERO', 'N.', 'Name of the player'];
  return headers.some((h) => line.toUpperCase().includes(h.toUpperCase()));
}

/**
 * Parse the OCR text output into structured player lists
 * @param {string} ocrText - Raw OCR text from Mistral
 * @returns {ParsedGameSheet}
 */
export function parseGameSheet(ocrText) {
  /** @type {string[]} */
  const warnings = [];

  /** @type {ParsedTeam} */
  const teamA = { name: '', players: [], officials: [] };

  /** @type {ParsedTeam} */
  const teamB = { name: '', players: [], officials: [] };

  if (!ocrText || typeof ocrText !== 'string') {
    warnings.push('No OCR text provided');
    return { teamA, teamB, warnings };
  }

  // Split into lines and filter empty ones
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    warnings.push('OCR text contains no lines');
    return { teamA, teamB, warnings };
  }

  let currentSection = 'header'; // 'header' | 'players' | 'libero' | 'officials' | 'done'
  let headerRowsParsed = 0;

  for (const line of lines) {
    // Check for signatures section (end of all data)
    if (isSignaturesSection(line)) {
      currentSection = 'done';
      continue;
    }

    if (currentSection === 'done') {
      continue;
    }

    // Check for officials section
    if (isOfficialsHeader(line)) {
      currentSection = 'officials';
      continue;
    }

    // Split by tabs
    const parts = line.split('\t').map((p) => p.trim());

    // Check for LIBERO section
    if (line.toUpperCase().includes('LIBERO') && parts.length <= 2) {
      currentSection = 'libero';
      continue;
    }

    // Parse based on current section
    if (currentSection === 'header') {
      // First non-header row should be team names
      if (headerRowsParsed === 0 && !isSectionHeader(line)) {
        // Team names row - could be 2 parts (tab-separated) or in various formats
        if (parts.length >= 2) {
          teamA.name = parts[0];
          teamB.name = parts[1];
        } else if (parts.length === 1) {
          // Single value - might be combined or just one team
          teamA.name = parts[0];
        }
        headerRowsParsed++;
        continue;
      }

      // Skip header row with "N." and "Name of the player"
      if (isSectionHeader(line)) {
        currentSection = 'players';
        continue;
      }

      headerRowsParsed++;
      if (headerRowsParsed > 3) {
        currentSection = 'players';
      }
    }

    if (currentSection === 'players') {
      // Expected format: Number<tab>Name<tab>License<tab>Number<tab>Name<tab>License
      // Or: Number<tab>Name<tab>License (only one team in row)
      if (parts.length >= 3) {
        // Team A player
        const numA = parseInt(parts[0], 10);
        const nameA = parts[1];
        const licenseA = parts[2];

        if (!isNaN(numA) && nameA) {
          const parsed = parsePlayerName(nameA);
          teamA.players.push({
            shirtNumber: numA,
            lastName: parsed.lastName,
            firstName: parsed.firstName,
            displayName: parsed.displayName,
            rawName: nameA,
            licenseStatus: licenseA || '',
          });
        }

        // Team B player (if present)
        if (parts.length >= 6) {
          const numB = parseInt(parts[3], 10);
          const nameB = parts[4];
          const licenseB = parts[5];

          if (!isNaN(numB) && nameB) {
            const parsed = parsePlayerName(nameB);
            teamB.players.push({
              shirtNumber: numB,
              lastName: parsed.lastName,
              firstName: parsed.firstName,
              displayName: parsed.displayName,
              rawName: nameB,
              licenseStatus: licenseB || '',
            });
          }
        }
      }
    }

    if (currentSection === 'libero') {
      // Libero format: L1<tab>Number Name<tab>License<tab>L1<tab>Number Name<tab>License
      // Or: L1<tab>Number Name<tab>License (only one team)
      if (parts.length >= 3) {
        const entryA = parseLiberoEntry(parts[1]);
        const licenseA = parts[2];

        if (entryA.name) {
          const parsed = parsePlayerName(entryA.name);
          teamA.players.push({
            shirtNumber: entryA.number,
            lastName: parsed.lastName,
            firstName: parsed.firstName,
            displayName: parsed.displayName,
            rawName: entryA.name,
            licenseStatus: licenseA || '',
          });
        }

        // Team B libero (if present)
        if (parts.length >= 6) {
          const entryB = parseLiberoEntry(parts[4]);
          const licenseB = parts[5];

          if (entryB.name) {
            const parsed = parsePlayerName(entryB.name);
            teamB.players.push({
              shirtNumber: entryB.number,
              lastName: parsed.lastName,
              firstName: parsed.firstName,
              displayName: parsed.displayName,
              rawName: entryB.name,
              licenseStatus: licenseB || '',
            });
          }
        }
      }
    }

    if (currentSection === 'officials') {
      // Officials format: Role<tab>Name<tab>Role<tab>Name
      // Or: Role<tab>Name (only one team)
      // Roles: C (coach), AC (assistant coach), AC2, AC3
      if (parts.length >= 2) {
        const roleA = parts[0];
        const nameA = parts[1];

        if (isOfficialRole(roleA) && nameA) {
          const parsed = parseOfficialName(nameA);
          teamA.officials.push({
            role: roleA.toUpperCase(),
            lastName: parsed.lastName,
            firstName: parsed.firstName,
            displayName: parsed.displayName,
            rawName: nameA,
          });
        }

        // Team B official (if present)
        if (parts.length >= 4) {
          const roleB = parts[2];
          const nameB = parts[3];

          if (isOfficialRole(roleB) && nameB) {
            const parsed = parseOfficialName(nameB);
            teamB.officials.push({
              role: roleB.toUpperCase(),
              lastName: parsed.lastName,
              firstName: parsed.firstName,
              displayName: parsed.displayName,
              rawName: nameB,
            });
          }
        }
      }
    }
  }

  // Add warnings if teams have no players
  if (teamA.players.length === 0) {
    warnings.push('No players found for Team A');
  }
  if (teamB.players.length === 0) {
    warnings.push('No players found for Team B');
  }

  // Warn if officials section wasn't found or parsed
  if (teamA.officials.length === 0 && teamB.officials.length === 0) {
    warnings.push('No officials (coaches) found - the OFFICIAL MEMBERS section may not have been recognized');
  }

  return { teamA, teamB, warnings };
}

/**
 * Get all players for a team
 * @param {ParsedTeam} team
 * @returns {ParsedPlayer[]}
 */
export function getAllPlayers(team) {
  return team.players;
}

/**
 * Get all officials for a team
 * @param {ParsedTeam} team
 * @returns {ParsedOfficial[]}
 */
export function getAllOfficials(team) {
  return team.officials;
}
