// Brand tokens. Matched to the Keystone app.
export const C = {
  paper: '#F6F7F5',
  surface: '#FFFFFF',
  ink: '#182420',
  ink2: '#4A5753',
  line: '#DDE3DF',
  pine: '#1E5C47',
  pineSoft: '#E4EFEA',
  brass: '#B8862B', // keys, the keystone, "unlocked" moments only
  signal: '#B3362B', // the gap only

  // Derived tones (2–3 per object, single top-left light). Not new hues:
  // tints/shades of the palette above, used by illustrations and cost-bar segments.
  pineDeep: '#174A39',
  pineLight: '#2E7A60',
  pineMist: '#C7DAD1',
  pineMist2: '#A9C4B8',
  pineMist3: '#8DAF9F',
  brassLight: '#D0A04A',
  brassDeep: '#94691D',
  stone: '#E9ECE9',
  stoneShade: '#D3D9D5',
  skin: '#C79A78',
  skinShade: '#A97F60',
  window: '#E6B85C', // warm brass window light
} as const;

export const SHADOW = {
  // soft layered shadow for floating UI (browser frame)
  frame:
    '0 1px 2px rgba(24,36,32,0.06), 0 6px 16px rgba(24,36,32,0.06), 0 24px 48px rgba(24,36,32,0.08), 0 48px 96px rgba(24,36,32,0.06)',
  small: '0 1px 2px rgba(24,36,32,0.08), 0 6px 18px rgba(24,36,32,0.08)',
};

export const SAFE = 96; // px safe margin (1920×1080 and 1080×1920)
