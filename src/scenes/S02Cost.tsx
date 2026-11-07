import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {sans, serif} from '../lib/fonts';
import {ease, mix, rel, SHOT} from '../lib/motion';
import {useL} from '../lib/layout';
import {CostBar} from '../components/CostBar';
import {Reveal, Rolling, Source, WeightWord} from '../components/Type';

/** Shared geometry for the cost bar (used again in the payoff). */
export const useCostGeom = () => {
  const {V, M, CW} = useL();
  return V
    ? {x: M, y: 560, width: CW, barH: 104, rowGap: 34, labelSize: 20, headTop: 300, headSize: 84}
    : {x: M, y: 340, width: CW, barH: 104, rowGap: 36, labelSize: 26, headTop: 118, headSize: 76};
};

const STATS = [
  {num: '$1.47M', label: 'median Orange County home'},
  {num: '~4 yrs', label: 'from land to keys'},
  {num: '34', label: 'cities, each with its own rules'},
];

export const S02Cost: React.FC = () => {
  const f = useCurrentFrame();
  const {V, M, CW, H} = useL();
  const g = useCostGeom();
  const F = SHOT.cost.from;
  const SWELL = rel(F, 28);
  const s = {
    build: ease(f, 4, 22),
    swell: ease(f, SWELL, 18),
    family: ease(f, rel(F, 42, 2), 14),
    gap: ease(f, rel(F, 50), 16),
    payoff: 0,
    callout: 0,
  };
  const statsTop = V ? 1040 : 700;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: M, top: g.headTop, ...serif(g.headSize, 600), color: C.ink, width: CW}}>
        <Reveal at={0}>
          <WeightWord at={SWELL} color={C.pine}>
            Land
          </WeightWord>{' '}
          is the biggest cost.
        </Reveal>
      </div>
      <CostBar {...g} s={s} />
      {/* stats */}
      <div
        style={{
          position: 'absolute',
          left: M,
          top: statsTop,
          width: CW,
          display: 'flex',
          flexDirection: V ? 'column' : 'row',
          gap: V ? 44 : 0,
          borderTop: `1px solid ${C.line}`,
          paddingTop: V ? 52 : 44,
          opacity: ease(f, 40, 8),
        }}
      >
        {STATS.map((st, i) => {
          const at = rel(F, 44 + i * 7.5, 2);
          const t = ease(f, at, 26);
          return (
            <div key={st.num} style={{flex: 1, opacity: f >= at ? 1 : 0, transform: `translateY(${mix(18, 0, ease(f, at, 14))}px)`}}>
              <div style={{...serif(V ? 104 : 96, 600), color: C.ink}}>
                <Rolling text={st.num} progress={t} />
              </div>
              <div style={{...sans(V ? 30 : 28, 500), color: C.ink2, marginTop: 10}}>{st.label}</div>
            </div>
          );
        })}
      </div>
      <Source at={60} style={{position: 'absolute', left: M, top: H - M - 26}}>
        Source: Claude Impact Lab challenge brief. Cost proportions illustrative.
      </Source>
    </AbsoluteFill>
  );
};
