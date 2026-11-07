import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {C} from './lib/brand';
import './lib/fonts';
import {Easing, interpolate} from 'remotion';
import {SHOT} from './lib/motion';
import {useL} from './lib/layout';
import {FilmFinish} from './components/FilmFinish';
import {S01Hook} from './scenes/S01Hook';
import {S02Cost} from './scenes/S02Cost';
import {S03Luck} from './scenes/S03Luck';
import {LAW_LEAD, S04Law} from './scenes/S04Law';
import {openingPath, S05Logo, useArchGeom, ZOOM_DUR, ZOOM_START} from './scenes/S05Logo';
import {ProgressRail, StepScene} from './scenes/Steps';
import {S10Payoff} from './scenes/S10Payoff';
import {S11End} from './scenes/S11End';

/** Brand transition 1: pine bar wipe (luck → law). The bar crosses the cut point. */
const WIPE = 12;
const PineWipe: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const {W} = useL();
  const barW = Math.round(W * 0.09);
  const t = interpolate(f, [0, WIPE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0.1, 0.2, 1)});
  const lead = t * (W + barW * 2) - barW; // bar's leading (right) edge
  const trail = lead - barW;
  const done = f >= WIPE;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: done ? undefined : `inset(0 ${Math.max(0, W - Math.max(0, trail))}px 0 0)`}}>{children}</AbsoluteFill>
      {!done && <div style={{position: 'absolute', top: 0, bottom: 0, left: trail, width: barW, background: C.pine}} />}
    </AbsoluteFill>
  );
};

/** Brand transition 2: masked shape zoom-through (the arch opening reveals the Find shot). */
const ZoomThrough: React.FC<{children: React.ReactNode; offset: number}> = ({children, offset}) => {
  const f = useCurrentFrame() + offset; // in logo-scene frames
  const g = useArchGeom();
  const done = f >= ZOOM_START + ZOOM_DUR;
  return <AbsoluteFill style={{clipPath: done ? undefined : openingPath(f, g)}}>{children}</AbsoluteFill>;
};

export const Main: React.FC = () => {
  const findLead = SHOT.find.from - (SHOT.logo.from + ZOOM_START);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Sequence from={SHOT.hook.from} durationInFrames={SHOT.hook.dur} name="1 Hook">
        <S01Hook />
      </Sequence>
      <Sequence from={SHOT.cost.from} durationInFrames={SHOT.cost.dur} name="2 Cost">
        <S02Cost />
      </Sequence>
      <Sequence from={SHOT.luck.from} durationInFrames={SHOT.luck.dur + WIPE} name="3 Luck">
        <S03Luck />
      </Sequence>
      <Sequence from={SHOT.law.from - LAW_LEAD} durationInFrames={SHOT.law.dur + LAW_LEAD} name="4 Law (pine wipe)">
        <PineWipe>
          <S04Law />
        </PineWipe>
      </Sequence>
      <Sequence from={SHOT.logo.from} durationInFrames={SHOT.logo.dur + 10} name="5 Logo">
        <S05Logo />
      </Sequence>
      <Sequence from={SHOT.find.from - findLead} durationInFrames={SHOT.find.dur + findLead} name="6 Find (zoom-through)">
        <ZoomThrough offset={ZOOM_START}>
          <StepScene i={0} lead={findLead} />
        </ZoomThrough>
      </Sequence>
      <Sequence from={SHOT.measure.from} durationInFrames={SHOT.measure.dur} name="7 Measure">
        <StepScene i={1} />
      </Sequence>
      <Sequence from={SHOT.design.from} durationInFrames={SHOT.design.dur} name="8 Design">
        <StepScene i={2} />
      </Sequence>
      <Sequence from={SHOT.pitch.from} durationInFrames={SHOT.pitch.dur} name="9 Pitch">
        <StepScene i={3} />
      </Sequence>
      <Sequence from={SHOT.find.from} durationInFrames={SHOT.payoff.from - SHOT.find.from} name="Progress rail">
        <ProgressRail />
      </Sequence>
      <Sequence from={SHOT.payoff.from} durationInFrames={SHOT.payoff.dur} name="10 Payoff (shared cost bar)">
        <S10Payoff />
      </Sequence>
      <Sequence from={SHOT.end.from} durationInFrames={SHOT.end.dur} name="11 End card">
        <S11End />
      </Sequence>
      <FilmFinish />
    </AbsoluteFill>
  );
};
