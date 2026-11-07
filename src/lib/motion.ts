import {Easing, interpolate, spring} from 'remotion';

/**
 * Timing tokens. The storyboard lives in ./timeline (beat-synced to the music when present,
 * otherwise a silent 120 BPM grid). Re-exported here for scenes.
 */
export {BEAT, BPM, FPS, HAS_MUSIC, LAW_LEAD, LOGO_LOCK, nearestBeat, rel, SHOT, SLOT_FRAMES, TOTAL, ZOOM_DUR, ZOOM_START} from './timeline';
import {BEAT} from './timeline';
export const HALF = BEAT / 2;
export const b = (beats: number) => Math.round(beats * BEAT);

/** House easing: cubic-bezier(0.23, 1, 0.32, 1). Never ease-in. */
export const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** Durations (frames). Big objects 400–700 ms, small UI 150–250 ms, exits ~30% faster. */
export const D = {
  big: 18, // 600 ms
  bigShort: 14, // 467 ms
  small: 6, // 200 ms
  exitBig: 12, // ~30% faster than big
  exitSmall: 4,
  text: 16, // masked line reveal
} as const;

/** 0→1 progress with house easing. */
export const ease = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE,
  });

/** Linear clamped 0→1 progress (for camera drifts). */
export const lin = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const mix = (a: number, b2: number, t: number) => a + (b2 - a) * t;

/** Gentle settle spring for big objects (overshoot ≈ 4–6%, bounce < 0.15). */
export const SETTLE = {damping: 17, stiffness: 140, mass: 1};
/** Critically damped spring for camera moves. */
export const CAMERA = {damping: 30, stiffness: 60, mass: 1.2};

export const settle = (frame: number, start: number, fps = 30, config = SETTLE) =>
  spring({frame: frame - start, fps, config});

export const camera = (frame: number, start: number, fps = 30) =>
  spring({frame: frame - start, fps, config: CAMERA});
