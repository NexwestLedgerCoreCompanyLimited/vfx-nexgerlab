// The opening effect. drawSplash is a pure function of time, so a frame always looks the same.

export const SPLASH_TIMING = {
  charge: 180,
  hit: 700,
  free: 790,
  reveal: 1250,
  settle: 1700,
  end: 2000,
} as const;

/** The settled frame: logo, wordmark and status, with every spark gone. */
export const STATIC_FRAME = 1690;

const T = SPLASH_TIMING;
const WORDMARK_DONE = 1580;
const INK = '#0B1220';
const CYAN = '#32E6F2';
const VIOLET = '#9B6CFF';
const MAGENTA = '#F05CFF';
const WHITE = '#F3F7FC';
const BLUE = '#2F6BFF';
const COLORS = [CYAN, VIOLET, MAGENTA, WHITE, BLUE];
const ART_W = 320;
const ART_H = 180;
const CENTER_X = 160;
const CENTER_Y = 80;
const FREEZE = T.free - T.hit;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const MOSAIC = [8, 12, 18, 28, 44, 70, 110, 180];
const LOGO = { x: 88, y: 26, w: 144, h: 96 };
const CUBES: ReadonlyArray<readonly [number, number, number]> = [
  [0.83, 0.5, 3],
  [0.89, 0.57, 4],
  [0.84, 0.67, 3],
  [0.93, 0.69, 2],
];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeIn = (p: number) => p * p * p;
const easeOut = (p: number) => 1 - (1 - p) * (1 - p) * (1 - p);

function rnd(i: number, s: number): number {
  let x = Math.imul(i + 1, 2654435761) ^ Math.imul(s + 7, 40503);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** The hit-stop is a stop in simulated time, the same trick an act's freeze uses. */
export function simTime(t: number): number {
  return t < T.hit ? t : t < T.free ? T.hit : t - FREEZE;
}

export function splashStart(o: { hasSeenSplash: boolean; reducedMotion: boolean }): number {
  if (o.reducedMotion) return STATIC_FRAME;
  return o.hasSeenSplash ? T.reveal : 0;
}

/** Waits on the settled frame until the app is ready; once it is, skips the rest of the hold. */
export function nextSplashTime(t: number, dt: number, ready: boolean): number {
  if (ready && t >= WORDMARK_DONE && t < T.settle) return T.settle;
  const next = Math.min(T.end, t + dt);
  return !ready && t <= STATIC_FRAME ? Math.min(next, STATIC_FRAME) : next;
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function cube(c: Ctx2D, x: number, y: number, r: number): void {
  for (let d = 0; d < r * 2; d++) {
    const top = y + r * 2 - Math.ceil(d / 2);
    c.fillStyle = BLUE;
    c.fillRect(x - d - 1, top, 1, r * 2);
    c.fillStyle = '#6C5BFF';
    c.fillRect(x + d, top, 1, r * 2);
  }
  c.fillStyle = '#BDF7FF';
  for (let i = 0; i < r; i++) {
    c.fillRect(x - (i + 1) * 2, y + i, (i + 1) * 4, 1);
    c.fillRect(x - (r - i) * 2, y + r + i, (r - i) * 4, 1);
  }
}

function drawCharge(c: Ctx2D, s: number): void {
  const p = clamp((s - T.charge) / (T.hit - T.charge));
  for (let i = 0; i < 96; i++) {
    const d = rnd(i, 1) * 0.35;
    if (p < d) continue;
    const q = easeIn(clamp((p - d) / (1 - d)));
    const a = rnd(i, 2) * Math.PI * 2 + (1 - q) * 1.4;
    const r = (70 + rnd(i, 3) * 90) * (1 - q);
    c.fillStyle = COLORS[i % 4]!;
    c.fillRect(
      Math.round(CENTER_X + Math.cos(a) * r * 1.5),
      Math.round(CENTER_Y + Math.sin(a) * r * 0.8),
      i % 7 === 0 ? 2 : 1,
      1,
    );
  }
  const end = easeIn(p) * Math.PI * 2;
  const rot = -0.24;
  const orbit = (a: number): [number, number] => {
    const ex = Math.cos(a + 2.6) * 74;
    const ey = Math.sin(a + 2.6) * 26;
    return [
      Math.round(CENTER_X + ex * Math.cos(rot) - ey * Math.sin(rot)),
      Math.round(CENTER_Y + ex * Math.sin(rot) + ey * Math.cos(rot)),
    ];
  };
  for (let a = 0; a < end; a += 0.022) {
    const [x, y] = orbit(a);
    c.fillStyle = end - a < 1.2 ? CYAN : '#1E4FBF';
    c.fillRect(x, y, 1, 1);
  }
  const [hx, hy] = orbit(end);
  c.fillStyle = WHITE;
  c.fillRect(hx - 1, hy - 1, 3, 3);
  CUBES.forEach(([nx, ny, r], i) => {
    const q = clamp((p - 0.2 - i * 0.1) / 0.4);
    if (q <= 0) return;
    const step = Math.floor(q * 6) / 6;
    cube(
      c,
      Math.round(LOGO.x + nx * LOGO.w + (1 - step) * 46),
      Math.round(LOGO.y + ny * LOGO.h),
      r,
    );
  });
}

function drawBurst(c: Ctx2D, s: number): void {
  const tt = (s - T.hit) / 1000;
  const p = clamp(tt / 0.46);
  if (p < 1) {
    const R = easeOut(p) * 190;
    const dots = Math.ceil(R * 7) + 40;
    for (let i = 0; i < dots; i++) {
      if (rnd(i, 5) < p * 0.9) continue;
      const a = (i / dots) * Math.PI * 2;
      c.fillStyle = i % 5 === 0 ? VIOLET : CYAN;
      c.fillRect(
        Math.round(CENTER_X + Math.cos(a) * R * 1.35),
        Math.round(CENTER_Y + Math.sin(a) * R * 0.62),
        2,
        1,
      );
    }
  }
  for (let i = 0; i < 110; i++) {
    const life = 0.28 + rnd(i, 6) * 0.62;
    const q = tt / life;
    if (q >= 1) continue;
    const a = rnd(i, 7) * Math.PI * 2;
    const v = 50 + rnd(i, 8) * 170;
    const x = CENTER_X + Math.cos(a) * v * tt;
    const y = CENTER_Y + Math.sin(a) * v * tt * 0.72 + 90 * tt * tt;
    if (q > 0.7 && (Math.floor(x) + Math.floor(y)) % 2) continue;
    c.fillStyle = COLORS[i % 5]!;
    c.fillRect(Math.round(x), Math.round(y), 1, i % 9 === 0 ? 2 : 1);
  }
}

function drawLogo(ctx: Ctx2D, logo: CanvasImageSource, s: number, k: number): void {
  const x = LOGO.x * k;
  const y = LOGO.y * k;
  const w = LOGO.w * k;
  const h = LOGO.h * k;
  const step = Math.floor(((s - T.hit) / (T.reveal - FREEZE - T.hit)) * MOSAIC.length);
  if (step >= MOSAIC.length) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logo, x, y, w, h);
    return;
  }
  const n = MOSAIC[Math.max(0, step)]!;
  const small = new OffscreenCanvas(n, Math.round((n * 2) / 3));
  const m = small.getContext('2d')!;
  m.imageSmoothingEnabled = true;
  m.drawImage(logo, 0, 0, small.width, small.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, x, y, w, h);
}

