import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import SecureVaultPlugin from '../main';

export const VIEW_TYPE_SECUREVAULT = 'securevault-sidebar';

export class SecureVaultView extends ItemView {
	plugin: SecureVaultPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: SecureVaultPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_SECUREVAULT;
	}

	getDisplayText(): string {
		return 'SecureVault-Hades';
	}

	getIcon(): string {
		return 'shield';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('securevault-sidebar');

		this.renderView(container);
	}

	renderView(container: Element) {
		container.empty();

		// Header
		const header = container.createDiv('securevault-header');
		header.createEl('h2', { text: '🔐 SecureVault-Hades' });

		// Status Summary
		const summary = container.createDiv('securevault-summary');
		const totalFolders = this.plugin.settings.encryptedFolders.length;
		const lockedCount = this.plugin.settings.encryptedFolders.filter(f => f.isLocked).length;
		const unlockedCount = totalFolders - lockedCount;

		summary.createEl('div', { 
			text: `Total: ${totalFolders} folders`,
			cls: 'summary-total'
		});
		summary.createEl('div', { 
			text: `🔒 Locked: ${lockedCount}`,
			cls: 'summary-locked'
		});
		summary.createEl('div', { 
			text: `🔓 Unlocked: ${unlockedCount}`,
			cls: 'summary-unlocked'
		});

		// Quick Actions
		const actions = container.createDiv('securevault-actions');
		actions.createEl('h3', { text: '⚡ Quick Actions' });

		// Button: Create Folder
		const btnCreate = actions.createEl('button', {
			text: '➕ Create Encrypted Folder',
			cls: 'securevault-btn securevault-btn-primary'
		});
		btnCreate.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Create button clicked');
			try {
				this.plugin.createEncryptedFolderCommand();
			} catch (error) {
				console.error('Error creating folder:', error);
				new Notice('❌ Error: ' + error.message);
			}
		});

		// Button: Unlock All
		const btnUnlock = actions.createEl('button', {
			text: '🔓 Unlock All Folders',
			cls: 'securevault-btn securevault-btn-success'
		});
		btnUnlock.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Unlock All button clicked');
			try {
				this.plugin.unlockAllCommand();
			} catch (error) {
				console.error('Error unlocking:', error);
				new Notice('❌ Error: ' + error.message);
			}
		});

		// Button: Lock All
		const btnLock = actions.createEl('button', {
			text: '🔒 Lock All Folders',
			cls: 'securevault-btn securevault-btn-warning'
		});
		btnLock.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Lock All button clicked');
			try {
				this.plugin.lockAllCommand();
			} catch (error) {
				console.error('Error locking:', error);
				new Notice('❌ Error: ' + error.message);
			}
		});

		// Button: Encrypt Current
		const btnEncryptCurrent = actions.createEl('button', {
			text: '🛡️ Encrypt Current Folder',
			cls: 'securevault-btn securevault-btn-secondary'
		});
		btnEncryptCurrent.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Encrypt Current button clicked');
			try {
				this.plugin.encryptCurrentFolderCommand();
			} catch (error) {
				console.error('Error encrypting:', error);
				new Notice('❌ Error: ' + error.message);
			}
		});

		// Folder List
		const folderSection = container.createDiv('securevault-folders');
		folderSection.createEl('h3', { text: '📁 Encrypted Folders' });

		if (totalFolders === 0) {
			folderSection.createEl('p', {
				text: 'Belum ada folder terenkripsi.',
				cls: 'empty-state'
			});
		} else {
			const folderList = folderSection.createDiv('folder-list');

			this.plugin.settings.encryptedFolders.forEach(folder => {
				const folderItem = folderList.createDiv('folder-item');
				
				const folderInfo = folderItem.createDiv('folder-info');
				const icon = folder.isLocked ? '🔒' : '🔓';
				folderInfo.createEl('div', {
					text: `${icon} ${folder.path}`,
					cls: 'folder-name'
				});
				folderInfo.createEl('div', {
					text: `${folder.encryptedFiles.length} files`,
					cls: 'folder-files'
				});

				const folderActions = folderItem.createDiv('folder-actions');
				
				if (folder.isLocked) {
					const btnUnlockOne = folderActions.createEl('button', {
						text: 'Unlock',
						cls: 'folder-btn'
					});
					btnUnlockOne.addEventListener('click', async (e) => {
						e.preventDefault();
						e.stopPropagation();
						console.log('Unlock folder clicked:', folder.path);
						try {
							await this.plugin.unlockSpecificFolder(folder);
							this.renderView(container);
						} catch (error) {
							console.error('Error unlocking folder:', error);
							new Notice('❌ Error: ' + error.message);
						}
					});
				} else {
					const btnLockOne = folderActions.createEl('button', {
						text: 'Lock',
						cls: 'folder-btn'
					});
					btnLockOne.addEventListener('click', async (e) => {
						e.preventDefault();
						e.stopPropagation();
						console.log('Lock folder clicked:', folder.path);
						try {
							await this.plugin.lockSpecificFolder(folder);
							this.renderView(container);
						} catch (error) {
							console.error('Error locking folder:', error);
							new Notice('❌ Error: ' + error.message);
						}
					});
				}
			});
		}

		// Settings Link
		const footer = container.createDiv('securevault-footer');
		const settingsLink = footer.createEl('a', {
			text: '⚙️ Open Settings',
			cls: 'settings-link'
		});
		settingsLink.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Settings link clicked');
			try {
				// @ts-ignore
				this.app.setting.open();
				// @ts-ignore
				this.app.setting.openTabById('securevault-plus');
			} catch (error) {
				console.error('Error opening settings:', error);
				new Notice('⚙️ Please open Settings manually');
			}
		});
	}

	async onClose() {
		// Cleanup
	}

	refresh() {
		const container = this.containerEl.children[1];
		this.renderView(container);
	}
}
