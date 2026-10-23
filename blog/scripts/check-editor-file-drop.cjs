const ts = require('typescript');
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="editor"></div>');
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'getComputedStyle']) {
  Object.defineProperty(global, key, { value: dom.window[key], configurable: true });
}
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, require: name => name === '@/lib/editor-media' ? load('lib/editor-media.ts') : require(name),
    document, crypto, URL, AbortController, FormData, fetch: (...args) => global.fetch(...args),
  });
  return exports;
}
const { postExcerpt } = load('lib/post-excerpt.ts');
assert.equal(postExcerpt('앞 문장 <Bookmark url="https://a.com" title="hello > world" /> 뒤 문장'), '앞 문장 뒤 문장');
assert.equal(postExcerpt('<Callout emoji="🙂">**내용** [링크](https://a.com)</Callout>'), '내용 링크');
assert.equal(postExcerpt('<Bookmark\n url="https://a.com"\n/>'), undefined);

const { Schema } = require('@tiptap/pm/model');
const { EditorState } = require('@tiptap/pm/state');
const { EditorView } = require('@tiptap/pm/view');
const { EditorFileDrop } = load('components/editor-file-drop.ts');
const schema = new Schema({ nodes: {
  doc: { content: 'block+' },
  paragraph: { group: 'block', content: 'text*', toDOM: () => ['p', 0] },
  text: { group: 'inline' },
  ...Object.fromEntries(['image', 'video', 'file'].map(type => [type, {
    group: 'block', atom: true, attrs: { src: { default: '' }, name: { default: '' } }, toDOM: () => ['div'],
  }])),
} });
const plugins = EditorFileDrop.config.addProseMirrorPlugins();
const view = new EditorView(document.querySelector('#editor'), { state: EditorState.create({ schema, plugins }) });
view.posAtCoords = () => ({ pos: 1, inside: 0 });
const requests = [];
global.fetch = () => new Promise(resolve => requests.push(resolve));
const drop = (files, moved = false) => plugins[0].props.handleDrop(view, {
  dataTransfer: { files }, clientX: 0, clientY: 0, preventDefault() {},
}, null, moved);
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function main() {
  assert.equal(drop([], true), false);
  assert.equal(drop([
    new File(['a'], 'a.png', { type: 'image/png' }),
    new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    new File(['c'], 'c.mp4', { type: 'video/mp4' }),
  ]), true);
  assert.equal(document.querySelectorAll('.editor-upload-status').length, 3);
  view.dispatch(view.state.tr.insertText('typing', 1));
  for (const name of ['a.png', 'b.pdf', 'c.mp4']) {
    requests.shift()({ ok: true, json: async () => ({ url: `https://example.com/${name}` }) });
    await tick();
  }
  assert.deepEqual(view.state.doc.content.content.map(node => node.type.name), ['paragraph', 'image', 'file', 'video']);
  assert.equal(view.state.doc.firstChild.textContent, 'typing');
  assert.equal(document.querySelectorAll('.editor-upload-status').length, 0);
  drop([new File(['x'], 'bad.exe', { type: 'application/octet-stream' })]);
  await tick();
  assert.equal(document.querySelectorAll('[data-state="error"]').length, 1);
  assert.ok(!JSON.stringify(view.state.doc.toJSON()).includes('bad.exe'));
  view.destroy();
  console.log('PASS: plain-text excerpts, internal drag passthrough, loading, typing-safe insertion, ordered image/file/video uploads, unsupported file errors, transient state.');
}
main().catch(error => { console.error(error); view.destroy(); process.exitCode = 1; });
