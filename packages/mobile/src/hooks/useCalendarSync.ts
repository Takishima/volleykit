/**
 * Calendar sync hook
 *
 * Provides calendar synchronization functionality with TanStack Query integration.
 */

import { useState, useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useStorage } from '@volleykit/shared/adapters';
import { queryKeys } from '@volleykit/shared/api';
import type { Assignment } from '@volleykit/shared/api';

import { CALENDAR_SETTINGS_KEY } from '../constants';
import { calendar } from '../platform/calendar';
import { calendarSyncService } from '../services/calendarSync';
import { calendarMappingsStore } from '../stores/calendarMappings';

import type { CalendarEventMapping, CalendarSettings } from '../types/calendar';

export interface UseCalendarSyncResult {
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Last sync error */
  error: Error | null;
  /** Sync all assignments to calendar */
  syncAssignments: (assignments: Assignment[]) => Promise<{
    created: number;
    updated: number;
    deleted: number;
  }>;
  /** Create events for specific assignments */
  createEvents: (assignments: Assignment[]) => Promise<CalendarEventMapping[]>;
  /** Update events for specific assignments */
  updateEvents: (assignments: Assignment[]) => Promise<void>;
  /** Delete orphaned events */
  cleanupOrphans: (currentAssignmentIds: string[]) => Promise<void>;
  /** Check if an assignment has a calendar event */
  hasCalendarEvent: (assignmentId: string) => Promise<boolean>;
  /** Remove all calendar events */
  removeAllEvents: () => Promise<void>;
}

export function useCalendarSync(): UseCalendarSyncResult {
  const { storage } = useStorage();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Load calendar settings
  const getSettings = useCallback(async (): Promise<CalendarSettings | null> => {
    try {
      const data = await storage.getItem(CALENDAR_SETTINGS_KEY);
      if (!data) return null;
      return JSON.parse(data) as CalendarSettings;
    } catch {
      return null;
    }
  }, [storage]);

  // Save last sync timestamp
  const updateLastSync = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;

    await storage.setItem(
      CALENDAR_SETTINGS_KEY,
      JSON.stringify({
        ...settings,
        lastSyncAt: new Date().toISOString(),
      })
    );
  }, [storage, getSettings]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (assignments: Assignment[]) => {
      const settings = await getSettings();
      if (!settings?.selectedCalendarId) {
        throw new Error('No calendar selected');
      }

      if (settings.syncMode !== 'direct') {
        throw new Error('Direct sync not enabled');
      }

      // Check permissions
      const hasPermission = await calendar.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permission denied');
      }

      const result = await calendarSyncService.syncAll(
        storage,
        settings.selectedCalendarId,
        assignments
      );

      await updateLastSync();

      return result;
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    },
    onSuccess: () => {
      setError(null);
      // Invalidate assignments query to refresh UI
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });

  // Sync all assignments
  const syncAssignments = useCallback(
    async (assignments: Assignment[]) => {
      return syncMutation.mutateAsync(assignments);
    },
    [syncMutation]
  );

  // Create events for specific assignments
  const createEvents = useCallback(
    async (assignments: Assignment[]): Promise<CalendarEventMapping[]> => {
      const settings = await getSettings();
      if (!settings?.selectedCalendarId) {
        throw new Error('No calendar selected');
      }

      return calendarSyncService.createEventsFromAssignments(
        storage,
        settings.selectedCalendarId,
        assignments
      );
    },
    [storage, getSettings]
  );

  // Update events for specific assignments
  const updateEvents = useCallback(
    async (assignments: Assignment[]): Promise<void> => {
      await calendarSyncService.updateEvents(storage, assignments);
    },
    [storage]
  );

  // Delete orphaned events
  const cleanupOrphans = useCallback(
    async (currentAssignmentIds: string[]): Promise<void> => {
      await calendarSyncService.deleteOrphanedEvents(storage, currentAssignmentIds);
    },
    [storage]
  );

  // Check if an assignment has a calendar event
  const hasCalendarEvent = useCallback(
    async (assignmentId: string): Promise<boolean> => {
      const mapping = await calendarMappingsStore.getMapping(storage, assignmentId);
      return mapping !== null;
    },
    [storage]
  );

  // Remove all calendar events
  const removeAllEvents = useCallback(async (): Promise<void> => {
    const mappings = await calendarMappingsStore.getMappings(storage);

    for (const mapping of mappings) {
      try {
        await calendar.deleteEvent(mapping.calendarEventId);
      } catch {
        // Event may already be deleted, ignore error
      }
    }

    await calendarMappingsStore.clearMappings(storage);
  }, [storage]);

  return {
    isSyncing: syncMutation.isPending,
    error,
    syncAssignments,
    createEvents,
    updateEvents,
    cleanupOrphans,
    hasCalendarEvent,
    removeAllEvents,
  };
}
