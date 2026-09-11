import { useRef, type ReactNode } from "react";
import { navigate } from "../../app/router";
import { useScrollEdges } from "../hooks/useScrollEdges";

interface ScreenProps {
  title?: string;
  back?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Page-scrolling screens get a sticky translucent header with a scroll-edge fade. */
  scrollEdges?: boolean;
}

/** Page frame with an optional floating header: back link, title, aside. */
export function Screen({ title, back, aside, children, className, scrollEdges = true }: ScreenProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollEdges(ref, "viewport");
  const hasHeader = Boolean(title || back !== undefined || aside);
  return (
    <div ref={ref} className={"screen" + (className ? " " + className : "")}>
      {hasHeader && (
        <header className="screen-header chrome chrome-top">
          <div className="screen-header-side">
            {back !== undefined && (
              <button
                type="button"
                className="link back"
                onClick={() => navigate(back, "back")}
                aria-label="Back"
              >
                ←
              </button>
            )}
          </div>
          {title && <h1 className="screen-title">{title}</h1>}
          <div className="screen-header-side right">{aside}</div>
        </header>
      )}
      {hasHeader && scrollEdges && <div data-sentinel="top" aria-hidden="true" />}
      {children}
    </div>
  );
}
