/**
 * Music prep. Run by `npm run render` (and `npm run music`).
 *
 * If public/music.mp3 exists:
 *   1. decode to mono 22.05 kHz, build onset envelopes (log spectral flux, full band and < 150 Hz)
 *   2. estimate tempo (weighted autocorrelation, refined with a comb over the whole track) and beat phase
 *   3. find the bar phase (downbeats = strongest low-band onsets) and pick the start: the downbeat where the
 *      track "kicks in" hardest while the next 30 s stay energetic
 *   4. write src/music.generated.json (the storyboard snaps to this grid: src/lib/timeline.ts)
 *   5. render public/music.processed.wav: 30.0 s, 0.5 s fade-in, 1.5 s fade-out, two-pass loudnorm to -14 LUFS
 *      (true peak ≤ -1.5 dBTP), plus subtle synthesized whooshes on the three brand transitions
 * If it doesn't exist: writes {present: false} and the film renders silent on a 120 BPM grid.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'public', 'music.mp3');
const JSON_OUT = path.join(ROOT, 'src', 'music.generated.json');
const WAV_OUT = path.join(ROOT, 'public', 'music.processed.wav');
const TMP = path.join(ROOT, 'review', 'music-tmp');
const LENGTH = 30;
const TARGET_LUFS = -14;
const TRUE_PEAK = -1.5;
const WHOOSH = process.env.WHOOSH !== '0';

const sh = (args: string[], opts: {input?: Buffer; binary?: boolean} = {}) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {maxBuffer: 1 << 30, input: opts.input});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}\n${r.stderr.toString().slice(-2000)}`);
  return r;
};

if (!fs.existsSync(SRC)) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({present: false}, null, 2) + '\n');
  if (fs.existsSync(WAV_OUT)) fs.unlinkSync(WAV_OUT);
  console.log('music: public/music.mp3 not found, rendering without audio (silent 120 BPM grid)');
  process.exit(0);
}

// ---------- 1. decode + onset envelopes ----------
const SR = 22050;
const pcmBuf = sh(['-v', 'error', '-i', SRC, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']).stdout as Buffer;
const pcm = new Float32Array(pcmBuf.buffer, pcmBuf.byteOffset, Math.floor(pcmBuf.byteLength / 4));
const trackDur = pcm.length / SR;
const N = 1024;
const HOP = 256;
const R = SR / HOP; // envelope rate (Hz)
const nFrames = Math.max(0, Math.floor((pcm.length - N) / HOP));

const fft = (re: Float64Array, im: Float64Array) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
};

const hann = Float64Array.from({length: N}, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const LOW_BIN = Math.ceil(150 / (SR / N));
const flux = new Float64Array(nFrames);
const fluxLow = new Float64Array(nFrames);
const rms = new Float64Array(nFrames);
let prev = new Float64Array(N / 2);
const re = new Float64Array(N);
const im = new Float64Array(N);
for (let t = 0; t < nFrames; t++) {
  let e = 0;
  for (let i = 0; i < N; i++) {
    const v = pcm[t * HOP + i];
    e += v * v;
    re[i] = v * hann[i];
    im[i] = 0;
  }
  rms[t] = Math.sqrt(e / N);
  fft(re, im);
  const cur = new Float64Array(N / 2);
  let fl = 0;
  let fll = 0;
  for (let k = 1; k < N / 2; k++) {
    cur[k] = Math.log1p(1000 * Math.hypot(re[k], im[k]));
    const d = cur[k] - prev[k];
    if (d > 0) {
      fl += d;
      if (k <= LOW_BIN) fll += d;
    }
  }
  flux[t] = fl;
  fluxLow[t] = fll;
  prev = cur;
}
const detrend = (x: Float64Array, w = 8) => {
  const out = new Float64Array(x.length);
  for (let t = 0; t < x.length; t++) {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, t - w); k <= Math.min(x.length - 1, t + w); k++) {
      s += x[k];
      c++;
    }
    out[t] = Math.max(0, x[t] - s / c);
  }
  const mx = out.reduce((a, v) => Math.max(a, v), 1e-9);
  return out.map((v) => v / mx);
};
const env = detrend(flux);
const envLow = detrend(fluxLow);
// Phase is found on an envelope weighted toward the low band, so the grid locks to kicks rather than off-beat hats.
const envPhase = env.map((v, i) => v + 1.5 * envLow[i]);

// ---------- 2. tempo + phase ----------
const peakNear = (x: Float64Array, pos: number, tol = 1) => {
  let m = 0;
  for (let k = Math.round(pos) - tol; k <= Math.round(pos) + tol; k++) if (k >= 0 && k < x.length) m = Math.max(m, x[k]);
  return m;
};
let bestLag = 0;
let bestScore = -1;
for (let lag = Math.floor((R * 60) / 200); lag <= Math.ceil((R * 60) / 60); lag++) {
  let s = 0;
  for (let t = 0; t + lag < env.length; t++) s += env[t] * env[t + lag];
  s /= env.length - lag;
  const bpm = (60 * R) / lag;
  const w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
  if (s * w > bestScore) {
    bestScore = s * w;
    bestLag = lag;
  }
}
let bpm0 = (60 * R) / bestLag;
while (bpm0 < 85) bpm0 *= 2;
while (bpm0 > 175) bpm0 /= 2;

const comb = (bpm: number) => {
  const p = (60 * R) / bpm;
  let best = {score: -1, phase: 0};
  for (let ph = 0; ph < p; ph += 0.5) {
    let s = 0;
    let n = 0;
    for (let pos = ph; pos < envPhase.length; pos += p) {
      s += peakNear(envPhase, pos);
      n++;
    }
    s /= n;
    if (s > best.score) best = {score: s, phase: ph};
  }
  return best;
};
let BPM = bpm0;
let PH = 0;
let top = -1;
for (let bpm = bpm0 * 0.97; bpm <= bpm0 * 1.03; bpm += 0.02) {
  const c = comb(bpm);
  if (c.score > top) {
    top = c.score;
    BPM = bpm;
    PH = c.phase;
  }
}
BPM = Math.round(BPM * 100) / 100;
const beatSec = 60 / BPM;
// STFT frames register an onset up to one window early; shift by half a window
const firstBeat = PH / R + (N / 2) / SR;
const beats: number[] = [];
for (let t = firstBeat; t < trackDur; t += beatSec) beats.push(t);

// ---------- 3. bar phase + start ----------
const barScores = [0, 1, 2, 3].map((j) => {
  let s = 0;
  for (let k = j; k < beats.length; k += 4) s += peakNear(envLow, beats[k] * R, 2) + 0.5 * peakNear(env, beats[k] * R, 2);
  return s;
});
const barPhase = barScores.indexOf(Math.max(...barScores));
const downbeats = beats.filter((_, k) => k % 4 === barPhase);

const meanRms = (a: number, b: number) => {
  const i0 = Math.max(0, Math.floor(a * R));
  const i1 = Math.min(rms.length, Math.ceil(b * R));
  if (i1 <= i0) return 0;
  let s = 0;
  for (let i = i0; i < i1; i++) s += rms[i];
  return s / (i1 - i0);
};
const latest = Math.max(0, trackDur - LENGTH);
const cands = downbeats.filter((d) => d <= latest + 1e-6);
if (cands.length === 0) cands.push(0);
const feats = cands.map((s) => ({s, body: meanRms(s, s + LENGTH), rise: meanRms(s, s + 2) - meanRms(s - 2, s)}));
const maxBody = Math.max(...feats.map((x) => x.body), 1e-9);
const maxRise = Math.max(...feats.map((x) => x.rise), 1e-9);
const scored = feats.map((x) => ({...x, score: 0.55 * (x.body / maxBody) + 0.45 * Math.max(0, x.rise / maxRise) - 0.15 * (x.s / Math.max(latest, 1))}));
scored.sort((a, b) => b.score - a.score);
const START = Math.round(scored[0].s * 1000) / 1000;

const meta = {
  present: true,
  source: 'public/music.mp3',
  trackDurationSec: Math.round(trackDur * 100) / 100,
  bpm: BPM,
  startSec: START,
  // the trimmed track starts on a detected downbeat, so the grid's phase and bar phase are 0
  phaseSec: 0,
  barPhase: 0,
  beatConfidence: Math.round(top * 1000) / 1000,
};
fs.writeFileSync(JSON_OUT, JSON.stringify(meta, null, 2) + '\n');
console.log(`music: ${BPM} BPM, start ${START.toFixed(2)} s (downbeat), track ${trackDur.toFixed(1)} s, comb ${meta.beatConfidence}`);

// ---------- 4. whooshes (synthesized: band-passed noise sweeps) ----------
fs.mkdirSync(TMP, {recursive: true});
const OSR = 48000;
const writeWav = (file: string, L: Float32Array, Rr: Float32Array) => {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(OSR, 24);
  buf.writeUInt32LE(OSR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Rr[i] * 32767))), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
};

const {TRANSITION_PEAKS, FPS} = await import('../src/lib/timeline.ts');
const wL = new Float32Array(OSR * LENGTH);
const wR = new Float32Array(OSR * LENGTH);
let seed = 12345;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};
const whoosh = (peakSec: number, opts: {f0: number; f1: number; pan0: number; pan1: number; gainDb: number}) => {
  const rise = 0.34;
  const fall = 0.22;
  const t0 = peakSec - rise;
  const g = 10 ** (opts.gainDb / 20);
  let low = 0;
  let band = 0;
  for (let i = 0; i < (rise + fall) * OSR; i++) {
    const t = i / OSR;
    const idx = Math.round((t0 + t) * OSR);
    if (idx < 0 || idx >= wL.length) continue;
    const u = t < rise ? t / rise : 1 + (t - rise) / fall; // 0..2
    const fc = opts.f0 * (opts.f1 / opts.f0) ** Math.min(1, u * 0.8);
    const f = 2 * Math.sin((Math.PI * fc) / OSR);
    const q = 0.7;
    const x = noise();
    low += f * band;
    const high = x - low - q * band;
    band += f * high;
    const envv = t < rise ? Math.sin(((t / rise) * Math.PI) / 2) ** 2 : Math.exp((-(t - rise) / fall) * 4);
    const pan = opts.pan0 + (opts.pan1 - opts.pan0) * Math.min(1, u / 2);
    const y = band * envv * g;
    wL[idx] += y * Math.cos(((pan + 1) * Math.PI) / 4);
    wR[idx] += y * Math.sin(((pan + 1) * Math.PI) / 4);
  }
};
if (WHOOSH) {
  whoosh(TRANSITION_PEAKS.wipe / FPS, {f0: 500, f1: 3200, pan0: -0.7, pan1: 0.7, gainDb: -20});
  whoosh(TRANSITION_PEAKS.zoom / FPS, {f0: 350, f1: 2600, pan0: 0, pan1: 0, gainDb: -19});
  whoosh(TRANSITION_PEAKS.payoff / FPS, {f0: 900, f1: 260, pan0: 0, pan1: 0, gainDb: -23});
}
const whooshFile = path.join(TMP, 'whoosh.wav');
writeWav(whooshFile, wL, wR);

// ---------- 5. trim, fade, loudness ----------
const trimmed = path.join(TMP, 'music-trim.wav');
sh([
  '-y', '-v', 'error', '-ss', String(START), '-t', String(LENGTH), '-i', SRC,
  '-af', `aresample=${OSR},aformat=sample_fmts=fltp:channel_layouts=stereo,apad=whole_dur=${LENGTH},afade=t=in:st=0:d=0.5,afade=t=out:st=${LENGTH - 1.5}:d=1.5`,
  '-c:a', 'pcm_f32le', trimmed,
]);
const ln = `loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=11`;
const pass1 = sh(['-v', 'info', '-i', trimmed, '-af', `${ln}:print_format=json`, '-f', 'null', '-']).stderr.toString();
const m = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
const normed = path.join(TMP, 'music-norm.wav');
sh([
  '-y', '-v', 'error', '-i', trimmed,
  '-af', `${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=${OSR}`,
  '-c:a', 'pcm_f32le', normed,
]);
sh([
  '-y', '-v', 'error', '-i', normed, '-i', whooshFile,
  '-filter_complex', `[0:a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=${(10 ** ((TRUE_PEAK - 0.5) / 20)).toFixed(3)}:level=false:attack=2:release=60,atrim=0:${LENGTH}`,
  '-ar', String(OSR), '-c:a', 'pcm_s16le', WAV_OUT,
]);
const check = sh(['-v', 'info', '-i', WAV_OUT, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const I = check.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop();
const P = check.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop();
console.log(`music: wrote public/music.processed.wav (${I}, true ${P})`);
