import { AccessLogEntry, SecureVaultSettings } from './types';

export class AccessLogger {
	private settings: SecureVaultSettings;

	constructor(settings: SecureVaultSettings) {
		this.settings = settings;
	}

	log(action: 'unlock' | 'lock' | 'create' | 'access', folderPath: string, success: boolean, details?: string) {
		if (!this.settings.enableAccessLog) return;

		const entry: AccessLogEntry = {
			timestamp: Date.now(),
			action,
			folderPath,
			success,
			details
		};

		this.settings.accessLogs.push(entry);

		// Trim to max logs
		if (this.settings.accessLogs.length > this.settings.maxAccessLogs) {
			this.settings.accessLogs = this.settings.accessLogs.slice(-this.settings.maxAccessLogs);
		}
	}

	getRecentLogs(count: number = 10): AccessLogEntry[] {
		return this.settings.accessLogs.slice(-count).reverse();
	}

	getLogsForFolder(folderPath: string): AccessLogEntry[] {
		return this.settings.accessLogs
			.filter(log => log.folderPath === folderPath)
			.reverse();
	}

	clearLogs() {
		this.settings.accessLogs = [];
	}

	formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleString();
	}

	getActionIcon(action: string): string {
		switch (action) {
			case 'unlock': return '🔓';
			case 'lock': return '🔒';
			case 'create': return '➕';
			case 'access': return '👁️';
			default: return '📝';
		}
	}

	getSuccessIcon(success: boolean): string {
		return success ? '✅' : '❌';
	}
}
