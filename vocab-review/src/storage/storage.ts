/**
 * Tiny key/value persistence abstraction so the review state can live in
 * localStorage today and IndexedDB or a server tomorrow.
 */
export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly prefix = "vocab-review/v1/") {}

  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(this.prefix + key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (err) {
      console.error("Could not persist", key, err);
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>();
  get<T>(key: string): T | null {
    const raw = this.map.get(key);
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }
  set<T>(key: string, value: T): void {
    this.map.set(key, JSON.stringify(value));
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}
