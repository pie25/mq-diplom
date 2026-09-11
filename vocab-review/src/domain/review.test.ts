import { describe, expect, it } from "vitest";
import type { Collection } from "./types";
import {
  createReviewState,
  getCurrentWordId,
  getProgress,
  isComplete,
  moveForward,
  reconcileWithCollection,
  resetProgress,
  toggleSavedWord,
  undoPreviousReview,
} from "./review";

const collection: Collection = {
  id: "test",
  name: "Test",
  language: "zh",
  source: "",
  version: "1",
  words: ["A", "B", "C", "D"].map((w, i) => ({
    id: i + 1,
    written_form: w,
    pronunciation: "",
    definition: "",
    metadata: {},
  })),
};

// identity "shuffle": keeps A B C D in place so scenarios are readable
const rng = () => 0.9999;

const wordAt = (state: ReturnType<typeof createReviewState>) =>
  collection.words.find((w) => w.id === getCurrentWordId(state))?.written_form ?? null;

describe("deck navigation", () => {
  it("moves forward through a stable order and marks cards reviewed", () => {
    let s = createReviewState(collection, rng);
    expect(wordAt(s)).toBe("A");
    s = moveForward(s);
    expect(wordAt(s)).toBe("B");
    expect(s.reviewed).toEqual([1]);
    s = moveForward(s);
    expect(wordAt(s)).toBe("C");
    expect(getProgress(s)).toMatchObject({ total: 4, reviewed: 2, remaining: 2, saved: 0 });
  });

  it("swipe left returns to the previous word and un-reviews it", () => {
    let s = createReviewState(collection, rng);
    s = moveForward(s); // A reviewed, showing B
    s = undoPreviousReview(s);
    expect(wordAt(s)).toBe("A");
    expect(s.reviewed).toEqual([]);
    // reviewing A again returns to B, not a random word
    s = moveForward(s);
    expect(wordAt(s)).toBe("B");
    expect(s.reviewed).toEqual([1]);
  });

  it("supports multiple backward swipes and forward again in the same order", () => {
    let s = createReviewState(collection, rng);
    s = moveForward(moveForward(moveForward(s))); // at D
    expect(wordAt(s)).toBe("D");
    s = undoPreviousReview(s);
    expect(wordAt(s)).toBe("C");
    s = undoPreviousReview(s);
    expect(wordAt(s)).toBe("B");
    expect(s.reviewed).toEqual([1]);
    s = undoPreviousReview(s);
    expect(wordAt(s)).toBe("A");
    expect(s.reviewed).toEqual([]);
    // cannot go before the first card
    expect(undoPreviousReview(s)).toBe(s);
    s = moveForward(s);
    s = moveForward(s);
    expect(wordAt(s)).toBe("C");
    s = moveForward(s);
    expect(wordAt(s)).toBe("D");
    expect(s.order).toEqual([1, 2, 3, 4]);
  });

  it("reaches a completion state and never resets by itself", () => {
    let s = createReviewState(collection, rng);
    for (let i = 0; i < 4; i++) s = moveForward(s);
    expect(isComplete(s)).toBe(true);
    expect(getCurrentWordId(s)).toBeNull();
    expect(moveForward(s)).toBe(s);
    expect(getProgress(s).reviewed).toBe(4);
    // undo from the completion state works too
    s = undoPreviousReview(s);
    expect(wordAt(s)).toBe("D");
    expect(isComplete(s)).toBe(false);
  });
});

describe("saved words", () => {
  it("toggles independently from review progress", () => {
    let s = createReviewState(collection, rng);
    s = toggleSavedWord(s, 1);
    expect(s.saved).toEqual([1]);
    s = moveForward(s);
    expect(s.saved).toEqual([1]);
    expect(s.reviewed).toEqual([1]);
    s = toggleSavedWord(s, 1);
    expect(s.saved).toEqual([]);
    expect(s.reviewed).toEqual([1]);
  });

  it("survives a progress reset", () => {
    let s = createReviewState(collection, rng);
    s = toggleSavedWord(moveForward(s), 3);
    s = resetProgress(s, rng);
    expect(s.reviewed).toEqual([]);
    expect(s.position).toBe(0);
    expect(s.saved).toEqual([3]);
  });
});

describe("reconcile", () => {
  it("keeps the active card when the collection gains and loses words", () => {
    let s = createReviewState(collection, rng);
    s = moveForward(s); // at B
    const changed: Collection = {
      ...collection,
      words: [...collection.words.filter((w) => w.id !== 1), { ...collection.words[0], id: 5, written_form: "E" }],
    };
    const r = reconcileWithCollection(s, changed, rng);
    expect(r.order).toEqual([2, 3, 4, 5]);
    expect(getCurrentWordId(r)).toBe(2);
    expect(r.reviewed).toEqual([]);
  });

  it("returns the same object when nothing changed", () => {
    const s = createReviewState(collection, rng);
    expect(reconcileWithCollection(s, collection, rng)).toBe(s);
  });
});
