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
		const lastDot = filePath.lastIndexOf('.');
		if (lastDot === -1 || lastDot < filePath.lastIndexOf('/')) {
			return `${filePath}.secvault`;
		}
		return `${filePath.substring(0, lastDot)}.secvault`;
	}

	private async renameFile(file: TFile, newPath: string): Promise<TFile> {
		await this.app.fileManager.renameFile(file, newPath);
		const renamed = this.app.vault.getAbstractFileByPath(newPath);
		return renamed instanceof TFile ? renamed : file;
	}

	private isAttachment(file: TFile): boolean {
		const extension = file.extension.toLowerCase();
		return this.settings.attachmentTypes.includes(extension);
	}

	private async readBinaryAsBase64(file: TFile): Promise<string> {
		const buffer = await this.app.vault.readBinary(file);
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	private async writeBinaryFromBase64(file: TFile, base64Data: string): Promise<void> {
		const binaryString = atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		await this.app.vault.modifyBinary(file, bytes.buffer);
	}

	private async encryptFileInFolder(file: TFile, password: string): Promise<TFile | null> {
		const extension = file.extension.toLowerCase();

		if (extension === 'secvault') {
			return null; // already encrypted
		}

		const isAttachment = this.isAttachment(file);

		if (isAttachment && !this.settings.encryptAttachments) {
			return null;
		}

		let content: string;
		let contentType: 'text' | 'binary';

		if (isAttachment) {
			content = await this.readBinaryAsBase64(file);
			contentType = 'binary';
		} else {
			content = await this.app.vault.read(file);
			contentType = 'text';

			if (this.isFileEncrypted(content)) {
				return null;
			}
		}

		const encrypted = CryptoService.encrypt(
			content,
			password,
			this.settings.encryptionAlgorithm
		);

		const metadata: EncryptedFileMetadata = {
			...encrypted,
			originalExtension: file.extension,
			originalPath: file.path,
			contentType
		};

		const encodedContent = CryptoService.encodeFileContent(metadata);
		await this.app.vault.modify(file, encodedContent);

		if (this.shouldUseSecvaultExtension()) {
			const newPath = this.getSecvaultPath(file.path);
			file = await this.renameFile(file, newPath);
		}

		return file;
	}

	private async collectEncryptedFilePaths(folder: TFolder): Promise<string[]> {
		const result: string[] = [];
		const files = this.getAllFilesInFolder(folder, true);

		for (const file of files) {
			const extension = file.extension.toLowerCase();
			if (extension === 'secvault') {
				result.push(file.path);
				continue;
			}

			try {
				const content = await this.app.vault.read(file);
				if (this.isFileEncrypted(content)) {
					result.push(file.path);
				}
			} catch {
				// Ignore binary files that cannot be read as text
			}
		}

		return result;
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

			try {
				const content = await this.app.vault.read(file);

				if (extension === 'secvault' || this.isFileEncrypted(content)) {
					encryptedCount++;

					const metadata = CryptoService.decodeFileContent(content);
					if (metadata?.algorithm) {
						algorithms.add(metadata.algorithm);
					}
				} else {
					decryptedCount++;
				}
			} catch (error) {
				// Binary files may fail to read as text when unlocked - treat as decrypted
				decryptedCount++;
				console.debug('Skipping non-text file while detecting lock status:', file.path, error);
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

		for (const file of files) {
			try {
				await this.encryptFileInFolder(file, password);
			} catch (error) {
				console.error('Failed to encrypt file inside folder:', file.path, error);
			}
		}

		const salt = CryptoService.generateSalt();
		const iv = CryptoService.generateIV();
		const encryptedFiles = await this.collectEncryptedFilePaths(folder);

		return {
			path: folder.path,
			salt,
			iv,
			isLocked: true,
			createdAt: Date.now(),
			lastModified: Date.now(),
			encryptedFiles
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
				let content: string | null = null;

				try {
					content = await this.app.vault.read(file);
				} catch (error) {
					// Binary files in unlocked state - skip counting to avoid false errors
					console.debug('Skipping non-text file during decrypt scan:', file.path, error);
					continue;
				}

				if (!content || !this.isFileEncrypted(content)) {
					skippedCount++;
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

				if (metadata.contentType === 'binary') {
					await this.writeBinaryFromBase64(file, decrypted);
				} else {
					await this.app.vault.modify(file, decrypted);
				}
				decryptedCount++;

				if (this.shouldUseSecvaultExtension() && file.extension.toLowerCase() === 'secvault') {
					const originalExtRaw = metadata.originalExtension || (metadata.contentType === 'binary' ? 'bin' : 'md');
					const sanitizedExt = originalExtRaw.startsWith('.') ? originalExtRaw.substring(1) : originalExtRaw;
					const newPath = file.path.replace(/\.secvault$/i, `.${sanitizedExt}`);
					file = await this.renameFile(file, newPath);
				}
			}

			// Update encrypted files list with current state
			encFolder.encryptedFiles = await this.collectEncryptedFilePaths(folder);
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

			for (const file of allFiles) {
				try {
					if (file.extension.toLowerCase() === 'secvault') {
						skippedCount++;
						continue;
					}

					const isAttachment = this.isAttachment(file);
					if (isAttachment && !settings.encryptAttachments) {
						skippedCount++;
						continue;
					}

					if (!isAttachment) {
						const content = await this.app.vault.read(file);
						if (this.isFileEncrypted(content)) {
							skippedCount++;
							continue;
						}
					}

					const encrypted = await this.encryptFileInFolder(file, password);
					if (encrypted) {
						encryptedCount++;
					}
				} catch (error) {
					console.error('Failed to lock file:', file.path, error);
				}
			}

			// Update encrypted files list
			encFolder.encryptedFiles = await this.collectEncryptedFilePaths(folder);
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
