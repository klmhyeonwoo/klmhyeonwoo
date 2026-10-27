export const imageCropAspects = ["original", "1:1", "4:3", "16:9", "3:4"] as const;

export type ImageCropAspect = (typeof imageCropAspects)[number];

export type ImageCrop = {
  aspect: ImageCropAspect;
  focusX: number;
  focusY: number;
  zoom: number;
};

type ImageLikeProps = Record<string, unknown>;

const cropAspectSet = new Set<string>(imageCropAspects);

function numberInRange(value: unknown, fallback: number, minimum: number, maximum: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

/** Turns editor props into a safe, portable crop description. */
export function imageCropFrom(props: ImageLikeProps): ImageCrop {
  const requestedAspect = typeof props.cropAspect === "string" ? props.cropAspect : "original";
  return {
    aspect: cropAspectSet.has(requestedAspect) ? requestedAspect as ImageCropAspect : "original",
    focusX: numberInRange(props.cropX, 50, 0, 100),
    focusY: numberInRange(props.cropY, 50, 0, 100),
    zoom: numberInRange(props.cropZoom, 1, 1, 3),
  };
}

export function cropRatio(aspect: ImageCropAspect) {
  if (aspect === "original") return undefined;
  const [width, height] = aspect.split(":").map(Number);
  return width && height ? `${width} / ${height}` : undefined;
}

function attribute(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function jsxNumber(value: number) {
  return Number(value.toFixed(3));
}

/**
 * Produces the public MDX projection of an image. A plain image remains a
 * normal HTML image; edited images opt into the lightweight crop component.
 */
export function imageMarkdown({ src, alt = "", width, crop }: { src: string; alt?: string; width?: unknown; crop: ImageCrop }) {
  const safeWidth = numberInRange(width, 0, 0, 10_000);
  // Use one public renderer for untouched and cropped images. Relying on an
  // HTML `width` attribute for plain images made width persistence differ from
  // cropped images across the MDX/server rendering path.
  return `<PostImage src="${attribute(src)}" alt="${attribute(alt)}" aspect="${crop.aspect}" focusX="${jsxNumber(crop.focusX)}" focusY="${jsxNumber(crop.focusY)}" zoom="${jsxNumber(crop.zoom)}"${safeWidth ? ` width="${safeWidth}"` : ""} />`;
}
