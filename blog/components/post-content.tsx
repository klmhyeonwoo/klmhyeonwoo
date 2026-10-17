"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";

export function PostContent({ children }: { children: ReactNode }) {
  const [externalUrl, setExternalUrl] = useState<string | null>(null);

  function confirmExternalLink(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target === "_blank" || event.defaultPrevented) return;

    const url = new URL(link.href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin === window.location.origin) return;

    event.preventDefault();
    setExternalUrl(url.href);
  }

  return <>
    <div className="prose" onClickCapture={confirmExternalLink}>{children}</div>
    {externalUrl && <div className="external-link-backdrop" role="presentation" onMouseDown={() => setExternalUrl(null)}>
      <section className="external-link-dialog" role="dialog" aria-modal="true" aria-labelledby="external-link-title" onMouseDown={(event) => event.stopPropagation()}>
        <p className="external-link-kicker">외부 링크</p>
        <h2 id="external-link-title">외부 사이트로 이동할까요?</h2>
        <p>{new URL(externalUrl).hostname}에서 제공하는 페이지입니다.</p>
        <div>
          <button type="button" onClick={() => setExternalUrl(null)}>취소</button>
          <a href={externalUrl} target="_blank" rel="noreferrer">이동하기</a>
        </div>
      </section>
    </div>}
  </>;
}
