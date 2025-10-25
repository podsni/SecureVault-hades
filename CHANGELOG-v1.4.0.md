# 🔐 SecureVault-Hades v1.4.0 - CHANGELOG

## 🎉 MAJOR UPDATE: Rebranded to SecureVault-Hades

**Release Date:** October 25, 2025

### 📛 Name Change
- **Old Name:** SecureVault+
- **New Name:** SecureVault-Hades
- Updated all UI, documentation, and branding

---

## 🔐 Enhanced Security

### PBKDF2 Iterations Upgrade
- **Before:** 10,000 iterations
- **Now:** **100,000 iterations** ✨
- **Impact:** 10x stronger protection against brute-force attacks
- **Derivasi kunci:** PBKDF2 (100,000 iterasi, SHA-256)

---

## ✨ NEW FEATURES

### 1. 🔑 Password Settings

Complete password management system with memory and confirmation:

#### Settings:
- ✅ **Confirm password** when encrypting (recommended)
- ✅ **Remember password** - Keep last used passwords in memory
- ✅ **Remember by category:**
  - Vault (same password for all)
  - Folder (per folder)
  - File (per file)
  - External File (key files)
- ✅ **Remember timeout:** 1 min - 2 hours
- ✅ Auto-clear on Obsidian close

#### Commands:
- `🗑️ Forget all remembered passwords`
- `📋 Show remembered passwords info`

#### Technical:
- `PasswordMemoryManager` class
- In-memory only (not saved to disk for security)
- Auto-expire after timeout
- Session-based management

---

### 2. ✍️ In-place Encryption (Selection-based)

**Tidak hanya seluruh file — kamu bisa memilih sebagian teks di note dan hanya mengenkripsi bagian itu saja!**

#### Features:
- 🔒 Encrypt **selected text only**, not entire file
- 📝 Mixed content: public + encrypted sections in one note
- ✍️ Inline encryption markers: ` ```encrypt ` blocks
- 🔄 Auto-expand selection to whole line (optional)
- 🔍 Configurable search limit for markers (default: 1000 chars)
- 👁️ Show/hide encrypted markers in Reading View

#### Inline Encryption Markers:
Encrypted blocks appear as:
````markdown
```encrypt
{
  "id": "enc_1234567890_abc123",
  "encryptedContent": "...",
  "salt": "...",
  "iv": "...",
  "algorithm": "AES-256-GCM",
  "createdAt": 1729900000000
}
```
````

**File tetap berupa Markdown biasa — bisa disinkronkan antar perangkat tanpa format aneh!**

#### Commands:
- `🔒 Encrypt selected text` - Encrypt selection
- `🔓 Decrypt encrypted block at cursor` - Decrypt at cursor
- `📊 Count encrypted blocks in current file` - Count blocks

#### Settings:
- Expand selection to whole line
- Search limit for markers
- Show encrypted marker in Reading View

#### Technical:
- `SelectionEncryptionManager` class
- JSON-based encrypted blocks
- Smart marker detection
- Cursor-based decryption

---

### 3. 📝 .secvault File Extension

**File terenkripsi diubah menjadi `.secvault` extension dengan custom read-only view!**

#### Features:
- 📝 Auto-rename: `file.md` → `file.secvault` when encrypting
- 🔄 Auto-restore: `file.secvault` → `file.md` when decrypting
- 👁️ **Custom read-only view** in Obsidian
- 🔒 Cannot edit until decrypted
- ℹ️ Shows encryption metadata:
  - Algorithm (AES-256 / ChaCha20)
  - Type (text / binary)
  - Version
  - Encrypted date
  - File size
- 📊 Content preview (first 200 chars)
- 🔓 One-click decrypt button
- ⚡ Quick View for temporary access

#### UI (Redesigned & Improved):
- **🎨 Modern card-based layout** - No duplicate information
- **📋 Combined information card:**
  - File details (name, path, size, date)
  - Encryption metadata (algorithm, version, encrypted date)
  - Smart grid layout with hover effects
- **⚡ Action buttons card:**
  - Large, clear buttons with descriptions
  - 🔓 Decrypt & Restore - Permanent decryption
  - 👁️ Quick View - Temporary read-only access
- **🔒 Encrypted content preview:**
  - Limited to 300 characters (clean display)
  - Character count statistics
  - Monospace font for code-like feel
- **💡 Comprehensive help box:**
  - Security features explanation
  - Usage instructions
  - Important warnings
- **✨ Beautiful styling:**
  - Gradient header
  - Rounded corners and shadows
  - Hover animations
  - Color-coded sections
  - Responsive layout
- **⚠️ Error handling:**
  - Warning display if file corrupted
  - Clear error messages

#### Settings:
- Toggle: Use .secvault extension (default: ON)
- Info box with explanation
- Notes about read-only behavior

#### Technical:
- `SecVaultView` class (custom TextFileView)
- Registered extension: `.secvault`
- Custom view type: `SECVAULT_VIEW_TYPE`
- Read-only rendering
- Integration with `FileEncryptionManager`

#### File Format:
`.secvault` files contain JSON with encrypted data:
```json
{
  "version": "1.0",
  "type": "text",
  "algorithm": "AES-256-GCM",
  "salt": "...",
  "iv": "...",
  "content": "...",
  "metadata": {
    "path": "file.secvault",
    "originalPath": "file.md",
    "originalExtension": "md",
    "encryptedAt": 1729900000000,
    "isAttachment": false
  }
}
```

---

## 🎨 UI Improvements

### Settings Tab:
- ✨ New section: **Password Settings**
- ✨ New section: **In-place Encryption**
- ✨ New section: **File Extension (.secvault)**
- 📊 Status indicators for remembered passwords
- 💡 How-to-use guides for each feature
- 🎨 Better organized with clear sections

### Main Menu:
- Updated branding to "SecureVault-Hades"
- Enhanced status displays
- Better command descriptions

### Welcome README:
- Updated encryption info (100,000 iterations)
- New branding
- Enhanced documentation

---

## 🛠️ Technical Changes

### New Files:
- `src/selection-encryption.ts` - Selection-based encryption manager
- `src/password-memory-manager.ts` - Password memory system
- `src/secvault-view.ts` - Custom view for .secvault files

### Modified Files:
- `src/types.ts` - New settings interfaces
- `src/crypto.ts` - PBKDF2 iterations upgrade
- `src/file-encryption.ts` - Support for .secvault extension
- `main.ts` - New managers, commands, and view registration
- `src/settings-tab.ts` - New settings sections
- `manifest.json` - Name and description update
- `package.json` - Package info update

### New Commands:
- `🔒 Encrypt selected text`
- `🔓 Decrypt encrypted block at cursor`
- `📊 Count encrypted blocks in current file`
- `🗑️ Forget all remembered passwords`
- `📋 Show remembered passwords info`

---

## 📊 Feature Comparison

| Feature | v1.3.0 | v1.4.0 (Hades) |
|---------|--------|----------------|
| **Security** | PBKDF2 10k | **PBKDF2 100k** ✨ |
| **Full file encryption** | ✅ | ✅ |
| **Selection encryption** | ❌ | ✅ ✨ |
| **Password confirmation** | ❌ | ✅ ✨ |
| **Password memory** | ❌ | ✅ ✨ |
| **.secvault extension** | ❌ | ✅ ✨ |
| **Custom file view** | ❌ | ✅ ✨ |
| **Inline markers** | ❌ | ✅ ✨ |
| **Mixed content notes** | ❌ | ✅ ✨ |

---

## 🚀 How to Use New Features

### Selection-based Encryption:

1. **Encrypt text:**
   - Select text you want to encrypt
   - Press `Ctrl+P` → "🔒 Encrypt selected text"
   - Enter password
   - Text becomes ` ```encrypt ` block

