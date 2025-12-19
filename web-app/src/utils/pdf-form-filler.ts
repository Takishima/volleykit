import type { Assignment } from '@/api/client';
import { format } from 'date-fns';

export type LeagueCategory = 'NLA' | 'NLB';
export type Language = 'de' | 'fr';
export type Gender = 'm' | 'f';

export function mapAppLocaleToPdfLanguage(appLocale: string): Language {
  if (appLocale === 'fr' || appLocale === 'it') {
    return 'fr';
  }
  return 'de';
}

export interface SportsHallReportData {
  gameNumber: string;
  homeTeam: string;
  awayTeam: string;
  gender: Gender;
  hallName: string;
  location: string;
  date: string;
  firstRefereeName?: string;
  secondRefereeName?: string;
}

function formatDateForReport(isoString: string | undefined): string {
  if (!isoString) return '';
  try {
    return format(new Date(isoString), 'dd.MM.yyyy');
  } catch {
    // Invalid date format - return empty string so form field shows blank
    console.warn('Failed to parse date for PDF report:', isoString);
    return '';
  }
}

function getRefereeName(
  convocation:
    | {
        indoorAssociationReferee?: {
          indoorReferee?: {
            person?: {
              firstName?: string;
              lastName?: string;
              displayName?: string;
            };
          };
        };
      }
    | null
    | undefined
): string | undefined {
  const person = convocation?.indoorAssociationReferee?.indoorReferee?.person;
  if (!person) return undefined;
  return person.displayName || `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || undefined;
}

export function extractSportsHallReportData(assignment: Assignment): SportsHallReportData | null {
  const game = assignment.refereeGame?.game;
  if (!game) return null;

  const leagueCategoryName = game.group?.phase?.league?.leagueCategory?.name;
  if (leagueCategoryName !== 'NLA' && leagueCategoryName !== 'NLB') {
    return null;
  }

  const refereeGame = assignment.refereeGame;
  const firstReferee = getRefereeName(refereeGame?.activeRefereeConvocationFirstHeadReferee);
  const secondReferee = getRefereeName(refereeGame?.activeRefereeConvocationSecondHeadReferee);

  return {
    gameNumber: game.number?.toString() ?? '',
    homeTeam: game.encounter?.teamHome?.name ?? '',
    awayTeam: game.encounter?.teamAway?.name ?? '',
    gender: (game.group?.phase?.league?.gender ?? 'm') as Gender,
    hallName: game.hall?.name ?? '',
    location: game.hall?.primaryPostalAddress?.city ?? '',
    date: formatDateForReport(game.startingDateTime),
    firstRefereeName: firstReferee,
    secondRefereeName: secondReferee,
  };
}

export function getLeagueCategoryFromAssignment(assignment: Assignment): LeagueCategory | null {
  const name = assignment.refereeGame?.game?.group?.phase?.league?.leagueCategory?.name;
  if (name === 'NLA' || name === 'NLB') {
    return name;
  }
  return null;
}

interface FieldMapping {
  gameNumber: string;
  homeTeam: string;
  awayTeam: string;
  genderRadio: string;
  hallName: string;
  location: string;
  date: string;
  firstRefereeName: string;
  secondRefereeName: string;
}

const NLA_FIELD_MAPPING: FieldMapping = {
  gameNumber: 'SpielNr',
  homeTeam: 'Heimteam',
  awayTeam: 'Gastteam',
  genderRadio: 'Gruppe3',
  hallName: 'Hallenname',
  location: 'Ort',
  date: 'Datum',
  firstRefereeName: 'Text19',
  secondRefereeName: 'Text20',
};

const NLB_FIELD_MAPPING: FieldMapping = {
  gameNumber: 'Text9',
  homeTeam: 'Text10',
  awayTeam: 'Text11',
  genderRadio: 'Gruppe15',
  hallName: 'Text12',
  location: 'Text13',
  date: 'Text14',
  firstRefereeName: 'Text23',
  secondRefereeName: 'Text24',
};

function getFieldMapping(leagueCategory: LeagueCategory): FieldMapping {
  return leagueCategory === 'NLA' ? NLA_FIELD_MAPPING : NLB_FIELD_MAPPING;
}

function getPdfPath(leagueCategory: LeagueCategory, language: Language): string {
  const categoryPath = leagueCategory === 'NLA' ? 'nla-' : '';
  // Use import.meta.env.BASE_URL to handle deployment to subdirectories (e.g., /volleykit/)
  const basePath = import.meta.env.BASE_URL || '/';
  return `${basePath}assets/pdf/sports-hall-report-${categoryPath}${language}.pdf`;
}

export async function fillSportsHallReportForm(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<Uint8Array> {
  // Dynamic import to keep pdf-lib out of the main bundle
  const { PDFDocument } = await import('pdf-lib');

  const pdfPath = getPdfPath(leagueCategory, language);
  const response = await fetch(pdfPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF template: ${response.statusText}`);
  }
  const pdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();
  const mapping = getFieldMapping(leagueCategory);

  form.getTextField(mapping.gameNumber).setText(data.gameNumber);
  form.getTextField(mapping.homeTeam).setText(data.homeTeam);
  form.getTextField(mapping.awayTeam).setText(data.awayTeam);
  form.getTextField(mapping.hallName).setText(data.hallName);
  form.getTextField(mapping.location).setText(data.location);
  form.getTextField(mapping.date).setText(data.date);

  // Select gender radio button with fallback for different naming conventions
  const genderRadio = form.getRadioGroup(mapping.genderRadio);
  const genderOption = data.gender === 'm' ? 'M' : 'F';
  try {
    genderRadio.select(genderOption);
  } catch {
    const options = genderRadio.getOptions();
    const matchingOption = options.find(
      (opt) => opt.toUpperCase().startsWith(genderOption) || opt.includes(genderOption)
    );
    if (matchingOption) {
      genderRadio.select(matchingOption);
    } else {
      console.warn(`Could not find gender option "${genderOption}" in PDF form`);
    }
  }

  if (data.firstRefereeName) {
    form.getTextField(mapping.firstRefereeName).setText(data.firstRefereeName);
  }
  if (data.secondRefereeName) {
    form.getTextField(mapping.secondRefereeName).setText(data.secondRefereeName);
  }

  return pdfDoc.save();
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateAndDownloadSportsHallReport(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<void> {
  const pdfBytes = await fillSportsHallReportForm(data, leagueCategory, language);
  const filename = `sports-hall-report-${data.gameNumber}-${language}.pdf`;
  downloadPdf(pdfBytes, filename);
}
