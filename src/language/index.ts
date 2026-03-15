import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import type { LanguageSupport } from '@codemirror/language';
import { mystExtension } from './myst-parser';

/**
 * Returns a CodeMirror 6 LanguageSupport for MyST Markdown.
 *
 * Builds on top of @codemirror/lang-markdown with:
 * - MyST directive (:::) and role ({role}`) parsing
 * - Fenced code block sub-language highlighting via @codemirror/language-data
 */
export function mystLanguageSupport(): LanguageSupport {
  return markdown({
    extensions: mystExtension,
    codeLanguages: languages
  });
}
