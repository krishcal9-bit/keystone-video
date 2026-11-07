# App footage slots

Drop real screenshots or clips here named exactly `<id>.mp4`, `<id>.webm`, `<id>.mov`, `<id>.png` or `<id>.jpg`.
If a file exists it plays inside the browser frame; otherwise the designed placeholder is shown.
Video wins over an image when both exist. Then run `npm run render` (it rescans this folder first).
`npm run capture` fills this folder automatically from https://keystone-oc.vercel.app (see `scripts/capture.ts`);
`capture-log.json` records which slots got real footage and why any kept their placeholder.

Frame: 16:10 content area under a minimal browser bar reading keystone-oc.vercel.app.
Capture at 1600×1000 or 2560×1600 for best results (anything 16:10 fits; other ratios are cropped `cover`, top-aligned).

Slot lengths below are for the current music (125 BPM grid); they are computed by `SLOT_FRAMES` in
`src/lib/timeline.ts`, which capture uses, and change automatically if the track changes.

| id | What goes in it | Slot length | Where |
|---|---|---|---|
| `law-lot` | Church parking lot filling with homes (landing page "law changed" section) | 2.6 s | 8.0–10.6 s |
| `intro-logo` | The app's intro arch/keystone title card (optional; overlays the built logo, full frame) | 1.5 s | 10.6–12.1 s |
| `site-finder` | OC map with parcels, filtering to eligible, totals rolling | 3.7 s | 12.4–16.0 s |
| `lot-scan` | Polygons tracing over a satellite image, area rolling up | 3.4 s | 15.8–19.2 s |
| `plan-studio` | Townhomes building row by row in 3D (include the parking slider moving) | 3.4 s | 19.2–22.6 s |
| `pitch-kit` | Letter writing itself in Spanish | 2.4 s | 22.6–25.0 s |
| `search-vs-wait` | The "Searching vs. waiting" comparison | 0.9 s | 26.0–26.9 s |

Timing rules (handled automatically by `<AppShot>`):
- Clip shorter than its slot: loops.
- Clip up to 35% longer than its slot: speed-ramped to fit exactly.
- Clip much longer: trimmed (set `trimStartSec` in `src/slots.ts` to choose the start).
- Images get the same slow push-in as video.
- Targeted zooms per slot live in `src/slots.ts` (`zooms`); retune them to the real UI once footage is in.
