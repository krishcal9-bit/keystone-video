// Scans public/shots/ for <id>.mp4 | .webm | .mov | .png | .jpg and writes src/shots.generated.json.
// Videos are probed with ffprobe so the <AppShot> slot can trim, loop or speed-ramp them to fit.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'public', 'shots');
const out = path.join(root, 'src', 'shots.generated.json');
const IDS = ['law-lot', 'intro-logo', 'site-finder', 'lot-scan', 'plan-studio', 'pitch-kit', 'search-vs-wait'];
const VIDEO = ['.mp4', '.webm', '.mov'];
const IMAGE = ['.png', '.jpg', '.jpeg', '.webp'];

const manifest = {};
const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
for (const id of IDS) {
  // Prefer video over image when both exist.
  const pick = [...VIDEO, ...IMAGE].map((ext) => files.find((f) => f.toLowerCase() === id + ext)).find(Boolean);
  if (!pick) continue;
  const ext = path.extname(pick).toLowerCase();
  const entry = {file: `shots/${pick}`, type: VIDEO.includes(ext) ? 'video' : 'image'};
  try {
    const json = JSON.parse(
      execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path.join(dir, pick)]).toString(),
    );
    const v = json.streams.find((s) => s.codec_type === 'video');
    if (v) {
      entry.width = v.width;
      entry.height = v.height;
    }
    if (entry.type === 'video') entry.durationSec = Number(json.format.duration);
  } catch (e) {
    console.warn(`ffprobe failed for ${pick}: ${e.message}`);
  }
  // capture metadata (cursor track, clicks, zooms) written by scripts/capture.ts
  const metaFile = path.join(dir, `${id}.json`);
  if (fs.existsSync(metaFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      entry.meta = {frames: meta.frames, keyFrame: meta.keyFrame, cursor: meta.cursor, clicks: meta.clicks, zooms: meta.zooms};
    } catch (e) {
      console.warn(`bad ${id}.json: ${e.message}`);
    }
  }
  manifest[id] = entry;
}
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`shots: ${Object.keys(manifest).length ? Object.entries(manifest).map(([k, v]) => `${k} (${v.type})`).join(', ') : 'none found, using designed placeholders'}`);
