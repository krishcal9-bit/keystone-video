import React from 'react';
import {interpolate} from 'remotion';
import {C} from '../lib/brand';
import {EASE, ease} from '../lib/motion';

export type CursorKey = {at: number; x: number; y: number; click?: boolean; travel?: number};

/**
 * Soft pine cursor ring with click ripples. Coordinates are in the placeholder's
 * 1600×1000 virtual space, so it rides the same camera as the screen.
 */
export const Cursor: React.FC<{frame: number; path: CursorKey[]; appearAt?: number; hideAt?: number}> = ({
  frame,
  path,
  appearAt = path[0]?.at ?? 0,
  hideAt = 1e6,
}) => {
  if (path.length === 0) return null;
  // position: eased travel between consecutive keys (travel takes the gap, max 14 frames)
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const k = path[i];
    const travel = k.travel ?? Math.min(14, Math.max(4, k.at - prev.at));
    const t = interpolate(frame, [k.at - travel, k.at], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE,
    });
    x = x + (k.x - x) * t;
    y = y + (k.y - y) * t;
  }
  const opacity = Math.min(ease(frame, appearAt, 6), 1 - ease(frame, hideAt, 4));
  // press: quick compress on click, release
  let press = 0;
  const ripples: React.ReactNode[] = [];
  path.forEach((k, i) => {
    if (!k.click) return;
    const d = frame - k.at;
    if (d >= -2 && d < 6) press = Math.max(press, d < 1 ? (d + 2) / 3 : 1 - (d - 1) / 5);
    if (d >= 0 && d < 20) {
      const t = ease(frame, k.at, 18);
      ripples.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: k.x - 22,
            top: k.y - 22,
            width: 44,
            height: 44,
            borderRadius: 999,
            border: `3px solid ${C.pine}`,
            opacity: (1 - t) * 0.55,
            transform: `scale(${1 + t * 1.6})`,
          }}
        />,
      );
    }
  });
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}>
      {ripples}
      <div
        style={{
          position: 'absolute',
          left: x - 20,
          top: y - 20,
          width: 40,
          height: 40,
          borderRadius: 999,
          background: 'rgba(30,92,71,0.14)',
          border: `3px solid rgba(30,92,71,0.75)`,
          boxShadow: '0 2px 6px rgba(24,36,32,0.12)',
          transform: `scale(${1 - press * 0.18})`,
        }}
      />
    </div>
  );
};
