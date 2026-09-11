import { describe, expect, it } from "vitest";
import { createVelocityTracker, project, rubberband } from "./physics";

describe("project", () => {
  it("projects a flick to its resting distance", () => {
    expect(project(1000)).toBeCloseTo(499, 0);
    expect(project(-500)).toBeCloseTo(-249.5, 0);
    expect(project(0)).toBe(0);
  });
});

describe("rubberband", () => {
  it("resists progressively and never exceeds the dimension", () => {
    expect(rubberband(264, 350)).toBeCloseTo(102.6, 0);
    expect(rubberband(-264, 350)).toBeCloseTo(-102.6, 0);
    let previous = 0;
    for (let d = 0; d < 2000; d += 50) {
      const r = rubberband(d, 350);
      expect(r).toBeGreaterThanOrEqual(previous);
      expect(r).toBeLessThan(350);
      previous = r;
    }
  });
});

describe("velocity tracker", () => {
  it("measures velocity over the recent window", () => {
    const t = createVelocityTracker();
    for (let i = 0; i <= 10; i++) t.push(i * 20, i * 16);
    expect(t.velocity(160)).toBeCloseTo(1250, 0);
  });

  it("returns 0 after the pointer paused before release", () => {
    const t = createVelocityTracker();
    t.push(0, 0);
    t.push(100, 50);
    expect(t.velocity(120)).toBe(0);
  });

  it("returns 0 with a single sample", () => {
    const t = createVelocityTracker();
    t.push(5, 0);
    expect(t.velocity(0)).toBe(0);
  });
});
