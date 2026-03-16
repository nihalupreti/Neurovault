import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type NeurovaultPlugin from "./main";
import { ApiClient } from "./api-client";

export class NeurovaultSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: NeurovaultPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Neurovault Sync" });

    new Setting(containerEl)
      .setName("Server URL")
      .setDesc("Neurovault server address")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:3001")
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            this.plugin.settings.serverUrl = value;
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.vaultId) {
      new Setting(containerEl)
        .setName("Vault ID")
        .setDesc(this.plugin.settings.vaultId)
        .addButton((btn) =>
          btn.setButtonText("Unlink").onClick(async () => {
            this.plugin.settings.vaultId = "";
            this.plugin.settings.vaultName = "";
            this.plugin.settings.baseCommit = "";
            await this.plugin.saveSettings();
            this.display();
          })
        );
    } else {
      new Setting(containerEl)
        .setName("Register Vault")
        .setDesc("Connect this vault to Neurovault server")
        .addText((text) =>
          text.setPlaceholder("Vault name").setValue(this.plugin.settings.vaultName)
            .onChange((v) => { this.plugin.settings.vaultName = v; })
        )
        .addButton((btn) =>
          btn.setButtonText("Register").onClick(async () => {
            const name =
              this.plugin.settings.vaultName || this.app.vault.getName();
            const api = new ApiClient(
              this.plugin.settings.serverUrl,
              ""
            );
            try {
              const vault = await api.registerVault(
                name,
                this.plugin.settings.include,
                this.plugin.settings.exclude
              );
              this.plugin.settings.vaultId = vault._id;
              this.plugin.settings.vaultName = vault.name;
              await this.plugin.saveSettings();
              new Notice("Vault registered successfully!");
              this.display();
            } catch (err: any) {
              new Notice(`Registration failed: ${err.message}`);
            }
          })
        );
    }

    new Setting(containerEl)
      .setName("Include patterns")
      .setDesc("Glob patterns for files to sync (comma-separated)")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.include.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.include = value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exclude patterns")
      .setDesc("Glob patterns for files to exclude (comma-separated)")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.exclude.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.exclude = value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto sync")
      .setDesc("Automatically sync changes")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSync)
          .onChange(async (value) => {
            this.plugin.settings.autoSync = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Debounce (ms)")
      .setDesc("Wait time before syncing after changes")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.debounceMs))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!isNaN(n) && n >= 100) {
              this.plugin.settings.debounceMs = n;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
