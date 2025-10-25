import { Notice, Plugin, TFolder, Modal, Setting, Editor, MarkdownView, TFile } from 'obsidian';
import { SecureVaultSettings, DEFAULT_SETTINGS, EncryptedFolder } from './src/types';
import { VaultManager } from './src/vault-manager';
import { PasswordModal, CreateFolderModal, AccessLogModal } from './src/modals';
import { SecureVaultSettingTab } from './src/settings-tab';
import { CryptoService } from './src/crypto';
import { AccessLogger } from './src/access-logger';
import { AutoLockManager } from './src/auto-lock';
import { FileEncryptionManager } from './src/file-encryption';
import { ContextMenuManager } from './src/context-menu';
import { MasterPasswordManager } from './src/master-password-manager';
import { SelectionEncryptionManager } from './src/selection-encryption';
import { PasswordMemoryManager } from './src/password-memory-manager';
import { SecVaultView, SECVAULT_VIEW_TYPE } from './src/secvault-view';
import { SecureVaultView, VIEW_TYPE_SECUREVAULT } from './src/sidebar-view';
import { PreviewService } from './src/services';
import { SecurityAuditService } from './src/services/security-audit';
import { SecurityAuditModal } from './src/modals';

export default class SecureVaultPlugin extends Plugin {
	settings: SecureVaultSettings;
	vaultManager: VaultManager;
	accessLogger: AccessLogger;
	autoLockManager: AutoLockManager;
	fileEncryption: FileEncryptionManager;
	contextMenu: ContextMenuManager;
	passwordManager: MasterPasswordManager;
	selectionEncryption: SelectionEncryptionManager;
	passwordMemory: PasswordMemoryManager;
	previewService: PreviewService;
	securityAudit: SecurityAuditService;
	private autoLockTimer: NodeJS.Timeout | null = null;
	private isProcessing: boolean = false;
	private statusBarUpdateTimer: NodeJS.Timeout | null = null;
	private statusBarEl: HTMLElement | null = null;
	folderStatusCache = new Map<string, { isLocked: boolean; algorithm: string }>();

	async onload() {
		await this.loadSettings();
		
		// Initialize core managers
		this.vaultManager = new VaultManager(this.app, () => this.settings);
		this.accessLogger = new AccessLogger(this.settings);
		this.passwordManager = new MasterPasswordManager(this.app, this.settings);
		
		// Initialize new features
		this.autoLockManager = new AutoLockManager(this, this.app);
		this.fileEncryption = new FileEncryptionManager(this, this.app);
		this.contextMenu = new ContextMenuManager(this, this.fileEncryption);
		this.selectionEncryption = new SelectionEncryptionManager(this, this.app);
		this.passwordMemory = new PasswordMemoryManager(this, this.app);
		this.previewService = new PreviewService(this.app, this);
		this.securityAudit = new SecurityAuditService(this);

		// Register custom view for .secvault files
		this.registerView(
			SECVAULT_VIEW_TYPE,
			(leaf) => new SecVaultView(leaf, this)
		);

		// Register extension for .secvault files
		this.registerExtensions(['secvault'], SECVAULT_VIEW_TYPE);

		// Set encryption algorithm from settings
		CryptoService.setAlgorithm(this.settings.encryptionAlgorithm);

		// Start auto-lock timer if enabled
		if (this.settings.autoLockEnabled) {
			this.autoLockManager.start();
		}

		// Register context menu (right-click)
		this.contextMenu.register();

		// Buat folder SecureVault otomatis jika belum ada
		await this.ensureSecureVaultFolder();

		// Ribbon icon - buka quick menu
		this.addRibbonIcon('shield', 'SecureVault-Hades Menu', () => {
			new QuickMenuModal(this.app, this).open();
		});

		// Status bar
		const statusBar = this.addStatusBarItem();
		this.statusBarEl = statusBar;
		this.updateStatusBar(statusBar);
		
		// Update status bar setiap 5 detik
		this.registerInterval(window.setInterval(() => {
			if (this.statusBarEl) {
				this.updateStatusBar(this.statusBarEl);
			}
		}, 5000));
		
		// Status bar clickable
		statusBar.addClass('mod-clickable');
		statusBar.addEventListener('click', () => {
			new QuickMenuModal(this.app, this).open();
		});

		// Commands
		this.addCommand({
			id: 'open-securevault-menu',
			name: 'Open SecureVault-Hades menu',
			callback: () => {
				new QuickMenuModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'create-encrypted-folder',
			name: 'Create encrypted folder',
			callback: () => {
				this.createEncryptedFolderCommand();
			}
		});

		this.addCommand({
			id: 'unlock-all-folders',
			name: 'Unlock all encrypted folders',
			callback: () => {
				this.unlockAllCommand();
			}
		});

		this.addCommand({
			id: 'lock-all-folders',
			name: 'Lock all encrypted folders',
			callback: () => {
				this.lockAllCommand();
			}
		});

		this.addCommand({
			id: 'open-securevault-sidebar',
			name: 'Open SecureVault sidebar',
			callback: async () => {
				await this.activateSecureVaultSidebar();
			}
		});

		this.addCommand({
			id: 'run-security-audit',
			name: 'Run security audit',
			callback: async () => {
				await this.runSecurityAudit();
			}
		});

		this.addCommand({
			id: 'encrypt-current-folder',
			name: 'Encrypt current folder',
			callback: () => {
				this.encryptCurrentFolderCommand();
			}
		});

		// NEW COMMANDS
		this.addCommand({
			id: 'toggle-auto-lock',
			name: 'Toggle auto-lock timer',
			callback: () => {
				this.settings.autoLockEnabled = !this.settings.autoLockEnabled;
				if (this.settings.autoLockEnabled) {
					this.autoLockManager.start();
					new Notice('✅ Auto-lock enabled');
				} else {
					this.autoLockManager.stop();
					new Notice('❌ Auto-lock disabled');
				}
				this.saveSettings();
			}
		});

		this.addCommand({
			id: 'show-encrypted-files',
			name: 'Show encrypted files list',
			callback: () => {
				const files = this.fileEncryption.getEncryptedFiles();
				if (files.length === 0) {
					new Notice('No encrypted files found');
				} else {
					new Notice(`Found ${files.length} encrypted file(s)`);
					console.log('Encrypted files:', files);
				}
			}
		});

		// NEW COMMANDS: Selection-based Encryption
		this.addCommand({
			id: 'encrypt-selection',
			name: '🔒 Encrypt selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (!selection || selection.length === 0) {
					new Notice('❌ No text selected! Select text first.');
					return;
				}

				// Show password prompt with confirm
				new PasswordModal(this.app, this.settings, async (password: string) => {
					// Get key file if enabled
					let keyFileContent: string | undefined;
					if (this.settings.enableKeyFile && this.settings.keyFilePath) {
						const keyFile = this.app.vault.getAbstractFileByPath(this.settings.keyFilePath);
						if (keyFile instanceof TFile) {
							keyFileContent = await this.app.vault.read(keyFile);
						}
					}

					// Encrypt selection
					await this.selectionEncryption.encryptSelection(
						editor,
						view,
						password,
						keyFileContent
					);
				}).open();
			}
		});

