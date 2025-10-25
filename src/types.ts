export type EncryptionAlgorithm = 'AES-256-GCM' | 'ChaCha20-Poly1305';

export interface AccessLogEntry {
	timestamp: number;
	action: 'unlock' | 'lock' | 'create' | 'access';
	folderPath: string;
	success: boolean;
	details?: string;
}

export type PasswordCategory = 'vault' | 'folder' | 'file' | 'external' | 'parent-folder';

export interface SecureVaultSettings {
	masterPasswordHash: string;
	encryptedFolders: EncryptedFolder[];
	autoLockTimeout: number; // minutes
	showInFileExplorer: boolean; // stealth mode
	enableBiometric: boolean;
	lastUnlockTime: number;
	backupEnabled: boolean;
	backupInterval: number; // hours
	encryptionAlgorithm: EncryptionAlgorithm;
	// NEW FEATURES
	enableAccessLog: boolean;
	accessLogs: AccessLogEntry[];
	maxAccessLogs: number;
	enableKeyFile: boolean;
	keyFilePath: string;
	passwordMinLength: number;
	requireStrongPassword: boolean;
	// AUTO-LOCK TIMER
	autoLockEnabled: boolean;
	// ENCRYPTED ATTACHMENTS
	encryptAttachments: boolean;
	attachmentTypes: string[]; // file extensions to encrypt
	// QUICK UNLOCK
	quickUnlockTimeout: number; // minutes
	// PASSWORD SETTINGS
	confirmPassword: boolean; // Confirm password when encrypting
	rememberPassword: boolean; // Remember last used passwords
	rememberPasswordBy: 'vault' | 'folder' | 'file' | 'external' | 'parent-folder'; // Remember by category
	rememberPasswordTimeout: number; // minutes - how long to remember
	autoDecryptWithRememberedPassword: boolean; // Auto-decrypt if password is remembered
	clearPasswordOnLock: boolean; // Clear remembered password when locking
	// IN-PLACE ENCRYPTION
	expandSelectionToWholeLine: boolean; // Expand partial selections to whole line
	searchLimitForMarkers: number; // How far to look for markers
	showEncryptedMarkerInReading: boolean; // Show marker in Reading View
	// SECVAULT EXTENSION
	useSecvaultExtension: boolean; // Rename .md to .secvault when encrypting
}

export interface EncryptedFolder {
	path: string;
	salt: string;
	iv: string;
	isLocked: boolean;
	createdAt: number;
	lastModified: number;
	encryptedFiles: string[];
	// Helper properties for unlock status
	isUnlocked?: boolean; // Opposite of isLocked for convenience
	unlockedAt?: number; // Timestamp when unlocked
}

export interface EncryptedFileMetadata {
	algorithm: EncryptionAlgorithm;
	salt: string;
	iv: string;
	content: string;
	originalExtension?: string;
	originalPath?: string;
}

export const DEFAULT_SETTINGS: SecureVaultSettings = {
	masterPasswordHash: '',
	encryptedFolders: [],
	autoLockTimeout: 5,
	showInFileExplorer: false,
	enableBiometric: false,
	lastUnlockTime: 0,
	backupEnabled: true,
	backupInterval: 24,
	encryptionAlgorithm: 'AES-256-GCM',
	// NEW FEATURES DEFAULTS
	enableAccessLog: true,
	accessLogs: [],
	maxAccessLogs: 100,
	enableKeyFile: false,
	keyFilePath: '',
	passwordMinLength: 8,
	requireStrongPassword: true,
	// AUTO-LOCK TIMER
	autoLockEnabled: true,
	// ENCRYPTED ATTACHMENTS
	encryptAttachments: true,
	attachmentTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'mp4', 'webm', 'mp3', 'wav', 'ogg'],
	// QUICK UNLOCK
	quickUnlockTimeout: 5,
	// PASSWORD SETTINGS DEFAULTS
	confirmPassword: true, // Recommended for security
	rememberPassword: false, // Disabled by default for security
	rememberPasswordBy: 'parent-folder', // Remember by parent folder
	rememberPasswordTimeout: 5, // 5 minutes default
	autoDecryptWithRememberedPassword: true, // Auto-decrypt enabled
	clearPasswordOnLock: true, // Clear password on lock
	// IN-PLACE ENCRYPTION DEFAULTS
	expandSelectionToWholeLine: true, // Expand to whole line
	searchLimitForMarkers: 1000, // Look 1000 chars for markers
	showEncryptedMarkerInReading: true, // Show marker in Reading View
	// SECVAULT EXTENSION DEFAULT
	useSecvaultExtension: true // Use .secvault extension
};
