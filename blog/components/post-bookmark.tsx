function previewUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    return { href: url.href, hostname, label: hostname.slice(0, 1).toUpperCase() };
  } catch {
    return { href: "", hostname: "링크", label: "↗" };
  }
}

/** A stable, self-contained external-link card rendered from editor bookmark blocks. */
export function PostBookmark({ url, title, description, image }: { url: string; title?: string; description?: string; image?: string }) {
  const { href, hostname, label } = previewUrl(url);
  if (!href) return null;

  return <a className="post-bookmark" href={href} rel="noreferrer">
    <span aria-hidden="true" className="post-bookmark-visual">{image ? <img alt="" src={image} referrerPolicy="no-referrer" /> : <span>{label}</span>}</span>
    <span className="post-bookmark-copy">
      <small>링크 · {hostname}</small>
      <strong>{title?.trim() || hostname}</strong>
      {description?.trim() && <em>{description.trim()}</em>}
      <span>{href}</span>
    </span>
  </a>;
}
