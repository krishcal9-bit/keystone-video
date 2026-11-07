/**
 * Real app footage, captured deterministically from the live Keystone app.
 *
 *   npm run capture                         # every slot
 *   npm run capture -- --only=site-finder,lot-scan
 *   CAPTURE_URL=http://localhost:3000 npm run capture
 *
 * How it records
 * - Chromium (new headless, SwiftShader WebGL) at 1440×900, deviceScaleFactor 2, light mode, fresh context per slot.
 * - Frame-stepped, not screencast: the page clock (Date, timers, rAF, performance) is frozen with Playwright's clock and
 *   the document animation timeline is frozen through CDP. For every output frame the script advances JS time by
 *   1/30 s, seeks every CSS/WAAPI animation to the same virtual time, and takes a 2880×1800 screenshot. The result is a
 *   true 30 fps take even where software WebGL renders at 3 fps in real time.
 * - Human input: the mouse travels along eased, slightly arced paths, pauses ~300 ms before clicks, drags sliders over
 *   ~800 ms. The native cursor is never in the pixels; its path and clicks are logged per frame so the edit draws the
 *   pine ring and ripples in exact sync.
 * - The Pitch Kit letter comes from the live /api/pitch. It is fetched once, then replayed through a page-side stream
 *   paced by the frozen clock so it "writes itself" at its natural speed inside the stepped take.
 * - Plan Studio: the app shows a still render on software GPUs; the WebGL renderer string is reported as hardware so
 *   the real 3D view renders (it does, through SwiftShader, just slowly).
 * - Recording starts only when the page is settled (network idle, no spinner/busy element). Any failure is retried
 *   once; then that slot keeps its designed placeholder and the reason is logged.
 *
 * How it edits (per slot)
 * - Speed ramps instead of jump cuts: 1× around the key moment, up to 2× through approaches and waits, eased between.
 * - The key moment (a click, the homes rising…) is placed on a strong beat of the music grid (keyFrameFor).
 * - Writes public/shots/<id>.mp4 (exact slot length, 2880×1800, 30 fps), <id>.png (key moment) and <id>.json
 *   (cursor track, clicks, targeted zooms, all in clip frames) for <AppShot>.
 */
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {keyFrameFor, LOGO_LOCK, SLOT_FRAMES} from '../src/lib/timeline.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = any;
type Locator = any;
type SlotId = keyof typeof SLOT_FRAMES;

const require = createRequire(import.meta.url);
const loadPlaywright = () => {
  for (const id of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try {
      return require(id);
    } catch {
      /* next */
    }
  }
  throw new Error('Playwright not found (use the preinstalled copy; do not run `playwright install`).');
};

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = process.env.CAPTURE_OUT ?? path.join(ROOT, 'public', 'shots');
const TMP_ROOT = path.join(ROOT, 'review', 'capture');
const argv = process.argv.slice(2);
const arg = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const BASE = (arg('url') ?? process.env.CAPTURE_URL ?? 'https://keystone-oc.vercel.app').replace(/\/$/, '');
const ONLY = arg('only')?.split(',').map((s) => s.trim());
const W = 1440;
const H = 900;
const DSF = 2;
const FPS = 30;
const FRAME_MS = 1000 / FPS;
const MAX_SPEED = 2;

const SPINNERS = ['[aria-busy="true"]', '[role="progressbar"]', '.animate-spin', '.spinner', '[data-loading="true"]'].join(', ');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Pause + seek every document animation to virtual time `vt` (ms). New animations are adopted at their current time.
// Returns whether a spinner / busy element is visible.
const STEP_JS = `(vt) => {
  const w = window; w.__ks = w.__ks || new WeakMap();
  for (const a of document.getAnimations()) {
    let s = w.__ks.get(a);
    if (s === undefined) { s = vt - (Number(a.currentTime) || 0); w.__ks.set(a, s); }
    try { a.currentTime = Math.max(0, vt - s); } catch (e) {}
  }
  const sp = [...document.querySelectorAll(${JSON.stringify(SPINNERS)})];
  return sp.some((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05; });
}`;

