/** Where a flick would come to rest under scroll-style deceleration (px). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary: the further, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface VelocityTracker {
  push(x: number, t?: number): void;
  /** Velocity in px/s over the recent window; 0 if the pointer paused. */
  velocity(now?: number): number;
  reset(): void;
}

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function createVelocityTracker(windowMs = 100, pauseMs = 50): VelocityTracker {
  let samples: { x: number; t: number }[] = [];
  return {
    push(x, t = nowMs()) {
      samples.push({ x, t });
      const cutoff = t - windowMs;
      while (samples.length > 2 && samples[1].t < cutoff) samples.shift();
    },
    velocity(now = nowMs()) {
      if (samples.length < 2) return 0;
      const last = samples[samples.length - 1];
      if (now - last.t > pauseMs) return 0;
      const cutoff = last.t - windowMs;
      let first = samples[0];
      for (const s of samples) {
        if (s.t >= cutoff) {
          first = s;
          break;
        }
      }
      const dt = last.t - first.t;
      if (dt <= 0) return 0;
      return ((last.x - first.x) / dt) * 1000;
    },
    reset() {
      samples = [];
    },
  };
}
