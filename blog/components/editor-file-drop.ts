import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { attachmentExtension, mediaUrl } from "@/lib/editor-media";

const uploads = new PluginKey<DecorationSet>("mediaUploads");

/** Decorations follow edits without saving temporary upload state in the post. */
export const EditorFileDrop = Extension.create({
  name: "editorFileDrop",
  priority: 1000,
  addProseMirrorPlugins() {
    const controllers = new Set<AbortController>();
    function addUpload(view: EditorView, file: File, position: number) {
      const id = crypto.randomUUID();
      const element = document.createElement("div");
      element.className = "editor-upload-status";
      element.contentEditable = "false";
      const label = document.createElement("span");
      label.setAttribute("role", "status");
      label.textContent = `${file.name} · 업로드 대기 중…`;
      const actions = document.createElement("div");
      element.append(label, actions);
      const remove = () => {
        if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(uploads, { remove: id }));
      };
      view.dispatch(view.state.tr.setMeta(uploads, { add: { id, position, element } }));
      const run = async () => {
        if (view.isDestroyed || !uploads.getState(view.state)?.find(undefined, undefined, spec => spec.id === id).length) return;
        const controller = new AbortController();
        controllers.add(controller);
        element.dataset.state = "loading";
        label.textContent = `${file.name} · 업로드 중…`;
        actions.replaceChildren();
        const cancel = document.createElement("button");
        cancel.type = "button"; cancel.textContent = "취소";
        cancel.onclick = () => { controller.abort(); remove(); };
        actions.append(cancel);
        try {
          if (file.size > 5 * 1024 * 1024) throw new Error("5MB 이하 파일을 선택하거나 URL로 연결해 주세요.");
          const image = file.type.startsWith("image/");
          const extension = attachmentExtension(file.name, file.type);
          if (!image && !extension) throw new Error("지원 형식: 이미지, MP4, WebM, MOV, PDF, TXT, CSV, ZIP");
          const form = new FormData(); form.append("file", file);
          const response = await fetch(image ? "/api/upload" : "/api/attachments", { method: "POST", body: form, signal: controller.signal });
          const result = await response.json();
          const src = mediaUrl(result.url);
          if (!response.ok || !src) throw new Error(result.error || "업로드하지 못했습니다.");
          if (view.isDestroyed || controller.signal.aborted) return;
          const placeholder = uploads.getState(view.state)?.find(undefined, undefined, spec => spec.id === id)[0];
          if (!placeholder) return;
          const type = image ? "image" : /^(mp4|webm|mov)$/.test(extension ?? "") ? "video" : "file";
          const node = view.state.schema.nodes[type].create({ src, alt: file.name, name: file.name, mime: file.type, size: file.size, status: "ready" });
          view.dispatch(view.state.tr.insert(placeholder.from, node).setMeta(uploads, { remove: id }));
        } catch (error) {
          if (controller.signal.aborted || view.isDestroyed) return;
          element.dataset.state = "error";
          label.textContent = `${file.name} · ${error instanceof Error ? error.message : "업로드하지 못했습니다."}`;
          actions.replaceChildren();
          for (const [text, action] of [["다시 시도", () => void run()], ["닫기", remove]] as const) {
            const button = document.createElement("button");
            button.type = "button"; button.textContent = text; button.onclick = action;
            actions.append(button);
          }
        } finally { controllers.delete(controller); }
      };
      return run;
    }
    return [new Plugin<DecorationSet>({
      key: uploads,
      state: {
        init: () => DecorationSet.empty,
        apply(transaction, previous) {
          let next = previous.map(transaction.mapping, transaction.doc);
          const action = transaction.getMeta(uploads);
          if (action?.add) {
            const { position, element, id } = action.add;
            next = next.add(transaction.doc, [Decoration.widget(position, element, { id, side: 1, stopEvent: () => true })]);
          }
          if (action?.remove) next = next.remove(next.find(undefined, undefined, spec => spec.id === action.remove));
          return next;
        },
      },
      props: {
        decorations: state => uploads.getState(state),
        handleDrop(view, event, _slice, moved) {
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (moved || !files.length) return false;
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
          const resolved = view.state.doc.resolve(pos);
          const position = resolved.depth ? resolved.after(1) : pos;
          const pending = files.map(file => addUpload(view, file, position));
          void (async () => { for (const upload of pending) await upload(); })();
          return true;
        },
      },
      view: () => ({ destroy: () => { controllers.forEach(controller => controller.abort()); controllers.clear(); } }),
    })];
  },
});
