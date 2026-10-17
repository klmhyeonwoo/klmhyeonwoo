import type { ReactNode } from "react";
import { FluentEmoji } from "./fluent-emoji";

export function PostCallout({ children, emoji = "💡", icon }: { children: ReactNode; emoji?: string; icon?: string }) {
  return <blockquote className="post-callout" style={{ alignItems: "flex-start", display: "flex", gap: "10px" }}>
    <span aria-hidden="true" style={{ display: "inline-flex", flex: "0 0 auto", fontSize: "20px", lineHeight: 1.35, marginTop: "1px" }}>
      {icon ? <FluentEmoji name={icon} /> : emoji}
    </span>
    <span style={{ minWidth: 0 }}>{children}</span>
  </blockquote>;
}
