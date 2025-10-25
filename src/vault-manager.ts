import { App, Notice, TFile, TFolder } from 'obsidian';
import { CryptoService } from './crypto';
import { EncryptedFolder, EncryptedFileMetadata, EncryptionAlgorithm, SecureVaultSettings } from './types';

export class VaultManager {
	constructor(
		private app: App,
		private readonly settingsProvider: () => SecureVaultSettings
	) {}

	private get settings(): SecureVaultSettings {
		return this.settingsProvider();
	}

	private shouldUseSecvaultExtension(): boolean {
		return this.settings.useSecvaultExtension;
	}

	private getSecvaultPath(filePath: string): string {
		if (filePath.endsWith('.secvault')) {
			return filePath;
		}
		return filePath.replace(/\.[^/.]+$/, '.secvault');
	}

	private async renameFile(file: TFile, newPath: string): Promise<TFile> {
		await this.app.fileManager.renameFile(file, newPath);
		const renamed = this.app.vault.getAbstractFileByPath(newPath);
		return renamed instanceof TFile ? renamed : file;
	}

	// Detect actual lock status by checking files
	async detectFolderLockStatus(folderPath: string): Promise<{ isLocked: boolean; algorithm: EncryptionAlgorithm | 'Mixed' | 'Unknown' }> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		
		if (!(folder instanceof TFolder)) {
			return { isLocked: false, algorithm: 'Unknown' };
		}

		const files = this.getAllFilesInFolder(folder, true);
		let encryptedCount = 0;
		let decryptedCount = 0;
		const algorithms = new Set<EncryptionAlgorithm>();

		for (const file of files) {
			const extension = file.extension.toLowerCase();

			if (extension === 'secvault') {
				encryptedCount++;
				
				try {
					const content = await this.app.vault.read(file);
					const metadata = CryptoService.decodeFileContent(content);
					if (metadata?.algorithm) {
						algorithms.add(metadata.algorithm);
					}
				} catch (error) {
					console.error('Failed to inspect .secvault file:', file.path, error);
				}
			} else if (extension === 'md') {
				const content = await this.app.vault.read(file);
				
				if (this.isFileEncrypted(content)) {
					encryptedCount++;
					// Detect algorithm from file
					const metadata = CryptoService.decodeFileContent(content);
					if (metadata) {
						algorithms.add(metadata.algorithm);
					}
				} else {
					decryptedCount++;
				}
			}
		}

		// Determine lock status
		const isLocked = encryptedCount > 0;
		
		// Determine algorithm
		let algorithm: EncryptionAlgorithm | 'Mixed' | 'Unknown';
		if (algorithms.size === 0) {
			algorithm = 'Unknown';
		} else if (algorithms.size === 1) {
			algorithm = Array.from(algorithms)[0];
		} else {
			algorithm = 'Mixed';
		}

