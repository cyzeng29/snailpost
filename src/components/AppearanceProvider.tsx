"use client";
// Appearance is a presentation choice over the same content, not a separate app.
// Creators default to Postcard Studio, shared links default to Easy Reading,
// and either side can switch. Preferences are per-viewer conveniences, so they
// live in localStorage (guarded: storage can be unavailable).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Appearance = "studio" | "reading";
export type TextSize = "normal" | "large";
type Scope = "creator" | "reader";

interface Prefs {
  creator: Appearance;
  reader: Appearance;
  textSize: TextSize;
}

const DEFAULTS: Prefs = { creator: "studio", reader: "reading", textSize: "normal" };
const KEY = "snailpost.appearance";

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: use defaults */
  }
  return DEFAULTS;
}

const Ctx = createContext<{
  prefs: Prefs;
  scope: Scope;
  setScope: (s: Scope) => void;
  setAppearance: (scope: Scope, a: Appearance) => void;
  setTextSize: (t: TextSize) => void;
} | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [scope, setScope] = useState<Scope>("creator");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
    setPrefs(load());
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.appearance = scope === "creator" ? prefs.creator : prefs.reader;
    el.dataset.textSize = prefs.textSize;
  }, [prefs, scope]);

  const persist = useCallback((next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* not fatal */
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        prefs,
        scope,
        setScope,
        setAppearance: (s, a) => persist({ ...prefs, [s]: a }),
        setTextSize: (t) => persist({ ...prefs, textSize: t }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppearance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppearance outside AppearanceProvider");
  return c;
}

/** Declare which side of the product a route belongs to. */
export function AppearanceScope({ scope }: { scope: Scope }) {
  const { setScope } = useAppearance();
  useEffect(() => setScope(scope), [scope, setScope]);
  return null;
}
