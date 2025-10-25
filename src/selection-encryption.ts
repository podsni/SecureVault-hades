/**
 * Selection-based Encryption
 * Encrypt selected text in editor with inline markers
 */

import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { CryptoService } from './crypto';
import SecureVaultPlugin from '../main';

export interface InlineEncryptedBlock {
	id: string;
	encryptedContent: string;
	salt: string;
	iv: string;
	algorithm: string;
	createdAt: number;
}

export class SelectionEncryptionManager {
	private plugin: SecureVaultPlugin;
	private app: App;
	
	// Marker format: ```encrypt\n{encrypted data}\n```
	private readonly MARKER_START = '```encrypt\n';
	private readonly MARKER_END = '\n```';

	constructor(plugin: SecureVaultPlugin, app: App) {
		this.plugin = plugin;
		this.app = app;
	}

	/**
	 * Check if selection contains already encrypted blocks
	 */
	private hasEncryptedBlocks(text: string): boolean {
		// Check for encrypt markers
		return text.includes('```encrypt') || text.includes('```encrypt\n');
	}

	/**
	 * Encrypt selected text in editor
	 */
	async encryptSelection(
		editor: Editor,
		view: MarkdownView,
		password: string,
		keyFileContent?: string
	): Promise<boolean> {
		try {
			let selection = editor.getSelection();
			
			if (!selection || selection.length === 0) {
				new Notice('❌ No text selected! Select text first.');
				return false;
			}

			// GUARD: Check if selection already contains encrypted blocks
			if (this.hasEncryptedBlocks(selection)) {
				new Notice('⚠️ Selection contains already encrypted text! Cannot encrypt twice.');
				return false;
			}

			// Expand selection to whole line if enabled
			if (this.plugin.settings.expandSelectionToWholeLine) {
				const from = editor.getCursor('from');
				const to = editor.getCursor('to');
				
				// Get line content
				const fromLine = editor.getLine(from.line);
				const toLine = editor.getLine(to.line);
				
				// Check if selection is partial (not full line)
				const isPartialSelection = 
					from.ch > 0 || 
					to.ch < toLine.length;
				
				if (isPartialSelection) {
					// Expand to full lines
					editor.setSelection(
						{ line: from.line, ch: 0 },
						{ line: to.line, ch: toLine.length }
					);
					selection = editor.getSelection();
				}
			}

			// Combine password with key file
			const masterKey = keyFileContent 
				? password + keyFileContent 
				: password;

			// Encrypt the selection
			const encrypted = CryptoService.encrypt(
				selection,
				masterKey,
				this.plugin.settings.encryptionAlgorithm
			);

			// Create inline encrypted block
			const blockData: InlineEncryptedBlock = {
				id: this.generateBlockId(),
				encryptedContent: encrypted.content,
				salt: encrypted.salt,
				iv: encrypted.iv,
				algorithm: encrypted.algorithm,
				createdAt: Date.now()
			};

			// Create marker
			const marker = this.createMarker(blockData);

			// Replace selection with marker
			editor.replaceSelection(marker);

			new Notice('🔒 Selection encrypted successfully!');
			return true;

		} catch (error) {
			console.error('Selection encryption error:', error);
			new Notice(`❌ Encryption failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Decrypt inline encrypted block at cursor
	 */
	async decryptAtCursor(
		editor: Editor,
		view: MarkdownView,
		password: string,
		keyFileContent?: string
	): Promise<boolean> {
		try {
			const cursor = editor.getCursor();
			const lineText = editor.getLine(cursor.line);

			// Search for nearest encrypted block
			const block = this.findEncryptedBlockAtCursor(editor, cursor);

			if (!block) {
				new Notice('❌ No encrypted block found at cursor!');
				return false;
			}

			// Combine password with key file
			const masterKey = keyFileContent 
				? password + keyFileContent 
				: password;

			// Decrypt
			const decrypted = CryptoService.decrypt(
				{
					algorithm: block.data.algorithm as any,
					salt: block.data.salt,
					iv: block.data.iv,
					content: block.data.encryptedContent
				},
				masterKey
			);

			if (!decrypted) {
				new Notice('❌ Decryption failed - wrong password?');
				return false;
			}

			// Replace marker with decrypted content
			const from = { line: block.startLine, ch: 0 };
			const to = { line: block.endLine, ch: editor.getLine(block.endLine).length };
			
			editor.replaceRange(decrypted, from, to);

			new Notice('🔓 Block decrypted successfully!');
			return true;

		} catch (error) {
			console.error('Decryption error:', error);
			new Notice(`❌ Decryption failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Find encrypted block at cursor position
	 */
	private findEncryptedBlockAtCursor(
		editor: Editor,
		cursor: { line: number; ch: number }
	): { data: InlineEncryptedBlock; startLine: number; endLine: number } | null {
		const searchLimit = this.plugin.settings.searchLimitForMarkers;
		const totalLines = editor.lineCount();
		
		// Search backwards for start marker
		let startLine = -1;
		for (let i = cursor.line; i >= Math.max(0, cursor.line - searchLimit); i--) {
			const line = editor.getLine(i);
			if (line.trim() === '```encrypt') {
				startLine = i;
				break;
			}
		}

		if (startLine === -1) {
			return null;
		}

		// Search forwards for end marker
		let endLine = -1;
		for (let i = startLine + 1; i < Math.min(totalLines, startLine + searchLimit); i++) {
			const line = editor.getLine(i);
			if (line.trim() === '```') {
				endLine = i;
				break;
			}
		}

		if (endLine === -1) {
			return null;
		}

		// Extract block content (between markers)
		const blockLines: string[] = [];
		for (let i = startLine + 1; i < endLine; i++) {
			blockLines.push(editor.getLine(i));
		}

		const blockContent = blockLines.join('\n');

		try {
			const data = JSON.parse(blockContent) as InlineEncryptedBlock;
			return { data, startLine, endLine };
		} catch (error) {
			console.error('Failed to parse encrypted block:', error);
			return null;
		}
	}

	/**
	 * Create marker with encrypted data
	 */
	private createMarker(block: InlineEncryptedBlock): string {
		const jsonData = JSON.stringify(block, null, 2);
		return `${this.MARKER_START}${jsonData}${this.MARKER_END}`;
	}

	/**
	 * Generate unique block ID
	 */
	private generateBlockId(): string {
		return `enc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Count encrypted blocks in current file
	 */
	countEncryptedBlocks(editor: Editor): number {
		let count = 0;
		const totalLines = editor.lineCount();

		for (let i = 0; i < totalLines; i++) {
			const line = editor.getLine(i);
			if (line.trim() === '```encrypt') {
				count++;
			}
		}

		return count;
	}

	/**
	 * Check if cursor is inside encrypted block
	 */
	isCursorInEncryptedBlock(editor: Editor): boolean {
		const cursor = editor.getCursor();
		return this.findEncryptedBlockAtCursor(editor, cursor) !== null;
	}
}
