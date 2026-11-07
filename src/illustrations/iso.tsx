import React from 'react';
import {C} from '../lib/brand';

/** Isometric projection helper. Light comes from the top-left. */
export type Iso = {s: number; ox: number; oy: number};
const COS = Math.cos(Math.PI / 6);

export const pt = (iso: Iso, x: number, y: number, z = 0): [number, number] => [
  iso.ox + (x - y) * COS * iso.s,
  iso.oy + (x + y) * 0.5 * iso.s - z * iso.s,
];
export const poly = (iso: Iso, pts: [number, number, number][]) =>
  pts.map(([x, y, z]) => pt(iso, x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');

export type HouseTone = {
  wallLit: string;
  wallShade: string;
  roofLit: string;
  roofShade: string;
  window: string;
  door: string;
};

export const TOWNHOME: HouseTone = {
  wallLit: C.stone,
  wallShade: C.stoneShade,
  roofLit: C.pineLight,
  roofShade: C.pine,
  window: C.window,
  door: C.pineDeep,
};

/**
 * One townhome unit. Ridge runs along x. Front face is +y (lit), side/gable is +x (shade).
 * (x, y) is the back-left ground corner in grid units.
 */
export const House: React.FC<{
  iso: Iso;
  x: number;
  y: number;
  w?: number;
  d?: number;
  h?: number;
  r?: number;
  tone?: HouseTone;
  lift?: number; // z offset (for drop-in)
  opacity?: number;
  gable?: boolean;
  windowGlow?: number; // 0..1
}> = ({iso, x, y, w = 1, d = 1.3, h = 1.25, r = 0.5, tone = TOWNHOME, lift = 0, opacity = 1, gable = true, windowGlow = 1}) => {
  const z0 = lift;
  const x1 = x + w;
  const y1 = y + d;
  const ym = y + d / 2;
  const P = (pts: [number, number, number][]) => poly(iso, pts);
  const win = (xa: number, xb: number, za: number, zb: number) =>
    P([
      [xa, y1, z0 + za],
      [xb, y1, z0 + za],
      [xb, y1, z0 + zb],
      [xa, y1, z0 + zb],
    ]);
  const ww = w * 0.22;
  return (
    <g opacity={opacity}>
      {/* soft contact shadow toward bottom-right */}
      <polygon
        points={P([
          [x + 0.15, y + 0.2, 0],
          [x1 + 0.35, y + 0.2, 0],
          [x1 + 0.35, y1 + 0.15, 0],
          [x + 0.15, y1 + 0.15, 0],
        ])}
        fill={C.ink}
        opacity={0.1 * Math.max(0, 1 - lift)}
        filter="url(#isoSoft)"
      />
      {/* back roof plane (visible at shallow pitch) */}
      <polygon points={P([[x, y, z0 + h], [x1, y, z0 + h], [x1, ym, z0 + h + r], [x, ym, z0 + h + r]])} fill={tone.roofShade} />
      {/* front wall (+y), lit */}
      <polygon points={P([[x, y1, z0], [x1, y1, z0], [x1, y1, z0 + h], [x, y1, z0 + h]])} fill={tone.wallLit} />
      {/* side wall (+x) with gable, shade */}
      <polygon
        points={P(
          gable
            ? [[x1, y, z0], [x1, y1, z0], [x1, y1, z0 + h], [x1, ym, z0 + h + r], [x1, y, z0 + h]]
            : [[x1, y, z0], [x1, y1, z0], [x1, y1, z0 + h], [x1, y, z0 + h]],
        )}
        fill={tone.wallShade}
      />
      {/* front roof plane, lit */}
      <polygon points={P([[x, ym, z0 + h + r], [x1, ym, z0 + h + r], [x1, y1, z0 + h], [x, y1, z0 + h]])} fill={tone.roofLit} />
      {/* windows: warm brass light */}
      <polygon points={win(x + w * 0.14, x + w * 0.14 + ww, h * 0.58, h * 0.86)} fill={tone.window} opacity={0.35 + 0.65 * windowGlow} />
      <polygon points={win(x + w * 0.62, x + w * 0.62 + ww, h * 0.58, h * 0.86)} fill={tone.window} opacity={0.35 + 0.65 * windowGlow} />
      <polygon points={win(x + w * 0.62, x + w * 0.62 + ww, h * 0.12, h * 0.42)} fill={tone.window} opacity={0.35 + 0.65 * windowGlow} />
      {/* door */}
      <polygon points={win(x + w * 0.16, x + w * 0.16 + ww, 0, h * 0.42)} fill={tone.door} />
    </g>
  );
};

/** Flat ground slab (lot, parking, plaza). */
export const Slab: React.FC<{iso: Iso; x: number; y: number; w: number; d: number; fill: string; z?: number; opacity?: number}> = ({
  iso,
  x,
  y,
  w,
  d,
  fill,
  z = 0,
  opacity = 1,
}) => (
  <polygon
    points={poly(iso, [
      [x, y, z],
      [x + w, y, z],
      [x + w, y + d, z],
      [x, y + d, z],
    ])}
    fill={fill}
    opacity={opacity}
  />
);

/** A tree: canopy disc (2 tones) + contact shadow. */
export const Tree: React.FC<{iso: Iso; x: number; y: number; size?: number; opacity?: number}> = ({iso, x, y, size = 0.55, opacity = 1}) => {
  const [cx, cy] = pt(iso, x, y, 0);
  const rr = size * iso.s * 0.75;
  return (
    <g opacity={opacity}>
      <ellipse cx={cx + rr * 0.45} cy={cy + rr * 0.15} rx={rr * 1.05} ry={rr * 0.5} fill={C.ink} opacity={0.1} filter="url(#isoSoft)" />
      <rect x={cx - rr * 0.08} y={cy - rr * 0.9} width={rr * 0.16} height={rr * 0.9} fill={C.pineDeep} />
      <circle cx={cx} cy={cy - rr * 1.25} r={rr} fill={C.pine} />
      <circle cx={cx - rr * 0.22} cy={cy - rr * 1.45} r={rr * 0.68} fill={C.pineLight} />
    </g>
  );
};

/** Church: nave with gable roof and a steeple, stone and slate tones. */
export const Church: React.FC<{iso: Iso; x: number; y: number; scale?: number}> = ({iso, x, y, scale = 1}) => {
  const k = scale;
  const tone: HouseTone = {
    wallLit: '#F1EEE6',
    wallShade: '#D9D4C8',
    roofLit: '#5D6A66',
    roofShade: C.ink2,
    window: C.window,
    door: C.ink2,
  };
  const tx = x + 2.4 * k;
  const ty = y + 0.2 * k;
  const tw = 0.8 * k;
  const th = 3.2 * k;
  const P = (pts: [number, number, number][]) => poly(iso, pts);
  return (
    <g>
      {/* nave: ridge along x */}
      <House iso={iso} x={x} y={y} w={3.2 * k} d={1.8 * k} h={1.4 * k} r={0.8 * k} tone={tone} windowGlow={0.6} />
      {/* steeple tower */}
      <polygon points={P([[tx, ty + tw, 0], [tx + tw, ty + tw, 0], [tx + tw, ty + tw, th], [tx, ty + tw, th]])} fill={tone.wallLit} />
      <polygon points={P([[tx + tw, ty, 0], [tx + tw, ty + tw, 0], [tx + tw, ty + tw, th], [tx + tw, ty, th]])} fill={tone.wallShade} />
      <polygon points={P([[tx, ty, th], [tx + tw, ty, th], [tx + tw, ty + tw, th], [tx, ty + tw, th]])} fill={tone.wallLit} />
      {/* spire */}
      <polygon points={P([[tx, ty + tw, th], [tx + tw, ty + tw, th], [tx + tw / 2, ty + tw / 2, th + 1.3 * k]])} fill={tone.roofLit} />
      <polygon points={P([[tx + tw, ty, th], [tx + tw, ty + tw, th], [tx + tw / 2, ty + tw / 2, th + 1.3 * k]])} fill={tone.roofShade} />
      {/* belfry opening, warm */}
      <polygon
        points={P([[tx + tw * 0.3, ty + tw, th * 0.72], [tx + tw * 0.7, ty + tw, th * 0.72], [tx + tw * 0.7, ty + tw, th * 0.88], [tx + tw * 0.3, ty + tw, th * 0.88]])}
        fill={C.window}
      />
    </g>
  );
};

export const IsoDefs: React.FC = () => (
  <defs>
    <filter id="isoSoft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>
);
