"use client";

import { IconAndroidshareLine } from "@karrotmarket/react-monochrome-icon";
import { useEffect, useState } from "react";
import { useToast } from "./toast-provider";

export function PostLinkCopy() {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1_800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ message: "게시글 주소를 복사했습니다.", tone: "success" });
    } catch {
      window.prompt("아래 주소를 복사해 주세요.", window.location.href);
    }
  }

  return <button className="post-link-copy" type="button" onClick={copyLink} aria-label="게시글 주소 복사" title={copied ? "복사됨" : "주소 복사"}>
    <IconAndroidshareLine size={19} />
    <span>{copied ? "복사됨" : "주소 복사"}</span>
  </button>;
}
