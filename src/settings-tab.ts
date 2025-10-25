import { App, PluginSettingTab, Setting, Notice, TFile, Platform } from 'obsidian';
import SecureVaultPlugin from '../main';
import { AccessLogModal } from './modals';
import { generateKeyFile, validateKeyFile } from './utils';
import { FilePickerModal, FileSaveModal } from './file-picker-modal';
import { FileSystemPicker } from './file-system-picker';
import { SetupMasterPasswordModal } from './setup-master-password-modal';

export class SecureVaultSettingTab extends PluginSettingTab {
	plugin: SecureVaultPlugin;

	constructor(app: App, plugin: SecureVaultPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Helper: Ask user if they want to save system file to vault
	 * Returns object with saved status and path
	 */
	/**
	 * Helper: Check key file status
	 */
	private async checkKeyFileStatus(): Promise<{
		exists: boolean;
		valid: boolean;
		message: string;
		color: string;
		icon: string;
		file?: TFile;
	}> {
		if (!this.plugin.settings.keyFilePath) {
			return {
				exists: false,
				valid: false,
				message: 'No key file configured',
				color: 'var(--text-muted)',
				icon: 'ℹ️'
			};
		}

		const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.keyFilePath);
		
		if (!file || !(file instanceof TFile)) {
			return {
				exists: false,
				valid: false,
				message: 'Key file path set but FILE NOT FOUND!',
				color: 'var(--text-error)',
				icon: '⚠️'
			};
		}

		try {
			const content = await this.app.vault.read(file);
			if (validateKeyFile(content)) {
				return {
					exists: true,
					valid: true,
					message: 'Key file loaded and validated successfully',
					color: 'var(--text-success)',
					icon: '✅',
					file: file
				};
			} else {
				return {
					exists: true,
					valid: false,
					message: 'Key file exists but format is INVALID!',
					color: 'var(--text-error)',
					icon: '❌',
					file: file
				};
			}
		} catch (error) {
			return {
				exists: true,
				valid: false,
				message: `Key file exists but cannot be read: ${error.message}`,
				color: 'var(--text-error)',
				icon: '❌'
			};
		}
	}

	/**
	 * Helper: Ask user if they want to save system file to vault
	 */
	private async confirmSaveToVault(content: string, originalName: string): Promise<{ saved: boolean; path?: string }> {
		return new Promise((resolve) => {
			const modal = new ConfirmSaveModal(this.app, async (confirmed: boolean) => {
				if (confirmed) {
					const picker = new FileSystemPicker(this.app);
					const savedPath = await picker.saveKeyFile(content, originalName.replace(/\.[^/.]+$/, ''));
					
					if (savedPath && savedPath !== 'system-export') {
						this.plugin.settings.keyFilePath = savedPath;
						await this.plugin.saveSettings();
						new Notice(`✅ Key file saved to vault: ${savedPath}`, 5000);
						resolve({ saved: true, path: savedPath });
					} else {
						resolve({ saved: false });
					}
				} else {
					new Notice(`ℹ️ Key file loaded for current session only`, 5000);
					resolve({ saved: false });
				}
			});
			modal.open();
		});
	}

