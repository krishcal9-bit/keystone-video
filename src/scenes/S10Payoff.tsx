import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {serif} from '../lib/fonts';
import {ease, rel, settle, SHOT} from '../lib/motion';
import {useL} from '../lib/layout';
import {CostBar} from '../components/CostBar';
import {AppShot, shotHeight} from '../components/AppShot';
import {Reveal, Source, WeightWord} from '../components/Type';
import {useCostGeom} from './S02Cost';

/** 25.0–27.5 s — the cost bar returns (shared element); land shrinks, the gap closes. */
export const S10Payoff: React.FC = () => {
  const f = useCurrentFrame();
  const {V, M, W, H, CW} = useL();
  const g = useCostGeom();
  const F = SHOT.payoff.from;
  const L2 = rel(F, 7.5, 2);
  const shrink = Math.min(1, settle(f, rel(F, 8)));
  const s = {
    build: 1,
    swell: 1,
    family: 1,
    gap: 1,
    payoff: shrink,
    callout: ease(f, rel(F, 24, 2), 14),
  };
  // re-centred composition: the bar returns lower, leaving room for the comparison shot
  const headTop = V ? g.headTop : 214;
  const barY = V ? g.y + 60 : 444;
  const shotW = V ? CW : 640;
  const shotTop = V ? 1060 : barY - 6;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: M, top: headTop, ...serif(g.headSize, 600), color: C.ink, width: CW}}>
        <Reveal at={0}>Stop waiting for land.</Reveal>
        {V ? (
          <Reveal at={L2}>
            <WeightWord at={L2 + 6} color={C.pine}>
              Start finding it.
            </WeightWord>
          </Reveal>
        ) : null}
      </div>
      {!V && (
        <div style={{position: 'absolute', left: M, top: headTop, ...serif(g.headSize, 600), width: CW}}>
          <span style={{visibility: 'hidden'}}>Stop waiting for land. </span>
          <Reveal at={L2} inline>
            <WeightWord at={L2 + 6} color={C.pine}>
              Start finding it.
            </WeightWord>
          </Reveal>
        </div>
      )}
      <CostBar {...g} y={barY} s={s} />
      <Sequence from={30}>
        <AppShot id="search-vs-wait" width={shotW} left={V ? M : W - M - shotW} top={shotTop} dur={SHOT.payoff.dur - 30} push={[1, 1.02]} />
      </Sequence>
      <Source at={36} style={{position: 'absolute', left: M, top: H - M - 26}}>
        Illustrative: partner land via SB 4 shown at a nominal cost.
      </Source>
    </AbsoluteFill>
  );
};
