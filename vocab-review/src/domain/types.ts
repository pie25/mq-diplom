/**
 * Vocabulary source data. A collection is any ordered set of words in one
 * language; HSK 3.0 is simply the first collection shipped with the app.
 */
export interface Word {
  id: number;
  /** The form shown on the card (simplified Chinese for the HSK collection). */
  written_form: string;
  /** Pronunciation (pinyin with tone marks for Chinese). */
  pronunciation: string;
  /** Monolingual definition in the collection's language. */
  definition: string;
  /** Free-form source metadata, e.g. { hsk_system: "HSK 3.0", hsk_level: "7-9" }. */
  metadata: Record<string, unknown>;
}

export interface Collection {
  id: string;
  name: string;
  language: string;
  source: string;
  version: string;
  words: Word[];
}

export interface CollectionSummary {
  id: string;
  name: string;
  language: string;
  /** Relative URL of the collection JSON file. */
  url: string;
}
