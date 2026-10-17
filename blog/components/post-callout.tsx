import type { ReactNode } from "react";
import { FluentEmoji } from "./fluent-emoji";

export function PostCallout({ children, emoji = "💡", icon }: { children: ReactNode; emoji?: string; icon?: string }) {
  return <blockquote className="post-callout">
    <span aria-hidden="true" className="post-callout-icon">
      {icon ? <FluentEmoji name={icon} /> : emoji}
    </span>
    <span className="post-callout-content">{children}</span>
  </blockquote>;
}
