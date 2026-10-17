"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { formatPostDate } from "@/lib/post-date";
import type { PostMeta } from "@/lib/posts";
import type { Category } from "@/lib/posts";
import { CategoryManager } from "./category-manager";

const Editor = dynamic(() => import("./editor"), { ssr: false });

type InitialPost = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  isPrivate: boolean;
  blocks: unknown[];
};

type DraftMeta = InitialPost & { updatedAt: string };

type Props = { authenticated: boolean; showAlreadyLoggedIn: boolean; initialPost: InitialPost | null; initialDraft: DraftMeta | null; posts: PostMeta[]; drafts: DraftMeta[]; categories: Category[] };

type Draft = {
  title: string;
  description: string;
  categoryId: string;
  isPrivate: boolean;
  markdown: string;
  blocks: unknown[];
};

export function AdminClient({ authenticated: initiallyAuthenticated, showAlreadyLoggedIn: shouldShowAlreadyLoggedIn, initialPost, initialDraft, posts, drafts, categories: initialCategories }: Props) {
  const initialEntry = initialPost ?? initialDraft;
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [adminPassword, setAdminPassword] = useState("");
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [postId, setPostId] = useState<string | null>(initialEntry?.id ?? null);
  const [description, setDescription] = useState(initialEntry?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialEntry?.categoryId ?? initialCategories[0]?.id ?? "essay");
  const [categories, setCategories] = useState(initialCategories);
  const [isPrivate, setIsPrivate] = useState(initialEntry?.isPrivate ?? false);
  const [postPassword, setPostPassword] = useState("");
  const [isDraft, setIsDraft] = useState(Boolean(initialDraft));
  const [markdown, setMarkdown] = useState("");
  const [blocks, setBlocks] = useState<unknown[]>([]);
  const [initialBlocks, setInitialBlocks] = useState<unknown[]>(initialEntry?.blocks ?? []);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [showAlreadyLoggedIn, setShowAlreadyLoggedIn] = useState(shouldShowAlreadyLoggedIn);
  const draftKey = `blog-draft:${postId ?? "new"}`;

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft) as Partial<Draft>;
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.categoryId === "string") setCategoryId(draft.categoryId);
      if (typeof draft.isPrivate === "boolean") setIsPrivate(draft.isPrivate);
      if (typeof draft.markdown === "string") setMarkdown(draft.markdown);
      if (Array.isArray(draft.blocks)) {
        setBlocks(draft.blocks);
        setInitialBlocks(draft.blocks);
      }
      setDraftStatus("임시 저장본을 불러왔어요");
    } catch {
      window.localStorage.removeItem(draftKey);
    } finally {
      setDraftReady(true);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!showAlreadyLoggedIn) return;
    const timer = window.setTimeout(() => setShowAlreadyLoggedIn(false), 3200);
    return () => window.clearTimeout(timer);
  }, [showAlreadyLoggedIn]);

  useEffect(() => {
    if (!draftReady) return;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ title, description, categoryId, isPrivate, markdown, blocks }));
      setDraftStatus("임시 저장됨");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [blocks, categoryId, description, draftKey, draftReady, isPrivate, markdown, title]);

  const updateContent = useCallback((nextBlocks: unknown[], nextMarkdown: string) => {
    setBlocks(nextBlocks);
    setMarkdown(nextMarkdown);
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    });
    if (response.ok) setAuthenticated(true);
    else setMessage((await response.json()).error);
  }

  async function publish() {
    setMessage("");
    setPublishedPostId(null);
    setSaving(true);
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, id: postId, description, categoryId, markdown, blocks, isPrivate, fromDraft: isDraft, password: postPassword }),
      });

      if (response.ok) {
        const { id } = await response.json() as { id: string };
        window.localStorage.removeItem(draftKey);
        setDraftStatus("발행됨");
        setPostId(id);
        setIsDraft(false);
        setPostPassword("");
        const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        setPublishedPostId(localPreview ? null : id);
        setMessage(localPreview ? "GitHub에 저장했습니다. 로컬에서 보려면 최신 변경을 받아오세요." : "GitHub에 저장했습니다. 배포가 끝나면 아래에서 글을 열 수 있습니다.");
      } else {
        setMessage((await response.json()).error);
      }
    } catch {
      setMessage("발행 중 연결 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    setMessage("");
    setSavingDraft(true);
    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, id: postId, description, categoryId, markdown, blocks, isPrivate }),
      });

      if (response.ok) {
        const { id } = await response.json() as { id: string };
        window.localStorage.removeItem(draftKey);
        setPostId(id);
        setIsDraft(true);
        setDraftStatus("GitHub에 임시 저장됨");
        setMessage("GitHub에 임시 저장했습니다. /ykk의 임시글 목록에서 이어서 작성할 수 있습니다.");
      } else {
        setMessage((await response.json()).error);
      }
    } catch {
      setMessage("임시 저장 중 연결 오류가 발생했습니다.");
    } finally {
      setSavingDraft(false);
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-shell login">
        <p className="eyebrow">PRIVATE</p>
        <h1>글 쓰기</h1>
        <form onSubmit={submitLogin}>
          <label htmlFor="password">관리자 비밀번호</label>
          <Input id="password" type="password" value={adminPassword} onValueChange={setAdminPassword} autoFocus required />
          <Button type="submit">계속하기</Button>
        </form>
        {message && <p className="notice error">{message}</p>}
      </main>
    );
  }

  return (
    <main className="admin-shell">
      {showAlreadyLoggedIn && <p className="toast success" role="status">이미 로그인되어 있습니다.</p>}
      <header className="admin-header">
        <p className="eyebrow">{isDraft ? "DRAFT" : initialPost ? "EDITING" : "NEW POST"}</p>
        <div className="admin-actions">
          {draftStatus && <span className="draft-status">{draftStatus}</span>}
          <Link href="/ykk">새 글</Link>
          <Button className="draft-button" onClick={saveDraft} disabled={saving || savingDraft}>{savingDraft ? "임시 저장 중…" : "임시 저장"}</Button>
          <Button onClick={publish} disabled={saving || savingDraft}>{saving ? "저장 중…" : "발행하기"}</Button>
        </div>
      </header>
      <Input className="title-input" value={title} onValueChange={setTitle} placeholder="글 제목" aria-label="글 제목" />
      <div className="metadata">
        <Input value={description} onValueChange={setDescription} placeholder="짧은 소개 (선택)" aria-label="짧은 소개" />
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="카테고리">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <label className="private-toggle"><input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />비밀번호 보호 글</label>
        {isPrivate && <Input type="password" value={postPassword} onValueChange={setPostPassword} placeholder={initialEntry?.isPrivate ? "새 비밀번호 입력 (변경할 때만)" : "글 비밀번호 (4자 이상)"} aria-label="글 비밀번호" />}
      </div>
      {draftReady ? <Editor initialBlocks={initialBlocks} onChange={updateContent} /> : <section className="editor-loading">임시 저장본을 불러오는 중…</section>}
      {message && <div className={`notice ${message.startsWith("GitHub") ? "success" : "error"}`}><p>{message}</p>{publishedPostId && <Link className="published-link" href={`/posts/${publishedPostId}`}>발행된 글 보기 →</Link>}</div>}
      <section className="draft-list">
        <p className="eyebrow">DRAFTS</p>
        {drafts.length > 0 ? drafts.map((draft) => <Link key={draft.id} href={`/ykk?draft=${draft.id}`}>{draft.title || "제목 없는 임시글"}<span>{formatPostDate(draft.updatedAt)}</span></Link>) : <p className="empty-list">저장된 임시글이 없습니다.</p>}
      </section>
      <CategoryManager categories={categories} onChange={setCategories} />
      <section className="draft-list">
        <p className="eyebrow">PUBLISHED POSTS</p>
        {posts.map((post) => <Link key={post.id} href={`/ykk?id=${post.id}`}>{post.isPrivate && "🔒 "}{post.title}<span>{formatPostDate(post.date)}</span></Link>)}
      </section>
    </main>
  );
}
