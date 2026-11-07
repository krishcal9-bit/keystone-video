/**
 * Beat-synced storyboard. Pure (no Remotion imports) so Node scripts (music, capture) share it.
 *
 * With music: the grid comes from src/music.generated.json (tempo + phase detected by scripts/music.ts;
 * the trimmed track always starts on a downbeat). Without music: a silent 120 BPM grid (15 frames per beat).
 * Every shot boundary is snapped to the nearest beat; the keystone lock and the end card land on downbeats.
 */
import music from '../music.generated.json';

export const FPS = 30;
export const TOTAL = 900; // 30.0 s

type Music = {present: boolean; bpm?: number; phaseSec?: number; barPhase?: number};
const M = music as Music;

export const HAS_MUSIC = !!M.present;
export const BPM = HAS_MUSIC ? (M.bpm as number) : 120;
/** Frames per beat (may be fractional with real music). */
export const BEAT = (60 / BPM) * FPS;
const PHASE = HAS_MUSIC ? (M.phaseSec ?? 0) * FPS : 0;
const BAR_PHASE = HAS_MUSIC ? (M.barPhase ?? 0) : 0;

/** Nearest grid frame (div = subdivisions per beat: 1 beat, 2 eighths, 4 sixteenths). */
export const nearestBeat = (frame: number, div = 1) => {
  const step = BEAT / div;
  return Math.round(PHASE + Math.round((frame - PHASE) / step) * step);
};
/** Nearest downbeat (beat 1 of a 4/4 bar) to `frame`, restricted to [lo, hi] when possible. */
export const nearestDownbeat = (frame: number, lo = -Infinity, hi = Infinity) => {
  const bar = BEAT * 4;
  const origin = PHASE + BAR_PHASE * BEAT;
  const k = Math.round((frame - origin) / bar);
  const cands = [k - 1, k, k + 1].map((i) => Math.round(origin + i * bar)).filter((f) => f >= lo && f <= hi);
  if (cands.length === 0) return Math.min(hi, Math.max(lo, nearestBeat(frame)));
  return cands.sort((a, b) => Math.abs(a - frame) - Math.abs(b - frame))[0];
};

/** A reveal `nominal` frames into a shot starting at `from`, snapped to the grid (scene-relative result). */
export const rel = (from: number, nominal: number, div = 1, min = 0) => Math.max(min, nearestBeat(from + nominal, div) - from);

// Nominal storyboard (seconds) → frames, then snapped.
const NOMINAL = {hook: 0, cost: 2.5, luck: 5.5, law: 8.0, logo: 10.5, find: 12.5, measure: 16.0, design: 19.0, pitch: 22.5, payoff: 25.0, end: 27.5};
type Key = keyof typeof NOMINAL;
const keys = Object.keys(NOMINAL) as Key[];
const starts: Record<Key, number> = {} as Record<Key, number>;
keys.forEach((k) => {
  starts[k] = k === 'hook' ? 0 : nearestBeat(NOMINAL[k] * FPS);
});
// End card on a strong downbeat (with music), leaving it 1.7–3.2 s on screen. Silent: the storyboard's 27.5 s.
if (HAS_MUSIC) starts.end = nearestDownbeat(NOMINAL.end * FPS, TOTAL - 96, TOTAL - 50);

export const SHOT = Object.fromEntries(
  keys.map((k, i) => {
    const from = starts[k];
    const to = i < keys.length - 1 ? starts[keys[i + 1]] : TOTAL;
    return [k, {from, dur: to - from}];
  }),
) as Record<Key, {from: number; dur: number}>;

/** Logo: the keystone's contact ("lock") lands on a downbeat ~0.8 s into the logo shot. */
export const LOGO_LOCK = nearestDownbeat(SHOT.logo.from + 24, SHOT.logo.from + 16, SHOT.logo.from + 32) - SHOT.logo.from;
/** Zoom-through into Find starts 11 frames before the Find cut. */
export const ZOOM_DUR = 15;
export const ZOOM_START = SHOT.logo.dur - 11;

/** Frames (absolute) of the brand transitions, used for the optional whoosh layer. */
export const TRANSITION_PEAKS = {
  wipe: SHOT.law.from, // pine bar crosses the cut
  zoom: SHOT.logo.from + ZOOM_START + 8,
  payoff: SHOT.payoff.from + rel(SHOT.payoff.from, 8),
};

/**
 * On-screen length (frames) of each app-footage slot, shared by the scenes and scripts/capture.ts.
 * law-lot starts 2 frames into the law scene, which itself leads its cut by 6 (pine wipe);
 * site-finder leads its cut by the zoom-through; search-vs-wait enters 30 frames into the payoff;
 * intro-logo overlays the logo until just before the zoom-through.
 */
export const LAW_LEAD = 6;
export const SLOT_FRAMES = {
  'intro-logo': ZOOM_START - 2,
  'law-lot': SHOT.law.dur + LAW_LEAD - 2,
  'site-finder': SHOT.find.dur + (SHOT.find.from - (SHOT.logo.from + ZOOM_START)),
  'lot-scan': SHOT.measure.dur,
  'plan-studio': SHOT.design.dur,
  'pitch-kit': SHOT.pitch.dur,
  'search-vs-wait': SHOT.payoff.dur - 30,
} as const;

/** Absolute film frame at which frame 0 of each slot's clip is on screen. */
export const SLOT_ORIGIN = {
  'intro-logo': SHOT.logo.from,
  'law-lot': SHOT.law.from - LAW_LEAD + 2,
  'site-finder': SHOT.logo.from + ZOOM_START,
  'lot-scan': SHOT.measure.from,
  'plan-studio': SHOT.design.from,
  'pitch-kit': SHOT.pitch.from,
  'search-vs-wait': SHOT.payoff.from + 30,
} as const;

/**
 * Where a clip's key moment (a click, homes rising…) should sit, as a frame inside the clip:
 * the nearest strong beat (downbeat if one is within 8 frames) to `fraction` of the slot.
 */
export const keyFrameFor = (id: keyof typeof SLOT_FRAMES, fraction = 0.38) => {
  const origin = SLOT_ORIGIN[id];
  const len = SLOT_FRAMES[id];
  const want = origin + len * fraction;
  const down = nearestDownbeat(want, want - 8, want + 8);
  const beat = Math.abs(down - want) <= 8 ? down : nearestBeat(want);
  return Math.min(len - 6, Math.max(6, beat - origin));
};
