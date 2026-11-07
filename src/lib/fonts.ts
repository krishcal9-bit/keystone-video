import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Fraunces + Public Sans, the Google Fonts variable files (latin subset), self-hosted in
 * public/fonts so renders never depend on network access from the headless browser.
 * Variable Fraunces lets weight animate 300 → 600 and exposes the SOFT and opsz axes.
 */
export const SERIF = 'Fraunces';
export const SANS = 'Public Sans';

const load = (family: string, file: string) => {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return;
  const handle = delayRender(`font ${family}`);
  const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {weight: '100 900', style: 'normal'});
  face
    .load()
    .then(() => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(face);
      continueRender(handle);
    })
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
};
load(SERIF, 'fonts/Fraunces-Variable-latin.woff2');
load(SANS, 'fonts/PublicSans-Variable-latin.woff2');

/** Fraunces display settings: semibold, slightly soft, tight tracking. */
export const serif = (size: number, weight = 600, soft = 50) => ({
  fontFamily: SERIF,
  fontSize: size,
  fontWeight: weight,
  fontVariationSettings: `"SOFT" ${soft}, "WONK" 0, "opsz" ${Math.min(144, Math.max(9, size))}`,
  letterSpacing: size >= 72 ? '-0.03em' : '-0.02em',
  lineHeight: 1.04,
});

export const sans = (size: number, weight = 500) => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: size >= 40 ? '-0.01em' : '0em',
  lineHeight: 1.25,
});
