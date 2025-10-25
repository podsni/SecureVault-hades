/**
 * SecVault File View
 * Custom view for .secvault encrypted files (read-only preview)
 */

import { TextFileView, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import SecureVaultPlugin from '../main';
import { PasswordModal, PreviewModal } from './ui';
import { CryptoService } from './crypto';
import { EncryptedFileMetadata } from './types';

export const SECVAULT_VIEW_TYPE = 'secvault-view';

export class SecVaultView extends TextFileView {
	plugin: SecureVaultPlugin;
	private currentFormat: 'single' | 'folder' | 'unknown' = 'unknown';

	constructor(leaf: WorkspaceLeaf, plugin: SecureVaultPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return SECVAULT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename || 'Encrypted File';
	}

	async onOpen(): Promise<void> {
		// Empty - rendering happens in setViewData
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}

	getViewData(): string {
		return this.data;
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;
		this.render();
	}

	clear(): void {
		this.data = '';
		this.render();
	}

	/**
	 * Render the encrypted file view
	 */
	private render(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass('secvault-view-container');

		const formatData = this.resolveFormat();
		this.currentFormat = formatData.format;

		this.renderHeader(container, formatData.format);
		this.renderInfoCard(container, formatData);
		this.renderActionsCard(container, formatData);
		this.renderPreviewCard(container, formatData);
		this.renderHelpBox(container, formatData.format);

		// Add CSS styles
		this.addStyles(container);
	}

	private resolveFormat(): {
		format: 'single' | 'folder' | 'unknown';
		jsonData?: any;
		folderMetadata?: EncryptedFileMetadata | null;
	} {
		const rawData = (this.data || '').trim();

		if (!rawData.length) {
			return { format: 'unknown' };
		}

		try {
			const parsed = JSON.parse(rawData);
			if (parsed && typeof parsed === 'object' && (parsed.content || parsed.metadata)) {
				return { format: 'single', jsonData: parsed };
			}
		} catch {
			// Ignore parse error, will try legacy format
		}

		if (rawData.startsWith('---SECUREVAULT---')) {
			const metadata = CryptoService.decodeFileContent(rawData);
			if (metadata) {
				return { format: 'folder', folderMetadata: metadata };
			}
		}

		return { format: 'unknown' };
	}

	private renderHeader(container: HTMLElement, format: 'single' | 'folder' | 'unknown') {
		const header = container.createDiv('secvault-header');

		const titleText =
			format === 'folder'
				? '🔐 SecureVault-Hades Folder Encryption'
				: '🔒 SecureVault-Hades Encrypted File';
		header.createEl('h2', {
			text: titleText,
			cls: 'secvault-title'
		});

		const subtitle =
			format === 'folder'
				? 'File ini merupakan bagian dari folder terenkripsi. Gunakan perintah Unlock Folder untuk membukanya.'
				: format === 'single'
					? 'File terenkripsi individual. Gunakan tombol di bawah untuk mendekripsi atau melihat sementara.'
					: 'Format file tidak dikenali. Konten ditampilkan dalam bentuk mentah.';

		header.createEl('p', {
			text: subtitle,
			cls: 'secvault-subtitle'
		});

		if (format === 'unknown') {
			const warningDiv = container.createDiv('secvault-warning');
			warningDiv.createEl('p', {
				text: '⚠️ File ini tidak sesuai format .secvault yang didukung. Pastikan proses enkripsi selesai dengan benar.',
				cls: 'secvault-warning-text'
			});
		}
	}

	private renderInfoCard(
		container: HTMLElement,
		formatData: { format: 'single' | 'folder' | 'unknown'; jsonData?: any; folderMetadata?: EncryptedFileMetadata | null }
	) {
		const infoCard = container.createDiv('secvault-info-card');
		infoCard.createEl('h3', { text: '📄 File Information', cls: 'secvault-card-title' });

		const infoGrid = infoCard.createDiv('secvault-info-grid');

		if (this.file) {
			this.addInfoRow(infoGrid, '📄 Filename', this.file.name);
			this.addInfoRow(infoGrid, '📂 Location', this.file.path);
			this.addInfoRow(infoGrid, '📏 File Size', this.formatBytes(this.file.stat.size));
			this.addInfoRow(infoGrid, '📅 Last Modified', new Date(this.file.stat.mtime).toLocaleString());
			this.addInfoRow(infoGrid, '🆔 Extension', '.secvault');
		}

		if (formatData.format === 'single' && formatData.jsonData) {
			const divider = infoGrid.createDiv('secvault-divider');
			divider.createEl('h4', { text: '🔐 Encryption Details' });

			const metadata = formatData.jsonData.metadata ?? {};

			this.addInfoRow(infoGrid, '🔑 Algorithm', formatData.jsonData.algorithm || metadata.algorithm || 'AES-256-GCM');
			this.addInfoRow(infoGrid, '📦 Type', formatData.jsonData.type || metadata.type || 'text');
			this.addInfoRow(infoGrid, '🏷️ Version', formatData.jsonData.version || '1.0');

			if (metadata.encryptedAt) {
				this.addInfoRow(
					infoGrid,
					'🕐 Encrypted At',
					new Date(metadata.encryptedAt).toLocaleString()
				);
			}

			if (metadata.originalExtension) {
				this.addInfoRow(infoGrid, '📝 Original Type', metadata.originalExtension);
			}
		} else if (formatData.format === 'folder' && formatData.folderMetadata) {
			const divider = infoGrid.createDiv('secvault-divider');
			divider.createEl('h4', { text: '🔐 Folder Encryption Metadata' });

			this.addInfoRow(infoGrid, '🔑 Algorithm', formatData.folderMetadata.algorithm);
			this.addInfoRow(infoGrid, '🧂 Salt', formatData.folderMetadata.salt);
			this.addInfoRow(infoGrid, '🌀 IV', formatData.folderMetadata.iv);

			if (formatData.folderMetadata.originalExtension) {
				this.addInfoRow(infoGrid, '📝 Original Extension', formatData.folderMetadata.originalExtension);
			}
		} else if (formatData.format === 'unknown') {
			const emptyNotice = infoGrid.createDiv('secvault-info-empty');
			emptyNotice.textContent = 'Metadata tidak tersedia untuk format ini.';
		}
	}

	private renderActionsCard(
		container: HTMLElement,
		formatData: { format: 'single' | 'folder' | 'unknown' }
	) {
		const actionsCard = container.createDiv('secvault-actions-card');
		actionsCard.createEl('h3', { text: '⚡ Available Actions', cls: 'secvault-card-title' });

		const actionsGrid = actionsCard.createDiv('secvault-actions-grid');

		const decryptAction = actionsGrid.createDiv('secvault-action-item');
		const decryptBtn = decryptAction.createEl('button', {
			text: '🔓 Decrypt & Restore',
			cls: 'mod-cta secvault-action-btn'
		});
		if (formatData.format !== 'single') {
			decryptBtn.setAttribute('disabled', 'true');
			decryptBtn.addClass('is-disabled');
		}
		decryptBtn.addEventListener('click', async () => {
			await this.decryptFile();
		});
		decryptAction.createEl('p', {
			text:
				formatData.format === 'single'
					? 'Permanently decrypt this file and convert back to original format (.md)'
					: 'Gunakan perintah Unlock Folder untuk mengembalikan file ke kondisi semula.',
			cls: 'secvault-action-desc'
		});

		const viewAction = actionsGrid.createDiv('secvault-action-item');
		const quickViewBtn = viewAction.createEl('button', {
			text: '👁️ Quick View',
			cls: 'mod-warning secvault-action-btn'
		});
		if (formatData.format !== 'single') {
			quickViewBtn.setAttribute('disabled', 'true');
			quickViewBtn.addClass('is-disabled');
		}
		quickViewBtn.addEventListener('click', async () => {
			await this.quickViewFile();
		});
		viewAction.createEl('p', {
			text:
				formatData.format === 'single'
					? 'Temporarily view content without decrypting (read-only, requires password)'
					: 'Pratinjau cepat tidak tersedia untuk file hasil enkripsi folder.',
			cls: 'secvault-action-desc'
		});
	}

	private renderPreviewCard(
		container: HTMLElement,
		formatData: { format: 'single' | 'folder' | 'unknown'; jsonData?: any; folderMetadata?: EncryptedFileMetadata | null }
	) {
		const previewCard = container.createDiv('secvault-preview-card');
		previewCard.createEl('h3', { text: '🔒 Encrypted Content', cls: 'secvault-card-title' });

		const previewContainer = previewCard.createDiv('secvault-preview-container');
		const preview = previewContainer.createEl('div', { cls: 'secvault-encrypted-text' });

		let previewText = this.data.substring(0, 300) + (this.data.length > 300 ? '...' : '');
		let totalChars = this.data.length;

		if (formatData.format === 'single' && formatData.jsonData?.content) {
			previewText = formatData.jsonData.content.substring(0, 300) + (formatData.jsonData.content.length > 300 ? '...' : '');
			totalChars = formatData.jsonData.content.length;
		} else if (formatData.format === 'folder' && formatData.folderMetadata?.content) {
			previewText = formatData.folderMetadata.content.substring(0, 300) + (formatData.folderMetadata.content.length > 300 ? '...' : '');
			totalChars = formatData.folderMetadata.content.length;
		}

		preview.textContent = previewText;

		const stats = previewContainer.createDiv('secvault-content-stats');
		stats.createEl('span', {
			text: `📊 Total encrypted characters: ${totalChars.toLocaleString()}`,
			cls: 'secvault-stat-item'
		});
	}

	private renderHelpBox(container: HTMLElement, format: 'single' | 'folder' | 'unknown') {
		const helpBox = container.createDiv('secvault-help-box');
		if (format === 'single') {
			helpBox.innerHTML = `
				<div class="secvault-help-header">
					<strong>💡 About This File</strong>
				</div>
				<div class="secvault-help-content">
					<p>This file is <strong>encrypted and protected</strong> by <strong>SecureVault-Hades</strong>.</p>
					
					<div class="secvault-help-section">
						<strong>🔐 Security Features:</strong>
						<ul>
							<li>AES-256-GCM or ChaCha20-Poly1305 encryption</li>
							<li>PBKDF2 key derivation (100,000 iterations)</li>
							<li>Password-protected with optional key file</li>
						</ul>
					</div>
					
					<div class="secvault-help-section">
						<strong>📝 Usage Notes:</strong>
						<ul>
							<li>This file <strong>cannot be edited</strong> while encrypted</li>
							<li>Use <strong>🔓 Decrypt & Restore</strong> to permanently decrypt</li>
							<li>Use <strong>👁️ Quick View</strong> for temporary read-only access</li>
							<li>The file will be renamed back to <strong>.md</strong> after decryption</li>
						</ul>
					</div>
					
					<div class="secvault-help-footer">
						<strong>⚠️ Important:</strong> Keep your password safe! Without it, this file cannot be recovered.
					</div>
				</div>
			`;
		} else if (format === 'folder') {
			helpBox.innerHTML = `
				<div class="secvault-help-header">
					<strong>📁 Folder Encryption</strong>
				</div>
				<div class="secvault-help-content">
					<p>File ini dienkripsi sebagai bagian dari folder yang dikunci menggunakan SecureVault-Hades.</p>
					
					<div class="secvault-help-section">
						<strong>🧭 Cara membuka:</strong>
						<ul>
							<li>Buka sidebar SecureVault-Hades.</li>
							<li>Pilih folder terkait lalu tekan <strong>Unlock</strong>.</li>
							<li>Semua file di dalam folder akan otomatis kembali ke format semula.</li>
						</ul>
					</div>
					
					<div class="secvault-help-section">
						<strong>🔒 Keamanan:</strong>
						<ul>
							<li>Setiap file memiliki IV dan salt unik.</li>
							<li>Ekstensi file berubah menjadi <code>.secvault</code> saat terkunci.</li>
							<li>Metadata asli disimpan untuk proses pemulihan.</li>
						</ul>
					</div>
					
					<div class="secvault-help-footer">
						<strong>ℹ️ Tip:</strong> Gunakan perintah Lock/Unlock Folder untuk menjaga folder tetap tersinkronisasi.
					</div>
				</div>
			`;
		} else {
			helpBox.innerHTML = `
				<div class="secvault-help-header">
					<strong>⚠️ Format Tidak Dikenal</strong>
				</div>
				<div class="secvault-help-content">
					<p>SecureVault-Hades tidak dapat mengenali struktur file ini. Pastikan file dibuat melalui proses enkripsi plugin.</p>
					<div class="secvault-help-section">
						<strong>Langkah yang disarankan:</strong>
						<ul>
							<li>Periksa history perubahan atau backup.</li>
							<li>Jika file penting, simpan salinan sebelum mencoba memulihkan.</li>
						</ul>
					</div>
				</div>
			`;
		}
	}

	/**
	 * Decrypt the file
	 */
	private async decryptFile(): Promise<void> {
		if (this.currentFormat !== 'single') {
			new Notice('ℹ️ Gunakan perintah Unlock Folder untuk file hasil enkripsi folder.');
			return;
		}

		if (!this.file) {
			new Notice('❌ No file to decrypt');
			return;
		}

		new PasswordModal(this.app, this.plugin.settings, async (password: string) => {
			try {
				// Get key file if enabled
				let keyFileContent: string | undefined;
				if (this.plugin.settings.enableKeyFile && this.plugin.settings.keyFilePath) {
					const keyFile = this.app.vault.getAbstractFileByPath(this.plugin.settings.keyFilePath);
					if (keyFile && keyFile instanceof TFile) {
						keyFileContent = await this.app.vault.read(keyFile);
					}
				}

				// Decrypt file
				const success = await this.plugin.fileEncryption.decryptFile(
					this.file!,
					password,
					keyFileContent
				);

				if (success) {
					// Close this view and open the decrypted file
					this.leaf.detach();
				}
			} catch (error) {
				console.error('Decrypt error:', error);
				new Notice(`❌ Decryption failed: ${error.message}`);
			}
		}).open();
	}

	/**
	 * Quick view (temporary decrypt in memory)
	 */
	private async quickViewFile(): Promise<void> {
		if (this.currentFormat !== 'single') {
			new Notice('ℹ️ Quick view hanya tersedia untuk file terenkripsi individual.');
			return;
		}

		if (!this.file) {
			new Notice('❌ No file to view');
			return;
		}

		new PasswordModal(this.app, this.plugin.settings, async (password: string) => {
			try {
				// Get key file if enabled
				let keyFileContent: string | undefined;
				if (this.plugin.settings.enableKeyFile && this.plugin.settings.keyFilePath) {
					const keyFile = this.app.vault.getAbstractFileByPath(this.plugin.settings.keyFilePath);
					if (keyFile instanceof TFile) {
						keyFileContent = await this.app.vault.read(keyFile);
					}
				}

				// Quick unlock (decrypt in memory)
				const decrypted = await this.plugin.fileEncryption.quickUnlockFile(
					this.file!,
					password,
					keyFileContent
				);

				if (decrypted) {
					// Show in beautiful preview modal with markdown rendering
					const fileName = this.file!.basename.replace('.secvault', '');
					new PreviewModal(
						this.app,
						this.plugin,
						decrypted,
						fileName,
						true // isMarkdown
					).open();
				}
			} catch (error) {
				console.error('Quick view error:', error);
				new Notice(`❌ Failed to view: ${error.message}`);
			}
		}).open();
	}

	/**
	 * Add info row to grid
	 */
	private addInfoRow(container: HTMLElement, label: string, value: string): void {
		const row = container.createDiv('secvault-info-row');
		row.createEl('span', { text: label, cls: 'secvault-info-label' });
		row.createEl('span', { text: value, cls: 'secvault-info-value' });
	}

	/**
	 * Format bytes to human readable
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}

	/**
	 * Add custom CSS styles
	 */
	private addStyles(container: HTMLElement): void {
		const style = document.createElement('style');
		style.textContent = `
			.secvault-view-container {
				padding: 30px;
				max-width: 900px;
				margin: 0 auto;
				font-family: var(--font-interface);
			}
			
			.secvault-header {
				text-align: center;
				margin-bottom: 30px;
				padding: 25px;
				background: linear-gradient(135deg, var(--interactive-accent) 0%, var(--interactive-accent-hover) 100%);
				border-radius: 12px;
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			}
			
			.secvault-title {
				margin: 0;
				color: var(--text-on-accent);
				font-size: 1.8em;
				font-weight: 600;
				text-shadow: 0 2px 4px rgba(0,0,0,0.2);
			}

			.secvault-subtitle {
				color: var(--text-on-accent);
				opacity: 0.85;
				font-size: 0.95em;
				margin-top: 10px;
			}
			
			.secvault-warning {
				background: var(--background-modifier-error);
				padding: 15px 20px;
				border-radius: 8px;
				border-left: 4px solid var(--text-error);
				margin-bottom: 25px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			}
			
			.secvault-warning-text {
				margin: 0;
				color: var(--text-error);
				font-weight: 600;
			}
			
			.secvault-info-card, .secvault-actions-card, .secvault-preview-card {
				background: var(--background-secondary);
				padding: 20px;
				border-radius: 10px;
				margin-bottom: 25px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				border: 1px solid var(--background-modifier-border);
			}
			
			.secvault-card-title {
				margin: 0 0 20px 0;
				color: var(--text-accent);
				font-size: 1.3em;
				font-weight: 600;
				padding-bottom: 10px;
				border-bottom: 2px solid var(--background-modifier-border);
			}
			
			.secvault-info-grid {
				display: grid;
				gap: 12px;
			}

			.secvault-info-empty {
				grid-column: 1 / -1;
				padding: 12px 16px;
				background: var(--background-modifier-hover);
				border-radius: 6px;
				color: var(--text-muted);
				font-style: italic;
			}
			
			.secvault-info-row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 15px;
				background: var(--background-primary);
				border-radius: 6px;
				transition: all 0.2s ease;
			}
			
			.secvault-info-row:hover {
				background: var(--background-primary-alt);
				transform: translateX(4px);
			}
			
			.secvault-info-label {
				font-weight: 600;
				color: var(--text-muted);
				flex: 0 0 180px;
			}
			
			.secvault-info-value {
				color: var(--text-normal);
				text-align: right;
				flex: 1;
				word-break: break-all;
			}
			
			.secvault-divider {
				margin: 20px 0 15px 0;
				padding-top: 15px;
				border-top: 2px dashed var(--background-modifier-border);
			}
			
			.secvault-divider h4 {
				margin: 0 0 15px 0;
				color: var(--text-accent);
				font-size: 1.1em;
			}
			
			.secvault-actions-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
				gap: 20px;
			}
			
			.secvault-action-item {
				display: flex;
				flex-direction: column;
				gap: 10px;
			}
			
			.secvault-action-btn {
				width: 100%;
				padding: 12px 20px;
				font-size: 15px;
				font-weight: 600;
				border-radius: 8px;
				transition: all 0.2s ease;
			}

			.secvault-action-btn.is-disabled {
				opacity: 0.5;
				cursor: not-allowed;
				transform: none;
				box-shadow: none;
				pointer-events: none;
			}
			
			.secvault-action-btn:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			}
			
			.secvault-action-desc {
				margin: 0;
				color: var(--text-muted);
				font-size: 0.9em;
				line-height: 1.5;
			}
			
			.secvault-preview-container {
				background: var(--background-primary);
				border-radius: 8px;
				overflow: hidden;
			}
			
			.secvault-encrypted-text {
				padding: 20px;
				font-family: var(--font-monospace);
				font-size: 0.85em;
				overflow: auto;
				max-height: 250px;
				color: var(--text-faint);
				word-break: break-all;
				line-height: 1.6;
				background: var(--code-background);
			}
			
			.secvault-content-stats {
				padding: 12px 20px;
				background: var(--background-primary-alt);
				border-top: 1px solid var(--background-modifier-border);
			}
			
			.secvault-stat-item {
				color: var(--text-muted);
				font-size: 0.9em;
				font-weight: 500;
			}
			
			.secvault-help-box {
				background: var(--background-secondary-alt);
				border-radius: 10px;
				overflow: hidden;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				border: 1px solid var(--background-modifier-border);
			}
			
			.secvault-help-header {
				background: var(--interactive-accent);
				color: var(--text-on-accent);
				padding: 15px 20px;
				font-size: 1.2em;
			}
			
			.secvault-help-content {
				padding: 20px;
				line-height: 1.8;
			}
			
			.secvault-help-content p {
				margin: 0 0 15px 0;
			}
			
			.secvault-help-section {
				margin: 20px 0;
				padding: 15px;
				background: var(--background-primary);
				border-radius: 6px;
			}
			
			.secvault-help-section strong {
				color: var(--text-accent);
				display: block;
				margin-bottom: 10px;
			}
			
			.secvault-help-section ul {
				margin: 0;
				padding-left: 20px;
			}
			
			.secvault-help-section li {
				margin: 8px 0;
				color: var(--text-muted);
			}
			
			.secvault-help-footer {
				margin-top: 20px;
				padding: 15px;
				background: var(--background-modifier-error-hover);
				border-radius: 6px;
				border-left: 4px solid var(--text-error);
			}
			
			.secvault-help-footer strong {
				color: var(--text-error);
			}
		`;
		container.appendChild(style);
	}
}
