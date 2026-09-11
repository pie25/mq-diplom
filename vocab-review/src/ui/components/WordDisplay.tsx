import type { Word } from "../../domain/types";

interface WordDisplayProps {
  word: Word;
  showPronunciation: boolean;
  showDefinition: boolean;
}

/** The word itself, and nothing else unless the reader asks for it. */
export function WordDisplay({ word, showPronunciation, showDefinition }: WordDisplayProps) {
  const length = Math.max(1, Array.from(word.written_form).length);
  return (
    <div className="word-display">
      <div className="word" lang="zh-Hans" style={{ "--len": length } as React.CSSProperties}>
        {word.written_form}
      </div>
      {showPronunciation && (
        <div className="pronunciation" lang="zh-Latn-pinyin">
          {word.pronunciation}
        </div>
      )}
      {showDefinition && (
        <div className="definition" lang="zh-Hans">
          {word.definition || "—"}
        </div>
      )}
    </div>
  );
}
