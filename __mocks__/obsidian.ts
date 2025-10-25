// __mocks__/obsidian.ts
export class Plugin {
  constructor(app: any, manifest: any) {}
}

export class Modal {
  constructor(app: any) {}
  open() {}
  close() {}
}

export class Notice {}

export class App {}

export class PluginSettingTab {}

export class TextFileView {}

export class ItemView {}

export class Setting {
  constructor(containerEl: any) {}
  setName(name: string) {
    return this;
  }
  setDesc(desc: string) {
    return this;
  }
  addButton(callback: (btn: any) => any) {
    return this;
  }
  setClass(css: string) {
    return this;
  }
}
