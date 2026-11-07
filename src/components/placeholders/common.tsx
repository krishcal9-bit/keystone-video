import React from 'react';
import {C} from '../../lib/brand';
import {SANS, serif} from '../../lib/fonts';
import {ArchIcon} from '../Arch';

/** Placeholder virtual canvas: every screen is drawn at 1600×1000 then scaled into the frame. */
export const VW = 1600;
export const VH = 1000;
export const HEADER = 64;

export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type ScreenProps = {f: number; dur: number};

const NAV = ['Site Finder', 'Lot Scan', 'Plan Studio', 'Pitch Kit'];

export const AppHeader: React.FC<{active?: string}> = ({active}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: VW,
      height: HEADER,
      background: C.surface,
      borderBottom: `1px solid ${C.line}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 12,
    }}
  >
    <ArchIcon size={30} />
    <span style={{...serif(25, 600, 50), color: C.ink, marginRight: 36}}>Keystone</span>
    {NAV.map((n) => (
      <div
        key={n}
        style={{
          fontFamily: SANS,
          fontWeight: n === active ? 600 : 500,
          fontSize: 17,
          color: n === active ? C.pine : C.ink2,
          background: n === active ? C.pineSoft : 'transparent',
          padding: '8px 16px',
          borderRadius: 999,
        }}
      >
        {n}
      </div>
    ))}
    <div style={{flex: 1}} />
    <Bar w={120} h={12} />
    <div style={{width: 34, height: 34, borderRadius: 99, background: C.pineSoft, border: `1px solid ${C.line}`}} />
  </div>
);

export const Bar: React.FC<{w: number; h?: number; color?: string; style?: React.CSSProperties}> = ({w, h = 14, color = C.line, style}) => (
  <div style={{width: Math.max(0, w), height: h, borderRadius: 999, background: color, ...style}} />
);

export const Card: React.FC<{x: number; y: number; w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({
  x,
  y,
  w,
  h,
  children,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      background: C.surface,
      borderRadius: 16,
      border: `1px solid ${C.line}`,
      boxShadow: '0 1px 2px rgba(24,36,32,0.04), 0 8px 24px rgba(24,36,32,0.05)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties}> = ({
  children,
  size = 16,
  color = C.ink2,
  weight = 600,
  style,
}) => <div style={{fontFamily: SANS, fontSize: size, fontWeight: weight, color, ...style}}>{children}</div>;

export const Title: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 32}) => (
  <div style={{...serif(size, 600, 50), color: C.ink}}>{children}</div>
);

export const Chip: React.FC<{children: React.ReactNode; on?: number}> = ({children, on = 0}) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 600,
      fontSize: 16,
      padding: '9px 16px',
      borderRadius: 999,
      border: `1.5px solid ${on > 0.5 ? C.pine : C.line}`,
      background: on > 0.5 ? C.pine : C.surface,
      color: on > 0.5 ? C.surface : C.ink2,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);
