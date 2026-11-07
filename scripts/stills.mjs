// Render review stills: node scripts/stills.mjs [Keystone|KeystoneVertical] frame1 frame2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [comp = 'Keystone', ...frames] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHELL = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(SHELL) ? SHELL : null;
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id: comp, browserExecutable});
const outDir = path.join(root, 'review', comp);
fs.mkdirSync(outDir, {recursive: true});
for (const fr of frames.map(Number)) {
  const output = path.join(outDir, `f${String(fr).padStart(3, '0')}.png`);
  await renderStill({serveUrl, composition, frame: fr, output, browserExecutable, scale: Number(process.env.SCALE ?? 0.5)});
  console.log(output);
}
