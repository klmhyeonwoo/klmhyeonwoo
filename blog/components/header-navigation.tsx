"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAdminSession } from "./admin-session";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";
import { useToast } from "./toast-provider";

export function HeaderNavigation() {
  const { authenticated, updateSession } = useAdminSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const pending = useRef(false);
  const router = useRouter();
  const toast = useToast();
  async function logout() {
    if (pending.current) return;
    pending.current = true; setLoggingOut(true);
    try {
      const response = await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Logout failed");
      updateSession(false);
      toast({ message: "로그아웃했어요.", tone: "success" });
      router.replace("/");
      router.refresh();
    } catch { toast({ message: "로그아웃하지 못했어요. 다시 시도해 주세요.", tone: "error" }); }
    finally { pending.current = false; setLoggingOut(false); }
  }
  return <div className="header-actions">
    <nav aria-label="주요 메뉴" className="desktop-nav">
      <Link href="/#all">모든 글</Link><Link href="/series">아티클 시리즈</Link><Link href="/profile">프로필</Link>
      {authenticated && <><Link href="/ykk" prefetch={false}>글쓰기</Link><Link href="/manage" prefetch={false}>블로그 관리</Link><button type="button" className="header-logout" disabled={loggingOut} onClick={logout}>{loggingOut ? "로그아웃 중…" : "로그아웃"}</button></>}
    </nav>
    <MobileMenu authenticated={authenticated === true} onLogout={logout} loggingOut={loggingOut}/>
    <ThemeToggle/>
  </div>;
}
