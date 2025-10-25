/**
 * Individual File Encryption
 * Support for encrypting/decrypting individual files (not just folders)
 */

import { App, TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import { CryptoService } from './crypto';
import SecureVaultPlugin from '../main';

export interface EncryptedFile {
	path: string;
	originalPath: string; // Original path before rename
	originalExtension: string;
	encryptedAt: number;
	salt: string;
	iv: string;
	isAttachment: boolean; // true if image/pdf/video
}

export class FileEncryptionManager {
	private plugin: SecureVaultPlugin;
	private app: App;
	
	// Track individually encrypted files
	private encryptedFiles: Map<string, EncryptedFile> = new Map();
	
	// Quick unlocked files (temporary unlock without password)
	private quickUnlockedFiles: Map<string, number> = new Map(); // path -> unlock timestamp

	constructor(plugin: SecureVaultPlugin, app: App) {
		this.plugin = plugin;
		this.app = app;
		this.loadEncryptedFiles();
		this.startQuickUnlockCleanup();
	}

	/**
	 * Check if file is encrypted
	 */
	isFileEncrypted(filePath: string): boolean {
		return this.encryptedFiles.has(filePath);
	}

	/**
	 * Check if file is quick-unlocked
	 */
	isFileQuickUnlocked(filePath: string): boolean {
		return this.quickUnlockedFiles.has(filePath);
	}

	/**
	 * Get file extension
	 */
	private getExtension(filePath: string): string {
		const lastDot = filePath.lastIndexOf('.');
		if (lastDot === -1) return '';
		return filePath.substring(lastDot + 1).toLowerCase();
	}

	/**
	 * Check if file is an attachment (image, pdf, video)
	 */
	isAttachment(filePath: string): boolean {
		const ext = this.getExtension(filePath);
		return this.plugin.settings.attachmentTypes.includes(ext);
	}

	/**
	 * Encrypt a single file
	 */
	async encryptFile(
		file: TFile,
		password: string,
		keyFileContent?: string
	): Promise<boolean> {
		try {
			const isAttachment = this.isAttachment(file.path);
			
			// Check if attachments are enabled
			if (isAttachment && !this.plugin.settings.encryptAttachments) {
				new Notice('❌ Attachment encryption is disabled in settings');
				return false;
			}

			// Store original path before any rename
			const originalPath = file.path;
			const originalExtension = this.getExtension(file.path);

			// Read file content
			let contentString: string;
			
			if (isAttachment) {
				// Binary file - read as ArrayBuffer and convert to base64
				const arrayBuffer = await this.app.vault.readBinary(file);
				const bytes = new Uint8Array(arrayBuffer);
				let binary = '';
				for (let i = 0; i < bytes.length; i++) {
					binary += String.fromCharCode(bytes[i]);
				}
				contentString = btoa(binary); // Convert to base64
			} else {
				// Text file
				contentString = await this.app.vault.read(file);
			}

			// Combine password with key file if available
			const masterKey = keyFileContent 
				? password + keyFileContent 
				: password;

			// Encrypt
			const encrypted = CryptoService.encrypt(
				contentString, 
				masterKey,
				this.plugin.settings.encryptionAlgorithm
			);

			// Store metadata
			const metadata: EncryptedFile = {
				path: file.path, // Will be updated after rename
				originalPath: originalPath,
				originalExtension: originalExtension,
				encryptedAt: Date.now(),
				salt: encrypted.salt,
				iv: encrypted.iv,
				isAttachment: isAttachment
			};

			// Create encrypted file content with metadata
			const encryptedContent = JSON.stringify({
				version: '1.0',
				type: isAttachment ? 'binary' : 'text',
				...encrypted,
				metadata: metadata
			});

			// Write encrypted content
			await this.app.vault.modify(file, encryptedContent);

			// Rename to .secvault if enabled
			let finalFile = file;
			if (this.plugin.settings.useSecvaultExtension) {
				const newPath = originalPath.replace(/\.[^/.]+$/, '.secvault');
				await this.app.fileManager.renameFile(file, newPath);
				
				// Update file reference
				const renamedFile = this.app.vault.getAbstractFileByPath(newPath);
				if (renamedFile instanceof TFile) {
					finalFile = renamedFile;
					metadata.path = newPath;
				}
			}
			
			this.encryptedFiles.set(finalFile.path, metadata);

			// Save to plugin settings
			await this.saveEncryptedFiles();

			new Notice(`🔒 File encrypted: ${finalFile.name}`);
			console.log('File encrypted:', finalFile.path);
			
			return true;

		} catch (error) {
			console.error('Encryption error:', error);
			new Notice(`❌ Encryption failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Decrypt a single file
	 */
	async decryptFile(
		file: TFile,
		password: string,
		keyFileContent?: string,
		cachedContent?: string
	): Promise<boolean> {
		try {
			const rawContent = cachedContent ?? await this.app.vault.read(file);
			const parsed = this.parseEncryptedPayload(rawContent);
			if (!parsed) {
				new Notice('❌ Unsupported encrypted file format');
				return false;
			}

			const masterKey = keyFileContent ? password + keyFileContent : password;
			const decrypted = CryptoService.decrypt(parsed.payload, masterKey);
			if (!decrypted) {
				new Notice('❌ Decryption failed - wrong password?');
				return false;
			}

			if (parsed.contentType === 'binary') {
				const binaryString = atob(decrypted);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				await this.app.vault.modifyBinary(file, bytes.buffer);
			} else {
				await this.app.vault.modify(file, decrypted);
			}

			let finalFile = file;
			if (
				file.extension === 'secvault' &&
				this.plugin.settings.useSecvaultExtension &&
				parsed.originalExtension
			) {
				const sanitizedExt = parsed.originalExtension.startsWith('.')
					? parsed.originalExtension.substring(1)
					: parsed.originalExtension;
				const newPath = file.path.replace(/\.secvault$/i, `.${sanitizedExt}`);
				await this.app.fileManager.renameFile(file, newPath);
				const renamedFile = this.app.vault.getAbstractFileByPath(newPath);
				if (renamedFile instanceof TFile) finalFile = renamedFile;
			}

			this.encryptedFiles.delete(file.path);
			this.encryptedFiles.delete(finalFile.path);
			await this.saveEncryptedFiles();

			new Notice(`🔓 File decrypted: ${finalFile.name}`);
			console.log('File decrypted:', finalFile.path);
			
			return true;

		} catch (error) {
			console.error('Decryption error:', error);
			new Notice(`❌ Decryption failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Quick unlock a file (temporary access without full decryption)
	 */
	async quickUnlockFile(
		file: TFile,
		password: string,
		keyFileContent?: string,
		cachedContent?: string
	): Promise<string | null> {
		try {
			const rawContent = cachedContent ?? await this.app.vault.read(file);
			const parsed = this.parseEncryptedPayload(rawContent);
			if (!parsed) {
				new Notice('❌ Unsupported encrypted file format');
				return null;
			}

			if (parsed.contentType === 'binary') {
				new Notice('ℹ️ Preview not available for encrypted binary files. Please decrypt instead.');
				return null;
			}

			const masterKey = keyFileContent ? password + keyFileContent : password;
			const decrypted = CryptoService.decrypt(parsed.payload, masterKey);
			if (!decrypted) {
				new Notice('❌ Quick unlock failed - wrong password?');
				return null;
			}

			this.quickUnlockedFiles.set(file.path, Date.now());

			new Notice(`🔓 File quick-unlocked: ${file.name} (${this.plugin.settings.quickUnlockTimeout} min)`);
			console.log('File quick-unlocked:', file.path);
			
			return decrypted;

		} catch (error) {
			console.error('Quick unlock error:', error);
			new Notice(`❌ Quick unlock failed: ${error.message}`);
			return null;
		}
	}

	/**
	 * Lock quick-unlocked file
	 */
	lockQuickUnlockedFile(filePath: string) {
		if (this.quickUnlockedFiles.has(filePath)) {
			this.quickUnlockedFiles.delete(filePath);
			new Notice('🔒 File quick-locked');
		}
	}

	/**
	 * Start cleanup timer for quick-unlocked files
	 */
	private startQuickUnlockCleanup() {
		this.plugin.registerInterval(
			window.setInterval(() => {
				const now = Date.now();
				const timeoutMs = this.plugin.settings.quickUnlockTimeout * 60000;

				for (const [path, unlockedAt] of this.quickUnlockedFiles.entries()) {
					if (now - unlockedAt > timeoutMs) {
						this.quickUnlockedFiles.delete(path);
						console.log('Quick unlock expired:', path);
					}
				}
			}, 30000) // Check every 30 seconds
		);
	}

	/**
	 * Load encrypted files from settings
	 */
	private loadEncryptedFiles() {
		// Load from plugin data
		const data = this.plugin.settings as any;
		if (data.encryptedFilesList) {
			const files: EncryptedFile[] = data.encryptedFilesList;
			files.forEach(file => {
				this.encryptedFiles.set(file.path, file);
			});
		}
	}

	/**
	 * Save encrypted files to settings
	 */
	private async saveEncryptedFiles() {
		const filesList = Array.from(this.encryptedFiles.values());
		(this.plugin.settings as any).encryptedFilesList = filesList;
		await this.plugin.saveSettings();
	}

	private parseEncryptedPayload(rawContent: string): {
		payload: any;
		contentType: 'text' | 'binary';
		originalExtension?: string;
	} | null {
		const trimmed = rawContent.trim();

		// JSON format (individual file encryption)
		try {
			const json = JSON.parse(trimmed);
			const metadata = json.metadata as EncryptedFile | undefined;
			const contentType = (json.type as 'text' | 'binary') ?? 'text';

			return {
				payload: json,
				contentType,
				originalExtension: metadata?.originalExtension ?? json.originalExtension
			};
		} catch {
			// Ignore JSON parse errors, try legacy format
		}

		// Legacy / folder encryption format
		if (trimmed.startsWith('---SECUREVAULT---')) {
			const decoded = CryptoService.decodeFileContent(trimmed);
			if (!decoded) return null;

			return {
				payload: decoded,
				contentType: decoded.contentType ?? 'text',
				originalExtension: decoded.originalExtension
			};
		}

		return null;
	}

	/**
	 * Get all encrypted files
	 */
	getEncryptedFiles(): EncryptedFile[] {
		return Array.from(this.encryptedFiles.values());
	}

	/**
	 * Get quick unlocked files
	 */
	getQuickUnlockedFiles(): string[] {
		return Array.from(this.quickUnlockedFiles.keys());
	}
}
