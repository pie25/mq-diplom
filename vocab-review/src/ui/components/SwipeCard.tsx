import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { clamp, createVelocityTracker, project, rubberband, type VelocityTracker } from "../motion/physics";
import { prefersReducedMotion } from "../motion/preferences";
import { spring, type SpringHandle } from "../motion/spring";

export type SwipeDirection = "left" | "right";

export interface SwipeCardHandle {
  /** Send the card away in `direction` as if it had been flicked. */
  swipe(direction: SwipeDirection): void;
}

interface SwipeCardProps {
  /** Changes whenever the content is a different card; drives the enter motion. */
  contentKey: string;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
}

type Phase = "idle" | "dragging" | "returning" | "exiting" | "committed" | "entering";

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  grabX: number;
  axis: "none" | "x" | "y";
  tracker: VelocityTracker;
  detach: () => void;
}

const AXIS_LOCK = 8;
const MIN_FLICK_DX = 24;
const BACKSWING_VELOCITY = 150;
const KEYBOARD_VELOCITY = 1400;
const COMMIT_FALLBACK_MS = 250;

/**
 * One persistent card that follows the finger 1:1, hands its velocity to a
 * spring on release, projects momentum to decide between commit and return,
 * rubber-bands against a direction that is not available, and can be grabbed
 * again at any point of any animation, including while it is flying away.
 */
