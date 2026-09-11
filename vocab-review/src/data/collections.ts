import type { Collection, CollectionSummary } from "../domain/types";

/** Registry of collections available to the app. HSK 3.0 is the first. */
export const COLLECTIONS: CollectionSummary[] = [
  { id: "hsk30", name: "HSK 3.0", language: "zh", url: "collections/hsk30.json" },
];

export const DEFAULT_COLLECTION_ID = "hsk30";

const cache = new Map<string, Promise<Collection>>();

export function loadCollection(id: string = DEFAULT_COLLECTION_ID): Promise<Collection> {
  const summary = COLLECTIONS.find((c) => c.id === id);
  if (!summary) return Promise.reject(new Error(`Unknown collection: ${id}`));
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(import.meta.env.BASE_URL + summary.url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load collection (${res.status})`);
        return res.json() as Promise<Collection>;
      })
      .then((data) => {
        if (!data || !Array.isArray(data.words)) throw new Error("Malformed collection file");
        return data;
      });
    cache.set(id, pending);
    pending.catch(() => cache.delete(id));
  }
  return pending;
}
