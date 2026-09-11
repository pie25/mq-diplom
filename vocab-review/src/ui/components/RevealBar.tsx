interface RevealBarProps {
  saved: boolean;
  savedPinyin: boolean;
  pronunciation: boolean;
  definition: boolean;
  onToggleSaved: () => void;
  onToggleSavedPinyin: () => void;
  onTogglePronunciation: () => void;
  onToggleDefinition: () => void;
}

/** The four controls under a word: save, save pinyin, pinyin, definition. */
export function RevealBar({
  saved,
  savedPinyin,
  pronunciation,
  definition,
  onToggleSaved,
  onToggleSavedPinyin,
  onTogglePronunciation,
  onToggleDefinition,
}: RevealBarProps) {
  return (
    <div className="reveal-bar" role="toolbar" aria-label="Word controls">
      <button
        type="button"
        className={"reveal-button" + (saved ? " active" : "")}
        aria-pressed={saved}
        onClick={onToggleSaved}
      >
        <span className="reveal-icon symbol" aria-hidden="true">
          {saved ? "★" : "☆"}
        </span>
        <span className="reveal-label">{saved ? "Saved" : "Save"}</span>
      </button>
      <button
        type="button"
        className={"reveal-button" + (savedPinyin ? " active" : "")}
        aria-pressed={savedPinyin}
        onClick={onToggleSavedPinyin}
      >
        <span className="reveal-icon symbol" aria-hidden="true">
          ♫
        </span>
        <span className="reveal-label">{savedPinyin ? "Pinyin saved" : "Save Pinyin"}</span>
      </button>
      <button
        type="button"
        className={"reveal-button" + (pronunciation ? " active" : "")}
        aria-pressed={pronunciation}
        onClick={onTogglePronunciation}
      >
        <span className="reveal-icon" lang="zh-Hans" aria-hidden="true">
          拼音
        </span>
        <span className="reveal-label">Pinyin</span>
      </button>
      <button
        type="button"
        className={"reveal-button" + (definition ? " active" : "")}
        aria-pressed={definition}
        onClick={onToggleDefinition}
      >
        <span className="reveal-icon" lang="zh-Hans" aria-hidden="true">
          解释
        </span>
        <span className="reveal-label">Definition</span>
      </button>
    </div>
  );
}
