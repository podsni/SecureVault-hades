# 📁 SecureVault-Hades - Project Structure

## 🏗️ Architecture Overview

SecureVault-Hades menggunakan **modular architecture** untuk maintainability dan scalability yang lebih baik.

---

## 📂 Folder Structure

```
SecureVault-beta/
├── src/                          # Source code
│   ├── ui/                       # UI Components (NEW!)
│   │   ├── index.ts              # Barrel export untuk semua UI
│   │   └── preview-modal.ts      # Preview modal untuk Quick View
│   │
│   ├── managers/                 # Business Logic Managers
│   │   ├── vault-manager.ts      # Vault encryption/decryption
│   │   ├── file-encryption.ts    # File encryption manager
│   │   ├── selection-encryption.ts # Selection/inline encryption
│   │   ├── password-memory-manager.ts # Password memory system
│   │   ├── master-password-manager.ts # Master password handling
│   │   └── auto-lock.ts          # Auto-lock functionality
│   │
│   ├── services/                 # Core Services
│   │   └── crypto.ts             # Cryptography service (AES, ChaCha20)
│   │
│   ├── views/                    # Custom Views
│   │   ├── secvault-view.ts      # .secvault file viewer
│   │   └── sidebar-view.ts       # Sidebar panel
│   │
│   ├── modals/                   # Modal Components (Legacy, akan dipindah)
│   │   ├── modals.ts             # Password, Create Folder, Access Log
│   │   ├── setup-master-password-modal.ts
│   │   ├── password-change-modal.ts
│   │   └── file-picker-modal.ts
│   │
│   ├── utils/                    # Utilities
│   │   ├── utils.ts              # Helper functions
│   │   ├── context-menu.ts       # Context menu handlers
│   │   ├── file-system-picker.ts # File picker for key files
│   │   └── access-logger.ts      # Access logging
│   │
│   ├── core/                     # Core Types & Settings
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── settings-tab.ts       # Settings UI
│   │
│   └── main.ts                   # Plugin entry point
│
├── docs/                         # Documentation (NEW!)
│   ├── FEATURES-DOCUMENTATION.md
│   ├── QUICK-VIEW-GUIDE.md
│   ├── SECVAULT-VIEW-GUIDE.md
│   └── PROJECT-STRUCTURE.md      # This file
│
├── config/                       # Configuration
│   ├── manifest.json             # Plugin metadata
│   ├── package.json              # NPM dependencies
│   ├── tsconfig.json             # TypeScript config
│   ├── esbuild.config.mjs        # Build configuration
│   └── versions.json             # Version history
│
├── styles/                       # Styles (akan dipindah)
│   ├── styles.css                # Main styles
│   └── styles-old.css            # Old styles (backup)
│
├── scripts/                      # Build scripts
│   └── version-bump.mjs          # Version bumping script
│
├── .github/                      # GitHub specific
│   └── copilot-instructions.md   # AI agent instructions
│
├── README.md                     # Main documentation
├── CHANGELOG-v1.4.0.md           # Version changelog
├── LICENSE                       # MIT License
└── AGENTS.md                     # Agent guidelines
```

---

## 🎯 Module Responsibilities

### 1. 🎨 UI Layer (`src/ui/`)

**Purpose:** Semua komponen visual dan modal dialogs

**Files:**
- `index.ts` - Barrel export (centralized imports)
- `preview-modal.ts` - Preview modal untuk Quick View

**Future:**
- `password-modal.ts` - Password input modal
- `confirm-modal.ts` - Confirmation dialogs
- `file-picker-modal.ts` - File picker UI

**Dependencies:**
- Obsidian Modal, App
- Core managers (for data)
- Utils (for helpers)

---

### 2. 🧠 Managers Layer (`src/managers/` - currently at `src/`)

**Purpose:** Business logic dan state management

**Files:**
- `vault-manager.ts` - Folder-level encryption/decryption
- `file-encryption.ts` - Individual file operations
- `selection-encryption.ts` - Inline/selection encryption
- `password-memory-manager.ts` - Password caching system
- `master-password-manager.ts` - Master password handling
- `auto-lock.ts` - Auto-lock timer management

**Responsibilities:**
- Coordinate between services dan UI
- Handle business rules
- Manage state transitions
- Error handling dan validation

**Dependencies:**
- Services (crypto)
- Utils (helpers)
- Types (interfaces)

---

### 3. 🔧 Services Layer (`src/services/` - currently `src/crypto.ts`)

**Purpose:** Core functionality tanpa business logic

**Files:**
- `crypto.ts` - Encryption/decryption algorithms

**Future:**
- `storage.ts` - Data persistence
- `sync.ts` - Sync coordination
- `backup.ts` - Backup management

**Responsibilities:**
- Pure functions
- Algorithm implementations
- No UI dependencies
- Reusable across managers

**Dependencies:**
- External libraries (crypto-js)
- Types only

---

### 4. 👁️ Views Layer (`src/views/` - currently at `src/`)

