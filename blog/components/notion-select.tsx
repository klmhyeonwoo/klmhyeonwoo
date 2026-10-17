"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

export type SelectOption = { id: string; name: string };

type Props = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  allowEmpty?: boolean;
  onValueChange: (value: string) => void;
  onCreate: (name: string) => Promise<SelectOption | null>;
  onDelete: (id: string) => Promise<boolean>;
};

export function NotionSelect({ label, value, options, placeholder, allowEmpty = false, onValueChange, onCreate, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.id === value);
  const normalizedQuery = query.trim();
  const matches = options.filter((item) => item.name.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase()));
  const canCreate = normalizedQuery.length > 0 && !options.some((item) => item.name.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase());

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function create() {
    if (!canCreate || creating) return;
    setCreating(true);
    const created = await onCreate(normalizedQuery);
    setCreating(false);
    if (!created) return;
    onValueChange(created.id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") setOpen(false);
    if (event.key === "Enter") {
      event.preventDefault();
      void create();
    }
  }

  async function remove(id: string) {
    const deleted = await onDelete(id);
    if (!deleted) return;
    if (value === id) onValueChange(allowEmpty ? "" : options.find((item) => item.id !== id)?.id ?? "");
  }

  return <div className="notion-select" ref={root}>
    <span className="notion-select-label">{label}</span>
    <button className="notion-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
      {selected ? <span className="notion-select-chip">{selected.name}</span> : <span className="notion-select-placeholder">{placeholder}</span>}
      {selected && allowEmpty && <span className="notion-select-clear" onClick={(event) => { event.stopPropagation(); onValueChange(""); }}>×</span>}
    </button>
    {open && <div className="notion-select-menu"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="옵션 선택 또는 생성" aria-label={`${label} 검색 또는 생성`} />
      <div className="notion-select-options" role="listbox">
        {allowEmpty && <button type="button" role="option" aria-selected={!value} onClick={() => { onValueChange(""); setOpen(false); }}>선택 안 함</button>}
        {matches.map((item) => <div className="notion-select-option" key={item.id}><button className={item.id === value ? "selected" : ""} type="button" role="option" aria-selected={item.id === value} onClick={() => { onValueChange(item.id); setQuery(""); setOpen(false); }}><span>{item.name}</span>{item.id === value && <b>✓</b>}</button><button className="notion-select-delete" type="button" onClick={() => void remove(item.id)} aria-label={`${item.name} 삭제`}>삭제</button></div>)}
        {canCreate && <button className="notion-select-create" type="button" onClick={() => void create()} disabled={creating}>생성 <span>{creating ? "저장 중…" : normalizedQuery}</span></button>}
      </div>
    </div>}
  </div>;
}