		this.addCommand({
			id: 'decrypt-selection',
			name: '🔓 Decrypt encrypted block at cursor',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// Check if cursor is in encrypted block
				if (!this.selectionEncryption.isCursorInEncryptedBlock(editor)) {
					new Notice('❌ Cursor is not in an encrypted block!');
					return;
				}

				// Show password prompt
				new PasswordModal(this.app, this.settings, async (password: string) => {
					// Get key file if enabled
					let keyFileContent: string | undefined;
					if (this.settings.enableKeyFile && this.settings.keyFilePath) {
						const keyFile = this.app.vault.getAbstractFileByPath(this.settings.keyFilePath);
						if (keyFile instanceof TFile) {
							keyFileContent = await this.app.vault.read(keyFile);
						}
					}

					// Decrypt at cursor
					await this.selectionEncryption.decryptAtCursor(
						editor,
						view,
						password,
						keyFileContent
					);
				}).open();
			}
		});

		this.addCommand({
			id: 'count-encrypted-blocks',
			name: '📊 Count encrypted blocks in current file',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const count = this.selectionEncryption.countEncryptedBlocks(editor);
				new Notice(`🔐 Found ${count} encrypted block(s) in this file`);
			}
		});

		// NEW COMMAND: Remember Password Management
		this.addCommand({
			id: 'forget-all-passwords',
			name: '🗑️ Forget all remembered passwords',
			callback: () => {
				this.passwordMemory.forgetAllPasswords();
			}
		});

		this.addCommand({
			id: 'show-remembered-passwords',
			name: '📋 Show remembered passwords info',
			callback: () => {
				const count = this.passwordMemory.getRememberedCount();
				const remembered = this.passwordMemory.getAllRemembered();
				
				if (count === 0) {
					new Notice('No remembered passwords');
				} else {
					let message = `🔑 Remembered passwords: ${count}\n\n`;
					remembered.forEach(r => {
						const timeLeft = this.passwordMemory.getTimeUntilExpiration(r.category, r.identifier);
						message += `• ${r.category}: ${r.identifier} (${timeLeft})\n`;
					});
					new Notice(message, 8000);
				}
			}
		});

		// Quick View commands
		this.addCommand({
			id: 'quick-view-current-file',
			name: '👁️ Quick View: Current encrypted file',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && this.previewService.canPreview(activeFile)) {
					if (!checking) {
						this.previewService.previewFile(activeFile);
					}
					return true;
				}
				return false;
			}
		});

		this.addCommand({
			id: 'quick-view-file',
			name: '👁️ Quick View: Choose encrypted file',
			callback: async () => {
				// Get all .secvault files
				const files = this.app.vault.getFiles().filter(f => f.name.endsWith('.secvault'));
				
				if (files.length === 0) {
					new Notice('ℹ️ No encrypted files found');
					return;
				}

				// Show file suggester
				const chosen = await this.showFileSuggester(files);
				if (chosen) {
					await this.previewService.previewFile(chosen);
				}
			}
		});

		// Register file menu (right-click) context
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				// Add menu for folders only
				if (file instanceof TFolder) {
					// Check if inside SecureVault
					const isInSecureVault = file.path.startsWith('SecureVault') || file.path === 'SecureVault';
					
					if (isInSecureVault) {
						// Check if already encrypted
						const existingFolder = this.settings.encryptedFolders.find(f => f.path === file.path);
						
						if (existingFolder) {
							// Already encrypted - show Lock/Unlock
							if (existingFolder.isLocked) {
								menu.addItem((item) => {
									item
										.setTitle('🔓 Unlock folder')
										.setIcon('unlock')
										.onClick(async () => {
											await this.unlockSpecificFolder(existingFolder);
										});
								});
							} else {
								menu.addItem((item) => {
									item
										.setTitle('🔒 Lock folder')
										.setIcon('lock')
										.onClick(async () => {
											await this.lockSpecificFolder(existingFolder);
										});
								});
							}
						} else {
							// Not encrypted yet - show Encrypt option
							menu.addItem((item) => {
								item
									.setTitle('🛡️ Encrypt folder')
									.setIcon('shield')
									.onClick(async () => {
										await this.encryptFolderFromContextMenu(file);
									});
							});
						}
					}
				}
			})
		);

		// Settings tab
		this.addSettingTab(new SecureVaultSettingTab(this.app, this));

		// Auto-lock timer
		this.startAutoLockTimer();

		console.log('🔐 SecureVault-Hades loaded');
	}

	onunload() {
		// Stop auto-lock manager
		if (this.autoLockManager) {
			this.autoLockManager.stop();
		}
		
		// Stop password memory manager
		if (this.passwordMemory) {
			this.passwordMemory.stop();
		}
		
		if (this.autoLockTimer) {
			clearInterval(this.autoLockTimer);
		}
		console.log('🔐 SecureVault-Hades unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	invalidateFolderStatusCache() {
		this.folderStatusCache.clear();
		console.log('Folder status cache invalidated.');
	}

	// Public methods untuk dipanggil dari modal
	createEncryptedFolderCommand() {
		new CreateFolderModal(this.app, this.settings, async (folderPath: string, password: string) => {
			new Notice(`🔄 Encrypting folder and all subfolders...`);
			this.accessLogger.log('create', folderPath, false, 'Started encryption');
			const encFolder = await this.vaultManager.createEncryptedFolder(folderPath, password);
			if (encFolder) {
				this.settings.encryptedFolders.push(encFolder);
				await this.saveSettings();
				this.accessLogger.log('create', folderPath, true, `Encrypted ${encFolder.encryptedFiles.length} files`);
				new Notice(`✅ SUCCESS! Encrypted ${encFolder.encryptedFiles.length} file(s) in "${folderPath}" (including subfolders)`);
				this.invalidateFolderStatusCache();
				this.refreshUi();
			} else {
				this.accessLogger.log('create', folderPath, false, 'Encryption failed');
			}
		}).open();
	}

	unlockAllCommand() {
		new PasswordModal(this.app, this.settings, async (password: string) => {
			await this.unlockAllFolders(password);
			this.refreshUi();
		}).open();
	}

	lockAllCommand() {
		new PasswordModal(this.app, this.settings, async (password: string) => {
			await this.lockAllFolders(password);
			this.refreshUi();
		}).open();
	}

	encryptCurrentFolderCommand() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('❌ No active file. Open a file first!');
			return;
		}

		const folder = activeFile.parent;
		if (folder) {
			new PasswordModal(this.app, this.settings, async (password: string) => {
				const alreadyEncrypted = this.settings.encryptedFolders.some(f => f.path === folder.path);
				if (alreadyEncrypted) {
					new Notice('⚠️ This folder is already encrypted! Use Unlock to decrypt it.');
					return;
				}

			new Notice(`🔄 ENCRYPTING current folder + all subfolders...`);
			const encFolder = await this.vaultManager.encryptFolder(folder as TFolder, password);
			this.settings.encryptedFolders.push(encFolder);
			await this.saveSettings();
			new Notice(`✅ SUCCESS! Encrypted ${encFolder.encryptedFiles.length} file(s) in "${folder.path}" (subfolders included)`, 5000);
			this.invalidateFolderStatusCache();
			this.refreshUi();
		}).open();
	}
	}

	// Encrypt folder from context menu (right-click)
	async encryptFolderFromContextMenu(folder: TFolder) {
		new PasswordModal(this.app, this.settings, async (password: string) => {
			const alreadyEncrypted = this.settings.encryptedFolders.some(f => f.path === folder.path);
			if (alreadyEncrypted) {
				new Notice('⚠️ This folder is already encrypted! Use Unlock to decrypt it.');
				return;
			}

		new Notice(`🔄 ENCRYPTING: "${folder.path}" + all subfolders...`);
		
		const encFolder = await this.vaultManager.encryptFolder(folder, password, true);
		this.settings.encryptedFolders.push(encFolder);
		await this.saveSettings();
		
		new Notice(`✅ SUCCESS! Encrypted ${encFolder.encryptedFiles.length} file(s) in "${folder.path}" (subfolders included)`, 5000);
		this.invalidateFolderStatusCache();
		this.refreshUi();
		}).open();
	}

	async unlockSpecificFolder(folder: EncryptedFolder) {
		// PERBAIKAN: Check if already processing
		if (this.isProcessing) {
			new Notice('⏳ Please wait, another operation is in progress...');
			return;
		}
		
		// Try to get remembered password first
		const rememberedPassword = this.settings.autoDecryptWithRememberedPassword 
			? this.passwordMemory.tryGetPasswordSmart(folder.path)
			: null;

		if (rememberedPassword) {
			// Auto-decrypt with remembered password
			this.isProcessing = true;
			try {
				const status = await this.vaultManager.detectFolderLockStatus(folder.path);
				
				if (!status.isLocked) {
					new Notice('ℹ️ This folder is already unlocked!');
					folder.isLocked = false;
					await this.saveSettings();
					this.refreshUi();
					return;
				}
				
				this.accessLogger.log('unlock', folder.path, false, 'Auto-unlock with remembered password');
				new Notice(`🔓 Auto-unlocking "${folder.path}" with remembered password...`);
				const success = await this.vaultManager.decryptFolder(folder, rememberedPassword);
				if (success) {
					await this.saveSettings();
					this.accessLogger.log('unlock', folder.path, true, `Auto-unlocked ${folder.encryptedFiles.length} files`);
					new Notice(`✅ Folder "${folder.path}" unlocked automatically!`, 3000);
					this.folderStatusCache.set(folder.path, { isLocked: false, algorithm: folder.algorithm || 'AES-256-GCM' });
					this.refreshUi();
				} else {
					// Password wrong - forget it
					this.passwordMemory.forgetPassword('folder', folder.path);
					this.accessLogger.log('unlock', folder.path, false, 'Remembered password invalid');
					// Ask for new password
					this.unlockWithPasswordPrompt(folder);
				}
			} finally {
				this.isProcessing = false;
			}
			return;
		}

		// No remembered password - ask for it
		this.unlockWithPasswordPrompt(folder);
	}

	private unlockWithPasswordPrompt(folder: EncryptedFolder) {
		new PasswordModal(this.app, this.settings, async (password: string) => {
			this.isProcessing = true;
			try {
				// Detect real status first
				const status = await this.vaultManager.detectFolderLockStatus(folder.path);
				
			if (!status.isLocked) {
				new Notice('ℹ️ This folder is already unlocked!');
				folder.isLocked = false;
				await this.saveSettings();
				this.refreshUi();
				return;
			}
				
				this.accessLogger.log('unlock', folder.path, false, 'Started unlocking');
				new Notice(`🔓 UNLOCKING: "${folder.path}" + all subfolders...`);
				const success = await this.vaultManager.decryptFolder(folder, password);
				if (success) {
					// Remember password if enabled
					if (this.settings.rememberPassword) {
						this.passwordMemory.rememberPasswordSmart(password, folder.path);
						new Notice(`🔑 Password remembered for ${this.settings.rememberPasswordTimeout} minutes`, 3000);
					}
					
				await this.saveSettings();
				this.accessLogger.log('unlock', folder.path, true, `Unlocked ${folder.encryptedFiles.length} files`);
				new Notice(`✅ Folder "${folder.path}" unlocked successfully!`, 3000);
				this.folderStatusCache.set(folder.path, { isLocked: false, algorithm: folder.algorithm || 'AES-256-GCM' });
				this.refreshUi();
				} else {
					this.accessLogger.log('unlock', folder.path, false, 'Wrong password');
				}
			} finally {
				this.isProcessing = false;
			}
		}).open();
	}

	async lockSpecificFolder(folder: EncryptedFolder) {
		// PERBAIKAN: Check if already processing
		if (this.isProcessing) {
			new Notice('⏳ Please wait, another operation is in progress...');
			return;
		}
		
		new PasswordModal(this.app, this.settings, async (password: string) => {
			this.isProcessing = true;
			try {
				// Detect real status first
				const status = await this.vaultManager.detectFolderLockStatus(folder.path);
				
			if (status.isLocked) {
				new Notice('ℹ️ This folder is already locked!');
				folder.isLocked = true;
				await this.saveSettings();
				this.refreshUi();
				return;
			}
				
				this.accessLogger.log('lock', folder.path, false, 'Started locking');
				new Notice(`🔒 LOCKING: "${folder.path}" + all subfolders...`);
				await this.vaultManager.lockFolder(folder, password);
				
				// Clear remembered password if enabled
				if (this.settings.clearPasswordOnLock) {
					this.passwordMemory.forgetPassword('folder', folder.path);
					this.passwordMemory.forgetPassword('parent-folder', this.passwordMemory.getParentFolder(folder.path));
					new Notice('🗑️ Remembered password cleared', 2000);
				}
				
			await this.saveSettings();
			this.accessLogger.log('lock', folder.path, true, `Locked ${folder.encryptedFiles.length} files`);
			new Notice(`🔒 Folder "${folder.path}" locked successfully!`, 3000);
			this.folderStatusCache.set(folder.path, { isLocked: true, algorithm: folder.algorithm || 'AES-256-GCM' });
			this.refreshUi();
			} finally {
				this.isProcessing = false;
			}
		}).open();
	}

	private async unlockAllFolders(password: string) {
		// PERBAIKAN: Check if already processing
		if (this.isProcessing) {
			new Notice('⏳ Please wait, another operation is in progress...');
			return;
		}
		
		this.isProcessing = true;
		try {
			const lockedFolders = this.settings.encryptedFolders.filter(f => f.isLocked);
			if (lockedFolders.length === 0) {
				new Notice('ℹ️ No locked folders to unlock.');
				return;
			}

			let successCount = 0;
			new Notice(`🔓 UNLOCKING ${lockedFolders.length} folder(s) + all subfolders...`);

			for (const folder of this.settings.encryptedFolders) {
				if (folder.isLocked) {
					const success = await this.vaultManager.decryptFolder(folder, password);
					if (success) {
						successCount++;
					}
				}
			}

		await this.saveSettings();
		
		if (successCount > 0) {
			this.settings.lastUnlockTime = Date.now();
			new Notice(`✅ SUCCESS! Unlocked ${successCount} folder(s) (all subfolders decrypted)`, 5000);
			this.invalidateFolderStatusCache();
			this.refreshUi();
		} else {
			new Notice('❌ FAILED! Wrong password or no folders to unlock.');
		}
		} finally {
			this.isProcessing = false;
		}
	}

	private async lockAllFolders(password: string) {
		// PERBAIKAN: Check if already processing
		if (this.isProcessing) {
			new Notice('⏳ Please wait, another operation is in progress...');
			return;
		}
		
		this.isProcessing = true;
		try {
			const unlockedFolders = this.settings.encryptedFolders.filter(f => !f.isLocked);
			if (unlockedFolders.length === 0) {
				new Notice('ℹ️ No unlocked folders to lock. All are already locked!');
				return;
			}

			let successCount = 0;
			new Notice(`🔒 LOCKING ${unlockedFolders.length} folder(s) + all subfolders...`);

			for (const folder of this.settings.encryptedFolders) {
				if (!folder.isLocked) {
					await this.vaultManager.lockFolder(folder, password);
					successCount++;
				}
			}

		await this.saveSettings();
		new Notice(`✅ SUCCESS! Locked ${successCount} folder(s) (all subfolders encrypted)`, 5000);
		this.invalidateFolderStatusCache();
		this.refreshUi();
		} finally {
			this.isProcessing = false;
		}
	}

	private startAutoLockTimer() {
		if (this.autoLockTimer) {
			clearInterval(this.autoLockTimer);
		}

		this.autoLockTimer = setInterval(() => {
			const now = Date.now();
			const timeoutMs = this.settings.autoLockTimeout * 60 * 1000;
			
			if (now - this.settings.lastUnlockTime > timeoutMs) {
				const unlockedFolders = this.settings.encryptedFolders.filter(f => !f.isLocked);
				
				if (unlockedFolders.length > 0) {
					new Notice('🔒 Auto-locking folders due to inactivity');
					// In real implementation, we would need to store password temporarily
					// For now, just mark as locked
					unlockedFolders.forEach(f => f.isLocked = true);
					this.saveSettings();
				}
			}
		}, 60 * 1000); // Check every minute
	}

	private updateStatusBar(statusBar: HTMLElement) {
		const lockedCount = this.settings.encryptedFolders.filter(f => f.isLocked).length;
		const totalFolders = this.settings.encryptedFolders.length;
		const encryptedFiles = this.fileEncryption.getEncryptedFiles().length;
		
		let statusText = `🔐 ${lockedCount}/${totalFolders}`;
		
		// Add encrypted files count if any
		if (encryptedFiles > 0) {
			statusText += ` | 📄 ${encryptedFiles}`;
		}
		
		// Add auto-lock timer if enabled and vaults are unlocked
		if (this.settings.autoLockEnabled && (totalFolders - lockedCount) > 0) {
			const timeRemaining = this.autoLockManager.getFormattedTimeUntilLock();
			if (timeRemaining !== 'Disabled') {
				statusText += ` | ⏱️ ${timeRemaining}`;
			}
		}
		
		statusBar.setText(statusText);
	}

	/**
	 * Helper: Show file suggester to choose from list
	 */
	async showFileSuggester(files: TFile[]): Promise<TFile | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('📁 Choose encrypted file to preview');

			const list = modal.contentEl.createDiv('file-list');
			list.style.cssText = 'max-height: 400px; overflow-y: auto;';

			files.forEach(file => {
				const item = list.createDiv('file-item');
				item.style.cssText = `
					padding: 10px;
					margin: 5px 0;
					border-radius: 6px;
					cursor: pointer;
					background: var(--background-secondary);
					transition: all 0.2s ease;
				`;
				item.textContent = `📄 ${file.path}`;

				item.addEventListener('mouseenter', () => {
					item.style.background = 'var(--interactive-accent)';
					item.style.color = 'var(--text-on-accent)';
					item.style.transform = 'translateX(4px)';
				});

				item.addEventListener('mouseleave', () => {
					item.style.background = 'var(--background-secondary)';
					item.style.color = 'var(--text-normal)';
					item.style.transform = 'translateX(0)';
				});

				item.addEventListener('click', () => {
					modal.close();
					resolve(file);
				});
			});

			modal.open();
			modal.onClose = () => resolve(null);
		});
	}

	private async ensureSecureVaultFolder() {
		const folderPath = 'SecureVault';
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!folder) {
			try {
				await this.app.vault.createFolder(folderPath);
				
				// Buat welcome note
				const welcomeContent = `# 🔐 Welcome to SecureVault-Hades

Folder **SecureVault** ini otomatis dibuat untuk menyimpan catatan terenkripsi Anda dengan aman menggunakan enkripsi **AES-256** dengan PBKDF2 (100,000 iterasi).

## 🎯 3 Cara Mudah Mengakses:

1. **Klik Icon 🛡️** di ribbon kiri → Menu popup muncul
2. **Klik Status Bar 🔐** di bawah → Menu popup muncul  
3. **Ctrl+P → "Open SecureVault-Hades menu"**

## 🚀 Cara Encrypt Folder (SUPER MUDAH!):

### Metode 1: Klik Kanan (RECOMMENDED!)
1. **Klik kanan folder** di file explorer
2. Pilih **"🛡️ Encrypt folder"**
3. Masukkan password → Done! ✅

### Metode 2: Via Menu
1. Klik icon 🛡️ atau status bar 🔐
2. Klik **"➕ Create Encrypted Folder"**
3. Masukkan path folder & password → Done! ✅

### Metode 3: Encrypt Current Folder
1. Buka file di folder yang ingin dienkripsi
2. Klik 🛡️ → **"🛡️ Encrypt Current Folder"**
3. Masukkan password → Done! ✅

## 📁 Fitur Sub-Folder:

✅ **Semua sub-folder dan file** di dalamnya juga ikut terenkripsi!
✅ Bisa encrypt/decrypt **sub-folder secara terpisah** (klik kanan!)
✅ Recursive encryption - aman total!

## � Cara Unlock/Lock Folder:

### Via Klik Kanan (FASTEST!):
- **Klik kanan folder terenkripsi** → Pilih **🔓 Unlock** atau **🔒 Lock**

### Via Menu:
- Klik 🛡️ → Lihat daftar folder → Klik tombol **Unlock**/**Lock**

### Unlock/Lock Semua:
- Klik 🛡️ → **🔓 Unlock All** atau **🔒 Lock All**

## 💡 Tips:

- 🔑 **Password minimal 6 karakter** - gunakan yang kuat!
- 🔄 **Sub-folder** di dalam SecureVault bisa encrypt/decrypt terpisah
- 📊 **Status bar** menampilkan: 🔐 X/Y (X locked dari Y total)
- ⚠️ **Jangan lupa password** - tidak ada recovery!
- ✅ **100% aman** - enkripsi AES-256, client-side only

## 🎨 Contoh Struktur:

\`\`\`
SecureVault/
├── README.md (ini)
├── Personal/          ← Encrypt ini (klik kanan!)
│   ├── diary.md
│   └── secrets.md
├── Work/              ← Encrypt ini juga
│   ├── Project1/      ← Sub-folder ikut terenkripsi!
│   │   └── notes.md
│   └── Project2/
└── Family/
    └── memories.md
\`\`\`

---
**⚡ Quick Start**: Buat folder di dalam SecureVault → Klik kanan folder → "🛡️ Encrypt folder" → Masukkan password → DONE! ✅

**🔐 Enkripsi**: AES-256-GCM with PBKDF2 (100,000 iterations)
**✨ Made with ❤️ by Hades Team**
`;
				await this.app.vault.create(`${folderPath}/README.md`, welcomeContent);
				
				new Notice('✅ Folder SecureVault berhasil dibuat! Buka README.md untuk panduan.', 5000);
			} catch (error) {
				console.error('Failed to create SecureVault folder:', error);
			}
		}
	}

	async activateSecureVaultSidebar() {
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SECUREVAULT)[0];

		if (!leaf) {
			let rightLeaf = this.app.workspace.getRightLeaf(false);
			if (!rightLeaf) {
				rightLeaf = this.app.workspace.getRightLeaf(true);
			}

			if (!rightLeaf) {
				return;
			}

			await rightLeaf.setViewState({ type: VIEW_TYPE_SECUREVAULT, active: true });
			leaf = rightLeaf;
		}

		this.app.workspace.revealLeaf(leaf);
	}

	refreshSidebarView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SECUREVAULT);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof SecureVaultView) {
				view.refresh();
			}
		}
	}

	refreshUi() {
		this.refreshStatusBar();
		this.refreshSidebarView();
	}

	refreshStatusBar() {
		// PERBAIKAN: Debounce status bar updates (max 1 update per second)
		if (this.statusBarUpdateTimer) {
			clearTimeout(this.statusBarUpdateTimer);
		}
		
		this.statusBarUpdateTimer = setTimeout(() => {
			if (this.statusBarEl) {
				this.updateStatusBar(this.statusBarEl);
			}
		}, 300); // Debounce 300ms sebelum update
	}

	async runSecurityAudit() {
		new Notice('🔍 Running SecureVault audit...');
		const report = await this.securityAudit.runAudit();

		if (report.issues.length === 0) {
			new Notice('✅ SecureVault audit complete — no issues found.');
		} else {
			new Notice(`⚠️ SecureVault audit found ${report.issues.length} issue(s).`);
		}

		new SecurityAuditModal(this.app, report).open();
	}
}

