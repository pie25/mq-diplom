import { useState } from "react";
import { navigate } from "../../app/router";
import { useCollection, useReviewSession } from "../../app/session";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Screen } from "../components/Screen";
import { formatNumber } from "../format";

type Pending = "progress" | "all" | null;

export function SettingsScreen() {
  const collection = useCollection();
  const { progress, resetProgress, resetAll } = useReviewSession();
  const [pending, setPending] = useState<Pending>(null);
  return (
    <Screen back="/" title="Settings">
      <dl className="stats">
        <div className="stat">
          <dt>Total vocabulary</dt>
          <dd>{formatNumber(progress.total)}</dd>
        </div>
        <div className="stat">
          <dt>Reviewed</dt>
          <dd>{formatNumber(progress.reviewed)}</dd>
        </div>
        <div className="stat">
          <dt>Remaining</dt>
          <dd>{formatNumber(progress.remaining)}</dd>
        </div>
        <div className="stat">
          <dt>Saved</dt>
          <dd>{formatNumber(progress.saved)}</dd>
        </div>
      </dl>
      <nav className="menu" aria-label="Actions">
        <button type="button" className="menu-item" onClick={() => setPending("progress")}>
          Reset review progress
        </button>
        <button type="button" className="menu-item danger" onClick={() => setPending("all")}>
          Reset all data
        </button>
      </nav>
      <p className="about" lang="zh-Hans">
        {collection.name} · {collection.version}
        <br />
        {collection.source}
      </p>
      <ConfirmDialog
        open={pending === "progress"}
        title="Reset review progress?"
        confirmLabel="Reset progress"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          setPending(null);
          resetProgress();
          navigate("/");
        }}
      >
        <p>Every word becomes unreviewed and the deck is shuffled again.</p>
        <p>Your {formatNumber(progress.saved)} saved words are kept.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending === "all"}
        title="Reset all data?"
        confirmLabel="Delete everything"
        acknowledgement={`Also delete my ${formatNumber(progress.saved)} saved words`}
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          setPending(null);
          resetAll();
          navigate("/");
        }}
      >
        <p>This removes your review progress and every saved word, and starts a new shuffled deck.</p>
        <p>There is no way to get them back.</p>
      </ConfirmDialog>
    </Screen>
  );
}
