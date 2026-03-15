import { Signal } from '@lumino/signaling';
import type { ISignal } from '@lumino/signaling';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';
import type { IEditorTracker } from '@jupyterlab/fileeditor';
import { IMystConsoleManager } from '../tokens';

/**
 * Manages the association between MyST/Markdown files and their
 * corresponding console panels. Handles deduplication to prevent
 * multiple consoles being created for the same file.
 */
export class MystConsoleManager implements IMystConsoleManager {
  constructor(options: {
    app: JupyterFrontEnd;
    consoleTracker: IConsoleTracker;
    editorTracker: IEditorTracker;
    defaultKernelName?: string;
  }) {
    this._app = options.app;
    this._consoleTracker = options.consoleTracker;
    this._editorTracker = options.editorTracker;
    this._defaultKernelName = options.defaultKernelName ?? 'python3';
  }

  get consoleCreated(): ISignal<IMystConsoleManager, ConsolePanel> {
    return this._consoleCreated;
  }

  /**
   * Get an existing console for the given file path, or create a new one.
   * Multiple concurrent calls for the same path return the same Promise
   * to prevent duplicate consoles.
   */
  async getConsole(filePath: string): Promise<ConsolePanel> {
    const inFlight = this._inFlight.get(filePath);
    if (inFlight) return inFlight;

    const existing = this._findExistingConsole(filePath);
    if (existing) return existing;

    const promise = this._createConsole(filePath);
    this._inFlight.set(filePath, promise);

    try {
      return await promise;
    } finally {
      this._inFlight.delete(filePath);
    }
  }

  private _findExistingConsole(filePath: string): ConsolePanel | null {
    return (
      this._consoleTracker.find(
        panel => panel.sessionContext.path === filePath
      ) ?? null
    );
  }

  private async _createConsole(filePath: string): Promise<ConsolePanel> {
    // Find the open editor widget for this file so we can split relative to it.
    const editorWidget = this._editorTracker.find(
      w => w.context.path === filePath
    );
    const ref = editorWidget?.id ?? null;

    await this._app.commands.execute('console:create', {
      path: filePath,
      kernelPreference: {
        name: this._defaultKernelName,
        shouldStart: true,
        canStart: true
      },
      // Place the console to the right of the editor and keep editor focus.
      ref,
      insertMode: 'split-right',
      activate: false
    });

    const panel = this._findExistingConsole(filePath);
    if (!panel) {
      throw new Error(
        `Failed to create console for ${filePath}: panel not found in tracker after creation`
      );
    }

    this._consoleCreated.emit(panel);
    return panel;
  }

  private readonly _app: JupyterFrontEnd;
  private readonly _consoleTracker: IConsoleTracker;
  private readonly _editorTracker: IEditorTracker;
  private readonly _defaultKernelName: string;
  private readonly _inFlight = new Map<string, Promise<ConsolePanel>>();
  private readonly _consoleCreated = new Signal<IMystConsoleManager, ConsolePanel>(this);
}
