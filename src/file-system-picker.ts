import { App, Notice, Platform, TFile } from 'obsidian';

/**
 * Cross-platform file picker utility
 * Works on Desktop (Windows/Mac/Linux) and Mobile (iOS/Android)
 */
export class FileSystemPicker {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Pick a file from system (Desktop) or vault (Mobile)
	 * Returns file content as string
	 */
	async pickKeyFile(): Promise<{ content: string; name: string } | null> {
		// Desktop: Use native file picker
		if (Platform.isDesktop) {
			return this.pickFromSystem();
		}
		
		// Mobile: Use vault-only picker (system access limited)
		return this.pickFromVault();
	}

	/**
	 * Save key file to system (Desktop) or vault (Mobile)
	 */
	async saveKeyFile(content: string, suggestedName: string): Promise<string | null> {
		// Desktop: Offer both system export and vault save
		if (Platform.isDesktop) {
			return this.saveToSystemOrVault(content, suggestedName);
		}
		
		// Mobile: Save to vault only
		return this.saveToVault(content, suggestedName);
	}

	/**
	 * Desktop: Native file picker using <input type="file">
	 */
	private async pickFromSystem(): Promise<{ content: string; name: string } | null> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.key,.txt';
			input.style.display = 'none';
			
			input.addEventListener('change', async (e: Event) => {
				const target = e.target as HTMLInputElement;
				const file = target.files?.[0];
				
				if (file) {
					try {
						const content = await file.text();
						resolve({ content: content.trim(), name: file.name });
					} catch (error) {
						new Notice(`❌ Failed to read file: ${error.message}`);
						resolve(null);
					}
				} else {
					resolve(null);
				}
				
				document.body.removeChild(input);
			});
			
			input.addEventListener('cancel', () => {
				document.body.removeChild(input);
				resolve(null);
			});
			
