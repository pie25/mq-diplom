import { useState } from "react";
import { useReviewSession, useWord } from "../../app/session";
import { RevealBar } from "../components/RevealBar";
import { Screen } from "../components/Screen";
import { Stage } from "../components/Stage";
import { WordDisplay } from "../components/WordDisplay";
import { describeLevel } from "../format";

export function WordScreen({ id }: { id: number }) {
  const word = useWord(id);
  const session = useReviewSession();
  const [pronunciation, setPronunciation] = useState(false);
  const [definition, setDefinition] = useState(false);
  if (!word) {
    return (
      <Screen back="/saved">
        <p className="empty">This word is not in the collection.</p>
      </Screen>
    );
  }
  const level = describeLevel(word.metadata);
  return (
    <Screen
      back="/saved"
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
          saved={session.isSaved(word.id)}
          pronunciation={pronunciation}
          definition={definition}
          onToggleSaved={() => session.toggleSavedWord(word.id)}
          onTogglePronunciation={() => setPronunciation((v) => !v)}
          onToggleDefinition={() => setDefinition((v) => !v)}
        />
      </div>
    </Screen>
  );
}
