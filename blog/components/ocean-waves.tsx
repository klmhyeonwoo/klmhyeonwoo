"use client";

import { useEffect, useRef } from "react";
import { createOceanRenderer } from "./ocean-renderer";
import "./ocean-waves.css";

export function OceanWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const hiddenEffect = matchMedia("(prefers-contrast: more), (forced-colors: active), print");
    let renderer: ReturnType<typeof createOceanRenderer> = null;
    let frame = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let isDark = document.documentElement.dataset.theme === "dark";
    let contextLost = false;
    let inView = true;

    const draw = () => renderer?.draw(elapsed, isDark);
    function tick(now: number) {
      if (now - lastFrame >= 1000 / 30) {
        elapsed += Math.min((now - lastFrame) / 1000, .05);
        lastFrame = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      if (document.hidden || hiddenEffect.matches || contextLost || !inView) return;
      if (!renderer) {
        renderer = createOceanRenderer(canvas!);
        renderer?.resize();
      }
      if (!renderer) return;
      draw();
      if (!reducedMotion.matches) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }
    const resizeObserver = new ResizeObserver(() => {
      renderer?.resize();
      if (!document.hidden && !contextLost) draw();
    });
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (inView === entry.isIntersecting) return;
      inView = entry.isIntersecting;
      sync();
    });
    intersectionObserver.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.dataset.theme === "dark";
      if (!document.hidden && !contextLost) draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    function onContextLost(event: Event) {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      renderer?.dispose();
      renderer = null;
    }
    function onContextRestored() { contextLost = false; sync(); }
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    hiddenEffect.addEventListener("change", sync);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
      hiddenEffect.removeEventListener("change", sync);
      renderer?.dispose();
    };
  }, []);

  return <div className="ocean-waves" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
