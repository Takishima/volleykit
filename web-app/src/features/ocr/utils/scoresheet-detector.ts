/**
 * Scoresheet Type Definition
 *
 * Defines the scoresheet types supported by the OCR feature.
 * The user selects the type manually when scanning a scoresheet.
 *
 * - `manuscript`: Handwritten scoresheets with variable formatting
 * - `electronic`: Printed/electronic scoresheets with consistent tab-separated columns
 */

export type ScoresheetType = 'manuscript' | 'electronic';
