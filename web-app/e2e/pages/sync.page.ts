import { type Page, type Locator, expect } from '@playwright/test'

import { BasePage } from './base.page'

/**
 * Page Object Model for sync-related UI elements.
 * Provides helpers for testing offline sync functionality.
 */
export class SyncPage extends BasePage {
  readonly syncIndicator: Locator
  readonly pendingBadge: Locator
  readonly syncResultsModal: Locator
  readonly offlineIndicator: Locator

  constructor(page: Page) {
    super(page)
    this.syncIndicator = page.getByTestId('sync-status-indicator')
    this.pendingBadge = page.getByTestId('pending-sync-badge')
    this.syncResultsModal = page.getByRole('dialog', { name: /sync results/i })
    this.offlineIndicator = page.getByTestId('sync-status-offline')
  }

  /**
   * Check if sync indicator shows pending items.
   */
  async expectPendingIndicator() {
    await expect(this.syncIndicator).toBeVisible()
    await expect(this.syncIndicator).toContainText(/pending/i)
  }

  /**
   * Check if the sync indicator is hidden (nothing to sync).
   */
  async expectNoSyncIndicator() {
    await expect(this.syncIndicator).not.toBeVisible()
  }

  /**
   * Get the pending count from the sync indicator.
   */
  async getPendingCount(): Promise<number> {
    const text = await this.syncIndicator.textContent()
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Check if sync results modal is visible.
   */
  async expectSyncResultsModal() {
    await expect(this.syncResultsModal).toBeVisible()
  }

  /**
   * Dismiss the sync results modal.
   */
  async dismissSyncResultsModal() {
    const dismissButton = this.syncResultsModal.getByRole('button', { name: /dismiss/i })
    await dismissButton.click()
    await expect(this.syncResultsModal).not.toBeVisible()
  }

  /**
   * Check if offline indicator is visible.
   */
  async expectOfflineIndicator() {
    await expect(this.offlineIndicator).toBeVisible()
  }

  /**
   * Check if offline indicator is not visible.
   */
  async expectOnline() {
    await expect(this.offlineIndicator).not.toBeVisible()
  }

  /**
   * Wait for sync to complete (syncing indicator to disappear).
   */
  async waitForSyncComplete() {
    const syncingIndicator = this.page.getByTestId('sync-status-syncing')
    // Wait for syncing indicator to appear then disappear
    await expect(syncingIndicator).not.toBeVisible({ timeout: 10000 })
  }
}
