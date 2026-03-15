/**
 * jupyterlab-myst-console
 *
 * A JupyterLab extension that:
 * 1. Registers .myst files with MyST Markdown syntax highlighting (CodeMirror 6)
 * 2. Auto-detects fenced code blocks in the editor
 * 3. Shows a run button in the gutter next to each executable code block
 * 4. Executes clicked code blocks in a linked console panel
 */
import { fileTypePlugin } from './plugins/fileTypePlugin';
import { languagePlugin } from './plugins/languagePlugin';
import { gutterPlugin } from './plugins/gutterPlugin';
import { consoleRunnerPlugin } from './plugins/consoleRunnerPlugin';
import { launcherPlugin } from './plugins/launcherPlugin';

export default [fileTypePlugin, languagePlugin, gutterPlugin, consoleRunnerPlugin, launcherPlugin];

// Re-export the public token for other extensions that want to consume
// the console manager service
export { IMystConsoleManager } from './tokens';
