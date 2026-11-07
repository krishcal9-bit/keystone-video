import React from 'react';
import {C} from '../../lib/brand';
import {ease, mix} from '../../lib/motion';
import {Cursor} from '../Cursor';
import {AppHeader, Bar, Card, Label, rng, ScreenProps, Title} from './common';

const SX = 24;
const SY = 88;
const SW = 1152;
const SH = 888;

// Polygon around the church parking lot (virtual screen coords)
const POLY: [number, number][] = [
  [300, 440],
  [900, 440],
  [900, 640],
  [770, 800],
  [300, 800],
];
const CLICKS = [12, 22, 32, 42, 52, 60]; // last click closes the shape on the first vertex

const ROOF = {lit: '#AEB8B3', shade: '#8D9893'};

const Roof: React.FC<{x: number; y: number; w: number; h: number; vertical?: boolean}> = ({x, y, w, h, vertical}) =>
  vertical ? (
    <g>
      <rect x={x + 5} y={y + 7} width={w} height={h} fill={C.ink} opacity={0.12} rx={2} />
      <rect x={x} y={y} width={w / 2} height={h} fill={ROOF.lit} />
      <rect x={x + w / 2} y={y} width={w / 2} height={h} fill={ROOF.shade} />
    </g>
  ) : (
    <g>
      <rect x={x + 5} y={y + 7} width={w} height={h} fill={C.ink} opacity={0.12} rx={2} />
      <rect x={x} y={y} width={w} height={h / 2} fill={ROOF.lit} />
      <rect x={x} y={y + h / 2} width={w} height={h / 2} fill={ROOF.shade} />
    </g>
  );

const TREES = (() => {
  const rand = rng(21);
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const side = [0, 2, 3][i % 3];
    const t = rand();
    const x = side === 0 ? 250 + t * 700 : side === 1 ? 960 + rand() * 120 : side === 2 ? 60 + rand() * 160 : 250 + t * 650;
    const y = side === 0 ? 410 + rand() * 10 : side === 1 ? 450 + t * 400 : side === 2 ? 300 + t * 560 : 850 + rand() * 50;
    pts.push([x, y, 16 + rand() * 12]);
  }
  return pts;
})();

const CARS = (() => {
  const rand = rng(5);
  const out: {x: number; y: number; c: string}[] = [];
  const colors = ['#E9ECE9', '#7E8A86', '#C7DAD1', '#D9D4C8', '#4A5753'];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 13; i++) {
      if (rand() < 0.45) continue;
      out.push({x: 322 + i * 44, y: 470 + row * 112 + (rand() < 0.5 ? 0 : 50), c: colors[Math.floor(rand() * colors.length)]});
    }
  }
  return out.filter((c) => !(c.x > 760 && c.y > 650));
})();

