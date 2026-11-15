import * as THREE from 'three';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function tex(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, r: () => number, colors: string[], max = 2.2) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[(r() * colors.length) | 0]; const s = 0.5 + r() * max; g.fillRect(r() * w, r() * h, s, s); }
}

/** Asfalto gastado con parches, grietas y pintura vieja. Cubre el ancho de la calle por 32 m. */
export function asphaltTexture() {
  const [c, g] = canvas(512, 1024), r = rng(7);
  g.fillStyle = '#3b3a3d'; g.fillRect(0, 0, 512, 1024);
  speckle(g, 512, 1024, 26000, r, ['#2f2e31', '#48474b', '#55545a', '#333236', '#615f63']);
  for (let i = 0; i < 9; i++) { // parches de bacheo mal hechos
    g.fillStyle = r() < 0.5 ? 'rgba(20,20,22,.55)' : 'rgba(92,90,94,.45)';
    const x = r() * 440, y = r() * 960; g.beginPath(); g.roundRect(x, y, 40 + r() * 110, 30 + r() * 90, 6); g.fill();
  }
  g.strokeStyle = 'rgba(15,15,17,.75)'; g.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) { // grietas
    let x = r() * 512, y = r() * 1024; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 9; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 70; g.lineTo(x, y); }
    g.stroke();
  }
  // Capa de pintura en un lienzo aparte para poder desgastarla sin borrar el asfalto.
  const [pc, pg] = canvas(512, 1024);
  const paint = (x: number, y: number, w: number, h: number, col: string) => {
    pg.fillStyle = col; pg.fillRect(x, y, w, h); pg.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < w * h / 22; i++) { pg.fillStyle = `rgba(0,0,0,${r() * 0.9})`; pg.fillRect(x + r() * w, y + r() * h, 1 + r() * 4, 1 + r() * 6); }
    pg.globalCompositeOperation = 'source-over';
  };
  paint(22, 0, 9, 1024, '#e9e4d6'); paint(481, 0, 9, 1024, '#e9e4d6');
  for (let y = 0; y < 1024; y += 256) { paint(251, y + 20, 10, 120, '#e8b923'); paint(132, y + 150, 7, 70, '#e9e4d6'); paint(372, y + 150, 7, 70, '#e9e4d6'); }
  g.globalAlpha = 0.85; g.drawImage(pc, 0, 0); g.globalAlpha = 1;
  return tex(c, true);
}

export function sidewalkTexture() {
  const [c, g] = canvas(256, 256), r = rng(11);
  g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 5000, r, ['#a9a295', '#c7c0b2', '#9c9588']);
  g.strokeStyle = 'rgba(70,66,58,.6)'; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
  return tex(c, true);
}

export function groundTexture() {
  const [c, g] = canvas(512, 512), r = rng(3);
  g.fillStyle = '#b89c70'; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 22000, r, ['#a98d63', '#c6aa7e', '#9c8159', '#d0b68b'], 3);
  return tex(c, true);
}

