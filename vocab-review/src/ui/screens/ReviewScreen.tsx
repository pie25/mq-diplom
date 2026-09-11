import { useEffect, useRef, useState } from "react";
import { useReviewSession } from "../../app/session";
import { RevealBar } from "../components/RevealBar";
import { Screen } from "../components/Screen";
import { Stage } from "../components/Stage";
import { SwipeCard, type SwipeCardHandle } from "../components/SwipeCard";
import { WordDisplay } from "../components/WordDisplay";
import { formatNumber } from "../format";
import { CompletionScreen } from "./CompletionScreen";

interface Reveal {
  wordId: number | null;
  pronunciation: boolean;
  definition: boolean;
}

const HIDDEN: Reveal = { wordId: null, pronunciation: false, definition: false };

export function ReviewScreen() {
  const session = useReviewSession();
  const { currentWord, progress, complete } = session;
  const card = useRef<SwipeCardHandle>(null);
  const [reveal, setReveal] = useState<Reveal>(HIDDEN);

  // Reveal state belongs to one card only: a new word always starts hidden.
  const shown = currentWord && reveal.wordId === currentWord.id ? reveal : HIDDEN;
  const toggle = (key: "pronunciation" | "definition") => {
    if (!currentWord) return;
    setReveal({ ...shown, wordId: currentWord.id, [key]: !shown[key] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") card.current?.swipe("right");
      if (e.key === "ArrowLeft") card.current?.swipe("left");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (complete || !currentWord) return <CompletionScreen />;

  const firstEver = progress.reviewed === 0 && progress.cardNumber === 1;

  return (
    <Screen
      back="/"
      className="review"
      scrollEdges={false}
      aside={
        <span className="counter" aria-label="Position in deck">
          {formatNumber(progress.cardNumber)} / {formatNumber(progress.total)}
        </span>
      }
    >
      <Stage>
        <SwipeCard
          ref={card}
          contentKey={`${currentWord.id}:${progress.cardNumber}`}
          canSwipeRight
          canSwipeLeft={session.canUndo}
          onSwipeRight={session.moveForward}
          onSwipeLeft={session.undoPreviousReview}
        >
          <WordDisplay
            word={currentWord}
            showPronunciation={shown.pronunciation}
            showDefinition={shown.definition}
          />
        </SwipeCard>
      </Stage>
      <div className="review-bottom chrome chrome-bottom">
        <RevealBar
          saved={session.isSaved("saved", currentWord.id)}
          savedPinyin={session.isSaved("savedPinyin", currentWord.id)}
          pronunciation={shown.pronunciation}
          definition={shown.definition}
          onToggleSaved={() => session.toggleSaved("saved", currentWord.id)}
          onToggleSavedPinyin={() => session.toggleSaved("savedPinyin", currentWord.id)}
          onTogglePronunciation={() => toggle("pronunciation")}
          onToggleDefinition={() => toggle("definition")}
        />
        <p className={"hint" + (firstEver ? "" : " hidden")} aria-hidden={!firstEver}>
          Swipe right when you know it · swipe left to go back
        </p>
      </div>
    </Screen>
  );
}
