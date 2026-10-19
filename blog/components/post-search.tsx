"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SearchablePost = {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  series?: string;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function searchHref(query: string, category?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  const value = params.toString();
  return value ? `/?${value}` : "/";
}

export function PostSearch({ categoryId, initialQuery, posts }: { categoryId?: string; initialQuery: string; posts: SearchablePost[] }) {
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const needle = normalize(query);
  const suggestions = useMemo(() => {
    if (!needle) return { posts: [], topics: [] as Array<{ label: string; href: string; type: string }> };

    const matchedPosts = posts
      .map((post) => {
        const title = normalize(post.title);
        const context = normalize(`${post.category} ${post.series ?? ""}`);
        const score = title.startsWith(needle) ? 3 : title.includes(needle) ? 2 : context.includes(needle) ? 1 : 0;
        return { post, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.post.title.localeCompare(b.post.title, "ko"))
      .slice(0, 4)
      .map((item) => item.post);

    const topics = Array.from(new Set(posts.flatMap((post) => [
      { label: post.category, href: searchHref("", post.categoryId), type: "카테고리" },
      ...(post.series ? [{ label: post.series, href: searchHref(post.series, categoryId), type: "시리즈" }] : []),
    ]).filter((topic) => normalize(topic.label).includes(needle)).map((topic) => [topic.type, topic.label, topic.href].join("\u0000"))))
      .map((topic) => {
        const [type, label, href] = topic.split("\u0000");
        return { type, label, href };
      })
      .slice(0, 3);

    return { posts: matchedPosts, topics };
  }, [categoryId, needle, posts]);
  const hasSuggestions = suggestions.posts.length > 0 || suggestions.topics.length > 0;

  return <form action="/" className="kb-post-search" role="search">
    {categoryId && <input name="category" type="hidden" value={categoryId} />}
    <label className="sr-only" htmlFor="post-search">게시글 검색</label>
    <input
      aria-autocomplete="list"
      aria-controls="post-search-suggestions"
      aria-expanded={open && hasSuggestions}
      autoComplete="off"
      id="post-search"
      name="q"
      onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      onChange={(event) => {
        setQuery(event.currentTarget.value);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.currentTarget.blur();
        }
      }}
      placeholder="게시글 검색"
      type="search"
      value={query}
    />
    <button type="submit">검색</button>
    {open && hasSuggestions && <aside aria-label="연관 검색어" className="kb-search-suggestions" id="post-search-suggestions">
      {suggestions.posts.length > 0 && <section>
        <p>관련 글</p>
        {suggestions.posts.map((post) => <Link href={`/posts/${post.id}`} key={post.id} onMouseDown={(event) => event.preventDefault()}><strong>{post.title}</strong><small>{post.series || post.category}</small></Link>)}
      </section>}
      {suggestions.topics.length > 0 && <section>
        <p>관련 주제</p>
        {suggestions.topics.map((topic) => <Link href={topic.href} key={`${topic.type}-${topic.label}`} onMouseDown={(event) => event.preventDefault()}><span>{topic.type}</span>{topic.label}</Link>)}
      </section>}
      <Link className="kb-search-all" href={searchHref(query, categoryId)} onMouseDown={(event) => event.preventDefault()}>“{query.trim()}” 전체 검색</Link>
    </aside>}
  </form>;
}

