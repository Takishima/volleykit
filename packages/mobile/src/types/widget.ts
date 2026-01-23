/**
 * Widget data types for home screen widgets.
 *
 * Defines the data structure shared between the React Native app
 * and native iOS/Android widgets.
 */

/**
 * Assignment data optimized for widget display.
 */
export interface WidgetAssignment {
  /** Assignment ID for deep linking */
  id: string
  /** Game date/time in ISO 8601 format */
  gameTime: string
  /** Home team name */
  homeTeam: string
  /** Away team name */
  awayTeam: string
  /** Venue/hall name */
  venueName: string
  /** Referee position (e.g., "1. Schiedsrichter") */
  position: string
  /** League name */
  league: string
  /** Assignment status */
  status: 'confirmed' | 'pending'
}

/**
 * Widget data structure shared with native widgets.
 */
export interface WidgetData {
  /** List of upcoming assignments (max 3) */
  assignments: WidgetAssignment[]
  /** Last data update timestamp in ISO 8601 format */
  lastUpdatedAt: string
  /** User's display name (optional) */
  userName?: string
  /** Whether the user is logged in */
  isLoggedIn: boolean
}

/**
 * Widget size variants.
 */
export type WidgetSize = 'small' | 'medium' | 'large'

/**
 * Widget family for iOS.
 */
export type IOSWidgetFamily = 'systemSmall' | 'systemMedium' | 'systemLarge'

/**
 * Default empty widget data.
 */
export const EMPTY_WIDGET_DATA: WidgetData = {
  assignments: [],
  lastUpdatedAt: new Date().toISOString(),
  isLoggedIn: false,
}

/**
 * Maximum number of assignments to show in widget.
 */
export const MAX_WIDGET_ASSIGNMENTS = 3

/**
 * App group identifier for iOS data sharing.
 */
export const IOS_APP_GROUP = 'group.ch.volleyball.volleykit'

/**
 * Shared preferences key for Android widget data.
 */
export const ANDROID_WIDGET_PREFS_KEY = 'volleykit_widget_data'
