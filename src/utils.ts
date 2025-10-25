// Password Strength Utilities

export interface PasswordStrength {
	score: number; // 0-4 (weak to very strong)
	label: string;
	color: string;
	suggestions: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrength {
	let score = 0;
	const suggestions: string[] = [];

	// Length check
	if (password.length >= 8) score++;
	else suggestions.push('Use at least 8 characters');
	
	if (password.length >= 12) score++;
	else if (score > 0) suggestions.push('Use 12+ characters for better security');

	// Character variety
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
		score++;
	} else {
		suggestions.push('Mix uppercase and lowercase letters');
	}

	if (/\d/.test(password)) {
		score++;
	} else {
		suggestions.push('Add numbers');
	}

	if (/[^A-Za-z0-9]/.test(password)) {
		score++;
	} else {
		suggestions.push('Add special characters (!@#$%^&*)');
	}

	// Bonus for very long passwords
	if (password.length >= 16) score++;

	// Cap at 4
	score = Math.min(score, 4);

	// Determine label and color
	let label = '';
	let color = '';

	if (score === 0 || score === 1) {
		label = 'Weak';
		color = '#ff4444';
	} else if (score === 2) {
		label = 'Fair';
		color = '#ff9900';
	} else if (score === 3) {
		label = 'Good';
		color = '#99cc00';
	} else {
		label = 'Strong';
		color = '#00cc00';
	}

	return { score, label, color, suggestions };
}

export function isPasswordStrong(password: string): boolean {
	const strength = calculatePasswordStrength(password);
	return strength.score >= 3;
}

export function generateSecurePassword(length: number = 16): string {
	const lowercase = 'abcdefghijklmnopqrstuvwxyz';
	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const numbers = '0123456789';
	const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
	
	const allChars = lowercase + uppercase + numbers + symbols;
	let password = '';

	// Ensure at least one of each type
	password += lowercase[Math.floor(Math.random() * lowercase.length)];
	password += uppercase[Math.floor(Math.random() * uppercase.length)];
	password += numbers[Math.floor(Math.random() * numbers.length)];
	password += symbols[Math.floor(Math.random() * symbols.length)];

	// Fill the rest
	for (let i = password.length; i < length; i++) {
		password += allChars[Math.floor(Math.random() * allChars.length)];
	}

	// Shuffle password
	return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Key File Utilities

export function generateKeyFile(): string {
	// Generate 256-bit (32 bytes) random key
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	
	// Convert to hex string
	return Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

export function validateKeyFile(keyFileContent: string): boolean {
	// Key file should be 64 hex characters (32 bytes)
	return /^[0-9a-fA-F]{64}$/.test(keyFileContent.trim());
}

export function combinePasswordAndKeyFile(password: string, keyFileContent: string): string {
	// Combine password and key file for enhanced security
	return password + ':' + keyFileContent;
}

// Validate password strength with detailed feedback
export function validatePasswordStrength(password: string): {
	level: 'weak' | 'medium' | 'strong';
	feedback: string[];
} {
	const strength = calculatePasswordStrength(password);
	const feedback: string[] = [];
	
	// Map score to level
	let level: 'weak' | 'medium' | 'strong';
	if (strength.score <= 1) {
		level = 'weak';
	} else if (strength.score <= 3) {
		level = 'medium';
	} else {
		level = 'strong';
	}
	
	// Add suggestions as feedback
	if (strength.suggestions.length > 0) {
		feedback.push(...strength.suggestions);
	} else {
		feedback.push('Password strength is good');
	}
	
	return { level, feedback };
}
