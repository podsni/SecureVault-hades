import { App, TFile, TFolder } from 'obsidian';
import SecureVaultPlugin from '../../main';
import { CryptoService } from '../crypto';
import { EncryptedFileMetadata, EncryptedFolder } from '../types';

export type AuditSeverity = 'info' | 'warning' | 'error';

export interface AuditIssue {
	severity: AuditSeverity;
	message: string;
	path?: string;
}

export interface AuditReport {
	timestamp: number;
	scannedFolders: number;
	scannedFiles: number;
	issues: AuditIssue[];
}

export class SecurityAuditService {
	private plugin: SecureVaultPlugin;
	private app: App;

	constructor(plugin: SecureVaultPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
	}

	async runAudit(): Promise<AuditReport> {
		const issues: AuditIssue[] = [];
		let scannedFolders = 0;
		let scannedFiles = 0;

		const settings = this.plugin.settings;

		if (!settings.masterPasswordHash) {
			issues.push({
				severity: 'warning',
				message: 'Master password belum disetel. Buka Settings → SecureVault untuk mengaktifkan perlindungan.',
			});
		}

		for (const folderMeta of settings.encryptedFolders) {
			scannedFolders++;
			const folder = this.app.vault.getAbstractFileByPath(folderMeta.path);

			if (!(folder instanceof TFolder)) {
				issues.push({
					severity: 'error',
					message: 'Folder terenkripsi tidak ditemukan di vault.',
					path: folderMeta.path,
				});
				continue;
			}

			const files = this.collectFiles(folder);
			for (const file of files) {
				scannedFiles++;
				await this.inspectEncryptedFile(file, issues);
			}
		}

		return {
			timestamp: Date.now(),
			scannedFolders,
			scannedFiles,
			issues,
		};
	}

	private collectFiles(folder: TFolder): TFile[] {
		const files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile) {
				files.push(child);
			} else if (child instanceof TFolder) {
				files.push(...this.collectFiles(child));
			}
		}

		return files.filter((f) => f.extension === 'secvault' || f.extension === 'md');
	}

	private async inspectEncryptedFile(file: TFile, issues: AuditIssue[]) {
		try {
			const rawContent = (await this.app.vault.read(file)).trim();

			if (!rawContent.length) {
				issues.push({
					severity: 'warning',
					message: 'File terenkripsi kosong. Periksa apakah proses enkripsi berhasil.',
					path: file.path,
				});
				return;
			}

			if (file.extension === 'secvault') {
				if (!this.tryParsePayload(rawContent)) {
					issues.push({
						severity: 'error',
						message: 'Payload .secvault tidak valid atau korup.',
						path: file.path,
					});
				}
				return;
			}

			// Legacy encrypted markdown file
			if (!rawContent.startsWith('---SECUREVAULT---')) {
				issues.push({
					severity: 'warning',
					message: 'File berada di folder terenkripsi namun tidak memiliki header SecureVault.',
					path: file.path,
				});
				return;
			}

			const metadata = CryptoService.decodeFileContent(rawContent);
			if (!metadata) {
				issues.push({
					severity: 'error',
					message: 'File terenkripsi tidak bisa di-decode.',
					path: file.path,
				});
			}
		} catch (error) {
			issues.push({
				severity: 'error',
				message: `Gagal membaca file terenkripsi: ${(error as Error).message}`,
				path: file.path,
			});
		}
	}

	private tryParsePayload(rawContent: string): boolean {
		try {
			JSON.parse(rawContent);
			return true;
		} catch {
			const decoded = CryptoService.decodeFileContent(rawContent);
			return !!decoded;
		}
	}
}
