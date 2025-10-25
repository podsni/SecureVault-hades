# 🔐 SecureVault-Hades - Advanced Features Documentation

## 🎉 New Features v1.4.0

### 1. ✅ Guards untuk Prevent Double Encryption

**Problem Solved:** Mencegah enkripsi text yang sudah terenkripsi

#### Features:
- ✅ Deteksi otomatis jika selection mengandung ` ```encrypt ` block
- ✅ Warning message jika mencoba encrypt twice
- ✅ Melindungi data corruption

#### How it Works:
```typescript
// Check before encrypting
if (selection.includes('```encrypt')) {
  new Notice('⚠️ Selection contains already encrypted text! Cannot encrypt twice.');
  return false;
}
```

#### User Experience:
- **Before:** Bisa encrypt text yang sudah encrypted → data rusak ❌
- **After:** Warning ditampilkan, encryption dibatalkan ✅

---

### 2. 🧠 Auto-Decrypt dengan Remembered Password

**Problem Solved:** User tidak perlu input password berulang-ulang

#### Features:
- ✅ Otomatis decrypt jika password diingat
- ✅ No password prompt ketika unlock
- ✅ Fallback ke manual jika password salah
- ✅ Configurable (bisa dimatikan)

#### Settings:
- **Auto-decrypt with remembered password** (default: ON)
  - Automatically decrypt files/folders if password is remembered (no prompt)

#### How it Works:
```typescript
// Try remembered password first
const rememberedPassword = this.passwordMemory.tryGetPasswordSmart(folder.path);

if (rememberedPassword && settings.autoDecryptWithRememberedPassword) {
  // Auto-decrypt without prompt
  await this.vaultManager.decryptFolder(folder, rememberedPassword);
  new Notice('✅ Unlocked automatically with remembered password!');
} else {
  // Ask for password
  new PasswordModal(...).open();
}
```

#### User Experience:
- **Unlock pertama:** Input password → saved for 5 minutes (configurable)
- **Unlock kedua (within timeout):** Otomatis unlock, NO PASSWORD PROMPT! ✅
- **After timeout:** Password expired, harus input lagi

#### Example Flow:
```
1. User unlock folder "Personal" → input password "abc123"
   → Password remembered for 5 minutes

2. User lock folder "Personal" 
   → Password still remembered

3. User unlock folder "Personal" again (< 5 min)
   → AUTO-UNLOCK! No password prompt! ✅

4. Wait 6 minutes...

5. User unlock folder "Personal" again (> 5 min)
   → Password expired, prompt for password
```

---

### 3. 🗑️ Clear Password When Locking

**Problem Solved:** Security - password dihapus saat lock untuk keamanan

#### Features:
- ✅ Forget password otomatis saat lock folder/file
- ✅ Mencegah auto-unlock setelah lock
- ✅ Better security practice
- ✅ Configurable (bisa dimatikan)

#### Settings:
- **Clear password when locking** (default: ON)
  - Forget remembered password when you lock a file or folder

#### How it Works:
```typescript
async lockSpecificFolder(folder: EncryptedFolder) {
  await this.vaultManager.lockFolder(folder, password);
  
  // Clear remembered password if enabled
  if (settings.clearPasswordOnLock) {
    this.passwordMemory.forgetPassword('folder', folder.path);
    this.passwordMemory.forgetPassword('parent-folder', parentFolder);
    new Notice('🗑️ Remembered password cleared');
  }
}
```

#### User Experience:
```
1. Unlock folder → password remembered
2. Lock folder → password CLEARED ✅
3. Unlock again → harus input password lagi (secure!)
```

#### Why This is Important:
- **Security:** Setelah lock, folder protected lagi
- **Predictable:** User expect password cleared after lock
- **Optional:** Bisa dimatikan jika user prefer convenience

---

### 4. 📁 Remember Password by Parent Folder

**Problem Solved:** Lebih fleksibel - password diingat berdasarkan parent folder

#### Features:
- ✅ Password diingat by parent folder path
- ✅ Semua sub-folder di dalam parent menggunakan password yang sama
- ✅ Smart detection otomatis
- ✅ 5 category options

#### Category Options:
1. **Vault** - Same password for entire vault
2. **Folder** - Different password per folder
3. **Parent Folder** - By parent folder path ⭐ (NEW!)
4. **File** - Different password per file
5. **External File** - For key files

#### How it Works:
```typescript
// Get parent folder
const parentFolder = getParentFolder('SecureVault/Personal/Diary/2024.md');
// Result: 'SecureVault/Personal/Diary'

