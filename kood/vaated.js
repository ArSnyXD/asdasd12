// Püsivaated ja pealtvaade tähistega S/J/H1/H2/P/E1/E2, käigutee ning mõõtkava.
import * as THREE from 'three';
import { VAATED, TAHISED, PLAAN } from './seaded.js';
import { V3 } from './abifunktsioonid.js';

const SVG = 'http://www.w3.org/2000/svg';

export class VaadeteHaldur {
  constructor(svg) {
    this.svg = svg;
    this.persp = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 900);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
    this.camera = this.persp;
    this.name = 'main';
    this.routes = [];
  }

  seaTeekonnad(ctx) {
    this.routes = [ctx.pohiteekond, ctx.teekondE2];
  }


  set(name, aspect) {
    const v = VAATED[name] || VAATED.main;
    this.name = VAATED[name] ? name : 'main';
    if (v.ortho) {
      const hh = v.poolKorgus, hw = hh * aspect, o = this.ortho;
      o.left = -hw; o.right = hw; o.top = hh; o.bottom = -hh;
      o.position.copy(V3(v.center[0], v.center[1], 300));
      o.up.set(0, 0, -1);
      o.lookAt(V3(v.center[0], v.center[1], 0));
      o.updateProjectionMatrix();
      this.camera = o;
      this.box = { cx: v.center[0], cy: v.center[1], hw, hh };
    } else {
      const p = this.persp;
      p.fov = v.fov; p.aspect = aspect;
      p.position.copy(V3(...v.pos));
      p.lookAt(V3(...v.look));
      p.updateProjectionMatrix();
      this.camera = p;
      this.box = null;
    }
    return this.camera;
  }

  get onPealtvaade() { return !!this.box; }

  // SVG-kiht pealtvaatele; perspektiivvaadetes peidetud. pl sisaldab tegelase asukohta ja suunda.
  joonistaPealiskiht(W, H, pl = null) {
    const svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.display = this.box ? 'block' : 'none';
    if (!this.box) return;
    const { cx, cy, hw, hh } = this.box;
    const sx = (X) => ((X - (cx - hw)) / (2 * hw)) * W;
    const sy = (Y) => (((cy + hh) - Y) / (2 * hh)) * H;
    const el = (tag, attrs, text) => {
      const e = document.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (text) e.textContent = text;
      svg.appendChild(e);
      return e;
    };
    for (const r of this.routes) {
      const d = r.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
      el('path', { d, class: 'route-shadow' });
      el('path', { d, class: 'route' });
    }
    // Kaamera asukohad.
    for (const [k, v] of Object.entries(VAATED)) {
      if (v.ortho) continue;
      const a = Math.atan2(v.look[1] - v.pos[1], v.look[0] - v.pos[0]);
      const x = sx(v.pos[0]), y = sy(v.pos[1]);
      const tip = [x + Math.cos(a) * 16, y - Math.sin(a) * 16];
      const l = [x + Math.cos(a + 2.5) * 8, y - Math.sin(a + 2.5) * 8], r = [x + Math.cos(a - 2.5) * 8, y - Math.sin(a - 2.5) * 8];
      el('polygon', { points: `${tip.join(',')} ${l.join(',')} ${r.join(',')}`, class: 'cam' + (k === 'main' ? ' cam-main' : '') });
    }
    for (const L of TAHISED) {
      const x = sx(L.at[0]), y = sy(L.at[1]);
      el('circle', { cx: x, cy: y, r: L.cls ? 3 : 5, class: 'dot ' + (L.cls || '') });
      const off = L.id === 'S' ? [-14, 30] : [9, 5];
      const t = el('text', { x: x + off[0], y: y + off[1], class: 'lbl ' + (L.cls || '') }, L.text);
      // Paremasse serva mitte mahtuv pealdis nihutatakse punktist vasakule, et vältida kärpimist.
      if (x + off[0] + t.getComputedTextLength() > W - 10) {
        t.setAttribute('x', x - 9);
        t.setAttribute('y', y + 22);
        t.setAttribute('text-anchor', 'end');
      }
    }
    if (pl) {
      const x = sx(pl.x), y = sy(pl.y);
      el('line', { x1: x, y1: y, x2: x + Math.cos(pl.yaw) * 17, y2: y - Math.sin(pl.yaw) * 17, class: 'me-dir' });
      el('circle', { cx: x, cy: y, r: 6, class: 'me' });
      el('text', { x: x + 10, y: y - 10, class: 'lbl small' }, 'tegelane');
    }
    // Kümnemeetrine mõõtkava ja põhjasuund.
    const px10 = (10 / (2 * hw)) * W, bx = 28, by = H - 30;
    el('line', { x1: bx, y1: by, x2: bx + px10, y2: by, class: 'scale' });
    el('line', { x1: bx, y1: by - 6, x2: bx, y2: by + 6, class: 'scale' });
    el('line', { x1: bx + px10, y1: by - 6, x2: bx + px10, y2: by + 6, class: 'scale' });
    el('text', { x: bx, y: by - 12, class: 'lbl small' }, '10 m');
    el('text', { x: W - 46, y: 40, class: 'lbl' }, 'Põhi ↑');
    el('text', { x: 28, y: H - 60, class: 'lbl small' }, 'Kolmnurgad tähistavad kaameraid (kollane on põhivaade); katkendjoon näitab käiguteed S → J → E1 / E2');
  }
}
