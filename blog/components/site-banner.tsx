"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import type { BannerSettings } from "@/lib/site-settings";

export function SiteBanner({ settings }: { settings: BannerSettings }) {
  const [open, setOpen] = useState(true);
  if (!settings.enabled || !settings.title.trim() || !open) return null;
  const hasAction = settings.action.label.trim() && settings.action.href.trim();

  return <aside className="site-banner" style={{ "--banner-background": settings.backgroundColor, "--banner-text": settings.textColor } as CSSProperties}>
    <div className="site-banner-inner"><div className="site-banner-copy"><p>{settings.title}</p>{hasAction && <a href={settings.action.href}>{settings.action.label}</a>}</div><button onClick={() => setOpen(false)} aria-label="배너 닫기"><IconXmarkLine size={20} /></button></div>
  </aside>;
}
