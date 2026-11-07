# Decisions log

## Format
- Landscape only (1920×1080, 30 fps, H.264): `out/keystone-30s.mp4`. The portrait composition and its render were
  removed. The layout helper still has portrait branches (unused) so a 9:16 cut stays cheap if it comes back.

## Timing and music
- 30 fps, 900 frames. The storyboard lives in `src/lib/timeline.ts` and is snapped to a beat grid:
  with `public/music.mp3` the grid is the detected tempo; without it, a silent 120 BPM grid (15 frames per beat).
- Snapping: every shot boundary goes to the nearest beat; major reveals snap to beats, 8ths or 16ths
  (hook words on 16ths, "$0." on the beat, captions on the first 8th after each cut, "Land" swell, "by right.",
  payoff shrink and end-card lines on beats). The keystone's contact ("lock") lands on the nearest downbeat
  ~0.8 s into the logo shot, and the end card starts on a downbeat 1.7–3.2 s from the end. Without music the end
  card keeps the storyboard's 27.5 s.
- `scripts/music.ts` (runs on every render): decodes the mp3, builds onset envelopes, estimates tempo by weighted
  autocorrelation refined with a comb filter over the whole track, then finds the beat phase on *linear* broadband
  energy onsets (kick-dominated). The first version used log spectral flux for phase and locked to the off-beat
  hi-hats of the delivered track (grid 0.24 s early); verified by folding hats, kick transients and full-band energy.
  Bar phase comes from kick strength per beat. The start is the downbeat with the biggest energy rise whose next
  30 s stay strong (slight preference for earlier). Then: trim 30.0 s, 0.5 s fade-in, 1.5 s fade-out, two-pass
  loudnorm to -14 LUFS (linear), limiter at -2 dBFS for AAC headroom.
- Delivered track (`public/music.mp3`, 113.5 s): 125.01 BPM, start 1.955 s = the first full hit after the opening
  riser (track is quiet 0–1.7 s, then constant energy, so that hit is the strongest intro). Final MP4 measures
  -13.9 LUFS integrated, -2.8 dBTP true peak; folding the final audio's energy onsets onto the film's grid peaks at
  0 ms offset.
- Resulting cut points (frames): 0, 72, 158, 245, 317, 374, 475, 576, 677, 749, 806 (beats at 14.4 frames);
  keystone lock at 346 and end card at 806 are downbeats.
- Also checked on a synthetic 124 BPM track with a drop at 15.484 s: detected 123.98 BPM, start 15.46 s
  (not committed).
- Whooshes: synthesized in code (band-passed noise sweeps, no downloaded SFX), only on the three brand transitions
  (pine wipe panned left→right, arch zoom-through, payoff shrink as a soft downward sweep), 19–23 dB under full scale.
  Disable with `WHOOSH=0`.
- Without `public/music.mp3` the film renders silent on a 120 BPM grid.

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

## Capture (prepared, not run)
- `scripts/capture.ts` (Playwright, preinstalled Chromium) targets https://keystone-oc.vercel.app at 1440×900,
  deviceScaleFactor 2. It records with a CDP screencast (2880×1800 JPEG frames with timestamps) rather than
  Playwright's built-in recorder (low-bitrate VP8), then assembles constant 30 fps H.264 with ffmpeg.
- Slot lengths come from `SLOT_FRAMES` in the same beat-synced timeline the film uses. Takes run up to 1.35× the slot;
  `<AppShot>` speed-ramps anything in that range to fit exactly.
- A pine cursor ring with click ripples is injected into the page so real footage matches the placeholders.
- Recording starts only after network idle and no visible spinner/busy element; spinners during a take are tracked
  and the trim window moves past them, or the slot is kept as placeholder.
- Dry-run against a local mock page only (never the live site): the site-finder flow produced a 2880×1800, 30 fps,
  3.97 s clip with the cursor ring, and a missing route correctly kept its placeholder and logged the reason.
- Not run against the live site, per instructions. Run with `npm run update` after the word "capture".

## Follow-ups
- Push: the brief asks for `main`; the session's designated branch is `claude/hopeful-rubin-vi1bv7`. Both are pushed.