// Init script: report a hardware WebGL renderer (the app falls back to a still image on software GPUs), and
// optionally replay a prefetched /api/pitch stream at a natural pace on the (frozen, stepped) page clock.
const INIT_JS = `(() => {
  const fake = 'ANGLE (Apple, Apple M2, OpenGL 4.1)';
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    const orig = C.prototype.getParameter;
    C.prototype.getParameter = function (p) { if (p === 0x9246) return fake; return orig.call(this, p); };
  }
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input && input.url;
    const replay = window.__ksPitch;
    if (replay && url && url.includes('/api/pitch')) {
      const enc = new TextEncoder();
      const text = replay.body;
      let i = 0;
      const stream = new ReadableStream({
        start(ctrl) {
          const tick = () => {
            if (i >= text.length) { ctrl.close(); return; }
            const n = Math.max(1, Math.round(replay.charsPerTick * (0.6 + Math.random() * 0.8)));
            ctrl.enqueue(enc.encode(text.slice(i, i + n))); i += n;
            setTimeout(tick, replay.tickMs);
          };
          setTimeout(tick, replay.firstMs);
        },
      });
      return new Response(stream, {status: 200, headers: replay.headers});
    }
    return realFetch(input, init);
  };
})();`;

type Log = {id: SlotId; status: 'captured' | 'kept-placeholder'; detail: string};
const log: Log[] = [];

// ---------------------------------------------------------------- the stepped take
class Take {
  dir: string;
  frames: string[] = [];
  cursor: ([number, number] | null)[] = [];
  clicks: number[] = [];
  busy: number[] = [];
  marks: Record<string, number> = {};
  points: Record<string, [number, number]> = {};
  mouse = {x: W * 0.62, y: H * 0.62, visible: false};
  vt = 0;
  private cdp: any;
  constructor(public ctx: any, public page: Page, id: SlotId) {
    this.dir = path.join(TMP_ROOT, id);
    fs.rmSync(this.dir, {recursive: true, force: true});
    fs.mkdirSync(this.dir, {recursive: true});
  }

  /** Freeze page time and the animation timeline. Everything after this is stepped. */
  async freeze() {
    const now = await this.page.evaluate(() => Date.now()).catch(() => Date.now());
    await this.ctx.clock.pauseAt(new Date(now + 20));
    await this.refreeze();
    await this.page.evaluate(() => ((window as any).__ks = new WeakMap())).catch(() => undefined);
  }
  /** Re-apply the timeline freeze (needed after a full document navigation). */
  async refreeze() {
    this.cdp = await this.ctx.newCDPSession(this.page);
    await this.cdp.send('Animation.enable');
    await this.cdp.send('Animation.setPlaybackRate', {playbackRate: 0});
  }

  async frame() {
    await this.ctx.clock.runFor(FRAME_MS);
    this.vt += FRAME_MS;
    const busy = await this.page.evaluate(`(${STEP_JS})(${this.vt})`).catch(() => false);
    const file = path.join(this.dir, `f${String(this.frames.length).padStart(5, '0')}.jpg`);
    // CDP capture is ~5× faster than page.screenshot and reflects the frame just stepped
    const shot = await this.cdp.send('Page.captureScreenshot', {format: 'jpeg', quality: 93, optimizeForSpeed: true});
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    if (busy) this.busy.push(this.frames.length);
    this.frames.push(file);
    this.cursor.push(this.mouse.visible ? [this.mouse.x, this.mouse.y] : null);
  }
  async wait(ms: number) {
    for (let i = 0; i < Math.round(ms / FRAME_MS); i++) await this.frame();
  }
  /** Step until `cond` is true (checked every 2 frames), at least `minMs`, at most `maxMs`. */
  async until(cond: () => Promise<boolean>, maxMs: number, minMs = 0, what = 'condition') {
    const start = this.frames.length;
    for (;;) {
      const elapsed = (this.frames.length - start) * FRAME_MS;
      if (elapsed >= minMs && (this.frames.length - start) % 2 === 0 && (await cond().catch(() => false))) return;
      if (elapsed > maxMs) throw new Error(`timed out waiting for ${what}`);
      await this.frame();
    }
  }
  mark(name: string) {
    this.marks[name] = this.frames.length;
  }

