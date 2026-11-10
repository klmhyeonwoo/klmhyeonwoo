"use client";

import { useEffect, useRef, useState, type HTMLAttributeReferrerPolicy, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type SelectedImage = {
  src: string;
  alt: string;
  referrerPolicy: HTMLAttributeReferrerPolicy;
  trigger: HTMLImageElement;
};

/** Enhance server-rendered article images without changing their layout. */
export function PostImageLightbox({ root, content }: {
  root: RefObject<HTMLDivElement | null>;
  content: ReactNode;
}) {
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);

  useEffect(() => {
    const images = root.current?.querySelectorAll<HTMLImageElement>("img.post-image, .post-image-crop img, .post-gallery img");
    if (!images) return;

    const cleanups = Array.from(images).flatMap((image) => {
      if (!image.getAttribute("src") || image.closest('a, button, [role="button"], [aria-hidden="true"]')) return [];

      const attributes = ["role", "tabindex", "aria-label", "aria-haspopup", "data-lightbox-trigger"];
      const original = attributes.map((name) => image.getAttribute(name));
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
      image.setAttribute("aria-label", image.alt ? `${image.alt} — 이미지 크게 보기` : "이미지 크게 보기");
      image.setAttribute("aria-haspopup", "dialog");
      image.setAttribute("data-lightbox-trigger", "");

      let pointerStart: { x: number; y: number } | null = null;
      let dragged = false;
      const open = () => {
        setSelected({ src: image.src, alt: image.alt, referrerPolicy: image.referrerPolicy as HTMLAttributeReferrerPolicy, trigger: image });
      };
      const pointerDown = (event: PointerEvent) => {
        pointerStart = { x: event.clientX, y: event.clientY };
        dragged = false;
      };
      const pointerMove = (event: PointerEvent) => {
        if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) dragged = true;
      };
      const pointerCancel = () => { dragged = true; pointerStart = null; };
      const click = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || dragged) return;
        open();
      };
      const keyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        open();
      };
      image.addEventListener("pointerdown", pointerDown);
      image.addEventListener("pointermove", pointerMove);
      image.addEventListener("pointercancel", pointerCancel);
      image.addEventListener("click", click);
      image.addEventListener("keydown", keyDown);

      return [() => {
        image.removeEventListener("pointerdown", pointerDown);
        image.removeEventListener("pointermove", pointerMove);
        image.removeEventListener("pointercancel", pointerCancel);
        image.removeEventListener("click", click);
        image.removeEventListener("keydown", keyDown);
        attributes.forEach((name, index) => {
          const value = original[index];
          if (value === null) image.removeAttribute(name);
          else image.setAttribute(name, value);
        });
      }];
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [root, content]);

  useEffect(() => {
    if (!selected || !dialog.current) return;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      modal.close();
      document.body.style.overflow = previousOverflow;
      if (selected.trigger.isConnected) selected.trigger.focus({ preventScroll: true });
    };
  }, [selected]);

  if (!selected) return null;

  return createPortal(
    <dialog
      ref={dialog}
      className="post-image-lightbox"
      aria-label="이미지 크게 보기"
      onCancel={(event) => { event.preventDefault(); setSelected(null); }}
      onPointerDown={(event) => { backdropPress.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) setSelected(null);
        backdropPress.current = false;
      }}
    >
      <button className="post-image-lightbox-close" type="button" onClick={() => setSelected(null)} aria-label="이미지 닫기">닫기 <span aria-hidden="true">×</span></button>
      <img src={selected.src} alt={selected.alt} referrerPolicy={selected.referrerPolicy} />
    </dialog>,
    document.body,
  );
}
