import { PDFDocument } from 'pdf-lib';
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
  return `/assets/pdf/sports-hall-report-${categoryPath}${language}.pdf`;
}

async function loadPdfTemplate(pdfPath: string): Promise<PDFDocument> {
  const response = await fetch(pdfPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF template: ${response.statusText}`);
  }
  const pdfBytes = await response.arrayBuffer();
  return PDFDocument.load(pdfBytes);
}

function selectGenderOption(
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  gender: Gender
): void {
  const genderRadio = form.getRadioGroup(fieldName);
  const genderOption = gender === 'm' ? 'M' : 'F';
  try {
    genderRadio.select(genderOption);
  } catch {
    // PDF radio options may use different naming conventions
    const options = genderRadio.getOptions();
    const matchingOption = options.find(
      (opt) => opt.toUpperCase().startsWith(genderOption) || opt.includes(genderOption)
    );
    if (matchingOption) {
      genderRadio.select(matchingOption);
    }
  }
}

export async function fillSportsHallReportForm(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<Uint8Array> {
  const pdfPath = getPdfPath(leagueCategory, language);
  const pdfDoc = await loadPdfTemplate(pdfPath);
  const form = pdfDoc.getForm();
  const mapping = getFieldMapping(leagueCategory);

  form.getTextField(mapping.gameNumber).setText(data.gameNumber);
  form.getTextField(mapping.homeTeam).setText(data.homeTeam);
  form.getTextField(mapping.awayTeam).setText(data.awayTeam);
  form.getTextField(mapping.hallName).setText(data.hallName);
  form.getTextField(mapping.location).setText(data.location);
  form.getTextField(mapping.date).setText(data.date);

  selectGenderOption(form, mapping.genderRadio, data.gender);

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
