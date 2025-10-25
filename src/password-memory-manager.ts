/**
 * Remember Password Manager
 * Manage remembered passwords with timeout and categories
 */

import { App, Notice, TFile } from 'obsidian';
import SecureVaultPlugin from '../main';

export type PasswordCategory = 'vault' | 'folder' | 'file' | 'external' | 'parent-folder';

export interface RememberedPassword {
	category: PasswordCategory;
	identifier: string; // vault name, folder path, file path, or external file path
	password: string;
	rememberedAt: number;
	expiresAt: number;
}

export class PasswordMemoryManager {
	private plugin: SecureVaultPlugin;
	private app: App;
	
	// In-memory password storage (NOT persisted to disk for security)
	private rememberedPasswords: Map<string, RememberedPassword> = new Map();
	
	// Cleanup timer
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(plugin: SecureVaultPlugin, app: App) {
		this.plugin = plugin;
		this.app = app;
		this.startCleanupTimer();
	}

	/**
	 * Remember a password for a specific category and identifier
	 */
	rememberPassword(
		password: string,
		category: PasswordCategory,
		identifier: string
	): void {
		if (!this.plugin.settings.rememberPassword) {
			return; // Feature disabled
		}

		const key = this.getKey(category, identifier);
		const now = Date.now();
		const timeoutMs = this.plugin.settings.rememberPasswordTimeout * 60 * 1000;

		const remembered: RememberedPassword = {
			category,
			identifier,
			password,
			rememberedAt: now,
			expiresAt: now + timeoutMs
		};

		this.rememberedPasswords.set(key, remembered);
		
		console.log(`Password remembered for ${category}:${identifier} (expires in ${this.plugin.settings.rememberPasswordTimeout} min)`);
	}

	/**
	 * Get remembered password if available and not expired
	 */
	getRememberedPassword(
		category: PasswordCategory,
		identifier: string
	): string | null {
		if (!this.plugin.settings.rememberPassword) {
			return null; // Feature disabled
		}

		const key = this.getKey(category, identifier);
		const remembered = this.rememberedPasswords.get(key);

		if (!remembered) {
			return null;
		}

		// Check if expired
		if (Date.now() > remembered.expiresAt) {
			this.rememberedPasswords.delete(key);
			console.log(`Password expired for ${category}:${identifier}`);
			return null;
		}

		// Check if category matches current setting
		if (this.plugin.settings.rememberPasswordBy !== category) {
			// Category changed - don't return password
			return null;
		}

		return remembered.password;
	}

	/**
	 * Forget specific password
	 */
	forgetPassword(category: PasswordCategory, identifier: string): void {
		const key = this.getKey(category, identifier);
		if (this.rememberedPasswords.delete(key)) {
			console.log(`Password forgotten for ${category}:${identifier}`);
		}
	}

	/**
	 * Forget all passwords
	 */
	forgetAllPasswords(): void {
		const count = this.rememberedPasswords.size;
		this.rememberedPasswords.clear();
		console.log(`All ${count} remembered passwords cleared`);
		new Notice(`🗑️ Cleared ${count} remembered password(s)`);
	}

	/**
	 * Get all remembered passwords (for debugging/display)
	 */
	getAllRemembered(): RememberedPassword[] {
		return Array.from(this.rememberedPasswords.values());
	}

	/**
	 * Get count of remembered passwords
	 */
	getRememberedCount(): number {
		return this.rememberedPasswords.size;
	}

	/**
	 * Get formatted time until expiration
	 */
	getTimeUntilExpiration(category: PasswordCategory, identifier: string): string {
		const key = this.getKey(category, identifier);
		const remembered = this.rememberedPasswords.get(key);

		if (!remembered) {
			return 'Not remembered';
		}

		const now = Date.now();
		const remaining = remembered.expiresAt - now;

		if (remaining <= 0) {
			return 'Expired';
		}

		const minutes = Math.floor(remaining / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);

		if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	}

	/**
	 * Generate key for storage
	 */
	private getKey(category: PasswordCategory, identifier: string): string {
		return `${category}:${identifier}`;
	}

	/**
	 * Start cleanup timer to remove expired passwords
	 */
	private startCleanupTimer(): void {
		// Check every 30 seconds
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpiredPasswords();
		}, 30000);
	}

	/**
	 * Clean up expired passwords
	 */
	private cleanupExpiredPasswords(): void {
		const now = Date.now();
		let expiredCount = 0;

		for (const [key, remembered] of this.rememberedPasswords.entries()) {
			if (now > remembered.expiresAt) {
				this.rememberedPasswords.delete(key);
				expiredCount++;
			}
		}

		if (expiredCount > 0) {
			console.log(`Cleaned up ${expiredCount} expired password(s)`);
		}
	}

	/**
	 * Stop cleanup timer (called on plugin unload)
	 */
	stop(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
		
		// Clear all passwords on plugin unload for security
		this.forgetAllPasswords();
	}

	/**
	 * Helper: Try to get remembered password or return null
	 * Automatically determines category based on identifier
	 */
	tryGetPassword(identifier: string): string | null {
		if (!this.plugin.settings.rememberPassword) {
			return null;
		}

		// Try to determine category from identifier
		let category: PasswordCategory = this.plugin.settings.rememberPasswordBy;

		// Override based on identifier pattern
		if (identifier.includes('/') || identifier.includes('\\')) {
			// Looks like a file or folder path
			if (identifier.endsWith('.md') || identifier.endsWith('.secvault')) {
				category = 'file';
			} else {
				category = 'folder';
			}
		}

		return this.getRememberedPassword(category, identifier);
	}

	/**
	 * Get parent folder path from file path
	 */
	getParentFolder(filePath: string): string {
		const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
		if (lastSlash === -1) {
			return '';
		}
		return filePath.substring(0, lastSlash);
	}

	/**
	 * Remember password with smart category detection
	 */
	rememberPasswordSmart(password: string, identifier: string): void {
		if (!this.plugin.settings.rememberPassword) {
			return;
		}

		const category = this.plugin.settings.rememberPasswordBy;

		// If parent-folder mode, use parent folder as identifier
		if (category === 'parent-folder') {
			const parentFolder = this.getParentFolder(identifier);
			if (parentFolder) {
				this.rememberPassword(password, 'parent-folder', parentFolder);
				console.log(`Password remembered for parent folder: ${parentFolder}`);
				return;
			}
		}

		// Default behavior
		this.rememberPassword(password, category, identifier);
	}

	/**
	 * Try to get password with smart detection (including parent folder)
	 */
	tryGetPasswordSmart(identifier: string): string | null {
		if (!this.plugin.settings.rememberPassword) {
			return null;
		}

		const category = this.plugin.settings.rememberPasswordBy;

		// Try parent-folder first if enabled
		if (category === 'parent-folder') {
			const parentFolder = this.getParentFolder(identifier);
			if (parentFolder) {
				const password = this.getRememberedPassword('parent-folder', parentFolder);
				if (password) {
					return password;
				}
			}
		}

		// Try exact match
		return this.getRememberedPassword(category, identifier);
	}
}
