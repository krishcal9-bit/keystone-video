import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {sans, serif} from '../lib/fonts';
import {ease, mix} from '../lib/motion';
import {useL} from '../lib/layout';
import {Reveal, WeightWord} from '../components/Type';
import {LuckVignette} from '../illustrations/LuckVignette';

/** 5.5–8.0 s — "Today, finding land is luck." Slower, muted. */
export const S03Luck: React.FC = () => {
  const f = useCurrentFrame();
  const {V, M} = useL();
  const drift = mix(0, -14, f / 75); // slow camera drift
  const illIn = ease(f, 0, 24);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: M, top: V ? 230 : 330, ...serif(V ? 104 : 104, 600), color: C.ink}}>
        <Reveal at={0} dur={20}>Today, finding land</Reveal>
        <Reveal at={7} dur={20}>
          is <WeightWord at={14} from={300} to={600} dur={30}>luck.</WeightWord>
        </Reveal>
        <div style={{...sans(V ? 36 : 36, 500), color: C.ink2, marginTop: 40, letterSpacing: '-0.005em'}}>
          <Reveal at={22} dur={20}>Habitat waits for a city to offer a parcel.</Reveal>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: V ? 90 : 960,
          top: V ? 820 : 170,
          opacity: illIn,
          transform: `translate(${drift}px, ${mix(20, 0, illIn)}px)`,
        }}
      >
        <LuckVignette f={f} scale={V ? 1 : 0.96} />
      </div>
    </AbsoluteFill>
  );
};
