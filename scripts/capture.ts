/**
 * Automatic app-footage capture from the live Keystone app.
 *
 *   npm run capture                         # all slots
 *   npm run capture -- --only=site-finder,lot-scan
 *   CAPTURE_URL=http://localhost:3000 npm run capture
 *
 * For every slot: fresh Chromium context at 1440×900 (deviceScaleFactor 2), perform the interaction while a
 * CDP screencast records 2880×1800 frames, then trim with ffmpeg to the slot's beat-synced length and write
 * public/shots/<id>.mp4 plus a crisp still public/shots/<id>.png.
 *
 * Robustness rules:
 * - Selectors prefer roles + accessible names, then labels/text, then data-testid / CSS fallbacks.
 * - Recording only starts once the network is idle and no spinner / busy element is visible; spinners seen
 *   during the take are logged and the trim window is moved past them when possible.
 * - Any failure keeps that slot's placeholder (nothing is written) and is logged to public/shots/capture-log.json.
 * - A pine cursor ring with click ripples is injected so real footage matches the film's placeholder cursor.
 */
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {FPS, SLOT_FRAMES} from '../src/lib/timeline.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = any;
type Locator = any;

const require = createRequire(import.meta.url);
const loadPlaywright = () => {
  for (const id of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try {
      return require(id);
    } catch {
      /* try next */
    }
  }
  throw new Error('Playwright not found (expected the preinstalled copy; do not run `playwright install`).');
};

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = process.env.CAPTURE_OUT ?? path.join(ROOT, 'public', 'shots'); // override for dry runs
const TMP_ROOT = path.join(ROOT, 'review', 'capture-tmp');
const argv = process.argv.slice(2);
const arg = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const BASE = (arg('url') ?? process.env.CAPTURE_URL ?? 'https://keystone-oc.vercel.app').replace(/\/$/, '');
const ONLY = arg('only')?.split(',').map((s) => s.trim());
const VIEWPORT = {width: 1440, height: 900};
const DSF = 2;
const MAX_STRETCH = 1.35; // AppShot speed-ramps clips up to 35% longer than the slot
const SPINNERS = [
  '[aria-busy="true"]',
  '[role="progressbar"]',
  '.animate-spin',
  '.spinner',
  '.loading',
  '[data-loading="true"]',
  '[data-state="loading"]',
].join(', ');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;

type SlotId = keyof typeof SLOT_FRAMES;
type Log = {id: SlotId; status: 'captured' | 'kept-placeholder'; detail: string; seconds?: number; busy?: number};
const log: Log[] = [];

// ---------------------------------------------------------------- recorder (CDP screencast)
class Recorder {
  frames: {file: string; t: number}[] = [];
  marks: Record<string, number> = {};
  busy: [number, number][] = [];
  private session: any;
  private n = 0;
  private polling = false;
  constructor(private page: Page, private dir: string) {}

