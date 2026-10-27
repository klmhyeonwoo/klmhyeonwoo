"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { ChangeEvent, useRef, useState } from "react";
import { galleryImages, type GalleryImage } from "@/lib/gallery-markdown";
import { imageFileAccept, isUploadableImage, uploadImage } from "@/lib/client-image-upload";

const createGalleryBlockConfig = createBlockConfig(
  () => ({
    type: "gallery" as const,
    propSchema: { images: { default: "[]" } },
    content: "none" as const,
  }),
);

function GalleryBlock({ block, editor }: ReactCustomBlockRenderProps<typeof createGalleryBlockConfig>) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const images = galleryImages(block.props.images);
  const stopControl = (event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const setImages = (next: GalleryImage[]) => editor.updateBlock(block, { props: { images: JSON.stringify(next) } });
  const addUrl = () => {
    try {
      const next = new URL(url.trim());
      if (!/^https?:$/.test(next.protocol)) return;
      setImages([...images, { url: next.href }]);
      setUrl("");
    } catch {
      // Keep an invalid draft in the field so it can be corrected.
    }
  };
  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []).filter(isUploadableImage);
    event.currentTarget.value = "";
    if (!files.length) return;
    setUploading("WebP 변환 중…");
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        try {
          const { url: uploadedUrl } = await uploadImage(file, ({ stage }) => setUploading(stage === "uploading" ? "업로드 중…" : "WebP 변환 중…"));
          return { url: uploadedUrl };
        } catch {
          return null;
        }
      }));
      const next = uploaded.filter((image): image is GalleryImage => image !== null);
      if (next.length) setImages([...images, ...next]);
    } finally {
      setUploading("");
    }
  };

  return <section className="editor-gallery" contentEditable={false} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    {images.length > 0 && <div className="editor-gallery-grid">{images.map((image, index) => <figure key={`${image.url}-${index}`}><img alt="" src={image.url} /><button aria-label={`이미지 ${index + 1} 삭제`} onClick={() => setImages(images.filter((_, current) => current !== index))} onMouseDown={stopControl} onPointerDown={stopControl} type="button">×</button></figure>)}</div>}
    <div className="editor-gallery-controls">
      <label onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}><input accept={imageFileAccept} multiple onChange={uploadImages} ref={inputRef} type="file" />{uploading || "이미지 추가"}</label>
      <input aria-label="갤러리 이미지 URL" onChange={(event) => setUrl(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addUrl(); } }} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} placeholder="이미지 URL 붙여넣기" value={url} />
      <button onClick={addUrl} onMouseDown={stopControl} onPointerDown={stopControl} type="button">추가</button>
    </div>
  </section>;
}

function GalleryExternalHTML() {
  return <div />;
}

export const Gallery = createReactBlockSpec(createGalleryBlockConfig, {
  meta: { isolating: true },
  render: GalleryBlock,
  toExternalHTML: GalleryExternalHTML,
});
