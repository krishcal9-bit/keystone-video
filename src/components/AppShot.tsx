import React from 'react';
import {Img, Loop, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, SHADOW} from '../lib/brand';
import {SANS} from '../lib/fonts';
import {camera, ease, lin, mix} from '../lib/motion';
import {getShot, SLOTS, SlotId, ZoomKey} from '../slots';
import {Placeholder, VW, VH} from './placeholders';
import {CursorTrack} from './CursorTrack';

type Props = {
  id: SlotId;
  /** Frame width in px (chrome + content). Content is 16:10. */
  width: number;
  left: number;
  top: number;
  /** Shot length in frames (fixed by the storyboard). */
  dur: number;
  /** Frame-level push-in (camera dolly). */
  push?: [number, number];
  /** Override the slot's targeted zooms. */
  zooms?: ZoomKey[];
  /** Entrance on the first frames: 'rise' fades + rises (first appearance), 'cut' is a hard cut with a soft settle, false = none. */
  enter?: 'rise' | 'cut' | false;
  /** Delay (frames) before the screen's own timeline starts. */
  delay?: number;
  style?: React.CSSProperties;
};

export const chromeHeight = (width: number) => Math.round(width * 0.036);
export const shotHeight = (width: number) => chromeHeight(width) + Math.round((width * 10) / 16);

export const AppShot: React.FC<Props> = ({id, width, left, top, dur, push = [1, 1.03], zooms, enter = 'rise', delay = 0, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame - delay;
  const media = getShot(id);
  const slot = SLOTS[id];
  const chromeH = chromeHeight(width);
  const cw = width;
  const ch = Math.round((width * 10) / 16);
  const k = cw / VW; // virtual → content px

  // Entrance: rise + settle, opacity fast. Never scale from 0.
  const tIn = enter ? ease(frame, 0, 20) : 1;
  const frameScale = mix(push[0], push[1], lin(frame, 0, dur)) * mix(enter === 'cut' ? 0.99 : 0.975, 1, tIn);
  const rise = mix(enter === 'cut' ? 10 : 36, 0, tIn);
  const opacity = enter === 'rise' ? ease(frame, 0, 8) : 1;

  // Content camera: slow push 1.0 → 1.05 plus targeted spring zooms.
  // Real captures carry their own zoom plan (aimed at the logged click points), in clip frames.
  const meta = media?.meta;
  const zf = meta ? frame : f;
  let lx = 0.5;
  let ly = 0.5;
  let s = 1;
  for (const z of zooms ?? meta?.zooms ?? slot.zooms) {
    const p = camera(zf, z.at, fps);
    lx = mix(lx, z.x, p);
    ly = mix(ly, z.y, p);
    s = mix(s, z.scale, p);
  }
  s *= mix(1, 1.05, lin(frame, 0, dur));
  // keep the viewport inside the screen
  const half = 0.5 / s;
  lx = Math.min(1 - half, Math.max(half, lx));
  ly = Math.min(1 - half, Math.max(half, ly));
  const tx = cw / 2 - lx * cw * s;
  const ty = ch / 2 - ly * ch * s;

  let inner: React.ReactNode;
  if (media) {
    const fit = slot.fit ?? 'cover';
    if (media.type === 'image') {
      inner = <Img src={staticFile(media.file)} style={{width: cw, height: ch, objectFit: fit, objectPosition: 'top center', display: 'block'}} />;
    } else {
      const clipFrames = Math.max(1, Math.floor(((media.durationSec ?? dur / fps) - (slot.trimStartSec ?? 0)) * fps));
      // Clip longer than the slot by ≤35%: speed-ramp to fit. Much longer: trim. Shorter: loop.
      const rate = clipFrames > dur && clipFrames <= dur * 1.35 ? clipFrames / dur : 1;
      const video = (
        <OffthreadVideo
          src={staticFile(media.file)}
          muted
          playbackRate={rate}
          startFrom={Math.round((slot.trimStartSec ?? 0) * fps)}
          style={{width: cw, height: ch, objectFit: fit, objectPosition: 'top center', display: 'block'}}
        />
      );
      inner = clipFrames * (1 / rate) < dur ? <Loop durationInFrames={Math.floor(clipFrames / rate)}>{video}</Loop> : video;
    }
    if (meta) {
      inner = (
        <div style={{position: 'relative', width: cw, height: ch}}>
          {inner}
          <CursorTrack frame={frame} meta={meta} w={cw} h={ch} />
        </div>
      );
    }
  } else {
    inner = (
      <div style={{width: VW, height: VH, transform: `scale(${k})`, transformOrigin: '0 0'}}>
        <Placeholder id={id} f={f} dur={dur} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        opacity,
        transform: `translateY(${rise}px) scale(${frameScale})`,
        transformOrigin: '50% 55%',
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          background: C.surface,
          boxShadow: SHADOW.frame,
          outline: `1px solid rgba(24,36,32,0.06)`,
        }}
      >
        <BrowserChrome width={width} height={chromeH} />
        <div style={{position: 'relative', width: cw, height: ch, overflow: 'hidden', background: C.pineSoft}}>
          <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
            {inner}
          </div>
          {!media && <FootageTag id={id} width={width} />}
        </div>
      </div>
    </div>
  );
};

const BrowserChrome: React.FC<{width: number; height: number}> = ({width, height}) => {
  const dot = Math.max(8, Math.round(height * 0.24));
  const urlW = Math.round(width * 0.3);
  return (
    <div
      style={{
        height,
        background: C.surface,
        borderBottom: `1px solid ${C.line}`,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        paddingLeft: Math.round(height * 0.42),
        gap: Math.round(dot * 0.7),
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: dot, height: dot, borderRadius: 99, background: C.line}} />
      ))}
      <div
        style={{
          position: 'absolute',
          left: (width - urlW) / 2,
          top: height * 0.2,
          width: urlW,
          height: height * 0.6,
          borderRadius: 999,
          background: C.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: Math.round(height * 0.32),
          color: C.ink2,
          letterSpacing: '0.005em',
        }}
      >
        keystone-oc.vercel.app
      </div>
    </div>
  );
};

const FootageTag: React.FC<{id: string; width: number}> = ({id, width}) => {
  const fs = Math.max(13, Math.round(width * 0.0115));
  return (
    <div
      style={{
        position: 'absolute',
        right: fs * 1.1,
        bottom: fs * 1.1,
        padding: `${fs * 0.42}px ${fs * 0.8}px`,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.92)',
        border: `1px solid ${C.line}`,
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: fs,
        color: C.ink2,
        display: 'flex',
        alignItems: 'center',
        gap: fs * 0.5,
      }}
    >
      <div style={{width: fs * 0.5, height: fs * 0.5, borderRadius: 99, background: C.pine}} />
      App footage: {id}
    </div>
  );
};
