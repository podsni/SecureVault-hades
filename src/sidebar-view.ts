import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import SecureVaultPlugin from '../main';
import { EncryptedFolder } from './types';

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

		const root = container as HTMLElement;

		this.renderHeader(root);
		this.renderSummary(root);
		this.renderQuickActions(root);
		this.renderFolderSections(root);
		this.renderFooter(root);
	}

	async onClose() {
		// Cleanup
	}

	refresh() {
		const container = this.containerEl.children[1];
		this.renderView(container);
	}

	private renderHeader(container: HTMLElement) {
		const header = container.createDiv('securevault-header');
		header.createEl('h2', { text: '🔐 SecureVault-Hades' });
		header.createEl('p', {
			text: 'Kelola folder terenkripsi dengan tampilan modular dan ringkas.',
			cls: 'securevault-subtitle'
		});
	}

	private renderSummary(container: HTMLElement) {
		const folders = this.plugin.settings.encryptedFolders;
		const total = folders.length;
		const locked = folders.filter(f => f.isLocked).length;
		const unlocked = total - locked;

		const summary = container.createDiv('securevault-summary-grid');

		this.createSummaryCard(summary, 'Total Folders', total.toString(), 'summary-total');
		this.createSummaryCard(summary, '🔒 Locked', locked.toString(), 'summary-locked');
		this.createSummaryCard(summary, '🔓 Unlocked', unlocked.toString(), 'summary-unlocked');
	}

	private createSummaryCard(parent: HTMLElement, label: string, value: string, cls: string) {
		const card = parent.createDiv({ cls: ['securevault-summary-card', cls] });
		card.createEl('span', { text: label, cls: 'summary-label' });
		card.createEl('strong', { text: value, cls: 'summary-value' });
	}

	private renderQuickActions(container: HTMLElement) {
		const actions = container.createDiv('securevault-actions-grid');
		actions.createEl('h3', { text: '⚡ Quick Actions', cls: 'securevault-section-title' });

		const buttonsWrapper = actions.createDiv('securevault-actions-wrapper');
		this.createActionButton(
			buttonsWrapper,
			'➕ Create Encrypted Folder',
			'securevault-btn-primary',
			() => this.plugin.createEncryptedFolderCommand()
		);
		this.createActionButton(
			buttonsWrapper,
			'🛡️ Encrypt Current Folder',
			'securevault-btn-secondary',
			() => this.plugin.encryptCurrentFolderCommand()
		);
		this.createActionButton(
			buttonsWrapper,
			'🔓 Unlock All Folders',
			'securevault-btn-success',
			() => this.plugin.unlockAllCommand()
		);
		this.createActionButton(
			buttonsWrapper,
			'🔒 Lock All Folders',
			'securevault-btn-warning',
			() => this.plugin.lockAllCommand()
		);
	}

	private createActionButton(parent: HTMLElement, label: string, cls: string, handler: () => void) {
		const button = parent.createEl('button', {
			text: label,
			cls: ['securevault-btn', cls]
		});
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			try {
				handler();
			} catch (error) {
				console.error(`Error executing action "${label}":`, error);
				new Notice(`❌ Error: ${error.message}`);
			}
		});
	}

	private renderFolderSections(container: HTMLElement) {
		const folders = this.plugin.settings.encryptedFolders;
		const locked = folders.filter(f => f.isLocked);
		const unlocked = folders.filter(f => !f.isLocked);

		const sectionWrapper = container.createDiv('securevault-folder-sections');
		this.renderFolderSection(
			sectionWrapper,
			'🔒 Locked folders',
			locked,
			'Belum ada folder yang dikunci.',
			container
		);
		this.renderFolderSection(
			sectionWrapper,
			'🔓 Unlocked folders',
			unlocked,
			'Tidak ada folder yang sedang terbuka.',
			container
		);
	}

	private renderFolderSection(
		parent: HTMLElement,
		title: string,
		folders: EncryptedFolder[],
		emptyMessage: string,
		root: HTMLElement
	) {
		const section = parent.createDiv('securevault-folder-section');
		section.createEl('h3', { text: title, cls: 'securevault-section-title' });

		if (folders.length === 0) {
			section.createEl('p', {
				text: emptyMessage,
				cls: 'securevault-empty'
			});
			return;
		}

		const list = section.createDiv('securevault-folder-list');
		folders.forEach(folder => {
			this.renderFolderCard(list, folder, root);
		});
	}

	private renderFolderCard(list: HTMLElement, folder: EncryptedFolder, root: HTMLElement) {
		const card = list.createDiv({ cls: ['securevault-folder-card', folder.isLocked ? 'is-locked' : 'is-unlocked'] });
		
		const header = card.createDiv('folder-card-header');
		header.createEl('span', {
			text: `${folder.isLocked ? '🔒' : '🔓'} ${folder.path}`,
			cls: 'folder-card-title'
		});
		header.createEl('span', {
			text: `${folder.encryptedFiles.length} files`,
			cls: 'folder-card-files'
		});

		const meta = card.createDiv('folder-card-meta');
		meta.createEl('span', {
			text: folder.isLocked ? 'Status: Locked' : 'Status: Unlocked',
			cls: 'folder-card-status'
		});
		meta.createEl('span', {
			text: `Updated: ${new Date(folder.lastModified || Date.now()).toLocaleString()}`,
			cls: 'folder-card-updated'
		});

		const actions = card.createDiv('folder-card-actions');
		if (folder.isLocked) {
			const unlockBtn = actions.createEl('button', {
				text: 'Unlock',
				cls: ['folder-card-btn', 'unlock']
			});
			unlockBtn.addEventListener('click', async (event) => {
				event.preventDefault();
				event.stopPropagation();
				try {
					await this.plugin.unlockSpecificFolder(folder);
					this.renderView(root);
				} catch (error) {
					console.error('Error unlocking folder:', error);
					new Notice('❌ Error: ' + error.message);
				}
			});
		} else {
			const lockBtn = actions.createEl('button', {
				text: 'Lock',
				cls: ['folder-card-btn', 'lock']
			});
			lockBtn.addEventListener('click', async (event) => {
				event.preventDefault();
				event.stopPropagation();
				try {
					await this.plugin.lockSpecificFolder(folder);
					this.renderView(root);
				} catch (error) {
					console.error('Error locking folder:', error);
					new Notice('❌ Error: ' + error.message);
				}
			});
		}
	}

	private renderFooter(container: HTMLElement) {
		const footer = container.createDiv('securevault-footer');
		const settingsLink = footer.createEl('a', {
			text: '⚙️ Open settings',
			cls: 'settings-link'
		});
		settingsLink.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
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
}