export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(props, ref) {
  const el = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const phase = useRef<Phase>("idle");
  const drag = useRef<Drag | null>(null);
  const pendingCommit = useRef<SwipeDirection | null>(null);
  const pendingEnter = useRef<{ side: 1 | -1; velocity: number } | null>(null);
  const metrics = useRef({ width: 320, viewport: 390 });
  const commitTimer = useRef<number | null>(null);
  const springs = useRef<{ x: SpringHandle; fade: SpringHandle } | null>(null);
  const mounted = useRef(false);

  const measure = () => {
    const node = el.current;
    metrics.current = {
      width: node?.offsetWidth || 320,
      viewport: typeof window !== "undefined" ? window.innerWidth : 390,
    };
  };

  const allowed = (dir: SwipeDirection) =>
    dir === "right" ? propsRef.current.canSwipeRight : propsRef.current.canSwipeLeft;

  const getSprings = () => {
    if (!springs.current) {
      const paint = () => {
        const node = el.current;
        const s = springs.current;
        if (!node || !s) return;
        const x = s.x.value;
        const rotate = prefersReducedMotion() ? 0 : x * 0.02;
        node.style.transform = x === 0 ? "" : `translate3d(${x}px, 0, 0) rotate(${rotate}deg)`;
        node.style.opacity = s.fade.value >= 1 ? "" : String(Math.max(0, s.fade.value));
        maybeCommit();
      };
      springs.current = {
        x: spring({ from: 0, onUpdate: paint }),
        fade: spring({ from: 1, onUpdate: paint, restDistance: 0.005, restVelocity: 0.05 }),
      };
    }
    return springs.current;
  };

  const clearCommitTimer = () => {
    if (commitTimer.current !== null) {
      window.clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
  };

  const fireCommit = () => {
    const dir = pendingCommit.current;
    if (!dir) return;
    pendingCommit.current = null;
    const { x, fade } = getSprings();
    pendingEnter.current = { side: dir === "right" ? 1 : -1, velocity: x.velocity };
    x.stop();
    fade.stop();
    phase.current = "committed";
    (dir === "right" ? propsRef.current.onSwipeRight : propsRef.current.onSwipeLeft)();
    clearCommitTimer();
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = null;
      // The parent did not change the content (e.g. nothing to do): bring the card back.
      if (phase.current === "committed") {
        pendingEnter.current = null;
        x.set(0);
        fade.retarget(1, { damping: 1, response: 0.2 });
        phase.current = "idle";
      }
    }, COMMIT_FALLBACK_MS);
  };

  const maybeCommit = () => {
    if (phase.current !== "exiting" || !pendingCommit.current) return;
    const { x, fade } = getSprings();
    const { width, viewport } = metrics.current;
    if (fade.value <= 0.02 || Math.abs(x.value) >= (viewport + width) / 2) fireCommit();
  };

  const returnToCenter = (velocity: number) => {
    const { x } = getSprings();
    if (prefersReducedMotion()) {
      x.set(0);
      phase.current = "idle";
      return;
    }
    phase.current = "returning";
    const fast = Math.abs(velocity) >= 300;
    x.retarget(0, {
      damping: fast ? 0.8 : 1,
      response: fast ? 0.35 : 0.4,
      velocity,
      onSettle: () => {
        phase.current = "idle";
      },
    });
  };

  const exit = (dir: SwipeDirection, velocity: number) => {
    const { x, fade } = getSprings();
    const side = dir === "right" ? 1 : -1;
    phase.current = "exiting";
    pendingCommit.current = dir;
    if (prefersReducedMotion()) {
      fade.retarget(0, { damping: 1, response: 0.15 });
      return;
    }
    const { width, viewport } = metrics.current;
    const distance = (viewport + width) / 2 + 40;
    x.retarget(side * distance, { damping: 1, response: 0.3, velocity });
    fade.retarget(0, { damping: 1, response: 0.25 });
  };

  /** Decide what happens when the finger lifts (or a tap lands mid-flight). */
  const release = (velocity: number) => {
    const { x } = getSprings();
    const value = x.value;
    const side = Math.sign(value);
    if (side === 0) {
      phase.current = "idle";
      x.set(0);
      return;
    }
    const dir: SwipeDirection = side > 0 ? "right" : "left";
    if (!allowed(dir)) {
      returnToCenter(velocity * 0.25);
      return;
    }
    // A flick back towards the centre wins over how far the card was dragged.
    if (Math.sign(velocity) === -side && Math.abs(velocity) > BACKSWING_VELOCITY) {
      returnToCenter(velocity);
      return;
    }
    const threshold = Math.min(120, 0.32 * metrics.current.width);
    const projected = value + project(velocity);
    const commit =
      Math.abs(value) > threshold || (Math.abs(value) >= MIN_FLICK_DX && Math.abs(projected) > threshold);
    if (commit) exit(dir, velocity);
    else returnToCenter(velocity);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || phase.current === "committed") return;
    const { x, fade } = getSprings();
    // Interrupt whatever is happening and take over from the live position.
    x.stop();
    if (phase.current === "exiting") pendingCommit.current = null;
    if (fade.value < 1) fade.retarget(1, { damping: 1, response: 0.2 });
    measure();
    const tracker = createVelocityTracker();
    tracker.push(e.clientX);
    // Track the rest of the gesture on the window so it never depends on
    // where the pointer happens to be over (or capture timing).
    const onMove = (ev: PointerEvent) => onPointerMove(ev);
    const onEnd = (ev: PointerEvent) => onPointerEnd(ev);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabX: x.value,
      axis: "none",
      tracker,
      detach: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
      },
    };
    phase.current = "dragging";
    el.current?.classList.add("dragging");
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.axis === "none") {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (d.axis !== "x") return;
    const raw = d.grabX + dx;
    const dir: SwipeDirection = raw > 0 ? "right" : "left";
    const value = allowed(dir) ? raw : rubberband(raw, metrics.current.width);
    d.tracker.push(e.clientX);
    getSprings().x.set(value);
  };

  const onPointerEnd = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.detach();
    drag.current = null;
    el.current?.classList.remove("dragging");
    const velocity = d.axis === "x" && e.type !== "pointercancel" ? d.tracker.velocity() : 0;
    release(velocity);
  };

  const swipe = (dir: SwipeDirection) => {
    if (phase.current === "dragging" || phase.current === "exiting" || phase.current === "committed") return;
    measure();
    const side = dir === "right" ? 1 : -1;
    const { x } = getSprings();
    if (!allowed(dir)) {
      if (prefersReducedMotion()) return;
      phase.current = "returning";
      x.retarget(side * 16, {
        damping: 1,
        response: 0.2,
        onSettle: () => x.retarget(0, { damping: 1, response: 0.3, onSettle: () => (phase.current = "idle") }),
      });
      return;
    }
    exit(dir, side * KEYBOARD_VELOCITY);
  };

  useImperativeHandle(ref, () => ({ swipe }));

  // New content: bring it in from the side the previous card left towards.
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const { x, fade } = getSprings();
    clearCommitTimer();
    const enter = pendingEnter.current;
    pendingEnter.current = null;
    if (!enter) {
      x.set(0);
      fade.set(1);
      phase.current = "idle";
      return;
    }
    phase.current = "entering";
    const settle = () => {
      phase.current = "idle";
    };
    if (prefersReducedMotion()) {
      x.set(0);
      fade.set(0);
      fade.retarget(1, { damping: 1, response: 0.25, onSettle: settle });
      return;
    }
    const offset = clamp(0.08 * metrics.current.width, 24, 40);
    x.set(enter.side * offset);
    fade.set(0);
    x.retarget(0, {
      damping: 1,
      response: 0.4,
      velocity: -enter.side * Math.min(0.5 * Math.abs(enter.velocity), 900),
      onSettle: settle,
    });
    fade.retarget(1, { damping: 1, response: 0.3 });
  }, [props.contentKey]);

  useEffect(
    () => () => {
      drag.current?.detach();
      springs.current?.x.stop();
      springs.current?.fade.stop();
      clearCommitTimer();
    },
    [],
  );

  return (
    <div
      ref={el}
      className="swipe-card"
      onPointerDown={onPointerDown}
    >
      {props.children}
    </div>
  );
});
