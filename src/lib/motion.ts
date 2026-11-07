import {Easing, interpolate, spring} from 'remotion';

/**
 * Timing tokens.
 * The film runs on a silent 120 BPM grid: 1 beat = 0.5 s = 15 frames at 30 fps.
 * Every cut and every headline/caption reveal lands on a beat or half-beat.
 */
export const FPS = 30;
export const BPM = 120;
export const BEAT = (60 / BPM) * FPS; // 15 frames
export const HALF = BEAT / 2; // 7.5 frames
export const b = (beats: number) => Math.round(beats * BEAT);

/** Storyboard, in frames. Every boundary is a whole number of beats. */
export const SHOT = {
  hook: {from: 0, dur: b(5)}, // 0.0–2.5
  cost: {from: b(5), dur: b(6)}, // 2.5–5.5
  luck: {from: b(11), dur: b(5)}, // 5.5–8.0
  law: {from: b(16), dur: b(5)}, // 8.0–10.5
  logo: {from: b(21), dur: b(4)}, // 10.5–12.5
  find: {from: b(25), dur: b(7)}, // 12.5–16.0
  measure: {from: b(32), dur: b(6)}, // 16.0–19.0
  design: {from: b(38), dur: b(7)}, // 19.0–22.5
  pitch: {from: b(45), dur: b(5)}, // 22.5–25.0
  payoff: {from: b(50), dur: b(5)}, // 25.0–27.5
  end: {from: b(55), dur: b(5)}, // 27.5–30.0
} as const;
export const TOTAL = b(60); // 900 frames = 30.0 s

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

export const settle = (frame: number, start: number, fps = FPS, config = SETTLE) =>
  spring({frame: frame - start, fps, config});

export const camera = (frame: number, start: number, fps = FPS) =>
  spring({frame: frame - start, fps, config: CAMERA});
