import React from 'react';
import {interpolate} from 'remotion';
import {C} from '../lib/brand';
import {SANS, serif} from '../lib/fonts';
import {EASE, ease, mix} from '../lib/motion';

/**
 * "Finding land is luck": a calendar flipping slowly, one envelope arriving from a city,
 * a Habitat worker waiting. Muted palette, slow pacing. Drawn at 900×760.
 */
const MONTHS = ['March', 'April', 'May', 'June', 'July'];
const FLIPS = [6, 26, 46]; // page flips every ~0.67 s, slow
const FLIP_DUR = 14;

const CalendarPage: React.FC<{month: string; crossed: number}> = ({month, crossed}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: C.surface,
      borderRadius: '0 0 8px 8px',
      padding: '26px 26px',
      boxSizing: 'border-box',
      backfaceVisibility: 'hidden',
    }}
  >
    <div style={{...serif(36, 600), color: C.ink}}>{month}</div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 20}}>
      {Array.from({length: 35}, (_, i) => (
        <div key={i} style={{position: 'relative', height: 22, borderRadius: 4, background: i < 3 ? 'transparent' : '#EEF1EE'}}>
          {i >= 3 && i < crossed && (
            <svg width="100%" height="22" viewBox="0 0 22 22" style={{position: 'absolute', inset: 0}}>
              <path d="M6,6 L16,16 M16,6 L6,16" stroke={C.ink2} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
            </svg>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const LuckVignette: React.FC<{f: number; scale?: number}> = ({f, scale = 1}) => {
  // envelope: one letter drifting in slowly from the top right, then into the mailbox
  const env = interpolate(f, [18, 54], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE});
  const ex = mix(980, 662, env);
  const ey = mix(-280, 300, env) + Math.sin(env * Math.PI) * -40;
  const er = mix(-16, 0, env);
  const sink = ease(f, 54, 14); // drop behind the mailbox front
  const flag = ease(f, 60, 10);
  const breathe = Math.sin((f / 30) * Math.PI * 0.9) * 1.6;
  const look = mix(0, -5, ease(f, 30, 30));
  const page = FLIPS.filter((t) => f >= t + FLIP_DUR).length;
  const flipping = FLIPS.findIndex((t) => f >= t && f < t + FLIP_DUR);
  const flipT = flipping >= 0 ? ease(f, FLIPS[flipping], FLIP_DUR) : 0;

  return (
    <div style={{position: 'relative', width: 900, height: 760, transform: `scale(${scale})`, transformOrigin: '0 0'}}>
      {/* stage */}
      <svg width={900} height={760} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <filter id="lvSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <ellipse cx={460} cy={720} rx={430} ry={26} fill={C.ink} opacity={0.08} filter="url(#lvSoft)" />
        <rect x={60} y={40} width={780} height={580} rx={8} fill="#ECEFEC" />
        <rect x={60} y={590} width={780} height={30} fill="#E2E6E2" />
        <polygon points="40,620 860,620 890,690 10,690" fill="#E4E8E4" />
        <rect x={10} y={690} width={880} height={20} rx={3} fill="#D3D9D5" />
      </svg>

      {/* calendar */}
      <div style={{position: 'absolute', left: 120, top: 104, width: 300, height: 330}}>
        <div style={{position: 'absolute', left: 145, top: -14, width: 10, height: 10, borderRadius: 99, background: C.ink2}} />
        <div style={{position: 'absolute', inset: 0, top: 0, boxShadow: '0 2px 4px rgba(24,36,32,0.08), 0 14px 30px rgba(24,36,32,0.10)', borderRadius: 8}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 30, bottom: 0, perspective: 900}}>
          {/* page underneath (next month) */}
          <CalendarPage month={MONTHS[Math.min(page + 1, MONTHS.length - 1)]} crossed={3} />
          {/* current page, flipping up over the binding */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '50% 0%',
              transform: `rotateX(${flipT * 172}deg)`,
              opacity: flipT > 0.55 ? 0 : 1,
            }}
          >
            <CalendarPage month={MONTHS[page]} crossed={38} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 34, background: C.ink2, borderRadius: '8px 8px 0 0'}}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{position: 'absolute', left: 40 + i * 55, top: -6, width: 8, height: 20, borderRadius: 4, background: '#C2C9C5'}} />
          ))}
        </div>
      </div>

      <svg width={900} height={760} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* envelope (behind the mailbox front) */}
        <g transform={`translate(${ex} ${ey + sink * 70}) rotate(${er})`} opacity={1}>
          <rect x={-62} y={-40} width={124} height={80} rx={6} fill={C.ink} opacity={0.1} transform="translate(5 8)" />
          <rect x={-62} y={-40} width={124} height={80} rx={6} fill={C.surface} />
          <path d="M-62,-36 L0,6 L62,-36" fill="none" stroke={C.line} strokeWidth={2.5} />
          <circle cx={0} cy={8} r={9} fill={C.pine} />
          <text x={-50} y={30} fontFamily={SANS} fontSize={11} fontWeight={600} fill={C.ink2}>
            City Hall
          </text>
        </g>
        {/* mailbox: post, box, flag */}
        <rect x={686} y={440} width={22} height={190} fill="#5D6A66" />
        <rect x={697} y={440} width={11} height={190} fill="#4A5753" />
        <path d="M612,450 L612,380 A50,50 0 0 1 712,380 L712,450 Z" fill="#9FB3AA" />
        <path d="M712,450 L712,380 A50,50 0 0 1 782,380 L782,450 Z" fill="#879D93" />
        <path d="M612,380 A50,50 0 0 1 712,380" fill="none" stroke="#B9C9C2" strokeWidth={6} />
        <rect x={612} y={446} width={170} height={10} fill="#788D84" />
        <rect x={632} y={372} width={60} height={6} rx={3} fill="#5D6A66" />
        <g transform={`rotate(${mix(0, -80, flag)} 772 432)`}>
          <rect x={768} y={392} width={8} height={44} fill={C.ink2} />
          <rect x={768} y={392} width={30} height={18} fill={C.ink2} />
        </g>

        {/* worker, waiting */}
        <g transform={`translate(0 ${breathe * 0.4})`}>
          <ellipse cx={462} cy={640} rx={80} ry={14} fill={C.ink} opacity={0.1} filter="url(#lvSoft)" />
          {/* legs */}
          <rect x={430} y={500} width={30} height={136} rx={12} fill="#55625E" />
          <rect x={466} y={500} width={30} height={136} rx={12} fill="#45524E" />
          <rect x={422} y={622} width={42} height={16} rx={8} fill={C.ink} />
          <rect x={462} y={622} width={42} height={16} rx={8} fill={C.ink} />
          {/* torso */}
          <g transform={`translate(0 ${breathe})`}>
            <rect x={414} y={350} width={98} height={170} rx={30} fill="#8DAF9F" />
            <path d="M463,350 L482,350 A30,30 0 0 1 512,380 L512,490 A30,30 0 0 1 482,520 L463,520 Z" fill="#7A9C8C" />
            {/* arms + clipboard */}
            <rect x={398} y={372} width={26} height={120} rx={13} fill="#7FA191" />
            <rect x={502} y={372} width={26} height={110} rx={13} fill="#6F9080" transform="rotate(-18 515 380)" />
            <rect x={440} y={430} width={66} height={84} rx={6} fill="#E4E9E5" transform="rotate(-6 470 470)" />
            <rect x={449} y={448} width={46} height={5} rx={2} fill={C.line} transform="rotate(-6 470 470)" />
            <rect x={449} y={462} width={38} height={5} rx={2} fill={C.line} transform="rotate(-6 470 470)" />
            <circle cx={506} cy={470} r={13} fill={C.skin} />
            {/* head + hard hat */}
            <g transform={`rotate(${look} 463 320)`}>
              <rect x={452} y={316} width={22} height={40} rx={8} fill={C.skinShade} />
              <circle cx={463} cy={298} r={36} fill={C.skin} />
              <path d="M463,262 A36,36 0 0 1 463,334 A26,36 0 0 0 463,262 Z" fill={C.skinShade} opacity={0.6} />
              <path d="M423,288 A40,38 0 0 1 503,288 Z" fill="#F1F3F1" />
              <path d="M466,250 A40,38 0 0 1 503,288 L478,288 Z" fill="#D6DCD8" />
              <rect x={414} y={284} width={98} height={10} rx={5} fill="#E1E6E2" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