**Purpose:** Custom Obsidian views

**Files:**
- `secvault-view.ts` - .secvault file viewer
- `sidebar-view.ts` - Plugin sidebar

**Responsibilities:**
- Extend Obsidian view classes
- Render custom UI
- Handle view lifecycle
- Integrate with managers

**Dependencies:**
- Obsidian View classes
- Managers (for data)
- UI components (modals)

---

### 5. 🛠️ Utils Layer (`src/utils/` - currently at `src/`)

**Purpose:** Helper functions dan shared utilities

**Files:**
- `utils.ts` - General helpers (password strength, etc)
- `context-menu.ts` - Context menu handlers
- `file-system-picker.ts` - File picker utilities
- `access-logger.ts` - Logging utilities

**Responsibilities:**
- Pure helper functions
- Shared constants
- No state management
- Reusable everywhere

**Dependencies:**
- Minimal (Obsidian types only)

---

### 6. 🏛️ Core Layer (`src/core/` - currently at `src/`)

**Purpose:** Type definitions dan configuration

**Files:**
- `types.ts` - All TypeScript interfaces
- `settings-tab.ts` - Settings UI

**Responsibilities:**
- Type definitions
- Interface contracts
- Settings schema
- Constants

**Dependencies:**
- None (base layer)

---

### 7. 🚪 Entry Point (`src/main.ts`)

**Purpose:** Plugin initialization dan orchestration

**Responsibilities:**
- Load/unload lifecycle
- Register commands
- Initialize managers
- Setup event listeners
- Coordinate all layers

**Dependencies:**
- All managers
- All views
- Settings

**Code Organization:**
```typescript
export default class SecureVaultPlugin extends Plugin {
  // 1. Properties
  settings: Settings;
  managers: { vault, file, selection, ... };
  views: { secvault, sidebar };
  
  // 2. Lifecycle
  async onload() { ... }
  onunload() { ... }
  
  // 3. Commands
  registerCommands() { ... }
  
  // 4. Events
  registerEvents() { ... }
  
  // 5. Helpers
  private setupUI() { ... }
  private initializeManagers() { ... }
}
```

---

## 🔄 Data Flow

### Example: Encrypt File Flow

```
User Action (UI)
    ↓
Context Menu → main.ts
    ↓
main.ts.encryptFile()
    ↓
FileEncryptionManager.encryptFile()
    ↓
PasswordModal (get password)
    ↓
CryptoService.encrypt() ← PasswordMemoryManager
    ↓
Obsidian Vault API (write file)
    ↓
SecVaultView (render .secvault)
    ↓
User sees encrypted file ✅
```

### Example: Quick View Flow

```
User Action
    ↓
SecVaultView.quickViewFile()
    ↓
PasswordModal (get password)
    ↓
FileEncryptionManager.quickUnlockFile()
    ↓
CryptoService.decrypt()
    ↓
PreviewModal.open(decryptedContent)
    ↓
MarkdownRenderer.renderMarkdown()
    ↓
User sees formatted content ✅
    ↓
PreviewModal.close()
    ↓
Content cleared from memory ✅
```

---

## 📦 Dependencies

### External Dependencies (package.json):
```json
{
  "dependencies": {
    "crypto-js": "^4.2.0"  // Encryption algorithms
  },
  "devDependencies": {
    "obsidian": "latest",   // Obsidian API types
    "typescript": "^5.0.0", // TypeScript compiler
    "esbuild": "^0.19.0",   // Bundler
    "@types/node": "^20.0.0" // Node types
  }
}
```

### Internal Dependencies:

**UI Layer depends on:**
- Managers (for actions)
- Types (for interfaces)
- Obsidian (for Modal, App)

**Managers depend on:**
- Services (for core functions)
- Utils (for helpers)
- Types (for interfaces)

**Services depend on:**
- External libs (crypto-js)
- Types (for interfaces)

**No circular dependencies!** ✅

---

## 🚀 Migration Plan

### Current State (v1.4.0):
```
src/
├── All files in root ❌
├── ui/ (NEW! ✅)
│   ├── index.ts
│   └── preview-modal.ts
└── (other files scattered)
```

### Target State (v1.5.0):
```
src/
├── ui/          ✅ DONE
├── managers/    🚧 TODO
├── services/    🚧 TODO
├── views/       🚧 TODO
├── utils/       🚧 TODO
├── core/        🚧 TODO
└── main.ts      ✅ KEEP
```

### Migration Steps:

**Phase 1: UI (DONE ✅)**
- [x] Create `src/ui/` folder
- [x] Create `preview-modal.ts`
- [x] Create barrel export `index.ts`

**Phase 2: Services (TODO)**
- [ ] Create `src/services/` folder
- [ ] Move `crypto.ts` → `services/crypto.ts`
- [ ] Update imports

**Phase 3: Managers (TODO)**
- [ ] Create `src/managers/` folder
- [ ] Move all manager files
- [ ] Update imports
- [ ] Test functionality

