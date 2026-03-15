import { gutter, GutterMarker } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { codeBlockField, findBlockAtPos, kernelLanguageField } from './state';
import type { ICodeBlockInfo } from './detector';

/** Name of the CustomEvent dispatched when a run button is clicked. */
export const MYST_RUN_EVENT = 'myst-run-block';

/** The CustomEvent detail payload. */
export interface IMystRunEvent {
  blockInfo: ICodeBlockInfo;
}

/**
 * Spacer marker used to reserve gutter width even when no block is present on a line.
 */
class SpacerMarker extends GutterMarker {
  toDOM(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'cm-myst-run-spacer';
    return el;
  }
}

const spacer = new SpacerMarker();

/**
 * The gutter extension that renders run buttons next to fenced code blocks.
 * On click, dispatches a bubbling CustomEvent on the editor's DOM node so
 * the JupyterLab plugin layer can intercept it without any CM6/service boundary issues.
 */
export const runButtonGutter: Extension = gutter({
  class: 'cm-myst-run-gutter',

  markers(view: EditorView) {
    return view.state.field(codeBlockField);
  },

  initialSpacer: () => spacer,

  domEventHandlers: {
    mousedown(view: EditorView, line, event: Event) {
      const mouseEvent = event as MouseEvent;
      const target = mouseEvent.target as HTMLElement;

      // Only handle clicks on the run button itself (or its SVG child)
      const button = target.classList.contains('cm-myst-run-button')
        ? target
        : (target.closest('.cm-myst-run-button') as HTMLElement | null);

      if (!button) {return false;}

      // Consume the click but do nothing if the button is disabled
      if (button.hasAttribute('disabled')) {return true;}

      const markers = view.state.field(codeBlockField);
      const blockInfo = findBlockAtPos(markers, line.from);

      if (!blockInfo) {return false;}

      // Dispatch a bubbling CustomEvent so the JupyterLab plugin layer
      // can listen on the widget's DOM node — no StateEffect/appendConfig needed.
      const detail: IMystRunEvent = { blockInfo };
      view.dom.dispatchEvent(
        new CustomEvent<IMystRunEvent>(MYST_RUN_EVENT, {
          bubbles: true,
          detail
        })
      );

      return true;
    }
  }
});

/**
 * All CM6 extensions needed for the run-button gutter feature.
 * kernelLanguageField must be listed before codeBlockField since
 * codeBlockField reads from it.
 */
export const runButtonExtension: Extension[] = [
  kernelLanguageField,
  codeBlockField,
  runButtonGutter
];
