import { useEffect, useMemo, useState } from "react";
import { useRoute } from "./app/router";
import { SessionProvider } from "./app/session";
import { loadCollection } from "./data/collections";
import type { Collection } from "./domain/types";
import { createReviewStore } from "./storage/reviewStore";
import { LocalStorageAdapter } from "./storage/storage";
import { HomeScreen } from "./ui/screens/HomeScreen";
import { ReviewScreen } from "./ui/screens/ReviewScreen";
import { SavedScreen } from "./ui/screens/SavedScreen";
import { SettingsScreen } from "./ui/screens/SettingsScreen";
import { WordScreen } from "./ui/screens/WordScreen";

const storage = new LocalStorageAdapter();

function Router() {
  const route = useRoute();
  switch (route.name) {
    case "review":
      return <ReviewScreen />;
    case "saved":
      return <SavedScreen category={route.category} />;
    case "word":
      return <WordScreen id={route.id} category={route.category} />;
    case "settings":
      return <SettingsScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCollection()
      .then((c) => !cancelled && setCollection(c))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const store = useMemo(() => (collection ? createReviewStore(collection, storage) : null), [collection]);

  if (error) {
    return (
      <div className="screen centered">
        <p className="empty">Could not load the vocabulary. {error}</p>
      </div>
    );
  }
  if (!store) {
    return <div className="screen centered" aria-busy="true" />;
  }
  return (
    <SessionProvider store={store}>
      <Router />
    </SessionProvider>
  );
}
