import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { IConsoleTracker } from '@jupyterlab/console';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { mystIcon } from '../icons';

const COMMAND_ID = 'jupyterlab-myst-console:new-myst-file';

/**
 * Adds a "MyST File" launcher card that opens a new .md file in the text
 * editor on the left with a linked console split to the right.
 */
export const launcherPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-myst-console:launcher',
  description: 'Adds a MyST File launcher item with split editor + console layout',
  autoStart: true,
  requires: [IDocumentManager, IEditorTracker, IConsoleTracker],
  optional: [ILauncher],

  activate(
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    _editorTracker: IEditorTracker,
    _consoleTracker: IConsoleTracker,
    launcher: ILauncher | null
  ): void {
    app.commands.addCommand(COMMAND_ID, {
      label: 'MyST Markdown File',
      caption: 'Create a new MyST Markdown file with a linked console',
      icon: mystIcon,
      execute: async (args: { cwd?: string } = {}) => {
        const cwd = args.cwd ?? '';

        // 1. Create a new untitled .md file in the current directory
        const model = await docManager.newUntitled({
          path: cwd,
          type: 'file',
          ext: '.md'
        });

        // 2. Open the file in the text editor (left side, gets focus)
        const editorWidget = docManager.open(model.path, 'Editor', undefined, {
          mode: 'tab-after',
          activate: true
        });

        if (!editorWidget) {
          console.error('[jupyterlab-myst-console] Failed to open editor for', model.path);
          return;
        }

        // 3. Open a linked console split to the right of the editor.
        //    Pass the editor widget's id as `ref` so the shell places the
        //    console panel immediately to its right.
        await app.commands.execute('console:create', {
          path: model.path,
          kernelPreference: { name: 'python3', shouldStart: true, canStart: true },
          ref: editorWidget.id,
          insertMode: 'split-right',
          activate: false  // keep focus in the editor
        });
      }
    });

    if (launcher) {
      launcher.add({
        command: COMMAND_ID,
        category: 'Other',
        rank: 1
      });
    }

    console.log('[jupyterlab-myst-console] Launcher plugin activated');
  }
};