	/**
	 * Helper: Confirm master password reset
	 */
	private async confirmResetPassword(): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new ConfirmResetPasswordModal(this.app, (confirmed: boolean) => {
				resolve(confirmed);
			});
			modal.open();
		});
	}

	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '⚙️ SecureVault-Hades Settings' });

		// Encryption Algorithm Selection
		new Setting(containerEl)
			.setName('🔐 Encryption Algorithm')
			.setDesc('Choose encryption algorithm for new encrypted folders. Existing folders keep their algorithm.')
			.addDropdown(dropdown => dropdown
				.addOption('AES-256-GCM', 'AES-256-GCM (Standard, Recommended)')
				.addOption('ChaCha20-Poly1305', 'ChaCha20-Poly1305 (Modern, Faster)')
				.setValue(this.plugin.settings.encryptionAlgorithm)
				.onChange(async (value) => {
					this.plugin.settings.encryptionAlgorithm = value as 'AES-256-GCM' | 'ChaCha20-Poly1305';
					await this.plugin.saveSettings();
					// Update crypto service
					const { CryptoService } = await import('./crypto');
					CryptoService.setAlgorithm(this.plugin.settings.encryptionAlgorithm);
				}));

		// Algorithm Info
		const algoInfo = containerEl.createDiv('algorithm-info');
		algoInfo.style.backgroundColor = 'var(--background-secondary)';
		algoInfo.style.padding = '15px';
		algoInfo.style.borderRadius = '8px';
		algoInfo.style.marginBottom = '20px';
		algoInfo.style.borderLeft = '3px solid var(--text-accent)';
		
		algoInfo.createEl('p', { 
			text: '📌 Algorithm Details:',
			cls: 'setting-item-name'
		});
		
		const ul = algoInfo.createEl('ul');
		ul.style.marginLeft = '20px';
		ul.style.fontSize = '0.9em';
		ul.innerHTML = `
			<li style="margin: 8px 0;"><strong>AES-256-GCM</strong>: Industry standard (NSA approved), widely supported, battle-tested security ✅</li>
			<li style="margin: 8px 0;"><strong>ChaCha20-Poly1305</strong>: Modern cipher by Google, faster on mobile/low-power devices, used in TLS 1.3 🚀</li>
		`;
		
		const note = algoInfo.createEl('p');
		note.style.marginTop = '10px';
		note.style.fontSize = '0.9em';
		note.style.color = 'var(--text-warning)';
		note.innerHTML = '⚠️ <strong>Important:</strong> This setting only affects NEW encrypted folders. Existing folders automatically use their original algorithm (auto-detected on decrypt).';

	containerEl.createEl('hr');

	// ======= MASTER PASSWORD SETUP SECTION =======
	containerEl.createEl('h3', { text: '🔐 Master Password Setup' });

	const isPasswordSet = await this.plugin.passwordManager.isPasswordSet();
	
	if (!isPasswordSet) {
		// Show setup prompt when password not set
		const setupPrompt = containerEl.createDiv('setup-prompt');
		setupPrompt.style.cssText = `
			padding: 15px;
			margin-bottom: 15px;
			background-color: var(--background-secondary);
			border-radius: 6px;
			border-left: 4px solid var(--interactive-accent);
		`;
		setupPrompt.createEl('p', { 
			text: '⚠️ Master password not configured',
			cls: 'setting-item-heading'
		}).style.cssText = 'font-weight: 600; color: var(--text-warning); margin-bottom: 8px;';
		
		setupPrompt.createEl('p', { 
			text: 'Set up your master password to enable encryption features like folder encryption, file encryption, and encrypted attachments.'
		}).style.cssText = 'margin-bottom: 12px; color: var(--text-muted);';

		new Setting(setupPrompt)
			.setName('Setup Master Password')
			.setDesc('Create a master password to secure your encrypted content')
			.addButton(button => button
				.setButtonText('Setup Now')
				.setCta()
				.onClick(async () => {
					new SetupMasterPasswordModal(this.app, this.plugin, () => {
						// Refresh settings display after setup
						this.display();
					}).open();
				}));
	} else {
		// Show password status when configured
		const statusDisplay = containerEl.createDiv('password-status');
		statusDisplay.style.cssText = `
			padding: 12px;
			margin-bottom: 15px;
			background-color: var(--background-secondary);
			border-radius: 6px;
			border-left: 4px solid var(--interactive-success);
		`;
		statusDisplay.createEl('p', { 
			text: '✅ Master password is configured',
			cls: 'setting-item-heading'
		}).style.cssText = 'font-weight: 600; color: var(--interactive-success); margin-bottom: 8px;';
		
		statusDisplay.createEl('p', { 
			text: 'Your encryption features are ready to use. You can encrypt folders, individual files, and attachments.'
		}).style.cssText = 'color: var(--text-muted);';

		// Reset password option
		new Setting(containerEl)
			.setName('Reset Master Password')
			.setDesc('Clear master password and disable encryption (WARNING: This will not decrypt existing encrypted content)')
			.addButton(button => button
				.setButtonText('Reset Password')
				.setWarning()
				.onClick(async () => {
					const confirmed = await this.confirmResetPassword();
					if (confirmed) {
						try {
							await this.plugin.passwordManager.clearMasterPassword();
							new Notice('✅ Master password has been reset');
							this.display(); // Refresh settings display
						} catch (error) {
							console.error('Error resetting master password:', error);
							new Notice('❌ Error resetting master password');
						}
					}
				}));
	}

	containerEl.createEl('hr');

	// ======= PASSWORD SECURITY SECTION =======
	containerEl.createEl('h3', { text: '🔑 Password Security' });		new Setting(containerEl)
			.setName('Minimum password length')
			.setDesc('Minimum characters required for passwords (8-64)')
			.addText(text => text
				.setPlaceholder('8')
				.setValue(String(this.plugin.settings.passwordMinLength))
				.onChange(async (value) => {
					const len = parseInt(value);
					if (!isNaN(len) && len >= 8 && len <= 64) {
						this.plugin.settings.passwordMinLength = len;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Require strong passwords')
			.setDesc('Enforce strong password requirements (uppercase, lowercase, numbers, symbols)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.requireStrongPassword)
				.onChange(async (value) => {
					this.plugin.settings.requireStrongPassword = value;
					await this.plugin.saveSettings();
				}));

		// ======= KEY FILE SECTION =======
		containerEl.createEl('h3', { text: '🔐 Key File (Two-Factor Encryption)' });

		new Setting(containerEl)
			.setName('Enable key file support')
			.setDesc('Require a key file in addition to password (two-factor encryption)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableKeyFile)
				.onChange(async (value) => {
					this.plugin.settings.enableKeyFile = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide key file options
				}));

		if (this.plugin.settings.enableKeyFile) {
			const platformInfo = containerEl.createDiv('platform-info');
			platformInfo.style.cssText = `
				padding: 10px;
				margin-bottom: 15px;
				background-color: var(--background-secondary);
				border-radius: 6px;
				font-size: 0.9em;
			`;
			
			if (Platform.isDesktop) {
				platformInfo.innerHTML = `
					<strong>💻 Desktop Mode:</strong><br>
					• Choose from <strong>system folders</strong> (Documents, Downloads, USB, etc.)<br>
					• Choose from <strong>vault</strong> (Obsidian files)<br>
					• Export to system for maximum security
				`;
			} else if (Platform.isMobile) {
				platformInfo.innerHTML = `
					<strong>📱 Mobile Mode:</strong><br>
					• Choose from <strong>vault only</strong> (system access limited)<br>
					• Files saved to vault sync across devices<br>
					• Backup key file to cloud storage separately
				`;
			}

			new Setting(containerEl)
				.setName('Key file path')
				.setDesc(this.plugin.settings.keyFilePath 
					? `✅ Current: ${this.plugin.settings.keyFilePath}` 
					: '⚠️ No key file set. Choose existing or generate new one below.')
				.addButton(btn => btn
					.setButtonText(Platform.isDesktop ? '� Choose from System/Vault' : '📱 Choose from Vault')
					.setDisabled(false)
					.onClick(async () => {
						try {
							// Prevent double-click
							btn.setDisabled(true);
							btn.setButtonText('⏳ Loading...');
							
							const picker = new FileSystemPicker(this.app);
							const result = await picker.pickKeyFile();
							
							if (result) {
								// Validate format
								if (!validateKeyFile(result.content)) {
									new Notice('❌ Invalid key file format! Must be 64 hex characters.');
									return;
								}
								
								// Desktop: ask to save to vault
								if (Platform.isDesktop) {
									const saveResult = await this.confirmSaveToVault(result.content, result.name);
									
									if (saveResult.saved && saveResult.path) {
										// Saved successfully - refresh once
										this.display();
										return;
									}
									// Not saved - just notify
									new Notice('✅ Key file loaded temporarily (not saved to settings)', 5000);
								} else {
									// Mobile: from vault
									new Notice(`✅ Key file selected: ${result.name}`, 5000);
									this.display();
								}
							}
						} catch (error) {
							new Notice(`❌ Error: ${error.message}`);
							console.error('Load key error:', error);
						} finally {
							// Always re-enable
							btn.setDisabled(false);
							btn.setButtonText(Platform.isDesktop ? '💻 Choose from System/Vault' : '📱 Choose from Vault');
						}
					}))
				.addButton(btn => btn
					.setButtonText('🎲 Generate New Key File')
					.setCta()
					.setDisabled(false)
					.onClick(async () => {
						try {
							// Disable button to prevent double-click
							btn.setDisabled(true);
							btn.setButtonText('⏳ Generating...');
							
							const keyContent = generateKeyFile();
							const defaultName = `securevault-key-${Date.now()}`;
							
							const picker = new FileSystemPicker(this.app);
							const savedPath = await picker.saveKeyFile(keyContent, defaultName);
							
							if (savedPath && savedPath !== 'system-export') {
								// Saved to vault successfully
								this.plugin.settings.keyFilePath = savedPath;
								await this.plugin.saveSettings();
								
								new Notice(`✅ Key file generated!\n⚠️ BACKUP THIS FILE!`, 10000);
								// Refresh display once after successful save
								this.display();
							} else if (savedPath === 'system-export') {
								// Exported to Downloads
								new Notice(`✅ Key file exported to Downloads!\n💡 To use: Choose from System → Save to vault`, 8000);
								// Don't refresh - nothing saved to settings
							} else {
								// User cancelled
								new Notice(`ℹ️ Key generation cancelled`, 3000);
							}
						} catch (error) {
							new Notice(`❌ Error: ${error.message}`);
							console.error('Generate key error:', error);
						} finally {
							// Always re-enable button
							btn.setDisabled(false);
							btn.setButtonText('🎲 Generate New Key File');
						}
					}));

			// Key File Status Indicator (Always show if enabled)
			const statusContainer = containerEl.createDiv('key-file-status-container');
			statusContainer.style.cssText = `
				margin-bottom: 20px;
				padding: 15px;
				border-radius: 8px;
				border: 2px solid var(--background-modifier-border);
			`;

			// Check if key file exists and is valid (async)
			const keyFileStatus = await this.checkKeyFileStatus();

			// Update container styling based on status
			if (keyFileStatus.valid) {
				statusContainer.style.borderColor = 'var(--text-success)';
				statusContainer.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
			} else if (keyFileStatus.exists && !keyFileStatus.valid) {
				statusContainer.style.borderColor = 'var(--text-error)';
				statusContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
			} else {
				statusContainer.style.borderColor = 'var(--background-modifier-border)';
				statusContainer.style.backgroundColor = 'var(--background-secondary)';
			}

			// Status header
			const statusHeader = statusContainer.createEl('div');
			statusHeader.style.cssText = `
				display: flex;
				align-items: center;
				margin-bottom: 10px;
				font-weight: bold;
				font-size: 1.1em;
			`;
			
			const iconSpan = statusHeader.createEl('span', { text: `${keyFileStatus.icon} ` });
			iconSpan.style.marginRight = '8px';
			iconSpan.style.fontSize = '1.3em';
			
			statusHeader.createEl('span', { text: 'Key File Status' });

			// Status message
			const statusMessage = statusContainer.createEl('div');
			statusMessage.style.cssText = `
				color: ${keyFileStatus.color};
				font-weight: 500;
				margin-bottom: 8px;
			`;
			statusMessage.textContent = keyFileStatus.message;

			// Show path if set
			if (this.plugin.settings.keyFilePath) {
				const pathDisplay = statusContainer.createEl('div');
				pathDisplay.style.cssText = `
					font-size: 0.9em;
					color: var(--text-muted);
					font-family: monospace;
					background: var(--background-primary);
					padding: 6px 10px;
					border-radius: 4px;
					margin-top: 8px;
					word-break: break-all;
				`;
				pathDisplay.textContent = `📁 ${this.plugin.settings.keyFilePath}`;

				// Show file size if exists
				if (keyFileStatus.exists && keyFileStatus.file) {
					const sizeInfo = statusContainer.createEl('div');
					sizeInfo.style.cssText = `
						font-size: 0.85em;
						color: var(--text-muted);
						margin-top: 5px;
					`;
					sizeInfo.textContent = `📊 Size: ${keyFileStatus.file.stat.size} bytes | Modified: ${new Date(keyFileStatus.file.stat.mtime).toLocaleString()}`;
				}
			}

			// Warning if invalid
			if (keyFileStatus.exists && !keyFileStatus.valid) {
				const warningBox = statusContainer.createEl('div');
				warningBox.style.cssText = `
					margin-top: 10px;
					padding: 10px;
					background: rgba(255, 0, 0, 0.1);
					border-left: 3px solid var(--text-error);
					border-radius: 4px;
					font-size: 0.9em;
				`;
				warningBox.innerHTML = `
					<strong>⚠️ Action Required:</strong><br>
					Your key file is invalid! This will prevent encryption/decryption.<br>
					• Generate a new key file, or<br>
					• Choose a valid existing key file
				`;
			}

			// Success tips if valid
			if (keyFileStatus.valid) {
				const tipsBox = statusContainer.createEl('div');
				tipsBox.style.cssText = `
					margin-top: 10px;
					padding: 10px;
					background: rgba(0, 255, 0, 0.05);
					border-left: 3px solid var(--text-success);
					border-radius: 4px;
					font-size: 0.85em;
					color: var(--text-muted);
				`;
				tipsBox.innerHTML = `
					<strong>💡 Backup Reminder:</strong><br>
					• Copy key to password manager<br>
					• Save to USB drive<br>
					• Print and store in safe<br>
					<strong style="color: var(--text-error);">Loss = PERMANENT DATA LOSS!</strong>
				`;
			}

			// Only show detailed controls if key file exists
			if (this.plugin.settings.keyFilePath) {
				new Setting(containerEl)
					.setName('View key file content')
					.setDesc('Copy key file content for backup purposes')
					.addButton(btn => btn
						.setButtonText('📋 Copy Key')
						.onClick(async () => {
							try {
								const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.keyFilePath);
								if (!file || !(file instanceof TFile)) {
									new Notice('❌ Key file not found!');
									return;
								}
								
								const content = await this.app.vault.read(file);
								await navigator.clipboard.writeText(content);
								new Notice('✅ Key copied to clipboard! Store it safely!', 5000);
							} catch (error) {
								new Notice(`❌ Failed to copy key: ${error.message}`);
							}
						}));
				
				new Setting(containerEl)
					.setName('Clear key file')
					.setDesc('⚠️ Remove key file requirement (existing encrypted folders may become inaccessible!)')
					.addButton(btn => btn
						.setButtonText('Clear')
						.setWarning()
						.onClick(async () => {
							this.plugin.settings.keyFilePath = '';
							await this.plugin.saveSettings();
							new Notice('⚠️ Key file cleared. Existing encrypted folders may be inaccessible!');
							this.display();
						}));
			}
		}

		// ======= ACCESS LOG SECTION =======
		containerEl.createEl('h3', { text: '📊 Access Logging' });

		new Setting(containerEl)
			.setName('Enable access logging')
			.setDesc('Track all lock/unlock operations with timestamps')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAccessLog)
				.onChange(async (value) => {
					this.plugin.settings.enableAccessLog = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.enableAccessLog) {
			new Setting(containerEl)
				.setName('Maximum log entries')
				.setDesc('Keep last N log entries (older entries auto-deleted)')
				.addText(text => text
					.setPlaceholder('100')
					.setValue(String(this.plugin.settings.maxAccessLogs))
					.onChange(async (value) => {
						const max = parseInt(value);
						if (!isNaN(max) && max > 0 && max <= 10000) {
							this.plugin.settings.maxAccessLogs = max;
							await this.plugin.saveSettings();
						}
					}));

			new Setting(containerEl)
				.setName('View access logs')
				.setDesc(`Current logs: ${this.plugin.settings.accessLogs.length} entries`)
				.addButton(btn => btn
					.setButtonText('📖 View Logs')
					.setCta()
					.onClick(() => {
						new AccessLogModal(this.app, this.plugin.settings).open();
					}))
				.addButton(btn => btn
					.setButtonText('🗑️ Clear All Logs')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.accessLogs = [];
						await this.plugin.saveSettings();
						new Notice('✅ All access logs cleared');
						this.display();
					}));
		}

		containerEl.createEl('hr');

		// ======= AUTO-LOCK TIMER SECTION =======
		containerEl.createEl('h3', { text: '⏱️ Auto-Lock Timer' });

		new Setting(containerEl)
			.setName('Enable auto-lock')
			.setDesc('Automatically lock all vaults after period of inactivity')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoLockEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autoLockEnabled = value;
					if (value) {
						this.plugin.autoLockManager.start();
						new Notice('✅ Auto-lock timer started');
					} else {
						this.plugin.autoLockManager.stop();
						new Notice('❌ Auto-lock timer stopped');
					}
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.autoLockEnabled) {
			new Setting(containerEl)
				.setName('Auto-lock timeout')
				.setDesc('Lock all vaults after this many minutes of inactivity')
				.addDropdown(dropdown => dropdown
					.addOption('1', '1 minute')
					.addOption('5', '5 minutes')
					.addOption('10', '10 minutes')
					.addOption('15', '15 minutes')
					.addOption('30', '30 minutes')
					.addOption('60', '1 hour')
					.setValue(String(this.plugin.settings.autoLockTimeout))
					.onChange(async (value) => {
						this.plugin.settings.autoLockTimeout = parseInt(value);
						await this.plugin.saveSettings();
						// Reset activity timer
						this.plugin.autoLockManager.resetActivity();
					}));

			// Show current status
			const statusDiv = containerEl.createEl('div');
			statusDiv.style.cssText = `
				background: var(--background-secondary);
				padding: 10px 15px;
				border-radius: 6px;
				border-left: 3px solid var(--interactive-accent);
				margin: 10px 0;
				font-size: 0.9em;
			`;
			const timeUntilLock = this.plugin.autoLockManager.getFormattedTimeUntilLock();
			statusDiv.innerHTML = `
				<strong>⏱️ Time until auto-lock:</strong> ${timeUntilLock}<br>
				<span style="color: var(--text-muted); font-size: 0.9em;">Resets on any activity (typing, clicking, file opens)</span>
			`;
		}

		containerEl.createEl('hr');

		// ======= ENCRYPTED ATTACHMENTS SECTION =======
		containerEl.createEl('h3', { text: '📎 Encrypted Attachments' });

		new Setting(containerEl)
			.setName('Enable attachment encryption')
			.setDesc('Support encrypting images, PDFs, videos, and other binary files')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.encryptAttachments)
				.onChange(async (value) => {
					this.plugin.settings.encryptAttachments = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.encryptAttachments) {
			const attachmentInfo = containerEl.createEl('div');
			attachmentInfo.style.cssText = `
				background: var(--background-secondary);
				padding: 10px 15px;
				border-radius: 6px;
				margin: 10px 0;
				font-size: 0.9em;
			`;
			attachmentInfo.innerHTML = `
				<strong>📁 Supported file types:</strong><br>
				<span style="color: var(--text-muted);">
					• Images: ${this.plugin.settings.attachmentTypes.filter(t => ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(t)).join(', ')}<br>
					• Documents: ${this.plugin.settings.attachmentTypes.filter(t => ['pdf'].includes(t)).join(', ')}<br>
					• Videos: ${this.plugin.settings.attachmentTypes.filter(t => ['mp4', 'webm'].includes(t)).join(', ')}<br>
					• Audio: ${this.plugin.settings.attachmentTypes.filter(t => ['mp3', 'wav', 'ogg'].includes(t)).join(', ')}
				</span>
			`;
		}

		containerEl.createEl('hr');

		// ======= QUICK UNLOCK SECTION =======
		containerEl.createEl('h3', { text: '⚡ Quick Unlock' });

		const quickUnlockDesc = containerEl.createEl('p');
		quickUnlockDesc.style.cssText = `
			color: var(--text-muted);
			font-size: 0.9em;
			margin-bottom: 15px;
		`;
		quickUnlockDesc.textContent = 'Temporarily unlock individual encrypted files without full vault unlock (via right-click context menu)';

		new Setting(containerEl)
			.setName('Quick unlock timeout')
			.setDesc('Auto-lock quick-unlocked files after this many minutes')
			.addDropdown(dropdown => dropdown
				.addOption('1', '1 minute')
				.addOption('5', '5 minutes')
				.addOption('10', '10 minutes')
				.addOption('15', '15 minutes')
				.addOption('30', '30 minutes')
				.setValue(String(this.plugin.settings.quickUnlockTimeout))
				.onChange(async (value) => {
					this.plugin.settings.quickUnlockTimeout = parseInt(value);
					await this.plugin.saveSettings();
				}));

		// Show quick unlocked files
		const quickUnlockedFiles = this.plugin.fileEncryption.getQuickUnlockedFiles();
		if (quickUnlockedFiles.length > 0) {
			const quickUnlockStatus = containerEl.createEl('div');
			quickUnlockStatus.style.cssText = `
				background: var(--background-modifier-success);
				padding: 10px 15px;
				border-radius: 6px;
				border-left: 3px solid var(--text-success);
				margin: 10px 0;
				font-size: 0.9em;
			`;
			quickUnlockStatus.innerHTML = `
				<strong>⚡ Currently quick-unlocked files:</strong> ${quickUnlockedFiles.length}<br>
				<span style="color: var(--text-muted); font-size: 0.85em;">
					${quickUnlockedFiles.map(f => `• ${f}`).join('<br>')}
				</span>
			`;
		}

		containerEl.createEl('hr');

		// ======= PASSWORD SETTINGS SECTION =======
		containerEl.createEl('h3', { text: '🔑 Password Settings' });

		new Setting(containerEl)
			.setName('Confirm password when encrypting')
			.setDesc('Require password confirmation when encrypting (recommended for security)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.confirmPassword)
				.onChange(async (value) => {
					this.plugin.settings.confirmPassword = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Remember password')
			.setDesc('Remember the last used passwords when encrypting or decrypting. Passwords are cleared on Obsidian close.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.rememberPassword)
				.onChange(async (value) => {
					this.plugin.settings.rememberPassword = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide dependent settings
				}));

		if (this.plugin.settings.rememberPassword) {
			new Setting(containerEl)
				.setName('Remember password by')
				.setDesc('Choose how passwords are remembered and reused')
				.addDropdown(dropdown => dropdown
					.addOption('vault', 'Vault - Same password for entire vault')
					.addOption('folder', 'Folder - Different password per folder')
					.addOption('parent-folder', 'Parent Folder - By parent folder path')
					.addOption('file', 'File - Different password per file')
					.addOption('external', 'External File - For key files')
					.setValue(this.plugin.settings.rememberPasswordBy)
					.onChange(async (value) => {
						this.plugin.settings.rememberPasswordBy = value as any;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Remember password timeout')
				.setDesc('Passwords expire after this duration. Cleared automatically when Obsidian closes.')
				.addDropdown(dropdown => dropdown
					.addOption('1', '1 minute')
					.addOption('5', '5 minutes')
					.addOption('10', '10 minutes')
					.addOption('15', '15 minutes')
					.addOption('30', '30 minutes')
					.addOption('60', '1 hour')
					.addOption('120', '2 hours')
					.setValue(String(this.plugin.settings.rememberPasswordTimeout))
					.onChange(async (value) => {
						this.plugin.settings.rememberPasswordTimeout = parseInt(value);
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Auto-decrypt with remembered password')
				.setDesc('Automatically decrypt files/folders if password is remembered (no prompt)')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.autoDecryptWithRememberedPassword)
					.onChange(async (value) => {
						this.plugin.settings.autoDecryptWithRememberedPassword = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Clear password when locking')
				.setDesc('Forget remembered password when you lock a file or folder')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.clearPasswordOnLock)
					.onChange(async (value) => {
						this.plugin.settings.clearPasswordOnLock = value;
						await this.plugin.saveSettings();
					}));

			// Show remembered passwords status
			const rememberedCount = this.plugin.passwordMemory.getRememberedCount();
			if (rememberedCount > 0) {
				const rememberedStatus = containerEl.createEl('div');
				rememberedStatus.style.cssText = `
					background: var(--background-modifier-success);
					padding: 10px 15px;
					border-radius: 6px;
					border-left: 3px solid var(--text-success);
					margin: 10px 0;
					font-size: 0.9em;
				`;
				rememberedStatus.innerHTML = `
					<strong>🔑 Currently remembered passwords:</strong> ${rememberedCount}<br>
					<span style="color: var(--text-muted); font-size: 0.85em;">
						Use command "Forget all remembered passwords" to clear all
					</span>
				`;
			}
		}

		containerEl.createEl('hr');

		// ======= IN-PLACE ENCRYPTION SECTION =======
		containerEl.createEl('h3', { text: '✍️ In-place Encryption (Selection-based)' });

		const inplaceDesc = containerEl.createEl('p');
		inplaceDesc.style.cssText = `
			color: var(--text-muted);
			font-size: 0.9em;
			margin-bottom: 15px;
		`;
		inplaceDesc.innerHTML = `
			<strong>Selection-based encryption</strong> allows you to encrypt only parts of a note, not the whole file.<br>
			Encrypted text appears as <code>\`\`\`encrypt</code> blocks that can be decrypted individually.
		`;

		new Setting(containerEl)
			.setName('Expand selection to whole line')
			.setDesc('Partial selections will be expanded to the whole line when encrypting')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.expandSelectionToWholeLine)
				.onChange(async (value) => {
					this.plugin.settings.expandSelectionToWholeLine = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Search limit for markers')
			.setDesc('How far to look for encrypted markers when decrypting (in characters)')
			.addText(text => text
				.setPlaceholder('1000')
				.setValue(String(this.plugin.settings.searchLimitForMarkers))
				.onChange(async (value) => {
					const limit = parseInt(value);
					if (!isNaN(limit) && limit > 0 && limit <= 10000) {
						this.plugin.settings.searchLimitForMarkers = limit;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Show encrypted marker in Reading View')
			.setDesc('When encrypting inline text, show a visible marker in Reading View by default')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showEncryptedMarkerInReading)
				.onChange(async (value) => {
					this.plugin.settings.showEncryptedMarkerInReading = value;
					await this.plugin.saveSettings();
				}));

		// How to use
		const howToUse = containerEl.createEl('div');
		howToUse.style.cssText = `
			background: var(--background-secondary);
			padding: 15px;
			border-radius: 6px;
			margin: 10px 0;
			font-size: 0.9em;
		`;
		howToUse.innerHTML = `
			<strong>💡 How to use selection-based encryption:</strong><br><br>
			<strong>1. Encrypt text:</strong><br>
			• Select text you want to encrypt<br>
			• Run command: "🔒 Encrypt selected text"<br>
			• Enter password<br>
			• Selected text becomes <code>\`\`\`encrypt</code> block<br><br>
			<strong>2. Decrypt text:</strong><br>
			• Place cursor inside encrypted block<br>
			• Run command: "🔓 Decrypt encrypted block at cursor"<br>
			• Enter password<br>
			• Block is replaced with original text<br><br>
			<strong>3. Count blocks:</strong><br>
			• Run command: "📊 Count encrypted blocks in current file"
		`;

		containerEl.createEl('hr');

		// ======= SECVAULT EXTENSION SECTION =======
		containerEl.createEl('h3', { text: '📝 File Extension (.secvault)' });

		new Setting(containerEl)
			.setName('Use .secvault extension')
			.setDesc('Rename encrypted files to .secvault extension (e.g., file.md → file.secvault)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useSecvaultExtension)
				.onChange(async (value) => {
					this.plugin.settings.useSecvaultExtension = value;
					await this.plugin.saveSettings();
				}));

		if (this.plugin.settings.useSecvaultExtension) {
			const secvaultInfo = containerEl.createEl('div');
			secvaultInfo.style.cssText = `
				background: var(--background-secondary);
				padding: 15px;
				border-radius: 6px;
				margin: 10px 0;
				font-size: 0.9em;
			`;
			secvaultInfo.innerHTML = `
				<strong>📌 About .secvault files:</strong><br><br>
				• Encrypted files are renamed from <code>.md</code> to <code>.secvault</code><br>
				• <strong>Read-only preview</strong> in Obsidian (cannot edit until decrypted)<br>
				• Shows encryption metadata and partial content preview<br>
				• Click "🔓 Decrypt File" to restore to <code>.md</code><br>
				• Click "👁️ Quick View" for temporary view without decrypting<br><br>
				<strong>⚠️ Note:</strong> Files keep original extension when decrypted
			`;
		}

		containerEl.createEl('hr');

		// ======= PASSWORD CHANGE SECTION =======
		containerEl.createEl('h3', { text: '🔐 Password Management' });

		new Setting(containerEl)
			.setName('Change master password')
			.setDesc('Change your master password and re-encrypt all encrypted content')
			.addButton(btn => btn
				.setButtonText('🔐 Change Password')
				.setWarning()
				.onClick(async () => {
					// Import PasswordChangeModal
					const { PasswordChangeModal } = await import('./password-change-modal');
					new PasswordChangeModal(this.app, this.plugin).open();
				}));

		const warningBox = containerEl.createEl('div');
		warningBox.style.cssText = `
			background: var(--background-modifier-error);
			padding: 12px 15px;
			border-radius: 6px;
			border-left: 4px solid var(--text-error);
			margin: 10px 0;
			font-size: 0.9em;
		`;
		warningBox.innerHTML = `
			<strong>⚠️ Important:</strong><br>
			• Changing password will re-encrypt ALL encrypted folders and files<br>
			• Make sure to backup your vault before changing password<br>
			• Process may take time depending on amount of encrypted data<br>
			• You will need the current password to make changes
		`;

		containerEl.createEl('hr');

		new Setting(containerEl)
			.setName('Auto-lock timeout (Legacy)')
			.setDesc('Lock encrypted folders after inactivity (minutes) - Legacy setting, use Auto-Lock Timer above')
			.addText(text => text
				.setPlaceholder('5')
				.setValue(String(this.plugin.settings.autoLockTimeout))
				.onChange(async (value) => {
					const timeout = parseInt(value);
					if (!isNaN(timeout) && timeout > 0) {
						this.plugin.settings.autoLockTimeout = timeout;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Stealth mode')
			.setDesc('Hide encrypted folders from file explorer when locked')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showInFileExplorer)
				.onChange(async (value) => {
					this.plugin.settings.showInFileExplorer = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable biometric unlock')
			.setDesc('Use fingerprint/Face ID on mobile (requires setup)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableBiometric)
				.onChange(async (value) => {
					this.plugin.settings.enableBiometric = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto backup')
			.setDesc('Automatically backup encrypted folders')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.backupEnabled)
				.onChange(async (value) => {
					this.plugin.settings.backupEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Backup interval')
			.setDesc('How often to create backups (hours)')
			.addText(text => text
				.setPlaceholder('24')
				.setValue(String(this.plugin.settings.backupInterval))
				.onChange(async (value) => {
					const interval = parseInt(value);
					if (!isNaN(interval) && interval > 0) {
						this.plugin.settings.backupInterval = interval;
						await this.plugin.saveSettings();
					}
				}));

		containerEl.createEl('h3', { text: '📂 Encrypted Folders' });

		if (this.plugin.settings.encryptedFolders.length === 0) {
			containerEl.createEl('p', { 
				text: 'No encrypted folders yet. Create one using the command palette.',
				cls: 'setting-item-description'
			});
		} else {
			this.plugin.settings.encryptedFolders.forEach(folder => {
				// Get algorithm from first encrypted file
				let folderAlgorithm = 'Unknown';
				if (folder.encryptedFiles.length > 0) {
					// We'll show the algorithm if we can detect it
					folderAlgorithm = 'Mixed/Auto-detect';
				}
				
				new Setting(containerEl)
					.setName(folder.path)
					.setDesc(`Status: ${folder.isLocked ? '🔒 Locked' : '🔓 Unlocked'} | Files: ${folder.encryptedFiles.length} | Algorithm: Auto-detect`)
					.addButton(btn => btn
						.setButtonText('Remove')
						.setWarning()
						.onClick(async () => {
							this.plugin.settings.encryptedFolders = 
								this.plugin.settings.encryptedFolders.filter(f => f.path !== folder.path);
							await this.plugin.saveSettings();
							this.display();
						}));
			});
		}
	}
}

/**
 * Modal to confirm saving system-picked file to vault
 */
import { Modal } from 'obsidian';

class ConfirmSaveModal extends Modal {
	private onConfirm: (confirmed: boolean) => void;

	constructor(app: App, onConfirm: (confirmed: boolean) => void) {
		super(app);
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '💾 Save to Vault?' });

		const description = contentEl.createDiv();
		description.style.cssText = `
			margin-bottom: 20px;
			line-height: 1.6;
		`;
		description.innerHTML = `
			<p>You've selected a key file from your system (outside Obsidian).</p>
			<p><strong>Would you like to save it to your vault for easy access?</strong></p>
			<ul style="margin-left: 20px; color: var(--text-muted);">
				<li>✅ Auto-load on startup</li>
				<li>✅ Available on all devices (if synced)</li>
				<li>⚠️ Stored in vault (less secure than external)</li>
			</ul>
		`;

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.cssText = `
			display: flex;
			gap: 10px;
			justify-content: flex-end;
		`;

		const noBtn = buttonContainer.createEl('button', { text: 'No, Just Use Once' });
		noBtn.style.cssText = `
			padding: 8px 16px;
			border-radius: 4px;
			cursor: pointer;
		`;
		noBtn.addEventListener('click', () => {
			this.close();
			this.onConfirm(false);
		});

		const yesBtn = buttonContainer.createEl('button', { text: 'Yes, Save to Vault' });
		yesBtn.style.cssText = `
			padding: 8px 16px;
			border-radius: 4px;
			background-color: var(--interactive-accent);
			color: var(--text-on-accent);
			border: none;
			cursor: pointer;
			font-weight: bold;
		`;
		yesBtn.addEventListener('click', () => {
			this.close();
			this.onConfirm(true);
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal to confirm master password reset
 */
class ConfirmResetPasswordModal extends Modal {
	onConfirm: (confirmed: boolean) => void;

	constructor(app: App, onConfirm: (confirmed: boolean) => void) {
		super(app);
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '⚠️ Reset Master Password?' });

		const warning = contentEl.createDiv();
		warning.style.cssText = `
			padding: 15px;
			margin-bottom: 20px;
			background-color: var(--background-modifier-error);
			border-radius: 6px;
			border-left: 4px solid var(--text-error);
		`;
		warning.innerHTML = `
			<p style="font-weight: 600; color: var(--text-error); margin-bottom: 10px;">
				⚠️ WARNING: This action cannot be undone!
			</p>
			<p style="margin-bottom: 8px;">
				Resetting your master password will:
			</p>
			<ul style="margin-left: 20px; color: var(--text-muted);">
				<li><strong>Clear your current master password</strong></li>
				<li><strong>Disable all encryption features</strong></li>
				<li>⚠️ <strong>NOT decrypt your existing encrypted content</strong></li>
			</ul>
			<p style="margin-top: 12px; color: var(--text-error); font-weight: 600;">
				You will lose access to all currently encrypted files and folders unless you remember the old password!
			</p>
		`;

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.cssText = `
			display: flex;
			gap: 10px;
			justify-content: flex-end;
		`;

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.style.cssText = `
			padding: 8px 16px;
			border-radius: 4px;
			cursor: pointer;
		`;
		cancelBtn.addEventListener('click', () => {
			this.close();
			this.onConfirm(false);
		});

		const resetBtn = buttonContainer.createEl('button', { text: 'Reset Password' });
		resetBtn.style.cssText = `
			padding: 8px 16px;
			border-radius: 4px;
			background-color: var(--text-error);
			color: white;
			border: none;
			cursor: pointer;
			font-weight: bold;
		`;
		resetBtn.addEventListener('click', () => {
			this.close();
			this.onConfirm(true);
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
