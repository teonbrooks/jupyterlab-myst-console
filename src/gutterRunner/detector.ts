import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface ICodeBlockInfo {
  /** Start position of the opening fence line in the document */
  from: number;
  /** End position of the closing fence line */
  to: number;
  /** Start position of the code content (excludes opening fence line) */
  contentFrom: number;
  /** End position of the code content (excludes closing fence line) */
  contentTo: number;
  /** Language tag from the info string, e.g. "python", "javascript" */
  language: string;
  /** The actual code content (excluding fence lines) */
  content: string;
  /** Line number (1-based) of the opening fence */
  startLine: number;
}

/**
 * Languages that should show a run button.
 * This default set can be overridden by extension settings.
 */
export const DEFAULT_EXECUTABLE_LANGUAGES = new Set([
  'python',
  'py',
  'javascript',
  'js',
  'typescript',
  'ts',
  'r',
  'julia',
  'scala',
  'ruby',
  'bash',
  'sh',
  'zsh'
]);

/**
 * Scan the editor's syntax tree for fenced code blocks and return
 * structured info about each one whose language is executable.
 */
export function findCodeBlocks(
  state: EditorState,
  executableLanguages: Set<string> = DEFAULT_EXECUTABLE_LANGUAGES
): ICodeBlockInfo[] {
  const blocks: ICodeBlockInfo[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      if (node.name !== 'FencedCode') return;

      // CodeInfo child contains the language tag (the part after the opening ```)
      const infoNode = node.node.getChild('CodeInfo');
      const language = infoNode
        ? state.doc.sliceString(infoNode.from, infoNode.to).trim().toLowerCase()
        : '';

      if (!executableLanguages.has(language)) return;

      // CodeText child contains the actual code body
      const bodyNode = node.node.getChild('CodeText');
      const contentFrom = bodyNode ? bodyNode.from : node.to;
      const contentTo = bodyNode ? bodyNode.to : node.to;
      const content = bodyNode
        ? state.doc.sliceString(contentFrom, contentTo)
        : '';

      const startLine = state.doc.lineAt(node.from).number;

      blocks.push({
        from: node.from,
        to: node.to,
        contentFrom,
        contentTo,
        language,
        content,
        startLine
      });
    }
  });

  return blocks;
}
