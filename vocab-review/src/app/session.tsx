/**
 * React binding for a ReviewStore: exposes the collection, the current review
 * state and the application actions (getCurrentWord, moveForward, ...).
 */
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Collection, Word } from "../domain/types";
import {
  canUndo,
  clearSavedIn,
  getCurrentWordId,
  getProgress,
  isComplete,
  isSavedIn,
  moveForward,
  resetAll,
  resetProgress,
  toggleSavedIn,
  undoPreviousReview,
  type Progress,
  type ReviewState,
  type SavedCategory,
} from "../domain/review";
import type { ReviewStore } from "../storage/reviewStore";

interface SessionContextValue {
  store: ReviewStore;
  collection: Collection;
  wordsById: Map<number, Word>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ store, children }: { store: ReviewStore; children: ReactNode }) {
  const value = useMemo<SessionContextValue>(() => {
    const wordsById = new Map<number, Word>();
    for (const w of store.collection.words) wordsById.set(w.id, w);
    return { store, collection: store.collection, wordsById };
  }, [store]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("SessionProvider missing");
  return ctx;
}

export function useCollection(): Collection {
  return useSessionContext().collection;
}

export function useReviewState(): ReviewState {
  const { store } = useSessionContext();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useWord(id: number | null): Word | null {
  const { wordsById } = useSessionContext();
  return id === null ? null : wordsById.get(id) ?? null;
}

export interface ReviewSession {
  state: ReviewState;
  progress: Progress;
  currentWord: Word | null;
  complete: boolean;
  canUndo: boolean;
  /** Bookmark lists ("saved", "savedPinyin") share one API; the category picks the list. */
  isSaved(category: SavedCategory, id: number): boolean;
  getSavedWords(category: SavedCategory): Word[];
  toggleSaved(category: SavedCategory, id: number): void;
  clearSaved(category: SavedCategory): void;
  moveForward(): void;
  undoPreviousReview(): void;
  resetProgress(): void;
  resetAll(): void;
}

export function useReviewSession(): ReviewSession {
  const { store, collection, wordsById } = useSessionContext();
  const state = useReviewState();
  return useMemo<ReviewSession>(() => {
    const currentId = getCurrentWordId(state);
    return {
      state,
      progress: getProgress(state),
      currentWord: currentId === null ? null : wordsById.get(currentId) ?? null,
      complete: isComplete(state),
      canUndo: canUndo(state),
      isSaved: (category, id) => isSavedIn(state, category, id),
      getSavedWords: (category) =>
        state[category].map((id) => wordsById.get(id)).filter((w): w is Word => Boolean(w)),
      toggleSaved: (category, id) => store.update((s) => toggleSavedIn(s, category, id)),
      clearSaved: (category) => store.update((s) => clearSavedIn(s, category)),
      moveForward: () => store.update(moveForward),
      undoPreviousReview: () => store.update(undoPreviousReview),
      resetProgress: () => store.update((s) => resetProgress(s)),
      resetAll: () => store.update(() => resetAll(collection)),
    };
  }, [state, store, collection, wordsById]);
}
