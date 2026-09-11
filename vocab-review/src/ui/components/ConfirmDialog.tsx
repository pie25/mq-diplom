import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { createVelocityTracker, project, rubberband, type VelocityTracker } from "../motion/physics";
import { isWideScreen, prefersReducedMotion } from "../motion/preferences";
import { spring, type SpringHandle } from "../motion/spring";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** When set, the user must tick this statement before confirming. */
  acknowledgement?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

type Presence = "closed" | "open" | "closing";

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  grabY: number;
  axis: "none" | "x" | "y";
  tracker: VelocityTracker;
  detach: () => void;
}

const AXIS_LOCK = 8;
const REOPEN_VELOCITY = -150;

/**
 * Confirmation as a bottom sheet on phones (spring in from below, drag down
 * to dismiss with momentum) and a centred panel on wide screens.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  acknowledgement,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [presence, setPresence] = useState<Presence>(open ? "open" : "closed");
  const [wide, setWide] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const motion = useRef<{ y: SpringHandle; fade: SpringHandle } | null>(null);
  const height = useRef(1);
  const drag = useRef<Drag | null>(null);
  const suppressClickUntil = useRef(0);
  const opener = useRef<Element | null>(null);
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const getMotion = () => {
    if (!motion.current) {
      const paint = () => {
        const m = motion.current;
        const p = panel.current;
        const b = backdrop.current;
        if (!m || !p || !b) return;
        const y = m.y.value;
        const fade = Math.max(0, Math.min(1, m.fade.value));
        p.style.transform = y === 0 ? "" : `translate3d(0, ${y}px, 0)`;
        p.style.opacity = fade >= 1 ? "" : String(fade);
        const lift = Math.max(0, Math.min(1, 1 - y / height.current));
        b.style.setProperty("--scrim", (lift * fade).toFixed(3));
      };
      motion.current = {
        y: spring({ from: 0, onUpdate: paint }),
        fade: spring({ from: 1, onUpdate: paint, restDistance: 0.005, restVelocity: 0.05 }),
      };
    }
    return motion.current;
  };

  useEffect(() => {
    if (open) {
      setAcknowledged(false);
      setWide(isWideScreen());
      setPresence("open");
    } else if (presenceRef.current === "open") {
      setPresence("closing");
    }
  }, [open]);

  // Animate in/out from the live position (a reopen mid-close just turns around).
  useLayoutEffect(() => {
    const p = panel.current;
    if (presence === "closed" || !p) return;
    const { y, fade } = getMotion();
    const reduced = prefersReducedMotion();
    if (presence === "open") {
      height.current = Math.max(1, p.offsetHeight);
      opener.current = document.activeElement;
      if (reduced) {
        y.set(0);
        fade.set(0);
        fade.retarget(1, { damping: 1, response: 0.2 });
      } else if (wide) {
        if (!y.running) y.set(16);
        if (!fade.running) fade.set(0);
        y.retarget(0, { damping: 1, response: 0.3 });
        fade.retarget(1, { damping: 1, response: 0.25 });
      } else {
        if (!y.running && y.value === 0) y.set(height.current);
        if (!fade.running) fade.set(1);
        y.retarget(0, { damping: 0.8, response: 0.3 });
      }
      p.focus({ preventScroll: true });
      return;
    }
    const done = () => setPresence("closed");
    if (reduced) {
      fade.retarget(0, { damping: 1, response: 0.2, onSettle: done });
    } else if (wide) {
      y.retarget(16, { damping: 1, response: 0.25 });
      fade.retarget(0, { damping: 1, response: 0.2, onSettle: done });
    } else {
      y.retarget(height.current, { damping: 1, response: 0.3, onSettle: done });
    }
  }, [presence, wide]);

  // While shown: the page behind is inert, Escape cancels, focus returns afterwards.
  const shown = presence !== "closed";
  useEffect(() => {
    if (!shown) return;
    const root = document.getElementById("root") as (HTMLElement & { inert?: boolean }) | null;
    if (root) root.inert = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (root) root.inert = false;
      const el = opener.current;
      if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    };
  }, [shown]);

  useEffect(
    () => () => {
      drag.current?.detach();
      motion.current?.y.stop();
      motion.current?.fade.stop();
    },
    [],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (wide || e.button !== 0 || presenceRef.current !== "open") return;
    const { y } = getMotion();
    y.stop();
    const tracker = createVelocityTracker();
    tracker.push(e.clientY);
    const onMove = (ev: PointerEvent) => onPointerMove(ev);
    const onEnd = (ev: PointerEvent) => onPointerEnd(ev);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabY: y.value,
      axis: "none",
      tracker,
      detach: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
      },
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.axis === "none") {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      d.axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
    }
    if (d.axis !== "y") return;
    const raw = d.grabY + dy;
    d.tracker.push(e.clientY);
    getMotion().y.set(raw < 0 ? rubberband(raw, height.current) : raw);
  };

  const onPointerEnd = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.detach();
    drag.current = null;
    const { y } = getMotion();
    if (d.axis !== "y") {
      // a tap: resume whatever motion the touch interrupted
      if (y.value !== 0) y.retarget(0, { damping: 0.8, response: 0.3 });
      return;
    }
    suppressClickUntil.current = performance.now() + 100;
    const velocity = e.type === "pointercancel" ? 0 : d.tracker.velocity();
    if (velocity < REOPEN_VELOCITY) {
      y.retarget(0, { damping: 0.8, response: 0.3, velocity });
      return;
    }
    const projected = y.value + project(velocity);
    if (projected > 0.5 * height.current) {
      y.retarget(height.current, {
        damping: 1,
        response: 0.3,
        velocity: Math.max(velocity, 0),
        onSettle: () => {
          setPresence("closed");
          onCancelRef.current();
        },
      });
    } else {
      y.retarget(0, { damping: 0.8, response: 0.3, velocity });
    }
  };

  const suppressClick = (e: ReactMouseEvent) => {
    if (performance.now() < suppressClickUntil.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!shown) return null;
  const ready = !acknowledgement || acknowledged;

  return createPortal(
    <div
      ref={backdrop}
      className={"dialog-backdrop" + (wide ? " centered" : " sheet-host") + (presence === "closing" ? " closing" : "")}
      onClickCapture={suppressClick}
      onClick={() => onCancelRef.current()}
    >
      <div
        ref={panel}
        className={"dialog" + (wide ? "" : " sheet")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
      >
        {!wide && <div className="sheet-grabber" aria-hidden="true" />}
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        <div id={bodyId} className="dialog-body">
          {children}
        </div>
        {acknowledgement && (
          <label className="dialog-ack">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            <span>{acknowledgement}</span>
          </label>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={"button" + (danger ? " danger" : " primary")}
            disabled={!ready}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
