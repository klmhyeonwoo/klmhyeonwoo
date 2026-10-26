import type { CSSProperties } from "react";
import { cropRatio, imageCropAspects, type ImageCropAspect } from "@/lib/image-crop";

type Props = {
  src: string;
  alt?: string;
  aspect?: string;
  focusX?: number;
  focusY?: number;
  zoom?: number;
  width?: number;
};

function bounded(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

/** Server-rendered counterpart for an image crop authored in the editor. */
export function PostImage({ src, alt = "", aspect = "original", focusX, focusY, zoom, width }: Props) {
  const cropAspect: ImageCropAspect = imageCropAspects.includes(aspect as ImageCropAspect) ? aspect as ImageCropAspect : "original";
  const ratio = cropRatio(cropAspect);
  const x = bounded(focusX, 50, 0, 100);
  const y = bounded(focusY, 50, 0, 100);
  const scale = bounded(zoom, 1, 1, 3);
  const style = width && Number.isFinite(width) ? { maxWidth: "100%", width: `${Math.max(1, Math.min(width, 10_000))}px` } : undefined;

  if (!ratio) return <img alt={alt} src={src} style={style} />;
  return <figure className="post-image-crop" style={{ ...style, aspectRatio: ratio } as CSSProperties}><img alt={alt} src={src} style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${scale})`, transformOrigin: `${x}% ${y}%` }} /></figure>;
}
