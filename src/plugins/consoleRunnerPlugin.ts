import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { IConsoleTracker } from '@jupyterlab/console';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import { EditorView } from '@codemirror/view';
import { MYST_RUN_EVENT, findCodeBlocks, kernelLanguageEffect } from '../gutterRunner';
import type { IMystRunEvent } from '../gutterRunner';
import { IMystConsoleManager } from '../tokens';
import { MystConsoleManager } from '../console';

const PLUGIN_ID = 'jupyterlab-myst-console:runner';
const RUN_SELECTED_COMMAND = 'jupyterlab-myst-console:run-selected-blocks';
const RUN_CELL_AND_ADVANCE_COMMAND = 'jupyterlab-myst-console:run-cell-and-advance';

/**
 * Bridges gutter run-button clicks (CustomEvent on the editor DOM) with
 * JupyterLab's console services, and adds a keybinding to run all code blocks
 * that overlap with the current selection(s).
 */
export const consoleRunnerPlugin: JupyterFrontEndPlugin<IMystConsoleManager> = {
  id: PLUGIN_ID,
  description: 'Executes MyST code blocks in a linked console when run buttons are clicked',
  autoStart: true,
  requires: [IEditorTracker, IConsoleTracker],
  optional: [ISettingRegistry],
  provides: IMystConsoleManager,

  activate(
    app: JupyterFrontEnd,
    editorTracker: IEditorTracker,
    consoleTracker: IConsoleTracker,
    settingRegistry: ISettingRegistry | null
  ): IMystConsoleManager {
    let defaultKernelName = 'python3';

    if (settingRegistry) {
      settingRegistry
        .load(PLUGIN_ID)
        .then(settings => {
          const updateSettings = () => {
            const kernelName = settings.get('defaultKernelName').composite as string;
            if (kernelName) defaultKernelName = kernelName;
          };
          settings.changed.connect(updateSettings);
          updateSettings();
        })
        .catch(reason => {
          console.warn('[jupyterlab-myst-console] Failed to load settings:', reason);
        });
    }

    const consoleManager = new MystConsoleManager({
      app,
      consoleTracker,
      editorTracker,
      get defaultKernelName() {
        return defaultKernelName;
      }
    });

    // -----------------------------------------------------------------------
    // Gutter button listener (CustomEvent, DOM-based)
    // -----------------------------------------------------------------------
    const attachListener = (widget: IDocumentWidget<FileEditor>) => {
      const filePath = widget.context.path;
      if (!filePath.endsWith('.md')) return;

      widget.node.addEventListener(MYST_RUN_EVENT, (event: Event) => {
        const { blockInfo } = (event as CustomEvent<IMystRunEvent>).detail;
        void runBlock(consoleManager, filePath, blockInfo.content, blockInfo.language, editorTracker);
      });
    };

    editorTracker.widgetAdded.connect((_tracker, widget) => {
      attachListener(widget);
    });

    editorTracker.forEach(widget => {
      attachListener(widget);
    });

    // -----------------------------------------------------------------------
    // Run-selected command: run all code blocks overlapping the selection(s)
    // -----------------------------------------------------------------------
    app.commands.addCommand(RUN_SELECTED_COMMAND, {
      label: 'Run Selected Code Blocks',
      caption: 'Run all fenced code blocks that overlap the current selection',
      isEnabled: () => {
        const widget = editorTracker.currentWidget;
        return !!widget && widget.context.path.endsWith('.md');
      },
      execute: async () => {
        const widget = editorTracker.currentWidget;
        if (!widget || !widget.context.path.endsWith('.md')) return;

        const filePath = widget.context.path;
        const codeEditor = widget.content.editor;

        // Get the CM6 EditorView to access the syntax tree
        const cmView = (codeEditor as any).editor as EditorView | undefined;
        if (!cmView) {
          console.warn('[jupyterlab-myst-console] Could not access EditorView');
          return;
        }

        // Collect all selection ranges as {from, to} document offsets.
        // getSelections() returns IRange[] with {start, end} as {line, column}.
        const selections = codeEditor.getSelections();
        const selectionRanges = selections.map(sel => ({
          from: codeEditor.getOffsetAt(sel.start),
          to: codeEditor.getOffsetAt(sel.end)
        }));

        const isCollapsedCursor = selectionRanges.every(r => r.from === r.to);

        if (isCollapsedCursor) {
          // No selection: run the current line and advance cursor one line down,
          // but only when the cursor is inside a fenced code block.
          const cursorPos = selectionRanges[0].from;
          const allBlocksForCursor = findCodeBlocks(cmView.state);
          const containingBlock = allBlocksForCursor.find(
            b => b.contentFrom <= cursorPos && b.contentTo >= cursorPos
          );
          if (!containingBlock) return;

          const line = cmView.state.doc.lineAt(cursorPos);
          const nextPos = Math.min(line.to + 1, cmView.state.doc.length);

          cmView.dispatch({ selection: { anchor: nextPos } });

          if (line.text.trim()) {
            await runBlock(consoleManager, filePath, line.text, containingBlock.language, editorTracker);
          }

          // Re-focus the editor after runBlock may have activated the console panel.
          cmView.focus();
          return;
        }

        // Has selection: for each selection range, extract the portion of any
        // overlapping code block that falls within the selection, and run only that.
        const allBlocks = findCodeBlocks(cmView.state);
        const doc = cmView.state.doc;

        for (const sel of selectionRanges) {
          const seen = new Set<number>();
          for (const block of allBlocks) {
            if (seen.has(block.from)) continue;
            if (block.contentFrom > sel.to || block.contentTo < sel.from) continue;
            seen.add(block.from);

            // Clamp the selection to the block's content bounds (excludes fence lines).
            const clampedFrom = Math.max(sel.from, block.contentFrom);
            const clampedTo = Math.min(sel.to, block.contentTo);
            const selectedCode = doc.sliceString(clampedFrom, clampedTo);

            if (selectedCode.trim()) {
              await runBlock(consoleManager, filePath, selectedCode, block.language, editorTracker);
            }
          }
        }
      }
    });

    // -----------------------------------------------------------------------
    // Run-cell-and-advance command: run entire block, jump to next block
    // -----------------------------------------------------------------------
    app.commands.addCommand(RUN_CELL_AND_ADVANCE_COMMAND, {
      label: 'Run Cell and Advance',
      caption: 'Run the entire code block under the cursor and move to the next block',
      isEnabled: () => {
        const widget = editorTracker.currentWidget;
        return !!widget && widget.context.path.endsWith('.md');
      },
      execute: async () => {
        const widget = editorTracker.currentWidget;
        if (!widget || !widget.context.path.endsWith('.md')) return;

        const filePath = widget.context.path;
        const codeEditor = widget.content.editor;
        const cmView = (codeEditor as any).editor as EditorView | undefined;
        if (!cmView) return;

        const cursorPos = cmView.state.selection.main.from;
        const allBlocks = findCodeBlocks(cmView.state);
        const blockIndex = allBlocks.findIndex(
          b => b.contentFrom <= cursorPos && b.contentTo >= cursorPos
        );
        if (blockIndex === -1) return;

        const block = allBlocks[blockIndex];
        const nextBlock = allBlocks[blockIndex + 1];

        // Advance cursor to the start of the next block's content, or just
        // past the current block's closing fence if there is no next block.
        const nextPos = nextBlock
          ? nextBlock.contentFrom
          : Math.min(block.to + 1, cmView.state.doc.length);

        cmView.dispatch({ selection: { anchor: nextPos } });

        if (block.content.trim()) {
          await runBlock(consoleManager, filePath, block.content, block.language, editorTracker);
        }

        cmView.focus();
      }
    });

    app.commands.addKeyBinding({
      command: RUN_CELL_AND_ADVANCE_COMMAND,
      keys: ['Shift Enter'],
      selector: '.jp-FileEditor'
    });

    // Keybinding: Cmd+Enter on Mac / Ctrl+Enter on Windows & Linux,
    // scoped to the file editor so it doesn't conflict with notebooks.
    //
    // `Accel` is JupyterLab/Lumino's platform-aware modifier:
    //   Mac  → Cmd  (Meta)
    //   Win/Linux → Ctrl
    app.commands.addKeyBinding({
      command: RUN_SELECTED_COMMAND,
      keys: ['Accel Enter'],
      selector: '.jp-FileEditor'
    });

    console.log('[jupyterlab-myst-console] Console runner plugin activated');
    return consoleManager;
  }
};