**Phase 4: Views (TODO)**
- [ ] Create `src/views/` folder
- [ ] Move `secvault-view.ts`, `sidebar-view.ts`
- [ ] Update imports

**Phase 5: Utils & Core (TODO)**
- [ ] Create `src/utils/` and `src/core/`
- [ ] Move respective files
- [ ] Final cleanup

---

## 🧪 Testing Structure (Future)

```
tests/
├── unit/
│   ├── crypto.test.ts
│   ├── password-manager.test.ts
│   └── utils.test.ts
├── integration/
│   ├── encryption-flow.test.ts
│   └── quick-view.test.ts
└── e2e/
    ├── full-encryption.test.ts
    └── folder-encryption.test.ts
```

---

## 📝 Code Style Guidelines

### File Naming:
- **kebab-case** untuk files: `password-memory-manager.ts`
- **PascalCase** untuk classes: `PasswordMemoryManager`
- **camelCase** untuk functions: `encryptFile()`

### Folder Naming:
- **lowercase** untuk folders: `ui/`, `managers/`
- **plural** jika contains multiple: `utils/`, `services/`

### Import Order:
```typescript
// 1. External imports
import { App, Modal } from 'obsidian';
import CryptoJS from 'crypto-js';

// 2. Internal absolute imports
import { SecureVaultSettings } from '@/types';
import { CryptoService } from '@/services';

// 3. Relative imports
import { PreviewModal } from './preview-modal';
```

### Export Pattern:
```typescript
// Barrel exports (index.ts)
export { ComponentA } from './component-a';
export { ComponentB } from './component-b';

// Direct exports
export class MyClass { ... }
export const MY_CONSTANT = 'value';
```

---

## 🔍 Finding Code

### By Feature:
- **Encryption:** `src/services/crypto.ts`, `src/managers/file-encryption.ts`
- **UI:** `src/ui/`, `src/modals/`
- **Settings:** `src/core/settings-tab.ts`, `src/core/types.ts`
- **Views:** `src/views/secvault-view.ts`
- **Password:** `src/managers/password-memory-manager.ts`

### By Functionality:
- **Commands:** `src/main.ts` (registerCommands)
- **Context Menu:** `src/utils/context-menu.ts`
- **Auto-lock:** `src/managers/auto-lock.ts`
- **Logging:** `src/utils/access-logger.ts`

---

## 🎯 Best Practices

### 1. **Single Responsibility**
- Each file has ONE clear purpose
- Classes do ONE thing well
- Functions perform ONE task

### 2. **Dependency Injection**
```typescript
// Good ✅
class Manager {
  constructor(private crypto: CryptoService) {}
}

// Bad ❌
class Manager {
  crypto = new CryptoService(); // hardcoded
}
```

### 3. **Interface Segregation**
```typescript
// Good ✅
interface Encryptable {
  encrypt(password: string): Promise<void>;
}

// Bad ❌
interface Everything {
  encrypt(): void;
  decrypt(): void;
  save(): void;
  load(): void;
  // ... too many methods
}
```

### 4. **Error Handling**
```typescript
// Good ✅
try {
  await manager.encrypt(file);
} catch (error) {
  console.error('Encryption failed:', error);
  new Notice(`❌ ${error.message}`);
}

// Bad ❌
manager.encrypt(file); // no error handling
```

---

## 📚 Documentation

### File Headers:
```typescript
/**
 * ModuleName - Brief Description
 * 
 * Longer description of what this module does,
 * its responsibilities, and how it fits into
 * the overall architecture.
 * 
 * @example
 * const manager = new Manager();
 * await manager.doSomething();
 */
```

### Function Comments:
```typescript
/**
 * Encrypt a file with the given password
 * 
 * @param file - The file to encrypt
 * @param password - Encryption password
 * @param keyFile - Optional key file content
 * @returns true if successful, false otherwise
 * 
 * @throws {Error} If file is already encrypted
 * @throws {Error} If password is too weak
 */
async encryptFile(
  file: TFile, 
  password: string, 
  keyFile?: string
): Promise<boolean>
```

---

## 🚧 Roadmap

### v1.5.0 - Full Modularity
- ✅ Complete folder reorganization
- ✅ Separate all modals into `ui/`
- ✅ Move managers to `managers/`
- ✅ Services layer complete
- ✅ Utils organized
- ✅ Add barrel exports everywhere

### v1.6.0 - Testing
- ✅ Unit tests for all services
- ✅ Integration tests
- ✅ E2E tests
- ✅ CI/CD pipeline

### v2.0.0 - Architecture 2.0
- ✅ Plugin API for extensions
- ✅ Event-driven architecture
- ✅ State management (Redux-like)
- ✅ Performance monitoring

---

**Version:** 1.4.0  
**Last Updated:** October 25, 2025  
**Status:** 🚧 WORK IN PROGRESS

**Made with ❤️ by Hades Team**
