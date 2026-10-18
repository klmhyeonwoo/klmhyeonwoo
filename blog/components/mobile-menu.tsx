"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconHorizline3VerticalLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";

export function MobileMenu({ authenticated }: { authenticated: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return <div className={`mobile-menu${open ? " is-open" : ""}`}>
    <button aria-expanded={open} aria-label={open ? "메뉴 닫기" : "메뉴 열기"} className="mobile-menu-trigger" onClick={() => setOpen((current) => !current)}>{open ? <IconXmarkLine size={24} /> : <IconHorizline3VerticalLine size={24} />}</button>
    {open && <><button className="mobile-menu-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} /><nav aria-label="모바일 메뉴" className="mobile-menu-panel"><Link href="/#all" onClick={() => setOpen(false)}>모든 글</Link><Link href="/series" onClick={() => setOpen(false)}>아티클 시리즈</Link><Link href="/profile" onClick={() => setOpen(false)}>프로필</Link>{authenticated && <><Link href="/ykk" onClick={() => setOpen(false)}>글쓰기</Link><Link href="/manage" onClick={() => setOpen(false)}>블로그 관리</Link></>}</nav></>}
  </div>;
}
