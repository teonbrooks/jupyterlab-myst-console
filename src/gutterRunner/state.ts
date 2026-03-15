import { StateField, StateEffect } from '@codemirror/state';
import { RangeSet, RangeSetBuilder } from '@codemirror/state';
import { syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { GutterMarker } from '@codemirror/view';
import { findCodeBlocks, ICodeBlockInfo, DEFAULT_EXECUTABLE_LANGUAGES } from './detector';

// ---------------------------------------------------------------------------
// Kernel language — StateEffect + StateField
// ---------------------------------------------------------------------------

/**
 * Dispatched by the JupyterLab plugin layer whenever the console kernel
 * language changes (or becomes known for the first time).
 * Empty string means "no kernel / unknown" → all buttons enabled.
 */
export const kernelLanguageEffect = StateEffect.define<string>();

export const kernelLanguageField = StateField.define<string>({
  create: () => '',
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(kernelLanguageEffect)) return effect.value;
    }
    return value;
  }
});

// ---------------------------------------------------------------------------
// Language normalisation
// Maps fenced-code info strings to canonical Jupyter kernel language names.
// ---------------------------------------------------------------------------

const BLOCK_LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  py: 'python',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  r: 'r',
  julia: 'julia',
  ruby: 'ruby',
  scala: 'scala',
  bash: 'bash',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash'
};

export function normalizeBlockLanguage(tag: string): string {
  return BLOCK_LANGUAGE_MAP[tag.toLowerCase()] ?? tag.toLowerCase();
}

/**
 * Returns true when the code block language is compatible with the given
 * kernel language. An empty kernelLanguage (no kernel yet) enables all buttons.
 */
export function isLanguageEnabled(blockLang: string, kernelLang: string): boolean {
  if (!kernelLang) return true;
  return normalizeBlockLanguage(blockLang) === kernelLang.toLowerCase();
}

// ---------------------------------------------------------------------------
// GutterMarker subclass
// ---------------------------------------------------------------------------

export class RunButtonMarker extends GutterMarker {
  constructor(
    readonly blockInfo: ICodeBlockInfo,
    readonly enabled: boolean
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'cm-myst-run-button';
    btn.dataset.language = this.blockInfo.language;

    if (this.enabled) {
      btn.title = `Run ${this.blockInfo.language} block (Cmd+Enter)`;
    } else {
      btn.disabled = true;
      btn.classList.add('cm-myst-run-button--disabled');
      btn.title = `Kernel does not support ${this.blockInfo.language}`;
    }

    btn.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
    </svg>`;
    return btn;
  }

  eq(other: RunButtonMarker): boolean {
    return (
      other.blockInfo.from === this.blockInfo.from &&
      other.blockInfo.language === this.blockInfo.language &&
      other.enabled === this.enabled
    );
  }
}

// ---------------------------------------------------------------------------
// StateEffect: dispatched when a run button is clicked
// ---------------------------------------------------------------------------

export const runCodeBlockEffect = StateEffect.define<ICodeBlockInfo>();

// ---------------------------------------------------------------------------
// StateField: tracks all code block marker positions + enabled state
// ---------------------------------------------------------------------------

function buildMarkerSet(
  blocks: ICodeBlockInfo[],
  kernelLanguage: string
): RangeSet<RunButtonMarker> {
  const builder = new RangeSetBuilder<RunButtonMarker>();
  for (const block of blocks) {
    const enabled = isLanguageEnabled(block.language, kernelLanguage);
    builder.add(block.from, block.from, new RunButtonMarker(block, enabled));
  }
  return builder.finish();
}

export const codeBlockField = StateField.define<RangeSet<RunButtonMarker>>({
  create(state) {
    const kernelLang = state.field(kernelLanguageField);
    const blocks = findCodeBlocks(state, DEFAULT_EXECUTABLE_LANGUAGES);
    return buildMarkerSet(blocks, kernelLang);
  },

  update(value, tr) {
    const kernelChanged = tr.effects.some(e => e.is(kernelLanguageEffect));
    if (
      !tr.docChanged &&
      !kernelChanged &&
      syntaxTree(tr.startState) === syntaxTree(tr.state)
    ) {
      return value;
    }
    if (!syntaxTreeAvailable(tr.state)) {
      return value;
    }
    const kernelLang = tr.state.field(kernelLanguageField);
    const blocks = findCodeBlocks(tr.state, DEFAULT_EXECUTABLE_LANGUAGES);
    return buildMarkerSet(blocks, kernelLang);
  }
});

/**
 * Find the code block info for a given document position, if any marker
 * exists at that line's start position.
 */
export function findBlockAtPos(
  markers: RangeSet<RunButtonMarker>,
  pos: number
): ICodeBlockInfo | null {
  let found: ICodeBlockInfo | null = null;
  markers.between(pos, pos, (_from, _to, marker) => {
    if (marker instanceof RunButtonMarker) {
      found = marker.blockInfo;
    }
  });
  return found;
}
