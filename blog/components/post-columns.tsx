import type { ReactNode } from "react";

export function PostColumns({ children, columns = 2 }: { children: ReactNode; columns?: number | string }) {
  const count = Math.max(2, Math.min(3, Number(columns) || 2));
  return <section aria-label={`${count}칸으로 구성된 콘텐츠. 모바일에서는 좌우로 넘겨 볼 수 있습니다.`} className="post-columns" data-columns={count} tabIndex={0}>{children}</section>;
}

export function PostColumn({ children, verticalAlign = "top" }: { children: ReactNode; verticalAlign?: string }) {
  return <div className="post-column" data-vertical-align={verticalAlign}>{children}</div>;
}

