import { useRef, type ReactNode } from "react";
import { useScrollEdges } from "../hooks/useScrollEdges";

/** Scrollable area under the floating chrome; reports when content sits beneath it. */
export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollEdges(ref, "self");
  return (
    <div ref={ref} className="stage">
      <div data-sentinel="top" aria-hidden="true" />
      {children}
      <div data-sentinel="bottom" aria-hidden="true" />
    </div>
  );
}
