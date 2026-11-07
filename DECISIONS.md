# Decisions log

## Timing
- 30 fps, 900 frames. Silent 120 BPM grid: 1 beat = 15 frames. Every storyboard boundary is a whole number of beats
  (5, 11, 16, 21, 25, 32, 38, 45, 50, 55, 60), and headline/caption reveals land on beats, half-beats or sixteenths
  (hook words at 16ths, then "hit" and "$0." on the beat). Tokens live in `src/lib/motion.ts`.
- House ease `cubic-bezier(0.23,1,0.32,1)` everywhere; one settle spring (damping 17 / stiffness 140, overshoot ≈ 5%)
  for big objects (arch stones, keystone, "$0", end-card icon, payoff shrink); a critically damped spring for camera zooms.
- Logo moment re-timed after review: stones every 2.6 frames, keystone lands at 0.57 s, so the tagline holds ~0.6 s
  before the zoom-through (it returns on the end card).

## Transitions (3 brand transitions, everything else is a hard cut)
1. Pine bar wipe, luck → law (the pivot). The law scene starts 6 frames early under the bar so content is arriving
   as the bar passes; the bar uses a CSS `ease` curve because the house ease made it jump across in 2 frames.
2. Masked shape zoom-through, logo → Find: the camera flies through the arch opening; the Find shot is clipped to the
   opening's exact path until it fills the frame.
3. Shared element: the cost bar component and geometry from 2.5 s return at 25 s; Land shrinks (and turns brass,
   the "unlocked" moment), the red gap closes.
- Step shots (Find → Measure → Design → Pitch) are hard cuts. Review showed the shared entrance fade made cut frames
  look washed out, so step shots now cut in at full opacity with only a 10 px settle.

## Brand
- Fraunces (variable, SOFT 50, opsz = size, 600, tight tracking) + Public Sans. These are the Google Fonts variable
  files, self-hosted in `public/fonts/` and loaded with `FontFace`. Reason: the headless renderer in this sandbox
  cannot reach fonts.gstatic.com, so `@remotion/google-fonts` timed out; self-hosting also makes renders reproducible.
- Weight animation 300 → 600 on key words: "$0.", "Land", "luck.", "by right.", "Start finding it.".
- Wordmark notch: the K glyph was measured (stem 0.10–0.24 em, cap top 0.16 em) and a tiny brass keystone is set
  into the top of the stem with a paper outline so it reads as a cut. First try (above the K) read like an accent mark.
- Brass is used only for the keystone, the wordmark notch, the "California SB 4" key bullet, and the payoff's
  partner-land segment/callout. Signal red only for "$0." and the gap.
- Illustration tones are tints/shades of the palette (pine mists, stone, brass window light); no gradients in any
  object. The only gradient-like pixels are the requested soft vignette (≤ 5.5% ink at the corners).
- Film grain: SVG fractal noise at ~2.5%, refreshed every 2 frames (15 fps) so it reads as film and keeps the
  H.264 bitrate sane (~24.5 MB per cut at CRF 18).

## Content and accuracy
- SB 4 took effect January 1, 2024. The brief said "in effect since July 2024", so on screen I only say "Since 2024" and
  the source line cites "California SB 4 (2023)" without a month. Please confirm before publishing.
- Stats ($1.47M, ~4 yrs, 34 cities) carry the source line "Claude Impact Lab challenge brief". Cost-bar proportions
  (Land 46%, family can pay 60%, partner land 6%) are modeled and labeled illustrative on both appearances.
- Placeholders show skeleton bars instead of numbers so nothing reads as real data. The only real words in them are
  UI labels (Site Finder, SB 4 eligible…) and the Spanish letter opening ("Estimada congregación: Gracias por
  recibirnos. Su terreno puede dar hogar a familias de nuestra comunidad.").

## Placeholders / footage
- `<AppShot id>` reads `src/shots.generated.json`, written by `scripts/scan-shots.mjs` (ffprobe for duration).
  Loop if short, speed-ramp if ≤ 35% long, otherwise trim.
- Camera: frame-level dolly (1.0 → 1.03, Design 1.07) times a content push (1.0 → 1.05) plus spring zooms
  (Find → selected parcel, Measure → the lot, Design → parking slider then back out, Pitch → the letter).
  Law-lot keeps a push only: a targeted zoom cropped its headline.
- Cursor ring with click ripples only on placeholders (real footage brings its own cursor).
- `intro-logo`, if supplied, is shown full frame over the built logo for ~1.5 s, then fades so the arch zoom-through
  still carries into Find.

## Vertical (1080×1920)
- Same scenes, re-laid out through `useL()`: three-line hook, stacked stats, horizontal progress rail on top,
  shot centered with caption below, end-card line split in two.

## Not done / follow-ups
- Real footage capture from keystone-oc.vercel.app is deferred until the app is finished (per the brief).
- Push: the brief asks for `main`; the session's designated branch is `claude/hopeful-rubin-vi1bv7`. Both are pushed.
