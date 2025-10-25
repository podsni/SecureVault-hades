# 🎨 SecureVault-Hades .secvault File View Guide

## 📋 Overview

File dengan ekstensi `.secvault` akan ditampilkan dengan **custom read-only view** yang indah dan informatif di Obsidian.

---

## 🖼️ Tampilan View (.secvault files)

### 1. 🔒 Header Section
**Tampilan:**
```
╔════════════════════════════════════════════════════╗
║     🔒 SecureVault-Hades Encrypted File          ║
╚════════════════════════════════════════════════════╝
```
- **Background:** Gradient blue (interactive accent)
- **Text:** White dengan shadow
- **Style:** Modern card dengan rounded corners

---

### 2. 📋 File Information Card

**Tampilan:**
```
┌─────────────────────────────────────────────────┐
│ 📋 File Information                             │
├─────────────────────────────────────────────────┤
│ 📄 Filename        │  README.secvault           │
│ 📂 Location        │  SecureVault/README.secvault│
│ 📏 File Size       │  2.45 KB                   │
│ 📅 Last Modified   │  10/25/2025, 12:04:32 PM   │
│ 🆔 Extension       │  .secvault                 │
├─────────────────────────────────────────────────┤
│ 🔐 Encryption Details                           │
├─────────────────────────────────────────────────┤
│ 🔑 Algorithm       │  AES-256-GCM               │
│ 📦 Type            │  text                      │
│ 🏷️ Version         │  1.0                       │
│ 🕐 Encrypted At    │  10/25/2025, 11:30:15 AM   │
│ 📝 Original Type   │  .md                       │
└─────────────────────────────────────────────────┘
```

**Features:**
- ✅ **Hover effect** - Row highlights on hover dengan slide animation
- ✅ **Grid layout** - Label kiri, value kanan
- ✅ **Divider** - Dashed line antara file info dan encryption details
- ✅ **Icons** - Emoji untuk setiap field
- ✅ **Clean design** - Rounded corners, subtle shadows

---

### 3. ⚡ Available Actions Card