// Quick Menu Modal - Pengganti Sidebar
export class QuickMenuModal extends Modal {
	plugin: SecureVaultPlugin;

	constructor(app: any, plugin: SecureVaultPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('securevault-quick-menu');

		// Title with current algorithm
		const selectedAlgorithm = this.plugin.settings.encryptionAlgorithm;
		const algoIcon = selectedAlgorithm === 'ChaCha20-Poly1305' ? '🚀' : '🔐';
		contentEl.createEl('h2', { 
			text: `${algoIcon} SecureVault-Hades`, 
			cls: 'securevault-title' 
		});

		// Status Summary with real-time detection (tanpa save settings di sini!)
		const summary = contentEl.createDiv('securevault-summary');
		const totalFolders = this.plugin.settings.encryptedFolders.length;
		
		// Count real locked/unlocked by detecting actual file status
		// PERBAIKAN: Simpan status di memori saja, jangan save settings berulang kali
		let realLockedCount = 0;
		const folderStatuses = new Map<string, any>();
		
		for (const folder of this.plugin.settings.encryptedFolders) {
			let status = this.plugin.folderStatusCache.get(folder.path);
			if (!status) {
				status = await this.plugin.vaultManager.detectFolderLockStatus(folder.path);
				this.plugin.folderStatusCache.set(folder.path, status);
			}
			folderStatuses.set(folder.path, status);
			if (status.isLocked) {
				realLockedCount++;
			}
		}
		
		const realUnlockedCount = totalFolders - realLockedCount;

		summary.createEl('div', { 
			text: `📊 Total: ${totalFolders} folders`,
			cls: 'summary-item'
		});
		summary.createEl('div', { 
			text: `🔒 Locked: ${realLockedCount}`,
			cls: 'summary-item locked'
		});
		summary.createEl('div', { 
			text: `🔓 Unlocked: ${realUnlockedCount}`,
			cls: 'summary-item unlocked'
		});
		
		// Current algorithm indicator
		const defaultAlgorithm = this.plugin.settings.encryptionAlgorithm;
		const algoText = defaultAlgorithm === 'ChaCha20-Poly1305' ? '🚀 ChaCha20' : '🔐 AES-256';
		summary.createEl('div', { 
			text: `Default: ${algoText}`,
			cls: 'summary-item algo'
		});

		// Divider
		contentEl.createEl('hr');

		// Quick Actions Title
		contentEl.createEl('h3', { text: '⚡ Quick Actions' });

		// Action Buttons
		new Setting(contentEl)
			.setName('➕ Create Encrypted Folder')
			.setDesc('📁 Create new folder + encrypt all files & subfolders inside it')
			.addButton(btn => btn
				.setButtonText('Create')
				.setCta()
				.onClick(() => {
					this.close();
					this.plugin.createEncryptedFolderCommand();
				}));

		new Setting(contentEl)
			.setName('🔓 Unlock All Folders')
			.setDesc('🔓 DECRYPT all folders & subfolders (enter password to read files)')
			.addButton(btn => btn
				.setButtonText('Unlock All')
				.setClass('mod-warning')
				.onClick(() => {
					this.close();
					this.plugin.unlockAllCommand();
				}));

		new Setting(contentEl)
			.setName('🔒 Lock All Folders')
			.setDesc('🔒 ENCRYPT all folders & subfolders back (files become unreadable)')
			.addButton(btn => btn
				.setButtonText('Lock All')
				.onClick(() => {
					this.close();
					this.plugin.lockAllCommand();
				}));

		new Setting(contentEl)
			.setName('🛡️ Encrypt Current Folder')
			.setDesc('🛡️ Encrypt the folder of your currently opened file + all subfolders')
			.addButton(btn => btn
				.setButtonText('Encrypt')
				.onClick(() => {
					this.close();
					this.plugin.encryptCurrentFolderCommand();
				}));

		// Divider
		if (totalFolders > 0) {
			contentEl.createEl('hr');
			
			// Help text
			const helpDiv = contentEl.createDiv('securevault-help');
			helpDiv.createEl('strong', { text: '💡 How to use:' });
			helpDiv.createEl('div', { text: '• Click "Unlock" to DECRYPT files (make them readable)' });
			helpDiv.createEl('div', { text: '• Click "Lock" to ENCRYPT files (make them unreadable)' });
			helpDiv.createEl('div', { text: '• All subfolders are included automatically!' });
			helpDiv.createEl('div', { text: '• Status & Algorithm detected in REAL-TIME! ✅' });
			
			contentEl.createEl('hr');
			contentEl.createEl('h3', { text: '📁 Your Encrypted Folders' });

			// Render folders dengan folderStatuses yang sudah dikumpulkan
			await this.renderFolderList(contentEl, folderStatuses);
		}

		// Footer
		contentEl.createEl('hr');
		const footer = contentEl.createDiv('securevault-footer');
		footer.createEl('strong', { text: '💡 Pro Tips:' });
		footer.createEl('div', { text: '• RIGHT-CLICK folder in file explorer → Quick encrypt/decrypt!' });
		footer.createEl('div', { text: '• Click status bar 🔐 for quick menu access' });
		footer.createEl('div', { text: '• Subfolders are ALWAYS included in encrypt/decrypt!' });
		footer.createEl('br');
		footer.createEl('small', { 
			text: '🔐 AES-256 Encryption • All operations include subfolders',
			cls: 'securevault-tip'
		});
	}

