import React from 'react';
import {interpolateColors} from 'remotion';
import {C} from '../lib/brand';
import {sans} from '../lib/fonts';
import {mix} from '../lib/motion';

/**
 * The cost bar. Shared element: the same component (same geometry) appears at 2.5 s
 * and returns at 25 s, where Land shrinks and the gap closes.
 * All proportions are illustrative.
 */
export type CostState = {
  build: number; // 0→1 segments wipe in left→right
  swell: number; // 0→1 land swells to the biggest segment
  family: number; // 0→1 family bar wipes in
  gap: number; // 0→1 red gap opens
  payoff: number; // 0→1 land shrinks (partner land via SB 4), gap closes
  callout: number; // 0→1 brass callout
};

const SEG = [
  {key: 'Land', equal: 0.25, final: 0.46, payoff: 0.06, fill: C.pine, text: C.surface},
  {key: 'Design', equal: 0.25, final: 0.1, payoff: 0.1, fill: C.pineMist, text: C.ink},
  {key: 'Permits', equal: 0.25, final: 0.14, payoff: 0.14, fill: C.pineMist2, text: C.ink},
  {key: 'Build', equal: 0.25, final: 0.3, payoff: 0.3, fill: C.pineMist3, text: C.ink},
];
const FAMILY = 0.6;
const JOINT = 4;

export const CostBar: React.FC<{
  x: number;
  y: number;
  width: number;
  barH: number;
  rowGap: number;
  s: CostState;
  labelSize?: number;
  topLabel?: string;
}> = ({x, y, width, barH, rowGap, s, labelSize = 26, topLabel = 'Cost to build one home'}) => {
  const widths = SEG.map((g) => mix(mix(g.equal, g.final, s.swell), g.payoff, s.payoff) * width);
  const total = widths.reduce((a, w) => a + w, 0);
  const fam = FAMILY * width;
  const gapW = Math.max(0, total - fam) * s.gap;
  const row2 = y + barH + rowGap;
  let acc = 0;
  const landColor = interpolateColors(s.payoff, [0, 0.6, 1], [C.pine, C.brassLight, C.brass]);
  const ls = sans(labelSize, 600);
  return (
    <div style={{position: 'absolute', left: 0, top: 0}}>
      {/* row label (fades for the brass callout in the payoff) */}
      <div style={{position: 'absolute', left: x, top: y - labelSize * 1.75, ...sans(labelSize * 0.92, 600), color: C.ink2, opacity: s.build > 0 ? 1 - s.callout : 0, whiteSpace: 'nowrap'}}>
        {topLabel}
      </div>
      {/* segments */}
      {SEG.map((g, i) => {
        const t = Math.min(1, Math.max(0, s.build * 4 - i));
        const w = widths[i];
        const left = x + acc;
        acc += w;
        if (t <= 0) return null;
        const first = i === 0;
        const last = i === SEG.length - 1;
        const fill = first ? landColor : g.fill;
        const showLabel = first ? 1 - Math.min(1, s.payoff * 2.5) : 1;
        return (
          <div
            key={g.key}
            style={{
              position: 'absolute',
              left,
              top: y,
              width: Math.max(0, w * t - (last ? 0 : JOINT)),
              height: barH,
              background: fill,
              borderTopLeftRadius: first ? 12 : 3,
              borderBottomLeftRadius: first ? 12 : 3,
              borderTopRightRadius: last ? 12 : 3,
              borderBottomRightRadius: last ? 12 : 3,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{...ls, color: g.text, paddingLeft: labelSize * 0.7, opacity: t * showLabel, whiteSpace: 'nowrap'}}>{g.key}</span>
          </div>
        );
      })}
      {/* brass callout above the shrunken land segment */}
      {s.callout > 0 && (
        <div style={{position: 'absolute', left: x, top: y - labelSize * 1.9, opacity: s.callout, transform: `translateY(${mix(10, 0, s.callout)}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap'}}>
            <svg width={labelSize * 0.8} height={labelSize * 0.76} viewBox="0 0 20 19">
              <path d="M0,0 L20,0 L15.5,19 L4.5,19 Z" fill={C.brass} />
            </svg>
            <span style={{...sans(labelSize * 0.98, 600), color: C.brassDeep}}>Partner land via SB 4</span>
          </div>
        </div>
      )}
      {/* family row */}
      {s.family > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: row2,
            width: fam * s.family,
            height: barH,
            background: C.pineSoft,
            boxShadow: `inset 0 0 0 2px ${C.pine}`,
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{...ls, color: C.ink, paddingLeft: labelSize * 0.8, whiteSpace: 'nowrap', opacity: s.family}}>What the family can pay</span>
        </div>
      )}
      {/* the gap */}
      {gapW > 1 && (
        <div
          style={{
            position: 'absolute',
            left: x + fam + 8,
            top: row2,
            width: Math.max(0, gapW - 8),
            height: barH,
            background: 'rgba(179,54,43,0.09)',
            boxShadow: `inset 0 0 0 2px ${C.signal}`,
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{...ls, color: C.signal, whiteSpace: 'nowrap', opacity: Math.min(1, gapW / (labelSize * 7))}}>The gap</span>
        </div>
      )}
    </div>
  );
};
