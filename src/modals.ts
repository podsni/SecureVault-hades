import { App, Modal, Notice, Setting, TFile, Platform } from 'obsidian';
import { calculatePasswordStrength, generateSecurePassword, generateKeyFile, validateKeyFile, combinePasswordAndKeyFile } from './utils';
import { SecureVaultSettings } from './types';
import { AuditReport, AuditSeverity } from './services/security-audit';
import { FileSystemPicker } from './file-system-picker';

export class PasswordModal extends Modal {
	private password: string = '';
	private keyFileContent: string = '';
	private onSubmit: (password: string) => void;
	private settings: SecureVaultSettings;
	private strengthMeterEl: HTMLElement;

	constructor(app: App, settings: SecureVaultSettings, onSubmit: (password: string) => void) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '🔐 Enter Master Password' });

		// Password input with strength meter
		const passwordSetting = new Setting(contentEl)
			.setName('Password')
			.addText(text => {
				text.setPlaceholder('Enter password')
					.onChange(value => {
						this.password = value;
						this.updateStrengthMeter();
					});
				text.inputEl.type = 'password';
				text.inputEl.addClass('securevault-password-input');
			});

		// Strength meter
		this.strengthMeterEl = contentEl.createDiv('password-strength-meter');
		this.strengthMeterEl.style.marginBottom = '15px';

		// Key file option (if enabled)
		if (this.settings.enableKeyFile) {
			const keyFileSetting = new Setting(contentEl)
				.setName('🔑 Key File')
				.setDesc(this.settings.keyFilePath 
					? `Current: ${this.settings.keyFilePath}` 
					: 'Choose key file for additional security');

			// Show key file status indicator
			const keyFileStatus = contentEl.createDiv('key-file-status');
			keyFileStatus.style.cssText = `
				padding: 8px 12px;
				margin-bottom: 10px;
				border-radius: 4px;
				font-size: 0.9em;
				display: inline-block;
			`;

			const updateKeyFileStatus = () => {
				if (this.keyFileContent) {
					keyFileStatus.style.backgroundColor = 'var(--background-modifier-success)';
					keyFileStatus.style.color = 'var(--text-success)';
					keyFileStatus.textContent = '✅ Key file loaded';
				} else if (this.settings.keyFilePath) {
					keyFileStatus.style.backgroundColor = 'var(--background-modifier-warning)';
					keyFileStatus.style.color = 'var(--text-warning)';
					keyFileStatus.textContent = '⚠️ Key file not loaded (will use default if set)';
				} else {
					keyFileStatus.style.backgroundColor = 'var(--background-secondary)';
					keyFileStatus.style.color = 'var(--text-muted)';
					keyFileStatus.textContent = 'ℹ️ No key file selected';
				}
			};
			updateKeyFileStatus();

			keyFileSetting.addButton(btn => btn
				.setButtonText(Platform.isDesktop ? '� Choose (System/Vault)' : '📱 Choose from Vault')
				.onClick(async () => {
					const picker = new FileSystemPicker(this.app);
					const result = await picker.pickKeyFile();
					
					if (result) {
						if (validateKeyFile(result.content)) {
							this.keyFileContent = result.content;
							new Notice(`✅ Key file loaded: ${result.name}`);
							updateKeyFileStatus();
						} else {
							new Notice('❌ Invalid key file format! Must be 64 hex characters.');
						}
					}
				}));

			// Add option to use saved key file
			if (this.settings.keyFilePath && !this.keyFileContent) {
				keyFileSetting.addButton(btn => btn
					.setButtonText('Use Saved Key')
					.onClick(async () => {
						try {
							const file = this.app.vault.getAbstractFileByPath(this.settings.keyFilePath);
							if (file && file instanceof TFile) {
								const content = await this.app.vault.read(file);
								if (validateKeyFile(content)) {
									this.keyFileContent = content.trim();
									new Notice('✅ Loaded saved key file');
									updateKeyFileStatus();
								}
							} else {
								new Notice('❌ Saved key file not found!');
							}
						} catch (error) {
							new Notice(`❌ Failed to load key: ${error.message}`);
						}
					}));
			}
		}

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('🔓 Unlock')
				.setCta()
				.onClick(() => {
					const minLength = this.settings.passwordMinLength || 6;
					if (this.password.length < minLength) {
						new Notice(`❌ Password must be at least ${minLength} characters`);
						return;
					}
					
					// Combine password with key file if provided
					let finalPassword = this.password;
					if (this.settings.enableKeyFile && this.keyFileContent) {
						finalPassword = combinePasswordAndKeyFile(this.password, this.keyFileContent);
					}
					
					this.close();
					this.onSubmit(finalPassword);
				}));
	}

	updateStrengthMeter() {
		if (!this.password) {
			this.strengthMeterEl.empty();
			return;
		}

		const strength = calculatePasswordStrength(this.password);
		this.strengthMeterEl.empty();

		// Strength bar container
		const barContainer = this.strengthMeterEl.createDiv('strength-bar-container');
		barContainer.style.cssText = `
			width: 100%;
			height: 8px;
			background: #e0e0e0;
			border-radius: 4px;
			overflow: hidden;
			margin-bottom: 8px;
		`;

		// Strength bar
		const bar = barContainer.createDiv('strength-bar');
		const percentage = (strength.score / 4) * 100;
		bar.style.cssText = `
			width: ${percentage}%;
			height: 100%;
			background: ${strength.color};
			transition: all 0.3s ease;
		`;

		// Label
		const label = this.strengthMeterEl.createDiv('strength-label');
		label.style.cssText = `
			display: flex;
			justify-content: space-between;
			font-size: 0.9em;
		`;
		label.createSpan({ text: `Strength: ${strength.label}` });
		label.createSpan({ text: `${strength.score}/4`, cls: 'strength-score' });

		// Suggestions
		if (strength.suggestions.length > 0 && strength.score < 3) {
			const suggestionsEl = this.strengthMeterEl.createDiv('strength-suggestions');
			suggestionsEl.style.cssText = `
				margin-top: 8px;
				padding: 8px;
				background: var(--background-secondary);
				border-radius: 4px;
				font-size: 0.85em;
			`;
			suggestionsEl.createEl('strong', { text: '💡 Tips:' });
			const list = suggestionsEl.createEl('ul');
			list.style.margin = '4px 0 0 0';
			strength.suggestions.forEach(tip => {
				list.createEl('li', { text: tip });
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class CreateFolderModal extends Modal {
	private folderPath: string = '';
	private password: string = '';
	private confirmPassword: string = '';
	private keyFileContent: string = '';
	private onSubmit: (folderPath: string, password: string) => void;
	private settings: SecureVaultSettings;
	private strengthMeterEl: HTMLElement;

	constructor(app: App, settings: SecureVaultSettings, onSubmit: (folderPath: string, password: string) => void) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '🔒 Create Encrypted Folder' });

		new Setting(contentEl)
			.setName('Folder Path')
			.setDesc('e.g., SecureVault/Private/Secrets')
			.addText(text => text
				.setPlaceholder('Folder path')
				.onChange(value => this.folderPath = value));

		// Password with generator
		new Setting(contentEl)
			.setName('Password')
			.addText(text => {
				text.setPlaceholder('Enter password')
					.onChange(value => {
						this.password = value;
						this.updateStrengthMeter();
					});
				text.inputEl.type = 'password';
				text.inputEl.id = 'password-input';
			})
			.addButton(btn => btn
				.setIcon('dice')
				.setTooltip('Generate secure password')
				.onClick(() => {
					const generated = generateSecurePassword(16);
					this.password = generated;
					const input = document.getElementById('password-input') as HTMLInputElement;
					if (input) {
						input.value = generated;
						input.type = 'text'; // Show generated password
						this.updateStrengthMeter();
						new Notice('✅ Secure password generated! Copy it now!', 8000);
					}
				}));

		// Strength meter
		this.strengthMeterEl = contentEl.createDiv('password-strength-meter');
		this.strengthMeterEl.style.marginBottom = '15px';

		new Setting(contentEl)
			.setName('Confirm Password')
			.addText(text => {
				text.setPlaceholder('Confirm password')
					.onChange(value => this.confirmPassword = value);
				text.inputEl.type = 'password';
			});

		// Key file options (if enabled)
		if (this.settings.enableKeyFile) {
			const keyFileSetting = new Setting(contentEl)
				.setName('🔑 Key File (Optional)')
				.setDesc('Generate new or choose existing key file');

			// Key file status indicator
			const keyFileStatus = contentEl.createDiv('key-file-status');
			keyFileStatus.style.cssText = `
				padding: 8px 12px;
				margin-bottom: 10px;
				border-radius: 4px;
				font-size: 0.9em;
			`;

			const updateKeyFileStatus = () => {
				if (this.keyFileContent) {
					keyFileStatus.style.backgroundColor = 'var(--background-modifier-success)';
					keyFileStatus.style.color = 'var(--text-success)';
					keyFileStatus.textContent = '✅ Key file loaded';
				} else {
					keyFileStatus.style.backgroundColor = 'var(--background-secondary)';
					keyFileStatus.style.color = 'var(--text-muted)';
					keyFileStatus.textContent = 'ℹ️ No key file selected';
				}
			};
			updateKeyFileStatus();

			keyFileSetting.addButton(btn => btn
				.setButtonText('🎲 Generate & Save')
				.setCta()
				.onClick(async () => {
					const keyContent = generateKeyFile();
					const defaultName = `securevault-key-${Date.now()}`;
					
					const picker = new FileSystemPicker(this.app);
					const savedPath = await picker.saveKeyFile(keyContent, defaultName);
					
					if (savedPath && savedPath !== 'system-export') {
						this.keyFileContent = keyContent;
						new Notice(`✅ Key file saved!\n⚠️ BACKUP THIS FILE!`, 10000);
						updateKeyFileStatus();
					} else if (savedPath === 'system-export') {
						this.keyFileContent = keyContent;
						new Notice(`✅ Key file exported to Downloads!\n💡 Key loaded for this session.`, 8000);
						updateKeyFileStatus();
					}
				}));

			keyFileSetting.addButton(btn => btn
				.setButtonText(Platform.isDesktop ? '� Choose (System/Vault)' : '📱 Choose from Vault')
				.onClick(async () => {
					const picker = new FileSystemPicker(this.app);
					const result = await picker.pickKeyFile();
					
					if (result) {
						if (validateKeyFile(result.content)) {
							this.keyFileContent = result.content;
							new Notice(`✅ Key file loaded: ${result.name}`);
							updateKeyFileStatus();
						} else {
							new Notice('❌ Invalid key file format! Must be 64 hex characters.');
						}
					}
				}));
		}

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Create & Encrypt')
				.setCta()
				.onClick(() => {
					if (!this.folderPath) {
						new Notice('❌ Folder path is required');
						return;
					}
					
					const minLength = this.settings.passwordMinLength || 6;
					if (this.password.length < minLength) {
						new Notice(`❌ Password must be at least ${minLength} characters`);
						return;
					}
					
					if (this.settings.requireStrongPassword) {
						const strength = calculatePasswordStrength(this.password);
						if (strength.score < 3) {
							new Notice('❌ Password is too weak! Use a stronger password or generate one.');
							return;
						}
					}
					
					if (this.password !== this.confirmPassword) {
						new Notice('❌ Passwords do not match');
						return;
					}
					
					// Combine with key file if provided
					let finalPassword = this.password;
					if (this.settings.enableKeyFile && this.keyFileContent) {
						finalPassword = combinePasswordAndKeyFile(this.password, this.keyFileContent);
					}
					
					this.close();
					this.onSubmit(this.folderPath, finalPassword);
				}));
	}

	updateStrengthMeter() {
		if (!this.password) {
			this.strengthMeterEl.empty();
			return;
		}

		const strength = calculatePasswordStrength(this.password);
		this.strengthMeterEl.empty();

		const barContainer = this.strengthMeterEl.createDiv('strength-bar-container');
		barContainer.style.cssText = `
			width: 100%;
			height: 8px;
			background: #e0e0e0;
			border-radius: 4px;
			overflow: hidden;
			margin-bottom: 8px;
		`;

		const bar = barContainer.createDiv('strength-bar');
		const percentage = (strength.score / 4) * 100;
		bar.style.cssText = `
			width: ${percentage}%;
			height: 100%;
			background: ${strength.color};
			transition: all 0.3s ease;
		`;

		const label = this.strengthMeterEl.createDiv('strength-label');
		label.style.cssText = `
			display: flex;
			justify-content: space-between;
			font-size: 0.9em;
			margin-bottom: 8px;
		`;
		label.createSpan({ text: `Strength: ${strength.label}` });
		label.createSpan({ text: `${strength.score}/4` });

		if (strength.suggestions.length > 0 && strength.score < 3) {
			const suggestionsEl = this.strengthMeterEl.createDiv('strength-suggestions');
			suggestionsEl.style.cssText = `
				padding: 8px;
				background: var(--background-secondary);
				border-radius: 4px;
				font-size: 0.85em;
			`;
			suggestionsEl.createEl('strong', { text: '💡 Tips:' });
			const list = suggestionsEl.createEl('ul');
			list.style.margin = '4px 0 0 0';
			strength.suggestions.forEach(tip => {
				list.createEl('li', { text: tip });
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class QuickUnlockPanel {
	private containerEl: HTMLElement;
	private isLocked: boolean = true;

	constructor(private parentEl: HTMLElement) {
		this.containerEl = parentEl.createDiv('securevault-quick-unlock');
		this.render();
	}

	render() {
		this.containerEl.empty();

		if (this.isLocked) {
			this.containerEl.createEl('div', { 
				text: '🔒 SecureVault locked',
				cls: 'securevault-status-locked'
			});
		} else {
			this.containerEl.createEl('div', { 
				text: '🔓 SecureVault unlocked',
				cls: 'securevault-status-unlocked'
			});
		}
	}

	setLockState(locked: boolean) {
		this.isLocked = locked;
		this.render();
	}

	destroy() {
		this.containerEl.remove();
	}
}

// Access Log Modal
export class AccessLogModal extends Modal {
	private settings: SecureVaultSettings;

	constructor(app: App, settings: SecureVaultSettings) {
		super(app);
		this.settings = settings;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('securevault-access-log-modal');
		
		contentEl.createEl('h2', { text: '📊 Access Log' });

		if (!this.settings.enableAccessLog) {
			contentEl.createDiv({text: 'Access logging is disabled. Enable it in settings.'});
			return;
		}

		const logs = this.settings.accessLogs;
		
		if (logs.length === 0) {
			contentEl.createDiv({ text: 'No access logs yet.' });
			return;
		}

		// Summary
		const summary = contentEl.createDiv('log-summary');
		summary.style.cssText = `
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 10px;
			margin-bottom: 20px;
		`;

		const successCount = logs.filter(l => l.success).length;
		const failCount = logs.length - successCount;
		const unlockCount = logs.filter(l => l.action === 'unlock').length;
		const lockCount = logs.filter(l => l.action === 'lock').length;

		this.createSummaryStat(summary, '✅ Success', successCount.toString(), '#00cc00');
		this.createSummaryStat(summary, '❌ Failed', failCount.toString(), '#ff4444');
		this.createSummaryStat(summary, '🔓 Unlocks', unlockCount.toString(), '#3399ff');
		this.createSummaryStat(summary, '🔒 Locks', lockCount.toString(), '#ff9900');

		// Log entries
		const logContainer = contentEl.createDiv('log-entries');
		logContainer.style.cssText = `
			max-height: 400px;
			overflow-y: auto;
			border: 1px solid var(--background-modifier-border);
			border-radius: 4px;
			padding: 10px;
		`;

		// Show recent logs (last 50)
		const recentLogs = logs.slice(-50).reverse();
		
		recentLogs.forEach(log => {
			const entry = logContainer.createDiv('log-entry');
			entry.style.cssText = `
				padding: 10px;
				margin-bottom: 8px;
				background: var(--background-secondary);
				border-radius: 4px;
				border-left: 3px solid ${log.success ? '#00cc00' : '#ff4444'};
			`;

			const header = entry.createDiv('log-header');
			header.style.cssText = `
				display: flex;
				justify-content: space-between;
				margin-bottom: 4px;
				font-weight: bold;
			`;

			const actionIcon = this.getActionIcon(log.action);
			const successIcon = log.success ? '✅' : '❌';
			
			header.createSpan({ text: `${actionIcon} ${log.action.toUpperCase()} ${successIcon}` });
			header.createSpan({ 
				text: new Date(log.timestamp).toLocaleString(),
				cls: 'log-timestamp'
			});

			entry.createDiv({ text: `📁 ${log.folderPath}` });
			
			if (log.details) {
				const details = entry.createDiv('log-details');
				details.style.cssText = `
					margin-top: 4px;
					font-size: 0.9em;
					color: var(--text-muted);
				`;
				details.textContent = log.details;
			}
		});

		// Clear logs button
		new Setting(contentEl)
			.setName('Clear All Logs')
			.setDesc(`Total: ${logs.length} entries`)
			.addButton(btn => btn
				.setButtonText('Clear')
				.setWarning()
				.onClick(() => {
					this.settings.accessLogs = [];
					new Notice('✅ Access logs cleared');
					this.close();
				}));
	}

	createSummaryStat(container: HTMLElement, label: string, value: string, color: string) {
		const stat = container.createDiv('summary-stat');
		stat.style.cssText = `
			padding: 15px;
			background: var(--background-secondary);
			border-radius: 4px;
			text-align: center;
			border-top: 3px solid ${color};
		`;
		stat.createDiv({ text: label, cls: 'stat-label' });
		const valueEl = stat.createDiv({ text: value, cls: 'stat-value' });
		valueEl.style.cssText = `
			font-size: 24px;
			font-weight: bold;
			color: ${color};
			margin-top: 5px;
		`;
	}

	getActionIcon(action: string): string {
		switch (action) {
			case 'unlock': return '🔓';
			case 'lock': return '🔒';
			case 'create': return '➕';
			case 'access': return '👁️';
			default: return '📝';
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class SecurityAuditModal extends Modal {
	private report: AuditReport;

	constructor(app: App, report: AuditReport) {
		super(app);
		this.report = report;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('securevault-quick-menu');

		contentEl.createEl('h2', { text: '🔍 SecureVault Audit Report' });
		contentEl.createEl('p', { text: new Date(this.report.timestamp).toLocaleString(), cls: 'audit-timestamp' });

		const summaryGrid = contentEl.createDiv('audit-summary-grid');
		summaryGrid.style.cssText = `
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
			gap: 12px;
			margin-bottom: 20px;
		`;

		this.addSummaryCard(summaryGrid, '📁 Folders', this.report.scannedFolders.toString());
		this.addSummaryCard(summaryGrid, '📄 Files Checked', this.report.scannedFiles.toString());
		this.addSummaryCard(summaryGrid, '⚠️ Issues', this.report.issues.length.toString(), this.report.issues.length > 0 ? 'var(--text-warning)' : 'var(--text-success)');

		const issuesContainer = contentEl.createDiv('audit-issues');
		issuesContainer.style.cssText = `
			border: 1px solid var(--background-modifier-border);
			border-radius: 6px;
			max-height: 320px;
			overflow-y: auto;
			padding: 12px;
		`;

		if (this.report.issues.length === 0) {
			issuesContainer.createEl('p', {
				text: '✅ No issues detected. SecureVault looks great!'
			});
		} else {
			for (const issue of this.report.issues) {
				const item = issuesContainer.createDiv('audit-issue');
				item.style.cssText = `
					padding: 10px;
					margin-bottom: 8px;
					border-radius: 4px;
					background: var(--background-secondary);
					border-left: 3px solid ${this.getSeverityColor(issue.severity)};
				`;

				item.createEl('h4', { text: this.getSeverityLabel(issue.severity) });
				item.createEl('p', { text: issue.message });
				if (issue.path) {
					item.createEl('code', { text: issue.path });
				}
			}
		}

		const footer = contentEl.createDiv('audit-footer');
		footer.style.cssText = `
			display: flex;
			justify-content: space-between;
			margin-top: 20px;
		`; 

		footer.createEl('span', { text: 'Tip: Jalankan audit secara berkala setelah melakukan operasi massal.' });

		const closeBtn = footer.createEl('button', { text: 'Close', cls: 'mod-cta' });
		closeBtn.addEventListener('click', () => this.close());
	}

	private addSummaryCard(container: HTMLElement, label: string, value: string, color?: string) {
		const card = container.createDiv('audit-summary-card');
		card.style.cssText = `
			padding: 12px;
			border-radius: 6px;
			background: var(--background-secondary);
			border: 1px solid var(--background-modifier-border);
		`;

		card.createEl('span', { text: label, cls: 'summary-label' });
		const valueEl = card.createEl('strong', { text: value, cls: 'summary-value' });
		if (color) valueEl.style.color = color;
	}

	private getSeverityColor(severity: AuditSeverity): string {
		switch (severity) {
			case 'error':
				return 'var(--text-error)';
			case 'warning':
				return 'var(--text-warning)';
			default:
				return 'var(--text-muted)';
		}
	}

	private getSeverityLabel(severity: AuditSeverity): string {
		switch (severity) {
			case 'error':
				return '❌ Critical';
			case 'warning':
				return '⚠️ Warning';
			default:
				return 'ℹ️ Info';
		}
	}
}
