import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {sans, serif} from '../lib/fonts';
import {ease, mix, settle} from '../lib/motion';
import {useL} from '../lib/layout';
import {ArchIcon} from '../components/Arch';
import {Reveal} from '../components/Type';
import {Wordmark} from '../components/Wordmark';

/** 27.5–30.0 s — end card, then fade to paper. */
export const S11End: React.FC = () => {
  const f = useCurrentFrame();
  const {V, M, H} = useL();
  const icon = settle(f, 0);
  const fade = 1 - ease(f, 60, 15);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <AbsoluteFill style={{opacity: fade, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', paddingBottom: V ? 120 : 40}}>
        <div style={{opacity: Math.min(1, f / 6), transform: `translateY(${mix(30, 0, icon)}px)`}}>
          <ArchIcon size={V ? 190 : 150} />
        </div>
        <div style={{marginTop: V ? 48 : 36}}>
          <Reveal at={4} pad={V ? 50 : 44}>
            <Wordmark size={V ? 150 : 128} />
          </Reveal>
        </div>
        <div style={{...serif(V ? 50 : 46, 400, 50), color: C.ink2, marginTop: V ? 26 : 18, letterSpacing: '-0.01em'}}>
          <Reveal at={11}>Homeownership that holds.</Reveal>
        </div>
        <div style={{width: 64, height: 2, background: C.line, margin: V ? '64px 0 56px' : '48px 0 40px', opacity: ease(f, 18, 10)}} />
        <div style={{...sans(V ? 38 : 34, 500), color: C.ink, maxWidth: V ? 820 : 'none'}}>
          {V ? (
            <>
              <Reveal at={22}>Keystone finds the ground.</Reveal>
              <Reveal at={25}>Habitat builds the homes.</Reveal>
            </>
          ) : (
            <Reveal at={22}>Keystone finds the ground. Habitat builds the homes.</Reveal>
          )}
        </div>
        <div style={{...sans(V ? 34 : 30, 600), color: C.pine, marginTop: V ? 30 : 22}}>
          <Reveal at={30}>keystone-oc.vercel.app</Reveal>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: H - M - 30, textAlign: 'center', ...sans(V ? 24 : 22, 500), color: C.ink2, opacity: ease(f, 34, 12) * fade}}>
        Claude Impact Lab · UCI · Lane: Find it
      </div>
    </AbsoluteFill>
  );
};
