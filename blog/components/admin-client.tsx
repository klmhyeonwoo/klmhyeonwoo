"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { formatPostDate } from "@/lib/post-date";
import type { PostMeta } from "@/lib/posts";
import type { Category } from "@/lib/posts";
import type { Series } from "@/lib/series";
import { NotionSelect, type SelectOption } from "./notion-select";
import type { EditorMention } from "./editor";
import { waitForDeployment } from "./deployment-waiter";
import { ToastMessage } from "./toast-message";

const Editor = dynamic(() => import("./editor"), { ssr: false });

type InitialPost = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  seriesId: string;
  isPrivate: boolean;
  blocks: unknown[];
};

type DraftMeta = InitialPost & { updatedAt: string };

type Props = { authenticated: boolean; initialPost: InitialPost | null; initialDraft: DraftMeta | null; defaultSeriesId?: string; posts: PostMeta[]; drafts: DraftMeta[]; categories: Category[]; series: Series[] };

type Draft = {
  title: string;
  description: string;
  categoryId: string;
  seriesId: string;
  isPrivate: boolean;
  markdown: string;
  blocks: unknown[];
};

function messageTone(message: string) {
  if (message.includes("배포") && !message.includes("완료")) return "info" as const;
  return /저장했|저장됨|발행됨|완료되었|로그인되어/.test(message) ? "success" as const : "error" as const;
}

