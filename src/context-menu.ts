/**
 * Context Menu Integration
 * Adds right-click menu options for SecureVault file & folder actions
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

	register() {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, file) => {
				if (!file) return;

				if (file instanceof TFile) {
					this.addFileMenu(menu, file);
				} else if (file instanceof TFolder) {
					this.addFolderMenu(menu, file);
				}
			})
		);
	}

	private addFileMenu(menu: Menu, file: TFile) {
		const isEncrypted =
			file.extension === 'secvault' || this.fileEncryption.isFileEncrypted(file.path);
		const isQuickUnlocked = this.fileEncryption.isFileQuickUnlocked(file.path);

		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle('SecureVault').setIcon('shield').setDisabled(true);
		});

		if (!isEncrypted) {
			menu.addItem((item) => {
				item
					.setTitle('🛡️ Encrypt file')
					.setIcon('lock')
					.onClick(async () => {
						await this.handleFileEncryption(file);
					});
			});
		} else {
			menu.addItem((item) => {
				item
					.setTitle('🔓 Decrypt file')
					.setIcon('unlock')
					.onClick(async () => {
						await this.handleFileDecryption(file);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('👁️ Preview (read-only)')
					.setIcon('eye')
					.onClick(async () => {
						await this.plugin.previewService.previewFile(file);
					});
			});

			if (isQuickUnlocked) {
				menu.addItem((item) => {
					item
						.setTitle('🔒 Lock file')
						.setIcon('lock')
						.onClick(() => {
							this.fileEncryption.lockQuickUnlockedFile(file.path);
							this.plugin.refreshUi();
						});
				});
			} else {
				menu.addItem((item) => {
					item
						.setTitle('⚡ Quick unlock')
						.setIcon('zap')
						.onClick(async () => {
							await this.handleQuickUnlock(file);
						});
				});
			}

			menu.addItem((item) => {
				const stateLabel = isQuickUnlocked ? '⚡ Quick-unlocked' : '🔒 Encrypted';
				item
					.setTitle(`Status: ${stateLabel}`)
					.setIcon('info')
					.setDisabled(true);
			});
		}

		if (!isEncrypted) {
			menu.addItem((item) => {
				item
					.setTitle('Status: 🔓 Not encrypted')
					.setIcon('info')
					.setDisabled(true);
			});
		}

		menu.addItem((item) => {
			item
				.setTitle('📊 Open SecureVault dashboard')
				.setIcon('layout-grid')
				.onClick(async () => {
					await this.plugin.activateSecureVaultSidebar();
				});
		});
	}

	private addFolderMenu(menu: Menu, folder: TFolder) {
		const encryptedFolder = this.plugin.settings.encryptedFolders.find(
			(entry) => entry.path === folder.path
		);

		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle('SecureVault').setIcon('shield').setDisabled(true);
		});

		if (!encryptedFolder) {
			menu.addItem((item) => {
				item
					.setTitle('🛡️ Encrypt folder')
					.setIcon('shield')
					.onClick(() => {
						this.plugin.encryptFolderFromContextMenu(folder);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Status: 📁 Not encrypted')
					.setIcon('info')
					.setDisabled(true);
			});
		} else {
			if (encryptedFolder.isLocked) {
				menu.addItem((item) => {
					item
						.setTitle('🔓 Unlock folder')
						.setIcon('unlock')
						.onClick(async () => {
							await this.plugin.unlockSpecificFolder(encryptedFolder);
						});
				});
			} else {
				menu.addItem((item) => {
					item
						.setTitle('🔒 Lock folder')
						.setIcon('lock')
						.onClick(async () => {
							await this.plugin.lockSpecificFolder(encryptedFolder);
						});
				});
			}

			const status = encryptedFolder.isLocked ? '🔒 Locked' : '🔓 Unlocked';
			const filesCount = encryptedFolder.encryptedFiles?.length ?? 0;

			menu.addItem((item) => {
				item
					.setTitle(`Status: ${status}`)
					.setIcon('info')
					.setDisabled(true);
			});
			menu.addItem((item) => {
				item
					.setTitle(`📄 Files: ${filesCount}`)
					.setIcon('file-text')
					.setDisabled(true);
			});
		}

		menu.addItem((item) => {
			item
				.setTitle('📊 Open SecureVault dashboard')
				.setIcon('layout-grid')
				.onClick(async () => {
					await this.plugin.activateSecureVaultSidebar();
				});
		});
	}

	private async handleFileEncryption(file: TFile) {
		if (!this.passwordManager.isPasswordSet()) {
			new Notice('❌ Please set a master password first in SecureVault settings.');
			return;
		}

		new PasswordModal(
			this.plugin.app,
			this.plugin.settings,
			async (password) => {
				const keyFileContent = await this.passwordManager.getKeyFileContent();
				const success = await this.fileEncryption.encryptFile(
					file,
					password,
					keyFileContent ?? undefined
				);

				if (success) {
					new Notice(`✅ File encrypted: ${file.name}`);
					this.plugin.refreshUi();
				}
			}
		).open();
	}

	private async handleFileDecryption(file: TFile) {
		new PasswordModal(
			this.plugin.app,
			this.plugin.settings,
			async (password) => {
				const keyFileContent = await this.passwordManager.getKeyFileContent();
				const success = await this.fileEncryption.decryptFile(
					file,
					password,
					keyFileContent ?? undefined
				);

				if (success) {
					new Notice(`✅ File decrypted: ${file.name}`);
					this.plugin.refreshUi();
				}
			}
		).open();
	}

	private async handleQuickUnlock(file: TFile) {
		new PasswordModal(
			this.plugin.app,
			this.plugin.settings,
			async (password) => {
				const keyFileContent = await this.passwordManager.getKeyFileContent();
				const content = await this.fileEncryption.quickUnlockFile(
					file,
					password,
					keyFileContent ?? undefined
				);

				if (content) {
					new Notice(`✅ File quick-unlocked: ${file.name}`);
					this.plugin.refreshUi();
				}
			}
		).open();
	}
}
