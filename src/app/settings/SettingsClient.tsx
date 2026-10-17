"use client";
import Link from "next/link";
import { useAppearance, type Appearance } from "@/components/AppearanceProvider";
import { CreatorShell } from "@/components/creator/CreatorShell";
import { publishingConfigured } from "@/lib/publish/client";

const LOOKS: { value: Appearance; name: string; desc: string }[] = [
  { value: "studio", name: "Postcard Studio", desc: "Warm peach paper and playful details, for an evening at the desk." },
  { value: "reading", name: "Easy Reading", desc: "Calm cream and moss, larger text and bigger buttons." },
];

export function SettingsClient() {
  const { prefs, setAppearance, setTextSize } = useAppearance();
  return (
    <CreatorShell>
      <h1 className="display m-0 text-[2rem] font-[600]">Settings</h1>

      <fieldset className="mt-8 border-0 p-0">
        <legend className="text-[1.15rem] font-bold">How Snailpost looks for you</legend>
        <p className="m-0 mt-1 text-text-soft">The same postcards, presented two ways. People you send to start with Easy Reading and can switch.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {LOOKS.map((l) => (
            <label key={l.value} className={`flex cursor-pointer gap-3 rounded-[12px] border-2 p-4 ${prefs.creator === l.value ? "border-ink bg-surface-raised" : "border-line"}`}>
              <input type="radio" name="look" className="mt-1 h-5 w-5 accent-[var(--clay)]" checked={prefs.creator === l.value} onChange={() => setAppearance("creator", l.value)} />
              <span>
                <span className="block font-bold">{l.name}</span>
                <span className="block text-text-soft">{l.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <legend className="text-[1.15rem] font-bold">Text size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["normal", "large"] as const).map((t) => (
            <label key={t} className={`flex min-h-[var(--target)] cursor-pointer items-center gap-2 rounded-full border-2 px-4 ${prefs.textSize === t ? "border-ink" : "border-line"}`}>
              <input type="radio" name="text" className="h-5 w-5 accent-[var(--clay)]" checked={prefs.textSize === t} onChange={() => setTextSize(t)} />
              {t === "normal" ? "Regular" : "Larger"}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="m-0 text-[1.15rem] font-bold">Where your postcards live</h2>
        <p className="mt-2">
          Drafts, photos and voice notes are saved in this browser on this device. Photos have their location details removed when you add them.
        </p>
        <p className="mt-2">
          {publishingConfigured()
            ? "When you make a link, a copy of that postcard is stored online so the person you send it to can open it. Anyone with the link can open it, and you can turn the link off in Keepsakes."
            : "Sending links isn't switched on in this version yet, so nothing leaves this device. You can still print postcards."}
        </p>
        <p className="mt-2">
          <Link href="/demo" className="font-bold underline">
            See the sample postcard
          </Link>
        </p>
      </section>
    </CreatorShell>
  );
}
