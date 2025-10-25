/**
 * Auto-Lock Timer System
 * Automatically locks the vault after a period of inactivity
 */

import { App, TFile, Workspace, Notice } from 'obsidian';
import SecureVaultPlugin from '../main';

export class AutoLockManager {
	private plugin: SecureVaultPlugin;
	private app: App;
	private lastActivityTime: number;
	private checkTimer: NodeJS.Timeout | null = null;
	private CHECK_INTERVAL = 10000; // Check every 10 seconds

	constructor(plugin: SecureVaultPlugin, app: App) {
		this.plugin = plugin;
		this.app = app;
		this.lastActivityTime = Date.now();
	}

	/**
	 * Start auto-lock timer
	 */
	start() {
		if (this.checkTimer) {
			return; // Already running
		}

		// Register activity listeners
		this.registerActivityListeners();

		// Start periodic check
		this.checkTimer = setInterval(() => {
			this.checkInactivity();
		}, this.CHECK_INTERVAL);

		console.log('AutoLock timer started');
	}

	/**
	 * Stop auto-lock timer
	 */
	stop() {
		if (this.checkTimer) {
			clearInterval(this.checkTimer);
			this.checkTimer = null;
		}
		console.log('AutoLock timer stopped');
	}

	/**
	 * Reset activity timer (user did something)
	 */
	resetActivity() {
		this.lastActivityTime = Date.now();
	}

	/**
	 * Register event listeners to track user activity
	 */
	private registerActivityListeners() {
		const workspace = this.app.workspace;

		// File open
		this.plugin.registerEvent(
			workspace.on('file-open', () => {
				this.resetActivity();
			})
		);

		// File modified
		this.plugin.registerEvent(
			workspace.on('editor-change', () => {
				this.resetActivity();
			})
		);

		// Layout change (tab switching, etc)
		this.plugin.registerEvent(
			workspace.on('layout-change', () => {
				this.resetActivity();
			})
		);

		// Mouse/keyboard activity
		this.plugin.registerDomEvent(document, 'mousedown', () => {
			this.resetActivity();
		});

		this.plugin.registerDomEvent(document, 'keydown', () => {
			this.resetActivity();
		});
	}

	/**
	 * Check if user has been inactive and lock if needed
	 */
	private checkInactivity() {
		// Check if auto-lock is enabled
		if (!this.plugin.settings.autoLockEnabled) {
			return;
		}

		// Check if any encrypted folders are unlocked
		const hasUnlockedFolders = this.plugin.settings.encryptedFolders.some(
			folder => folder.isUnlocked
		);

		if (!hasUnlockedFolders) {
			return; // Nothing to lock
		}

		// Calculate inactivity duration
		const now = Date.now();
		const inactiveMs = now - this.lastActivityTime;
		const inactiveMinutes = inactiveMs / 60000;

		// Check if we should lock
		if (inactiveMinutes >= this.plugin.settings.autoLockTimeout) {
			this.lockAllVaults();
		}
	}

	/**
	 * Lock all unlocked vaults
	 */
	private lockAllVaults() {
		let lockedCount = 0;

		this.plugin.settings.encryptedFolders.forEach(folder => {
			if (folder.isUnlocked) {
				folder.isUnlocked = false;
				folder.unlockedAt = undefined;
				lockedCount++;
			}
		});

		if (lockedCount > 0) {
			this.plugin.saveSettings();
			
			// Show notice
			const timeoutMins = this.plugin.settings.autoLockTimeout;
			new Notice(
				`🔒 Auto-locked ${lockedCount} vault(s) after ${timeoutMins} minute(s) of inactivity`
			);
			
			console.log(`Auto-locked ${lockedCount} vault(s)`);
		}
	}

	/**
	 * Get time until auto-lock (in seconds)
	 */
	getTimeUntilLock(): number {
		if (!this.plugin.settings.autoLockEnabled) {
			return -1;
		}

		const now = Date.now();
		const inactiveMs = now - this.lastActivityTime;
		const timeoutMs = this.plugin.settings.autoLockTimeout * 60000;
		const remainingMs = timeoutMs - inactiveMs;

		return Math.max(0, Math.floor(remainingMs / 1000));
	}

	/**
	 * Get formatted time until auto-lock
	 */
	getFormattedTimeUntilLock(): string {
		const seconds = this.getTimeUntilLock();
		
		if (seconds < 0) {
			return 'Disabled';
		}

		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;

		if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}
}
