import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';

/**
 * Registers the `.myst` and `.md` file types with JupyterLab's document registry.
 *
 * Registering `.md` here overrides JupyterLab's built-in 'markdown' file type,
 * so that .md files open with MyST syntax highlighting and the run-button gutter
 * by default instead of the Markdown preview renderer.
 */
export const fileTypePlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-myst-console:file-type',
  description: 'Registers .myst and .md file types for MyST Markdown',
  autoStart: true,
  activate(app: JupyterFrontEnd) {
    app.docRegistry.addFileType({
      name: 'myst',
      displayName: 'MyST Markdown',
      extensions: ['.md'],
      mimeTypes: ['text/x-myst-markdown'],
      fileFormat: 'text',
      contentType: 'file',
      icon: undefined
    });

    console.log('[jupyterlab-myst-console] Registered .md file type as MyST Markdown');
  }
};
