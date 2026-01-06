export * from "./types";
export * from "@/features/assignments/assignments";
export * from "@/features/compensations/compensations";
export * from "@/features/exchanges/exchange";
export * from "@/features/settings/settings";

import type { TourId } from "@/shared/stores/tour";
import type { TourDefinition } from "./types";
import { assignmentsTour } from "@/features/assignments/assignments";
import { compensationsTour } from "@/features/compensations/compensations";
import { exchangeTour } from "@/features/exchanges/exchange";
import { settingsTour } from "@/features/settings/settings";

export const tourDefinitions: Record<TourId, TourDefinition> = {
  assignments: assignmentsTour,
  compensations: compensationsTour,
  exchange: exchangeTour,
  settings: settingsTour,
};

export function getTourDefinition(tourId: TourId): TourDefinition {
  return tourDefinitions[tourId];
}

export function getTourStepCount(tourId: TourId): number {
  return tourDefinitions[tourId].steps.length;
}
