"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import type { Category } from "@/lib/posts";

type Props = { categories: Category[]; onChange: (categories: Category[]) => void };

function categoryId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "").replace(/[가-힣]/g, "") || `category-${crypto.randomUUID().slice(0, 8)}`;
}

export function CategoryManager({ categories, onChange }: Props) {
  const [draft, setDraft] = useState(categories);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setDraft(categories), [categories]);

  async function save(next = draft) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/categories", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ categories: next }) });
      const payload = await response.json() as { categories?: Category[]; error?: string };
      if (!response.ok || !payload.categories) throw new Error(payload.error ?? "카테고리를 저장하지 못했습니다.");
      onChange(payload.categories);
      setMessage("저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "카테고리를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const next = [...draft, { id: categoryId(name), name }];
    setDraft(next);
    setNewName("");
  }

  return <section className="category-manager"><div className="category-manager-header"><p className="eyebrow">CATEGORIES</p><Button onClick={() => save()} disabled={saving}>{saving ? "저장 중…" : "변경 저장"}</Button></div>
    {draft.map((category, index) => <div className="category-row" key={category.id}><Input value={category.name} onValueChange={(name) => setDraft(draft.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item))} aria-label={`${category.name} 이름`} /><Button className="category-delete" onClick={() => setDraft(draft.filter((_, itemIndex) => itemIndex !== index))} aria-label={`${category.name} 삭제`}>삭제</Button></div>)}
    <form className="category-add" onSubmit={addCategory}><Input value={newName} onValueChange={setNewName} placeholder="새 카테고리" aria-label="새 카테고리" /><Button type="submit">추가</Button></form>
    {message && <p className="category-message">{message}</p>}
  </section>;
}
