import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const authenticated = await isAdmin();

  return (
    <header className="shared-header">
      <div className="shared-header-inner">
        <Link href="/" className="shared-logo">현우의 <strong>기록</strong></Link>
        <div className="header-actions">
          <nav aria-label="주요 메뉴">
            <Link href="/#all">모든 글</Link>
            <Link href="/#topics">주제별 보기</Link>
            <Link href="/profile">프로필</Link>
            {authenticated && <Link href="/ykk">글쓰기</Link>}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