2. **Decrypt text:**
   - Place cursor inside encrypted block
   - Press `Ctrl+P` → "🔓 Decrypt encrypted block at cursor"
   - Enter password
   - Block replaced with original text

### .secvault Files:

1. **Encrypt file:**
   - Right-click file → "Encrypt file"
   - Enter password
   - File renamed to `.secvault`
   - Opens in custom read-only view

2. **Decrypt file:**
   - Open `.secvault` file
   - Click "🔓 Decrypt File" button
   - Enter password
   - File restored to `.md`

### Password Memory:

1. **Enable:**
   - Settings → Password Settings
   - Toggle "Remember password"
   - Set category and timeout

2. **Use:**
   - Passwords auto-remembered after first use
   - No need to re-enter for timeout period
   - Auto-cleared on Obsidian close

3. **Clear:**
   - Command: "🗑️ Forget all remembered passwords"

---

## ⚠️ Upgrade Notes

- ✅ **Backward compatible** - All existing encrypted files work
- ✅ PBKDF2 iterations applied automatically on next encrypt/decrypt
- ✅ No manual migration needed
- ✅ Old features unchanged
- ⚠️ Remember to backup vault before major updates

---

## 🔧 Installation

1. Copy `main.js`, `manifest.json`, `styles.css` to:
   ```
   <vault>/.obsidian/plugins/securevault-hades/
   ```

2. Reload Obsidian (Ctrl+R / Cmd+R)

3. Enable "SecureVault-Hades" in Settings → Community plugins

---

## 🐛 Bug Fixes

- Fixed TFile import issues
- Fixed password modal integration
- Improved error handling
- Better TypeScript compliance

---

## 📝 Documentation

- Updated README.md
- Enhanced inline code comments
- Better feature descriptions
- Added usage examples

---

## 🎯 Next Version Plans (v1.5.0)

- 🔄 Sync encrypted files across devices
- 📱 Mobile optimization
- 🔐 Hardware key support
- 🌐 Cloud backup integration
- 📊 Advanced analytics

---

## 💬 Feedback & Support

- GitHub Issues: https://github.com/dwirx/SecureVault-beta/issues
- Discussions: https://github.com/dwirx/SecureVault-beta/discussions

---

**Made with ❤️ by Hades Team**

**Version:** 1.4.0
**Date:** October 25, 2025
**Status:** ✅ PRODUCTION READY
