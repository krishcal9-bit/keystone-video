import React from 'react';
import {C} from '../lib/brand';

/**
 * Keystone arch. Coordinate space: springline at y=0, center x=0.
 * Outer radius 100, inner radius 60, piers drop to y=72. Light from top-left.
 */
export const R = 100;
export const r = 60;
export const PIER = 72;
const GAP = 3.2; // constant-width mortar joint (px in arch space)

const polar = (rad: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [rad * Math.cos(a), -rad * Math.sin(a)];
};

export type Stone = {
  id: string;
  d: string;
  /** outward unit vector: the direction the stone travels in from (never through another stone) */
  nx: number;
  ny: number;
  fill: string;
  order: number;
  key?: boolean;
};

const sector = (a0: number, a1: number) => {
  const go = (GAP / 2 / R) * (180 / Math.PI);
  const gi = (GAP / 2 / r) * (180 / Math.PI);
  const [ox0, oy0] = polar(R, a0 + go);
  const [ox1, oy1] = polar(R, a1 - go);
  const [ix1, iy1] = polar(r, a1 - gi);
  const [ix0, iy0] = polar(r, a0 + gi);
  return `M${ox0.toFixed(2)},${oy0.toFixed(2)} A${R},${R} 0 0 0 ${ox1.toFixed(2)},${oy1.toFixed(2)} L${ix1.toFixed(2)},${iy1.toFixed(2)} A${r},${r} 0 0 1 ${ix0.toFixed(2)},${iy0.toFixed(2)} Z`;
};

/** Keystone wedge with a key-shaped notch cut through it (even-odd). */
export const keystonePath = () => {
  const a0 = 80;
  const a1 = 100;
  const gi = (GAP / 2 / r) * (180 / Math.PI);
  const go = (GAP / 2 / (R + 12)) * (180 / Math.PI);
  const [ix0, iy0] = polar(r - 4, a0 + gi);
  const [ix1, iy1] = polar(r - 4, a1 - gi);
  const [ox0, oy0] = polar(R + 12, a0 + go);
  const [ox1, oy1] = polar(R + 12, a1 - go);
  const top = Math.min(oy0, oy1);
  const wedge = `M${ix0.toFixed(2)},${iy0.toFixed(2)} L${ox0.toFixed(2)},${top.toFixed(2)} L${ox1.toFixed(2)},${top.toFixed(2)} L${ix1.toFixed(2)},${iy1.toFixed(2)} Z`;
  // keyhole: round head + tapered stem
  const cy = -(r + R) / 2 - 8;
  const hr = 5.4;
  const keyhole = `M${-hr},${cy.toFixed(2)} A${hr},${hr} 0 1 1 ${hr},${cy.toFixed(2)} L${(2.6).toFixed(2)},${(cy + 14).toFixed(2)} L${(-2.6).toFixed(2)},${(cy + 14).toFixed(2)} Z`;
  return `${wedge} ${keyhole}`;
};

export const STONES: Stone[] = (() => {
  const out: Stone[] = [];
  // piers: two blocks each side
  const pier = (side: -1 | 1, i: number) => {
    const x0 = side < 0 ? -R : r;
    const x1 = side < 0 ? -r : R;
    const y0 = i === 0 ? PIER / 2 + GAP / 2 : GAP / 2;
    const y1 = i === 0 ? PIER : PIER / 2 - GAP / 2;
    out.push({
      id: `p${side}${i}`,
      d: `M${x0 + GAP / 2},${y0} L${x1 - GAP / 2},${y0} L${x1 - GAP / 2},${y1} L${x0 + GAP / 2},${y1} Z`,
      nx: 0,
      ny: 1,
      fill: side < 0 ? C.pineLight : C.pine,
      order: i === 0 ? 0 : 1,
    });
  };
  pier(-1, 0);
  pier(1, 0);
  pier(-1, 1);
  pier(1, 1);
  // voussoirs: 4 per side, 20° each, keystone at 80–100°
  for (let i = 0; i < 4; i++) {
    const right: [number, number] = [i * 20, i * 20 + 20];
    const left: [number, number] = [180 - i * 20 - 20, 180 - i * 20];
    for (const [a0, a1, side] of [
      [left[0], left[1], -1],
      [right[0], right[1], 1],
    ] as [number, number, number][]) {
      const mid = ((a0 + a1) / 2) * (Math.PI / 180);
      out.push({
        id: `v${side}${i}`,
        d: sector(a0, a1),
        nx: Math.cos(mid),
        ny: -Math.sin(mid),
        fill: side < 0 ? C.pineLight : C.pine,
        order: 2 + i,
      });
    }
  }
  out.push({id: 'key', d: keystonePath(), nx: 0, ny: -1, fill: C.brass, order: 6, key: true});
  return out;
})();

/** Static arch icon. `size` = rendered width in px. */
export const ArchIcon: React.FC<{size: number; style?: React.CSSProperties}> = ({size, style}) => (
  <svg width={size} height={size * (190 / 216)} viewBox="-108 -116 216 190" style={{display: 'block', overflow: 'visible', ...style}}>
    {STONES.map((s) => (
      <path key={s.id} d={s.d} fill={s.fill} fillRule="evenodd" />
    ))}
  </svg>
);
