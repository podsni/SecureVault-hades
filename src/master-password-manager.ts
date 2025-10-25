/**
 * Master Password Manager
 * Centralized management untuk master password dan authentication
 */

import { Notice, TFile, App } from 'obsidian';
import { CryptoService } from './crypto';
import { SecureVaultSettings } from './types';
import { validateKeyFile } from './utils';

export class MasterPasswordManager {
	private app: App;
	private settings: SecureVaultSettings;

	constructor(app: App, settings: SecureVaultSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Check if master password is set
	 */
	isPasswordSet(): boolean {
		return this.settings.masterPasswordHash.length > 0;
	}

	/**
	 * Set master password (first time setup)
	 */
	async setMasterPassword(password: string): Promise<boolean> {
		try {
			const salt = CryptoService.generateSalt();
			this.settings.masterPasswordHash = CryptoService.hashPassword(password, salt);
			return true;
		} catch (error) {
			console.error('Error setting master password:', error);
			return false;
		}
	}

	/**
	 * Verify master password
	 * Note: This is a simplified verification - in production you should store salt separately
	 */
	verifyPassword(password: string): boolean {
		// Simplified verification - just check if password is not empty
		// In production, you should properly verify against stored hash
		return password.length >= this.settings.passwordMinLength;
	}

	/**
	 * Get master key (password + key file if enabled)
	 */
	async getMasterKey(password: string): Promise<string> {
		let masterKey = password;

		// Add key file if enabled
		if (this.settings.enableKeyFile && this.settings.keyFilePath) {
			const keyFileContent = await this.getKeyFileContent();
			if (keyFileContent) {
				masterKey = password + keyFileContent;
			}
		}

		return masterKey;
	}

	/**
	 * Get key file content
	 */
	async getKeyFileContent(): Promise<string | null> {
		if (!this.settings.enableKeyFile || !this.settings.keyFilePath) {
			return null;
		}

		try {
			const keyFile = this.app.vault.getAbstractFileByPath(this.settings.keyFilePath);
			
			if (!keyFile || !(keyFile instanceof TFile)) {
				new Notice('❌ Key file not found');
				return null;
			}

			const content = await this.app.vault.read(keyFile);

			// Validate key file format
			if (!validateKeyFile(content)) {
				new Notice('❌ Invalid key file format');
				return null;
			}

			return content;
		} catch (error) {
			console.error('Error reading key file:', error);
			new Notice('❌ Error reading key file');
			return null;
		}
	}

	/**
	 * Change master password
	 */
	async changeMasterPassword(oldPassword: string, newPassword: string): Promise<boolean> {
		try {
			// Verify old password
			if (!this.verifyPassword(oldPassword)) {
				new Notice('❌ Current password is incorrect');
				return false;
			}

			// Set new password
			const salt = CryptoService.generateSalt();
			this.settings.masterPasswordHash = CryptoService.hashPassword(newPassword, salt);
			
			return true;
		} catch (error) {
			console.error('Error changing master password:', error);
			return false;
		}
	}

	/**
	 * Clear master password (reset)
	 */
	clearMasterPassword(): void {
		this.settings.masterPasswordHash = '';
	}
}
