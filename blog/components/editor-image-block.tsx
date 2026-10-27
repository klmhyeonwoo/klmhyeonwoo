"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { createPortal } from "react-dom";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { cropRatio, imageCropAspects, imageCropFrom, type ImageCropAspect } from "@/lib/image-crop";
import { imageFileAccept, uploadImage } from "@/lib/client-image-upload";

const createImageBlockConfig = createBlockConfig(
  () => ({
    type: "image" as const,
    propSchema: {
      textAlignment: { default: "left", values: ["left", "center", "right", "justify"] as const },
      backgroundColor: { default: "default" },
      name: { default: "" },
      url: { default: "" },
      caption: { default: "" },
      showPreview: { default: true },
      previewWidth: { default: undefined, type: "number" as const },
      cropAspect: { default: "original" },
      cropX: { default: 50, type: "number" as const },
      cropY: { default: 50, type: "number" as const },
      cropZoom: { default: 1, type: "number" as const },
    },
    content: "none" as const,
  }),
);

type ImageBlock = ReactCustomBlockRenderProps<typeof createImageBlockConfig>;

function stopEditorEvent(event: React.MouseEvent | React.PointerEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function ImageCropDialog({ block, editor, onClose }: Pick<ImageBlock, "block" | "editor"> & { onClose: () => void }) {
  const currentCrop = imageCropFrom(block.props);
  const [aspect, setAspect] = useState<ImageCropAspect>(currentCrop.aspect);
  const [focusX, setFocusX] = useState(currentCrop.focusX);
  const [focusY, setFocusY] = useState(currentCrop.focusY);
  const [zoom, setZoom] = useState(currentCrop.zoom);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(448);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; focusX: number; focusY: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  useEffect(() => {
    const updateCanvasHeight = () => setCanvasHeight(Math.min(window.innerHeight * 0.56, 560));
    updateCanvasHeight();
    window.addEventListener("resize", updateCanvasHeight);
    return () => window.removeEventListener("resize", updateCanvasHeight);
  }, []);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (aspect === "original") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, focusX, focusY };
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!state || state.pointerId !== event.pointerId || !bounds) return;
    // Moving the image follows the pointer; object-position moves in the
    // inverse direction because it represents the visible focal point.
    setFocusX(Math.min(100, Math.max(0, state.focusX - ((event.clientX - state.x) / bounds.width) * 100)));
    setFocusY(Math.min(100, Math.max(0, state.focusY - ((event.clientY - state.y) / bounds.height) * 100)));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };
  const reset = () => {
    setAspect("original");
    setFocusX(50);
    setFocusY(50);
    setZoom(1);
  };
  const apply = () => {
    editor.updateBlock(block, { props: { cropAspect: aspect, cropX: focusX, cropY: focusY, cropZoom: zoom } });
    onClose();
  };
  const fixedAspect = cropRatio(aspect);
  const [aspectWidth, aspectHeight] = fixedAspect?.split("/").map(Number) ?? [];
  const previewAspect = aspectWidth && aspectHeight ? aspectWidth / aspectHeight : naturalAspect ?? (9 / 16);
  const isPortraitPreview = previewAspect < 1;
  const portraitWidth = Math.round(Math.min(320, canvasHeight * previewAspect));

  return createPortal(<div className="image-crop-backdrop" onMouseDown={onClose} role="presentation">
    <section aria-describedby="image-crop-description" aria-labelledby="image-crop-title" className="image-crop-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
      <header><div><p>이미지 편집</p><h2 id="image-crop-title">사진 자르기</h2></div><button aria-label="사진 편집 닫기" onClick={onClose} type="button">×</button></header>
      <p id="image-crop-description">비율을 고른 뒤 사진을 직접 드래그해 보여줄 영역을 맞추세요.</p>
      <div
        aria-label="사진 자르기 영역"
        className={`image-crop-canvas${aspect === "original" ? " is-original" : ""}${isPortraitPreview ? " is-portrait" : ""}`}
        onPointerCancel={endDrag}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        ref={canvasRef}
        style={{ aspectRatio: previewAspect, ...(isPortraitPreview ? { width: `${portraitWidth}px` } : {}) }}
      ><img alt="" draggable={false} onLoad={(event) => { const { naturalHeight, naturalWidth } = event.currentTarget; if (naturalWidth && naturalHeight) setNaturalAspect(naturalWidth / naturalHeight); }} src={block.props.url} style={{ objectPosition: `${focusX}% ${focusY}%`, transform: `scale(${zoom})`, transformOrigin: `${focusX}% ${focusY}%` }} /><span aria-hidden="true" className="image-crop-grid" /></div>
      <div className="image-crop-options">
        <div aria-label="자르기 비율" className="image-crop-aspects" role="group">
          {imageCropAspects.map((option) => <button className={aspect === option ? "is-selected" : undefined} key={option} onClick={() => { setAspect(option); if (option === "original") { setFocusX(50); setFocusY(50); setZoom(1); } }} type="button">{option === "original" ? "원본" : option}</button>)}
        </div>
        <label className="image-crop-zoom">확대 <input aria-label="이미지 확대" disabled={aspect === "original"} max="3" min="1" onChange={(event) => setZoom(Number(event.currentTarget.value))} step="0.01" type="range" value={zoom} /><output>{Math.round(zoom * 100)}%</output></label>
      </div>
      <footer><button onClick={reset} type="button">원본으로</button><span /><button onClick={onClose} type="button">취소</button><button className="is-primary" onClick={apply} type="button">적용</button></footer>
    </section>
  </div>, document.body);
}

