/**
 * Widget Data Bridge Service
 *
 * Bridges the React Native app with native home screen widgets.
 * Updates widget data whenever assignments are fetched or changed.
 */

import { getWidgetAdapter, createWidgetData } from '../platform/widgets';
import type { WidgetAssignment, WidgetData } from '../types/widget';

/**
 * Assignment data from the app (before conversion to widget format).
 */
export interface AppAssignment {
  id: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  venue?: {
    name: string;
    address?: string;
  };
  position?: string;
  league?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}

/**
 * Convert app assignment to widget assignment format.
 */
function convertToWidgetAssignment(assignment: AppAssignment): WidgetAssignment {
  return {
    id: assignment.id,
    gameTime: assignment.gameTime,
    homeTeam: assignment.homeTeam,
    awayTeam: assignment.awayTeam,
    venueName: assignment.venue?.name ?? 'TBD',
    position: assignment.position ?? '',
    league: assignment.league ?? '',
    status: assignment.status === 'confirmed' ? 'confirmed' : 'pending',
  };
}

/**
 * Widget data bridge service.
 */
export interface WidgetDataBridgeService {
  /** Update widget with new assignment data */
  updateAssignments(
    assignments: AppAssignment[],
    isLoggedIn: boolean,
    userName?: string
  ): Promise<void>;
  /** Clear widget data (e.g., on logout) */
  clearData(): Promise<void>;
  /** Get current widget data */
  getData(): Promise<WidgetData | null>;
  /** Force widget refresh */
  refresh(): Promise<void>;
}

/**
 * Update widget with new assignment data.
 */
async function updateAssignments(
  assignments: AppAssignment[],
  isLoggedIn: boolean,
  userName?: string
): Promise<void> {
  const adapter = await getWidgetAdapter();

  if (!adapter.isSupported()) {
    return;
  }

  // Convert assignments to widget format
  const widgetAssignments = assignments
    .filter((a) => a.status !== 'cancelled')
    .map(convertToWidgetAssignment);

  // Create widget data
  const widgetData = createWidgetData(widgetAssignments, isLoggedIn, userName);

  // Update widget
  await adapter.updateWidgetData(widgetData);
}

/**
 * Clear widget data.
 */
async function clearData(): Promise<void> {
  const adapter = await getWidgetAdapter();

  if (!adapter.isSupported()) {
    return;
  }

  await adapter.clearWidgetData();
}

/**
 * Get current widget data.
 */
async function getData(): Promise<WidgetData | null> {
  const adapter = await getWidgetAdapter();

  if (!adapter.isSupported()) {
    return null;
  }

  return adapter.getWidgetData();
}

/**
 * Force widget refresh.
 */
async function refresh(): Promise<void> {
  const adapter = await getWidgetAdapter();

  if (!adapter.isSupported()) {
    return;
  }

  await adapter.reloadAllTimelines();
}

/**
 * Widget data bridge service instance.
 */
export const widgetDataBridge: WidgetDataBridgeService = {
  updateAssignments,
  clearData,
  getData,
  refresh,
};

/**
 * Hook callback to update widget after successful assignment fetch.
 * This should be called from useAssignments hook.
 */
export async function onAssignmentsFetched(
  assignments: AppAssignment[],
  isLoggedIn: boolean,
  userName?: string
): Promise<void> {
  try {
    await widgetDataBridge.updateAssignments(assignments, isLoggedIn, userName);
  } catch (error) {
    // Don't fail the main flow if widget update fails
    console.warn('Widget update failed:', error);
  }
}

/**
 * Hook callback to clear widget on logout.
 */
export async function onUserLogout(): Promise<void> {
  try {
    await widgetDataBridge.clearData();
  } catch (error) {
    console.warn('Widget clear failed:', error);
  }
}
