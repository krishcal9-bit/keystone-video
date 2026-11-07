import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {C} from '../lib/brand';
import {sans, serif} from '../lib/fonts';
import {LAW_LEAD, rel, SHOT} from '../lib/motion';
import {useL} from '../lib/layout';
import {AppShot, shotHeight} from '../components/AppShot';
import {Reveal, Source, WeightWord} from '../components/Type';

/** Lead-in frames: this scene starts under the pine bar wipe, 6 frames before its cut point. */
export {LAW_LEAD};

/** 8.0–10.5 s — SB 4. Text left, app footage right. */
export const S04Law: React.FC = () => {
  const {V, M, W, H, CW} = useL();
  const T = LAW_LEAD;
  const shotW = V ? CW : 1000;
  const shotLeft = V ? M : W - M - shotW;
  const shotTop = V ? 1010 : (H - shotHeight(shotW)) / 2;
  const lines = ['Since 2024, SB 4 lets', 'churches build homes', 'on their own land,'];
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: M, top: V ? 250 : 262, width: V ? CW : 700}}>
        <div style={{...sans(26, 600), color: C.pine, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26}}>
          <Reveal at={T - 3}>
            <span style={{display: 'inline-flex', alignItems: 'center', gap: 12}}>
              <svg width={20} height={19} viewBox="0 0 20 19">
                <path d="M0,0 L20,0 L15.5,19 L4.5,19 Z" fill={C.brass} />
              </svg>
              California SB 4
            </span>
          </Reveal>
        </div>
        <div style={{...serif(V ? 80 : 68, 600), color: C.ink, lineHeight: 1.08}}>
          {lines.map((l, i) => (
            <Reveal key={l} at={T + 1 + i * 3.75}>
              {l}
            </Reveal>
          ))}
          <Reveal at={T + rel(SHOT.law.from, 12, 2, 10)}>
            <WeightWord at={T + rel(SHOT.law.from, 20)} color={C.pine}>
              by right.
            </WeightWord>
          </Reveal>
        </div>
      </div>
      <Sequence from={2}>
        <AppShot id="law-lot" width={shotW} left={shotLeft} top={shotTop} dur={SHOT.law.dur + T - 2} push={[1, 1.03]} />
      </Sequence>
      <Source at={T + 30} style={{position: 'absolute', left: M, top: H - M - 26, width: CW}}>
        California SB 4 (2023): approval by right, with no discretionary hearings and no CEQA review.
      </Source>
    </AbsoluteFill>
  );
};
