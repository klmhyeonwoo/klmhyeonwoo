"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import type { PostMeta } from "@/lib/posts";

const Editor = dynamic(() => import("./editor"), { ssr: false });

type InitialPost = {
  slug: string;
  title: string;
  description: string;
  blocks: unknown[];
};

type Props = { authenticated: boolean; initialPost: InitialPost | null; posts: PostMeta[] };

type Draft = {
  title: string;
  slug: string;
  description: string;
  markdown: string;
  blocks: unknown[];
};

export function AdminClient({ authenticated: initiallyAuthenticated, initialPost, posts }: Props) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [slug, setSlug] = useState(initialPost?.slug ?? "");
  const [description, setDescription] = useState(initialPost?.description ?? "");
  const [markdown, setMarkdown] = useState("");
  const [blocks, setBlocks] = useState<unknown[]>([]);
  const [initialBlocks, setInitialBlocks] = useState<unknown[]>(initialPost?.blocks ?? []);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const draftKey = `blog-draft:${initialPost?.slug ?? "new"}`;

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft) as Partial<Draft>;
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.slug === "string") setSlug(draft.slug);
      if (typeof draft.description === "string") setDescription(draft.description);
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
    if (!draftReady) return;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ title, slug, description, markdown, blocks }));
      setDraftStatus("임시 저장됨");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [blocks, description, draftKey, draftReady, markdown, slug, title]);

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
      body: JSON.stringify({ password }),
    });
    if (response.ok) setAuthenticated(true);
    else setMessage((await response.json()).error);
  }

  async function publish() {
    setMessage("");
    setSaving(true);
    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, slug, description, markdown, blocks }),
    });
    setSaving(false);

    if (response.ok) {
      window.localStorage.removeItem(draftKey);
      setDraftStatus("발행됨");
      setMessage("GitHub에 저장했습니다. 배포가 끝나면 공개됩니다.");
    } else {
      setMessage((await response.json()).error);
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-shell login">
        <p className="eyebrow">PRIVATE</p>
        <h1>글 쓰기</h1>
        <form onSubmit={submitLogin}>
          <label htmlFor="password">관리자 비밀번호</label>
          <Input id="password" type="password" value={password} onValueChange={setPassword} autoFocus required />
          <Button type="submit">계속하기</Button>
        </form>
        {message && <p className="notice error">{message}</p>}
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <p className="eyebrow">{initialPost ? "EDITING" : "DRAFT"}</p>
        <div className="admin-actions">
          {draftStatus && <span className="draft-status">{draftStatus}</span>}
          <Link href="/admin">새 글</Link>
          <Button onClick={publish} disabled={saving}>{saving ? "저장 중…" : "발행하기"}</Button>
        </div>
      </header>
      <Input className="title-input" value={title} onValueChange={setTitle} placeholder="글 제목" aria-label="글 제목" />
      <div className="metadata">
        <Input value={slug} onValueChange={(value) => setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug (예: block-editor)" aria-label="URL slug" />
        <Input value={description} onValueChange={setDescription} placeholder="짧은 소개 (선택)" aria-label="짧은 소개" />
      </div>
      {draftReady ? <Editor initialBlocks={initialBlocks} onChange={updateContent} /> : <section className="editor-loading">임시 저장본을 불러오는 중…</section>}
      {message && <p className={`notice ${message.startsWith("GitHub") ? "success" : "error"}`}>{message}</p>}
      <section className="draft-list">
        <p className="eyebrow">EDIT EXISTING POST</p>
        {posts.map((post) => <Link key={post.slug} href={`/admin?slug=${post.slug}`}>{post.title}<span>{post.date}</span></Link>)}
      </section>
    </main>
  );
}
