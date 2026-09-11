import { navigate, wordPath } from "../../app/router";
import { useReviewSession } from "../../app/session";
import type { SavedCategory } from "../../domain/review";
import { Screen } from "../components/Screen";
import { formatNumber } from "../format";

const TEXT: Record<SavedCategory, { title: string; empty: string }> = {
  saved: {
    title: "Saved words",
    empty: "No saved words yet. Tap ☆ while reviewing to keep a word here.",
  },
  savedPinyin: {
    title: "Save Pinyin",
    empty: "Nothing here yet. Tap ♫ while reviewing to keep a word whose pronunciation matters to you.",
  },
};

/** One list screen serves both bookmark categories; they only differ in wording and route. */
export function SavedScreen({ category }: { category: SavedCategory }) {
  const { getSavedWords } = useReviewSession();
  const words = getSavedWords(category);
  const text = TEXT[category];
  return (
    <Screen
      back="/"
      title={text.title}
      aside={words.length > 0 ? <span className="counter">{formatNumber(words.length)}</span> : null}
    >
      {words.length === 0 ? (
        <p className="empty">{text.empty}</p>
      ) : (
        <ul className="word-list">
          {words.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="word-row"
                lang="zh-Hans"
                onClick={() => navigate(wordPath(category, w.id))}
              >
                {w.written_form}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
