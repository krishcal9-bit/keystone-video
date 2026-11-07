import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {sans} from '../lib/fonts';
import {D, ease, mix} from '../lib/motion';

/**
 * Masked line reveal: the line rises out of its own clip box.
 * `out` (optional) starts a faster exit (~30% shorter) that drops the line back into the mask.
 */
export const Reveal: React.FC<{
  at: number;
  out?: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  inline?: boolean;
  /** clip-box padding for descenders; px or em of the Reveal's own font size */
  pad?: number | string;
}> = ({at, out, dur = D.text, children, style, inline, pad = '0.3em'}) => {
  const f = useCurrentFrame();
  const tin = ease(f, at, dur);
  const tout = out === undefined ? 0 : ease(f, out, Math.round(dur * 0.7));
  const y = mix(105, 0, tin) + mix(0, -105, tout);
  return (
    <span
      style={{
        display: inline ? 'inline-block' : 'block',
        overflow: 'hidden',
        // room for descenders / overshoot without clipping glyphs
        paddingBottom: pad,
        marginBottom: typeof pad === 'number' ? -pad : `-${pad}`,
        paddingTop: '0.06em',
        marginTop: '-0.06em',
        verticalAlign: 'top',
        ...style,
      }}
    >
      <span style={{display: 'inline-block', transform: `translateY(${y}%)`, opacity: tin > 0 ? 1 : 0}}>{children}</span>
    </span>
  );
};

/** Animate Fraunces weight 300 → 600 on a key word. */
export const WeightWord: React.FC<{at: number; from?: number; to?: number; dur?: number; color?: string; children: React.ReactNode}> = ({
  at,
  from = 300,
  to = 600,
  dur = 20,
  color,
  children,
}) => {
  const f = useCurrentFrame();
  const w = mix(from, to, ease(f, at, dur));
  return <span style={{fontWeight: Math.round(w), color}}>{children}</span>;
};

/** Caption: Public Sans 600, lower-left by default, mask-revealed. */
export const Caption: React.FC<{at: number; out?: number; size?: number; children: React.ReactNode; style?: React.CSSProperties; color?: string}> = ({
  at,
  out,
  size = 52,
  children,
  style,
  color = C.ink,
}) => (
  <div style={{...sans(size, 600), color, lineHeight: 1.16, letterSpacing: '-0.015em', ...style}}>
    <Reveal at={at} out={out}>
      {children}
    </Reveal>
  </div>
);

/** Small source/footnote line. */
export const Source: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties; color?: string}> = ({at, children, style, color = C.ink2}) => {
  const f = useCurrentFrame();
  const t = ease(f, at, 12);
  return <div style={{...sans(20, 500), color, opacity: 0.85 * t, ...style}}>{children}</div>;
};

/**
 * Rolling number: each digit column rolls (odometer), never cross-fades.
 * `value` is the target; `progress` 0→1 drives the roll.
 */
export const Rolling: React.FC<{text: string; progress: number; style?: React.CSSProperties}> = ({text, progress, style}) => {
  const chars = text.split('');
  const digitCount = chars.filter((c) => /\d/.test(c)).length;
  let di = 0;
  return (
    <span style={{display: 'inline-flex', whiteSpace: 'pre', ...style}}>
      {chars.map((c, i) => {
        if (!/\d/.test(c)) return <span key={i}>{c}</span>;
        const d = Number(c);
        const idx = di++;
        // leading digits settle last, trailing digits spin more
        const spins = 1 + (digitCount - idx - 1);
        const local = Math.min(1, Math.max(0, progress * (1 + idx * 0.08) - idx * 0.04));
        const pos = (d + spins * 10) * local; // total rows travelled
        const rowOffset = pos % 10;
        return (
          <span key={i} style={{display: 'inline-block', height: '1em', overflow: 'hidden', position: 'relative', lineHeight: 1, verticalAlign: 'top'}}>
            <span style={{display: 'block', visibility: 'hidden'}}>0</span>
            <span style={{position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', transform: `translateY(${-rowOffset}em)`}}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, k) => (
                <span key={k} style={{display: 'block', height: '1em'}}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};