export const LotScan: React.FC<ScreenProps> = ({f}) => {
  const closed = ease(f, CLICKS[5], 12);
  // drawn edges
  const edges = POLY.map((p, i) => {
    const q = POLY[(i + 1) % POLY.length];
    const t = ease(f, CLICKS[i], CLICKS[i + 1] - CLICKS[i]);
    return {p, q, t, start: CLICKS[i]};
  });
  const progress = ease(f, CLICKS[0], CLICKS[5] - CLICKS[0] + 10);
  const cx = POLY.reduce((a, p) => a + p[0], 0) / POLY.length;
  const cy = POLY.reduce((a, p) => a + p[1], 0) / POLY.length;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EEF2EF'}}>
      <AppHeader active="Lot Scan" />
      <Card x={SX} y={SY} w={SW} h={SH} style={{background: '#DCE2DD'}}>
        <svg width={SW} height={SH} viewBox={`${SX} ${SY} ${SW} ${SH}`} style={{position: 'absolute', inset: 0}}>
          {/* roads */}
          <rect x={0} y={300} width={1200} height={78} fill="#C5CDC8" />
          <line x1={0} x2={1200} y1={339} y2={339} stroke="#F6F7F5" strokeWidth={3} strokeDasharray="26 22" />
          <rect x={210} y={0} width={70} height={1000} fill="#C5CDC8" />
          <line x1={245} x2={245} y1={0} y2={1000} stroke="#F6F7F5" strokeWidth={3} strokeDasharray="26 22" />
          {/* neighborhood roofs */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Roof key={`n${i}`} x={330 + i * 100} y={140} w={70} h={96} vertical />
          ))}
          {[0, 1, 2].map((i) => (
            <Roof key={`w${i}`} x={60} y={430 + i * 150} w={110} h={80} />
          ))}
          {/* church: nave + transept + steeple */}
          <Roof x={960} y={430} w={150} h={300} vertical />
          <Roof x={920} y={520} w={230} h={90} />
          <rect x={1005} y={735} width={60} height={60} fill={ROOF.shade} />
          <rect x={1005} y={735} width={30} height={30} fill={ROOF.lit} />
          {/* parking lot */}
          <rect x={300} y={440} width={600} height={360} fill="#C2CAC5" />
          <rect x={770} y={640} width={130} height={160} fill="#DCE2DD" />
          {[0, 1, 2].map((row) =>
            Array.from({length: 14}, (_, i) => (
              <line key={`s${row}${i}`} x1={318 + i * 44} x2={318 + i * 44} y1={462 + row * 112} y2={548 + row * 112} stroke="#F6F7F5" strokeWidth={2.5} opacity={0.85} />
            )),
          )}
          {CARS.map((c, i) => (
            <g key={`c${i}`}>
              <rect x={c.x + 3} y={c.y + 4} width={28} height={44} rx={7} fill={C.ink} opacity={0.14} />
              <rect x={c.x} y={c.y} width={28} height={44} rx={7} fill={c.c} />
              <rect x={c.x + 4} y={c.y + 12} width={20} height={18} rx={4} fill="#FFFFFF" opacity={0.28} />
            </g>
          ))}
          {/* trees */}
          {TREES.map(([x, y, rr], i) => (
            <g key={`t${i}`}>
              <circle cx={x + rr * 0.35} cy={y + rr * 0.45} r={rr} fill={C.ink} opacity={0.14} />
              <circle cx={x} cy={y} r={rr} fill={C.pine} />
              <circle cx={x - rr * 0.25} cy={y - rr * 0.25} r={rr * 0.62} fill={C.pineLight} />
            </g>
          ))}
          {/* traced polygon */}
          <polygon points={POLY.map((p) => p.join(',')).join(' ')} fill={C.pine} opacity={0.22 * closed} />
          {edges.map(({p, q, t}, i) =>
            t > 0 ? <line key={`e${i}`} x1={p[0]} y1={p[1]} x2={mix(p[0], q[0], t)} y2={mix(p[1], q[1], t)} stroke={C.pine} strokeWidth={5} strokeLinecap="round" /> : null,
          )}
          {POLY.map((p, i) => {
            const t = ease(f, CLICKS[i], 6);
            return t > 0 ? <circle key={`p${i}`} cx={p[0]} cy={p[1]} r={9 * (0.6 + 0.4 * t)} fill={C.surface} stroke={C.pine} strokeWidth={4} opacity={t} /> : null;
          })}
        </svg>
        {/* area tag */}
        <div
          style={{
            position: 'absolute',
            left: cx - SX - 100,
            top: cy - SY - 36,
            width: 200,
            padding: '12px 16px',
            background: C.surface,
            borderRadius: 12,
            boxShadow: '0 2px 4px rgba(24,36,32,0.08), 0 10px 24px rgba(24,36,32,0.12)',
            opacity: closed,
            transform: `translateY(${mix(10, 0, closed)}px)`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Label size={14} color={C.pine}>Measured area</Label>
          <Bar w={mix(40, 150, ease(f, CLICKS[5], 26))} h={16} color={C.ink2} style={{opacity: 0.55}} />
        </div>
      </Card>
      {/* right panel */}
      <Card x={1200} y={SY} w={376} h={SH}>
        <div style={{padding: 28, display: 'flex', flexDirection: 'column', gap: 22}}>
          <Title>Lot Scan</Title>
          {['Lot area', 'Parking stalls', 'Buildable'].map((l, i) => (
            <div key={l} style={{display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 18, borderBottom: `1px solid ${C.line}`}}>
              <Label size={15}>{l}</Label>
              <Bar w={mix(30, 220 - i * 40, ease(f, CLICKS[0] + i * 10, 50))} h={24} color={i === 0 ? C.pine : C.pineMist2} />
            </div>
          ))}
          <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8}}>
            {[0, 1, 2, 3].map((i) => (
              <Bar key={i} w={300 - i * 34} h={11} />
            ))}
          </div>
          <div style={{marginTop: 10, height: 52, borderRadius: 12, background: C.pine, opacity: mix(0.35, 1, progress), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Label size={17} color={C.surface}>Save lot</Label>
          </div>
        </div>
      </Card>
      <Cursor
        frame={f}
        appearAt={4}
        path={[
          {at: 4, x: 520, y: 620},
          ...POLY.map((p, i) => ({at: CLICKS[i], x: p[0], y: p[1], click: true})),
          {at: CLICKS[5], x: POLY[0][0], y: POLY[0][1], click: true},
          {at: 80, x: 640, y: 700},
        ]}
      />
    </div>
  );
};