function ImageBlock({ block, editor }: ImageBlock) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(block.props.url);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const crop = imageCropFrom(block.props);
  const width = typeof block.props.previewWidth === "number" ? block.props.previewWidth : undefined;
  const alignment = block.props.textAlignment === "right" ? { marginLeft: "auto" } : block.props.textAlignment === "center" ? { marginInline: "auto" } : undefined;

  useEffect(() => setUrl(block.props.url), [block.props.url]);

  const commitUrl = () => {
    try {
      const next = new URL(url.trim());
      if (!/^https?:$/.test(next.protocol)) return;
      editor.updateBlock(block, { props: { url: next.href } });
    } catch {
      // Leave the draft visible so it can be corrected without losing it.
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploadError("");
    try {
      const { url: uploadedUrl, file: prepared } = await uploadImage(file, ({ stage, progress }) => setUploadStatus(stage === "uploading" ? "업로드 중…" : `WebP 변환 중…${typeof progress === "number" ? ` ${Math.round(progress)}%` : ""}`));
      editor.updateBlock(block, { props: { url: uploadedUrl, name: prepared.name, cropAspect: "original", cropX: 50, cropY: 50, cropZoom: 1 } });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "이미지를 올리지 못했습니다.");
    } finally {
      setUploadStatus("");
    }
  };

  if (!block.props.url) {
    return <section className="editor-image-empty" contentEditable={false} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <span aria-hidden="true">▧</span><strong>이미지</strong><small>파일을 올리거나 이미지 주소를 입력하세요.</small>
      <div><label><input accept={imageFileAccept} onChange={upload} type="file" />{uploadStatus || "파일 선택"}</label><input aria-label="이미지 주소" onBlur={commitUrl} onChange={(event) => setUrl(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitUrl(); } }} placeholder="https://" value={url} /></div>{uploadError && <small role="alert">{uploadError}</small>}
    </section>;
  }

  return <figure className="editor-image-block" contentEditable={false} data-file-block style={{ ...alignment, width: width ? `${width}px` : "100%" }}>
    <div className="bn-file-block-content-wrapper">
      <div className={`bn-visual-media${crop.aspect !== "original" ? " is-cropped" : ""}`} data-image-editor-image style={crop.aspect === "original" ? undefined : { aspectRatio: cropRatio(crop.aspect) }}>
        <img alt={block.props.caption} draggable={false} src={block.props.url} style={crop.aspect === "original" ? undefined : { objectPosition: `${crop.focusX}% ${crop.focusY}%`, transform: `scale(${crop.zoom})`, transformOrigin: `${crop.focusX}% ${crop.focusY}%` }} />
        <button aria-label="사진 편집" className="editor-image-crop-edit" data-image-crop-edit onClick={() => setEditing(true)} onMouseDown={stopEditorEvent} onPointerDown={stopEditorEvent} type="button">편집</button>
      </div>
      <div aria-hidden="true" className="bn-resize-handle" style={{ left: "-5px" }} /><div aria-hidden="true" className="bn-resize-handle" style={{ right: "-5px" }} />
    </div>
    {editing && <ImageCropDialog block={block} editor={editor} onClose={() => setEditing(false)} />}
  </figure>;
}

function ImageExternalHTML({ block }: ImageBlock) {
  return <img alt={block.props.caption} src={block.props.url} />;
}

export const Image = createReactBlockSpec(createImageBlockConfig, {
  meta: { isolating: true },
  render: ImageBlock,
  toExternalHTML: ImageExternalHTML,
});
