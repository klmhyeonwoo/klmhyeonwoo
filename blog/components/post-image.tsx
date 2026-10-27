import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cropRatio, imageCropAspects, type ImageCropAspect } from "@/lib/image-crop";

type Props = ComponentPropsWithoutRef<"img"> & {
  aspect?: string;
  focusX?: number;
  focusY?: number;
  zoom?: number;
};

function bounded(value: number | string | undefined, fallback: number, minimum: number, maximum: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

/** Server-rendered counterpart for an image crop authored in the editor. */
export function PostImage({ src = "", alt = "", aspect = "original", focusX, focusY, zoom, width, style: imageStyle, ...imageProps }: Props) {
  const cropAspect: ImageCropAspect = imageCropAspects.includes(aspect as ImageCropAspect) ? aspect as ImageCropAspect : "original";
  const ratio = cropRatio(cropAspect);
  const x = bounded(focusX, 50, 0, 100);
  const y = bounded(focusY, 50, 0, 100);
  const scale = bounded(zoom, 1, 1, 3);
  const imageWidth = bounded(width, 0, 0, 10_000);
  const style = imageWidth > 0 ? { ...imageStyle, maxWidth: "100%", width: `${imageWidth}px` } : imageStyle;

  if (!ratio) return <img {...imageProps} alt={alt} src={src} style={style} />;
  const [ratioWidth, ratioHeight] = ratio.split("/").map(Number);
  return <figure className="post-image-crop" style={{ ...style, aspectRatio: ratio, "--carousel-crop-max-width": `${100 * ratioWidth / ratioHeight}cqh` } as CSSProperties}><img {...imageProps} alt={alt} src={src} style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${scale})`, transformOrigin: `${x}% ${y}%` }} /></figure>;
}
