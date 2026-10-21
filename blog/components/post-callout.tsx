import type { ReactNode } from "react";
import { FluentEmoji } from "./fluent-emoji";

export function PostCallout({ children, emoji = "💡", icon, image, background = "default" }: { children: ReactNode; emoji?: string; icon?: string; image?: string; background?: string }) {
  return <blockquote className="post-callout" data-callout-background={background}>
    <span aria-hidden="true" className="post-callout-icon">
      {image ? <img alt="" className="post-callout-fluent-image" src={image} /> : icon ? <FluentEmoji name={icon} /> : emoji}
    </span>
    <span className="post-callout-content">{children}</span>
  </blockquote>;
}
