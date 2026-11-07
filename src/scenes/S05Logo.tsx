import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../lib/brand';
import {serif} from '../lib/fonts';
import {ease, LOGO_LOCK, mix, rel, settle, SHOT, ZOOM_DUR, ZOOM_START} from '../lib/motion';
import {useL} from '../lib/layout';
import {STONES} from '../components/Arch';
import {Reveal} from '../components/Type';
import {Wordmark} from '../components/Wordmark';
import {getShot} from '../slots';

/** Arch placement shared with the zoom-through transition. */
export const useArchGeom = () => {
  const {W, V} = useL();
  return {cx: W / 2, cy: V ? 760 : 405, k: V ? 1.9 : 1.7};
};

/** Zoom-through: the arch scales about its opening; the next scene shows through it (timing in lib/timeline). */
export {ZOOM_DUR, ZOOM_START};
export const zoomScale = (f: number) => Math.exp(Math.log(18) * ease(f, ZOOM_START, ZOOM_DUR) ** 1.4);
/** Arch-space point the camera flies through (inside the opening). */
export const ZOOM_FOCUS = {x: 0, y: 14};

/** 10.5–12.5 s — the arch assembles stone by stone; the brass keystone drops in and locks. */
export const S05Logo: React.FC = () => {
  const f = useCurrentFrame();
  const {V} = useL();
  const g = useArchGeom();
  const intro = getShot('intro-logo');
  // the keystone makes contact on a musical downbeat (LOGO_LOCK); the settle spring touches down ~7 frames after release
  const lock = LOGO_LOCK;
  const KEY_AT = lock - 7;
  const WORD_AT = Math.min(rel(SHOT.logo.from, 22, 2), ZOOM_START - 26);
  const TAG_AT = Math.min(rel(SHOT.logo.from, 28, 2), ZOOM_START - 20);
  const glow = ease(f, lock, 20);
  const z = zoomScale(f);
  // zoom about the focus point
  const fx = g.cx + ZOOM_FOCUS.x * g.k;
  const fy = g.cy + ZOOM_FOCUS.y * g.k;
  const textOut = ease(f, ZOOM_START - 4, 7);
  const bump = 1 + 0.012 * Math.sin(Math.min(1, Math.max(0, (f - lock) / 8)) * Math.PI);

  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${fx}px ${fy}px`, transform: `scale(${z})`}}>
        <svg
          width={216 * g.k}
          height={200 * g.k}
          viewBox="-108 -122 216 200"
          style={{position: 'absolute', left: g.cx - 108 * g.k, top: g.cy - 122 * g.k, overflow: 'visible', transform: `scale(${bump})`, transformOrigin: '50% 61%'}}
        >
          <defs>
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="archShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <ellipse cx={4} cy={80} rx={118} ry={7} fill={C.ink} opacity={0.1 * ease(f, 0, 20)} filter="url(#archShadow)" />
          {STONES.map((s) => {
            if (s.key) return null;
            const at = s.order * 2.6 + (s.nx < 0 ? 0 : 1) - 4;
            const t = settle(f, at);
            const d = 60 * (1 - t);
            return (
              <g key={s.id} transform={`translate(${s.nx * d} ${s.ny * d})`} opacity={Math.min(1, Math.max(0, (f - at) / 5))}>
                <path d={s.d} fill={s.fill} />
              </g>
            );
          })}
          {(() => {
            const key = STONES.find((s) => s.key)!;
            const t = settle(f, KEY_AT);
            const dy = -90 * (1 - t);
            return (
              <g transform={`translate(0 ${dy})`} opacity={Math.min(1, Math.max(0, (f - KEY_AT) / 4))}>
                {/* soft lock glow */}
                <path d={key.d} fill={C.brass} filter="url(#glow)" opacity={f >= lock ? 0.85 * (1 - glow) : 0} transform={`scale(${1 + glow * 0.5})`} style={{transformOrigin: '0px -86px', transformBox: 'view-box'}} />
                <path d={key.d} fill={C.brass} fillRule="evenodd" />
              </g>
            );
          })()}
        </svg>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: g.cy + (V ? 210 : 175), textAlign: 'center', opacity: 1 - textOut}}>
        <Reveal at={WORD_AT} pad={V ? 50 : 44}>
          <Wordmark size={V ? 150 : 132} notch={ease(f, WORD_AT + 8, 10)} />
        </Reveal>
        <div style={{...serif(V ? 50 : 46, 400, 50), color: C.ink2, marginTop: V ? 30 : 22, letterSpacing: '-0.01em'}}>
          <Reveal at={TAG_AT}>Homeownership that holds.</Reveal>
        </div>
      </div>
      {intro && f < ZOOM_START - 2 && (
        <AbsoluteFill style={{opacity: Math.min(ease(f, 0, 6), 1 - ease(f, ZOOM_START - 10, 8)), background: C.paper}}>
          {intro.type === 'video' ? (
            <OffthreadVideo src={staticFile(intro.file)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          ) : (
            <Img src={staticFile(intro.file)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** Clip path (screen space) of the arch opening at frame f, for the zoom-through. */
export const openingPath = (f: number, g: {cx: number; cy: number; k: number}) => {
  const z = zoomScale(f);
  const fx = g.cx + ZOOM_FOCUS.x * g.k;
  const fy = g.cy + ZOOM_FOCUS.y * g.k;
  const P = (ax: number, ay: number): [number, number] => [fx + (g.cx + ax * g.k - fx) * z, fy + (g.cy + ay * g.k - fy) * z];
  const ri = 60 - 1.6;
  const [lx, ly] = P(-ri, 0);
  const [rx, ry] = P(ri, 0);
  const [lbx, lby] = P(-ri, 78);
  const [rbx, rby] = P(ri, 78);
  const rad = ri * g.k * z;
  return `path('M ${lbx} ${lby} L ${lx} ${ly} A ${rad} ${rad} 0 0 1 ${rx} ${ry} L ${rbx} ${rby} Z')`;
};
