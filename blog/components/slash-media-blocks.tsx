"use client";

import { File as FileNode, Video, Embed, Mermaid } from "@slash-editor/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/editor-media";
import { PostDiagram } from "./post-diagram";

function MediaView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const kind = node.type.name;
  const src = mediaUrl(kind === "embed" ? node.attrs.url : node.attrs.src);
  const [editing, setEditing] = useState(!src);
  const [url, setUrl] = useState(src);
  const [mode, setMode] = useState(node.attrs.mode ?? "bookmark");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const label = kind === "video" ? "동영상" : kind === "file" ? "파일" : "임베드";
  useEffect(() => {
    if (kind !== "embed" || !src || node.attrs.mode !== "bookmark" || node.attrs.title) return;
    const controller = new AbortController();
    void fetch(`/api/link-preview?url=${encodeURIComponent(src)}`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => {
      if (!data || controller.signal.aborted || editor.isDestroyed) return;
      const pos = getPos();
      if (typeof pos !== "number" || editor.state.doc.nodeAt(pos)?.attrs.url !== src) return;
      updateAttributes({ title: data.title || new URL(src).hostname, description: data.description || "", thumbnail: mediaUrl(data.image) });
    }).catch(() => {});
    return () => controller.abort();
  }, [kind, src, node.attrs.mode, node.attrs.title, editor, getPos, updateAttributes]);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/attachments", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !mediaUrl(data.url)) throw new Error(data.error || "업로드하지 못했습니다.");
      const pos = getPos();
      if (editor.isDestroyed || typeof pos !== "number" || editor.state.doc.nodeAt(pos)?.type.name !== kind) return;
      updateAttributes({ src: data.url, name: file.name, mime: file.type, size: file.size, status: "ready" });
      setUrl(data.url); setEditing(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "업로드하지 못했습니다."); }
    finally { setUploading(false); }
  };
  return <NodeViewWrapper className="slash-media" contentEditable={false}>
    {src && !editing && <>
      {kind === "video" ? <video src={src} controls preload="metadata" /> : kind === "embed" && node.attrs.mode === "iframe" ? <iframe src={src} title={node.attrs.title || "외부 콘텐츠"} sandbox="allow-scripts allow-presentation" referrerPolicy="no-referrer" loading="lazy" /> : <a href={src} target="_blank" rel="noopener noreferrer">{kind === "embed" && mediaUrl(node.attrs.thumbnail) && <img src={mediaUrl(node.attrs.thumbnail)} alt=""/>}<strong>{node.attrs.title || node.attrs.name || src}</strong>{kind === "embed" && <p>{node.attrs.description}</p>}</a>}
      <button type="button" onClick={() => { setUrl(src); setEditing(true); }}>{label} 수정</button>
    </>}
    {editing && <form onSubmit={e => {
      e.preventDefault(); const next = mediaUrl(url);
      if (!next) { setError("http 또는 https 주소를 입력해 주세요."); return; }
      updateAttributes(kind === "embed" ? { url: next, mode, title: "", description: "", thumbnail: "" } : { src: next, status: "ready" });
      setError(""); setEditing(false);
    }}>
      <label>{label} 주소<input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" disabled={uploading}/></label>
      {kind === "embed" && <label>표시 방식<select value={mode} onChange={e => setMode(e.target.value)}><option value="bookmark">링크 카드</option><option value="iframe">임베드</option></select></label>}
      <button type="submit" disabled={uploading}>적용</button>
      {src && <button type="button" onClick={() => setEditing(false)}>취소</button>}
      {kind !== "embed" && <label>파일 업로드<input type="file" disabled={uploading} accept={kind === "video" ? ".mp4,.webm,.mov" : ".pdf,.txt,.csv,.zip"} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }}/><small>5MB 이하 · GitHub에 공개 파일로 저장됩니다.</small></label>}
      {kind === "embed" && <small>대상 사이트에서 외부 임베드를 허용해야 표시됩니다.</small>}
    </form>}
    {uploading && <p role="status">업로드 중…</p>}{error && <p role="alert">{error}</p>}
  </NodeViewWrapper>;
}

function MermaidView({ node }: NodeViewProps) {
  return <NodeViewWrapper className="slash-mermaid"><div contentEditable={false}><PostDiagram source={node.textContent}/></div><pre><NodeViewContent<"code"> as="code"/></pre></NodeViewWrapper>;
}
const mediaNodeView = () => ReactNodeViewRenderer(MediaView, { stopEvent: ({ event }) => Boolean((event.target as HTMLElement)?.closest?.("form, button, video, iframe, a")) });
export const nativeMediaNodes = [FileNode.extend({ addNodeView: mediaNodeView }), Video.extend({ addNodeView: mediaNodeView }), Embed.extend({ addNodeView: mediaNodeView }), Mermaid.extend({ addNodeView: () => ReactNodeViewRenderer(MermaidView) })];