  async start() {
    fs.mkdirSync(this.dir, {recursive: true});
    this.session = await this.page.context().newCDPSession(this.page);
    this.session.on('Page.screencastFrame', async (e: any) => {
      const file = path.join(this.dir, `f${String(this.n++).padStart(6, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(e.data, 'base64'));
      this.frames.push({file, t: e.metadata.timestamp ?? now()});
      try {
        await this.session.send('Page.screencastFrameAck', {sessionId: e.sessionId});
      } catch {
        /* session closing */
      }
    });
    await this.session.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: VIEWPORT.width * DSF,
      maxHeight: VIEWPORT.height * DSF,
      everyNthFrame: 1,
    });
    this.marks.recordStart = now();
    this.pollBusy();
  }

  /** Track spinner / busy states while recording so the trim can avoid them. */
  private async pollBusy() {
    this.polling = true;
    let since: number | null = null;
    while (this.polling) {
      const busy = await spinnerVisible(this.page);
      if (busy && since === null) since = now();
      if (!busy && since !== null) {
        this.busy.push([since, now()]);
        since = null;
      }
      await sleep(120);
    }
    if (since !== null) this.busy.push([since, now()]);
  }

  mark(name: string) {
    this.marks[name] = now();
  }

  async stop() {
    this.polling = false;
    await sleep(250);
    try {
      await this.session.send('Page.stopScreencast');
    } catch {
      /* page gone */
    }
  }

  /** Encode [from, from + len] (absolute seconds) to a constant-30 fps H.264 file. */
  encode(from: number, len: number, out: string) {
    const frames = this.frames.filter((f) => f.t <= from + len + 0.05).sort((a, b) => a.t - b.t);
    // the frame on screen at `from` is the last one at or before it
    let i0 = 0;
    for (let i = 0; i < frames.length; i++) if (frames[i].t <= from) i0 = i;
    const used = frames.slice(i0);
    if (used.length < 2) throw new Error('recording produced too few frames');
    const lines: string[] = [];
    for (let i = 0; i < used.length; i++) {
      const start = Math.max(from, used[i].t);
      const end = i + 1 < used.length ? used[i + 1].t : from + len;
      const d = Math.max(0, Math.min(end, from + len) - start);
      if (d <= 0 && i + 1 < used.length) continue;
      lines.push(`file '${used[i].file.replace(/'/g, "'\\''")}'`, `duration ${d.toFixed(4)}`);
    }
    lines.push(`file '${used[used.length - 1].file.replace(/'/g, "'\\''")}'`); // concat demuxer needs the last file twice
    const list = path.join(this.dir, 'list.txt');
    fs.writeFileSync(list, lines.join('\n') + '\n');
    const r = spawnSync('ffmpeg', [
      '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `fps=${FPS},scale=${VIEWPORT.width * DSF}:${VIEWPORT.height * DSF}:flags=lanczos,format=yuv420p`,
      '-t', len.toFixed(3), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', '-an', out,
    ]);
    if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.toString().slice(-500)}`);
  }
}

// ---------------------------------------------------------------- page helpers
const spinnerVisible = async (page: Page) => {
  try {
    const loc = page.locator(SPINNERS);
    const n = Math.min(await loc.count(), 8);
    for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible()) return true;
    return await page.getByText(/^\s*loading\b/i).first().isVisible();
  } catch {
    return false;
  }
};

/** Wait for network idle and no visible spinners (up to `timeout` ms). */
const settled = async (page: Page, timeout = 20000) => {
  const until = Date.now() + timeout;
  await page.waitForLoadState('networkidle', {timeout}).catch(() => undefined);
  while (Date.now() < until) {
    if (!(await spinnerVisible(page))) {
      await sleep(400);
      if (!(await spinnerVisible(page))) return;
    }
    await sleep(200);
  }
  throw new Error('page never settled (spinner still visible)');
};

/** First visible locator among candidates, waiting up to `timeout` ms. */
const firstVisible = async (cands: Locator[], what: string, timeout = 10000): Promise<Locator> => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    for (const c of cands) {
      try {
        const l = c.first();
        if (await l.isVisible()) return l;
      } catch {
        /* bad candidate */
      }
    }
    await sleep(200);
  }
  throw new Error(`could not find ${what}`);
};

/** Controls by accessible name: switch, checkbox, tab, radio, button, label, then plain text. */
const control = (page: Page, name: RegExp) => [
  page.getByRole('switch', {name}),
  page.getByRole('checkbox', {name}),
  page.getByRole('tab', {name}),
  page.getByRole('radio', {name}),
  page.getByRole('option', {name}),
  page.getByRole('button', {name}),
  page.getByRole('link', {name}),
  page.getByLabel(name),
  page.getByText(name),
];

/** Glide the (visible, injected) cursor to an element and click it. */
const glideClick = async (page: Page, loc: Locator) => {
  await loc.scrollIntoViewIfNeeded().catch(() => undefined);
  const box = await loc.boundingBox();
  if (!box) throw new Error('element has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {steps: 18});
  await sleep(120);
  await loc.click();
};

/** Press Down until `target` is in the viewport (handles both scrolling pages and keyboard-driven decks). */
const downTo = async (page: Page, target: RegExp, maxPresses = 40) => {
  const loc = page.getByText(target).first();
  for (let i = 0; i < maxPresses; i++) {
    const box = await loc.boundingBox().catch(() => null);
    if (box && box.y >= 0 && box.y + Math.min(box.height, 200) <= VIEWPORT.height && (await loc.isVisible())) return;
    const before = await page.evaluate(() => [window.scrollY, location.href].join('|'));
    await page.keyboard.press('ArrowDown');
    await sleep(650);
    const after = await page.evaluate(() => [window.scrollY, location.href].join('|'));
    const moved = Math.abs(Number(after.split('|')[0]) - Number(before.split('|')[0]));
    if (moved < 100 && after.split('|')[1] === before.split('|')[1]) {
      // plain scrolling page: ArrowDown only nudges 40 px, so take a bigger step
      await page.keyboard.press('PageDown');
      await sleep(650);
    }
  }
  throw new Error(`never reached ${target}`);
};

const gotoFirst = async (page: Page, paths: string[]) => {
  for (const p of paths) {
    const res = await page.goto(BASE + p, {waitUntil: 'domcontentloaded', timeout: 45000}).catch(() => null);
    if (res && res.status() < 400) return p;
  }
  throw new Error(`none of ${paths.join(', ')} loaded`);
};

/** Pine cursor ring + click ripple, injected into every page so real footage matches the film. */
const CURSOR_INIT = `
(() => {
  const css = '#ks-cursor{position:fixed;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;' +
    'border:3px solid rgba(30,92,71,.75);background:rgba(30,92,71,.14);box-shadow:0 2px 6px rgba(24,36,32,.12);' +
    'pointer-events:none;z-index:2147483647;transition:transform .12s cubic-bezier(.23,1,.32,1);opacity:0}' +
    '.ks-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #1E5C47;' +
    'pointer-events:none;z-index:2147483646;animation:ks-r .6s cubic-bezier(.23,1,.32,1) forwards}' +
    '@keyframes ks-r{from{opacity:.55;transform:scale(1)}to{opacity:0;transform:scale(2.6)}}';
  const boot = () => {
    if (document.getElementById('ks-cursor')) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const c = document.createElement('div'); c.id = 'ks-cursor'; document.body.appendChild(c);
    addEventListener('mousemove', e => { c.style.opacity = 1; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', e => {
      c.style.transform = 'scale(.82)';
      const r = document.createElement('div'); r.className = 'ks-ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, true);
    addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
})();`;

// ---------------------------------------------------------------- slots
type Take = {rec: Recorder; page: Page};
type SlotFn = (t: Take) => Promise<void>;

const SLOTS: Record<SlotId, SlotFn> = {
  // Fresh load: record the intro arch/keystone title card from the first paint.
  'intro-logo': async ({rec, page}) => {
    await page.goto('about:blank');
    await rec.start();
    await page.goto(BASE + '/', {waitUntil: 'commit', timeout: 45000});
    rec.mark('start');
    await sleep(slotSec('intro-logo') * MAX_STRETCH * 1000 + 600);
    rec.mark('hero');
    rec.mark('end');
  },

  // Landing page: press Down to the "law changed" section and record its auto-play.
  'law-lot': async ({rec, page}) => {
    await gotoFirst(page, ['/']);
    await settled(page);
    await sleep(2500); // let the intro finish before navigating
    await rec.start();
    await downTo(page, /law changed/i);
    rec.mark('start');
    await sleep(slotSec('law-lot') * MAX_STRETCH * 1000 + 400);
    rec.mark('hero');
    rec.mark('end');
  },

  // Landing page: Down to the "Searching vs. waiting" comparison.
  'search-vs-wait': async ({rec, page}) => {
    await gotoFirst(page, ['/']);
    await settled(page);
    await sleep(2500);
    await rec.start();
    await downTo(page, /search(ing)?\s*(vs\.?|versus)\s*wait(ing)?/i);
    rec.mark('start');
    await sleep(slotSec('search-vs-wait') * MAX_STRETCH * 1000 + 400);
    rec.mark('hero');
    rec.mark('end');
  },

  // /sites: map loads, then "Eligible only" and "Near transit"; totals roll.
  'site-finder': async ({rec, page}) => {
    await gotoFirst(page, ['/sites']);
    await page.locator('canvas, .maplibregl-map, .mapboxgl-map, .leaflet-container, [data-testid*="map" i]').first().waitFor({timeout: 30000});
    await settled(page);
    const eligible = await firstVisible(control(page, /eligible only/i), '"Eligible only"');
    const transit = await firstVisible(control(page, /near transit/i), '"Near transit"');
    await page.mouse.move(VIEWPORT.width * 0.62, VIEWPORT.height * 0.6);
    await rec.start();
    await sleep(350);
    rec.mark('start');
    await glideClick(page, eligible);
    await sleep(1300);
    await glideClick(page, transit);
    await sleep(1600); // totals roll
    rec.mark('hero');
    rec.mark('end');
    await sleep(400);
  },

  // /scan: open the first sample aerial and record the polygon trace.
  'lot-scan': async ({rec, page}) => {
    await gotoFirst(page, ['/scan']);
    await settled(page);
    const sample = await firstVisible(
      [
        page.getByRole('button', {name: /sample/i}),
        page.getByRole('img', {name: /aerial|satellite|sample/i}),
        page.locator('[data-testid*="sample" i]'),
        page.locator('img[alt*="aerial" i], img[alt*="satellite" i]'),
        page.getByText(/sample/i),
      ],
      'first sample aerial',
    );
    await page.mouse.move(VIEWPORT.width * 0.5, VIEWPORT.height * 0.55);
    await rec.start();
    await sleep(300);
    rec.mark('start');
    await glideClick(page, sample);
    // some builds trace automatically, others need a button
    const go = await firstVisible(control(page, /^(trace|scan|measure|detect)( lot)?$/i), 'trace button', 2500).catch(() => null);
    if (go) await glideClick(page, go);
    await settled(page, 15000).catch(() => undefined);
    await sleep(slotSec('lot-scan') * 1000);
    rec.mark('hero');
    rec.mark('end');
  },

  // First eligible site → Generate → move the sun slider.
  'plan-studio': async ({rec, page}) => {
    await gotoFirst(page, ['/sites']);
    await settled(page);
    const only = await firstVisible(control(page, /eligible only/i), '"Eligible only"', 4000).catch(() => null);
    if (only) {
      await only.click();
      await settled(page, 8000).catch(() => undefined);
    }
    const site = await firstVisible(
      [
        page.locator('[data-eligible="true"]'),
        page.getByRole('listitem').filter({hasText: /eligible/i}),
        page.getByRole('link', {name: /eligible/i}),
        page.getByRole('row').filter({hasText: /eligible/i}),
        page.locator('[data-testid*="site" i]'),
        page.getByRole('listitem'),
      ],
      'first eligible site',
    );
    await site.click();
    await settled(page, 10000).catch(() => undefined);
    const toPlan = await firstVisible(control(page, /plan studio|design|plan (it|this)|open in plan/i), 'link to Plan Studio', 4000).catch(() => null);
    if (toPlan) {
      await toPlan.click();
      await settled(page);
    }
    const generate = await firstVisible(control(page, /^generate/i), '"Generate"');
    await page.mouse.move(VIEWPORT.width * 0.6, VIEWPORT.height * 0.55);
    await rec.start();
    await sleep(300);
    rec.mark('start');
    await glideClick(page, generate);
    await sleep(1900); // townhomes build row by row
    const sun = await firstVisible(
      [page.getByRole('slider', {name: /sun/i}), page.getByLabel(/sun/i), page.locator('input[type="range"][name*="sun" i], [data-testid*="sun" i]')],
      'sun slider',
      5000,
    );
    const box = await sun.boundingBox();
    if (!box) throw new Error('sun slider has no box');
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.25, y, {steps: 14});
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, y, {steps: 40}); // ~0.7 s of smooth drag
    await page.mouse.up();
    await sleep(500);
    rec.mark('hero');
    rec.mark('end');
  },

  // Pitch Kit: switch to Spanish and record the letter writing itself.
  'pitch-kit': async ({rec, page}) => {
    await gotoFirst(page, ['/pitch', '/pitch-kit']);
    await settled(page);
    const es = await firstVisible(control(page, /español|spanish/i), 'Spanish toggle');
    await page.mouse.move(VIEWPORT.width * 0.55, VIEWPORT.height * 0.5);
    await rec.start();
    await sleep(300);
    rec.mark('start');
    await glideClick(page, es);
    const draft = await firstVisible(control(page, /^(draft|generate|write)( (the )?letter)?$/i), 'draft button', 1500).catch(() => null);
    if (draft) await glideClick(page, draft);
    await sleep(slotSec('pitch-kit') * MAX_STRETCH * 1000 + 300);
    rec.mark('hero');
    rec.mark('end');
  },
};

const slotSec = (id: SlotId) => SLOT_FRAMES[id] / FPS;

// ---------------------------------------------------------------- run
const captureSlot = async (browser: any, id: SlotId) => {
  const dir = path.join(TMP_ROOT, id);
  fs.rmSync(dir, {recursive: true, force: true});
  const context = await browser.newContext({viewport: VIEWPORT, deviceScaleFactor: DSF, reducedMotion: 'no-preference', colorScheme: 'light'});
  await context.addInitScript(CURSOR_INIT);
  const page = await context.newPage();
  const rec = new Recorder(page, path.join(dir, 'frames'));
  try {
    await SLOTS[id]({rec, page});
    // still at the hero moment, full 2× resolution
    const stillTmp = path.join(dir, `${id}.png`);
    await page.screenshot({path: stillTmp});
    await rec.stop();

    const slot = slotSec(id);
    const action = (rec.marks.end ?? now()) - rec.marks.start;
    const len = Math.min(Math.max(slot, action), slot * MAX_STRETCH);
    // move the window past any spinner that overlaps it, if the recording allows
    let start = rec.marks.start - 0.1;
    for (const [a, b] of rec.busy) if (a < start + len && b > start) start = b + 0.05;
    const lastFrame = rec.frames.length ? rec.frames[rec.frames.length - 1].t : start;
    if (start + slot > Math.max(lastFrame, rec.marks.end ?? lastFrame) + 0.5) throw new Error('a loading state covers the take');

    const clipTmp = path.join(dir, `${id}.mp4`);
    rec.encode(start, len, clipTmp);
    fs.copyFileSync(clipTmp, path.join(SHOTS, `${id}.mp4`));
    fs.copyFileSync(stillTmp, path.join(SHOTS, `${id}.png`));
    log.push({id, status: 'captured', detail: `${len.toFixed(2)} s clip (slot ${slot.toFixed(2)} s)`, seconds: len, busy: rec.busy.length});
    console.log(`✓ ${id}: ${len.toFixed(2)} s`);
  } catch (e: any) {
    await rec.stop().catch(() => undefined);
    log.push({id, status: 'kept-placeholder', detail: String(e?.message ?? e)});
    console.warn(`✗ ${id}: ${e?.message ?? e} (placeholder kept)`);
  } finally {
    await context.close().catch(() => undefined);
  }
};

const main = async () => {
  const {chromium} = loadPlaywright();
  fs.mkdirSync(SHOTS, {recursive: true});
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? {executablePath: '/opt/pw-browsers/chromium'} : {});
  const ids = (Object.keys(SLOTS) as SlotId[]).filter((id) => !ONLY || ONLY.includes(id));
  console.log(`capture: ${BASE} → ${ids.join(', ')}`);
  for (const id of ids) await captureSlot(browser, id);
  await browser.close();
  fs.writeFileSync(path.join(SHOTS, 'capture-log.json'), JSON.stringify({base: BASE, at: new Date().toISOString(), slots: log}, null, 2) + '\n');
  const ok = log.filter((l) => l.status === 'captured').map((l) => l.id);
  console.log(`capture: real footage for ${ok.length ? ok.join(', ') : 'no slots'}; log → public/shots/capture-log.json`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
