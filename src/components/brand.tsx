import { MARK, SPRIG, STAMP_H, STAMP_W, STEAM, SUN, cancellationLines, perforatedRect, spiralPath, stampById } from "@/lib/brand";
import type { StampId } from "@/lib/brand";

export function SnailMark({ size = 32, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox={MARK.viewBox}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      <path d={MARK.foot} fill="var(--peach)" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={MARK.stalkA} stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
      <path d={MARK.stalkB} stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
      <circle {...MARK.eyeA} fill="var(--ink)" />
      <circle {...MARK.eyeB} fill="var(--ink)" />
      <path d={MARK.shell} fill="var(--peach)" stroke="var(--ink)" strokeWidth="2.8" strokeLinejoin="round" />
      <path d={MARK.flap} stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle {...MARK.sealDisc} fill="var(--clay)" stroke="var(--ink)" strokeWidth="1.6" />
      <path d={MARK.seal} stroke="var(--cream)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SnailMark size={34} />
      <span className="display text-[1.45rem] font-[650] leading-none tracking-tight" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 72' }}>
        snailpost
      </span>
    </span>
  );
}

export function Stamp({
  id,
  className = "",
  style,
  labelled = false,
}: {
  id: StampId;
  className?: string;
  style?: React.CSSProperties;
  /** give it an accessible name (otherwise decorative) */
  labelled?: boolean;
}) {
  const s = stampById(id);
  return (
    <svg
      viewBox={`-2 -2 ${STAMP_W + 4} ${STAMP_H + 4}`}
      className={className}
      style={style}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? `${s.name} stamp` : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <path d={perforatedRect(STAMP_W, STAMP_H)} fill="#FBF8F1" stroke="#2B2925" strokeWidth="0.6" />
      <rect x="4" y="4" width={STAMP_W - 8} height={STAMP_H - 8} fill={s.paper} />
      {s.art.map((a, i) => (
        <path
          key={i}
          d={a.d}
          fill={a.fill ?? "none"}
          stroke={a.stroke ?? "none"}
          strokeWidth={a.width ?? 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** Circular postmark with place and date, plus wavy cancellation lines. */
export function Postmark({
  place,
  dateLabel,
  className = "",
  style,
}: {
  place: string;
  dateLabel: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const id = `pm-${place.replace(/\W/g, "")}-${dateLabel.replace(/\W/g, "")}`;
  return (
    <svg viewBox="0 0 150 70" className={className} style={style} aria-hidden="true">
      <defs>
        <path id={id} d="M 35 35 m -24 0 a 24 24 0 1 1 48 0 a 24 24 0 1 1 -48 0" />
      </defs>
      <g fill="none" stroke="#2C4C9D" strokeWidth="1.6" opacity="0.78">
        <circle cx="35" cy="35" r="31" />
        <circle cx="35" cy="35" r="17" />
        <path d={cancellationLines(70, 22, 78, 8.5, 4)} />
      </g>
      <text fill="#2C4C9D" opacity="0.85" fontSize="8.4" fontFamily="var(--font-atkinson), sans-serif" fontWeight="700" letterSpacing="1.2">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {place.toUpperCase().slice(0, 14)}
        </textPath>
      </text>
      <text x="35" y="38.5" textAnchor="middle" fill="#2C4C9D" opacity="0.85" fontSize="8" fontWeight="700" fontFamily="var(--font-atkinson), sans-serif">
        {dateLabel}
      </text>
    </svg>
  );
}

export function Sprig({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox={SPRIG.viewBox} className={className} style={style} aria-hidden="true" fill="none">
      <path d={SPRIG.stem} stroke="var(--moss)" strokeWidth="2.2" strokeLinecap="round" />
      {SPRIG.leaves.map((d, i) => (
        <path key={i} d={d} fill={i % 2 ? "#7E9A55" : "var(--moss)"} />
      ))}
    </svg>
  );
}

export function Sun({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={SUN.viewBox} className={className} aria-hidden="true" fill="none">
      <path d={SUN.disc} fill="var(--marigold)" />
      <path d={SUN.rays} stroke="var(--marigold)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function SteamCurl({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={STEAM.viewBox} className={className} aria-hidden="true" fill="none">
      <path d={STEAM.d} stroke="var(--clay)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Spiral({ className = "", stroke = "var(--clay)" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" fill="none">
      <path d={spiralPath(20, 20, 16, 2.4, 0.06, 5)} stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A strip of washi tape; purely decorative. */
export function Tape({ className = "", style, color = "rgba(212,162,74,0.55)" }: { className?: string; style?: React.CSSProperties; color?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute block ${className}`}
      style={{
        background: color,
        clipPath: "polygon(2% 8%, 98% 0, 100% 92%, 0 100%)",
        mixBlendMode: "multiply",
        ...style,
      }}
    />
  );
}
