import type { ReactNode } from "react";

export function PostColumns({ children, columns = 2 }: { children: ReactNode; columns?: number | string }) {
  const count = Math.max(2, Math.min(3, Number(columns) || 2));
  return <section className="post-columns" data-columns={count}>{children}</section>;
}

export function PostColumn({ children, verticalAlign = "top" }: { children: ReactNode; verticalAlign?: string }) {
  return <div className="post-column" data-vertical-align={verticalAlign}>{children}</div>;
}

