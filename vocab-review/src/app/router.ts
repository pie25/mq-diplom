import { useEffect, useRef, useState } from "react";
import { withViewTransition, type NavDirection } from "./viewTransition";

export type { NavDirection } from "./viewTransition";

export type Route =
  | { name: "home" }
  | { name: "review" }
  | { name: "saved" }
  | { name: "word"; id: number }
  | { name: "settings" };

/** How "deep" each screen sits; moving deeper pushes, moving shallower pops. */
const DEPTH: Record<Route["name"], number> = { home: 0, review: 1, saved: 1, settings: 1, word: 2 };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (path === "review") return { name: "review" };
  if (path === "saved") return { name: "saved" };
  if (path === "settings") return { name: "settings" };
  const word = path.match(/^saved\/(\d+)$/);
  if (word) return { name: "word", id: Number(word[1]) };
  return { name: "home" };
}

export function inferDirection(from: Route, to: Route): NavDirection {
  const a = DEPTH[from.name];
  const b = DEPTH[to.name];
  return b > a ? "forward" : b < a ? "back" : "none";
}

let pendingDirection: NavDirection | null = null;

export function navigate(path: string, direction?: NavDirection): void {
  const target = "#" + (path.startsWith("/") ? path : "/" + path);
  if (window.location.hash === target) return;
  pendingDirection = direction ?? null;
  window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const current = useRef(route);
  current.current = route;
  useEffect(() => {
    const onChange = () => {
      const next = parseRoute(window.location.hash);
      const direction = pendingDirection ?? inferDirection(current.current, next);
      pendingDirection = null;
      withViewTransition(direction, () => setRoute(next));
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