async function runBlock(
  consoleManager: IMystConsoleManager,
  filePath: string,
  code: string,
  language: string,
  editorTracker: IEditorTracker
): Promise<void> {
  try {
    const panel = await consoleManager.getConsole(filePath);
    await panel.sessionContext.ready;

    // Sync the kernel language into the editor's CM6 state so buttons
    // reflect the correct enabled/disabled state after the kernel is ready.
    void syncKernelLanguage(filePath, editorTracker, panel);

    // Re-sync whenever the user switches kernels
    panel.sessionContext.kernelChanged.connect(() => {
      void panel.sessionContext.ready.then(() => {
        void syncKernelLanguage(filePath, editorTracker, panel);
      });
    });

    await panel.console.inject(code);
    panel.activate();
  } catch (err) {
    console.error(
      `[jupyterlab-myst-console] Failed to run ${language} block from ${filePath}:`,
      err
    );
  }
}

/**
 * Reads the kernel language from the running kernel's info reply and
 * dispatches a kernelLanguageEffect into the linked editor's CM6 state
 * so the gutter buttons update their enabled/disabled appearance.
 *
 * Uses `kernel.info` (the IInfoReply promise) which contains
 * `language_info.name` — the canonical language string for the kernel.
 */
async function syncKernelLanguage(
  filePath: string,
  editorTracker: IEditorTracker,
  panel: import('@jupyterlab/console').ConsolePanel
): Promise<void> {
  const kernel = panel.sessionContext.session?.kernel;
  if (!kernel) return;

  let language = '';
  try {
    const info = await kernel.info;
    language = info.language_info.name.toLowerCase();
  } catch {
    return;
  }

  const editorWidget = editorTracker.find(w => w.context.path === filePath);
  if (!editorWidget) return;

  const cmView = (editorWidget.content.editor as any)?.editor as
    | EditorView
    | undefined;
  if (!cmView) return;

  cmView.dispatch({ effects: kernelLanguageEffect.of(language) });
}
