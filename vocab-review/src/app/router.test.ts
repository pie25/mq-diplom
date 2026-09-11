import { describe, expect, it } from "vitest";
import { inferDirection, listPath, parseRoute, wordPath } from "./router";

describe("parseRoute", () => {
  it("maps hashes to routes", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/review")).toEqual({ name: "review" });
    expect(parseRoute("#/saved")).toEqual({ name: "saved", category: "saved" });
    expect(parseRoute("#/saved/42")).toEqual({ name: "word", id: 42, category: "saved" });
    expect(parseRoute("#/pinyin")).toEqual({ name: "saved", category: "savedPinyin" });
    expect(parseRoute("#/pinyin/42")).toEqual({ name: "word", id: 42, category: "savedPinyin" });
    expect(parseRoute("#/pinyin/x")).toEqual({ name: "home" });
    expect(parseRoute("#/settings/")).toEqual({ name: "settings" });
    expect(parseRoute("#/nonsense")).toEqual({ name: "home" });
  });
});

describe("paths", () => {
  it("round-trips list and word paths for both categories", () => {
    expect(listPath("saved")).toBe("/saved");
    expect(listPath("savedPinyin")).toBe("/pinyin");
    expect(parseRoute("#" + wordPath("savedPinyin", 7))).toEqual({ name: "word", id: 7, category: "savedPinyin" });
  });
});

describe("inferDirection", () => {
  it("pushes when going deeper and pops when coming back", () => {
    expect(inferDirection({ name: "home" }, { name: "review" })).toBe("forward");
    const saved = { name: "saved", category: "saved" } as const;
    const word = { name: "word", id: 1, category: "savedPinyin" } as const;
    expect(inferDirection(saved, word)).toBe("forward");
    expect(inferDirection(word, saved)).toBe("back");
    expect(inferDirection({ name: "settings" }, { name: "home" })).toBe("back");
    expect(inferDirection({ name: "review" }, saved)).toBe("none");
  });
});
