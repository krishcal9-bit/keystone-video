import React from 'react';
import {C} from '../../lib/brand';
import {ease, mix} from '../../lib/motion';
import {Cursor} from '../Cursor';
import {AppHeader, Bar, Card, Chip, Label, rng, ScreenProps, Title} from './common';

// Map card geometry (virtual px)
const MX = 468;
const MY = 88;
const MW = 1108;
const MH = 888;
const coast = (x: number) => MH * 0.62 + x * 0.42; // land is above this line (local coords)

type Parcel = {x: number; y: number; w: number; h: number; ok: boolean; delay: number};
const PARCELS: Parcel[] = (() => {
  const rand = rng(7);
  const out: Parcel[] = [];
  let guard = 0;
  while (out.length < 78 && guard++ < 2000) {
    const x = 40 + rand() * (MW - 80);
    const y = 40 + rand() * (MH - 80);
    if (y > coast(x) - 40) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.y - y) < 54)) continue;
    out.push({x, y, w: 22 + rand() * 18, h: 16 + rand() * 10, ok: rand() < 0.3, delay: rand() * 14});
  }
  // the parcel the cursor opens (screen 1060,470 → local)
  out.push({x: 1060 - MX, y: 470 - MY, w: 40, h: 28, ok: true, delay: 0});
  return out;
})();
const PICK = PARCELS[PARCELS.length - 1];

const CHIP_Y = 252;
const CLICK_FILTER = 34;
const CLICK_PARCEL = 74;

export const SiteFinder: React.FC<ScreenProps> = ({f}) => {
  const filt = ease(f, CLICK_FILTER, 14);
  const sel = ease(f, CLICK_PARCEL, 10);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EEF2EF'}}>
      <AppHeader active="Site Finder" />
      {/* left panel */}
      <Card x={24} y={MY} w={420} h={MH}>
        <div style={{padding: 28, display: 'flex', flexDirection: 'column', gap: 18}}>
          <Title>Site Finder</Title>
          <div style={{height: 46, borderRadius: 12, border: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 16px'}}>
            <Bar w={180} h={12} />
          </div>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            <Chip>Churches</Chip>
            <Chip>Colleges</Chip>
            <Chip on={filt}>SB 4 eligible</Chip>
          </div>
          <div style={{display: 'flex', gap: 14, marginTop: 6}}>
            {[0, 1].map((i) => (
              <div key={i} style={{flex: 1, background: C.pineSoft, borderRadius: 12, padding: 16}}>
                <Bar w={70} h={10} color={C.pineMist2} />
                <Bar w={mix(40, 120, ease(f, CLICK_FILTER + 4 + i * 4, 30))} h={26} color={C.pine} style={{marginTop: 12, opacity: 0.85}} />
              </div>
            ))}
          </div>
          <Label size={15} style={{marginTop: 6}}>Results</Label>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const t = ease(f, CLICK_FILTER + 8 + i * 3, 12);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  opacity: mix(0.35, 1, t),
                  transform: `translateY(${mix(10, 0, t)}px)`,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <div style={{width: 36, height: 36, borderRadius: 9, background: t > 0.5 ? C.pine : C.line}} />
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <Bar w={190 - (i % 3) * 30} h={12} color={t > 0.5 ? C.ink2 : C.line} style={{opacity: t > 0.5 ? 0.55 : 1}} />
                  <Bar w={120 - (i % 2) * 24} h={10} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {/* map */}
      <Card x={MX} y={MY} w={MW} h={MH} style={{background: '#EDF1EE'}}>
        <svg width={MW} height={MH} style={{position: 'absolute', inset: 0}}>
          {/* ocean */}
          <path d={`M0,${coast(0)} L${MW},${coast(MW)} L${MW},${MH} L0,${MH} Z`} fill={C.pineMist} />
          <path d={`M0,${coast(0) + 22} L${MW},${coast(MW) + 22}`} stroke="#D6E4DD" strokeWidth={6} />
          {/* street grid, rotated like OC's */}
          <g transform={`rotate(-12 ${MW / 2} ${MH / 2})`} stroke="#FFFFFF" strokeWidth={5}>
            {Array.from({length: 22}, (_, i) => (
              <line key={`h${i}`} x1={-300} x2={MW + 300} y1={-300 + i * 76} y2={-300 + i * 76} />
            ))}
            {Array.from({length: 26}, (_, i) => (
              <line key={`v${i}`} y1={-300} y2={MH + 300} x1={-300 + i * 76} x2={-300 + i * 76} />
            ))}
          </g>
          {/* freeway */}
          <path d={`M-20,${MH * 0.2} C${MW * 0.3},${MH * 0.28} ${MW * 0.55},${MH * 0.05} ${MW + 20},${MH * 0.16}`} stroke="#FFFFFF" strokeWidth={16} fill="none" />
          <path d={`M-20,${MH * 0.2} C${MW * 0.3},${MH * 0.28} ${MW * 0.55},${MH * 0.05} ${MW + 20},${MH * 0.16}`} stroke={C.line} strokeWidth={2} fill="none" />
          {/* land mask over ocean edge */}
          <path d={`M0,${coast(0)} L${MW},${coast(MW)} L${MW},${MH} L0,${MH} Z`} fill={C.pineMist} />
          {/* parcels */}
          {PARCELS.map((p, i) => {
            const t = ease(f, CLICK_FILTER + p.delay, 14);
            const isPick = p === PICK;
            const fill = p.ok ? (t > 0.02 ? C.pine : C.ink2) : C.ink2;
            const op = p.ok ? mix(0.38, 1, t) : mix(0.38, 0.1, t);
            const sc = p.ok ? mix(1, 1.12, t) : mix(1, 0.92, t);
            return (
              <g key={i} transform={`translate(${p.x} ${p.y}) rotate(-12) scale(${sc})`}>
                <rect x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} rx={4} fill={fill} opacity={op} />
                {isPick && sel > 0 && (
                  <rect
                    x={-p.w / 2 - 8}
                    y={-p.h / 2 - 8}
                    width={p.w + 16}
                    height={p.h + 16}
                    rx={9}
                    fill="none"
                    stroke={C.pine}
                    strokeWidth={3}
                    opacity={sel}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {/* parcel popover */}
        <div
          style={{
            position: 'absolute',
            left: PICK.x + 34,
            top: PICK.y - 118,
            width: 260,
            padding: 18,
            background: C.surface,
            borderRadius: 14,
            boxShadow: '0 2px 4px rgba(24,36,32,0.06), 0 12px 28px rgba(24,36,32,0.12)',
            opacity: sel,
            transform: `translateY(${mix(10, 0, sel)}px)`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Label size={14} color={C.pine}>Eligible under SB 4</Label>
          <Bar w={200} h={14} color={C.ink2} style={{opacity: 0.5}} />
          <Bar w={150} h={11} />
          <div style={{display: 'flex', gap: 8, marginTop: 4}}>
            <Bar w={70} h={26} color={C.pineSoft} />
            <Bar w={70} h={26} color={C.pineSoft} />
          </div>
        </div>
      </Card>
      <Cursor
        frame={f}
        appearAt={10}
        path={[
          {at: 10, x: 900, y: 720},
          {at: CLICK_FILTER, x: 344, y: CHIP_Y, click: true},
          {at: 56, x: 760, y: 560},
          {at: CLICK_PARCEL, x: 1060, y: 470, click: true},
          {at: 100, x: 1120, y: 520},
        ]}
      />
    </div>
  );
};
