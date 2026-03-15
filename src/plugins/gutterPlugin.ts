import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  IEditorExtensionRegistry,
  EditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { runButtonExtension } from '../gutterRunner';

/**
 * Registers the run-button gutter as a CodeMirror 6 extension.
 *
 * The extension is registered globally but only activates for MyST/Markdown
 * files because the codeBlockField only finds FencedCode nodes which are
 * parsed by the MyST language support.
 */
export const gutterPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-myst-console:gutter',
  description: 'Adds run buttons in the gutter for fenced code blocks in MyST files',
  autoStart: true,
  requires: [IEditorExtensionRegistry],
  activate(_app: JupyterFrontEnd, extensions: IEditorExtensionRegistry) {
    extensions.addExtension(
      Object.freeze({
        name: 'jupyterlab-myst-console:run-buttons',
        factory: () =>
          EditorExtensionRegistry.createImmutableExtension(runButtonExtension)
      })
    );

    console.log('[jupyterlab-myst-console] Registered run-button gutter extension');
  }
};
