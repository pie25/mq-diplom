import { describe, expect, it } from "vitest";
import { inferDirection, parseRoute } from "./router";

describe("parseRoute", () => {
  it("maps hashes to routes", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/review")).toEqual({ name: "review" });
    expect(parseRoute("#/saved")).toEqual({ name: "saved" });
    expect(parseRoute("#/saved/42")).toEqual({ name: "word", id: 42 });
    expect(parseRoute("#/settings/")).toEqual({ name: "settings" });
    expect(parseRoute("#/nonsense")).toEqual({ name: "home" });
  });
});

describe("inferDirection", () => {
  it("pushes when going deeper and pops when coming back", () => {
    expect(inferDirection({ name: "home" }, { name: "review" })).toBe("forward");
    expect(inferDirection({ name: "saved" }, { name: "word", id: 1 })).toBe("forward");
    expect(inferDirection({ name: "word", id: 1 }, { name: "saved" })).toBe("back");
    expect(inferDirection({ name: "settings" }, { name: "home" })).toBe("back");
    expect(inferDirection({ name: "review" }, { name: "saved" })).toBe("none");
  });
});
