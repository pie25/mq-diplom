import { useEffect, type RefObject } from "react";

/**
 * Watches `[data-sentinel="top"|"bottom"]` markers inside a scroll container
 * and sets `data-edge-top` / `data-edge-bottom` on the enclosing `.screen`
 * whenever content is hidden beneath the floating chrome at that edge.
 * `root` is the container itself or the viewport (for page-scrolling screens);
 * the chrome heights are taken from the container's padding, or from the
 * sticky header, so the effect starts exactly where content meets the bar.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, root: "self" | "viewport"): void {
  useEffect(() => {
    const container = ref.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    const screen = container.closest<HTMLElement>(".screen") ?? container;
    const sentinels = Array.from(container.querySelectorAll<HTMLElement>("[data-sentinel]"));
    if (sentinels.length === 0) return;

    let top = 0;
    let bottom = 0;
    if (root === "self") {
      const style = getComputedStyle(container);
      top = parseFloat(style.paddingTop) || 0;
      bottom = parseFloat(style.paddingBottom) || 0;
    } else {
      const header = screen.querySelector<HTMLElement>(".screen-header");
      top = header?.offsetHeight ?? 0;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const which = (entry.target as HTMLElement).dataset.sentinel === "top" ? "data-edge-top" : "data-edge-bottom";
          if (entry.isIntersecting) screen.removeAttribute(which);
          else screen.setAttribute(which, "");
        }
      },
      { root: root === "self" ? container : null, rootMargin: `${-top}px 0px ${-bottom}px 0px`, threshold: 0 },
    );
    sentinels.forEach((s) => observer.observe(s));
    return () => {
      observer.disconnect();
      screen.removeAttribute("data-edge-top");
      screen.removeAttribute("data-edge-bottom");
    };
  }, [ref, root]);
}
