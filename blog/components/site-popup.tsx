"use client";

import { useState } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { AnnouncementIcon } from "./announcement-icon";
import type { PopupSettings } from "@/lib/site-settings";

function PopupAction({ label, href, primary }: { label: string; href: string; primary?: boolean }) {
  if (!label.trim() || !href.trim()) return null;
  return <a className={primary ? "popup-action popup-action-primary" : "popup-action"} href={href}>{label}</a>;
}

export function SitePopup({ settings }: { settings: PopupSettings }) {
  const [open, setOpen] = useState(true);
  if (!settings.enabled || !settings.title.trim() || !open) return null;

  return <div className="site-popup-backdrop" role="presentation">
    <section className="site-popup" aria-modal="true" aria-labelledby="site-popup-title" role="dialog">
      <button className="site-popup-close" onClick={() => setOpen(false)} aria-label="팝업 닫기"><IconXmarkLine size={20} /></button>
      {settings.image ? <img src={settings.image} alt="" /> : <div className="site-popup-placeholder"><AnnouncementIcon /></div>}
      <div className="site-popup-content"><h2 id="site-popup-title">{settings.title}</h2>{settings.description && <p>{settings.description}</p>}<div className="site-popup-actions"><PopupAction primary {...settings.primaryAction} /><PopupAction {...settings.secondaryAction} /></div></div>
    </section>
  </div>;
}
