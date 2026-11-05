// VFX NexgerLab opening effect. draw(t) is a pure function of time, like a pixelfx "pure" effect,
// so playback, the storyboard and a future export all show the same pixels.
(function () {
  const INK = '#0B1220', CY = '#32E6F2', VI = '#9B6CFF', MG = '#F05CFF', WH = '#F3F7FC', BL = '#2F6BFF';
  const COLORS = [CY, VI, MG, WH, BL];
  const LW = 320, LH = 180, CX = 160, CY0 = 80;
  const T = { charge: 180, hit: 700, free: 790, reveal: 1250, settle: 1700, end: 2000 };
  const FREEZE = T.free - T.hit;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const MOSAIC = [8, 12, 18, 28, 44, 70, 110, 180];
  const LOGO = { x: 88, y: 26, w: 144, h: 96 }; // logo box on the 320x180 art grid
  const CUBES = [[0.83, 0.5, 3], [0.89, 0.57, 4], [0.84, 0.67, 3], [0.93, 0.69, 2]];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeIn = (p) => p * p * p;
  const easeOut = (p) => 1 - (1 - p) * (1 - p) * (1 - p);
  function rnd(i, s) {
    let x = Math.imul(i + 1, 2654435761) ^ Math.imul(s + 7, 40503);
    x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13; x = Math.imul(x, 3266489917); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  // the freeze is a stop in simulated time, the same trick an act's hit-stop uses
  const simTime = (t) => (t < T.hit ? t : t < T.free ? T.hit : t - FREEZE);

  // an isometric cube: (x, y) is its top corner, r sets the size
  function cube(c, x, y, r) {
    for (let d = 0; d < r * 2; d++) {
      const top = y + r * 2 - Math.ceil(d / 2);
      c.fillStyle = '#2F6BFF'; c.fillRect(x - d - 1, top, 1, r * 2);
      c.fillStyle = '#6C5BFF'; c.fillRect(x + d, top, 1, r * 2);
    }
    c.fillStyle = '#BDF7FF';
    for (let i = 0; i < r; i++) {
      c.fillRect(x - (i + 1) * 2, y + i, (i + 1) * 4, 1);
      c.fillRect(x - (r - i) * 2, y + r + i, (r - i) * 4, 1);
    }
  }

  function mount(canvas, img) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, K = W / LW;
    const lo = document.createElement('canvas'); lo.width = LW; lo.height = LH;
    const c = lo.getContext('2d');
    const mos = document.createElement('canvas'); const m = mos.getContext('2d');
    const box = { x: LOGO.x * K, y: LOGO.y * K, w: LOGO.w * K, h: LOGO.h * K };

    function pixelStage(t, s) {
      c.fillStyle = INK; c.fillRect(0, 0, LW, LH);
      // the first lit pixel: nothing else on screen yet
      if (t < T.charge + 80 && Math.floor(t / 60) % 2 === 0) { c.fillStyle = CY; c.fillRect(CX, CY0, 1, 1); }

      if (s >= T.charge && s < T.hit + 6) {
        const p = clamp((s - T.charge) / (T.hit - T.charge));
        // particles pulled to the middle, slow then fast
        for (let i = 0; i < 96; i++) {
          const d = rnd(i, 1) * 0.35, q = easeIn(clamp((p - d) / (1 - d)));
          if (p < d) continue;
          const a = rnd(i, 2) * Math.PI * 2 + (1 - q) * 1.4, r = (70 + rnd(i, 3) * 90) * (1 - q);
          c.fillStyle = COLORS[i % 4];
          c.fillRect(Math.round(CX + Math.cos(a) * r * 1.5), Math.round(CY0 + Math.sin(a) * r * 0.8), i % 7 === 0 ? 2 : 1, 1);
        }
        // the orbit draws itself; its head is the logo's ball
        const end = easeIn(p) * Math.PI * 2, rot = -0.24;
        for (let a = 0; a < end; a += 0.022) {
          const ex = Math.cos(a + 2.6) * 74, ey = Math.sin(a + 2.6) * 26;
          c.fillStyle = (end - a) < 1.2 ? CY : '#1E4FBF';
          c.fillRect(Math.round(CX + ex * Math.cos(rot) - ey * Math.sin(rot)), Math.round(CY0 + ex * Math.sin(rot) + ey * Math.cos(rot)), 1, 1);
        }
        const ex = Math.cos(end + 2.6) * 74, ey = Math.sin(end + 2.6) * 26;
        const hx = Math.round(CX + ex * Math.cos(rot) - ey * Math.sin(rot)), hy = Math.round(CY0 + ex * Math.sin(rot) + ey * Math.cos(rot));
        c.fillStyle = WH; c.fillRect(hx - 1, hy - 1, 3, 3);
        // the four cubes step in on 12 fps and land where the logo has them
        CUBES.forEach(([nx, ny, r], i) => {
          const q = clamp((p - 0.2 - i * 0.1) / 0.4), step = Math.floor(q * 6) / 6;
          if (q <= 0) return;
          cube(c, Math.round(LOGO.x + nx * LOGO.w + (1 - step) * 46), Math.round(LOGO.y + ny * LOGO.h), r);
        });
      }

      if (s >= T.hit) {
        const tt = (s - T.hit) / 1000;
        // the shock ring, dithered away as it spreads
        const p = clamp(tt / 0.46), R = easeOut(p) * 190;
        if (p < 1) {
          const dots = Math.ceil(R * 7) + 40;
          for (let i = 0; i < dots; i++) {
            if (rnd(i, 5) < p * 0.9) continue;
            const a = (i / dots) * Math.PI * 2;
            c.fillStyle = i % 5 === 0 ? VI : CY;
            c.fillRect(Math.round(CX + Math.cos(a) * R * 1.35), Math.round(CY0 + Math.sin(a) * R * 0.62), 2, 1);
          }
        }
        // sparks with gravity
        for (let i = 0; i < 110; i++) {
          const life = 0.28 + rnd(i, 6) * 0.62, q = tt / life;
          if (q >= 1) continue;
          const a = rnd(i, 7) * Math.PI * 2, v = 50 + rnd(i, 8) * 170;
          const x = CX + Math.cos(a) * v * tt, y = CY0 + Math.sin(a) * v * tt * 0.72 + 90 * tt * tt;
          if (q > 0.7 && (Math.floor(x) + Math.floor(y)) % 2) continue;
          c.fillStyle = COLORS[i % 5];
          c.fillRect(Math.round(x), Math.round(y), 1, i % 9 === 0 ? 2 : 1);
        }
      }
    }

    function logo(t, s) {
      if (s < T.hit) return;
      ctx.imageSmoothingEnabled = true;
      const step = Math.floor(((s - T.hit) / (T.reveal - FREEZE - T.hit)) * MOSAIC.length);
      if (step < MOSAIC.length) {
        const n = MOSAIC[Math.max(0, step)];
        mos.width = n; mos.height = Math.round((n * 2) / 3);
        m.imageSmoothingEnabled = true; m.drawImage(img, 0, 0, mos.width, mos.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mos, box.x, box.y, box.w, box.h);
      } else {
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, box.x, box.y, box.w, box.h);
      }
    }

    function words(t) {
      if (t < T.reveal - 120) return;
      const name = 'VFX NexgerLab', n = Math.floor((t - (T.reveal - 120)) / 34);
      ctx.fillStyle = WH; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = `600 ${Math.round(W * 0.042)}px "Pixelify Sans", ui-monospace, monospace`;
      ctx.fillText(name.slice(0, n), W / 2, H * 0.755);
      if (t < T.reveal) return;
      const p = clamp((t - T.reveal) / (T.settle - T.reveal - 60)), bars = 28, bw = W * 0.0088, gap = W * 0.003;
      const x0 = W / 2 - ((bw + gap) * bars) / 2, y = H * 0.81;
      for (let i = 0; i < bars; i++) {
        ctx.fillStyle = i / bars < p ? CY : '#26344A';
        ctx.fillRect(Math.round(x0 + i * (bw + gap)), Math.round(y), Math.round(bw), Math.round(H * 0.008));
      }
      ctx.fillStyle = '#9AAAC0';
      ctx.font = `400 ${Math.round(W * 0.0145)}px "Noto Sans Thai", system-ui, sans-serif`;
      ctx.fillText(p < 0.5 ? 'กำลังเตรียมเอนจินเรนเดอร์' : p < 1 ? 'กำลังเปิดคลังเอฟเฟกต์' : 'พร้อมใช้งาน ทำงานบนเครื่องของคุณ', W / 2, H * 0.875);
    }

    function dissolve(t) {
      if (t < T.settle) return;
      const p = clamp((t - T.settle) / (T.end - T.settle)) * 16, cell = Math.ceil(W / 64);
      ctx.fillStyle = INK;
      for (let y = 0, j = 0; y < H; y += cell, j++)
        for (let x = 0, i = 0; x < W; x += cell, i++)
          if (BAYER[((j & 3) << 2) | (i & 3)] < p) ctx.fillRect(x, y, cell, cell);
    }

    function draw(t) {
      const s = simTime(t);
      pixelStage(t, s);
      const frozen = t >= T.hit && t < T.free;
      const sx = frozen ? (Math.floor(t / 30) % 2 ? K * 2 : -K * 2) : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lo, sx, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      logo(t, s);
      if (t >= T.hit && t < T.hit + 34) { ctx.fillStyle = '#E8FDFF'; ctx.fillRect(0, 0, W, H); }
      words(t);
      dissolve(t);
    }

    let raf = 0;
    function play(onEnd) {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const tick = (now) => {
        const t = now - start;
        draw(Math.min(t, T.end));
        if (t < T.end) raf = requestAnimationFrame(tick); else if (onEnd) onEnd();
      };
      raf = requestAnimationFrame(tick);
    }
    return { draw, play, stop: () => cancelAnimationFrame(raf) };
  }

  function load(url) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
  }
  window.NLSplash = { mount, load, T };
})();
