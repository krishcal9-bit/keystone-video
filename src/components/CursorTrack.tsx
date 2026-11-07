import React from 'react';
import {C} from '../lib/brand';
import {ease} from '../lib/motion';
import type {CaptureMeta} from '../slots';

/**
 * Pine cursor ring + click ripples drawn from the per-frame pointer log of a real capture.
 * Lives inside the AppShot camera layer, so it zooms and pans with the footage and stays on the real click target.
 * Same look as the placeholder cursor: 40 px ring at 1600 px screen width.
 */
export const CursorTrack: React.FC<{frame: number; meta: CaptureMeta; w: number; h: number}> = ({frame, meta, w, h}) => {
  const i = Math.max(0, Math.min(meta.cursor.length - 1, frame));
  const p = meta.cursor[i];
  const k = w / 1600;
  const R = 20 * k;
  // fade in on first appearance, never pop
  let firstSeen = meta.cursor.findIndex((c) => c !== null);
  if (firstSeen < 0) firstSeen = Infinity;
  const opacity = p ? ease(frame, firstSeen, 6) : 0;
  let press = 0;
  const ripples: React.ReactNode[] = [];
  for (const c of meta.clicks) {
    const d = frame - c;
    if (d >= -2 && d < 6) press = Math.max(press, d < 1 ? (d + 2) / 3 : 1 - (d - 1) / 5);
    const at = meta.cursor[Math.max(0, Math.min(meta.cursor.length - 1, c))];
    if (d >= 0 && d < 20 && at) {
      const t = ease(frame, c, 18);
      ripples.push(
        <div
          key={c}
          style={{
            position: 'absolute',
            left: at[0] * w - 22 * k,
            top: at[1] * h - 22 * k,
            width: 44 * k,
            height: 44 * k,
            borderRadius: 999,
            border: `${3 * k}px solid ${C.pine}`,
            opacity: (1 - t) * 0.55,
            transform: `scale(${1 + t * 1.6})`,
          }}
        />,
      );
    }
  }
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {ripples}
      {p && (
        <div
          style={{
            position: 'absolute',
            left: p[0] * w - R,
            top: p[1] * h - R,
            width: 2 * R,
            height: 2 * R,
            borderRadius: 999,
            background: 'rgba(30,92,71,0.14)',
            border: `${3 * k}px solid rgba(30,92,71,0.75)`,
            boxShadow: '0 2px 6px rgba(24,36,32,0.12)',
            transform: `scale(${1 - press * 0.18})`,
            opacity,
          }}
        />
      )}
    </div>
  );
};
