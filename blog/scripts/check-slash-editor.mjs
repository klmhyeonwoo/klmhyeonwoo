import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement', 'MutationObserver', 'DOMParser', 'getComputedStyle', 'KeyboardEvent', 'Event', 'Range']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: typeof dom.window[key] === 'function' && key === 'getComputedStyle' ? dom.window[key].bind(dom.window) : dom.window[key] });
}
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.innerHeight = 900;
globalThis.innerWidth = 1200;
dom.window.Range.prototype.getClientRects = () => [];
dom.window.HTMLCanvasElement.prototype.getContext = () => null;
dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 });
const { Editor } = await import('@tiptap/core');
const { createBlockKit, defaultSlashItems, filterSlashItems } = await import('@slash-editor/core');
const { emoji } = await import('@slash-editor/core/emoji');
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { markdownFor, convertBlocks } = require('../lib/slash-content.ts');
const { compileMDX } = await import('next-mdx-remote/rsc');
const remarkGfm = (await import('remark-gfm')).default;
const expected = { paragraph: 'paragraph', 'heading-1': 'heading', 'heading-2': 'heading', 'heading-3': 'heading', 'bullet-list': 'bulletList', 'ordered-list': 'orderedList', 'task-list': 'taskList', blockquote: 'blockquote', callout: 'callout', toggle: 'details', 'code-block': 'codeBlock', 'toggle-heading-1': 'details', 'toggle-heading-2': 'details', 'toggle-heading-3': 'details', mermaid: 'mermaid', 'horizontal-rule': 'horizontalRule', image: 'image', file: 'file', video: 'video', embed: 'embed', table: 'table', columns: 'columns' };
const editor = new Editor({ element: document.body.appendChild(document.createElement('div')), extensions: createBlockKit({ emoji: emoji(), mention: { items: () => [] } }), content: '<p>/</p>' });
assert.equal(filterSlashItems(defaultSlashItems, '', editor).length, 23);
for (const item of defaultSlashItems) {
  editor.commands.setContent('<p>/</p>');
  editor.commands.setTextSelection(2);
  item.run({ editor, range: { from: 1, to: 2 } });
  editor.state.doc.check();
  if (item.id === 'emoji') assert.ok(editor.state.doc.textContent.includes(':'));
  else assert.ok(JSON.stringify(editor.getJSON()).includes(`"type":"${expected[item.id]}"`), `Menu ${item.id} must create ${expected[item.id]}`);
  await compileMDX({ source: markdownFor(editor.getJSON()), components: { Diagram: () => null, Callout: () => null, Bookmark: () => null, Columns: () => null, Column: () => null }, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
}
editor.commands.setContent('<p>task</p>');
editor.commands.setTextSelection(2);
editor.commands.toggleTaskList();
const checkbox = editor.view.dom.querySelector('input[type="checkbox"]');
assert.ok(checkbox, 'Native task checkbox exists');
checkbox.click();
assert.ok(JSON.stringify(editor.getJSON()).includes('"checked":true'));
editor.commands.setContent('<p>toggle</p>'); editor.commands.setTextSelection(2); editor.commands.setToggle();
const toggle = editor.view.dom.querySelector('[data-type="details"] > button');
assert.ok(toggle, 'Native toggle button exists');
const before = editor.getJSON().content[0].attrs.open;
toggle.click(); assert.notEqual(editor.getJSON().content[0].attrs.open, before);
const p = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const fixture = { type: 'doc', content: [
  { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [p('완료 항목'), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [p('중첩 항목')] }] }] }] },
  { type: 'details', attrs: { open: true, level: 2 }, content: [{ type: 'detailsSummary', content: [{ type: 'text', text: '토글 제목' }] }, { type: 'detailsContent', content: [p('토글 본문')] }] },
  { type: 'file', attrs: { src: 'https://example.com/a.pdf', name: '첨부 파일' } },
  { type: 'video', attrs: { src: 'https://example.com/a.mp4' } },
  { type: 'embed', attrs: { url: 'https://example.com/embed', mode: 'iframe' } },
  { type: 'mermaid', content: [{ type: 'text', text: 'graph TD\n A --> B' }] },
  { type: 'paragraph', content: [{ type: 'text', text: '<T> {value} **literal**', marks: [{ type: 'underline' }] }] },
  { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableHeader', attrs: { colspan: 2, rowspan: 1, colwidth: [100, 120] }, content: [p('병합된 셀'), p('두 번째 문단')] }] }] },
] };
editor.commands.setContent(fixture); editor.state.doc.check();
const markdown = markdownFor(editor.getJSON());
for (const value of ['중첩 항목', '<details open>', '토글 본문', '첨부 파일', '<video', '<iframe', '<Diagram', 'colSpan="2"', '두 번째 문단', '<u>']) assert.ok(markdown.includes(value), value);
await compileMDX({ source: markdown, components: { Diagram: () => null }, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
let count = 0;
for (const file of fs.readdirSync('editor-data').filter(name => name.endsWith('.json'))) {
  const original = JSON.parse(fs.readFileSync(`editor-data/${file}`, 'utf8'));
  editor.schema.nodeFromJSON(convertBlocks(original)).check(); count++;
}
editor.destroy(); dom.window.close();
console.log(`PASS: 23 native menus, checkbox click, toggle click, nested serialization, MDX compilation, ${count} saved documents`);
