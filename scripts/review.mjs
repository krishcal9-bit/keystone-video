// Frame + audio review of out/keystone-30s.mp4.
// Extracts frames at every shot boundary (±1) and mid-shot into review/frames, builds contact sheets
// (review/sheet-*.png), and prints loudness / true peak when the file has an audio track.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const file = path.join(root, 'out', 'keystone-30s.mp4');
const outDir = path.join(root, 'review', 'frames');
fs.mkdirSync(outDir, {recursive: true});
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f));

const {SHOT, TOTAL} = await import(path.join(root, 'src', 'lib', 'timeline.ts'));
const frames = new Set();
for (const [, s] of Object.entries(SHOT)) {
  frames.add(Math.max(0, s.from - 1));
  frames.add(s.from + 1);
  frames.add(s.from + Math.round(s.dur / 2));
}
frames.add(TOTAL - 1);
const list = [...frames].filter((f) => f >= 0 && f < TOTAL).sort((a, b) => a - b);
const select = list.map((f) => `eq(n\\,${f})`).join('+');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `select='${select}',scale=640:-1`, '-vsync', '0', path.join(outDir, 'f%03d.png')]);
const pngs = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
pngs.forEach((p, i) => fs.renameSync(path.join(outDir, p), path.join(outDir, `frame-${String(list[i]).padStart(3, '0')}.png`)));
// contact sheets of 3×3
const named = fs.readdirSync(outDir).filter((f) => f.startsWith('frame-')).sort();
for (let s = 0; s * 9 < named.length; s++) {
  const chunk = named.slice(s * 9, s * 9 + 9);
  const inputs = chunk.flatMap((f) => ['-i', path.join(outDir, f)]);
  const labels = chunk.map((f, i) => `[${i}:v]drawtext=text='${f.slice(6, 9)}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7[v${i}]`).join(';');
  const pad = 9 - chunk.length;
  const layout = Array.from({length: 9}, (_, i) => `${(i % 3) * 640}_${Math.floor(i / 3) * 360}`).slice(0, chunk.length).join('|');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${labels};${chunk.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${chunk.length}:layout=${layout}:fill=white`, path.join(root, 'review', `sheet-${s}.png`)]);
  void pad;
}
console.log(`review: ${list.length} frames → review/frames, sheets → review/sheet-*.png`);

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
console.log(`video: ${v.width}×${v.height} ${v.r_frame_rate} ${v.codec_name}, ${v.nb_frames} frames, ${(probe.format.size / 1e6).toFixed(1)} MB`);
if (a) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const I = r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop();
  const P = r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop();
  console.log(`audio: ${a.codec_name} ${a.sample_rate} Hz ${a.channels}ch, ${I}, true ${P}`);
} else console.log('audio: none');