**Tampilan:**
```
┌─────────────────────────────────────────────────────┐
│ ⚡ Available Actions                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────────────┐  ┌────────────────────┐   │
│  │ 🔓 Decrypt & Restore│  │  👁️ Quick View     │   │
│  └────────────────────┘  └────────────────────┘   │
│  Permanently decrypt     Temporarily view          │
│  this file and convert   content without           │
│  back to original        decrypting (read-only,    │
│  format (.md)            requires password)        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
- ✅ **2 column grid** - Responsive layout
- ✅ **Button colors:**
  - 🔓 Decrypt = Blue (mod-cta)
  - 👁️ Quick View = Orange (mod-warning)
- ✅ **Hover effect** - Buttons lift up on hover
- ✅ **Descriptions** - Clear explanation below each button

---

### 4. 🔒 Encrypted Content Preview Card

**Tampilan:**
```
┌─────────────────────────────────────────────────────┐
│ 🔒 Encrypted Content                               │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐  │
│ │ {"version":"1.0","type":"text","algorithm":  │  │
│ │ "AES-256-GCM","salt":"jrz2H7x8wC2Tlb6eRXlUCg   │  │
│ │ ","iv":"88stTqvA/lLGyYACj4sDdnQ","content":   │  │
│ │ "sCN4TmXjteDh4u/V2LVGUGi+4St5Zp6Lynw4k1hEJ2   │  │
│ │ llCqigstXqasR0jiB45jQhui0jkQpRbk77hBvkK/       │  │
│ │ LMdVOKXk2xX2XoagJi94g0uZ2VIAtyLNG...          │  │
│ └──────────────────────────────────────────────┘  │
│ 📊 Total encrypted characters: 1,761              │
└─────────────────────────────────────────────────────┘
```

**Features:**
- ✅ **Monospace font** - Untuk encrypted text
- ✅ **Scrollable** - Max height 250px dengan auto scroll
- ✅ **Preview limit** - First 300 characters + "..."
- ✅ **Stats bar** - Shows total character count
- ✅ **Code-like styling** - Background dengan code theme

---

### 5. 💡 Help Box

**Tampilan:**
```
╔═════════════════════════════════════════════════════╗
║ 💡 About This File                                  ║
╠═════════════════════════════════════════════════════╣
║ This file is encrypted and protected by            ║
║ SecureVault-Hades.                                  ║
║                                                     ║
║ ┌─────────────────────────────────────────────┐   ║
║ │ 🔐 Security Features:                        │   ║
║ │ • AES-256-GCM or ChaCha20-Poly1305 encryption│   ║
║ │ • PBKDF2 key derivation (100,000 iterations) │   ║
║ │ • Password-protected with optional key file  │   ║
║ └─────────────────────────────────────────────┘   ║
║                                                     ║
║ ┌─────────────────────────────────────────────┐   ║
║ │ 📝 Usage Notes:                              │   ║
║ │ • This file cannot be edited while encrypted │   ║
║ │ • Use 🔓 Decrypt & Restore to permanently    │   ║
║ │   decrypt                                    │   ║
║ │ • Use 👁️ Quick View for temporary read-only │   ║
║ │   access                                     │   ║
║ │ • The file will be renamed back to .md after │   ║
║ │   decryption                                 │   ║
║ └─────────────────────────────────────────────┘   ║
║                                                     ║
║ ┌─────────────────────────────────────────────┐   ║
║ │ ⚠️ Important: Keep your password safe!       │   ║
║ │ Without it, this file cannot be recovered.   │   ║
║ └─────────────────────────────────────────────┘   ║
╚═════════════════════════════════════════════════════╝
```

**Features:**
- ✅ **Blue header** - Attention-grabbing
- ✅ **3 sections:**
  1. Security Features
  2. Usage Notes
  3. Important Warning
- ✅ **Formatted lists** - Bullet points with clear info
- ✅ **Warning highlight** - Red border for important section

---

## 🎯 Key Improvements dari Version Sebelumnya

### ❌ Old Version Problems:
1. **Duplicate info** - File info dan metadata terpisah
2. **Plain text** - No styling, hard to read
3. **Cluttered layout** - Everything in one column
4. **Small buttons** - Hard to click
5. **Too much encrypted text** - Full content shown

### ✅ New Version Solutions:
1. **Combined card** - File info + encryption metadata dalam 1 card
2. **Beautiful styling** - Gradients, shadows, hover effects
3. **Grid layout** - 2 column for actions, organized sections
4. **Large buttons with descriptions** - Clear and easy to use
5. **Limited preview** - Only 300 chars with stats

---

## 📊 Layout Comparison

### Before (Old):
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ File Info           │
│ • File name         │
│ • Path              │
│ • Size              │
│ • Date              │
├─────────────────────┤
│ Metadata            │  ← DUPLICATE!
│ • Algorithm         │
│ • Type              │
│ • Version           │
├─────────────────────┤
│ Encrypted Preview   │
│ (lots of text...)   │  ← TOO MUCH!
├─────────────────────┤
│ [Button] [Button]   │  ← SMALL
├─────────────────────┤
│ Info Text           │
└─────────────────────┘
```

### After (New):
```
┌──────────────────────────────────┐
│ 🔒 Header (Gradient)             │
├──────────────────────────────────┤
│ 📋 File Information              │
│ ┌──────────────┬───────────────┐ │
│ │ Label        │ Value         │ │
│ ├──────────────┼───────────────┤ │
│ │ Filename     │ file.secvault │ │
│ │ Location     │ path/to/file  │ │
│ │ Size         │ 2.45 KB       │ │
│ │ Modified     │ 10/25/2025    │ │
│ └──────────────┴───────────────┘ │
│ ────────────────────────────────  │ ← Divider
│ 🔐 Encryption Details            │
│ ┌──────────────┬───────────────┐ │
│ │ Algorithm    │ AES-256-GCM   │ │
│ │ Type         │ text          │ │
│ │ Version      │ 1.0           │ │
│ │ Encrypted At │ 10/25/2025    │ │
│ └──────────────┴───────────────┘ │
├──────────────────────────────────┤
│ ⚡ Actions                        │
│ ┌────────────┐  ┌──────────────┐│
│ │ 🔓 Decrypt │  │ 👁️ Quick View││
│ │  & Restore │  │              ││
│ └────────────┘  └──────────────┘│
│ Description 1   Description 2   │
├──────────────────────────────────┤
│ 🔒 Preview (300 chars)           │
│ [Encrypted content...]           │
│ 📊 Stats: 1,761 chars            │
├──────────────────────────────────┤
│ 💡 Help Box                      │
│ • Security features              │
│ • Usage notes                    │
│ • Important warning              │
└──────────────────────────────────┘
```

---

## 🎨 Design Philosophy

### 1. **Information Hierarchy**
- **Most important first:** File identification
- **Technical details:** Encryption metadata
- **Actions:** What user can do
- **Preview:** What's inside
- **Help:** Educational info

### 2. **Visual Clarity**
- ✅ **Cards** - Group related info
- ✅ **Icons** - Quick visual identification
- ✅ **Colors** - Semantic meaning (blue = info, red = warning)
- ✅ **Spacing** - Breathing room between sections
- ✅ **Typography** - Size hierarchy for importance

### 3. **User Experience**
- ✅ **No duplicate info** - Each piece of info shown once
- ✅ **Clear actions** - Big buttons with descriptions
- ✅ **Hover feedback** - Interactive elements respond
- ✅ **Responsive** - Adapts to different screen sizes
- ✅ **Accessible** - High contrast, clear labels

---

## 🚀 How It Works

### When User Opens .secvault File:

1. **Obsidian detects** `.secvault` extension
2. **Loads** `SecVaultView` (registered in `main.ts`)
3. **Parses** encrypted JSON data
4. **Renders** beautiful custom view
5. **User sees:**
   - File information
   - Encryption details
   - Action buttons
   - Encrypted content preview
   - Help information

### User Actions:

**🔓 Decrypt & Restore:**
```
1. Click button
2. Enter password (PasswordModal)
3. Plugin decrypts file
4. Renames .secvault → .md
5. Opens decrypted file
6. View automatically closes
```

**👁️ Quick View:**
```
1. Click button
2. Enter password (PasswordModal)
3. Plugin decrypts in memory (temp)
4. Shows content in Notice
5. File stays encrypted (.secvault)
6. Content not saved anywhere
```

---

## 🔧 Technical Details

### CSS Classes:
- `.secvault-view-container` - Main container
- `.secvault-header` - Top header with gradient
- `.secvault-info-card` - File information card
- `.secvault-info-grid` - Grid layout for info rows
- `.secvault-info-row` - Individual info row (with hover)
- `.secvault-actions-card` - Action buttons card
- `.secvault-actions-grid` - 2-column grid for buttons
- `.secvault-preview-card` - Encrypted content preview
- `.secvault-help-box` - Help information box

### Methods:
- `render()` - Main rendering method
- `addInfoRow()` - Helper to add label-value pairs
- `decryptFile()` - Permanently decrypt and restore
- `quickViewFile()` - Temporary view in memory
- `formatBytes()` - Convert bytes to KB/MB/GB
- `addStyles()` - Inject custom CSS

---

## 📝 Example Use Cases

### Use Case 1: Check File Info
```
User: "What encryption does this file use?"
Action: Open .secvault file
Result: See "Algorithm: AES-256-GCM" in info card ✅
```

### Use Case 2: Quick Preview
```
User: "I need to check something quickly"
Action: Click "👁️ Quick View"
Result: Enter password → See content temporarily ✅
```

### Use Case 3: Permanent Decrypt
```
User: "I want to edit this file"
Action: Click "🔓 Decrypt & Restore"
Result: File decrypted → Renamed to .md → Ready to edit ✅
```

### Use Case 4: Learn About File
```
User: "What is this .secvault file?"
Action: Scroll to help box
Result: Read about encryption, features, usage notes ✅
```

---

## ✅ Quality Checklist

- ✅ **No duplicate information**
- ✅ **Clean, modern design**
- ✅ **Responsive layout**
- ✅ **Clear action buttons**
- ✅ **Informative help text**
- ✅ **Beautiful gradients and shadows**
- ✅ **Hover effects for interactivity**
- ✅ **Proper error handling**
- ✅ **Semantic colors**
- ✅ **Professional typography**

---

## 🎯 Future Improvements (Optional)

### Potential Enhancements:
1. **Dark/Light theme toggle** - Separate styles for each
2. **Animation on load** - Fade in effect
3. **Copy encrypted content** - Button to copy to clipboard
4. **Export options** - Save decrypted to different location
5. **File history** - Show previous encryption dates
6. **Security score** - Visual indicator of encryption strength

---

**Version:** 1.4.0  
**Created:** October 25, 2025  
**Status:** ✅ PRODUCTION READY

**Designed with ❤️ by Hades Team**
