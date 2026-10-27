"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useRef, useState } from "react";

function CarouselView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const [active, setActive] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const count = node.childCount;
  const slidesPerView = [1, 2, 3].includes(Number(node.attrs.slidesPerView)) ? Number(node.attrs.slidesPerView) : 1;
  const navigate = (index: number) => {
    const target = Math.max(0, Math.min(count - 1, index));
    const strip = viewport.current?.querySelector<HTMLElement>(".carousel-editor-strip [data-node-view-content-react]");
    const slide = strip?.children[target] as HTMLElement | undefined;
    if (slide && viewport.current) viewport.current.scrollTo({ left: viewport.current.scrollLeft + slide.getBoundingClientRect().left - viewport.current.getBoundingClientRect().left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setActive(target);
  };
  const updateChildren = (operation: "add" | "remove" | "previous" | "next") => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const children = Array.from({ length: node.childCount }, (_, i) => node.child(i));
    const current = Math.min(active, children.length - 1);
    let next = current;
    if (operation === "add") { children.push(editor.schema.nodes.image.create({ src: "" })); next = children.length - 1; }
    if (operation === "remove" && children.length > 1) { children.splice(current, 1); next = Math.min(current, children.length - 1); }
    if (operation === "previous" && current > 0) { [children[current - 1], children[current]] = [children[current], children[current - 1]]; next = current - 1; }
    if (operation === "next" && current < children.length - 1) { [children[current + 1], children[current]] = [children[current], children[current + 1]]; next = current + 1; }
    const replacement = node.type.create(node.attrs, children);
    editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + node.nodeSize, replacement));
    setActive(next);
    requestAnimationFrame(() => navigateTo(next));
  };
  const navigateTo = (index: number) => {
    const strip = viewport.current?.querySelector<HTMLElement>(".carousel-editor-strip [data-node-view-content-react]");
    const slide = strip?.children[index] as HTMLElement | undefined;
    if (slide && viewport.current) viewport.current.scrollTo({ left: viewport.current.scrollLeft + slide.getBoundingClientRect().left - viewport.current.getBoundingClientRect().left });
  };
  return <NodeViewWrapper className="editor-carousel" data-type="image-carousel" data-visible={slidesPerView}>
    <div ref={viewport} className="editor-carousel-viewport" onPointerDownCapture={(event) => {
      const strip = event.currentTarget.querySelector<HTMLElement>(".carousel-editor-strip [data-node-view-content-react]");
      const target = event.target as HTMLElement;
      const slide = target.closest(".react-renderer.node-image");
      if (strip && slide?.parentElement === strip) setActive(Array.from(strip.children).indexOf(slide));
    }}><NodeViewContent className="carousel-editor-strip" /></div>
    <div className="editor-carousel-controls" contentEditable={false} onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => { if (!(event.target as HTMLElement).closest("select")) event.preventDefault(); }}>
      <button type="button" disabled={active === 0} onClick={() => navigate(active - 1)} aria-label="이전 사진">‹</button>
      <span aria-live="polite">{Math.min(active + 1, count)} / {count}</span>
      <button type="button" disabled={active >= count - 1} onClick={() => navigate(active + 1)} aria-label="다음 사진">›</button>
      <label>한 화면에 <select aria-label="한 화면에 보이는 사진 수" value={slidesPerView} onChange={(event) => updateAttributes({ slidesPerView: Number(event.currentTarget.value) })}>{[1, 2, 3].map((value) => <option key={value} value={value}>{value}장</option>)}</select></label>
      <span className="carousel-control-spacer" />
      <button type="button" disabled={active === 0} onClick={() => updateChildren("previous")}>앞으로</button>
      <button type="button" disabled={active >= count - 1} onClick={() => updateChildren("next")}>뒤로</button>
      <button type="button" disabled={count <= 1} onClick={() => updateChildren("remove")}>삭제</button>
      <button type="button" onClick={() => updateChildren("add")}>사진 추가</button>
    </div>
  </NodeViewWrapper>;
}

export const ImageCarousel = Node.create({
  name: "imageCarousel",
  group: "block",
  content: "image+",
  isolating: true,
  addAttributes() { return { slidesPerView: { default: 1, parseHTML: (element: HTMLElement) => Number(element.getAttribute("data-visible")) || 1, renderHTML: (attrs: Record<string, unknown>) => ({ "data-visible": attrs.slidesPerView }) } }; },
  parseHTML() { return [{ tag: 'div[data-type="image-carousel"]' }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-carousel" }), 0]; },
  addNodeView() { return ReactNodeViewRenderer(CarouselView); },
});