// Remember password for parent folder
passwordMemory.rememberPassword(password, 'parent-folder', parentFolder);

// All files in 'SecureVault/Personal/Diary/' use same password! ✅
```

#### Example:
```
Structure:
SecureVault/
├── Personal/
│   ├── file1.md  ← Password A
│   └── file2.md  ← Password A (same parent!)
└── Work/
    ├── file3.md  ← Password B
    └── file4.md  ← Password B (same parent!)

Settings: Remember by = "Parent Folder"

1. Encrypt Personal/file1.md → password "abc123"
   → Password remembered for "Personal/"

2. Encrypt Personal/file2.md
   → Auto-use "abc123" (same parent folder!) ✅

3. Encrypt Work/file3.md → password "xyz789"
   → Password remembered for "Work/"

4. Encrypt Work/file4.md
   → Auto-use "xyz789" (same parent folder!) ✅
```

#### Benefits:
- ✅ Logical grouping by folder structure
- ✅ Less password prompts
- ✅ Still secure (different password per parent folder)
- ✅ Flexible organization

---

### 5. 📝 Improved Settings Wording

**Problem Solved:** Settings lebih jelas dan mudah dipahami

#### Changes:

**Before:**
```
Remember password by
  - Vault (same password for all)
  - Folder (per folder)
  - File (per file)
  - External File (key files)

Remember password timeout
  - Remember the password for specified minutes or until Obsidian is closed
```

**After:**
```
Remember password by
  - Vault - Same password for entire vault
  - Folder - Different password per folder
  - Parent Folder - By parent folder path ⭐ NEW!
  - File - Different password per file
  - External File - For key files

Remember password timeout
  - Passwords expire after this duration. Cleared automatically when Obsidian closes.
```

#### Additional Settings:
- ✅ **Auto-decrypt with remembered password**
  - Clear description: "Automatically decrypt files/folders if password is remembered (no prompt)"
  
- ✅ **Clear password when locking**
  - Clear description: "Forget remembered password when you lock a file or folder"

---

## 📊 Complete Feature Summary

### Password Management

| Feature | Status | Description |
|---------|--------|-------------|
| Confirm Password | ✅ | Require confirmation when encrypting |
| Remember Password | ✅ | Keep last used passwords in memory |
| Remember by Category | ✅ | 5 options: Vault/Folder/Parent-Folder/File/External |
| Timeout | ✅ | 1 min - 2 hours, auto-clear on close |
| Auto-Decrypt | ✅ NEW! | No prompt if password remembered |
| Clear on Lock | ✅ NEW! | Forget password when locking |
| Parent Folder Mode | ✅ NEW! | Smart grouping by folder structure |

### Selection Encryption

| Feature | Status | Description |
|---------|--------|-------------|
| Double Encryption Guard | ✅ NEW! | Prevent encrypting already encrypted text |
| Inline Markers | ✅ | ` ```encrypt ` blocks |
| Whole Line Expand | ✅ | Auto-expand to full line |
| Search Limit | ✅ | Configurable marker search range |
| Show Marker in Reading | ✅ | Toggle marker visibility |

### File Encryption

| Feature | Status | Description |
|---------|--------|-------------|
| .secvault Extension | ✅ | Renamed files |
| Custom Read-Only View | ✅ | Beautiful preview |
| Metadata Display | ✅ | Algorithm, type, date, size |
| One-Click Decrypt | ✅ | Easy button |
| Quick View | ✅ | Temporary access |

---

## 🚀 Usage Examples

### Example 1: Auto-Decrypt Flow

