# keystone-video

30-second Keystone product film built in code with [Remotion](https://remotion.dev). No audio.

- `out/keystone-30s.mp4`: 1920×1080, 30 fps, H.264
- `out/keystone-30s-vertical.mp4`: 1080×1920

## Commands
```bash
npm install
npm run studio          # preview and scrub
npm run render          # rescan public/shots, render both cuts
node scripts/render.mjs horizontal
node scripts/stills.mjs Keystone 120 480 760   # review stills into review/
```

## Swapping in app footage
Drop files into `public/shots/` (see `public/shots/README.md` for slot IDs and lengths) and re-render.

## Layout
- `src/lib/motion.ts`: 120 BPM grid, storyboard frames, easing and springs
- `src/lib/brand.ts`, `src/lib/fonts.ts`: colors, Fraunces / Public Sans
- `src/components/AppShot.tsx`: browser frame, camera, media or designed placeholder
- `src/components/placeholders/`: the seven placeholder screens
- `src/scenes/`: one component per storyboard row; `src/Main.tsx` assembles the timeline and transitions
- `DECISIONS.md`: what was decided and why
