import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import { SiteBanner } from "./site-banner";
import { HeaderNavigation } from "./header-navigation";
import { SitePopup } from "./site-popup";
import { OceanWaves } from "./ocean-waves";

export async function SiteHeader() {
  const settings = getSiteSettings();

  return (
    <>
      <header className="shared-header">
        <OceanWaves />
        <div className="shared-header-inner">
          <Link href="/" className="shared-logo">wavy studio</Link>
          <HeaderNavigation />
        </div>
      </header>
      <SiteBanner settings={settings.banner} />
      <SitePopup settings={settings.popup} />
    </>
  );
}