		return { isLocked, algorithm };
	}

	async encryptFolder(folder: TFolder, password: string, recursive: boolean = true): Promise<EncryptedFolder> {
		const files = this.getAllFilesInFolder(folder, recursive);
		const settings = this.settings;

		for (let file of files) {
			if (file.extension.toLowerCase() !== 'md') {
				continue;
			}

			const content = await this.app.vault.read(file);

			// Skip if already encrypted
			if (this.isFileEncrypted(content)) {
				continue;
			}

			const encrypted = CryptoService.encrypt(
				content,
				password,
				this.settings.encryptionAlgorithm
			);
			const metadata: EncryptedFileMetadata = {
				...encrypted,
				originalExtension: file.extension,
				originalPath: file.path
			};

			const encodedContent = CryptoService.encodeFileContent(metadata);
			await this.app.vault.modify(file, encodedContent);

			if (settings.useSecvaultExtension) {
				const newPath = this.getSecvaultPath(file.path);
				file = await this.renameFile(file, newPath);
			}
		}

		const salt = CryptoService.generateSalt();
		const iv = CryptoService.generateIV();
		const refreshedFiles = this.getAllFilesInFolder(folder, true);

		return {
			path: folder.path,
			salt,
			iv,
			isLocked: true,
			createdAt: Date.now(),
			lastModified: Date.now(),
			encryptedFiles: refreshedFiles
				.filter(f => ['md', 'secvault'].includes(f.extension.toLowerCase()))
				.map(f => f.path)
		};
	}

	async decryptFolder(encFolder: EncryptedFolder, password: string): Promise<boolean> {
		try {
			// Get the folder to decrypt all files including new ones in subfolders
			const folder = this.app.vault.getAbstractFileByPath(encFolder.path);
			
			if (!(folder instanceof TFolder)) {
				new Notice(`❌ Folder not found: ${encFolder.path}`);
				return false;
			}

			// Get ALL files recursively (including subfolders)
			const allFiles = this.getAllFilesInFolder(folder, true);
			let decryptedCount = 0;
			let skippedCount = 0;

			for (let file of allFiles) {
				const extension = file.extension.toLowerCase();
				if (extension === 'md' || extension === 'secvault') {
					const content = await this.app.vault.read(file);

					// Check if file is encrypted
					if (!this.isFileEncrypted(content)) {
						if (extension === 'md') {
							skippedCount++;
						}
						continue;
					}

					const metadata = CryptoService.decodeFileContent(content);
					
					if (!metadata) {
						new Notice(`⚠️ File ${file.name} corrupted, skipping...`);
						continue;
					}

					const decrypted = CryptoService.decrypt(metadata, password);
					
					if (!decrypted) {
						throw new Error('Decryption failed - wrong password');
					}

					await this.app.vault.modify(file, decrypted);
					decryptedCount++;

					if (extension === 'secvault' && this.shouldUseSecvaultExtension()) {
						const originalExt = metadata.originalExtension || 'md';
						const newPath = file.path.replace(/\.secvault$/i, `.${originalExt}`);
						file = await this.renameFile(file, newPath);
					}
				}
			}

			// Update encrypted files list with current state
			const refreshedFiles = this.getAllFilesInFolder(folder, true);
			encFolder.encryptedFiles = refreshedFiles
				.filter(f => ['md', 'secvault'].includes(f.extension.toLowerCase()))
				.map(f => f.path);
			encFolder.isLocked = false;
			encFolder.lastModified = Date.now();
			
			if (decryptedCount > 0) {
				new Notice(`✅ Decrypted ${decryptedCount} file(s)${skippedCount > 0 ? ` (${skippedCount} already decrypted)` : ''}`);
			}
			
			return true;

		} catch (error) {
			new Notice('❌ Wrong password or corrupted files');
			console.error('Decryption error:', error);
			return false;
		}
	}

	async lockFolder(encFolder: EncryptedFolder, password: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(encFolder.path);
		
		if (folder instanceof TFolder) {
			// Get all files recursively
			const allFiles = this.getAllFilesInFolder(folder, true);
			let encryptedCount = 0;
			let skippedCount = 0;

			const settings = this.settings;

			for (let file of allFiles) {
				const extension = file.extension.toLowerCase();

				if (extension === 'md') {
					const content = await this.app.vault.read(file);
					
					// Skip if already encrypted
					if (this.isFileEncrypted(content)) {
						skippedCount++;
						continue;
					}
					
					const encrypted = CryptoService.encrypt(
						content,
						password,
						this.settings.encryptionAlgorithm
					);
					const metadata: EncryptedFileMetadata = {
						...encrypted,
						originalExtension: extension,
						originalPath: file.path
					};
					const encodedContent = CryptoService.encodeFileContent(metadata);
					
					await this.app.vault.modify(file, encodedContent);
					encryptedCount++;

					if (settings.useSecvaultExtension) {
						const newPath = this.getSecvaultPath(file.path);
						file = await this.renameFile(file, newPath);
					}
				}
			}

			// Update encrypted files list
			const refreshedFiles = this.getAllFilesInFolder(folder, true);
			encFolder.encryptedFiles = refreshedFiles
				.filter(f => ['md', 'secvault'].includes(f.extension.toLowerCase()))
				.map(f => f.path);
			encFolder.isLocked = true;
			encFolder.lastModified = Date.now();
			
			if (encryptedCount > 0) {
				new Notice(`🔒 Encrypted ${encryptedCount} file(s)${skippedCount > 0 ? ` (${skippedCount} already encrypted)` : ''}`);
			}
		}
	}

	private getAllFilesInFolder(folder: TFolder, recursive: boolean = true): TFile[] {
		const files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile) {
				files.push(child);
			} else if (child instanceof TFolder && recursive) {
				// Recursively get files from subfolders
				files.push(...this.getAllFilesInFolder(child, recursive));
			}
		}

		return files;
	}

	async createEncryptedFolder(folderPath: string, password: string): Promise<EncryptedFolder | null> {
		try {
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			
			if (!(folder instanceof TFolder)) {
				await this.app.vault.createFolder(folderPath);
				const newFolder = this.app.vault.getAbstractFileByPath(folderPath);
				
				if (newFolder instanceof TFolder) {
					return await this.encryptFolder(newFolder, password);
				}
			} else {
				return await this.encryptFolder(folder, password);
			}
		} catch (error) {
			new Notice('❌ Failed to create encrypted folder');
			console.error(error);
		}

		return null;
	}

	isFileEncrypted(content: string): boolean {
		return content.startsWith('---SECUREVAULT---');
	}
}