/** Bache: mancha irregular con borde roto. Fondo transparente. */
export function bacheTexture(seed: number, deep: boolean) {
  const [c, g] = canvas(256, 256), r = rng(seed);
  const blob = (rad: number, jit: number) => {
    g.beginPath();
    for (let i = 0; i <= 22; i++) { const a = (i / 22) * Math.PI * 2, rr = rad * (1 - jit + r() * jit * 2); const x = 128 + Math.cos(a) * rr, y = 128 + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  };
  g.fillStyle = 'rgba(120,112,100,.55)'; blob(118, 0.1); g.fill();   // grava suelta
  g.fillStyle = '#6a655c'; blob(104, 0.1); g.fill();                  // borde roto claro
  g.fillStyle = '#26221f'; blob(92, 0.1); g.fill();                   // sombra de la pared
  const grd = g.createRadialGradient(118, 138, 8, 128, 128, 90);
  grd.addColorStop(0, deep ? '#0c0a09' : '#3d362e'); grd.addColorStop(1, deep ? '#1b1714' : '#4f463b');
  g.fillStyle = grd; blob(80, 0.12); g.fill();
  speckle(g, 256, 256, 500, r, ['rgba(150,140,125,.8)', 'rgba(30,28,25,.8)'], 3);
  if (deep) { g.fillStyle = 'rgba(70,110,130,.55)'; g.beginPath(); g.ellipse(120, 140, 44, 30, 0.3, 0, 7); g.fill(); } // agua estancada
  return tex(c);
}

export function puddleTexture() {
  const [c, g] = canvas(256, 256);
  const grd = g.createRadialGradient(128, 128, 20, 128, 128, 124);
  grd.addColorStop(0, 'rgba(60,84,96,.9)'); grd.addColorStop(0.75, 'rgba(50,66,74,.75)'); grd.addColorStop(1, 'rgba(40,50,56,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return tex(c);
}

const WALLS = ['#d9b38c', '#c97b5a', '#e6d3a8', '#9fb7b0', '#d6a04e', '#b9c2cb', '#c98d9a', '#e9e2d0', '#8fae8a', '#b56a4a'];
const SIGNS = ['LONCHES', 'GORDITAS', 'TALLER EL COMPA', 'YONKE', 'VULCANIZADORA', 'ABARROTES', 'AGUA PURIFICADA', 'REFACCIONES', 'TACOS', 'PALETERÍA', 'ALINEACIÓN Y BALANCEO', 'SE PONCHAN LLANTAS GRATIS'];
const SIGNC = [['#ffc61a', '#1b1a1d'], ['#d93a2b', '#ffffff'], ['#0b6b4a', '#ffffff'], ['#1f4f9c', '#ffe45c'], ['#f6ecd6', '#c2271a'], ['#e84a8a', '#ffffff']];

function storefront(g: CanvasRenderingContext2D, r: () => number, x0: number, y0: number, w: number, h: number, wall: string) {
  g.fillStyle = wall; g.fillRect(x0, y0, w, h);
  const bays = Math.max(2, Math.round(w / 170));
  for (let b = 0; b < bays; b++) {
    const bw = w / bays, x = x0 + b * bw + 10, ww = bw - 20, k = r();
    const [bg, fg] = SIGNC[(r() * SIGNC.length) | 0];
    g.fillStyle = bg; g.fillRect(x, y0 + 6, ww, h * 0.26);
    g.fillStyle = fg; g.font = `900 ${Math.floor(h * 0.15)}px "Bowlby One", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(SIGNS[(r() * SIGNS.length) | 0], x + ww / 2, y0 + 6 + h * 0.14, ww - 10);
    if (k < 0.4) { // cortina metalica
      g.fillStyle = '#8d9096'; g.fillRect(x + 6, y0 + h * 0.34, ww - 12, h * 0.66);
      g.strokeStyle = 'rgba(40,40,45,.5)'; g.lineWidth = 1; for (let yy = y0 + h * 0.36; yy < y0 + h; yy += 6) { g.beginPath(); g.moveTo(x + 6, yy); g.lineTo(x + ww - 6, yy); g.stroke(); }
    } else { // vitrina y puerta
      g.fillStyle = '#1e2a33'; g.fillRect(x + 6, y0 + h * 0.36, ww * 0.56, h * 0.5);
      g.fillStyle = 'rgba(160,200,215,.35)'; g.fillRect(x + 10, y0 + h * 0.38, ww * 0.2, h * 0.46);
      g.fillStyle = '#3a2a20'; g.fillRect(x + ww * 0.66, y0 + h * 0.36, ww * 0.26, h * 0.64);
    }
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0, y0 + h - 8, w, 8);
}

function grime(g: CanvasRenderingContext2D, r: () => number, w: number, h: number) {
  for (let i = 0; i < 14; i++) { const x = r() * w, gg = g.createLinearGradient(0, 0, 0, h * (0.3 + r() * 0.5)); gg.addColorStop(0, 'rgba(40,30,20,.22)'); gg.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gg; g.fillRect(x, 0, 6 + r() * 26, h); }
  speckle(g, w, h, 2500, r, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.05)'], 3);
}

/** Fachada de comercio bajo (1 o 2 pisos) tipica del centro. */
export function lowriseTexture(seed: number, floors: number) {
  const [c, g] = canvas(512, 512), r = rng(seed), wall = WALLS[(r() * WALLS.length) | 0];
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  const gh = floors === 1 ? 420 : 240, top = 512 - gh;
  if (floors > 1) {
    const n = 3 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const w = 512 / n, x = i * w + w * 0.22, ww = w * 0.56;
      g.fillStyle = '#f1ead8'; g.fillRect(x - 6, 62, ww + 12, top - 96);
      g.fillStyle = '#22303a'; g.fillRect(x, 68, ww, top - 108);
      g.fillStyle = 'rgba(170,205,220,.4)'; g.fillRect(x + 3, 71, ww * 0.42, top - 114);
      g.fillStyle = '#2b2622'; g.fillRect(x - 10, top - 38, ww + 20, 5);
      for (let k = 0; k < 7; k++) g.fillRect(x - 10 + k * (ww + 20) / 6 - 1, top - 38, 2, 26);
    }
  }
  g.fillStyle = '#f1ead8'; g.fillRect(0, 0, 512, 26); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 26, 512, 6);
  storefront(g, r, 0, top, 512, gh, wall);
  grime(g, r, 512, 512);
  return tex(c);
}

/** Torre de oficinas o departamentos: mosaico de ventanas que se repite en vertical. */
export function towerTexture(seed: number) {
  const [c, g] = canvas(256, 256), r = rng(seed);
  const wall = ['#c9c2b4', '#a8b3bb', '#d8c7a2', '#9a9288'][(r() * 4) | 0];
  g.fillStyle = wall; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = r() < 0.2 ? '#f0d9a0' : '#27353f'; g.fillRect(x * 64 + 9, y * 64 + 12, 46, 36);
    g.fillStyle = 'rgba(180,215,230,.3)'; g.fillRect(x * 64 + 11, y * 64 + 14, 18, 32);
    if (r() < 0.35) { g.fillStyle = '#d8d8d4'; g.fillRect(x * 64 + 20, y * 64 + 50, 24, 9); } // minisplit
  }
  speckle(g, 256, 256, 900, r, ['rgba(0,0,0,.06)'], 3);
  return tex(c, true);
}

/** Fachada real: foto del Hotel Galicia arriba, planta baja con rotulos de parodia abajo. */
export function galiciaTexture(photo: HTMLImageElement) {
  const [c, g] = canvas(1024, 600), r = rng(42);
  g.drawImage(photo, 0, 22, 1024, 378, 0, 0, 1024, 400);
  storefront(g, r, 0, 400, 1024, 200, '#7c3a2c');
  return tex(c);
}

export function textPanel(lines: string[], bg: string, fg: string, w = 1024, h = 256) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lh = (h - 30) / lines.length;
  lines.forEach((t, i) => {
    g.font = `${i === 0 ? 900 : 600} ${Math.floor(lh * (i === 0 ? 0.78 : 0.6))}px ${i === 0 ? '"Bowlby One", Impact' : '"Barlow Condensed", Arial Narrow'}, sans-serif`;
    g.fillText(t, w / 2, 18 + lh * (i + 0.5), w - 50);
  });
  return tex(c);
}

export function checkerTexture() {
  const [c, g] = canvas(256, 32);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#141414' : '#f2f2f2'; g.fillRect(x * 16, y * 16, 16, 16); }
  return tex(c);
}

export function dustSprite() {
  const [c, g] = canvas(64, 64), grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return tex(c);
}

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
}

export function photoTexture(img: HTMLImageElement) {
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t;
}
