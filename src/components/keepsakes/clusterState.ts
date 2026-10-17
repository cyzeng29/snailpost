// Explicit cluster states: a handful of days → choose one → lift it out →
// turn it over → put it back. Pure reducer, so it's unit-tested, and every
// transition guards against rapid taps, interrupted animations and stale
// selections.
import type { Face } from "@/components/postcard/FlipCard";

export type ClusterMode = "resting" | "browsing" | "selected" | "returning";

export interface ClusterState {
  mode: ClusterMode;
  /** index of the selected card (meaningful in selected/returning) */
  index: number;
  face: Face;
  count: number;
}

export type ClusterAction =
  | { type: "browse" }
  | { type: "rest" }
  | { type: "select"; index: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "face"; face: Face }
  | { type: "return" }
  | { type: "returned" }
  | { type: "count"; count: number };

export const initialCluster = (count: number): ClusterState => ({ mode: "resting", index: 0, face: "front", count });

export function clusterReducer(s: ClusterState, a: ClusterAction): ClusterState {
  switch (a.type) {
    case "browse":
      return s.mode === "resting" ? { ...s, mode: "browsing" } : s;
    case "rest":
      return s.mode === "browsing" ? { ...s, mode: "resting" } : s;
    case "select":
      // ignore while a card is already out or on its way back (rapid taps)
      if (s.mode === "selected" || s.mode === "returning") return s;
      if (a.index < 0 || a.index >= s.count) return s;
      return { ...s, mode: "selected", index: a.index, face: "front" };
    case "next":
    case "prev": {
      if (s.mode !== "selected" || s.count < 2) return s;
      const d = a.type === "next" ? 1 : -1;
      // browsing to another card never turns it over: it always arrives front-up
      return { ...s, index: (s.index + d + s.count) % s.count, face: "front" };
    }
    case "face":
      // changing faces never changes which card is selected
      return s.mode === "selected" ? { ...s, face: a.face } : s;
    case "return":
      return s.mode === "selected" ? { ...s, mode: "returning" } : s;
    case "returned":
      return s.mode === "returning" ? { ...s, mode: "browsing", face: "front" } : s;
    case "count": {
      if (a.count === s.count) return s;
      if (a.count === 0) return initialCluster(0);
      // a card was deleted: keep a valid selection, or fall back to browsing
      const index = Math.min(s.index, a.count - 1);
      const mode = (s.mode === "selected" || s.mode === "returning") && s.index >= a.count ? "browsing" : s.mode;
      return { ...s, count: a.count, index, mode };
    }
  }
}
