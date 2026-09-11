import { navigate } from "../../app/router";
import { useReviewSession } from "../../app/session";
import { Screen } from "../components/Screen";
import { formatNumber } from "../format";

export function SavedScreen() {
  const { getSavedWords } = useReviewSession();
  const words = getSavedWords();
  return (
    <Screen
      back="/"
      title="Saved words"
      aside={words.length > 0 ? <span className="counter">{formatNumber(words.length)}</span> : null}
    >
      {words.length === 0 ? (
        <p className="empty">No saved words yet. Tap ☆ while reviewing to keep a word here.</p>
      ) : (
        <ul className="word-list">
          {words.map((w) => (
            <li key={w.id}>
              <button type="button" className="word-row" lang="zh-Hans" onClick={() => navigate(`/saved/${w.id}`)}>
                {w.written_form}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
