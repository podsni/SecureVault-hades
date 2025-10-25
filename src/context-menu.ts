/**
 * Context Menu Integration
 * Add right-click menu options for file/folder encryption
 */

import { Menu, TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import SecureVaultPlugin from '../main';
import { FileEncryptionManager } from './file-encryption';
import { PasswordModal } from './modals';
import { MasterPasswordManager } from './master-password-manager';

export class ContextMenuManager {
	private plugin: SecureVaultPlugin;
	private fileEncryption: FileEncryptionManager;
	private passwordManager: MasterPasswordManager;

	constructor(plugin: SecureVaultPlugin, fileEncryption: FileEncryptionManager) {
		this.plugin = plugin;
		this.fileEncryption = fileEncryption;
		this.passwordManager = new MasterPasswordManager(plugin.app, plugin.settings);
	}

	/**
	 * Register context menu events
	 */
	register() {
		// File menu event
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, file) => {
				this.addFileMenuItems(menu, file);
			})
		);
	}

	/**
	 * Add menu items to file context menu
	 */
	private addFileMenuItems(menu: Menu, file: TAbstractFile) {
		// Only for files in vault (not system files)
		if (!file) return;

		// Check if it's a file or folder
		const isFile = file instanceof TFile;
		const isFolder = file instanceof TFolder;

		if (isFile) {
			this.addFileEncryptionMenuItems(menu, file);
		} else if (isFolder) {
			this.addFolderEncryptionMenuItems(menu, file);
		}
	}

	/**
	 * Add encryption menu items for individual files
	 */
	private addFileEncryptionMenuItems(menu: Menu, file: TFile) {
		const isEncrypted = this.fileEncryption.isFileEncrypted(file.path);
		const isQuickUnlocked = this.fileEncryption.isFileQuickUnlocked(file.path);

		menu.addSeparator();

		if (isEncrypted) {
			// Encrypted file options
			menu.addItem((item) => {
				item
					.setTitle('🔓 Decrypt File')
					.setIcon('unlock')
					.onClick(async () => {
						await this.handleFileDecryption(file);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('⚡ Quick Unlock')
					.setIcon('zap')
					.onClick(async () => {
						await this.handleQuickUnlock(file);
					});
			});

			if (isQuickUnlocked) {
				menu.addItem((item) => {
					item
						.setTitle('🔒 Lock File')
						.setIcon('lock')
						.onClick(() => {
							this.fileEncryption.lockQuickUnlockedFile(file.path);
						});
				});
			}
		} else {
			// Unencrypted file options
			menu.addItem((item) => {
				item
					.setTitle('🔒 Encrypt File')
					.setIcon('lock')
					.onClick(async () => {
						await this.handleFileEncryption(file);
					});
			});
		}

		// Show file encryption status
		menu.addItem((item) => {
			const status = isEncrypted 
				? (isQuickUnlocked ? '⚡ Quick Unlocked' : '🔒 Encrypted')
				: '🔓 Not Encrypted';
			item
				.setTitle(`Status: ${status}`)
				.setIcon('info')
				.setDisabled(true);
		});
	}

	/**
	 * Add encryption menu items for folders
	 */
	private addFolderEncryptionMenuItems(menu: Menu, folder: TFolder) {
		// Check if folder is in encrypted folders list
		const encryptedFolder = this.plugin.settings.encryptedFolders.find(
			ef => ef.path === folder.path
		);

		menu.addSeparator();

		if (encryptedFolder) {
			// Encrypted folder options
			menu.addItem((item) => {
				item
					.setTitle('🔓 Unlock Folder')
					.setIcon('unlock')
					.onClick(async () => {
						// Use existing folder unlock mechanism
						new PasswordModal(
							this.plugin.app,
							this.plugin.settings,
							async (password) => {
								// Handle unlock here
								encryptedFolder.isLocked = false;
								encryptedFolder.isUnlocked = true;
								await this.plugin.saveSettings();
								new Notice(`🔓 Folder unlocked: ${folder.name}`);
							}
						).open();
					});
			});

			if (!encryptedFolder.isLocked) {
				menu.addItem((item) => {
					item
						.setTitle('🔒 Lock Folder')
						.setIcon('lock')
						.onClick(async () => {
							encryptedFolder.isLocked = true;
							encryptedFolder.isUnlocked = false;
							await this.plugin.saveSettings();
							new Notice(`🔒 Folder locked: ${folder.name}`);
						});
				});
			}
		} else {
			// Not encrypted folder
			menu.addItem((item) => {
				item
					.setTitle('🔒 Create Encrypted Vault Here')
					.setIcon('lock')
					.onClick(() => {
						// Open create folder modal with this path pre-filled
						new Notice('Use "Create Encrypted Folder" command to set up encryption');
					});
			});
		}

		// Show folder status
		menu.addItem((item) => {
			const status = encryptedFolder
				? (encryptedFolder.isLocked ? '🔒 Locked' : '🔓 Unlocked')
				: '📁 Not Encrypted';
			item
				.setTitle(`Status: ${status}`)
				.setIcon('info')
				.setDisabled(true);
		});
	}

	/**
	 * Handle file encryption
	 */
	private async handleFileEncryption(file: TFile) {
		// Check if master password is set
		if (!this.passwordManager.isPasswordSet()) {
			new Notice('❌ Please set up master password first');
			return;
		}

		// Prompt for password
		new PasswordModal(
			this.plugin.app,
			this.plugin.settings,
			async (password) => {
				// Get master key (password + key file)
				const masterKey = await this.passwordManager.getMasterKey(password);
				const keyFileContent = await this.passwordManager.getKeyFileContent();

				// Encrypt the file
				const success = await this.fileEncryption.encryptFile(file, password, keyFileContent || '');
				if (success) {
					new Notice(`✅ File encrypted: ${file.name}`);
				}
			}
		).open();
	}

	/**
	 * Handle file decryption
	 */
	private async handleFileDecryption(file: TFile) {
		new PasswordModal(
			this.plugin.app,
			this.plugin.settings,
			async (password) => {
				// Get key file content
				const keyFileContent = await this.passwordManager.getKeyFileContent();

				// Decrypt the file
				const success = await this.fileEncryption.decryptFile(file, password, keyFileContent || '');
				if (success) {
					new Notice(`✅ File decrypted: ${file.name}`);
				}
			}
		).open();
	}

	/**
	 * Handle quick unlock
	 */
	private async handleQuickUnlock(file: TFile) {
		new PasswordModal(
			this.plugin.app,
			this.plugin.settings,
			async (password) => {
				// Get key file content
				const keyFileContent = await this.passwordManager.getKeyFileContent();

				// Quick unlock the file
				const content = await this.fileEncryption.quickUnlockFile(file, password, keyFileContent || '');
				if (content) {
					new Notice(`✅ File quick-unlocked: ${file.name}`);
					// Optionally: open file in view mode
				}
			}
		).open();
	}
}
