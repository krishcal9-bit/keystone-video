import React from 'react';
import {spring} from 'remotion';
import {C} from '../../lib/brand';
import {ease, mix, SETTLE} from '../../lib/motion';
import {House, Iso, IsoDefs, poly, Slab, Tree} from '../../illustrations/iso';
import {Cursor} from '../Cursor';
import {AppHeader, Bar, Card, Label, ScreenProps, Title} from './common';

const VX = 468;
const VY = 88;
const VWD = 1108;
const VHT = 888;

const TRACK_X0 = 56;
const TRACK_X1 = 392;
const PARK_Y = 660;
const DRAG_START = 22;
const DRAG_END = 46;

const ISO: Iso = {s: 72, ox: VWD * 0.5, oy: 180};
const LOT_W = 8;
const LOT_D = 7.2;

const Slider: React.FC<{label: string; y: number; v: number; active?: boolean}> = ({label, y, v, active}) => {
  const kx = mix(TRACK_X0, TRACK_X1, v);
  return (
    <div style={{position: 'absolute', left: 0, top: y - 44, width: 420}}>
      <div style={{display: 'flex', justifyContent: 'space-between', padding: `0 ${TRACK_X0 - 24}px 0 32px`}}>
        <Label size={16} color={active ? C.ink : C.ink2}>{label}</Label>
        <Bar w={46} h={12} color={active ? C.pineMist2 : C.line} style={{marginTop: 4}} />
      </div>
      <div style={{position: 'absolute', left: TRACK_X0 - 24, top: 42, width: TRACK_X1 - TRACK_X0, height: 6, borderRadius: 9, background: C.line}} />
      <div style={{position: 'absolute', left: TRACK_X0 - 24, top: 42, width: kx - TRACK_X0, height: 6, borderRadius: 9, background: C.pine}} />
      <div
        style={{
          position: 'absolute',
          left: kx - 24 - 13,
          top: 45 - 13,
          width: 26,
          height: 26,
          borderRadius: 99,
          background: C.surface,
          border: `3px solid ${C.pine}`,
          boxShadow: '0 2px 6px rgba(24,36,32,0.18)',
        }}
      />
    </div>
  );
};

export const PlanStudio: React.FC<ScreenProps> = ({f}) => {
  const drag = ease(f, DRAG_START, DRAG_END - DRAG_START);
  const park = mix(0.78, 0.26, drag); // parking ratio slider value
  // parking slab shrinks as parking drops; homes rows fill the freed ground
  const parkDepth = mix(4.6, 1.5, drag);
  const units: {x: number; y: number; at: number}[] = [];
  const rows = [0.35, 1.95, 3.55];
  rows.forEach((ry, r) => {
    for (let i = 0; i < 6; i++) {
      units.push({x: 0.8 + i * 1.08, y: ry, at: r === 0 ? -30 + i * 2 : 40 + (r - 1) * 16 + i * 2.5});
    }
  });
  const units3 = units.filter((u) => u.at < 0 || u.y + 1.3 <= LOT_D - parkDepth + 0.05);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EEF2EF'}}>
      <AppHeader active="Plan Studio" />
      <Card x={24} y={VY} w={420} h={VHT}>
        <div style={{position: 'absolute', left: 32, top: 28}}>
          <Title>Plan Studio</Title>
        </div>
        <div style={{position: 'absolute', left: 32, top: 92, display: 'flex', gap: 10}}>
          <Bar w={110} h={36} color={C.pineSoft} />
          <Bar w={110} h={36} color={C.paper} />
        </div>
        <Slider label="Homes" y={260 - VY + 60} v={mix(0.42, 0.74, drag)} />
        <Slider label="Stories" y={420 - VY + 30} v={0.5} />
        <Slider label="Parking per home" y={PARK_Y - VY} v={park} active />
        <div style={{position: 'absolute', left: 32, top: 690, right: 32, display: 'flex', flexDirection: 'column', gap: 12}}>
          <Bar w={300} h={11} />
          <Bar w={240} h={11} />
          <div style={{height: 52, borderRadius: 12, background: C.pine, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Label size={17} color={C.surface}>Export plan</Label>
          </div>
        </div>
      </Card>
      <Card x={VX} y={VY} w={VWD} h={VHT} style={{background: '#EDF1EE'}}>
        <svg width={VWD} height={VHT} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <IsoDefs />
          {/* lot */}
          <Slab iso={ISO} x={-0.3} y={-0.3} w={LOT_W + 0.6} d={LOT_D + 0.6} fill={C.pineMist} />
          <Slab iso={ISO} x={0} y={0} w={LOT_W} d={LOT_D} fill="#D9E6E0" />
          {/* parking */}
          <Slab iso={ISO} x={0.3} y={LOT_D - parkDepth} w={LOT_W - 0.6} d={parkDepth - 0.3} fill="#C9D1CC" />
          {Array.from({length: 12}, (_, i) => (
            <polygon
              key={i}
              points={poly(ISO, [
                [0.6 + i * 0.6, LOT_D - parkDepth + 0.2, 0],
                [0.63 + i * 0.6, LOT_D - parkDepth + 0.2, 0],
                [0.63 + i * 0.6, Math.min(LOT_D - 0.4, LOT_D - parkDepth + 1.1), 0],
                [0.6 + i * 0.6, Math.min(LOT_D - 0.4, LOT_D - parkDepth + 1.1), 0],
              ])}
              fill="#F6F7F5"
              opacity={0.9}
            />
          ))}
          {/* trees on the lot edge */}
          {[0.6, 2.2, 3.8].map((y) => (
            <Tree key={y} iso={ISO} x={-0.1} y={y + 0.4} size={0.45} />
          ))}
          {/* homes, back-to-front */}
          {units3
            .slice()
            .sort((a, b) => a.x + a.y - (b.x + b.y))
            .map((u, i) => {
              const s = spring({frame: f - u.at, fps: 30, config: SETTLE});
              if (f < u.at) return null;
              return <House key={i} iso={ISO} x={u.x} y={u.y} w={1.08} d={1.3} h={1.2} r={0.42} lift={(1 - s) * 2.2} opacity={Math.min(1, (f - u.at) / 5)} />;
            })}
        </svg>
        {/* view toggle */}
        <div style={{position: 'absolute', right: 24, top: 24, display: 'flex', gap: 8}}>
          <Bar w={44} h={44} color={C.surface} style={{borderRadius: 12, border: `1px solid ${C.line}`}} />
          <Bar w={44} h={44} color={C.surface} style={{borderRadius: 12, border: `1px solid ${C.line}`}} />
        </div>
      </Card>
      <Cursor
        frame={f}
        appearAt={6}
        path={[
          {at: 6, x: 420, y: 560},
          {at: DRAG_START, x: mix(TRACK_X0, TRACK_X1, 0.78), y: PARK_Y + 1, click: true},
          {at: DRAG_END, x: mix(TRACK_X0, TRACK_X1, 0.26), y: PARK_Y + 1, travel: DRAG_END - DRAG_START},
          {at: 66, x: 900, y: 560},
        ]}
      />
    </div>
  );
};