  async center(target: Locator | [number, number]): Promise<[number, number]> {
    if (Array.isArray(target)) return target as [number, number];
    await target.scrollIntoViewIfNeeded({timeout: 5000}).catch(() => undefined);
    const box = await target.boundingBox();
    if (!box) throw new Error('target has no box');
    return [box.x + box.width / 2, box.y + box.height / 2];
  }
  /** Human-like move: eased in/out along a gently arced path; duration grows with distance. */
  async moveTo(target: Locator | [number, number], ms?: number) {
    const [tx, ty] = await this.center(target);
    if (!this.mouse.visible) {
      this.mouse.visible = true;
      await this.page.mouse.move(this.mouse.x, this.mouse.y);
    }
    const {x: sx, y: sy} = this.mouse;
    const dist = Math.hypot(tx - sx, ty - sy);
    const dur = ms ?? clamp(420 + dist * 0.45, 450, 1100);
    const n = Math.max(2, Math.round(dur / FRAME_MS));
    // control point offset perpendicular to the path (hands arc slightly)
    const nx = -(ty - sy) / (dist || 1);
    const ny = (tx - sx) / (dist || 1);
    const bend = Math.min(60, dist * 0.12) * (tx > sx ? 1 : -1);
    const cx = (sx + tx) / 2 + nx * bend;
    const cy = (sy + ty) / 2 + ny * bend;
    for (let i = 1; i <= n; i++) {
      const t = easeInOut(i / n);
      const x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * tx;
      const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ty;
      this.mouse.x = x;
      this.mouse.y = y;
      await this.page.mouse.move(x, y);
      await this.frame();
    }
  }
  async click(target?: Locator | [number, number], name?: string) {
    if (target) await this.moveTo(target);
    await this.wait(300);
    if (name) this.mark(name);
    if (name) this.points[name] = [this.mouse.x, this.mouse.y];
    this.clicks.push(this.frames.length);
    await this.page.mouse.down();
    await this.frame();
    await this.frame();
    await this.page.mouse.up();
    await this.frame();
  }
  async drag(from: Locator | [number, number], to: [number, number] | ((from: [number, number]) => [number, number]), ms = 800, name?: string) {
    await this.moveTo(from);
    await this.wait(260);
    const start: [number, number] = [this.mouse.x, this.mouse.y];
    const end = typeof to === 'function' ? to(start) : to;
    if (name) {
      this.mark(name);
      this.points[name] = start;
    }
    this.clicks.push(this.frames.length);
    await this.page.mouse.down();
    await this.frame();
    const n = Math.round(ms / FRAME_MS);
    for (let i = 1; i <= n; i++) {
      const t = easeInOut(i / n);
      this.mouse.x = start[0] + (end[0] - start[0]) * t;
      this.mouse.y = start[1] + (end[1] - start[1]) * t;
      await this.page.mouse.move(this.mouse.x, this.mouse.y);
      await this.frame();
    }
    await this.wait(120);
    await this.page.mouse.up();
    await this.frame();
  }
  async press(key: string, name?: string) {
    if (name) this.mark(name);
    await this.page.keyboard.press(key);
    await this.frame();
  }
}

// ---------------------------------------------------------------- page helpers
const spinnerVisible = async (page: Page) => page.evaluate(`(${STEP_JS.replace('for (const a of document.getAnimations())', 'for (const a of [])')})(0)`).catch(() => false);

/** Real-time settle (before freezing): network idle and no spinner. */
const settled = async (page: Page, timeout = 25000) => {
  const until = Date.now() + timeout;
  await page.waitForLoadState('networkidle', {timeout}).catch(() => undefined);
  while (Date.now() < until) {
    if (!(await spinnerVisible(page))) {
      await sleep(500);
      if (!(await spinnerVisible(page))) return;
    }
    await sleep(250);
  }
  throw new Error('page never settled (spinner still visible)');
};
const visible = async (l: Locator) => (await l.count()) > 0 && (await l.first().isVisible());
const go = async (page: Page, p: string, waitUntil = 'load') => {
  const res = await page.goto(BASE + p, {waitUntil, timeout: 60000});
  if (res && res.status() >= 400) throw new Error(`${p} returned ${res.status()}`);
};
const inView = (page: Page, sel: string) =>
  page.evaluate((s: string) => {
    const e = document.querySelector(s);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    return r.top >= -2 && r.top < innerHeight * 0.5 && r.height > 0;
  }, sel);

