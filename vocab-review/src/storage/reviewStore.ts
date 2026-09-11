/**
 * Binds a collection + review state to storage and exposes a small
 * subscribe/getState/update API that the UI layer consumes.
 */
import type { Collection } from "../domain/types";
import {
  createReviewState,
  isReviewState,
  reconcileWithCollection,
  REVIEW_SCHEMA_VERSION,
  type ReviewState,
} from "../domain/review";
import type { StorageAdapter } from "./storage";

export type Listener = () => void;

export interface ReviewStore {
  readonly collection: Collection;
  getState(): ReviewState;
  update(fn: (state: ReviewState) => ReviewState): void;
  subscribe(listener: Listener): () => void;
}

export function reviewStateKey(collectionId: string): string {
  return `review/${collectionId}`;
}

export function loadReviewState(collection: Collection, storage: StorageAdapter): ReviewState {
  const stored = storage.get<unknown>(reviewStateKey(collection.id));
  if (isReviewState(stored) && stored.collectionId === collection.id) {
    const reconciled = reconcileWithCollection({ ...stored, schemaVersion: REVIEW_SCHEMA_VERSION }, collection);
    if (reconciled !== stored) storage.set(reviewStateKey(collection.id), reconciled);
    return reconciled;
  }
  const fresh = createReviewState(collection);
  storage.set(reviewStateKey(collection.id), fresh);
  return fresh;
}

export function createReviewStore(collection: Collection, storage: StorageAdapter): ReviewStore {
  let state = loadReviewState(collection, storage);
  const listeners = new Set<Listener>();
  return {
    collection,
    getState: () => state,
    update(fn) {
      const next = fn(state);
      if (next === state) return;
      state = next;
      storage.set(reviewStateKey(collection.id), state);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
