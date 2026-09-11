function query(q: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(q);
}

let reducedMotion: MediaQueryList | null | undefined;
let wideScreen: MediaQueryList | null | undefined;

export function prefersReducedMotion(): boolean {
  if (reducedMotion === undefined) reducedMotion = query("(prefers-reduced-motion: reduce)");
  return reducedMotion?.matches ?? false;
}

export function isWideScreen(): boolean {
  if (wideScreen === undefined) wideScreen = query("(min-width: 600px)");
  return wideScreen?.matches ?? false;
}
