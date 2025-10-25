import { App, Modal, Notice, Setting } from 'obsidian';
import type SecureVaultPlugin from '../main';
import { validatePasswordStrength } from './utils';

export class SetupMasterPasswordModal extends Modal {
	plugin: SecureVaultPlugin;
	password: string = '';
	confirmPassword: string = '';
	strengthLevel: 'weak' | 'medium' | 'strong' = 'weak';
	strengthFeedback: string[] = [];
	onSuccess?: () => void;

	constructor(app: App, plugin: SecureVaultPlugin, onSuccess?: () => void) {
		super(app);
		this.plugin = plugin;
		this.onSuccess = onSuccess;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '🔐 Setup Master Password' });
		
		const description = contentEl.createDiv('setup-description');
		description.style.cssText = `
			padding: 12px;
			margin-bottom: 20px;
			background-color: var(--background-secondary);
			border-radius: 6px;
			border-left: 4px solid var(--interactive-accent);
		`;
		description.createEl('p', { text: 'Set up your master password to enable encryption features. This password will be used to encrypt and decrypt your sensitive files.' });
		description.createEl('p', { 
			text: '⚠️ Important: Remember this password! Lost passwords cannot be recovered.',
			cls: 'mod-warning'
		}).style.cssText = 'color: var(--text-error); font-weight: 600; margin-top: 8px;';

		// Password strength requirements
		const requirements = contentEl.createDiv('password-requirements');
		requirements.style.cssText = `
			padding: 10px;
			margin-bottom: 15px;
			background-color: var(--background-modifier-border);
			border-radius: 4px;
			font-size: 0.9em;
		`;
		requirements.createEl('div', { text: '✓ Password Requirements:', cls: 'setting-item-heading' });
		const reqList = requirements.createEl('ul');
		reqList.style.cssText = 'margin: 8px 0 0 20px; padding: 0;';
		reqList.createEl('li', { text: `At least ${this.plugin.settings.passwordMinLength} characters` });
		if (this.plugin.settings.requireStrongPassword) {
			reqList.createEl('li', { text: 'At least one uppercase letter' });
			reqList.createEl('li', { text: 'At least one lowercase letter' });
			reqList.createEl('li', { text: 'At least one number' });
			reqList.createEl('li', { text: 'At least one special character' });
		}

		// Password input
		new Setting(contentEl)
			.setName('Master Password')
			.setDesc('Enter your master password')
			.addText(text => {
				text
					.setPlaceholder('Enter password')
					.onChange(async (value) => {
						this.password = value;
						this.updatePasswordStrength();
					});
				text.inputEl.type = 'password';
				text.inputEl.style.width = '100%';
			});

		// Confirm password input
		new Setting(contentEl)
			.setName('Confirm Password')
			.setDesc('Re-enter your master password')
			.addText(text => {
				text
					.setPlaceholder('Confirm password')
					.onChange(async (value) => {
						this.confirmPassword = value;
					});
				text.inputEl.type = 'password';
				text.inputEl.style.width = '100%';
			});

		// Password strength indicator (hidden initially)
		const strengthContainer = contentEl.createDiv('password-strength-container');
		strengthContainer.style.cssText = 'margin: 15px 0; display: none;';
		
		const strengthLabel = strengthContainer.createEl('div', { text: 'Password Strength:' });
		strengthLabel.style.cssText = 'font-weight: 600; margin-bottom: 8px;';
		
		const strengthBar = strengthContainer.createEl('div');
		strengthBar.addClass('password-strength-bar');
		strengthBar.style.cssText = `
			height: 8px;
			background-color: var(--background-modifier-border);
			border-radius: 4px;
			overflow: hidden;
			margin-bottom: 8px;
		`;
		
		const strengthFill = strengthBar.createEl('div');
		strengthFill.addClass('password-strength-fill');
		strengthFill.style.cssText = `
			height: 100%;
			width: 0%;
			background-color: var(--text-error);
			transition: width 0.3s ease, background-color 0.3s ease;
		`;
		
		const strengthText = strengthContainer.createEl('div');
		strengthText.addClass('password-strength-text');
		strengthText.style.cssText = 'font-size: 0.9em; color: var(--text-muted);';

		// Store references for updates
		this.modalEl.dataset.strengthContainer = 'true';
		(this.modalEl as any).strengthContainer = strengthContainer;
		(this.modalEl as any).strengthFill = strengthFill;
		(this.modalEl as any).strengthText = strengthText;

		// Buttons
		const buttonContainer = contentEl.createDiv('button-container');
		buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;';

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());

		const setupButton = buttonContainer.createEl('button', { text: 'Setup Password', cls: 'mod-cta' });
		setupButton.addEventListener('click', () => this.handleSetup());
	}

	updatePasswordStrength() {
		if (!this.password) {
			// Hide strength indicator if no password
			const container = (this.modalEl as any).strengthContainer;
			if (container) container.style.display = 'none';
			return;
		}

		const validation = validatePasswordStrength(this.password);
		this.strengthLevel = validation.level;
		this.strengthFeedback = validation.feedback;

		// Show and update strength indicator
		const container = (this.modalEl as any).strengthContainer;
		const fill = (this.modalEl as any).strengthFill;
		const text = (this.modalEl as any).strengthText;

		if (container && fill && text) {
			container.style.display = 'block';

			// Update fill width and color
			let width = '0%';
			let color = 'var(--text-error)';
			
			if (this.strengthLevel === 'weak') {
				width = '33%';
				color = '#e74c3c';
			} else if (this.strengthLevel === 'medium') {
				width = '66%';
				color = '#f39c12';
			} else if (this.strengthLevel === 'strong') {
				width = '100%';
				color = '#27ae60';
			}

			fill.style.width = width;
			fill.style.backgroundColor = color;

			// Update text
			const levelText = this.strengthLevel.charAt(0).toUpperCase() + this.strengthLevel.slice(1);
			text.setText(`${levelText}${this.strengthFeedback.length > 0 ? ' - ' + this.strengthFeedback.join(', ') : ''}`);
			text.style.color = color;
		}
	}

	async handleSetup() {
		// Validation
		if (!this.password) {
			new Notice('❌ Please enter a password');
			return;
		}

		if (this.password !== this.confirmPassword) {
			new Notice('❌ Passwords do not match');
			return;
		}

		// Check password requirements
		if (this.password.length < this.plugin.settings.passwordMinLength) {
			new Notice(`❌ Password must be at least ${this.plugin.settings.passwordMinLength} characters`);
			return;
		}

		if (this.plugin.settings.requireStrongPassword) {
			const validation = validatePasswordStrength(this.password);
			if (validation.level === 'weak') {
				new Notice('❌ Password does not meet strength requirements: ' + validation.feedback.join(', '));
				return;
			}
		}

		// Check if key file is required
		if (this.plugin.settings.enableKeyFile && !this.plugin.settings.keyFilePath) {
			new Notice('❌ Key file is required but not configured. Please set up key file in settings first.');
			return;
		}

		try {
			// Set master password using MasterPasswordManager
			const success = await this.plugin.passwordManager.setMasterPassword(this.password);
			
			if (success) {
				new Notice('✅ Master password set successfully!');
				
				// Call success callback if provided
				if (this.onSuccess) {
					this.onSuccess();
				}
				
				this.close();
			} else {
				new Notice('❌ Failed to set master password');
			}
		} catch (error) {
			console.error('Error setting master password:', error);
			new Notice('❌ Error setting master password: ' + error.message);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
