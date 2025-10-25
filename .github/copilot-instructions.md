# Obsidian Sample Plugin - AI Agent Guide

This is an **Obsidian community plugin** built with TypeScript and bundled via esbuild. Currently a minimal boilerplate demonstrating core Obsidian API patterns.

## Critical Build & Development Flow

### Setup & Development
```bash
npm install                    # Install dependencies (Node 16+)
npm run dev                    # Watch mode: main.ts → main.js with inline sourcemap
npm run build                  # Production: tsc type-check + esbuild minify
```

**Key esbuild config** (`esbuild.config.mjs`): Bundles `main.ts` → `main.js`, marks obsidian/electron/@codemirror/@lezer as external (provided by Obsidian runtime). No dynamic imports allowed.

**Never commit**: `main.js`, `node_modules/`, or any build artifacts.

### Testing Workflow
1. Build the plugin (`npm run dev` or `npm run build`)
2. Copy `main.js`, `manifest.json`, `styles.css` to `<YourVault>/.obsidian/plugins/<plugin-id>/`
3. Reload Obsidian (Ctrl+R / Cmd+R)
4. Enable in **Settings → Community plugins**
5. Use DevTools (Ctrl+Shift+I) for debugging console output

## Architecture & Plugin Lifecycle

### Entry Point Pattern (`main.ts`)
The current `main.ts` (~130 lines) is a **sample showing all major API patterns**. In production:
- Keep `main.ts` minimal (~50 lines): lifecycle + command registration only
- Split into modules when expanding: `src/settings.ts`, `src/commands/`, `src/ui/`, `src/utils/`

**Core lifecycle example**:
```typescript
export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    // 1. Load persisted settings (merge with defaults)
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    
    // 2. Register commands (IDs must be stable post-release!)
    this.addCommand({ id: 'stable-cmd-id', name: 'Do Something', callback: () => {...} });
    
    // 3. Add UI (ribbon, status bar, settings tab)
    this.addRibbonIcon('dice', 'Tooltip', (evt) => { new Notice('Hello!'); });
    this.addSettingTab(new MySettingTab(this.app, this));
    
    // 4. Register cleanup-aware listeners (auto-removed on unload)
    this.registerDomEvent(document, 'click', (evt) => console.log('click'));
    this.registerInterval(window.setInterval(() => console.log('tick'), 5*60*1000));
  }

  onunload() {} // Cleanup happens automatically via register* helpers
}
```

### Critical Patterns

**Settings persistence** (uses Obsidian's data.json in plugin folder):
```typescript
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings); // Serializes to JSON
}
```

**Command types**:
- `callback`: Global command always available
- `editorCallback: (editor, view) => {}`: Only when markdown editor active
- `checkCallback: (checking) => boolean`: Conditional availability (check phase vs execution phase)

**Cleanup requirement**: Use `this.registerDomEvent()`, `this.registerEvent()`, `this.registerInterval()` instead of raw `addEventListener`/`setInterval` to prevent memory leaks on plugin unload.

## Release & Versioning

### Version Bump Process
1. **Manual**: Update `manifest.json` version (SemVer x.y.z), update `minAppVersion` if needed
2. **Automated**: Run `npm version patch|minor|major` after manually setting `minAppVersion`
   - Uses `version-bump.mjs` script to sync `manifest.json` and `versions.json`
   - Adds git commit automatically

### Release Workflow
1. `npm run build` (production minified build)
2. Update `versions.json`: `{"1.0.1": "0.15.0"}` (plugin version → min Obsidian version)
3. Create GitHub release with tag **exactly matching** `manifest.json` version (no `v` prefix)
4. Attach **3 files as assets**: `manifest.json`, `main.js`, `styles.css`
5. First release only: Submit PR to https://github.com/obsidianmd/obsidian-releases

**Critical**: Never rename command IDs after release (breaks user keybindings). Never change plugin `id` in manifest.

## Code Organization (Recommended for Growth)

Current structure is flat (boilerplate). When expanding beyond 200 lines:

```
main.ts              # Minimal: Plugin class + lifecycle only
manifest.json        # Plugin metadata (id, version, minAppVersion)
styles.css           # Optional UI styling
esbuild.config.mjs   # Build configuration
tsconfig.json        # TypeScript: strict mode, ES6 target, ESNext modules

src/                 # Create when splitting code
  settings.ts        # Interface + DEFAULT_SETTINGS
  commands/          # Command implementations
    command1.ts
    command2.ts
  ui/                # Modals, views, setting tabs
    modal.ts
    settingTab.ts
  utils/             # Helpers, constants
    helpers.ts
```

## Security & Compliance (Obsidian Policy)

- **Default to offline**: No network calls without explicit user-facing need and clear disclosure
- **No telemetry**: Any analytics require opt-in + README documentation
- **Never execute remote code**: No `eval()`, no fetching/executing scripts from URLs
- **Vault access only**: Never touch files outside `.obsidian/` or vault root
- **Bundle all deps**: No runtime `require()` of external packages
- **Mobile compatibility**: If targeting mobile (iOS/Android), avoid Node/Electron APIs, set `isDesktopOnly: false`

## Common Tasks Reference

**Add ribbon icon**:
```typescript
this.addRibbonIcon('dice', 'Click me', (evt: MouseEvent) => {
  new Notice('Clicked!');
});
```

**Add status bar** (desktop only):
```typescript
const statusBarItemEl = this.addStatusBarItem();
statusBarItemEl.setText('My Status');
```

**Editor command** (only active when markdown file open):
```typescript
this.addCommand({
  id: 'transform-selection',
  name: 'Transform Selection',
  editorCallback: (editor: Editor, view: MarkdownView) => {
    const selection = editor.getSelection();
    editor.replaceSelection(selection.toUpperCase());
  }
});
```

**Conditional command** (check before showing in palette):
```typescript
this.addCommand({
  id: 'markdown-only-action',
  name: 'Action (Markdown Only)',
  checkCallback: (checking: boolean) => {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      if (!checking) {
        // Execute action
        new Notice('Action executed!');
      }
      return true; // Show command
    }
    return false; // Hide command
  }
});
```

**Settings tab**:
```typescript
class MySettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('My Setting')
      .setDesc('Description here')
      .addText(text => text
        .setPlaceholder('Enter value')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

## TypeScript Configuration

**tsconfig.json** enforces:
- `noImplicitAny: true`, `strictNullChecks: true` (strict type checking)
- `target: "ES6"`, `module: "ESNext"` (modern syntax, esbuild handles downlevel)
- `inlineSourceMap: true` (for debugging in dev mode)

**esbuild** externals (never bundled): `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`, all Node builtins

## References

- **Obsidian API docs**: https://docs.obsidian.md
- **Sample plugin repo**: https://github.com/obsidianmd/obsidian-sample-plugin
- **Plugin guidelines**: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- **Developer policies**: https://docs.obsidian.md/Developer+policies
