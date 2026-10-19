import { galleryImagesFromAttribute } from "@/lib/gallery-markdown";

export function PostGallery({ images }: { images?: string }) {
  const items = galleryImagesFromAttribute(images);
  if (!items.length) return null;
  return <div className="post-gallery">{items.map((image, index) => <img alt="" key={`${image.url}-${index}`} loading="lazy" src={image.url} />)}</div>;
}
