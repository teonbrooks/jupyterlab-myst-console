import { styleTags, tags as t } from '@lezer/highlight';

/**
 * Style tags for MyST-specific syntax nodes.
 * These map MyST node names to Lezer highlight tags.
 */
export const mystHighlighting = styleTags({
  'MystDirectiveFence': t.processingInstruction,
  'MystDirectiveName': t.keyword,
  'MystDirectiveBody': t.content,
  'MystRoleName': t.keyword,
  'MystRoleContent': t.string
});
