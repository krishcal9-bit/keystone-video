# keystone-video

30-second Keystone product film built in code with [Remotion](https://remotion.dev).

- `out/keystone-30s.mp4`: 1920×1080, 30 fps, H.264 (AAC music track when `public/music.mp3` exists)

## Commands
```bash
npm install
npm run studio          # preview and scrub
npm run render          # rescan public/shots, prepare music, render out/keystone-30s.mp4
npm run review          # frames at every shot boundary + loudness check, into review/
npm run capture         # record app footage from keystone-oc.vercel.app into public/shots/
npm run update          # capture + render + review
node scripts/stills.mjs Keystone 120 480 760   # single stills into review/
```

## Music
Put the track at `public/music.mp3`. `scripts/music.ts` detects tempo and downbeats, trims 30 s from the strongest
intro, fades, normalizes to -14 LUFS and snaps the storyboard to the beat (`src/lib/timeline.ts`).

## Swapping in app footage
Drop files into `public/shots/` (see `public/shots/README.md` for slot IDs and lengths) and re-render.

## Layout
- `src/lib/timeline.ts`: beat-synced storyboard and slot lengths (music grid or silent 120 BPM)
- `src/lib/motion.ts`: easing, springs, re-exports the timeline
- `src/lib/brand.ts`, `src/lib/fonts.ts`: colors, Fraunces / Public Sans
- `src/components/AppShot.tsx`: browser frame, camera, media or designed placeholder
- `src/components/placeholders/`: the seven placeholder screens
- `src/scenes/`: one component per storyboard row; `src/Main.tsx` assembles the timeline and transitions
- `DECISIONS.md`: what was decided and why
