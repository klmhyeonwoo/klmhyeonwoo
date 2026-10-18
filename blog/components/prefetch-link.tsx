"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, useCallback, useRef } from "react";

type PrefetchLinkProps = LinkProps & Omit<ComponentProps<typeof Link>, keyof LinkProps>;

/**
 * Keeps Next's viewport prefetch and starts an additional RSC prefetch only
 * when someone signals an intention to navigate (hover, keyboard focus, touch).
 */
export function PrefetchLink({ href, onFocus, onMouseEnter, onTouchStart, ...props }: PrefetchLinkProps) {
  const router = useRouter();
  const hasPrefetched = useRef(false);
  const prefetch = useCallback(() => {
    if (hasPrefetched.current || typeof href !== "string") return;
    hasPrefetched.current = true;
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      {...props}
      href={href}
      prefetch
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
    />
  );
}
