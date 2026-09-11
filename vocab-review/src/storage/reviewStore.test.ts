import { describe, expect, it } from "vitest";
import { createReviewState, REVIEW_SCHEMA_VERSION } from "../domain/review";
import type { Collection } from "../domain/types";
import { createReviewStore, loadReviewState, reviewStateKey } from "./reviewStore";
import { MemoryStorageAdapter } from "./storage";

const collection: Collection = {
  id: "c",
  name: "C",
  language: "zh",
  source: "",
  version: "1",
  words: [1, 2, 3].map((id) => ({ id, written_form: String(id), pronunciation: "", definition: "", metadata: {} })),
};

describe("loadReviewState", () => {
  it("upgrades a stored v1 state (no savedPinyin) without losing saved words", () => {
    const storage = new MemoryStorageAdapter();
    const v1 = { ...createReviewState(collection, () => 0.5), schemaVersion: 1, saved: [2] } as Record<string, unknown>;
    delete v1.savedPinyin;
    storage.set(reviewStateKey(collection.id), v1);

    const state = loadReviewState(collection, storage);
    expect(state.saved).toEqual([2]);
    expect(state.savedPinyin).toEqual([]);
    expect(state.schemaVersion).toBe(REVIEW_SCHEMA_VERSION);
    // and the upgraded shape is written back
    expect(storage.get<{ savedPinyin: number[] }>(reviewStateKey(collection.id))?.savedPinyin).toEqual([]);
  });

  it("persists both lists through the store", () => {
    const storage = new MemoryStorageAdapter();
    const store = createReviewStore(collection, storage);
    store.update((s) => ({ ...s, savedPinyin: [3] }));
    expect(loadReviewState(collection, storage).savedPinyin).toEqual([3]);
  });
});
