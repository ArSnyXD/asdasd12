import * as THREE from 'three';

// All textures are drawn on small canvases at load time, so the project needs no image files.

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

let seed = 12345;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

function speckle(g, w, h, count, alpha) {
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3);
  }
}

// One storey of a facade, `bays` windows wide. Returned tile is `tileW` metres wide.
export function facade({
  base = '#e9e7e1', win = '#2f3b48', frame = null, bays = 2, bayW = 3,
  winW = 0.5, winH = 0.42, winTop = 0.22, band = null, bandTop = 0.74, bandH = 0.2,
} = {}) {
  const S = 128;
  const c = canvas(S * bays, S);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  speckle(g, c.width, c.height, 60 * bays, 0.05);
  for (let i = 0; i < bays; i++) {
    const ww = S * winW, wh = S * winH;
    const x = i * S + (S - ww) / 2, y = S * winTop;
    if (frame) {
      g.fillStyle = frame;
      g.fillRect(x - 4, y - 4, ww + 8, wh + 8);
    }
    g.fillStyle = win;
    g.fillRect(x, y, ww, wh);
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(x, y, ww, wh * 0.28);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x, y + wh - 3, ww, 3);
  }
  if (band) {
    g.fillStyle = band;
    g.fillRect(0, S * bandTop, c.width, S * bandH);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, S * bandTop, c.width, 3);
  }
  return { tex: finish(c), tileW: bays * bayW };
}

// Curtain-wall tower: glass with spandrel band and mullions.
export function glassFacade({ glass = '#86abd0', spandrel = '#5f7f9f', mullion = '#d3dde6', bayW = 3 } = {}) {
  const S = 128;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = glass;
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(0, 0, S, 26);
  g.fillStyle = spandrel;
  g.fillRect(0, S * 0.72, S, S * 0.28);
  g.fillStyle = mullion;
  g.fillRect(0, 0, 3, S);
  g.fillRect(S / 2 - 1, 0, 2, S);
  g.fillRect(0, S * 0.72, S, 2);
  return { tex: finish(c), tileW: bayW };
}

export function paving({ color = '#b9b7b0', grout = '#9d9b94', tiles = 4, size = 1.2, shade = 10 } = {}) {
  const S = 256;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = grout;
  g.fillRect(0, 0, S, S);
  const t = S / tiles;
  const base = new THREE.Color(color);
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      const k = (rand() - 0.5) * shade / 255;
      g.fillStyle = `rgb(${((base.r + k) * 255) | 0},${((base.g + k) * 255) | 0},${((base.b + k) * 255) | 0})`;
      g.fillRect(i * t + 1, j * t + 1, t - 2, t - 2);
    }
  }
  speckle(g, S, S, 120, 0.05);
  return { tex: finish(c), size };
}

export function asphalt() {
  const S = 256;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = '#4b4c50';
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, 900, 0.07);
  return { tex: finish(c), size: 5 };
}

export function sign() {
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ee';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#c9312b';
  g.beginPath();
  g.arc(64, 66, 46, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#f4f2ee';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(64, 66, 34, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#f4f2ee';
  g.fillRect(44, 50, 40, 10);
  g.fillRect(44, 72, 40, 10);
  g.fillStyle = '#1f3f7a';
  g.fillRect(0, 128, 128, 4);
  g.fillStyle = '#c9312b';
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BOSCH', 64, 170);
  g.fillStyle = '#1f3f7a';
  g.fillRect(24, 200, 80, 22);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function platesign() {
  const c = canvas(64, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#f6f6f3';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#1e4fa3';
  g.fillRect(4, 4, 56, 120);
  g.fillStyle = '#f6f6f3';
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('P', 32, 40);
  g.fillRect(14, 80, 36, 6);
  g.fillRect(14, 96, 36, 6);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
