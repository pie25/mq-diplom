import { flushSync } from "react-dom";
import { prefersReducedMotion } from "../ui/motion/preferences";

export type NavDirection = "forward" | "back" | "none";

type StartViewTransition = (update: () => void) => { finished: Promise<void> };

/**
 * Run a state update inside a View Transition when the browser supports it
 * (progressive enhancement). The direction is exposed on <html data-nav> so
 * CSS can push forward and pop back along the same path.
 */
export function withViewTransition(direction: NavDirection, update: () => void): void {
  const start = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition;
  if (typeof start !== "function" || prefersReducedMotion()) {
    update();
    return;
  }
  const html = document.documentElement;
  html.dataset.nav = direction;
  let transition: { finished: Promise<void> };
  try {
    transition = start.call(document, () => flushSync(update));
  } catch {
    delete html.dataset.nav;
    update();
    return;
  }
  transition.finished
    .catch(() => undefined)
    .finally(() => {
      delete html.dataset.nav;
    });
}
