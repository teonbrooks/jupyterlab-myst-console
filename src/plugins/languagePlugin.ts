import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { mystLanguageSupport } from '../language';

/**
 * Registers the MyST Markdown language with JupyterLab's CodeMirror language registry.
 * This enables syntax highlighting for .myst files and any editor using the
 * text/x-myst-markdown MIME type.
 */
export const languagePlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-myst-console:language',
  description: 'Registers MyST Markdown syntax highlighting',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate(_app: JupyterFrontEnd, languages: IEditorLanguageRegistry) {
    languages.addLanguage({
      name: 'MyST Markdown',
      displayName: 'MyST',
      mime: ['text/x-myst-markdown'],
      extensions: ['md'],
      async load() {
        return mystLanguageSupport();
      }
    });

    console.log('[jupyterlab-myst-console] Registered MyST Markdown language');
  }
};
