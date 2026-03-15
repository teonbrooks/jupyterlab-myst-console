import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import type { ConsolePanel } from '@jupyterlab/console';

/**
 * Public service token allowing other extensions to request a console for a given file path.
 */
export const IMystConsoleManager = new Token<IMystConsoleManager>(
  'jupyterlab-myst-console:IMystConsoleManager'
);

export interface IMystConsoleManager {
  /** Get or create a console panel associated with the given file path. */
  getConsole(filePath: string): Promise<ConsolePanel>;

  /** Signal emitted when a new console is created for a file. */
  readonly consoleCreated: ISignal<IMystConsoleManager, ConsolePanel>;
}
