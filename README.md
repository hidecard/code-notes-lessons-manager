# Code Notes & Lessons Manager

Organize programming lessons, coding notes, and code snippets directly inside VS Code.

Code Notes & Lessons Manager helps students and developers keep their learning material organized by **category**, **day**, and **tags**. Notes are stored locally in VS Code global storage, so they remain available across workspace changes.

## Features

- Nested **Category > Day** navigation in the sidebar.
- Markdown note editor with edit and preview modes.
- Search across note titles, content, categories, days, and tags.
- Advanced filtering by category, day, and tag.
- Favorites, archive, trash, and restore workflows.
- Create a note from currently selected code.
- Capture the current source file, line, and column as a code link.
- Open captured code links at their original source location.
- Copy Markdown content to the clipboard.
- View note, category, and tag statistics.
- Import and export notes as JSON.
- Export notes as a Markdown document.
- Persistent local storage that does not depend on the current workspace.

## Getting Started

Open the **Code Notes** view from the VS Code Activity Bar. Use **Code Notes: Create Note** to create a lesson note. Add a title, category, day, tags, and Markdown content, then save it.

To capture selected code, select a code block in the editor and run **Code Notes: Create Note**. The selected code will be added to the new note automatically. To add a link to an existing note, open a source file and run **Code Notes: Capture Current Code Link**.

Open a note from the sidebar to edit it, preview its Markdown, copy its content, mark it as a favorite, archive it, or move it to the trash.

## Commands

| Command | Description |
|---|---|
| `Code Notes: Create Note` | Create a note, optionally including selected code. |
| `Code Notes: Search Notes` | Search notes by title, content, category, day, or tag. |
| `Code Notes: Advanced Filter` | Filter by category, day, and tag. |
| `Code Notes: Capture Current Code Link` | Add the current source location to a selected note. |
| `Code Notes: Statistics` | Show note, category, and tag statistics. |
| `Code Notes: Show Favorites` | Show favorite notes. |
| `Code Notes: Show Archive` | Show archived notes. |
| `Code Notes: Show Trash` | Show deleted notes. |
| `Code Notes: Restore Note` | Restore a note from the trash or archive. |
| `Code Notes: Export JSON` | Export all notes as a JSON backup. |
| `Code Notes: Import JSON` | Import notes from a JSON backup. |
| `Code Notes: Export Markdown` | Export notes as one Markdown document. |
| `Code Notes: Refresh` | Refresh the sidebar. |

## Data Storage

Notes are saved in `notes.json` inside the extension's VS Code global storage directory. Notes are local to the current VS Code installation and are not uploaded to an external service.

## Privacy

This extension does not require an account and does not send notes or source code to a remote server. Users should still review their own organization’s policies before storing sensitive code or confidential information in local note files.

## License

MIT

