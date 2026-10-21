"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { InlineComment, TextAnchor } from "@/lib/inline-comment-types";
import { anchorRange } from "@/lib/text-anchor";
import "./inline-comments.css";

export function InlineComments({ postId, root }: { postId: string; root: RefObject<HTMLDivElement | null> }) {
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [anchor, setAnchor] = useState<TextAnchor | null>(null);
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const endpoint = `/api/posts/${encodeURIComponent(postId)}/inline-comments`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setComments(data.comments); setCanDelete(data.canDelete); setError(""); setLoading(false);
    }).catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [endpoint, attempt]);

  useEffect(() => {
    function selectionChanged() {
      if (composing) return;
      const element = root.current;
      const selection = window.getSelection();
      if (!element || !selection?.rangeCount || selection.isCollapsed) { setAnchor(null); return; }
      const range = selection.getRangeAt(0);
      if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) { setAnchor(null); return; }
      const quote = range.toString();
      if (!quote.trim() || quote.length > 1000) { setAnchor(null); return; }
      const before = range.cloneRange();
      before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      const text = element.textContent ?? "";
      setAnchor({ quote, start, prefix: text.slice(Math.max(0, start - 60), start), suffix: text.slice(start + quote.length, start + quote.length + 60) });
    }
    document.addEventListener("selectionchange", selectionChanged);
    return () => document.removeEventListener("selectionchange", selectionChanged);
  }, [root, composing]);

  function showQuote(comment: InlineComment) {
    const range = root.current && anchorRange(root.current, comment.anchor);
    if (!range) { setError("글이 수정되어 원문 위치를 찾을 수 없습니다. 댓글의 인용 문장을 확인해주세요."); return; }
    const selection = window.getSelection();
    selection?.removeAllRanges(); selection?.addRange(range);
    range.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  async function remove(commentId: number) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${endpoint}?commentId=${commentId}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error);
      setComments(current => current.filter(comment => comment.id !== commentId));
    } catch (error) { setError(error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다."); }
    finally { setBusy(false); }
  }

  return <section className="inline-comments" aria-label="본문 댓글">
    <header><h2>본문 댓글 <small>{comments.length}</small></h2><p>본문에서 문장을 선택하면 로그인 없이 댓글을 남길 수 있어요.</p></header>
    {anchor && !composing && <button className="inline-comment-start" type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setComposing(true); requestAnimationFrame(() => { form.current?.scrollIntoView({ block: "nearest" }); form.current?.querySelector("input")?.focus(); }); }}>선택한 문장에 댓글 쓰기</button>}
    {composing && anchor && <form ref={form} onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError("");
      try {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, body, anchor }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setComments(current => [...current, data.comment]); setBody(""); setComposing(false); setAnchor(null);
      } catch (error) { setError(error instanceof Error ? error.message : "댓글을 저장하지 못했습니다."); }
      finally { setBusy(false); }
    }}>
      <blockquote>{anchor.quote}</blockquote>
      <label>이름 <input required maxLength={40} value={name} onChange={event => setName(event.target.value)} autoComplete="nickname" /></label>
      <label>댓글 <textarea required maxLength={2000} rows={3} value={body} onChange={event => setBody(event.target.value)} /></label>
      <p>이름과 댓글은 공개됩니다. 개인정보를 입력하지 마세요.</p>
      <div><button type="submit" disabled={busy || !name.trim() || !body.trim()}>{busy ? "저장 중…" : "댓글 등록"}</button><button type="button" disabled={busy} onClick={() => { setComposing(false); setAnchor(null); }}>취소</button></div>
    </form>}
    {error && <p role="alert">{error} <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></p>}
    {loading ? <p role="status">댓글을 불러오는 중…</p> : !comments.length && <p>아직 본문 댓글이 없습니다.</p>}
    <ul>{comments.map(comment => <li key={comment.id}>
      <button className="inline-comment-quote" type="button" onClick={() => showQuote(comment)} aria-label={`원문 보기: ${comment.anchor.quote}`}>“{comment.anchor.quote}”</button>
      <div><strong>{comment.name}</strong> <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("ko-KR")}</time>{canDelete && <button type="button" disabled={busy} onClick={() => void remove(comment.id)}>삭제</button>}</div>
      <p>{comment.body}</p>
    </li>)}</ul>
  </section>;
}
