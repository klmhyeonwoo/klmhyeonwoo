const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { JSDOM } = require("jsdom");

function load(file, globals = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, ...globals });
  return exports;
}
const { validComment } = load("lib/inline-comment-types.ts");
const dom = new JSDOM('<div id="root">앞 문장 <strong>선택한</strong> 문장 뒤 문장</div>');
const { locateAnchor, anchorRange } = load("lib/text-anchor.ts", { document: dom.window.document, NodeFilter: dom.window.NodeFilter });
const anchor = { quote: "선택한 문장", prefix: "앞 문장 ", suffix: " 뒤 문장", start: 5 };
assert.equal(validComment({ name: "독자", body: "좋은 글입니다", anchor }), true);
assert.equal(validComment({ name: " ", body: "내용", anchor }), false);
assert.equal(validComment({ name: "독자", body: "a".repeat(2001), anchor }), false);
assert.equal(validComment({ name: "독자", body: "내용", anchor: { ...anchor, start: -1 } }), false);
assert.equal(locateAnchor("새로 추가한 문장 앞 문장 선택한 문장 뒤 문장", anchor), 15);
assert.equal(locateAnchor("삭제된 본문", anchor), null);
assert.equal(locateAnchor("같은 문장, 같은 문장", { quote: "같은 문장", prefix: "", suffix: "", start: 0 }), null);
assert.equal(locateAnchor("첫 같은 문장 끝 / 둘 같은 문장 뒤", { quote: "같은 문장", prefix: "둘 ", suffix: " 뒤", start: 0 }), 14);
assert.equal(anchorRange(dom.window.document.getElementById("root"), anchor).toString(), anchor.quote);
console.log("Inline comments: validation, edited/removed/ambiguous anchors, and cross-element ranges passed.");

async function storageTest() {
  const issues = [];
  let comments = [];
  const storage = load("lib/inline-comments.ts", {
    require: name => name === "server-only" ? {} : { validComment },
    process: { env: { GITHUB_OWNER: "test", GITHUB_REPO: "test", GITHUB_TOKEN: "test" } },
    fetch: async (url, options) => {
      const path = new URL(url).pathname.replace("/repos/test/test/", "");
      const body = options.body && JSON.parse(options.body);
      let data;
      if (options.method === "DELETE") { comments = comments.filter(comment => comment.id !== Number(path.split("/").pop())); return { ok: true, status: 204 }; }
      if (options.method === "POST" && path === "issues") { data = { number: 1, ...body }; issues.push(data); }
      else if (options.method === "POST") { data = { id: 12, body: body.body, created_at: "2026-10-21T00:00:00Z" }; comments.push(data); }
      else data = path === "issues" ? issues : comments;
      return { ok: true, status: 200, json: async () => data };
    },
  });
  await storage.createInlineComment("post", { name: "독자", body: "댓글", anchor });
  assert.equal((await storage.listInlineComments("post"))[0].body, "댓글");
  assert.equal(await storage.deleteInlineComment("other-post", 12), false);
  assert.equal(comments.length, 1);
  assert.equal(await storage.deleteInlineComment("post", 12), true);
  assert.equal((await storage.listInlineComments("post")).length, 0);
  console.log("Inline comment storage: create, reload, cross-post deletion rejection, and delete passed (mock GitHub).");
}
storageTest().catch(error => { console.error(error); process.exitCode = 1; });
