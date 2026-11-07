import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {sans} from '../lib/fonts';
import {ease, mix, SHOT} from '../lib/motion';
import {useL} from '../lib/layout';
import {AppShot, shotHeight} from '../components/AppShot';
import {Reveal} from '../components/Type';
import type {SlotId} from '../slots';

export const STEPS: {id: SlotId; n: number; name: string; caption: string[]; shot: {from: number; dur: number}; push: [number, number]}[] = [
  {id: 'site-finder', n: 1, name: 'Find', caption: ['Find every', 'eligible site.'], shot: SHOT.find, push: [1, 1.03]},
  {id: 'lot-scan', n: 2, name: 'Measure', caption: ['Measure any lot', 'from the sky.'], shot: SHOT.measure, push: [1, 1.03]},
  {id: 'plan-studio', n: 3, name: 'Design', caption: ['See what it', 'can hold.'], shot: SHOT.design, push: [1, 1.07]},
  {id: 'pitch-kit', n: 4, name: 'Pitch', caption: ['Start the', 'conversation,', 'in their language.'], shot: SHOT.pitch, push: [1, 1.03]},
];

export const useStepGeom = () => {
  const {V, M, W, H, CW} = useL();
  if (V) {
    const w = CW;
    return {w, left: M, top: 600, capLeft: M, capTop: 600 + shotHeight(w) + 110, capW: CW, capSize: 76};
  }
  const w = 1240;
  return {w, left: W - M - w, top: (H - shotHeight(w)) / 2, capLeft: M, capTop: null as number | null, capW: 440, capSize: 54};
};

/** One step shot. `lead` = frames this scene starts before its cut (for the zoom-through). */
export const StepScene: React.FC<{i: number; lead?: number}> = ({i, lead = 0}) => {
  const {V, M} = useL();
  const s = STEPS[i];
  const g = useStepGeom();
  const capAt = lead + 6; // half-beat-ish after the cut, on the grid (cut + 7.5 rounded)
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <AppShot id={s.id} width={g.w} left={g.left} top={g.top} dur={s.shot.dur + lead} push={s.push} enter={lead === 0 ? 'cut' : false} delay={lead} />
      <div
        style={{
          position: 'absolute',
          left: g.capLeft,
          width: g.capW,
          ...(g.capTop === null ? {bottom: M} : {top: g.capTop}),
        }}
      >
        <div style={{...sans(g.capSize, 600), color: C.ink, lineHeight: 1.14, letterSpacing: '-0.015em'}}>
          {s.caption.map((line, k) => (
            <Reveal key={line} at={capAt + k * 3}>
              {line}
            </Reveal>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Slim progress rail that persists through the four steps (sits above the step scenes). */
export const ProgressRail: React.FC = () => {
  const f = useCurrentFrame(); // 0 = start of Find
  const {V, M} = useL();
  const base = SHOT.find.from;
  const total = SHOT.payoff.from - base;
  const starts = STEPS.map((s) => s.shot.from - base);
  // active index slides with a camera spring on every cut
  let active = 0;
  starts.forEach((st, i) => {
    if (i > 0) active = mix(active, i, spring({frame: f - st, fps: 30, config: {damping: 26, stiffness: 240}}));
  });
  const fill = interpolate(f, [0, total], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const itemH = 58;
  const itemW = V ? 222 : 0;
  const appear = (i: number) => ease(f, 2 + i * 2, 12);

  if (V) {
    return (
      <div style={{position: 'absolute', left: M, top: 300, width: itemW * 4}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: itemW * 4, height: 3, background: C.line, borderRadius: 3}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: itemW * 4 * fill, height: 3, background: C.pine, borderRadius: 3}} />
        <div style={{display: 'flex', marginTop: 22}}>
          {STEPS.map((s, i) => {
            const on = Math.max(0, 1 - Math.abs(active - i));
            return (
              <div key={s.n} style={{width: itemW, display: 'flex', gap: 10, alignItems: 'baseline', opacity: appear(i) * mix(0.42, 1, on), transform: `translateY(${mix(10, 0, appear(i))}px)`}}>
                <span style={{...sans(26, 600), color: on > 0.5 ? C.pine : C.ink2, fontVariantNumeric: 'tabular-nums'}}>{s.n}</span>
                <span style={{...sans(30, 600), color: on > 0.5 ? C.ink : C.ink2}}>{s.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{position: 'absolute', left: M, top: M + 14}}>
      {/* track + fill */}
      <div style={{position: 'absolute', left: 0, top: 6, width: 3, height: itemH * 4 - 12, background: C.line, borderRadius: 3}} />
      <div style={{position: 'absolute', left: 0, top: 6, width: 3, height: (itemH * 4 - 12) * fill, background: C.pine, borderRadius: 3}} />
      {/* active indicator */}
      <div style={{position: 'absolute', left: -3, top: active * itemH + 8, width: 9, height: itemH - 28, borderRadius: 9, background: C.pine}} />
      {STEPS.map((s, i) => {
        const on = Math.max(0, 1 - Math.abs(active - i));
        return (
          <div
            key={s.n}
            style={{
              height: itemH,
              paddingLeft: 30,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              transform: `translate(${mix(-10, 0, appear(i))}px, -8px)`,
              opacity: appear(i) * mix(0.45, 1, on),
            }}
          >
            <span style={{...sans(24, 600), color: on > 0.5 ? C.pine : C.ink2, width: 16, fontVariantNumeric: 'tabular-nums'}}>{s.n}</span>
            <span style={{...sans(30, 600), color: on > 0.5 ? C.ink : C.ink2, letterSpacing: '-0.01em'}}>{s.name}</span>
          </div>
        );
      })}
    </div>
  );
};
