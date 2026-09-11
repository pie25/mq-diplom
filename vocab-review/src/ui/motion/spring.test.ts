import { describe, expect, it } from "vitest";
import { coefficients, spring, type SpringDriver } from "./spring";

/** Deterministic frame driver: advance() runs frames at 60 Hz. */
function fakeDriver() {
  let time = 0;
  let pending: ((t: number) => void) | null = null;
  const driver: SpringDriver = {
    now: () => time,
    request: (cb) => {
      pending = cb;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
  };
  const advance = (seconds: number) => {
    const frames = Math.round(seconds * 60);
    for (let i = 0; i < frames; i++) {
      time += 1000 / 60;
      const cb = pending;
      pending = null;
      cb?.(time);
    }
  };
  return { driver, advance, get busy() { return pending !== null; } };
}

describe("spring", () => {
  it("maps damping/response to stiffness and damping coefficient", () => {
    const { stiffness, dampingCoefficient } = coefficients(1, 0.4);
    const omega = (2 * Math.PI) / 0.4;
    expect(stiffness).toBeCloseTo(omega * omega);
    expect(dampingCoefficient).toBeCloseTo(2 * omega);
  });

  it("critically damped: settles at the target without crossing it", () => {
    const f = fakeDriver();
    const values: number[] = [];
    let settled = false;
    const s = spring({ from: 100, onUpdate: (v) => values.push(v), driver: f.driver });
    s.retarget(0, { damping: 1, response: 0.4, onSettle: () => (settled = true) });
    f.advance(0.6);
    expect(values.every((v) => v >= 0)).toBe(true);
    expect(Math.abs(s.value)).toBeLessThan(0.5);
    f.advance(0.6);
    expect(settled).toBe(true);
    expect(s.value).toBe(0);
    expect(f.busy).toBe(false);
  });

  it("under-damped: overshoots once and comes back", () => {
    const f = fakeDriver();
    const values: number[] = [];
    const s = spring({ from: 100, onUpdate: (v) => values.push(v), driver: f.driver });
    s.retarget(0, { damping: 0.8, response: 0.4 });
    f.advance(1.5);
    expect(Math.min(...values)).toBeLessThan(0);
    expect(s.value).toBe(0);
  });

  it("retarget keeps position and velocity (no brick wall)", () => {
    const f = fakeDriver();
    const s = spring({ from: 0, onUpdate: () => {}, driver: f.driver });
    s.retarget(200, { damping: 1, response: 0.4, velocity: 1500 });
    f.advance(0.1);
    const x = s.value;
    const v = s.velocity;
    expect(v).toBeGreaterThan(0);
    s.retarget(0);
    expect(s.value).toBe(x);
    expect(s.velocity).toBe(v);
    f.advance(1 / 60);
    expect(s.value).toBeGreaterThan(x); // momentum carries it a little further before turning
  });

  it("set() jumps without animating and stop() freezes", () => {
    const f = fakeDriver();
    const values: number[] = [];
    const s = spring({ from: 0, onUpdate: (v) => values.push(v), driver: f.driver });
    s.set(42);
    expect(s.value).toBe(42);
    expect(values).toEqual([42]);
    s.retarget(0);
    f.advance(0.05);
    s.stop();
    const frozen = s.value;
    f.advance(0.5);
    expect(s.value).toBe(frozen);
    expect(f.busy).toBe(false);
  });

  it("accepts a starting velocity via retarget and hands it to the motion", () => {
    const f = fakeDriver();
    const s = spring({ from: 0, onUpdate: () => {}, driver: f.driver });
    s.retarget(400, { damping: 1, response: 0.3, velocity: 2000 });
    f.advance(1 / 60);
    expect(s.value).toBeGreaterThan(20);
  });
});
