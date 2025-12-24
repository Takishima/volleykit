/**
 * Demo compensation calculation utilities.
 * Provides rate calculations and expense formatting for demo mode.
 */

import { formatDistanceKm, metresToKilometres } from "@/utils/distance";

// Compensation rates per association type (CHF)
// SV (national) has higher rates than regional associations
export const COMPENSATION_RATES = {
  SV: {
    HEAD_REFEREE: 100,
    SECOND_HEAD_REFEREE: 80,
    LINESMAN: 60,
    SECOND_LINESMAN: 50,
  },
  REGIONAL: {
    HEAD_REFEREE: 60,
    SECOND_HEAD_REFEREE: 50,
    LINESMAN: 40,
    SECOND_LINESMAN: 30,
  },
} as const;

export const TRAVEL_EXPENSE_RATE_PER_KM = 0.7;

// Sample distances in metres for demo compensation records
export const SAMPLE_DISTANCES = {
  SHORT: 24000,
  MEDIUM: 35000,
  MEDIUM_LONG: 48000,
  LONG: 62000,
  VERY_LONG: 89000,
} as const;

export type RefereePosition = "head-one" | "head-two" | "linesman-one" | "linesman-two";

export function calculateTravelExpenses(distanceInMetres: number): number {
  const distanceInKm = metresToKilometres(distanceInMetres);
  return Math.round(distanceInKm * TRAVEL_EXPENSE_RATE_PER_KM * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

export function calculateTotalCost(
  gameCompensation: number,
  travelExpenses: number,
): string {
  return formatCurrency(gameCompensation + travelExpenses);
}

export function getCompensationForPosition(
  position: RefereePosition,
  isSV: boolean,
): number {
  const rates = isSV ? COMPENSATION_RATES.SV : COMPENSATION_RATES.REGIONAL;
  switch (position) {
    case "head-one":
      return rates.HEAD_REFEREE;
    case "head-two":
      return rates.SECOND_HEAD_REFEREE;
    case "linesman-one":
      return rates.LINESMAN;
    case "linesman-two":
      return rates.SECOND_LINESMAN;
  }
}

export interface CompensationParams {
  position: RefereePosition;
  distanceInMetres: number;
  isSV: boolean;
  paymentDone: boolean;
  paymentValueDate?: string;
  transportationMode?: "car" | "train";
  correctionReason?: string | null;
}

export function createCompensationData({
  position,
  distanceInMetres,
  isSV,
  paymentDone,
  paymentValueDate,
  transportationMode = "car",
  correctionReason = null,
}: CompensationParams) {
  const gameCompensation = getCompensationForPosition(position, isSV);
  const travelExpenses = calculateTravelExpenses(distanceInMetres);

  return {
    gameCompensation,
    gameCompensationFormatted: formatCurrency(gameCompensation),
    travelExpenses,
    travelExpensesFormatted: formatCurrency(travelExpenses),
    distanceInMetres,
    distanceFormatted: formatDistanceKm(distanceInMetres),
    costFormatted: calculateTotalCost(gameCompensation, travelExpenses),
    transportationMode,
    paymentDone,
    correctionReason,
    ...(paymentDone && paymentValueDate && { paymentValueDate }),
    hasFlexibleGameCompensations: false,
    hasFlexibleTravelExpenses: isSV,
    hasFlexibleOvernightStayExpenses: false,
    hasFlexibleCateringExpenses: false,
    overnightStayExpensesFormatted: "0.00",
    cateringExpensesFormatted: "0.00",
  };
}
