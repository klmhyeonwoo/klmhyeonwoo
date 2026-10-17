"use client";

import type { CSSProperties } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import type { BannerSettings } from "@/lib/site-settings";
import { useAnnouncementDismissal } from "./use-announcement-dismissal";

export function SiteBanner({ settings }: { settings: BannerSettings }) {
  const { open, dismissFor } = useAnnouncementDismissal("banner", settings);
  if (!settings.enabled || !settings.title.trim() || !open) return null;
  const hasAction = settings.action.label.trim() && settings.action.href.trim();

  return <aside className="site-banner" style={{ "--banner-background": settings.backgroundColor, "--banner-text": settings.textColor } as CSSProperties}>
    <div className="site-banner-inner"><div className="site-banner-copy"><p>{settings.title}</p>{hasAction && <a href={settings.action.href}>{settings.action.label}</a>}</div><div className="site-banner-actions"><button className="site-banner-dismiss" type="button" onClick={() => dismissFor(7)}>일주일간 보지 않기</button><button className="site-banner-close" type="button" onClick={() => dismissFor(1)} aria-label="하루 동안 배너 닫기"><IconXmarkLine size={20} /></button></div></div>
  </aside>;
}