			document.body.appendChild(input);
			input.click();
		});
	}

	/**
	 * Mobile: Pick from vault using built-in file picker modal
	 */
	private async pickFromVault(): Promise<{ content: string; name: string } | null> {
		return new Promise((resolve) => {
			const { FilePickerModal } = require('./file-picker-modal');
			
			new FilePickerModal(this.app, async (file: TFile) => {
				try {
					const content = await this.app.vault.read(file);
					resolve({ content: content.trim(), name: file.name });
				} catch (error) {
					new Notice(`❌ Failed to read file: ${error.message}`);
					resolve(null);
				}
			}, ['.key', '.txt']).open();
		});
	}

	/**
	 * Desktop: Show dialog to choose between system export or vault save
	 */
	private async saveToSystemOrVault(content: string, suggestedName: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new SaveLocationModal(this.app, async (choice: 'system' | 'vault') => {
				if (choice === 'system') {
					// Export to system
					const success = await this.exportToSystem(content, suggestedName);
					resolve(success ? 'system-export' : null);
				} else {
					// Save to vault
					const path = await this.saveToVaultWithPicker(content, suggestedName);
					resolve(path);
				}
			});
			modal.open();
		});
	}

	/**
	 * Desktop: Export file to system using download
	 */
	private async exportToSystem(content: string, suggestedName: string): Promise<boolean> {
		try {
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = suggestedName.endsWith('.key') ? suggestedName : `${suggestedName}.key`;
			a.style.display = 'none';
			
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			new Notice(`✅ Key file exported to Downloads folder!\n📁 File: ${a.download}`, 8000);
			return true;
		} catch (error) {
			new Notice(`❌ Export failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Save to vault with folder picker
	 */
	private async saveToVaultWithPicker(content: string, suggestedName: string): Promise<string | null> {
		return new Promise((resolve) => {
			const { FileSaveModal } = require('./file-picker-modal');
			
			new FileSaveModal(this.app, suggestedName, '.key', async (fullPath: string) => {
				try {
					const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
					if (existingFile) {
						new Notice('❌ File already exists! Choose different name.');
						resolve(null);
						return;
					}
					
					await this.app.vault.create(fullPath, content);
					new Notice(`✅ Key file saved to vault: ${fullPath}`, 5000);
					resolve(fullPath);
				} catch (error) {
					new Notice(`❌ Failed to save: ${error.message}`);
					resolve(null);
				}
			}).open();
		});
	}

	/**
	 * Mobile: Save directly to vault with picker
	 */
	private async saveToVault(content: string, suggestedName: string): Promise<string | null> {
		return this.saveToVaultWithPicker(content, suggestedName);
	}

	/**
	 * Load key file from saved path (works on both desktop and mobile)
	 */
	async loadKeyFileFromPath(path: string): Promise<string | null> {
		try {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!file || !(file instanceof TFile)) {
				return null;
			}
			
			const content = await this.app.vault.read(file);
			return content.trim();
		} catch (error) {
			return null;
		}
	}
}

/**
 * Modal to choose save location (Desktop only)
 */
import { Modal, Setting } from 'obsidian';

class SaveLocationModal extends Modal {
	private onChoose: (choice: 'system' | 'vault') => void;

	constructor(app: App, onChoose: (choice: 'system' | 'vault') => void) {
		super(app);
		this.onChoose = onChoose;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '💾 Choose Save Location' });

		const description = contentEl.createDiv();
		description.style.marginBottom = '20px';
		description.style.color = 'var(--text-muted)';
		description.innerHTML = `
			<p>Where do you want to save the key file?</p>
		`;

		// Option 1: Export to System
		const systemOption = contentEl.createDiv('save-option');
		systemOption.style.cssText = `
			padding: 15px;
			margin-bottom: 10px;
			border: 2px solid var(--background-modifier-border);
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.2s;
		`;

		systemOption.innerHTML = `
			<div style="display: flex; align-items: center; margin-bottom: 8px;">
				<span style="font-size: 24px; margin-right: 12px;">💻</span>
				<strong style="font-size: 16px;">Export to System</strong>
			</div>
			<div style="font-size: 0.9em; color: var(--text-muted); margin-left: 36px;">
				Save outside Obsidian vault (e.g., Documents, USB drive)<br>
				✅ Better security (not in vault)<br>
				✅ Easy to backup separately<br>
				⚠️ Must remember location
			</div>
		`;

		systemOption.addEventListener('mouseenter', () => {
			systemOption.style.borderColor = 'var(--interactive-accent)';
			systemOption.style.backgroundColor = 'var(--background-modifier-hover)';
		});

		systemOption.addEventListener('mouseleave', () => {
			systemOption.style.borderColor = 'var(--background-modifier-border)';
			systemOption.style.backgroundColor = 'transparent';
		});

		systemOption.addEventListener('click', () => {
			this.close();
			this.onChoose('system');
		});

		// Option 2: Save to Vault
		const vaultOption = contentEl.createDiv('save-option');
		vaultOption.style.cssText = `
			padding: 15px;
			margin-bottom: 10px;
			border: 2px solid var(--background-modifier-border);
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.2s;
		`;

		vaultOption.innerHTML = `
			<div style="display: flex; align-items: center; margin-bottom: 8px;">
				<span style="font-size: 24px; margin-right: 12px;">📂</span>
				<strong style="font-size: 16px;">Save to Vault</strong>
			</div>
			<div style="font-size: 0.9em; color: var(--text-muted); margin-left: 36px;">
				Store inside Obsidian vault<br>
				✅ Always accessible in Obsidian<br>
				✅ Syncs with vault (if enabled)<br>
				⚠️ Less secure (same location as data)
			</div>
		`;

		vaultOption.addEventListener('mouseenter', () => {
			vaultOption.style.borderColor = 'var(--interactive-accent)';
			vaultOption.style.backgroundColor = 'var(--background-modifier-hover)';
		});

		vaultOption.addEventListener('mouseleave', () => {
			vaultOption.style.borderColor = 'var(--background-modifier-border)';
			vaultOption.style.backgroundColor = 'transparent';
		});

		vaultOption.addEventListener('click', () => {
			this.close();
			this.onChoose('vault');
		});

		contentEl.appendChild(systemOption);
		contentEl.appendChild(vaultOption);

		// Add recommendation
		const recommendation = contentEl.createDiv();
		recommendation.style.cssText = `
			margin-top: 15px;
			padding: 12px;
			background-color: var(--background-secondary);
			border-left: 3px solid var(--text-accent);
			border-radius: 4px;
			font-size: 0.9em;
		`;
		recommendation.innerHTML = `
			<strong>💡 Recommendation:</strong><br>
			Export to system for maximum security, then backup to cloud storage or USB drive.
		`;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
