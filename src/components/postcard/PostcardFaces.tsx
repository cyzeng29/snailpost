// The two faces of a postcard. Type is sized in container query units (cqw),
// so the composition is identical at every card width and never shrinks to
// fit: the note is capped at 280 characters, and the full story is always
// available in the letter view below the card.
import { Postmark, SnailMark, Sprig, Stamp, Tape } from "@/components/brand";
import { layoutFor } from "@/lib/layout";
import { formatDay, type PostcardContent } from "@/lib/model";

function shortDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const mon = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return `${mon.toUpperCase()} ${d} ${y}`;
}

export function PostcardFront({ content }: { content: PostcardContent }) {
  const layout = layoutFor(content.moments.map((m) => m.id));
  const title = content.title.trim() || "A little of my day";
  const hero = layout.kind === "hero";
  return (
    <div className="postcard paper-grain h-full w-full" style={{ background: "var(--cream)" }}>
      {/* photo area */}
      <div className="absolute" style={{ left: "4cqw", top: "4cqw", width: "92cqw", height: hero ? "47.5cqw" : "46cqw" }}>
        {content.moments.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-[0.6cqw] border-[0.3cqw] border-dashed border-ink/30 text-[2.6cqw] text-ink-soft">
            Your moments will appear here
          </div>
        ) : (
          content.moments.map((m, i) => {
            const fr = layout.frames[i];
            return (
              <figure
                key={m.id}
                className="absolute m-0"
                style={{
                  left: `${fr.x}%`,
                  top: `${fr.y}%`,
                  width: `${fr.w}%`,
                  height: `${fr.h}%`,
                  transform: `rotate(${fr.rotate}deg)`,
                  background: "#fff",
                  padding: hero ? "0" : "0.7cqw",
                  boxShadow: "0 0.2cqw 0.6cqw rgb(43 41 37 / 0.22)",
                  borderRadius: hero ? "0.6cqw" : "0.25cqw",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blob/signed URLs, not optimisable */}
                <img
                  src={m.src}
                  alt={m.caption ? `Photo: ${m.caption}` : `Photo ${i + 1} of ${content.moments.length}`}
                  className="h-full w-full object-cover"
                  style={{ borderRadius: hero ? "0.6cqw" : "0.1cqw" }}
                  draggable={false}
                />
              </figure>
            );
          })
        )}
        {content.moments.length > 0 && (
          <Tape style={{ left: hero ? "-1.6cqw" : "-1.2cqw", top: "-1.4cqw", width: "11cqw", height: "3.2cqw", transform: "rotate(-14deg)" }} />
        )}
      </div>

      {/* caption strip */}
      <div className="absolute flex items-end justify-between" style={{ left: "4.5cqw", right: "4.5cqw", bottom: "3.2cqw", gap: "3cqw" }}>
        <div className="min-w-0">
          <p className="display m-0 font-[600] leading-[1.05]" style={{ fontSize: "4.6cqw" }}>
            {title}
          </p>
          <p className="m-0 font-bold uppercase text-ink-soft" style={{ fontSize: "1.9cqw", letterSpacing: "0.12em", marginTop: "1cqw" }}>
            {formatDay(content.day)}
            {content.fromPlace ? ` · ${content.fromPlace}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-end" style={{ gap: "1cqw" }}>
          <Sprig style={{ width: "3.6cqw", height: "5.4cqw" }} />
          {content.senderName && (
            <span className="font-hand text-clay-deep" style={{ fontSize: "4.4cqw", lineHeight: 1, transform: "rotate(-4deg)" }}>
              — {content.senderName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PostcardBack({ content }: { content: PostcardContent }) {
  const to = content.recipientName.trim() || "you";
  const from = content.senderName.trim();
  const postmarkPlace = content.fromPlace?.trim() || "snailpost";
  return (
    <div className="postcard paper-grain h-full w-full" style={{ background: "var(--cream)" }}>
      {/* message side */}
      <div className="absolute flex flex-col" style={{ left: "5cqw", top: "5cqw", bottom: "5cqw", width: "48cqw" }}>
        <p className="display m-0 font-[600]" style={{ fontSize: "3.6cqw", lineHeight: 1.1 }}>
          Dear {to},
        </p>
        <p
          className="display m-0 whitespace-pre-line"
          style={{ fontSize: "2.85cqw", lineHeight: 1.42, marginTop: "1.8cqw", fontVariationSettings: '"SOFT" 100, "WONK" 0, "opsz" 14' }}
        >
          {content.note.trim() || "…"}
        </p>
        <p className="font-hand m-0 text-clay-deep" style={{ fontSize: "4.4cqw", lineHeight: 1, marginTop: "auto" }}>
          Love, {from || "me"}
        </p>
      </div>

      {/* postal divider */}
      <div aria-hidden="true" className="absolute bg-ink/35" style={{ left: "57cqw", top: "6cqw", bottom: "6cqw", width: "0.22cqw" }} />

      {/* address side */}
      <div className="absolute" style={{ left: "61cqw", right: "4cqw", top: "4cqw", bottom: "4cqw" }}>
        <Stamp id={content.stamp} style={{ position: "absolute", right: 0, top: 0, width: "11.5cqw", transform: "rotate(2deg)" }} />
        <Postmark
          place={postmarkPlace}
          dateLabel={shortDate(content.day).replace(/ \d{4}$/, "")}
          style={{ position: "absolute", right: "6.5cqw", top: "6.5cqw", width: "21cqw", transform: "rotate(-8deg)" }}
        />
        <div className="absolute" style={{ left: 0, right: 0, top: "26cqw" }}>
          {[`To ${to}`, content.toPlace ? content.toPlace : "", content.fromPlace ? `from ${content.fromPlace}` : ""].map((line, i) => (
            <p
              key={i}
              className="m-0 border-b border-ink/40"
              style={{ fontSize: "2.5cqw", minHeight: "5.2cqw", paddingTop: "1.6cqw", lineHeight: 1.2 }}
            >
              {line}
            </p>
          ))}
        </div>
        <div className="absolute flex items-center text-ink-soft" style={{ left: 0, bottom: 0, gap: "0.8cqw", fontSize: "1.6cqw" }}>
          <SnailMark size={18} className="h-[3cqw] w-[3cqw]" />
          <span>snailpost</span>
        </div>
      </div>
    </div>
  );
}
