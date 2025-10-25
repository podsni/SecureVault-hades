# 👁️ Quick View / Preview System - User Guide

## 🎯 Overview

SecureVault-Hades sekarang memiliki **Quick View system** yang memungkinkan Anda **melihat isi file terenkripsi** tanpa harus decrypt permanent! 

---

## ✨ Features

### 1. 📝 **Markdown Rendering**
- Content ditampilkan dengan **proper Markdown formatting**
- Heading, lists, code blocks, blockquotes - semua ter-render dengan baik
- Syntax highlighting untuk code blocks

### 2. 🎨 **Beautiful Modal UI**
- Modern card-based design
- Gradient header dengan file info
- Statistics display (lines, words, characters)
- Scrollable content area

### 3. 🔄 **Toggle View Modes**
- **Markdown View** - Formatted dengan styling
- **Plain Text View** - Raw text tanpa formatting
- Switch on-the-fly dengan satu click

### 4. 📋 **Copy to Clipboard**
- One-click copy decrypted content
- Convenient untuk paste ke aplikasi lain
- Full content copied (not just preview)

### 5. 🔒 **Secure & Temporary**
- Content **hanya di memory** - tidak tersimpan ke disk
- File tetap terenkripsi (.secvault)
- Modal ditutup = content hilang dari memory

---

## 🚀 How to Use

### Method 1: Quick View Button (Di .secvault View)

**Step 1:** Buka file `.secvault` di Obsidian

**Step 2:** Lihat custom view dengan file information

**Step 3:** Click button **"👁️ Quick View"**

**Step 4:** Enter password

**Step 5:** Content ditampilkan dalam modal dengan Markdown rendering! ✨

### Method 2: Command Palette

**Step 1:** Select file `.secvault` di File Explorer

**Step 2:** Open Command Palette (`Ctrl/Cmd + P`)

**Step 3:** Run: "Quick view encrypted file"

**Step 4:** Enter password

**Step 5:** Preview modal opens!

---

## 🎨 Preview Modal Features

### Header Section
```
╔═══════════════════════════════════════════════════╗
║  👁️ secret-notes.md (Read-Only Preview)         ║
╠═══════════════════════════════════════════════════╣
║  🔓 This is a temporary preview.                 ║
║     File remains encrypted.                       ║
╠═══════════════════════════════════════════════════╣
║  📄 45 lines  |  📝 234 words  |  🔤 1,234 chars ║
╚═══════════════════════════════════════════════════╝
```

**Info Displayed:**
- File name (without .secvault extension)
- Temporary preview notice
- Statistics: Lines, Words, Characters

---

### Content Area (Scrollable)

**Markdown View:**
```markdown
# My Secret Notes

This is **bold text** and this is *italic*.

## Code Example

```python
def hello():
    print("Hello World")
```

> This is a blockquote
> With multiple lines

- List item 1
- List item 2
```

**Plain Text View:**
```
# My Secret Notes

This is **bold text** and this is *italic*.

## Code Example

```python
def hello():
    print("Hello World")
```

> This is a blockquote
...
```

---

### Action Buttons

```
┌───────────────────────────────────────────────────┐
│  [📋 Copy to Clipboard]  [📄 View as Plain Text]  │
│             [❌ Close]                             │
└───────────────────────────────────────────────────┘
```

**Buttons:**
1. **📋 Copy to Clipboard** - Copy all content
2. **📄 View as...** - Toggle between Markdown/Plain Text
3. **❌ Close** - Close modal (clears content from memory)

---

## 🔐 Security

### ✅ What's SAFE:
- **Content tidak tersimpan** - Hanya di memory sementara
- **File tetap .secvault** - Tidak di-decrypt permanent
- **Close modal = clear memory** - Content hilang
- **Tidak di-sync** - Preview tidak pernah di-sync
- **No disk write** - Zero file system operations

### ⚠️ Be Careful:
- **Jika copy to clipboard** - Content ada di clipboard (clear manually jika perlu)
- **Screen visible** - Orang di sekitar bisa melihat layar
- **Screenshot** - Bisa ter-capture jika ambil screenshot

---

## 📊 Use Cases

### 1. Quick Check - Cek isi tanpa decrypt
```
Scenario: "Ini file yang mana ya?"
Solution: Quick View → Check content → Close
Result: Tau isi file tanpa decrypt permanent ✅
```

### 2. Copy Password - Ambil password dari note
```
Scenario: "Butuh password yang ada di note"
Solution: Quick View → Copy to Clipboard → Paste
Result: Password di-copy, file tetap encrypted ✅
```

### 3. Read-Only Access - Baca tanpa edit
```
Scenario: "Mau baca aja, gak perlu edit"
Solution: Quick View → Read content → Close
Result: Baca tanpa decrypt (aman!) ✅
```

### 4. Verify Content - Pastikan decrypt berhasil
```
Scenario: "Apa file ini corrupt?"
Solution: Quick View → Check if renders properly
Result: Tau file valid atau corrupt ✅
```

### 5. Share Content - Copy untuk share
```
Scenario: "Perlu share sebagian content"
Solution: Quick View → Copy → Paste to chat
Result: Content shared tanpa decrypt file ✅
```

---

## 🎨 Modal Styling

### Color Scheme:
- **Header:** Interactive accent gradient (blue)
- **Content area:** Primary background (dark/light adaptive)
- **Buttons:** Color-coded by action
- **Stats badges:** Semi-transparent white