```
Day 1, 10:00 AM:
✅ Unlock "Personal" folder → input password "secret123"
   → Password remembered for 5 minutes

Day 1, 10:02 AM:
✅ Lock "Personal" folder
   → Password cleared (security!)

Day 1, 10:03 AM:
✅ Unlock "Personal" folder
   → Prompt for password again (password was cleared)

Day 1, 10:04 AM:
✅ Input password "secret123" again
   → Password remembered for 5 minutes

Day 1, 10:05 AM:
✅ Unlock "Personal" folder again
   → AUTO-UNLOCK! No prompt! ✅ (password still valid)
```

### Example 2: Parent Folder Mode

```
Settings: Remember by = "Parent Folder"

Structure:
Projects/
├── ProjectA/
│   ├── notes.md
│   └── todo.md
└── ProjectB/
    ├── ideas.md
    └── tasks.md

Workflow:
1. Encrypt Projects/ProjectA/notes.md → password "password-A"
   → Remembered for "Projects/ProjectA/"

2. Encrypt Projects/ProjectA/todo.md
   → AUTO-USE "password-A"! Same parent! ✅

3. Encrypt Projects/ProjectB/ideas.md → password "password-B"
   → Remembered for "Projects/ProjectB/"

4. Encrypt Projects/ProjectB/tasks.md
   → AUTO-USE "password-B"! Same parent! ✅
```

### Example 3: Double Encryption Guard

```
Before Guard:
1. Select "Hello World"
2. Encrypt → becomes ```encrypt ... ```
3. Select entire text (including ```encrypt)
4. Encrypt again → CORRUPT DATA! ❌

After Guard:
1. Select "Hello World"
2. Encrypt → becomes ```encrypt ... ```
3. Select entire text (including ```encrypt)
4. Encrypt again → 
   ⚠️ "Selection contains already encrypted text! Cannot encrypt twice."
   → SAFE! ✅
```

---

## ⚙️ Recommended Settings

### Maximum Security:
```
✅ Confirm Password: ON
✅ Remember Password: OFF
✅ Clear Password on Lock: ON
✅ Auto-Decrypt: OFF
```

### Balanced (Recommended):
```
✅ Confirm Password: ON
✅ Remember Password: ON
✅ Remember by: Parent Folder
✅ Timeout: 5 minutes
✅ Auto-Decrypt: ON
✅ Clear Password on Lock: ON
```

### Maximum Convenience:
```
✅ Confirm Password: OFF
✅ Remember Password: ON
✅ Remember by: Vault
✅ Timeout: 2 hours
✅ Auto-Decrypt: ON
✅ Clear Password on Lock: OFF
```

---

## 🔧 Technical Details

### Code Changes:

1. **selection-encryption.ts**
   - Added `hasEncryptedBlocks()` method
   - Guard check before encryption

2. **password-memory-manager.ts**
   - Added `getParentFolder()` method
   - Added `rememberPasswordSmart()` method
   - Added `tryGetPasswordSmart()` method
   - Support for 'parent-folder' category

3. **main.ts**
   - Auto-decrypt logic in `unlockSpecificFolder()`
   - Clear password logic in `lockSpecificFolder()`
   - Separated `unlockWithPasswordPrompt()` method

4. **types.ts**
   - Added `autoDecryptWithRememberedPassword` setting
   - Added `clearPasswordOnLock` setting
   - Updated `PasswordCategory` type

5. **settings-tab.ts**
   - Improved wording for all settings
   - Added new toggle options
   - Better descriptions

---

## 📈 Performance Impact

- ✅ **Minimal overhead** - Password check is in-memory
- ✅ **Fast auto-decrypt** - No extra disk reads
- ✅ **No security trade-off** - Passwords cleared on close
- ✅ **Smooth UX** - No noticeable delays

---

## 🐛 Edge Cases Handled

1. **Password changed:** Old remembered password invalid → prompt for new password
2. **Timeout expired:** Password cleared → prompt for password
3. **Obsidian closed:** All passwords cleared automatically
4. **Double encryption:** Prevented with guard check
5. **Parent folder empty:** Falls back to exact path matching
6. **Multiple encrypt attempts:** All prevented

---

**Version:** 1.4.0
**Date:** October 25, 2025
**Status:** ✅ PRODUCTION READY

**Made with ❤️ by Hades Team**
