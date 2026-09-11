/**
 * A small spring integrator parameterised the way Apple's designers think
 * about motion: a damping ratio (1 = no overshoot, < 1 = bouncy) and a
 * response time in seconds (how quickly the value heads for its target).
 *
 * The spring is inherently interruptible: `retarget()` keeps the current
 * position and velocity, so re-aiming mid-flight never produces a jump or a
 * velocity "brick wall".
 */

export interface SpringDriver {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
}

const rafDriver: SpringDriver = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

export interface SpringConfig {
  /** Damping ratio ζ: 1 = critically damped, 0.8 = slight bounce. */
  damping?: number;
  /** Response in seconds: roughly how long the spring takes to get there. */
  response?: number;
}

export interface SpringOptions extends SpringConfig {
  from: number;
  to?: number;
  velocity?: number;
  onUpdate: (value: number, velocity: number) => void;
  onSettle?: () => void;
  restDistance?: number;
  restVelocity?: number;
  driver?: SpringDriver;
}

export interface RetargetOptions extends SpringConfig {
  velocity?: number;
  onSettle?: () => void;
}

export interface SpringHandle {
  readonly value: number;
  readonly velocity: number;
  readonly target: number;
  readonly running: boolean;
  /** Aim at a new target, carrying the current position and velocity. */
  retarget(to: number, options?: RetargetOptions): void;
  /** Jump to a value without animating (used while the finger is down). */
  set(value: number, velocity?: number): void;
  /** Freeze where it is; no settle callback. */
  stop(): void;
}

const SUBSTEP = 1 / 240;
const MAX_DT = 1 / 15;

export function coefficients(damping: number, response: number): { stiffness: number; dampingCoefficient: number } {
  const omega = (2 * Math.PI) / response;
  return { stiffness: omega * omega, dampingCoefficient: 2 * damping * omega };
}

/** One semi-implicit Euler step (mass 1). Exported for tests. */
export function step(state: { x: number; v: number }, to: number, stiffness: number, dampingCoefficient: number, dt: number): void {
  const acceleration = -stiffness * (state.x - to) - dampingCoefficient * state.v;
  state.v += acceleration * dt;
  state.x += state.v * dt;
}

export function spring(options: SpringOptions): SpringHandle {
  const driver = options.driver ?? rafDriver;
  const state = { x: options.from, v: options.velocity ?? 0 };
  let target = options.to ?? options.from;
  let damping = options.damping ?? 1;
  let response = options.response ?? 0.4;
  let { stiffness, dampingCoefficient } = coefficients(damping, response);
  const restDistance = options.restDistance ?? 0.5;
  const restVelocity = options.restVelocity ?? 5;
  let onSettle = options.onSettle;
  let frame: number | null = null;
  let last = 0;

  const tick = (time: number) => {
    frame = null;
    const dt = Math.min(Math.max(0, (time - last) / 1000), MAX_DT);
    last = time;
    if (dt > 0) {
      const n = Math.ceil(dt / SUBSTEP);
      const h = dt / n;
      for (let i = 0; i < n; i++) step(state, target, stiffness, dampingCoefficient, h);
    }
    if (Math.abs(state.x - target) < restDistance && Math.abs(state.v) < restVelocity) {
      state.x = target;
      state.v = 0;
      options.onUpdate(state.x, state.v);
      const settle = onSettle;
      onSettle = undefined;
      settle?.();
      return;
    }
    options.onUpdate(state.x, state.v);
    frame = driver.request(tick);
  };

  const start = () => {
    if (frame === null) {
      last = driver.now();
      frame = driver.request(tick);
    }
  };

  const stop = () => {
    if (frame !== null) {
      driver.cancel(frame);
      frame = null;
    }
  };

  return {
    get value() {
      return state.x;
    },
    get velocity() {
      return state.v;
    },
    get target() {
      return target;
    },
    get running() {
      return frame !== null;
    },
    retarget(to, opts = {}) {
      target = to;
      if (opts.damping !== undefined || opts.response !== undefined) {
        damping = opts.damping ?? damping;
        response = opts.response ?? response;
        ({ stiffness, dampingCoefficient } = coefficients(damping, response));
      }
      if (opts.velocity !== undefined) state.v = opts.velocity;
      onSettle = opts.onSettle;
      start();
    },
    set(value, velocity = 0) {
      stop();
      onSettle = undefined;
      state.x = value;
      state.v = velocity;
      target = value;
      options.onUpdate(state.x, state.v);
    },
    stop,
  };
}
