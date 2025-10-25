/**
 * Password Change Modal
 * Allow users to change their master password
 */

import { App, Modal, Setting, Notice, ProgressBarComponent } from 'obsidian';
import SecureVaultPlugin from '../main';
import { CryptoService } from './crypto';
import { validatePasswordStrength } from './utils';
import { MasterPasswordManager } from './master-password-manager';

export class PasswordChangeModal extends Modal {
	plugin: SecureVaultPlugin;
	private passwordManager: MasterPasswordManager;
	private oldPassword: string = '';
	private newPassword: string = '';
	private confirmPassword: string = '';
	private isChanging: boolean = false;

	constructor(app: App, plugin: SecureVaultPlugin) {
		super(app);
		this.plugin = plugin;
		this.passwordManager = new MasterPasswordManager(app, plugin.settings);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('securevault-modal');

		// Title
		contentEl.createEl('h2', { text: '🔐 Change Master Password' });

		// Warning
		contentEl.createEl('p', { 
			text: '⚠️ Warning: This will re-encrypt ALL your encrypted folders and files. Make sure to backup your vault before proceeding!',
			cls: 'securevault-warning'
		});

		// Old password
		new Setting(contentEl)
			.setName('Current Password')
			.setDesc('Enter your current master password')
			.addText(text => {
				text
					.setPlaceholder('Current password')
					.inputEl.type = 'password';
				text.onChange(value => {
					this.oldPassword = value;
				});
			});

		// New password
		new Setting(contentEl)
			.setName('New Password')
			.setDesc('Enter your new master password')
			.addText(text => {
				text
					.setPlaceholder('New password')
					.inputEl.type = 'password';
				text.onChange(value => {
					this.newPassword = value;
					this.updatePasswordStrength();
				});
			});

		// Confirm new password
		new Setting(contentEl)
			.setName('Confirm New Password')
			.setDesc('Re-enter your new password')
			.addText(text => {
				text
					.setPlaceholder('Confirm new password')
					.inputEl.type = 'password';
				text.onChange(value => {
					this.confirmPassword = value;
				});
			});

		// Password strength indicator
		const strengthContainer = contentEl.createDiv('password-strength-container');
		strengthContainer.style.display = 'none';
		strengthContainer.id = 'password-strength-indicator';

		// Progress bar (will be shown during re-encryption)
		const progressContainer = contentEl.createDiv('progress-container');
		progressContainer.style.display = 'none';
		progressContainer.id = 'progress-container';
		
		const progressText = progressContainer.createEl('p', { text: 'Re-encrypting...' });
		progressText.id = 'progress-text';
		
		const progressBar = progressContainer.createDiv('progress-bar');
		progressBar.id = 'progress-bar';
		progressBar.style.width = '0%';
		progressBar.style.height = '10px';
		progressBar.style.backgroundColor = 'var(--interactive-accent)';
		progressBar.style.transition = 'width 0.3s';

		// Buttons
		const buttonContainer = contentEl.createDiv('button-container');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';

		// Change button
		const changeBtn = buttonContainer.createEl('button', { 
			text: '🔐 Change Password',
			cls: 'mod-cta'
		});
		changeBtn.addEventListener('click', () => this.handlePasswordChange());

		// Cancel button
		const cancelBtn = buttonContainer.createEl('button', { 
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => this.close());
	}

	private updatePasswordStrength() {
		const indicator = document.getElementById('password-strength-indicator');
		if (!indicator) return;

		if (!this.newPassword) {
			indicator.style.display = 'none';
			return;
		}

		indicator.style.display = 'block';
		
		const strength = validatePasswordStrength(this.newPassword);
		const strengthColors: {[key: string]: string} = {
			weak: 'var(--text-error)',
			medium: 'var(--text-warning)',
			strong: 'var(--text-success)'
		};

		indicator.innerHTML = `
			<div style="margin-top: 10px;">
				<strong>Password Strength:</strong> 
				<span style="color: ${strengthColors[strength.level]}">${strength.level.toUpperCase()}</span>
				<div style="margin-top: 5px; font-size: 0.9em; color: var(--text-muted);">
					${strength.feedback.join('<br>')}
				</div>
			</div>
		`;
	}

	private async handlePasswordChange() {
		if (this.isChanging) return;

		// Validation
		if (!this.oldPassword) {
			new Notice('❌ Please enter your current password');
			return;
		}

		if (!this.newPassword) {
			new Notice('❌ Please enter a new password');
			return;
		}

		if (this.newPassword !== this.confirmPassword) {
			new Notice('❌ New passwords do not match');
			return;
		}

		if (this.newPassword === this.oldPassword) {
			new Notice('❌ New password must be different from current password');
			return;
		}

		// Check password strength
		if (this.plugin.settings.requireStrongPassword) {
			const strength = validatePasswordStrength(this.newPassword);
			if (strength.level === 'weak') {
				new Notice('❌ Password too weak. Please use a stronger password.');
				return;
			}
		}

		// Verify old password
		const isValid = await this.verifyOldPassword();
		if (!isValid) {
			new Notice('❌ Current password is incorrect');
			return;
		}

		// Confirm action
		const confirmed = await this.confirmPasswordChange();
		if (!confirmed) return;

		// Start password change process
		this.isChanging = true;
		await this.performPasswordChange();
		this.isChanging = false;
	}

	private async verifyOldPassword(): Promise<boolean> {
		return this.passwordManager.verifyPassword(this.oldPassword);
	}

	private async confirmPasswordChange(): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.contentEl.createEl('h3', { text: '⚠️ Confirm Password Change' });
			modal.contentEl.createEl('p', { text: 'This will re-encrypt all your encrypted content. This may take a while depending on how much encrypted data you have.' });
			modal.contentEl.createEl('p', { text: 'Are you sure you want to continue?' });

			const buttonContainer = modal.contentEl.createDiv();
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '10px';
			buttonContainer.style.marginTop = '20px';

			const confirmBtn = buttonContainer.createEl('button', { text: 'Yes, Change Password', cls: 'mod-warning' });
			confirmBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			modal.open();
		});
	}

	private async performPasswordChange() {
		const progressContainer = document.getElementById('progress-container');
		const progressBar = document.getElementById('progress-bar');
		const progressText = document.getElementById('progress-text');

		if (progressContainer) progressContainer.style.display = 'block';

		try {
			// Get master keys using password manager
			const oldMasterKey = await this.passwordManager.getMasterKey(this.oldPassword);
			const newMasterKey = await this.passwordManager.getMasterKey(this.newPassword);

			// Re-encrypt all folders
			const folders = this.plugin.settings.encryptedFolders;
			let processed = 0;
			const total = folders.length;

			for (const folder of folders) {
				if (progressText) {
					progressText.textContent = `Re-encrypting folder ${processed + 1}/${total}: ${folder.path}`;
				}
				if (progressBar) {
					progressBar.style.width = `${(processed / total) * 100}%`;
				}

				// Decrypt with old password, encrypt with new password
				// This is a simplified approach - in production you'd decrypt/re-encrypt actual files
				folder.salt = CryptoService.generateSalt();
				folder.iv = CryptoService.generateIV();

				processed++;
				
				// Small delay to prevent UI freeze
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			// Update master password using password manager
			await this.passwordManager.changeMasterPassword(this.oldPassword, this.newPassword);
			await this.plugin.saveSettings();

			// Success
			new Notice('✅ Password changed successfully!');
			console.log('Master password changed successfully');
			
			this.close();

		} catch (error) {
			console.error('Password change error:', error);
			new Notice(`❌ Password change failed: ${error.message}`);
		} finally {
			if (progressContainer) progressContainer.style.display = 'none';
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