function optionId(name: string, prefix: string) {
  const normalized = name.trim().toLowerCase().replace(/[가-힣]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function TitleField({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "0px";
    input.style.height = `${Math.max(input.scrollHeight, 56)}px`;
  }, []);

  useLayoutEffect(resize, [resize, value]);

  return <textarea
    aria-label="글 제목"
    className="title-input"
    onChange={(event) => onValueChange(event.target.value)}
    onInput={resize}
    placeholder="글 제목"
    ref={inputRef}
    rows={1}
    value={value}
  />;
}

export function AdminClient({ authenticated: initiallyAuthenticated, initialPost, initialDraft, defaultSeriesId, posts, drafts, categories: initialCategories, series: initialSeries }: Props) {
  const initialEntry = initialPost ?? initialDraft;
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [adminPassword, setAdminPassword] = useState("");
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [postId, setPostId] = useState<string | null>(initialEntry?.id ?? null);
  const [description, setDescription] = useState(initialEntry?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialEntry?.categoryId ?? initialCategories[0]?.id ?? "essay");
  const [seriesId, setSeriesId] = useState(initialEntry?.seriesId ?? defaultSeriesId ?? "");
  const [categories, setCategories] = useState(initialCategories);
  const [series, setSeries] = useState(initialSeries);
  const [isPrivate, setIsPrivate] = useState(initialEntry?.isPrivate ?? false);
  const [postPassword, setPostPassword] = useState("");
  const isDraftRef = useRef(Boolean(initialDraft));
  const [markdown, setMarkdown] = useState("");
  const [blocks, setBlocks] = useState<unknown[]>([]);
  const [initialBlocks, setInitialBlocks] = useState<unknown[]>(initialEntry?.blocks ?? []);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<{ id: string; version: string; shouldRedirect: boolean } | null>(null);
  const draftKey = `blog-draft:${postId ?? "new"}`;
  const editorMentions = useMemo<EditorMention[]>(() => [
    { title: "프로필", href: "/profile", description: "블로그 운영자" },
    { title: "아티클 시리즈", href: "/series", description: "시리즈 모음" },
    ...series.map((item) => ({ title: item.name, href: `/series/${item.id}`, description: "아티클 시리즈" })),
    ...posts.map((item) => ({ title: item.title, href: `/posts/${item.id}`, description: "게시글" })),
  ], [posts, series]);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft) as Partial<Draft>;
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.categoryId === "string") setCategoryId(draft.categoryId);
      if (typeof draft.seriesId === "string") setSeriesId(draft.seriesId);
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
    if (!deployment) return;
    const controller = new AbortController();

    void waitForDeployment({ ...deployment, signal: controller.signal }).then((ready) => {
      if (controller.signal.aborted) return;
      if (!ready) {
        setMessage("배포 확인에 시간이 걸리고 있습니다. 잠시 후 공개 글에서 확인해 주세요.");
        return;
      }
      setDeployment(null);
      setPublishedPostId(deployment.id);
      setMessage("배포가 완료되었습니다.");
      if (deployment.shouldRedirect) window.location.assign(`/posts/${deployment.id}`);
    });

    return () => controller.abort();
  }, [deployment]);

  useEffect(() => {
    if (!draftReady) return;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ title, description, categoryId, seriesId, isPrivate, markdown, blocks }));
      setDraftStatus("임시 저장됨");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [blocks, categoryId, description, draftKey, draftReady, isPrivate, markdown, seriesId, title]);

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
        body: JSON.stringify({ title, id: postId, description, categoryId, seriesId, markdown, blocks, isPrivate, fromDraft: isDraftRef.current, password: postPassword }),
      });

      if (response.ok) {
        const { id, version } = await response.json() as { id: string; version: string };
        window.localStorage.removeItem(draftKey);
        setDraftStatus("발행됨");
        setPostId(id);
        isDraftRef.current = false;
        setPostPassword("");
        const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        if (localPreview) {
          setMessage("GitHub에 저장했습니다. 로컬에서 보려면 최신 변경을 받아오세요.");
        } else {
          const isNewPost = postId === null;
          setDeployment({ id, version, shouldRedirect: isNewPost });
          setMessage(isNewPost ? "GitHub에 저장했습니다. 배포가 끝나면 글로 이동합니다." : "GitHub에 저장했습니다. 배포 완료를 확인하고 있습니다.");
        }
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
        body: JSON.stringify({ title, id: postId, description, categoryId, seriesId, markdown, blocks, isPrivate }),
      });

      if (response.ok) {
        const { id } = await response.json() as { id: string };
        window.localStorage.removeItem(draftKey);
        setPostId(id);
        isDraftRef.current = true;
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

  async function createCategory(name: string): Promise<SelectOption | null> {
    const existing = categories.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) return existing;
    const next = [...categories, { id: optionId(name, "category"), name }];
    try {
      const response = await fetch("/api/categories", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ categories: next }) });
      const payload = await response.json() as { categories?: Category[]; error?: string };
      if (!response.ok || !payload.categories) throw new Error(payload.error ?? "카테고리를 저장하지 못했습니다.");
      setCategories(payload.categories);
      return payload.categories.at(-1) ?? null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "카테고리를 저장하지 못했습니다.");
      return null;
    }
  }

  async function createSeries(name: string): Promise<SelectOption | null> {
    const existing = series.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) return existing;
    const next = [...series, { id: optionId(name, "series"), name, description: "" }];
    try {
      const response = await fetch("/api/series", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ series: next }) });
      const payload = await response.json() as { series?: Series[]; error?: string };
      if (!response.ok || !payload.series) throw new Error(payload.error ?? "시리즈를 저장하지 못했습니다.");
      setSeries(payload.series);
      return payload.series.at(-1) ?? null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "시리즈를 저장하지 못했습니다.");
      return null;
    }
  }

  async function deleteCategory(id: string) {
    if (categories.length === 1) {
      setMessage("카테고리는 하나 이상 남겨야 합니다.");
      return false;
    }
    if (!window.confirm("카테고리를 삭제할까요? 연결된 글은 미분류로 표시됩니다.")) return false;
    const next = categories.filter((item) => item.id !== id);
    try {
      const response = await fetch("/api/categories", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ categories: next }) });
      const payload = await response.json() as { categories?: Category[]; error?: string };
      if (!response.ok || !payload.categories) throw new Error(payload.error ?? "카테고리를 삭제하지 못했습니다.");
      setCategories(payload.categories);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "카테고리를 삭제하지 못했습니다.");
      return false;
    }
  }

  async function deleteSeries(id: string) {
    if (!window.confirm("시리즈를 삭제할까요? 연결된 글은 시리즈 없음으로 표시됩니다.")) return false;
    const next = series.filter((item) => item.id !== id);
    try {
      const response = await fetch("/api/series", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ series: next }) });
      const payload = await response.json() as { series?: Series[]; error?: string };
      if (!response.ok || !payload.series) throw new Error(payload.error ?? "시리즈를 삭제하지 못했습니다.");
      setSeries(payload.series);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "시리즈를 삭제하지 못했습니다.");
      return false;
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-shell login">
        <h1>글 쓰기</h1>
        <form onSubmit={submitLogin}>
          <label htmlFor="password">관리자 비밀번호</label>
          <Input id="password" type="password" value={adminPassword} onValueChange={setAdminPassword} autoFocus required />
          <Button type="submit">계속하기</Button>
        </form>
        <ToastMessage message={message} tone="error" />
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-actions">
          {draftStatus && <span className="draft-status">{draftStatus}</span>}
          <Link className="new-post-button" href="/ykk">새 글</Link>
          <Button className="draft-button" onClick={saveDraft} disabled={saving || savingDraft}>{savingDraft ? "임시 저장 중…" : "임시 저장"}</Button>
          <Button onClick={publish} disabled={saving || savingDraft}>{saving ? "저장 중…" : "발행하기"}</Button>
        </div>
      </header>
      <TitleField value={title} onValueChange={setTitle} />
      <div className="metadata">
        <Input value={description} onValueChange={setDescription} placeholder="짧은 소개 (선택)" aria-label="짧은 소개" />
        <div className="metadata-selects"><NotionSelect label="카테고리" value={categoryId} options={categories} placeholder="카테고리 선택" onValueChange={setCategoryId} onCreate={createCategory} onDelete={deleteCategory} /><NotionSelect label="아티클 시리즈" value={seriesId} options={series} placeholder="시리즈 없음" allowEmpty onValueChange={setSeriesId} onCreate={createSeries} onDelete={deleteSeries} /></div>
        <div className="private-post-controls">
          <label className="private-toggle"><input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />비밀번호 보호 글</label>
          {isPrivate && <Input className="private-password-input" type="password" value={postPassword} onValueChange={setPostPassword} placeholder={initialEntry?.isPrivate ? "새 비밀번호 입력 (변경할 때만)" : "글 비밀번호 (4자 이상)"} aria-label="글 비밀번호" />}
        </div>
      </div>
      {draftReady ? <Editor initialBlocks={initialBlocks} mentions={editorMentions} onChange={updateContent} /> : <section className="editor-loading">임시 저장본을 불러오는 중…</section>}
      <ToastMessage message={message} tone={messageTone(message)} />
      {publishedPostId && <Link className="published-link" href={`/posts/${publishedPostId}`}>발행된 글 보기</Link>}
      <section className="draft-list">
        <h2>임시글</h2>
        {drafts.length > 0 ? drafts.map((draft) => <Link key={draft.id} href={`/ykk?draft=${draft.id}`}>{draft.title || "제목 없는 임시글"}<span>{formatPostDate(draft.updatedAt)}</span></Link>) : <p className="empty-list">저장된 임시글이 없습니다.</p>}
      </section>
      <section className="draft-list">
        <h2>발행한 글</h2>
        {posts.map((post) => <Link key={post.id} href={`/ykk?id=${post.id}`}>{post.isPrivate && "🔒 "}{post.title}<span>{formatPostDate(post.date)}</span></Link>)}
      </section>
    </main>
  );
}
