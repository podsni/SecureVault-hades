# 🔐 SecureVault-Hades

<div align="center">

**Advanced File & Text Encryption Plugin for Obsidian**

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/dwirx/SecureVault-beta)
[![Obsidian](https://img.shields.io/badge/obsidian-0.15.0+-purple.svg)](https://obsidian.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Protect your sensitive notes with military-grade encryption!**

</div>

---

## 🌟 Features

### 🔐 **Military-Grade Encryption**
- **AES-256-GCM** (Standard, Fast)
- **ChaCha20-Poly1305** (Modern, Secure)
- **PBKDF2** key derivation with **100,000 iterations**
- Password-based or Key file protection

### ✍️ **Selection-Based Encryption** ⭐ NEW!
- Encrypt **only selected text**, not entire file
- **Mixed content notes** - Public + encrypted sections
- **Inline markers** - ```` ```encrypt ```` blocks
- Seamless Markdown integration

### 📝 **`.secvault` File Extension** ⭐ NEW!
- Custom read-only view for encrypted files
- Beautiful UI with metadata display
- One-click decrypt or quick view
- Cannot edit until decrypted

### 🔑 **Smart Password Management** ⭐ NEW!
- Remember passwords by category (Vault/Folder/File)
- Auto-expire after configurable timeout
- Confirm password when encrypting
- Session-based (cleared on close)

### 📁 **Folder & File Encryption**
- Encrypt/decrypt entire folders
- Individual file encryption
- Recursive folder processing
- Preserve folder structure

### 🎨 **Beautiful UI**
- Modern card-based design
- Gradient headers and shadows
- Hover animations
- Responsive layout
- Color-coded sections

---

## 📸 Screenshots

### .secvault File View
```
╔═══════════════════════════════════════════════════════╗
║       🔒 SecureVault-Hades Encrypted File            ║
╚═══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│ 📋 File Information                                  │
├──────────────────────────────────────────────────────┤
│ 📄 Filename        │  secret-notes.secvault          │
│ 📂 Location        │  Personal/secret-notes.secvault │
│ 📏 File Size       │  3.24 KB                        │
│ 📅 Last Modified   │  10/25/2025, 12:04:32 PM        │
│ 🆔 Extension       │  .secvault                      │
├──────────────────────────────────────────────────────┤
│ 🔐 Encryption Details                                │
├──────────────────────────────────────────────────────┤
│ 🔑 Algorithm       │  AES-256-GCM                    │
│ 📦 Type            │  text                           │
│ 🏷️ Version         │  1.0                            │
│ 🕐 Encrypted At    │  10/25/2025, 11:30:15 AM        │
│ 📝 Original Type   │  .md                            │
└──────────────────────────────────────────────────────┘

⚡ Actions:
  [🔓 Decrypt & Restore]  [👁️ Quick View]

🔒 Encrypted Content (Preview):
{"version":"1.0","type":"text","algorithm":"AES-256-GCM"...}
```

### Selection Encryption Example
```markdown
# My Notes

This is public text that anyone can read.

```encrypt
{
  "id": "enc_1729900000_abc123",
  "encryptedContent": "U2FsdGVkX1...",
  "algorithm": "AES-256-GCM"
}
```

More public text here.
```

---

## 🚀 Installation

### Method 1: Manual Installation

1. Download latest release:
   - `main.js`
   - `manifest.json`
   - `styles.css`

2. Create plugin folder:
   ```
   <YourVault>/.obsidian/plugins/securevault-hades/
   ```

3. Copy files to plugin folder

4. Reload Obsidian:
   - Windows/Linux: `Ctrl + R`
   - Mac: `Cmd + R`

5. Enable plugin:
   - Settings → Community plugins → Enable "SecureVault-Hades"

### Method 2: From Source

```bash
# Clone repository
git clone https://github.com/dwirx/SecureVault-beta.git
cd SecureVault-beta

# Install dependencies
npm install

# Build plugin
npm run build

# Copy to your vault
cp main.js manifest.json styles.css <YourVault>/.obsidian/plugins/securevault-hades/
```

---

## 📖 Usage Guide

### 1️⃣ Encrypt Selected Text

**Step 1:** Select text you want to encrypt

**Step 2:** Open Command Palette (`Ctrl/Cmd + P`)

**Step 3:** Run command: `🔒 Encrypt selected text`

**Step 4:** Enter password (and confirm if enabled)

**Result:** Selected text becomes encrypted block:
````markdown
```encrypt
{
  "id": "enc_1729900000_abc123",
  "encryptedContent": "...",
  "salt": "...",
  "iv": "...",
  "algorithm": "AES-256-GCM"
}
```
````

---

### 2️⃣ Decrypt Selected Text

**Step 1:** Place cursor inside encrypted block

**Step 2:** Open Command Palette (`Ctrl/Cmd + P`)

**Step 3:** Run command: `🔓 Decrypt encrypted block at cursor`

**Step 4:** Enter password

**Result:** Encrypted block replaced with original text

---

### 3️⃣ Encrypt Entire File

**Method A: Context Menu**
- Right-click file in File Explorer
- Select "Encrypt file"
- Enter password

**Method B: Command**
- Open file
- Run command: `Encrypt current file`
- Enter password

**Result:** File renamed to `.secvault` with custom view

---

### 4️⃣ Decrypt .secvault File

**Method 1: Button**
- Open `.secvault` file
- Click `🔓 Decrypt & Restore` button
- Enter password

**Method 2: Quick View (Temporary)**
- Open `.secvault` file
- Click `👁️ Quick View` button
- Enter password
- View content without decrypting

**Result:** File restored to `.md` extension

---

### 5️⃣ Encrypt/Decrypt Folders

**Encrypt:**
- Right-click folder
- Select "Encrypt folder"
- Enter password

**Decrypt:**
- Right-click folder
- Select "Decrypt folder"
- Enter password

**Result:** All files in folder processed recursively

---

## ⚙️ Settings

### 🔐 Password Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Confirm password** | Require confirmation when encrypting | ON |
| **Remember password** | Keep passwords in memory | ON |
| **Remember by** | Category (Vault/Folder/Parent-Folder/File/External) | Folder |
| **Timeout** | Auto-clear after duration | 5 minutes |
| **Auto-decrypt** | Decrypt automatically with remembered password | ON |
| **Clear on lock** | Forget password when locking | ON |

### ✍️ In-place Encryption

| Setting | Description | Default |
|---------|-------------|---------|
| **Expand selection** | Auto-expand to whole line | ON |
| **Search limit** | Max characters to search for markers | 1000 |
| **Show markers** | Display encrypted markers in Reading View | OFF |

### 📝 File Extension

| Setting | Description | Default |
|---------|-------------|---------|
| **Use .secvault** | Rename encrypted files to .secvault | ON |

### 🔒 Encryption

| Setting | Description | Default |
|---------|-------------|---------|
| **Algorithm** | AES-256-GCM or ChaCha20-Poly1305 | AES-256-GCM |
| **Key file** | Use external key file | OFF |

---

## 🔧 Commands

### Encryption
- `🔒 Encrypt selected text` - Encrypt selection
- `🔒 Encrypt current file` - Encrypt active file
- `🔒 Encrypt folder` - Encrypt entire folder

### Decryption
- `🔓 Decrypt encrypted block at cursor` - Decrypt at cursor
- `🔓 Decrypt current file` - Decrypt active file
- `🔓 Decrypt folder` - Decrypt entire folder

### Password Management
- `🗑️ Forget all remembered passwords` - Clear memory
- `📋 Show remembered passwords info` - View status

### Utilities
- `📊 Count encrypted blocks in current file` - Count blocks
- `🔄 Force lock all folders` - Lock everything

---

## 🔐 Security Features

### Encryption Algorithms

**AES-256-GCM (Default)**
- Industry standard
- Fast and efficient
- Authenticated encryption
- NIST approved

**ChaCha20-Poly1305 (Modern)**
- Modern alternative to AES
- Better on mobile devices
- Resistant to timing attacks
- Google/Cloudflare standard

### Key Derivation

**PBKDF2**
- **100,000 iterations** (10x stronger than before!)
- SHA-256 hash function
- Random salt per file
- Memory-hard algorithm

### Security Guarantees

✅ **Password never stored** - Only in memory during session
✅ **Random IV per encryption** - Prevents pattern analysis
✅ **Authenticated encryption** - Detects tampering
✅ **Forward secrecy** - Each file independently encrypted
✅ **No telemetry** - 100% offline operation

---

## 💡 Use Cases

### 1. Personal Diary
```markdown
# Daily Journal

Public thoughts...

```encrypt
{Private feelings and secrets}
```

More public thoughts...
```

### 2. Work Notes
```
Projects/
├── public-notes.md       ← Regular file
├── confidential.secvault ← Encrypted
└── team-meeting.md       ← Regular file
```

### 3. Password Storage
```markdown
# Password Manager

## Banking
```encrypt
Username: john@email.com
Password: super-secret-123
Account: 1234-5678-9012
```
```

### 4. Research Notes
```
Research/
├── Literature/           ← Public
├── Data/                 ← Encrypted folder
│   ├── raw.secvault
│   └── analysis.secvault
└── Draft/                ← Public
```

---

## ❓ FAQ

### Q: Can I sync encrypted files?
**A:** Yes! `.secvault` files are just text files and sync like any other file.

### Q: What happens if I forget password?
**A:** **Files cannot be recovered** without the password. Keep it safe!

### Q: Can I use on mobile?
**A:** Currently desktop only. Mobile support planned for v1.5.0.

### Q: Is it safe to store passwords in notes?
**A:** Yes, if encrypted. Use ```` ```encrypt ```` blocks for sensitive data.

### Q: Can others decrypt my files?
**A:** Only with the correct password and key file (if used).

### Q: Does it work with Obsidian Sync?
**A:** Yes! Encrypted files sync normally.

### Q: Can I change password?
**A:** Decrypt then encrypt again with new password.

### Q: What if plugin breaks?
**A:** Encrypted data is in standard JSON format. Can be manually decrypted with crypto libraries.

---

## 🐛 Troubleshooting

### Problem: "Invalid password or corrupted file"
**Solution:**
1. Check password (case-sensitive)
2. Verify key file path if enabled
3. Try Quick View for diagnostic info
4. Check file integrity (should be valid JSON)

### Problem: Cannot see .secvault files
**Solution:**
1. Reload Obsidian (`Ctrl/Cmd + R`)
2. Check plugin is enabled
3. Update to latest version

### Problem: Encrypted blocks not recognized
**Solution:**
1. Check marker format: ```` ```encrypt ````
2. Increase search limit in settings
3. Ensure valid JSON inside block

### Problem: Password not remembered
**Solution:**
1. Check "Remember password" is ON
2. Verify timeout hasn't expired
3. Check category settings match usage

---

## 🔄 Version History

### v1.4.0 (Current) - October 25, 2025
- ✨ Rebranded to SecureVault-Hades
- ✨ Selection-based encryption
- ✨ .secvault file extension
- ✨ Smart password management
- 🔒 PBKDF2 upgraded to 100,000 iterations
- 🎨 Beautiful new UI
- 📚 Comprehensive documentation

### v1.3.0
- Folder encryption
- Multiple algorithms
- Key file support
- Auto-lock feature

### v1.2.0
- ChaCha20-Poly1305 algorithm
- Improved UI
- Bug fixes

### v1.1.0
- Initial release
- AES-256-GCM encryption
- Basic file encryption

---

## 🛣️ Roadmap

### v1.5.0 (Planned)
- 📱 Mobile support (iOS/Android)
- 🔄 Advanced sync features
- 🔐 Hardware key support (YubiKey)
- 📊 Encryption analytics
- 🌐 Cloud backup integration

### v1.6.0 (Future)
- 👥 Multi-user encryption
- 🔗 Shared encrypted notes
- 📈 Performance improvements
- 🎨 Theme customization

---

## 🤝 Contributing

Contributions welcome!

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing`
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/dwirx/SecureVault-beta/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dwirx/SecureVault-beta/discussions)
- **Email:** support@securevault-hades.dev

---

## ⚠️ Disclaimer

This plugin provides encryption for your Obsidian notes. While we use industry-standard encryption algorithms, we cannot guarantee absolute security. **Always:**

- ✅ Keep regular backups
- ✅ Remember your passwords
- ✅ Test decryption before relying on it
- ✅ Use strong, unique passwords
- ❌ Do NOT store only copy of critical data

**Use at your own risk. The developers are not responsible for data loss.**

---

## 🙏 Credits

- **Encryption:** [crypto-js](https://github.com/brix/crypto-js)
- **Framework:** [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- **Icons:** Emoji from various sources

---

## ⭐ Show Your Support

If you find this plugin useful:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 📢 Share with others

---

<div align="center">

**Made with ❤️ by Hades Team**

**Version 1.4.0** | **October 25, 2025**

[![GitHub](https://img.shields.io/badge/GitHub-dwirx/SecureVault--beta-blue?logo=github)](https://github.com/dwirx/SecureVault-beta)

</div>