// ---------------------------------------------------------------- slots
type Plan = {key: string; keyAt?: number; zooms: {mark: string; offset: number; at?: 'point' | [number, number]; scale: number}[]};
type SlotFn = (t: Take) => Promise<Plan>;

const SLOTS: Record<SlotId, SlotFn> = {
  // Fresh load of /, recorded from the first paint through the title card's handoff to the hero.
  'intro-logo': async (t) => {
    await t.page.goto('about:blank');
    await t.freeze();
    await t.page.goto(BASE + '/', {waitUntil: 'commit', timeout: 60000});
    await t.refreeze();
    t.mark('start');
    await t.until(() => visible(t.page.locator('[data-testid=intro-lockup]')), 9000, 600, 'intro lockup');
    await t.wait(700); // lockup fully formed
    t.mark('key');
    await t.until(async () => !(await visible(t.page.locator('[data-testid=intro]'))), 6000, 300, 'intro handoff');
    await t.wait(500);
    t.mark('end');
    return {key: 'key', keyAt: LOGO_LOCK, zooms: []};
  },

  // Landing: press Down into "The law changed in 2024" and record its auto-play to the held state.
  'law-lot': async (t) => {
    await go(t.page, '/');
    await sleep(8000); // intro plays, hero settles
    await t.page.click('button[aria-label="Go to section 3"]');
    await sleep(7500); // luck section animation finishes
    await settled(t.page);
    await t.freeze();
    await t.wait(200);
    await t.press('ArrowDown', 'start');
    await t.until(() => inView(t.page, 'section#law, [data-testid=section-arrow-3]').then(async () => (await t.page.evaluate(() => scrollY)) > 2600), 3000, 0, 'law section');
    t.mark('arrived');
    await t.until(() => visible(t.page.locator('[data-testid=replay-3]')), 9000, 1500, 'law auto-play to finish');
    await t.wait(400);
    t.mark('end');
    t.marks.key = t.marks.arrived + Math.round(((t.marks.end - t.marks.arrived) * 0.62));
    return {key: 'key', zooms: [{mark: 'key', offset: -14, at: [0.66, 0.66], scale: 1.12}]};
  },

  // Landing: Down into "From luck to a system": waiting for a city vs. searching every parcel.
  'search-vs-wait': async (t) => {
    await go(t.page, '/');
    await sleep(8000);
    await t.page.click('button[aria-label="Go to section 2"]');
    await sleep(7500);
    await settled(t.page);
    await t.freeze();
    await t.wait(200);
    await t.press('ArrowDown', 'start');
    await t.until(async () => (await t.page.evaluate(() => scrollY)) > 1700, 3000, 0, 'luck section');
    t.mark('arrived');
    const withKeystone = t.page.getByText(/^With Keystone$/).first();
    await t.until(async () => (await visible(withKeystone)) && (await withKeystone.evaluate((e: Element) => {
      let o = 1;
      for (let n: Element | null = e; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o > 0.95;
    })), 12000, 1000, '"With Keystone" card');
    t.mark('key');
    await t.until(() => visible(t.page.locator('[data-testid=replay-2]')), 6000, 600, 'luck auto-play to finish');
    await t.wait(300);
    t.mark('end');
    return {key: 'key', zooms: []};
  },

  // /sites: map load animation, "Eligible only", "Near transit", totals roll, hover the top-scoring marker.
  'site-finder': async (t) => {
    await t.page.goto('about:blank');
    await t.freeze();
    await t.page.goto(BASE + '/sites', {waitUntil: 'commit', timeout: 60000});
    await t.refreeze();
    t.mark('start');
    await t.until(async () => (await t.page.locator('[data-testid=oc-map] g[aria-label]').count()) > 30 && !(await spinnerVisible(t.page)), 15000, 1200, 'map markers');
    await t.wait(900); // load animation lands
    t.mark('loaded');
    t.mouse = {x: 330, y: 470, visible: false}; // enter over the filter panel, not across the map (no stray tooltips)
    await t.click(t.page.locator('[data-testid=filter-eligible]'), 'eligible');
    await t.wait(800);
    await t.click(t.page.locator('[data-testid=filter-transit]'), 'transit');
    await t.wait(1200); // totals roll
    const best = await t.page.evaluate(() => {
      let top: {fit: number; x: number; y: number} | null = null;
      for (const g of document.querySelectorAll('[data-testid=oc-map] g[aria-label]')) {
        const m = /fit (\d+)/.exec(g.getAttribute('aria-label') || '');
        const r = g.getBoundingClientRect();
        if (!m || r.width === 0 || r.top < 300 || r.bottom > 860 || r.left < 520 || r.right > 1340) continue;
        const fit = Number(m[1]);
        if (!top || fit > top.fit) top = {fit, x: r.x + r.width / 2, y: r.y + r.height / 2};
      }
      return top;
    });
    if (!best) throw new Error('no marker to hover');
    await t.moveTo([best.x, best.y]);
    t.mark('hover');
    t.points.hover = [best.x, best.y];
    await t.wait(1300); // its card grows
    t.mark('end');
    return {
      key: 'eligible',
      zooms: [
        {mark: 'eligible', offset: -16, at: 'point', scale: 1.3},
        {mark: 'hover', offset: -10, at: 'point', scale: 1.16},
      ],
    };
  },

  // /scan: first sample aerial → scan sweep + polygon tracing → drag one vertex, area updates.
  'lot-scan': async (t) => {
    await go(t.page, '/scan');
    await settled(t.page);
    await t.freeze();
    t.mark('start');
    t.mouse = {x: 980, y: 700, visible: false};
    await t.click(t.page.locator('[data-testid=sample-1]'), 'sample');
    await t.wait(500);
    const scan = t.page.getByRole('button', {name: /^scan lot$/i});
    await t.until(() => visible(scan), 4000, 0, '"Scan lot"');
    await t.click(scan, 'scan');
    await t.until(async () => (await visible(t.page.getByRole('button', {name: /scan again/i}))) && !(await spinnerVisible(t.page)), 15000, 900, 'scan result');
    await t.wait(700);
    t.mark('traced');
    // a draggable vertex: small circle handles drawn over the aerial
    const handle = await t.page.evaluate(() => {
      const out: {x: number; y: number}[] = [];
      for (const c of document.querySelectorAll('[data-testid=scan-page] svg circle')) {
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        if (r.width >= 6 && r.width <= 26 && r.top > 160 && r.bottom < 880 && r.left > 60 && r.right < 820 && (cs.cursor.includes('grab') || cs.cursor.includes('move') || cs.cursor.includes('pointer')))
          out.push({x: r.x + r.width / 2, y: r.y + r.height / 2});
      }
      return out.sort((a, b) => b.x + b.y - (a.x + a.y))[0] ?? null;
    });
    if (!handle) throw new Error('no draggable vertex found');
    await t.drag([handle.x, handle.y], ([x, y]) => [x + 46, y + 34], 800, 'vertex');
    await t.wait(900); // numbers update
    t.mark('end');
    return {
      key: 'scan',
      zooms: [
        {mark: 'scan', offset: -12, at: [0.36, 0.55], scale: 1.12},
        {mark: 'vertex', offset: -12, at: 'point', scale: 1.3},
      ],
    };
  },

  // First eligible site → Plan Studio → Generate → homes rise row by row → sun slider → Today / Plan.
  'plan-studio': async (t) => {
    await go(t.page, '/sites');
    await settled(t.page);
    await t.page.locator('[data-testid=filter-eligible]').click();
    await sleep(1200);
    await t.page.locator('[data-testid=result-row]').first().click();
    await t.page.waitForURL(/\/sites\/[^/?]+/, {timeout: 20000});
    await settled(t.page);
    const open = t.page.getByRole('link', {name: /open in plan studio/i}).first();
    await open.click();
    await t.page.waitForURL(/\/plan\//, {timeout: 20000});
    await settled(t.page);
    await t.page.locator('[data-testid=plan-viewport] canvas').first().waitFor({timeout: 20000});
    await sleep(2500);
    await t.freeze();
    t.mark('start');
    t.mouse = {x: 760, y: 560, visible: false};
    await t.click(t.page.locator('[data-testid=generate]'), 'generate');
    await t.wait(2600); // homes rise row by row
    t.mark('built');
    const sun = t.page.locator('[data-testid=sun-slider]');
    const box = await sun.boundingBox();
    if (!box) throw new Error('sun slider has no box');
    await t.drag([box.x + box.width * 0.55, box.y + box.height / 2], [box.x + box.width * 0.88, box.y + box.height / 2], 800, 'sun');
    await t.wait(500);
    await t.click(t.page.getByRole('radio', {name: /^today$/i}).first(), 'before');
    await t.wait(900);
    await t.click(t.page.getByRole('radio', {name: /^plan$/i}).first(), 'after');
    await t.wait(900);
    t.mark('end');
    return {
      key: 'generate',
      zooms: [
        {mark: 'generate', offset: -16, at: 'point', scale: 1.24},
        {mark: 'generate', offset: 14, at: [0.42, 0.52], scale: 1.1},
        {mark: 'sun', offset: -8, at: 'point', scale: 1.2},
        {mark: 'before', offset: -6, at: [0.4, 0.5], scale: 1.06},
      ],
    };
  },

  // The same site's Pitch Kit → Español → the letter writes itself.
  'pitch-kit': async (t) => {
    await go(t.page, '/sites');
    await settled(t.page);
    await t.page.locator('[data-testid=filter-eligible]').click();
    await sleep(1200);
    await t.page.locator('[data-testid=result-row]').first().click();
    await t.page.waitForURL(/\/sites\/[^/?]+/, {timeout: 20000});
    await settled(t.page);
    const siteId = new URL(t.page.url()).pathname.split('/').pop();
    // the real letter, from the live API (same request the button makes)
    const res = await t.page.request.post(BASE + '/api/pitch', {data: {parcelId: siteId, lang: 'es', keepSpaces: undefined}, timeout: 90000});
    const body = await res.text();
    if (!res.ok() || body.trim().length < 200) throw new Error(`/api/pitch returned ${res.status()} (${body.length} chars)`);
    const headers = Object.fromEntries(Object.entries(res.headers()).filter(([k]) => k === 'content-type' || k.startsWith('x-')));
    await t.page.getByRole('link', {name: /create pitch kit/i}).first().click();
    await t.page.waitForURL(/\/pitch\//, {timeout: 20000});
    await settled(t.page);
    // ~180 characters per second, like the live stream
    await t.page.evaluate((r: any) => ((window as any).__ksPitch = r), {body, headers, charsPerTick: 6, tickMs: 33, firstMs: 350});
    await t.freeze();
    t.mark('start');
    t.mouse = {x: 820, y: 600, visible: false};
    await t.click(t.page.getByRole('radio', {name: /^español$/i}).first(), 'spanish');
    await t.wait(450);
    await t.click(t.page.locator('[data-testid=draft-letter]'), 'draft');
    await t.until(async () => (await t.page.locator('[data-testid=letter-text]').innerText()).length > 420, 9000, 1500, 'letter text');
    await t.wait(600);
    t.mark('end');
    return {
      key: 'spanish',
      zooms: [
        {mark: 'spanish', offset: -16, at: 'point', scale: 1.3},
        {mark: 'draft', offset: 10, at: [0.62, 0.5], scale: 1.16},
      ],
    };
  },
};

// ---------------------------------------------------------------- edit: speed ramps onto the beat
type Remap = {src: number[]; speedsUsed: [number, number]};

/**
 * Map L output frames to source frames: 1× in a window around the key, up to 2× before/after (eased ramps),
 * key source frame lands exactly on output frame K. Holds the first/last frame if the take is short.
 */
const remap = (L: number, K: number, keySrc: number, firstSrc: number, lastSrc: number): Remap => {
  const pre1 = Math.min(12, K); // 1× frames before key
  const post1 = Math.min(18, L - K); // 1× frames after key
  const preOut = K - pre1;
  const postOut = L - K - post1;
  const RAMP = 8;
  // source frames consumed by n output frames whose speed ramps 1→s over the RAMP frames nearest the key, then holds s
  const total = (sp: number, n: number) => {
    let sum = 0;
    for (let d = 1; d <= n; d++) sum += d <= RAMP ? 1 + (sp - 1) * (d / RAMP) : sp;
    return sum;
  };
  const solve = (avail: number, n: number) => {
    if (n <= 0) return 1;
    if (total(MAX_SPEED, n) <= avail) return MAX_SPEED;
    if (total(1, n) >= avail) return 1;
    let lo = 1;
    let hi = MAX_SPEED;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (total(m, n) > avail) hi = m;
      else lo = m;
    }
    return lo;
  };
  const sPre = solve(keySrc - pre1 - firstSrc, preOut);
  const sPost = solve(lastSrc - (keySrc + post1), postOut);
  // speed per output frame
  const v: number[] = [];
  for (let o = 0; o < L; o++) {
    if (o < preOut) {
      const d = preOut - o; // frames until the 1× window
      v.push(d <= RAMP ? 1 + (sPre - 1) * (d / RAMP) : sPre);
    } else if (o < K + post1) v.push(1);
    else {
      const d = o - (K + post1) + 1;
      v.push(d <= RAMP ? 1 + (sPost - 1) * (d / RAMP) : sPost);
    }
  }
  // integrate from the key outward
  const src = new Array(L).fill(0);
  src[K] = keySrc;
  for (let o = K - 1; o >= 0; o--) src[o] = src[o + 1] - v[o];
  for (let o = K + 1; o < L; o++) src[o] = src[o - 1] + v[o - 1];
  return {src: src.map((s) => clamp(s, firstSrc, lastSrc)), speedsUsed: [sPre, sPost]};
};

const encode = (t: Take, src: number[], out: string) => {
  const list = path.join(t.dir, 'list.txt');
  const lines: string[] = [];
  for (const s of src) lines.push(`file '${t.frames[Math.round(s)]}'`, `duration ${(1 / FPS).toFixed(6)}`);
  lines.push(`file '${t.frames[Math.round(src[src.length - 1])]}'`);
  fs.writeFileSync(list, lines.join('\n') + '\n');
  const r = spawnSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', `fps=${FPS},scale=${W * DSF}:${H * DSF}:flags=lanczos,format=yuv420p`,
    '-frames:v', String(src.length), '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-movflags', '+faststart', '-an', out,
  ]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.toString().slice(-400)}`);
};

const cursorAt = (t: Take, s: number): [number, number] | null => {
  const a = t.cursor[Math.floor(s)];
  const b = t.cursor[Math.min(t.cursor.length - 1, Math.ceil(s))];
  if (!a || !b) return a ?? b ?? null;
  const k = s - Math.floor(s);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
};

const finish = (t: Take, id: SlotId, plan: Plan) => {
  const L = SLOT_FRAMES[id];
  const K = plan.keyAt ?? keyFrameFor(id);
  const keySrc = t.marks[plan.key];
  if (keySrc === undefined) throw new Error(`key mark "${plan.key}" missing`);
  const firstSrc = t.marks.start ?? 0;
  const lastSrc = Math.min(t.frames.length - 1, t.marks.end ?? t.frames.length - 1);
  const {src, speedsUsed} = remap(L, K, keySrc, firstSrc, lastSrc);
  // reject takes where a spinner is on screen inside the used range
  const used = new Set(src.map((s) => Math.round(s)));
  const busyUsed = t.busy.filter((b) => used.has(b));
  if (id !== 'pitch-kit' && busyUsed.length > 2) throw new Error(`spinner visible in ${busyUsed.length} used frames`);

  const outFrame = (srcFrame: number) => {
    let best = 0;
    for (let o = 0; o < L; o++) if (Math.abs(src[o] - srcFrame) < Math.abs(src[best] - srcFrame)) best = o;
    return best;
  };
  const cursor = src.map((s) => {
    const c = cursorAt(t, s);
    return c ? [Number((c[0] / W).toFixed(4)), Number((c[1] / H).toFixed(4))] : null;
  });
  const clicks = t.clicks.filter((c) => c >= src[0] && c <= src[L - 1]).map(outFrame);
  const zooms = plan.zooms
    .filter((z) => t.marks[z.mark] !== undefined)
    .map((z) => {
      const at = outFrame(t.marks[z.mark]) + z.offset;
      const p = z.at === 'point' ? t.points[z.mark] : z.at ? [z.at[0] * W, z.at[1] * H] : [W / 2, H / 2];
      return {at: clamp(at, 0, L - 1), x: Number((p![0] / W).toFixed(4)), y: Number((p![1] / H).toFixed(4)), scale: z.scale};
    })
    .sort((a, b) => a.at - b.at);

  const tmpMp4 = path.join(t.dir, `${id}.mp4`);
  encode(t, src, tmpMp4);
  const stillTmp = path.join(t.dir, `${id}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', t.frames[keySrc + 6] ?? t.frames[keySrc], stillTmp]);
  const meta = {
    id,
    frames: L,
    keyFrame: K,
    speed: {before: Number(speedsUsed[0].toFixed(2)), after: Number(speedsUsed[1].toFixed(2))},
    source: {base: BASE, viewport: [W, H], deviceScaleFactor: DSF, takeFrames: t.frames.length, capturedAt: new Date().toISOString()},
    cursor,
    clicks,
    zooms,
  };
  fs.copyFileSync(tmpMp4, path.join(SHOTS, `${id}.mp4`));
  fs.copyFileSync(stillTmp, path.join(SHOTS, `${id}.png`));
  fs.writeFileSync(path.join(SHOTS, `${id}.json`), JSON.stringify(meta) + '\n');
  return `${L} frames, key at ${K}, ramps ${meta.speed.before}× / ${meta.speed.after}×, take ${t.frames.length} frames`;
};

