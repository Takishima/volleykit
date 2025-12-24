export * from "./types";
export * from "./assignments";
export * from "./compensations";
export * from "./exchange";
export * from "./settings";

import type { TourId } from "@/stores/tour";
import type { TourDefinition } from "./types";
import { assignmentsTour } from "./assignments";
import { compensationsTour } from "./compensations";
import { exchangeTour } from "./exchange";
import { settingsTour } from "./settings";

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