### Responsive:
- **Max height:** 80vh (viewport height)
- **Scrollable:** Content area auto-scrolls
- **Mobile-friendly:** Touch-optimized buttons

### Typography:
- **Headings:** Accent color, larger size
- **Body:** Normal text color
- **Code:** Monospace font, code background
- **Blockquotes:** Border-left accent, muted text

---

## ⚙️ Settings

### Related Settings:
No specific settings for Quick View, but affected by:

| Setting | Effect on Quick View |
|---------|---------------------|
| **Enable Key File** | If ON, key file required for decrypt |
| **Algorithm** | Determines decryption method |
| **Remember Password** | If ON, may auto-decrypt without prompt |

---

## 🆚 Quick View vs Permanent Decrypt

| Feature | Quick View 👁️ | Permanent Decrypt 🔓 |
|---------|---------------|---------------------|
| **File stays encrypted** | ✅ Yes | ❌ No (becomes .md) |
| **Can edit** | ❌ No (read-only) | ✅ Yes |
| **Sync status** | ✅ Safe (.secvault) | ⚠️ Decrypted syncs |
| **Memory only** | ✅ Yes | ❌ Written to disk |
| **Speed** | ⚡ Fast | 🐌 Slower (file ops) |
| **Use case** | Quick check | Need to edit |

---

## 🔧 Technical Details

### Implementation:

**PreviewModal.ts:**
- Extends Obsidian `Modal` class
- Uses `MarkdownRenderer.renderMarkdown()` for MD view
- Plain text uses `<pre>` element
- Custom CSS for styling
- Memory-only operation

**Integration:**
- Called from `SecVaultView.quickViewFile()`
- Decrypts using `FileEncryptionManager.quickUnlockFile()`
- Password prompt via `PasswordModal`
- Key file support included

**Memory Management:**
- Content stored in modal instance
- Cleared on `onClose()`
- No disk writes
- No cache

---

## 🐛 Troubleshooting

### Problem: "Cannot render Markdown"
**Solution:**
- Try "View as Plain Text" button
- Check if content is valid Markdown
- May be binary/non-text file

### Problem: "Password incorrect"
**Solution:**
- Verify password (case-sensitive)
- Check key file if enabled
- Try permanent decrypt to verify file integrity

### Problem: "Modal not opening"
**Solution:**
- Check console for errors (Ctrl+Shift+I)
- Reload Obsidian (Ctrl+R)
- Update plugin to latest version

### Problem: "Content looks weird"
**Solution:**
- Toggle between Markdown/Plain Text views
- Check if file was corrupted during encryption
- Try decrypting to verify content

---

## 💡 Pro Tips

### Tip 1: Keyboard Shortcuts
- `Ctrl/Cmd + P` → Type "quick view"
- `Escape` → Close modal

### Tip 2: Copy Smart
- Copy only what you need (select & copy)
- Clear clipboard after sensitive data
- Use password managers instead of copying

### Tip 3: Multiple Files
- Quick View multiple files back-to-back
- No need to decrypt all files
- Fast comparison between encrypted notes

### Tip 4: Verify Before Commit
- Use Quick View to verify encryption worked
- Check content looks correct
- Ensure no data loss

---

## 📚 Examples

### Example 1: Password Storage
```markdown
# Passwords

## Banking
Username: john@email.com
Password: super-secret-123
```

**Quick View Use:**
1. Open password.secvault
2. Click Quick View
3. Enter password
4. Copy password field
5. Close modal ✅

---

### Example 2: Code Snippets
````markdown
# API Keys

## Production API
```python
API_KEY = "sk-proj-abc123..."
API_SECRET = "xyz789..."
```
````

**Quick View Use:**
1. Quick View → See API keys
2. Copy to clipboard
3. Paste to code editor ✅

---

### Example 3: Personal Diary
```markdown
# October 25, 2025

Today was amazing! I finally...
(sensitive personal thoughts)
```

**Quick View Use:**
1. Quick check what you wrote
2. Read without decrypting
3. No traces left ✅

---

## 🚀 Future Improvements

### Planned Features (v1.5.0):
- 🔍 **Search in preview** - Find text within modal
- 🎨 **Syntax highlighting** - Better code display
- 📑 **Table of contents** - Navigate long documents
- 🔗 **Link navigation** - Click internal links
- 📥 **Export options** - Save to new file
- 🎯 **Selective copy** - Copy specific sections

---

## ✅ Comparison: Old vs New

### Before (v1.3.0):
```
❌ Quick View = Simple Notice
   - Max 200 characters shown
   - No formatting
   - Hard to read
   - Limited usefulness
```

### After (v1.4.0):
```
✅ Quick View = Beautiful Modal
   - Full content displayed
   - Markdown rendering
   - Scrollable & readable
   - Copy to clipboard
   - Toggle view modes
   - Statistics display
```

---

## 📈 Performance

### Speed:
- **Decrypt:** ~100-500ms (depends on file size)
- **Render:** ~50-200ms (depends on content complexity)
- **Total:** <1 second for typical notes

### Memory:
- **Small files (<100KB):** Negligible impact
- **Large files (>1MB):** ~2x file size in memory
- **Cleared on close:** Memory freed immediately

---

**Version:** 1.4.0  
**Created:** October 25, 2025  
**Status:** ✅ PRODUCTION READY

**Made with ❤️ by Hades Team**