// ---------------------------------------------------------------- run
const BROWSER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--font-render-hinting=none'];

const captureOnce = async (browser: any, id: SlotId) => {
  const ctx = await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: DSF, colorScheme: 'light', reducedMotion: 'no-preference', locale: 'en-US'});
  await ctx.addInitScript(INIT_JS);
  await ctx.clock.install();
  const page = await ctx.newPage();
  const t = new Take(ctx, page, id);
  try {
    const plan = await SLOTS[id](t);
    return finish(t, id, plan);
  } finally {
    await ctx.close().catch(() => undefined);
  }
};

const main = async () => {
  const {chromium} = loadPlaywright();
  fs.mkdirSync(SHOTS, {recursive: true});
  const exe = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch({args: BROWSER_ARGS, ...(fs.existsSync(exe) ? {executablePath: exe} : {})});
  const ids = (Object.keys(SLOTS) as SlotId[]).filter((id) => !ONLY || ONLY.includes(id));
  console.log(`capture: ${BASE} → ${ids.join(', ')}`);
  const queue = [...ids];
  const PARALLEL = Number(process.env.CAPTURE_PARALLEL ?? 2);
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) await runSlot(id);
  };
  const runSlot = async (id: SlotId) => {
    let lastErr = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = Date.now();
      try {
        const detail = await captureOnce(browser, id);
        log.push({id, status: 'captured', detail});
        console.log(`✓ ${id}: ${detail} (${Math.round((Date.now() - t0) / 1000)} s)`);
        lastErr = '';
        break;
      } catch (e: any) {
        lastErr = String(e?.message ?? e).split('\n')[0];
        console.warn(`  ${id} attempt ${attempt} failed: ${lastErr}`);
      }
    }
    if (lastErr) log.push({id, status: 'kept-placeholder', detail: lastErr});
  };
  await Promise.all(Array.from({length: PARALLEL}, worker));
  await browser.close();
  const prev = fs.existsSync(path.join(SHOTS, 'capture-log.json')) ? JSON.parse(fs.readFileSync(path.join(SHOTS, 'capture-log.json'), 'utf8')) : {slots: []};
  const merged = [...prev.slots.filter((s: Log) => !log.some((l) => l.id === s.id)), ...log];
  fs.writeFileSync(path.join(SHOTS, 'capture-log.json'), JSON.stringify({base: BASE, at: new Date().toISOString(), slots: merged}, null, 2) + '\n');
  const ok = merged.filter((l: Log) => l.status === 'captured').map((l: Log) => l.id);
  const kept = merged.filter((l: Log) => l.status !== 'captured').map((l: Log) => `${l.id} (${l.detail})`);
  console.log(`capture: real footage → ${ok.join(', ') || 'none'}${kept.length ? `; placeholders kept → ${kept.join('; ')}` : ''}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
