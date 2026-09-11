import { useState } from "react";
import { listPath } from "../../app/router";
import { useReviewSession, useWord } from "../../app/session";
import type { SavedCategory } from "../../domain/review";
import { RevealBar } from "../components/RevealBar";
import { Screen } from "../components/Screen";
import { Stage } from "../components/Stage";
import { WordDisplay } from "../components/WordDisplay";
import { describeLevel } from "../format";

/** A word opened from one of the bookmark lists; `category` only decides where "back" goes. */
export function WordScreen({ id, category }: { id: number; category: SavedCategory }) {
  const word = useWord(id);
  const session = useReviewSession();
  const [pronunciation, setPronunciation] = useState(false);
  const [definition, setDefinition] = useState(false);
  const back = listPath(category);
  if (!word) {
    return (
      <Screen back={back}>
        <p className="empty">This word is not in the collection.</p>
      </Screen>
    );
  }
  const level = describeLevel(word.metadata);
  return (
    <Screen
      back={back}
      className="review"
      scrollEdges={false}
      aside={level ? <span className="counter">{level}</span> : null}
    >
      <Stage>
        <div className="swipe-card static">
          <WordDisplay word={word} showPronunciation={pronunciation} showDefinition={definition} />
        </div>
      </Stage>
      <div className="review-bottom chrome chrome-bottom">
        <RevealBar
          saved={session.isSaved("saved", word.id)}
          savedPinyin={session.isSaved("savedPinyin", word.id)}
          pronunciation={pronunciation}
          definition={definition}
          onToggleSaved={() => session.toggleSaved("saved", word.id)}
          onToggleSavedPinyin={() => session.toggleSaved("savedPinyin", word.id)}
          onTogglePronunciation={() => setPronunciation((v) => !v)}
          onToggleDefinition={() => setDefinition((v) => !v)}
        />
      </div>
    </Screen>
  );
}
