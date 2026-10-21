# Slash Editor integration

The installed core/react version is 0.8.0. Its 23 built-in slash items are enabled:

- Text, headings 1–3, bulleted/numbered/task lists, quote, callout, toggle, code.
- Toggle headings 1–3, Mermaid diagrams, divider.
- Image, file, video, embed, table, columns, emoji.

Core commands own block conversion, dragging, list/toggle behavior, inline formatting,
undo/redo and suggestion navigation. App UI supplies popovers and media node views;
the headless npm package does not contain the site's styled demo components.

## Storage and display

- Existing data is converted at load time; saved output uses `slash-content` JSON.
- Files/videos support HTTP(S) URLs and an authenticated GitHub upload endpoint.
  Uploads accept PDF/TXT/CSV/ZIP/MP4/WebM/MOV, maximum 5 MB. Files are public.
- Images retain the existing upload endpoint and resizing UI.
- Embeds support bookmark cards or sandboxed iframes. A remote site can refuse
  embedding via its own headers; this is not bypassed.
- Mermaid is lazy-loaded and rendered with strict security settings. An invalid
  diagram retains its source and shows a message.
- `:` invokes native emoji suggestions; `@` searches the provided post list.
- Tables preserve merged cells, header cells, multiple paragraphs, column widths
  and full-width state. Nested lists and toggle state survive Markdown export.

AI remains disabled at the user's prior request. Multiplayer collaboration,
editor review comments and workspace page-tree services require separate persistent
providers and are not enabled by the blog integration. They are not built-in slash
menu items.

Public articles support anonymous inline comments through the existing MDX renderer,
without mounting an editable Tiptap document. Select up to 1,000 characters, enter a
display name and comment, and use the quoted-text button to return to the passage.
Anchors preserve the quote and 60 characters of surrounding context. Ambiguous or
removed passages are reported instead of silently highlighting a different passage.
Private articles do not expose this API. Existing Giscus/Utterances comments remain.

Storage uses GitHub issue comments, with one dedicated `[본문 댓글] <post-id>` issue
per article, requiring `GITHUB_TOKEN` with Issues read/write permissions on
`GITHUB_OWNER/GITHUB_REPO` and Issues enabled. No content commits or rebuilds occur
when comments are posted. Administrator sessions may permanently delete comments;
anonymous names are unverified. Issue bodies are public wherever the repository is
public. Posting is limited to one attempt per IP per 30 seconds in each server
instance; a shared rate-limit service or edge limit is needed for coordinated abuse
across instances. Concurrent first submissions may create multiple storage issues;
reads aggregate all matching issues so no comments are lost.

## Verification

Run `node scripts/check-slash-editor.mjs` from the blog directory. This uses jsdom
to execute all 23 native slash commands, click native checkboxes/toggles, check
serialization and MDX compilation, and validate the local saved-document schemas.
It does not simulate real-browser pointer geometry, remote uploads, external embed
permissions, or visual fidelity to the demo.
