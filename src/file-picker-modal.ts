import { App, Modal, Notice, TFile, TFolder } from 'obsidian';

/**
 * Modal for selecting a file from the vault
 */
export class FilePickerModal extends Modal {
	private onSelect: (file: TFile) => void;
	private filter: string[];

	constructor(app: App, onSelect: (file: TFile) => void, filter: string[] = []) {
		super(app);
		this.onSelect = onSelect;
		this.filter = filter;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '📁 Select File' });
		
		if (this.filter.length > 0) {
			const filterDesc = contentEl.createDiv('filter-description');
			filterDesc.style.marginBottom = '15px';
			filterDesc.style.fontSize = '0.9em';
			filterDesc.style.color = 'var(--text-muted)';
			filterDesc.textContent = `Showing files with extensions: ${this.filter.join(', ')}`;
		}

		const fileList = contentEl.createDiv('file-list');
		fileList.style.maxHeight = '400px';
		fileList.style.overflowY = 'auto';
		fileList.style.border = '1px solid var(--background-modifier-border)';
		fileList.style.borderRadius = '4px';
		fileList.style.padding = '10px';

		const files = this.app.vault.getFiles();
		const filteredFiles = this.filter.length > 0 
			? files.filter(file => this.filter.some(ext => file.extension === ext.replace('.', '')))
			: files;

		if (filteredFiles.length === 0) {
			fileList.createEl('p', { 
				text: 'No files found matching the filter.',
				cls: 'no-files-message'
			}).style.color = 'var(--text-muted)';
			return;
		}

		filteredFiles.forEach(file => {
			const fileItem = fileList.createDiv('file-item');
			fileItem.style.padding = '8px';
			fileItem.style.cursor = 'pointer';
			fileItem.style.borderRadius = '4px';
			fileItem.style.marginBottom = '4px';
			fileItem.style.transition = 'background-color 0.2s';

			fileItem.addEventListener('mouseenter', () => {
				fileItem.style.backgroundColor = 'var(--background-modifier-hover)';
			});

			fileItem.addEventListener('mouseleave', () => {
				fileItem.style.backgroundColor = 'transparent';
			});

			fileItem.addEventListener('click', () => {
				this.onSelect(file);
				this.close();
			});

			const fileName = fileItem.createEl('div', { text: file.name });
			fileName.style.fontWeight = 'bold';

			const filePath = fileItem.createEl('div', { text: file.path });
			filePath.style.fontSize = '0.85em';
			filePath.style.color = 'var(--text-muted)';
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal for selecting a folder and filename for saving
 */
export class FileSaveModal extends Modal {
	private onSave: (path: string) => void;
	private defaultName: string;
	private extension: string;

	constructor(app: App, defaultName: string, extension: string, onSave: (path: string) => void) {
		super(app);
		this.defaultName = defaultName;
		this.extension = extension;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '💾 Save Key File' });

		let selectedFolder: TFolder | null = null;
		let fileName: string = this.defaultName;

		// Folder selection
		const folderSetting = contentEl.createDiv('folder-selection');
		folderSetting.style.marginBottom = '15px';

		const folderLabel = folderSetting.createEl('label', { text: 'Save Location:' });
		folderLabel.style.display = 'block';
		folderLabel.style.marginBottom = '5px';
		folderLabel.style.fontWeight = 'bold';

		const folderDisplay = folderSetting.createDiv('folder-display');
		folderDisplay.style.padding = '10px';
		folderDisplay.style.border = '1px solid var(--background-modifier-border)';
		folderDisplay.style.borderRadius = '4px';
		folderDisplay.style.marginBottom = '10px';
		folderDisplay.style.backgroundColor = 'var(--background-secondary)';
		folderDisplay.textContent = 'Vault Root (/)';

		const folderBtn = folderSetting.createEl('button', { text: '📁 Choose Folder' });
		folderBtn.style.padding = '6px 12px';
		folderBtn.style.borderRadius = '4px';
		folderBtn.style.cursor = 'pointer';
		folderBtn.addEventListener('click', () => {
			new FolderPickerModal(this.app, (folder) => {
				selectedFolder = folder;
				folderDisplay.textContent = folder ? folder.path : 'Vault Root (/)';
			}).open();
		});

		// Filename input
		const fileNameSetting = contentEl.createDiv('filename-input');
		fileNameSetting.style.marginBottom = '20px';

		const fileNameLabel = fileNameSetting.createEl('label', { text: 'File Name:' });
		fileNameLabel.style.display = 'block';
		fileNameLabel.style.marginBottom = '5px';
		fileNameLabel.style.fontWeight = 'bold';

		const fileNameInput = fileNameSetting.createEl('input', { type: 'text' });
		fileNameInput.style.width = '100%';
		fileNameInput.style.padding = '8px';
		fileNameInput.style.border = '1px solid var(--background-modifier-border)';
		fileNameInput.style.borderRadius = '4px';
		fileNameInput.value = fileName;
		fileNameInput.addEventListener('input', () => {
			fileName = fileNameInput.value;
		});

		const extensionHint = fileNameSetting.createDiv('extension-hint');
		extensionHint.style.fontSize = '0.85em';
		extensionHint.style.color = 'var(--text-muted)';
		extensionHint.style.marginTop = '5px';
		extensionHint.textContent = `Extension: ${this.extension}`;

		// Preview full path
		const previewDiv = contentEl.createDiv('path-preview');
		previewDiv.style.padding = '10px';
		previewDiv.style.backgroundColor = 'var(--background-secondary)';
		previewDiv.style.borderRadius = '4px';
		previewDiv.style.marginBottom = '15px';
		previewDiv.style.fontSize = '0.9em';

		const updatePreview = () => {
			const folder = selectedFolder ? selectedFolder.path : '';
			const fullPath = folder ? `${folder}/${fileName}${this.extension}` : `${fileName}${this.extension}`;
			previewDiv.innerHTML = `<strong>Save as:</strong> ${fullPath}`;
		};
		updatePreview();

		fileNameInput.addEventListener('input', updatePreview);

		// Save button
		const saveBtn = contentEl.createEl('button', { text: '💾 Save Key File' });
		saveBtn.style.width = '100%';
		saveBtn.style.padding = '10px';
		saveBtn.style.backgroundColor = 'var(--interactive-accent)';
		saveBtn.style.color = 'var(--text-on-accent)';
		saveBtn.style.border = 'none';
		saveBtn.style.borderRadius = '4px';
		saveBtn.style.cursor = 'pointer';
		saveBtn.style.fontWeight = 'bold';

		saveBtn.addEventListener('click', () => {
			if (!fileName || fileName.trim() === '') {
				new Notice('❌ Please enter a file name');
				return;
			}

			const folder = selectedFolder ? selectedFolder.path : '';
			const fullPath = folder ? `${folder}/${fileName}${this.extension}` : `${fileName}${this.extension}`;
			
			this.onSave(fullPath);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal for selecting a folder
 */
export class FolderPickerModal extends Modal {
	private onSelect: (folder: TFolder | null) => void;

	constructor(app: App, onSelect: (folder: TFolder | null) => void) {
		super(app);
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '📂 Select Folder' });

		const folderList = contentEl.createDiv('folder-list');
		folderList.style.maxHeight = '400px';
		folderList.style.overflowY = 'auto';
		folderList.style.border = '1px solid var(--background-modifier-border)';
		folderList.style.borderRadius = '4px';
		folderList.style.padding = '10px';

		// Add "Vault Root" option
		const rootItem = folderList.createDiv('folder-item');
		this.createFolderItem(rootItem, null, 'Vault Root (/)');

		// Get all folders
		const folders = this.getAllFolders(this.app.vault.getRoot());
		folders.forEach(folder => {
			const folderItem = folderList.createDiv('folder-item');
			this.createFolderItem(folderItem, folder, folder.path);
		});
	}

	private createFolderItem(element: HTMLElement, folder: TFolder | null, displayName: string) {
		element.style.padding = '8px';
		element.style.cursor = 'pointer';
		element.style.borderRadius = '4px';
		element.style.marginBottom = '4px';
		element.style.transition = 'background-color 0.2s';

		element.addEventListener('mouseenter', () => {
			element.style.backgroundColor = 'var(--background-modifier-hover)';
		});

		element.addEventListener('mouseleave', () => {
			element.style.backgroundColor = 'transparent';
		});

		element.addEventListener('click', () => {
			this.onSelect(folder);
			this.close();
		});

		const icon = element.createEl('span', { text: '📂 ' });
		icon.style.marginRight = '8px';
		element.createEl('span', { text: displayName });
	}

	private getAllFolders(folder: TFolder): TFolder[] {
		let folders: TFolder[] = [];
		
		folder.children.forEach(child => {
			if (child instanceof TFolder) {
				folders.push(child);
				folders = folders.concat(this.getAllFolders(child));
			}
		});

		return folders;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
