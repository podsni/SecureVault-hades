/**
 * Preview Service
 * Centralized service for showing decrypted content in preview modal
 * Handles all types: files, folders, selections
 */

import { App, TFile, TFolder, Notice } from 'obsidian';
import SecureVaultPlugin from '../../main';
import { PreviewModal } from '../ui';
import { PasswordModal } from '../modals';

export class PreviewService {
	constructor(
		private app: App,
		private plugin: SecureVaultPlugin
	) {}

	/**
	 * Show preview for a single .secvault file
	 */
	async previewFile(file: TFile): Promise<void> {
		if (!file.name.endsWith('.secvault')) {
			new Notice('⚠️ This file is not encrypted (.secvault)');
			return;
		}

		new PasswordModal(this.app, this.plugin.settings, async (password: string) => {
			try {
				// Get key file if enabled
				const keyFileContent = await this.getKeyFileContent();

				// Decrypt in memory
				const decrypted = await this.plugin.fileEncryption.quickUnlockFile(
					file,
					password,
					keyFileContent
				);

				if (decrypted) {
					// Show in preview modal
					const fileName = file.basename.replace('.secvault', '');
					new PreviewModal(
						this.app,
						this.plugin,
						decrypted,
						fileName,
						true // isMarkdown
					).open();
				}
			} catch (error) {
				console.error('Preview file error:', error);
				new Notice(`❌ Failed to preview: ${error.message}`);
			}
		}).open();
	}

	/**
	 * Show preview for all files in a folder
	 */
	async previewFolder(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder instanceof TFolder)) {
			new Notice('❌ Folder not found');
			return;
		}

		// Get all .secvault files in folder
		const files = this.getAllSecvaultFiles(folder);
		
		if (files.length === 0) {
			new Notice('ℹ️ No encrypted files in this folder');
			return;
		}

		// Show file picker if multiple files
		if (files.length === 1) {
			await this.previewFile(files[0]);
		} else {
			// TODO: Create file picker modal for multiple files
			new Notice(`📁 Found ${files.length} encrypted files. Opening first one...`);
			await this.previewFile(files[0]);
		}
	}

	/**
	 * Show preview for encrypted selection/block
	 * Note: For now, selection blocks are decrypted in-place only
	 * Preview for selection blocks can be added in future version
	 */
	async previewSelection(encryptedBlock: string, blockId: string): Promise<void> {
		new Notice('ℹ️ Selection preview coming in v1.5.0! Use decrypt for now.');
		// TODO: Implement selection block preview in v1.5.0
		// Will need to extract decrypt logic from SelectionEncryptionManager
	}

	/**
	 * Get key file content if enabled
	 */
	private async getKeyFileContent(): Promise<string | undefined> {
		if (!this.plugin.settings.enableKeyFile || !this.plugin.settings.keyFilePath) {
			return undefined;
		}

		const keyFile = this.app.vault.getAbstractFileByPath(this.plugin.settings.keyFilePath);
		if (keyFile && keyFile instanceof TFile) {
			return await this.app.vault.read(keyFile);
		}

		return undefined;
	}

	/**
	 * Get all .secvault files in folder recursively
	 */
	private getAllSecvaultFiles(folder: TFolder): TFile[] {
		const files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile && child.name.endsWith('.secvault')) {
				files.push(child);
			} else if (child instanceof TFolder) {
				files.push(...this.getAllSecvaultFiles(child));
			}
		}

		return files;
	}

	/**
	 * Quick check if file can be previewed
	 */
	canPreview(file: TFile): boolean {
		return file.name.endsWith('.secvault');
	}

	/**
	 * Quick check if folder has encrypted files
	 */
	folderHasEncryptedFiles(folder: TFolder): boolean {
		return this.getAllSecvaultFiles(folder).length > 0;
	}
}
