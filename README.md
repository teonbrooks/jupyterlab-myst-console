# jupyterlab-myst-console

A JupyterLab 4.x extension for editing [MyST Markdown](https://mystmd.org) files with full syntax highlighting and inline code block execution. Open `.md` files, see rich MyST syntax coloring, and run any fenced code block directly from the editor — no notebook required.

## Features

- **MyST syntax highlighting** — `.md` files open in the text editor with full MyST Markdown syntax highlighting, including `:::` directives and `{role}` inline roles, plus sub-language highlighting inside fenced code blocks (Python, JavaScript, R, etc.)
- **Gutter run buttons** — a play button (▶) appears in the gutter next to each executable fenced code block
- **Kernel language matching** — run buttons are automatically enabled or disabled based on whether the code block language matches the language of the linked kernel; mismatched buttons are visually dimmed and unclickable
- **Console integration** — running a block opens a linked console panel split to the right of the editor (the editor stays in focus on the left); re-running reuses the same console
- **Keyboard shortcut** — `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux) runs code blocks from the keyboard, no mouse required
- **Multi-block selection** — highlight text spanning multiple code blocks and press `Cmd+Enter` to run all of them in document order
- **Launcher card** — a "MyST File" card in the JupyterLab Launcher creates a new `.md` file and opens it alongside a console in one click

## Requirements

- JupyterLab >= 4.0.0

## Install

```bash
pip install jupyterlab-myst-console
```

## Usage

### Opening files

Open any `.md` file from the file browser. It will open in the text editor with MyST syntax highlighting. Alternatively, click **MyST File** in the JupyterLab Launcher to create a new file and automatically open a console beside it.

### Running code blocks with the gutter button

Write a fenced code block with a language tag:

````markdown
```python
import numpy as np
print(np.arange(10))
```
````

A play button (▶) appears in the left gutter next to the opening fence line. Click it to execute the block in a linked console. The console opens to the right of the editor the first time; subsequent runs reuse the same console.

### Running code blocks with the keyboard

**Mac:** `Cmd+Enter` | **Windows / Linux:** `Ctrl+Enter`

The shortcut is scoped to the file editor so it does not interfere with notebook cell execution.

| Scenario | Behavior |
|---|---|
| Cursor inside a code block, no selection | Runs the current line, advances cursor to the next line, editor stays focused |
| Cursor outside a code block, no selection | No-op |
| Text selected within a code block | Runs only the selected text (fence lines excluded) |
| Text selected spanning multiple code blocks | Runs the selected portion of each overlapping block in document order |

**Line-by-line execution:** When no text is selected and the cursor is anywhere inside a fenced code block, each press of the shortcut runs exactly the line the cursor is on and moves the cursor down one line. This lets you step through a code block line by line without leaving the editor. Blank lines are skipped silently.

**Selection execution:** When text is selected, only the selected content is sent to the console — fence delimiters (` ```python `, ` ``` `) are never included even if the selection covers them. If the selection spans multiple code blocks, each block contributes only its selected slice, run in document order.

### Kernel language matching

When a console is linked to the editor, the extension reads the kernel's language from the Jupyter protocol (`kernel_info_reply.language_info.name`). Run buttons for code blocks whose language matches the kernel are enabled (full opacity, clickable). Buttons for non-matching languages are disabled (dimmed, cursor: not-allowed) and cannot be triggered by either click or keyboard shortcut.

For example, if the kernel is Python:
- ` ```python ` blocks → enabled
- ` ```javascript ` blocks → disabled

When no kernel is running yet, all buttons are enabled.

**Language aliases recognized:**

| Code block tag | Kernel language |
|---|---|
| `python`, `py` | `python` |
| `javascript`, `js` | `javascript` |
| `typescript`, `ts` | `typescript` |
| `r` | `r` |
| `julia` | `julia` |
| `ruby` | `ruby` |
| `scala` | `scala` |
| `bash`, `sh`, `zsh`, `shell` | `bash` |

### MyST syntax elements highlighted

| Syntax | Example |
|---|---|
| `:::` directive fences | `:::` `{note}` |
| Directive name | `{note}`, `{code-cell}` |
| Inline roles | `` {math}`E = mc^2` `` |
| Fenced code blocks | standard Markdown |
| Sub-language highlighting | Python, JS, R, etc. inside fences |

### Split-screen layout

The first time a code block is run from an editor, the extension:

1. Looks up the editor widget in JupyterLab's editor tracker
2. Calls `console:create` with `insertMode: 'split-right'` and `ref: <editorWidget.id>`
3. Keeps the editor focused so you can continue editing immediately

The console panel appears to the right, splitting the available space evenly. Subsequent runs reuse the same console without repositioning.

## Settings

Open **Settings → Advanced Settings Editor → jupyterlab-myst-console** to configure:

| Setting | Type | Default | Description |
|---|---|---|---|
| `defaultKernelName` | string | `"python3"` | Kernel to start when creating a new linked console |
| `executableLanguages` | array | (built-in list) | Language tags that trigger run button display |
| `reuseConsole` | boolean | `true` | Reuse an existing console for the same file path |
| `activateConsole` | boolean | `false` | Bring the console panel to focus after each run |

## Example file

An annotated demo file is included at [`examples/demo.md`](examples/demo.md). It covers Python, NumPy, Matplotlib, MyST directives, inline roles, Bash, and JavaScript blocks.

## Development

```bash
git clone https://github.com/teonbrooks/jupyterlab-myst-console
cd jupyterlab-myst-console

# Install Python package in editable mode
pip install -e .

# Install JS dependencies
jlpm install

# Build and watch for changes
jlpm run watch
```

In a second terminal:

```bash
jupyter lab
```

JupyterLab will pick up the extension automatically via the editable install. After editing TypeScript source files, the watcher rebuilds and a browser refresh loads the new code.

### Project structure

```
src/
  index.ts                  # Plugin registration
  tokens.ts                 # IMystConsoleManager token/interface
  icons.ts                  # MyST logo LabIcon
  language/
    myst-parser.ts          # Lezer-based ::: directive + {role} parsers
    index.ts                # mystLanguageSupport() factory
  gutterRunner/
    detector.ts             # findCodeBlocks() — syntax-tree-based block detection
    state.ts                # CM6 StateFields: codeBlockField, kernelLanguageField
    plugin.ts               # runButtonGutter CM6 extension
    index.ts                # barrel export
  console/
    manager.ts              # MystConsoleManager — console lifecycle management
  plugins/
    fileTypePlugin.ts       # Registers .md as MyST file type
    languagePlugin.ts       # Registers MyST language with IEditorLanguageRegistry
    gutterPlugin.ts         # Registers CM6 gutter extension
    consoleRunnerPlugin.ts  # DOM event bridge + Cmd+Enter command
    launcherPlugin.ts       # Launcher card
schema/
  plugin.json               # Settings schema
style/
  base.css                  # Gutter button styles
  icons/myst-logo.svg       # Official MyST logo
examples/
  demo.md                   # Annotated demo file
```

## License

BSD 3-Clause
