import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Scale the paper, never its layout. Printing uses the same unscaled content. */
export function A4Preview({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = viewport.current;
    const content = paper.current;
    if (!host || !content) return;
    const resize = () => {
      const scale = Math.min(1, host.clientWidth / content.offsetWidth);
      host.style.setProperty("--paper-scale", String(scale));
      host.style.setProperty("--paper-height", `${content.offsetHeight * scale}px`);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    observer.observe(content);
    resize();
    return () => observer.disconnect();
  }, []);
  return <div ref={viewport} className="a4-preview"><div ref={paper} className="a4-preview-content">{children}</div></div>;
}