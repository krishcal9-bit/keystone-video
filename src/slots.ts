import manifest from './shots.generated.json';

export type SlotId =
  | 'law-lot'
  | 'intro-logo'
  | 'site-finder'
  | 'lot-scan'
  | 'plan-studio'
  | 'pitch-kit'
  | 'search-vs-wait';

/** A camera key: look at (x, y) in normalized screen coords with a zoom factor, starting at frame `at`. */
export type ZoomKey = {at: number; x: number; y: number; scale: number};

export type SlotConfig = {
  title: string;
  /** Seconds to skip at the head of a clip (trim). */
  trimStartSec?: number;
  /** How media sits in the 16:10 frame. */
  fit?: 'cover' | 'contain';
  /** Targeted zooms (frames relative to the shot start). Tune once real footage exists. */
  zooms: ZoomKey[];
};

export const SLOTS: Record<SlotId, SlotConfig> = {
  'law-lot': {title: 'Church parking lot filling with homes', zooms: []},
  'intro-logo': {title: 'App intro arch / keystone title card', zooms: []},
  'site-finder': {title: 'OC map, parcels filtering to eligible', zooms: [{at: 46, x: 0.66, y: 0.46, scale: 1.18}]},
  'lot-scan': {title: 'Polygons tracing over satellite image', zooms: [{at: 6, x: 0.42, y: 0.6, scale: 1.16}]},
  'plan-studio': {
    title: 'Townhomes building row by row in 3D',
    // targeted zoom into the parking slider, then ease back out to the homes
    zooms: [
      {at: 10, x: 0.17, y: 0.66, scale: 1.32},
      {at: 52, x: 0.6, y: 0.5, scale: 1.06},
    ],
  },
  'pitch-kit': {title: 'Letter writing itself in Spanish', zooms: [{at: 26, x: 0.6, y: 0.42, scale: 1.14}]},
  'search-vs-wait': {title: 'Searching vs. waiting comparison', zooms: []},
};

export type ShotMedia = {
  file: string;
  type: 'video' | 'image';
  durationSec?: number;
  width?: number;
  height?: number;
};

export const getShot = (id: SlotId): ShotMedia | null =>
  ((manifest as Record<string, ShotMedia>)[id] ?? null);
