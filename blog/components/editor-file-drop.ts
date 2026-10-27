import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { attachmentExtension, mediaUrl } from "@/lib/editor-media";
import { imageUploadStatus, isUploadableImage, uploadImage, type ImageUploadProgress } from "@/lib/client-image-upload";

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
      element.setAttribute("aria-live", "polite");
      const indicator = document.createElement("span");
      indicator.className = "editor-upload-status__indicator";
      indicator.setAttribute("aria-hidden", "true");
      const content = document.createElement("div");
      content.className = "editor-upload-status__content";
      const title = document.createElement("strong");
      const name = document.createElement("span");
      name.className = "editor-upload-status__filename";
      name.textContent = file.name;
      name.title = file.name;
      const detail = document.createElement("span");
      detail.className = "editor-upload-status__detail";
      const progressTrack = document.createElement("span");
      progressTrack.className = "editor-upload-status__progress";
      progressTrack.setAttribute("aria-hidden", "true");
      const progressBar = document.createElement("span");
      progressTrack.append(progressBar);
      content.append(title, name, detail, progressTrack);
      const actions = document.createElement("div");
      actions.className = "editor-upload-status__actions";
      element.append(indicator, content, actions);
      const setImageStatus = (progress?: ImageUploadProgress) => {
        const status = imageUploadStatus(progress);
        element.dataset.state = "loading";
        element.dataset.stage = progress?.stage ?? "converting";
        title.textContent = status.title;
        detail.textContent = status.detail;
        progressTrack.hidden = false;
        progressBar.style.setProperty("--upload-progress", `${status.progress ?? 20}%`);
      };
      const setFileStatus = () => {
        element.dataset.state = "loading";
        element.dataset.stage = "uploading";
        title.textContent = "파일을 올리고 있어요";
        detail.textContent = "잠시만 기다려 주세요";
        progressTrack.hidden = false;
        progressBar.style.setProperty("--upload-progress", "20%");
      };
      setImageStatus({ stage: "converting", progress: 0 });
      const remove = () => {
        if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(uploads, { remove: id }));
      };
      view.dispatch(view.state.tr.setMeta(uploads, { add: { id, position, element } }));
      const run = async () => {
        if (view.isDestroyed || !uploads.getState(view.state)?.find(undefined, undefined, spec => spec.id === id).length) return;
        const controller = new AbortController();
        controllers.add(controller);
        const image = isUploadableImage(file);
        image ? setImageStatus({ stage: "converting", progress: 0 }) : setFileStatus();
        actions.replaceChildren();
        const cancel = document.createElement("button");
        cancel.type = "button"; cancel.textContent = "취소";
        cancel.onclick = () => { controller.abort(); remove(); };
        actions.append(cancel);
        try {
          const extension = attachmentExtension(file.name, file.type);
          if (!image && !extension) throw new Error("지원 형식: 이미지, MP4, WebM, MOV, PDF, TXT, CSV, ZIP");
          let src = "";
          if (image) {
            const uploaded = await uploadImage(file, setImageStatus);
            src = mediaUrl(uploaded.url);
          } else {
            if (file.size > 5 * 1024 * 1024) throw new Error("5MB 이하 파일을 선택하거나 URL로 연결해 주세요.");
            const form = new FormData(); form.append("file", file);
            const response = await fetch("/api/attachments", { method: "POST", body: form, signal: controller.signal });
            if (!response.ok) {
              const result = await response.json().catch(() => null) as { error?: string } | null;
              throw new Error(result?.error || "업로드하지 못했습니다.");
            }
            const result = await response.json().catch(() => null) as { url?: string } | null;
            src = mediaUrl(result?.url);
            if (!src) throw new Error("업로드하지 못했습니다.");
          }
          if (view.isDestroyed || controller.signal.aborted) return;
          const placeholder = uploads.getState(view.state)?.find(undefined, undefined, spec => spec.id === id)[0];
          if (!placeholder) return;
          const type = image ? "image" : /^(mp4|webm|mov)$/.test(extension ?? "") ? "video" : "file";
          const node = view.state.schema.nodes[type].create({ src, alt: file.name, name: file.name, mime: file.type, size: file.size, status: "ready" });
          view.dispatch(view.state.tr.insert(placeholder.from, node).setMeta(uploads, { remove: id }));
        } catch (error) {
          if (controller.signal.aborted || view.isDestroyed) return;
          element.dataset.state = "error";
          element.dataset.stage = "error";
          title.textContent = image ? "사진을 올리지 못했어요" : "파일을 올리지 못했어요";
          detail.textContent = error instanceof Error ? error.message : "업로드하지 못했습니다.";
          progressTrack.hidden = true;
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
    function queueUploads(view: EditorView, files: File[], event: Pick<DragEvent, "clientX" | "clientY">) {
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
      const resolved = view.state.doc.resolve(pos);
      const position = resolved.depth ? resolved.after(1) : pos;
      const pending = files.map((file) => addUpload(view, file, position));
      void (async () => { for (const upload of pending) await upload(); })();
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
          queueUploads(view, files, event);
          return true;
        },
      },
      view: (view) => {
        // Slash Editor registers its own drop handlers. Intercepting external
        // files in the capture phase guarantees HEIC files reach this uploader
        // instead of being discarded by an earlier editor extension.
        const allowFileDrop = (event: DragEvent) => {
          if (event.dataTransfer?.files.length) event.preventDefault();
        };
        const captureFileDrop = (event: DragEvent) => {
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (!files.length) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          queueUploads(view, files, event);
        };
        view.dom.addEventListener("dragover", allowFileDrop, true);
        view.dom.addEventListener("drop", captureFileDrop, true);
        return {
          destroy: () => {
            view.dom.removeEventListener("dragover", allowFileDrop, true);
            view.dom.removeEventListener("drop", captureFileDrop, true);
            controllers.forEach((controller) => controller.abort());
            controllers.clear();
          },
        };
      },
    })];
  },
});
