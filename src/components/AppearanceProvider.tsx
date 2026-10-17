"use client";
// Appearance is a presentation choice over the same content, not a separate app.
// Creators default to Postcard Studio, shared links default to Easy Reading,
// and either side can switch. Preferences are per-viewer conveniences, so they
// live in localStorage (guarded: storage can be unavailable).
//
// On the reader side, text size and view start from the sender's reading setup
// for that postcard; a reader's own choice on their device wins over it.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { READING_DEFAULTS, type ReadingSetup, type TextSize } from "@/lib/model";

export type { TextSize } from "@/lib/model";
export type Appearance = "studio" | "reading";
export type ReaderView = ReadingSetup["view"];
type Scope = "creator" | "reader";

interface Prefs {
  creator: Appearance;
  reader: Appearance;
  /** the creator's own text size */
  textSize: TextSize;
  /** a reader's own overrides; unset follows the sender's setup */
  readerTextSize?: TextSize;
  readerView?: ReaderView;
  /** what new postcards are set up with for the people this creator sends to */
  sendDefaults: ReadingSetup;
}

const DEFAULTS: Prefs = { creator: "studio", reader: "reading", textSize: "normal", sendDefaults: READING_DEFAULTS };
const KEY = "snailpost.appearance";

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...DEFAULTS, ...p, sendDefaults: { ...READING_DEFAULTS, ...p.sendDefaults } };
    }
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
  /** reader side: the sender's setup for the postcard on screen */
  setSenderSetup: (r: ReadingSetup | undefined) => void;
  readerTextSize: TextSize;
  readerView: ReaderView;
  setReaderTextSize: (t: TextSize) => void;
  setReaderView: (v: ReaderView) => void;
  setSendDefaults: (r: ReadingSetup) => void;
} | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [scope, setScope] = useState<Scope>("creator");
  const [senderSetup, setSenderSetup] = useState<ReadingSetup | undefined>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
    setPrefs(load());
  }, []);

  const readerTextSize = prefs.readerTextSize ?? senderSetup?.textSize ?? "normal";
  const readerView = prefs.readerView ?? senderSetup?.view ?? "full";

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.appearance = scope === "creator" ? prefs.creator : prefs.reader;
    el.dataset.textSize = scope === "creator" ? prefs.textSize : readerTextSize;
  }, [prefs, scope, readerTextSize]);

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
        setSenderSetup,
        readerTextSize,
        readerView,
        setReaderTextSize: (t) => persist({ ...prefs, readerTextSize: t }),
        setReaderView: (v) => persist({ ...prefs, readerView: v }),
        setSendDefaults: (r) => persist({ ...prefs, sendDefaults: r }),
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
