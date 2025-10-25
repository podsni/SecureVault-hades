// main.test.ts
import SecureVaultPlugin from '../main';
import { App, Modal } from 'obsidian';
import { VaultManager } from '../src/vault-manager';

jest.mock('obsidian', () => ({
  ...jest.requireActual('obsidian'),
  Plugin: class {
    app: any;
    constructor(app: any, manifest: any) {
      this.app = app;
    }
    loadData = jest.fn().mockResolvedValue({});
    saveData = jest.fn().mockResolvedValue(undefined);
    addStatusBarItem = jest.fn(() => ({
      setText: jest.fn(),
      addClass: jest.fn(),
      addEventListener: jest.fn(),
    }));
  },
  Modal: class {
    app: any;
    contentEl: any;
    constructor(app: any) {
      this.app = app;
      this.contentEl = {
        empty: jest.fn(),
        addClass: jest.fn(),
        createEl: jest.fn(() => ({
          createEl: jest.fn(),
        })),
        createDiv: jest.fn(() => ({
          createEl: jest.fn(),
        })),
      };
    }
    open = jest.fn();
    close = jest.fn();
  },
  Notice: jest.fn(),
}));

jest.mock('../src/vault-manager', () => ({
  VaultManager: class {
    detectFolderLockStatus = jest.fn().mockResolvedValue({ isLocked: true, algorithm: 'AES-256-GCM' });
  },
}));

describe('SecureVaultPlugin', () => {
  let app: App;
  let plugin: SecureVaultPlugin;

  beforeEach(() => {
    app = {} as App;
    plugin = new SecureVaultPlugin(app, { id: 'test-plugin', name: 'Test Plugin', version: '1.0.0', minAppVersion: "0.0.1", description: "", author: "", authorUrl: "", isDesktopOnly: false, });
    plugin.vaultManager = new VaultManager(app, () => plugin.settings);
    plugin.settings = {
      encryptedFolders: [{ path: 'test', isLocked: true, encryptedFiles: [] }],
      encryptionAlgorithm: 'AES-256-GCM',
    } as any;
  });

  it('should cache folder lock status', async () => {
    const QuickMenuModal = require('../main').QuickMenuModal;
    const modal = new QuickMenuModal(app, plugin);
    await modal.onOpen();
    await modal.onOpen();
    expect(plugin.vaultManager.detectFolderLockStatus).toHaveBeenCalledTimes(plugin.settings.encryptedFolders.length);
  });
});
