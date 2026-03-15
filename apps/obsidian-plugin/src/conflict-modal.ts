import { App, Modal } from "obsidian";
import { ApiClient } from "./api-client";
import type { ConflictInfo } from "./types";

export class ConflictModal extends Modal {
  private resolved = false;

  constructor(
    app: App,
    private conflict: ConflictInfo,
    private api: ApiClient,
    private onResolved: (commitSha: string) => void,
    private onNext: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("neurovault-conflict-modal");

    contentEl.createEl("h2", { text: `Conflict: ${this.conflict.path}` });

    const columns = contentEl.createDiv({ cls: "nv-conflict-columns" });

    const leftCol = columns.createDiv({ cls: "nv-conflict-col" });
    leftCol.createEl("h3", { text: "Your version" });
    const leftPre = leftCol.createEl("pre", { cls: "nv-conflict-content" });
    leftPre.setText(this.conflict.clientVersion);

    const rightCol = columns.createDiv({ cls: "nv-conflict-col" });
    rightCol.createEl("h3", { text: "Server version" });
    const rightPre = rightCol.createEl("pre", { cls: "nv-conflict-content" });
    rightPre.setText(this.conflict.serverVersion);

    const buttons = contentEl.createDiv({ cls: "nv-conflict-buttons" });

    const keepMine = buttons.createEl("button", { text: "Keep Mine" });
    keepMine.addEventListener("click", () => this.resolve("client"));

    const keepTheirs = buttons.createEl("button", { text: "Keep Theirs" });
    keepTheirs.addEventListener("click", () => this.resolve("server"));

    const cancelBtn = buttons.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    contentEl.createEl("hr");
    contentEl.createEl("h3", { text: "Or edit manually:" });

    const textarea = contentEl.createEl("textarea", {
      cls: "nv-conflict-editor",
    });
    textarea.value = this.conflict.clientVersion;

    const mergeBtn = contentEl.createEl("button", {
      text: "Save Manual Merge",
      cls: "nv-conflict-merge-btn",
    });
    mergeBtn.addEventListener("click", () =>
      this.resolve("manual_merge", textarea.value)
    );
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) {
      this.onNext();
    }
  }

  private async resolve(
    resolution: string,
    content?: string
  ): Promise<void> {
    try {
      const { conflicts } = await this.api.getConflicts();
      const match = conflicts.find(
        (c) => c.filePath === this.conflict.path && c.resolution === "pending"
      );

      if (match) {
        const result = await this.api.resolveConflict(
          match._id,
          resolution,
          content
        );
        this.resolved = true;
        this.onResolved(result.commitSha);
      }
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    }

    this.close();
    this.onNext();
  }
}
