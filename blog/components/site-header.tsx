import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { SiteBanner } from "./site-banner";
import { MobileMenu } from "./mobile-menu";
import { SitePopup } from "./site-popup";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader({ authenticated: authenticatedFromPage }: { authenticated?: boolean } = {}) {
  const authenticated = authenticatedFromPage ?? await isAdmin();
  const settings = getSiteSettings();

  return (
    <>
      <header className="shared-header">
        <div className="shared-header-inner">
          <Link href="/" className="shared-logo">wavy studio</Link>
          <div className="header-actions">
            <nav aria-label="주요 메뉴" className="desktop-nav">
              <Link href="/#all">모든 글</Link>
              <Link href="/series">아티클 시리즈</Link>
              <Link href="/profile">프로필</Link>
              {authenticated && <Link href="/ykk">글쓰기</Link>}
              {authenticated && <Link href="/manage">블로그 관리</Link>}
            </nav>
            <MobileMenu authenticated={authenticated} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <SiteBanner settings={settings.banner} />
      <SitePopup settings={settings.popup} />
    </>
  );
}
