import type { MarkdownConfig } from '@lezer/markdown';

/**
 * MyST directive block parser for the `:::` fence syntax.
 *
 * MyST directives look like:
 *
 *   :::{note}
 *   Content here
 *   :::
 *
 *   :::::{important}
 *   Nested content
 *   :::::
 */
const mystDirectiveParser: MarkdownConfig = {
  defineNodes: [
    { name: 'MystDirective', block: true },
    { name: 'MystDirectiveFence' },
    { name: 'MystDirectiveName' },
    { name: 'MystDirectiveBody' }
  ],
  parseBlock: [
    {
      name: 'MystDirective',
      before: 'FencedCode',
      parse(cx, line) {
        // Match opening fence: 3+ colons followed by {name}
        const openMatch = line.text.match(/^(:{3,})\{([^}]+)\}/);
        if (!openMatch) {return false;}

        const fenceLen = openMatch[1].length;
        const closingFence = ':'.repeat(fenceLen);

        const start = cx.lineStart;

        // Mark the opening fence line
        cx.addElement(
          cx.elt('MystDirectiveFence', cx.lineStart, cx.lineStart + line.text.length)
        );

        // Advance past the opening line.
        // The `line` object is mutated in-place by cx.nextLine(), so
        // we can safely read line.text after each call.
        while (cx.nextLine()) {
          const currentText = line.text;

          // Check for closing fence (same or more colons, no content after)
          if (
            currentText.startsWith(closingFence) &&
            currentText.slice(fenceLen).trim() === ''
          ) {
            cx.addElement(
              cx.elt(
                'MystDirectiveFence',
                cx.lineStart,
                cx.lineStart + currentText.length
              )
            );
            cx.nextLine();
            break;
          }
        }

        cx.addElement(
          cx.elt(
            'MystDirective',
            start,
            cx.lineStart
          )
        );
        return true;
      }
    }
  ]
};

/**
 * MyST inline role parser for the `{role}`content`` syntax.
 *
 * MyST roles look like: {math}`E = mc^2`
 */
const mystRoleParser: MarkdownConfig = {
  defineNodes: [
    { name: 'MystRole' },
    { name: 'MystRoleName' },
    { name: 'MystRoleContent' }
  ],
  parseInline: [
    {
      name: 'MystRole',
      parse(cx, next, pos) {
        // Match {role}`content`
        if (next !== 123 /* { */) {return -1;}

        const text = cx.slice(pos, cx.end);
        const roleMatch = text.match(/^\{([^}]+)\}`([^`]*)`/);
        if (!roleMatch) {return -1;}

        const fullLen = roleMatch[0].length;
        return cx.addElement(
          cx.elt('MystRole', pos, pos + fullLen, [
            cx.elt('MystRoleName', pos + 1, pos + 1 + roleMatch[1].length),
            cx.elt(
              'MystRoleContent',
              pos + roleMatch[1].length + 3,
              pos + fullLen - 1
            )
          ])
        );
      }
    }
  ]
};

export const mystExtension: MarkdownConfig[] = [
  mystDirectiveParser,
  mystRoleParser
];
