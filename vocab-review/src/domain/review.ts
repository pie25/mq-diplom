/**
 * Review/progress state and the pure operations on it.
 *
 * The vocabulary is treated as one persistent shuffled deck. `order` holds
 * every word id exactly once in the shuffled sequence; `position` points at
 * the active card. Swiping right marks the active card reviewed and advances;
 * swiping left steps back one card and un-reviews it, so undoing decisions is
 * simply walking backwards through the same stable sequence.
 *
 * Besides review progress the state keeps two independent bookmark lists with
 * identical mechanics: `saved` (the word itself) and `savedPinyin` (words
 * whose pronunciation the learner wants to keep). They are addressed by a
 * `SavedCategory` so the UI never has to know which list is which.
 *
 * Nothing in here knows about HSK, React or storage.
 */
import type { Collection } from "./types";

/** v1: order/position/reviewed/saved. v2 adds `savedPinyin`. */
export const REVIEW_SCHEMA_VERSION = 2;

export type SavedCategory = "saved" | "savedPinyin";
export const SAVED_CATEGORIES: readonly SavedCategory[] = ["saved", "savedPinyin"];

export interface ReviewState {
  schemaVersion: number;
  collectionId: string;
  /** Word ids in deck order. Created once, never reshuffled except by reset. */
  order: number[];
  /** Index into `order` of the active card. `order.length` means complete. */
  position: number;
  /** Ids of words marked reviewed. */
  reviewed: number[];
  /** Ids of saved (bookmarked) words, in the order they were saved. */
  saved: number[];
  /** Ids of words saved for their pronunciation ("Save Pinyin"), independent from `saved`. */
  savedPinyin: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Progress {
  total: number;
  reviewed: number;
  remaining: number;
  saved: number;
  savedPinyin: number;
  /** 1-based number of the active card, for "word #638" style display. */
  cardNumber: number;
}

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function now(): string {
  return new Date().toISOString();
}

export function createReviewState(collection: Collection, rng: Rng = Math.random): ReviewState {
  const stamp = now();
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    collectionId: collection.id,
    order: shuffle(collection.words.map((w) => w.id), rng),
    position: 0,
    reviewed: [],
    saved: [],
    savedPinyin: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Upgrade a stored state from an older schema. v1 states have no
 * `savedPinyin`; everything else is carried over untouched.
 */
export function normalizeReviewState(stored: ReviewState): ReviewState {
  const v = stored as Partial<ReviewState>;
  const ids = (list: unknown): number[] =>
    Array.isArray(list) ? list.filter((x): x is number => typeof x === "number") : [];
  return {
    ...stored,
    schemaVersion: REVIEW_SCHEMA_VERSION,
    saved: ids(v.saved),
    savedPinyin: ids(v.savedPinyin),
  };
}

/**
 * Bring a stored state in line with the current collection: drop ids that no
 * longer exist and append (shuffled) any new ids to the end of the deck.
 * Keeps `position` pointing at the same card whenever that card still exists.
 */
export function reconcileWithCollection(
  state: ReviewState,
  collection: Collection,
  rng: Rng = Math.random,
): ReviewState {
  const known = new Set(collection.words.map((w) => w.id));
  const seen = new Set<number>();
  const activeId = state.order[state.position];
  const order = state.order.filter((id) => {
    if (!known.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const missing = collection.words.map((w) => w.id).filter((id) => !seen.has(id));
  if (missing.length) order.push(...shuffle(missing, rng));

  const reviewed = state.reviewed.filter((id) => known.has(id));
  const saved = state.saved.filter((id) => known.has(id));
  const savedPinyin = state.savedPinyin.filter((id) => known.has(id));

  let position = order.indexOf(activeId);
  if (position < 0) position = Math.min(state.position, order.length);

  const unchanged =
    order.length === state.order.length &&
    reviewed.length === state.reviewed.length &&
    saved.length === state.saved.length &&
    savedPinyin.length === state.savedPinyin.length &&
    position === state.position &&
    order.every((id, i) => id === state.order[i]);
  if (unchanged) return state;
  return { ...state, order, reviewed, saved, savedPinyin, position, updatedAt: now() };
}

export function getCurrentWordId(state: ReviewState): number | null {
  return state.position < state.order.length ? state.order[state.position] : null;
}

export function getPreviousWordId(state: ReviewState): number | null {
  return state.position > 0 ? state.order[state.position - 1] : null;
}

export function isComplete(state: ReviewState): boolean {
  return state.order.length > 0 && state.position >= state.order.length;
}

export function canUndo(state: ReviewState): boolean {
  return state.position > 0;
}

/** Swipe right: mark the active card reviewed and show the next one. */
export function moveForward(state: ReviewState): ReviewState {
  const id = getCurrentWordId(state);
  if (id === null) return state;
  const reviewedSet = new Set(state.reviewed);
  reviewedSet.add(id);
  let position = state.position + 1;
  // Defensive: never re-show a card that is already reviewed.
  while (position < state.order.length && reviewedSet.has(state.order[position])) position++;
  return { ...state, reviewed: Array.from(reviewedSet), position, updatedAt: now() };
}

/** Swipe left: go back to the previous card and take back its review. */
export function undoPreviousReview(state: ReviewState): ReviewState {
  if (!canUndo(state)) return state;
  const position = state.position - 1;
  const id = state.order[position];
  return {
    ...state,
    reviewed: state.reviewed.filter((x) => x !== id),
    position,
    updatedAt: now(),
  };
}

/* ---------- bookmark lists (saved / savedPinyin) ---------- */

export function isSavedIn(state: ReviewState, category: SavedCategory, id: number): boolean {
  return state[category].includes(id);
}

export function toggleSavedIn(state: ReviewState, category: SavedCategory, id: number): ReviewState {
  const list = isSavedIn(state, category, id)
    ? state[category].filter((x) => x !== id)
    : [...state[category], id];
  return { ...state, [category]: list, updatedAt: now() };
}

export function clearSavedIn(state: ReviewState, category: SavedCategory): ReviewState {
  if (state[category].length === 0) return state;
  return { ...state, [category]: [], updatedAt: now() };
}

/** Shorthands for the plain "saved" list. */
export const isSaved = (state: ReviewState, id: number): boolean => isSavedIn(state, "saved", id);
export const toggleSavedWord = (state: ReviewState, id: number): ReviewState =>
  toggleSavedIn(state, "saved", id);
export const clearSavedWords = (state: ReviewState): ReviewState => clearSavedIn(state, "saved");

export function getProgress(state: ReviewState): Progress {
  const total = state.order.length;
  const reviewed = state.reviewed.length;
  return {
    total,
    reviewed,
    remaining: total - reviewed,
    saved: state.saved.length,
    savedPinyin: state.savedPinyin.length,
    cardNumber: Math.min(state.position + 1, total),
  };
}

/** New shuffled deck, nothing reviewed. Both bookmark lists are kept. */
export function resetProgress(state: ReviewState, rng: Rng = Math.random): ReviewState {
  return {
    ...state,
    order: shuffle(state.order, rng),
    position: 0,
    reviewed: [],
    updatedAt: now(),
  };
}

/** Everything gone: new deck, no reviews, no saved words of either kind. */
export function resetAll(collection: Collection, rng: Rng = Math.random): ReviewState {
  return createReviewState(collection, rng);
}

export function isReviewState(value: unknown): value is ReviewState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.collectionId === "string" &&
    Array.isArray(v.order) &&
    typeof v.position === "number" &&
    Array.isArray(v.reviewed) &&
    Array.isArray(v.saved)
  );
}
