import { useEffect, useRef, useState } from "react";
import type { SavedCategory } from "../domain/review";
import { withViewTransition, type NavDirection } from "./viewTransition";

export type { NavDirection } from "./viewTransition";

export type Route =
  | { name: "home" }
  | { name: "review" }
  | { name: "saved"; category: SavedCategory }
  | { name: "word"; id: number; category: SavedCategory }
  | { name: "settings" };

/** How "deep" each screen sits; moving deeper pushes, moving shallower pops. */
const DEPTH: Record<Route["name"], number> = { home: 0, review: 1, saved: 1, settings: 1, word: 2 };

/** URL segment for each bookmark list: #/saved and #/pinyin. */
const LIST_SEGMENT: Record<SavedCategory, string> = { saved: "saved", savedPinyin: "pinyin" };

export function listPath(category: SavedCategory): string {
  return "/" + LIST_SEGMENT[category];
}

export function wordPath(category: SavedCategory, id: number): string {
  return `${listPath(category)}/${id}`;
}

function categoryFromSegment(segment: string): SavedCategory | null {
  return (Object.keys(LIST_SEGMENT) as SavedCategory[]).find((c) => LIST_SEGMENT[c] === segment) ?? null;
}

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (path === "review") return { name: "review" };
  if (path === "settings") return { name: "settings" };
  const list = path.match(/^([a-z]+)(?:\/(\d+))?$/);
  if (list) {
    const category = categoryFromSegment(list[1]);
    if (category) {
      return list[2] === undefined
        ? { name: "saved", category }
        : { name: "word", id: Number(list[2]), category };
    }
  }
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
