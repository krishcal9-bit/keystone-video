import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

/** Subtle film grain (≈2.5%) refreshed at 15 fps, plus a very soft vignette. */
export const FilmFinish: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const seed = Math.floor(frame / 2) % 24;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          // soft edge darkening only (no color shift); kept extremely light
          background: 'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(24,36,32,0) 62%, rgba(24,36,32,0.055) 100%)',
        }}
      />
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.5}}>
        <filter id={`grain${seed}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0.11 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
