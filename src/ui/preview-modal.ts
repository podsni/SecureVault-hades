/**
 * Preview Modal - Display decrypted content in a modal
 * Allows viewing encrypted content without permanently decrypting
 */

import { App, Modal, MarkdownRenderer, Notice } from 'obsidian';
import SecureVaultPlugin from '../../main';

export class PreviewModal extends Modal {
	plugin: SecureVaultPlugin;
	content: string;
	fileName: string;
	isMarkdown: boolean;

	constructor(
		app: App,
		plugin: SecureVaultPlugin,
		content: string,
		fileName: string = 'Preview',
		isMarkdown: boolean = true
	) {
		super(app);
		this.plugin = plugin;
		this.content = content;
		this.fileName = fileName;
		this.isMarkdown = isMarkdown;
	}

	onOpen() {
		const { contentEl, titleEl } = this;

		// Set title
		titleEl.setText(`👁️ ${this.fileName} (Read-Only Preview)`);

		// Add CSS class
		contentEl.addClass('securevault-preview-modal');

		// Header info
		const headerDiv = contentEl.createDiv('preview-header');
		headerDiv.createEl('p', {
			text: '🔓 This is a temporary preview. File remains encrypted.',
			cls: 'preview-info'
		});

		// Stats
		const statsDiv = headerDiv.createDiv('preview-stats');
		const lines = this.content.split('\n').length;
		const words = this.content.split(/\s+/).filter(w => w.length > 0).length;
		const chars = this.content.length;
		
		statsDiv.createEl('span', { text: `📄 ${lines} lines` });
		statsDiv.createEl('span', { text: `📝 ${words} words` });
		statsDiv.createEl('span', { text: `🔤 ${chars} chars` });

		// Content container
		const contentContainer = contentEl.createDiv('preview-content-container');

		// Render content
		if (this.isMarkdown) {
			// Render as Markdown
			const markdownDiv = contentContainer.createDiv('preview-markdown-content');
			MarkdownRenderer.renderMarkdown(
				this.content,
				markdownDiv,
				'',
				this.plugin
			);
		} else {
			// Render as plain text
			const textPre = contentContainer.createEl('pre', {
				cls: 'preview-text-content'
			});
			textPre.textContent = this.content;
		}

		// Action buttons
		const actionsDiv = contentEl.createDiv('preview-actions');

		// Copy button
		const copyBtn = actionsDiv.createEl('button', {
			text: '📋 Copy to Clipboard',
			cls: 'mod-cta'
		});
		copyBtn.addEventListener('click', () => {
			navigator.clipboard.writeText(this.content);
			new Notice('✅ Content copied to clipboard!');
		});

		// Toggle view button
		const toggleBtn = actionsDiv.createEl('button', {
			text: this.isMarkdown ? '📄 View as Plain Text' : '📝 View as Markdown',
			cls: 'mod-warning'
		});
		toggleBtn.addEventListener('click', () => {
			this.isMarkdown = !this.isMarkdown;
			this.close();
			new PreviewModal(
				this.app,
				this.plugin,
				this.content,
				this.fileName,
				this.isMarkdown
			).open();
		});

		// Close button
		const closeBtn = actionsDiv.createEl('button', {
			text: '❌ Close',
		});
		closeBtn.addEventListener('click', () => {
			this.close();
		});

		// Add styles
		this.addStyles();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Add custom styles
	 */
	private addStyles() {
		const style = document.createElement('style');
		style.textContent = `
			.securevault-preview-modal {
				padding: 0;
			}

			.securevault-preview-modal .modal-content {
				padding: 0;
				max-height: 80vh;
				display: flex;
				flex-direction: column;
			}

			.preview-header {
				background: var(--interactive-accent);
				color: var(--text-on-accent);
				padding: 20px;
				border-radius: 8px 8px 0 0;
			}

			.preview-info {
				margin: 0 0 15px 0;
				font-weight: 600;
				text-align: center;
			}

			.preview-stats {
				display: flex;
				justify-content: center;
				gap: 20px;
				font-size: 0.9em;
			}

			.preview-stats span {
				background: rgba(255, 255, 255, 0.2);
				padding: 5px 12px;
				border-radius: 4px;
			}

			.preview-content-container {
				flex: 1;
				overflow: auto;
				padding: 20px;
				background: var(--background-primary);
				min-height: 300px;
				max-height: calc(80vh - 200px);
			}

			.preview-markdown-content {
				line-height: 1.6;
			}

			.preview-markdown-content h1,
			.preview-markdown-content h2,
			.preview-markdown-content h3 {
				color: var(--text-accent);
				margin-top: 1.5em;
				margin-bottom: 0.5em;
			}

			.preview-markdown-content p {
				margin-bottom: 1em;
			}

			.preview-markdown-content ul,
			.preview-markdown-content ol {
				margin-left: 20px;
				margin-bottom: 1em;
			}

			.preview-markdown-content code {
				background: var(--code-background);
				padding: 2px 6px;
				border-radius: 3px;
				font-family: var(--font-monospace);
			}

			.preview-markdown-content pre {
				background: var(--code-background);
				padding: 15px;
				border-radius: 6px;
				overflow-x: auto;
			}

			.preview-markdown-content blockquote {
				border-left: 4px solid var(--interactive-accent);
				padding-left: 15px;
				margin-left: 0;
				color: var(--text-muted);
			}

			.preview-text-content {
				font-family: var(--font-monospace);
				font-size: 0.9em;
				line-height: 1.6;
				white-space: pre-wrap;
				word-wrap: break-word;
				margin: 0;
				padding: 15px;
				background: var(--code-background);
				border-radius: 6px;
			}

			.preview-actions {
				display: flex;
				gap: 10px;
				padding: 20px;
				background: var(--background-secondary);
				border-radius: 0 0 8px 8px;
				justify-content: center;
			}

			.preview-actions button {
				padding: 10px 20px;
				font-size: 14px;
				font-weight: 600;
				border-radius: 6px;
				transition: all 0.2s ease;
			}

			.preview-actions button:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			}
		`;
		document.head.appendChild(style);
	}
}
