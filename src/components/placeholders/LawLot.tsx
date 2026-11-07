import React from 'react';
import {spring} from 'remotion';
import {C} from '../../lib/brand';
import {serif} from '../../lib/fonts';
import {ease, mix, SETTLE} from '../../lib/motion';
import {Church, House, Iso, IsoDefs, poly, Slab, Tree} from '../../illustrations/iso';
import {AppHeader, Bar, Label, ScreenProps} from './common';

const ISO: Iso = {s: 58, ox: 1060, oy: 210};

/** Landing page "The law changed" section: a church parking lot filling with homes. */
export const LawLot: React.FC<ScreenProps> = ({f}) => {
  const units: {x: number; y: number; at: number}[] = [];
  [3.4, 5.0].forEach((ry, r) => {
    for (let i = 0; i < 6; i++) units.push({x: 0.5 + i * 1.05, y: ry, at: 10 + r * 16 + i * 2.5});
  });
  const fill = ease(f, 10, 40);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.paper}}>
      <AppHeader />
      <div style={{position: 'absolute', left: 96, top: 250, width: 560}}>
        <Label size={18} color={C.pine}>California SB 4</Label>
        <div style={{...serif(68, 600, 50), color: C.ink, marginTop: 18}}>The law changed.</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginTop: 34}}>
          <Bar w={500} h={14} />
          <Bar w={460} h={14} />
          <Bar w={380} h={14} />
        </div>
        <div style={{display: 'flex', gap: 14, marginTop: 44}}>
          <div style={{width: 190, height: 56, borderRadius: 999, background: C.pine}} />
          <div style={{width: 160, height: 56, borderRadius: 999, border: `1.5px solid ${C.line}`}} />
        </div>
      </div>
      <svg width={1600} height={1000} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <IsoDefs />
        <Slab iso={ISO} x={-0.4} y={-0.4} w={7.8} d={7.4} fill={C.pineMist} />
        <Slab iso={ISO} x={0} y={0} w={7} d={6.6} fill="#E3EAE6" />
        {/* parking lot that becomes homes */}
        <Slab iso={ISO} x={0.2} y={3.1} w={6.6} d={3.3} fill="#C9D1CC" opacity={mix(1, 0.55, fill)} />
        {Array.from({length: 11}, (_, i) => (
          <polygon
            key={i}
            points={poly(ISO, [
              [0.5 + i * 0.6, 3.3, 0],
              [0.53 + i * 0.6, 3.3, 0],
              [0.53 + i * 0.6, 4.3, 0],
              [0.5 + i * 0.6, 4.3, 0],
            ])}
            fill="#F6F7F5"
            opacity={mix(0.9, 0, fill)}
          />
        ))}
        <Church iso={ISO} x={1.2} y={0.4} scale={1} />
        {[0.2, 6.6].map((x) => (
          <Tree key={x} iso={ISO} x={x} y={2.6} size={0.5} />
        ))}
        {units
          .slice()
          .sort((a, b) => a.x + a.y - (b.x + b.y))
          .map((u, i) => {
            if (f < u.at) return null;
            const s = spring({frame: f - u.at, fps: 30, config: SETTLE});
            return <House key={i} iso={ISO} x={u.x} y={u.y} w={1.05} d={1.25} h={1.1} r={0.4} lift={(1 - s) * 2} opacity={Math.min(1, (f - u.at) / 5)} />;
          })}
      </svg>
    </div>
  );
};
