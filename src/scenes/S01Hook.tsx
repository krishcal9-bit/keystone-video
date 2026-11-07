import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {serif} from '../lib/fonts';
import {ease, mix, rel, settle} from '../lib/motion';
import {useL} from '../lib/layout';

/** 0.0–2.5 s — "Every home has to hit $0." Words rise from masks; $0 lands in signal red. */
const Word: React.FC<{at: number; children: React.ReactNode; red?: boolean}> = ({at, children, red}) => {
  const f = useCurrentFrame();
  // big type: spring with a gentle settle for $0, house ease for the rest
  const t = red ? settle(f, at) : ease(f, at, 16);
  const y = mix(110, 0, t);
  const weight = red ? Math.round(mix(300, 600, ease(f, at + 2, 20))) : undefined;
  return (
    <span style={{display: 'inline-block', overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em', paddingTop: '0.04em', verticalAlign: 'top'}}>
      <span
        style={{
          display: 'inline-block',
          transform: `translateY(${y}%)`,
          opacity: f >= at ? 1 : 0,
          color: red ? C.signal : C.ink,
          fontWeight: weight,
        }}
      >
        {children}
      </span>
    </span>
  );
};

export const S01Hook: React.FC = () => {
  const {V} = useL();
  const size = V ? 150 : 176;
  // words on 16ths, "hit" on an 8th, "$0." on the beat
  const t = [rel(0, 4, 4), rel(0, 8, 4), rel(0, 11, 4), rel(0, 15, 4), rel(0, 22, 2), rel(0, 30)];
  for (let i = 1; i < t.length; i++) t[i] = Math.max(t[i], t[i - 1] + 2);
  const lines: [string, number, boolean?][][] = V
    ? [
        [['Every', t[0]], ['home', t[1]]],
        [['has', t[2]], ['to', t[3]]],
        [['hit', t[4]], ['$0.', t[5], true]],
      ]
    : [
        [['Every', t[0]], ['home', t[1]], ['has', t[2]], ['to', t[3]]],
        [['hit', t[4]], ['$0.', t[5], true]],
      ];
  return (
    <AbsoluteFill style={{background: C.paper, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{...serif(size, 600, 50), color: C.ink, textAlign: 'center', lineHeight: 1.0}}>
        {lines.map((ln, i) => (
          <div key={i} style={{display: 'flex', justifyContent: 'center', gap: '0.24em'}}>
            {ln.map(([w, at, red]) => (
              <Word key={w} at={at} red={red}>
                {w}
              </Word>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
