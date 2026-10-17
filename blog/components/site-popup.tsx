"use client";

import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { AnnouncementIcon } from "./announcement-icon";
import type { PopupSettings } from "@/lib/site-settings";
import { useAnnouncementDismissal } from "./use-announcement-dismissal";

function PopupAction({ label, href, primary }: { label: string; href: string; primary?: boolean }) {
  if (!label.trim() || !href.trim()) return null;
  return <a className={primary ? "popup-action popup-action-primary" : "popup-action"} href={href}>{label}</a>;
}

export function SitePopup({ settings }: { settings: PopupSettings }) {
  const { open, dismissFor } = useAnnouncementDismissal("popup", settings);
  if (!settings.enabled || !settings.title.trim() || !open) return null;

  return <div className="site-popup-backdrop" role="presentation">
    <section className="site-popup" aria-modal="true" aria-labelledby="site-popup-title" role="dialog">
      <button className="site-popup-close" onClick={() => dismissFor(1)} aria-label="하루 동안 팝업 닫기"><IconXmarkLine size={20} /></button>
      {settings.image ? <img src={settings.image} alt="" /> : <div className="site-popup-placeholder"><AnnouncementIcon /></div>}
      <div className="site-popup-content"><h2 id="site-popup-title">{settings.title}</h2>{settings.description && <p>{settings.description}</p>}<div className="site-popup-actions"><PopupAction primary {...settings.primaryAction} /><PopupAction {...settings.secondaryAction} /></div><button className="popup-dismiss-week" type="button" onClick={() => dismissFor(7)}>일주일간 보지 않기</button></div>
    </section>
  </div>;
}
