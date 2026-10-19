export type GalleryImage = { url: string };

export function galleryImages(value: unknown): GalleryImage[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => (
      typeof item === "object" && item !== null && typeof (item as GalleryImage).url === "string" && /^https?:\/\//i.test((item as GalleryImage).url)
        ? [{ url: (item as GalleryImage).url }]
        : []
    ));
  } catch {
    return [];
  }
}

export function galleryMarkdown(images: GalleryImage[]) {
  const encoded = encodeURIComponent(JSON.stringify(images));
  return `<Gallery images="${encoded}" />\n`;
}

export function galleryImagesFromAttribute(value: string | undefined) {
  if (!value) return [];
  try {
    return galleryImages(decodeURIComponent(value));
  } catch {
    return [];
  }
}
