// "Read as a letter": the whole postcard in normal document flow. This is the
// accessible alternative to the compact card, and it carries everything,
// including full captions and the written version of the voice note.
import { formatDay, formatMomentTime, type PostcardContent } from "@/lib/model";

export function LetterView({ content, headingLevel = 2 }: { content: PostcardContent; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const Sub = `h${headingLevel + 1}` as "h3" | "h4";
  const to = content.recipientName.trim() || "you";
  return (
    <article className="mx-auto max-w-[38rem] rounded-[10px] border border-line bg-surface-raised p-5 sm:p-8" aria-label="The postcard as a letter">
      <header>
        <H className="display m-0 text-[1.6rem] font-[600] leading-tight">{content.title.trim() || "A little of my day"}</H>
        <p className="mt-1 text-text-soft">
          {formatDay(content.day, { year: true })}
          {content.fromPlace ? ` · from ${content.fromPlace}` : ""}
          {content.toPlace ? ` to ${content.toPlace}` : ""}
        </p>
      </header>

      <div className="mt-6 space-y-3 text-[1.05rem] leading-relaxed">
        <p className="m-0">Dear {to},</p>
        <p className="m-0 whitespace-pre-line">{content.note.trim()}</p>
        <p className="m-0">Love, {content.senderName.trim() || "me"}</p>
      </div>

      {content.moments.length > 0 && (
        <section className="mt-8" aria-label="Moments, in order">
          <Sub className="m-0 text-[1.05rem] font-bold">
            {content.moments.length === 1 ? "The moment" : `The ${content.moments.length} moments, in order`}
          </Sub>
          <ol className="mt-4 space-y-6 p-0" style={{ listStyle: "none" }}>
            {content.moments.map((m, i) => (
              <li key={m.id}>
                <figure className="m-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob/signed URLs */}
                  <img
                    src={m.src}
                    alt={m.caption ? `Photo: ${m.caption}` : `Photo ${i + 1}`}
                    className="w-full rounded-[6px] object-cover"
                    style={{ aspectRatio: `${m.width} / ${m.height}`, maxHeight: "70vh" }}
                  />
                  <figcaption className="mt-2">
                    <span className="font-bold">{formatMomentTime(m.capturedAt)}</span>
                    {m.caption ? <span> — {m.caption}</span> : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </section>
      )}

      {content.written?.text && (
        <section className="mt-8" aria-label={content.written.kind === "transcript" ? "Transcript of the voice note" : "Written summary of the voice note"}>
          <Sub className="m-0 text-[1.05rem] font-bold">
            {content.written.kind === "transcript" ? "What the voice note says (transcript)" : "About the voice note (written summary, not word for word)"}
          </Sub>
          <p className="mt-2 whitespace-pre-line">{content.written.text}</p>
        </section>
      )}
    </article>
  );
}
