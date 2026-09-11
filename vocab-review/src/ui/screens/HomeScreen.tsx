import { listPath, navigate } from "../../app/router";
import { useCollection, useReviewSession } from "../../app/session";
import { formatNumber } from "../format";

export function HomeScreen() {
  const collection = useCollection();
  const { progress, complete } = useReviewSession();
  const started = progress.reviewed > 0 || progress.cardNumber > 1;
  const continueLabel = complete ? "Completed" : started ? "Continue" : "Start";
  return (
    <div className="screen home">
      <div className="home-top">
        <div className="home-collection" lang="zh-Hans">
          {collection.name}
        </div>
        <div className="home-progress">
          <span className="home-count">{formatNumber(progress.reviewed)}</span>
          <span className="home-total"> / {formatNumber(progress.total)} reviewed</span>
        </div>
      </div>
      <nav className="menu" aria-label="Main">
        <button type="button" className="menu-item" onClick={() => navigate("/review")}>
          {continueLabel}
        </button>
        <button type="button" className="menu-item" onClick={() => navigate(listPath("saved"))}>
          Saved words
          {progress.saved > 0 && <span className="menu-meta">{formatNumber(progress.saved)}</span>}
        </button>
        <button type="button" className="menu-item" onClick={() => navigate(listPath("savedPinyin"))}>
          Save Pinyin
          {progress.savedPinyin > 0 && <span className="menu-meta">{formatNumber(progress.savedPinyin)}</span>}
        </button>
        <button type="button" className="menu-item" onClick={() => navigate("/settings")}>
          Settings
        </button>
      </nav>
    </div>
  );
}
