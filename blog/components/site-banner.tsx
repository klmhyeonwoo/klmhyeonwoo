"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import type { BannerSettings } from "@/lib/site-settings";
import { useAnnouncementDismissal } from "./use-announcement-dismissal";

export function SiteBanner({ settings }: { settings: BannerSettings }) {
  const { open, dismissFor } = useAnnouncementDismissal("banner", settings);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [titleOverflows, setTitleOverflows] = useState(false);

  useEffect(() => {
    const title = titleRef.current;
    const text = titleTextRef.current;
    if (!title || !text) return;

    const measure = () => setTitleOverflows(text.getBoundingClientRect().width > title.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(title);
    return () => observer.disconnect();
  }, [settings.title]);

  if (!settings.enabled || !settings.title.trim() || !open) return null;
  const hasAction = settings.action.label.trim() && settings.action.href.trim();

  return <aside className="site-banner" style={{ "--banner-background": settings.backgroundColor, "--banner-text": settings.textColor } as CSSProperties}>
    <div className="site-banner-inner"><div className="site-banner-copy"><p className={titleOverflows ? "is-marquee" : undefined} ref={titleRef} title={settings.title}><span className="site-banner-title-track"><span ref={titleTextRef}>{settings.title}</span>{titleOverflows && <span aria-hidden="true">{settings.title}</span>}</span></p>{hasAction && <a href={settings.action.href}>{settings.action.label}</a>}</div><div className="site-banner-actions"><button className="site-banner-dismiss" type="button" onClick={() => dismissFor(7)}><span className="site-banner-dismiss-long">일주일간 보지 않기</span><span className="site-banner-dismiss-short" aria-hidden="true">7일</span></button><button className="site-banner-close" type="button" onClick={() => dismissFor(1)} aria-label="하루 동안 배너 닫기"><IconXmarkLine size={20} /></button></div></div>
  </aside>;
}
