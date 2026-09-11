import { useState } from "react";
import { listPath, navigate } from "../../app/router";
import { useCollection, useReviewSession } from "../../app/session";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Screen } from "../components/Screen";
import { formatNumber } from "../format";

export function CompletionScreen() {
  const collection = useCollection();
  const { progress, resetProgress } = useReviewSession();
  const [confirm, setConfirm] = useState(false);
  return (
    <Screen back="/" className="completion">
      <div className="completion-body">
        <p className="completion-title">You’ve reviewed the complete {collection.name.replace(/词汇$/, "").trim()} vocabulary.</p>
        <dl className="stats">
          <div className="stat">
            <dt>Total reviewed</dt>
            <dd>{formatNumber(progress.reviewed)}</dd>
          </div>
          <div className="stat">
            <dt>Saved words</dt>
            <dd>{formatNumber(progress.saved)}</dd>
          </div>
          <div className="stat">
            <dt>Save Pinyin</dt>
            <dd>{formatNumber(progress.savedPinyin)}</dd>
          </div>
        </dl>
        <nav className="menu" aria-label="Next">
          <button type="button" className="menu-item" onClick={() => navigate(listPath("saved"))}>
            Review saved words
          </button>
          <button type="button" className="menu-item" onClick={() => navigate(listPath("savedPinyin"))}>
            Review Save Pinyin words
          </button>
          <button type="button" className="menu-item" onClick={() => setConfirm(true)}>
            Reset vocabulary progress
          </button>
        </nav>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Reset vocabulary progress?"
        confirmLabel="Reset progress"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          resetProgress();
          navigate("/");
        }}
      >
        <p>Every word becomes unreviewed and the deck is shuffled again.</p>
        <p>
          Your {formatNumber(progress.saved)} saved words and {formatNumber(progress.savedPinyin)} Save Pinyin
          words are kept.
        </p>
      </ConfirmDialog>
    </Screen>
  );
}
