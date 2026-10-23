"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { InlineComment, TextAnchor } from "@/lib/inline-comment-types";
import { anchorRange } from "@/lib/text-anchor";
import { useAdminSession } from "./admin-session";
import "./inline-comments.css";

type FloatingPoint = { top: number; left: number };

function anchorKey({ start, quote, prefix, suffix }: TextAnchor) {
  return `${start}:${quote}:${prefix}:${suffix}`;
}

function pointFor(rect: DOMRect, width: number, height = 56): FloatingPoint {
  return { left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left)), top: Math.max(12, Math.min(window.innerHeight - height - 12, rect.bottom + 10)) };
}

function composerPointFor(rect: DOMRect, width = 360, height = 56): FloatingPoint {
  const gap = 16;
  if (rect.right + gap + width + 12 > window.innerWidth) return pointFor(rect, width, height);
  return { left: rect.right + gap, top: Math.max(12, Math.min(window.innerHeight - height - 12, rect.top + (rect.height - height) / 2)) };
}

/** Selection anchored discussion UI. The persistent anchor is text context, never DOM offsets. */
export function InlineComments({ postId, root }: { postId: string; root: RefObject<HTMLDivElement | null> }) {
  const { authenticated } = useAdminSession();
  const [canCreate, setCanCreate] = useState(false);
  const canWrite = authenticated === true && canCreate;
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [anchor, setAnchor] = useState<TextAnchor | null>(null);
  const [composing, setComposing] = useState(false);
  const [composerPoint, setComposerPoint] = useState<FloatingPoint | null>(null);
  const [activeAnchorKey, setActiveAnchorKey] = useState<string | null>(null);
  const [threadPoint, setThreadPoint] = useState<FloatingPoint | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const selectionInProgress = useRef(false);
  const endpoint = `/api/posts/${encodeURIComponent(postId)}/inline-comments`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      setComments(data.comments); setCanDelete(data.canDelete === true); setCanCreate(data.canCreate === true); setError("");
    }).catch((fetchError) => {
      if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : "댓글을 불러오지 못했습니다.");
    });
    return () => controller.abort();
  }, [endpoint, attempt, authenticated]);

  useEffect(() => {
    if (!canWrite) { setComposing(false); setAnchor(null); setComposerPoint(null); }
  }, [canWrite]);

  useEffect(() => {
    if (!canWrite) return;
    function prepareComment() {
      if (composing) return;
      const element = root.current;
      const selection = window.getSelection();
      if (!element || !selection?.rangeCount || selection.isCollapsed) { setAnchor(null); setComposerPoint(null); return; }
      const range = selection.getRangeAt(0);
      if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) { setAnchor(null); setComposerPoint(null); return; }
      const quote = range.toString();
      if (!quote.trim() || quote.length > 1000) { setAnchor(null); setComposerPoint(null); return; }
      const before = range.cloneRange();
      before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      const text = element.textContent ?? "";
      setAnchor({ quote, start, prefix: text.slice(Math.max(0, start - 60), start), suffix: text.slice(start + quote.length, start + quote.length + 60) });
      setComposerPoint(composerPointFor(range.getBoundingClientRect()));
      setActiveAnchorKey(null);
      setComposing(true);
    }
    const selectionChanged = () => {
      // Browsers emit selectionchange continuously while dragging. Wait for the
      // gesture to end so the editor never covers text before it is selected.
      if (!selectionInProgress.current) prepareComment();
    };
    const startSelection = () => { selectionInProgress.current = true; };
    const finishSelection = () => {
      selectionInProgress.current = false;
      requestAnimationFrame(prepareComment);
    };
    const element = root.current;
    element?.addEventListener("pointerdown", startSelection);
    window.addEventListener("pointerup", finishSelection);
    window.addEventListener("pointercancel", finishSelection);
    document.addEventListener("selectionchange", selectionChanged);
    return () => {
      element?.removeEventListener("pointerdown", startSelection);
      window.removeEventListener("pointerup", finishSelection);
      window.removeEventListener("pointercancel", finishSelection);
      document.removeEventListener("selectionchange", selectionChanged);
    };
  }, [canWrite, composing, root]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const unwrap = () => element.querySelectorAll<HTMLElement>("mark[data-inline-comment-draft]").forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
    unwrap();
    if (!composing || !anchor) return unwrap;
    const range = anchorRange(element, anchor);
    if (!range) return unwrap;
    const marker = document.createElement("mark");
    marker.dataset.inlineCommentDraft = "true";
    try { range.surroundContents(marker); }
    catch { const fragment = range.extractContents(); marker.append(fragment); range.insertNode(marker); }
    return unwrap;
  }, [anchor, composing, root]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const unwrap = () => element.querySelectorAll<HTMLElement>("mark[data-inline-comment-anchor]").forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
    unwrap();
    const grouped = new Map<string, InlineComment[]>();
    comments.forEach((comment) => {
      const key = anchorKey(comment.anchor);
      grouped.set(key, [...(grouped.get(key) ?? []), comment]);
    });
    for (const [key, thread] of grouped) {
      const range = anchorRange(element, thread[0].anchor);
      if (!range) continue;
      const marker = document.createElement("mark");
      marker.dataset.inlineCommentAnchor = key;
      marker.tabIndex = 0;
      marker.setAttribute("role", "button");
      marker.setAttribute("aria-label", "본문 댓글 보기");
      try { range.surroundContents(marker); }
      catch { const fragment = range.extractContents(); marker.append(fragment); range.insertNode(marker); }
    }
    return unwrap;
  }, [comments, root]);

  const threads = new Map<string, InlineComment[]>();
  comments.forEach((comment) => {
    const key = anchorKey(comment.anchor);
    threads.set(key, [...(threads.get(key) ?? []), comment]);
  });
  const activeThread = activeAnchorKey ? threads.get(activeAnchorKey) : undefined;

  function openThread(key: string, element: HTMLElement) {
    setComposing(false); setActiveAnchorKey(key); setThreadPoint(pointFor(element.getBoundingClientRect(), 320, 360));
  }

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const openFromEvent = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const marker = target.closest<HTMLElement>("mark[data-inline-comment-anchor]");
      if (!marker || !element.contains(marker)) return;
      if (event instanceof KeyboardEvent) event.preventDefault();
      openThread(marker.dataset.inlineCommentAnchor ?? "", marker);
    };
    element.addEventListener("click", openFromEvent);
    element.addEventListener("keydown", openFromEvent);
    return () => { element.removeEventListener("click", openFromEvent); element.removeEventListener("keydown", openFromEvent); };
  }, [root]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setComposing(false); setAnchor(null); setComposerPoint(null); setActiveAnchorKey(null); } };
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest(".inline-comments, mark[data-inline-comment-anchor]")) return;
      setComposing(false); setAnchor(null); setComposerPoint(null); setBody(""); setActiveAnchorKey(null);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", dismiss);
    return () => { window.removeEventListener("keydown", close); window.removeEventListener("pointerdown", dismiss); };
  }, []);

  async function remove(commentId: number) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${endpoint}?commentId=${commentId}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : "댓글을 삭제하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !anchor || busy || !body.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, anchor }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setComments((current) => [...current, data.comment]);
      setActiveAnchorKey(anchorKey(data.comment.anchor));
      setThreadPoint(composerPoint);
      setBody(""); setAnchor(null); setComposerPoint(null); setComposing(false);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "댓글을 저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  return <section className="inline-comments" aria-label="본문 댓글">
    {canWrite && composing && anchor && <aside className="inline-comment-composer" role="region" aria-label="본문 댓글 작성" style={composerPoint ? { left: composerPoint.left, top: composerPoint.top, maxHeight: `calc(100dvh - ${composerPoint.top + 12}px)` } : undefined}>
      <form ref={form} onSubmit={submit} aria-busy={busy}>
        <div className="inline-comment-entry">
          <textarea required maxLength={2000} rows={2} value={body} onChange={(event) => { setBody(event.target.value); event.target.style.height = "auto"; event.target.style.height = `${event.target.scrollHeight}px`; }} placeholder="댓글 추가…" aria-label="댓글" onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); form.current?.requestSubmit(); }
          }} />
          <button className="inline-comment-send" type="submit" disabled={busy || !body.trim()} aria-label={busy ? "댓글 등록 중" : "댓글 등록"} title="댓글 등록 (⌘/Ctrl + Enter)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        </div>
        {error && <p className="inline-comment-error" role="alert">{error}</p>}
      </form>
    </aside>}
    {activeThread && threadPoint && <aside className="inline-comment-thread" role="region" aria-label="선택한 문장 댓글" style={{ left: threadPoint.left, top: threadPoint.top, maxHeight: `min(28rem, calc(100dvh - ${threadPoint.top + 12}px))` }}><header><strong>댓글</strong><button type="button" aria-label="댓글 창 닫기" onClick={() => setActiveAnchorKey(null)}>×</button></header><blockquote>{activeThread[0].anchor.quote}</blockquote><ul>{activeThread.map((comment) => <li key={comment.id}><div><strong>{comment.name}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("ko-KR")}</time>{canDelete && <button type="button" disabled={busy} onClick={() => void remove(comment.id)}>삭제</button>}</div><p>{comment.body}</p></li>)}</ul></aside>}
    {error && !composing && <p className="inline-comment-error" role="alert">{error} <button type="button" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>다시 시도</button></p>}
  </section>;
}