function drawWords(ctx: Ctx2D, t: number, W: number, H: number, o: SplashText): void {
  if (t < T.reveal - 120) return;
  const name = 'VFX NexgerLab';
  const shown = Math.floor((t - (T.reveal - 120)) / 34);
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(W * 0.042)}px "Pixelify Sans", ui-monospace, monospace`;
  ctx.fillText(name.slice(0, shown), W / 2, H * 0.755);
  if (t < T.reveal) return;
  const bars = 28;
  const bw = W * 0.0088;
  const gap = W * 0.003;
  const x0 = W / 2 - ((bw + gap) * bars) / 2;
  for (let i = 0; i < bars; i++) {
    ctx.fillStyle = i / bars < o.progress ? CYAN : '#26344A';
    ctx.fillRect(
      Math.round(x0 + i * (bw + gap)),
      Math.round(H * 0.81),
      Math.round(bw),
      Math.round(H * 0.008),
    );
  }
  ctx.fillStyle = '#A9B7CB';
  ctx.font = `400 ${Math.round(W * 0.0145)}px "Noto Sans Thai", system-ui, sans-serif`;
  ctx.fillText(o.status, W / 2, H * 0.875);
}

function drawDissolve(ctx: Ctx2D, t: number, W: number, H: number): void {
  const p = clamp((t - T.settle) / (T.end - T.settle)) * 16;
  const cell = Math.ceil(W / 64);
  ctx.fillStyle = INK;
  for (let y = 0, j = 0; y < H; y += cell, j++) {
    for (let x = 0, i = 0; x < W; x += cell, i++) {
      if (BAYER[((j & 3) << 2) | (i & 3)]! < p) ctx.fillRect(x, y, cell, cell);
    }
  }
}

export interface SplashText {
  progress: number;
  status: string;
}

export function drawSplash(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  t: number,
  text: SplashText,
): void {
  const { width: W, height: H } = ctx.canvas;
  const k = W / ART_W;
  const s = simTime(t);
  const art = new OffscreenCanvas(ART_W, ART_H);
  const c = art.getContext('2d')!;
  c.fillStyle = INK;
  c.fillRect(0, 0, ART_W, ART_H);
  if (t < T.charge + 80 && Math.floor(t / 60) % 2 === 0) {
    c.fillStyle = CYAN;
    c.fillRect(CENTER_X, CENTER_Y, 1, 1);
  }
  if (s >= T.charge && s < T.hit + 6) drawCharge(c, s);
  if (s >= T.hit) drawBurst(c, s);

  const frozen = t >= T.hit && t < T.free;
  const shake = frozen ? (Math.floor(t / 30) % 2 ? k * 2 : -k * 2) : 0;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, shake, 0, W, H);
  if (s >= T.hit) drawLogo(ctx, logo, s, k);
  if (t >= T.hit && t < T.hit + 34) {
    ctx.fillStyle = '#E8FDFF';
    ctx.fillRect(0, 0, W, H);
  }
  drawWords(ctx, t, W, H, text);
  if (t >= T.settle) drawDissolve(ctx, t, W, H);
}