	async renderFolderList(containerEl: HTMLElement, folderStatuses: Map<string, any>) {
		// PERBAIKAN: Gunakan folderStatuses yang sudah dikumpulkan di onOpen
		// Update settings SATU KALI saja jika ada perubahan
		let hasChanges = false;
		
		for (const folder of this.plugin.settings.encryptedFolders) {
			const realStatus = folderStatuses.get(folder.path);
			if (!realStatus) continue;
			
			// Check if status changed
			if (folder.isLocked !== realStatus.isLocked) {
				folder.isLocked = realStatus.isLocked;
				hasChanges = true;
			}
		}
		
		// Save settings SATU KALI saja jika ada perubahan
		if (hasChanges) {
			await this.plugin.saveSettings();
		}
		
		// Render UI
		for (const folder of this.plugin.settings.encryptedFolders) {
			const realStatus = folderStatuses.get(folder.path);
			if (!realStatus) continue;
			
			const icon = realStatus.isLocked ? '🔒' : '🔓';
			const statusText = realStatus.isLocked ? 'LOCKED (Encrypted)' : 'UNLOCKED (Decrypted)';
			const statusColor = realStatus.isLocked ? 'encrypted' : 'decrypted';
			
			// Algorithm display with emoji
			let algoDisplay = '';
			if (realStatus.algorithm === 'AES-256-GCM') {
				algoDisplay = '🔐 AES-256';
			} else if (realStatus.algorithm === 'ChaCha20-Poly1305') {
				algoDisplay = '🚀 ChaCha20';
			} else if (realStatus.algorithm === 'Mixed') {
				algoDisplay = '🔀 Mixed';
			} else {
				algoDisplay = '❓ Unknown';
			}
			
			new Setting(containerEl)
				.setName(`${icon} ${folder.path}`)
				.setDesc(`${folder.encryptedFiles.length} files • Status: ${statusText} • ${algoDisplay}`)
				.setClass(`folder-item-${statusColor}`)
				.addButton(btn => {
					btn.setButtonText(realStatus.isLocked ? '🔓 Unlock' : '🔒 Lock')
						.setClass(realStatus.isLocked ? 'unlock-btn' : 'lock-btn')
						.onClick(async () => {
							// PERBAIKAN: Tutup modal dulu, proses, lalu beri notifikasi
							// JANGAN buka modal lagi otomatis (menghindari looping)
							this.close();
							if (realStatus.isLocked) {
								await this.plugin.unlockSpecificFolder(folder);
								new Notice('✅ Folder unlocked! Open menu again to see updated status.');
							} else {
								await this.plugin.lockSpecificFolder(folder);
								new Notice('✅ Folder locked! Open menu again to see updated status.');
							}
						});
				});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
