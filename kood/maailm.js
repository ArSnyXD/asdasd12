// Liikumise füüsika: kõrgusega tasapinnalised takistused, pööratud ristkülikud, ringid ja
// paksud lõigud ruudustikus; mängijaringi väljatõukamine ning kaamera kiirtest.
// Pinnakõrgused: tee 0, kõnnitee 3 cm, park 12 cm ja äärekivi 15 cm.

export class Kokkuporkemaailm {
  constructor(cell = 4) { this.cell = cell; this.items = []; this.grid = new Map(); this.stamp = 0; }

  _key(i, j) { return (i + 4096) * 8192 + (j + 4096); }

  _reg(it) {
    it.id = this.items.length; it.mark = -1;
    this.items.push(it);
    const c = this.cell;
    for (let i = Math.floor(it.bb[0] / c); i <= Math.floor(it.bb[2] / c); i++) {
      for (let j = Math.floor(it.bb[1] / c); j <= Math.floor(it.bb[3] / c); j++) {
        const k = this._key(i, j);
        let a = this.grid.get(k);
        if (!a) this.grid.set(k, (a = []));
        a.push(it);
      }
    }
    return it;
  }

  // Postikujuline takistus.
  box(X0, X1, Y0, Y1, h = 3, tag = '') {
    return this.obox((X0 + X1) / 2, (Y0 + Y1) / 2, Math.abs(X1 - X0) / 2, Math.abs(Y1 - Y0) / 2, 0, h, tag);
  }
  // Pööratud ristkülik: keskpunkt, poolmõõtmed oma telgedel ja nurk vastupäeva.
  obox(cx, cy, hx, hy, ang = 0, h = 3, tag = '') {
    const c = Math.cos(ang), s = Math.sin(ang);
    const ex = Math.abs(c) * hx + Math.abs(s) * hy, ey = Math.abs(s) * hx + Math.abs(c) * hy;
    return this._reg({ t: 'b', cx, cy, hx, hy, c, s, h, tag, bb: [cx - ex, cy - ey, cx + ex, cy + ey] });
  }
  circle(x, y, r, h = 3, tag = '') {
    return this._reg({ t: 'c', x, y, r, h, tag, bb: [x - r, y - r, x + r, y + r] });
  }
  seg(a, b, r, h = 3, tag = '') {
    return this._reg({
      t: 's', ax: a[0], ay: a[1], bx: b[0], by: b[1], r, h, tag,
      bb: [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r],
    });
  }
  polyline(pl, r, h = 3, tag = '') { for (let i = 0; i < pl.length - 1; i++) this.seg(pl[i], pl[i + 1], r, h, tag); }

  // Kordusteta takistused plaani ristkülikus.
  query(x0, y0, x1, y1, out = []) {
    out.length = 0;
    const st = ++this.stamp, c = this.cell;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) {
      for (let j = Math.floor(y0 / c); j <= Math.floor(y1 / c); j++) {
        const a = this.grid.get(this._key(i, j));
        if (!a) continue;
        for (const it of a) if (it.mark !== st) { it.mark = st; out.push(it); }
      }
    }
    return out;
  }

  // Tõuka ring (x, y, r) kõrgematest takistustest välja; tagasta parandatud asukoht.
  resolve(x, y, r, iters = 3, minH = 0.3) {
    const list = this._tmp || (this._tmp = []);
    let hit = 0;
    for (let k = 0; k < iters; k++) {
      this.query(x - r - 0.5, y - r - 0.5, x + r + 0.5, y + r + 0.5, list);
      let moved = false;
      for (const it of list) {
        if (it.h < minH) continue;
        const q = toukaValja(it, x, y, r);
        if (q) { x = q[0]; y = q[1]; moved = true; hit++; }
      }
      if (!moved) break;
    }
    return { x, y, hit };
  }

  // Ringi kattumine takistustega, kontrollide ja alguskoha jaoks.
  overlaps(x, y, r, minH = 0.3) {
    const list = this.query(x - r - 0.5, y - r - 0.5, x + r + 0.5, y + r + 0.5, []);
    return list.filter((it) => it.h >= minH && toukaValja(it, x, y, r - 1e-3));
  }

  // Kaamerakiir punktist o punkti e ([X, Y, kõrgus]); tagastab teeosa esimese
  //  takistuseni, 1 tähendab vaba teed. Takistusi laiendatakse varu võrra, peened postid jäetakse vahele.
  raycast(o, e, pad = 0.22, minR = 0.25) {
    const list = this.query(Math.min(o[0], e[0]) - 1, Math.min(o[1], e[1]) - 1, Math.max(o[0], e[0]) + 1, Math.max(o[1], e[1]) + 1, []);
    let best = 1;
    for (const it of list) {
      let cx, cy, hx, hy, c, s;
      if (it.t === 'b') { cx = it.cx; cy = it.cy; hx = it.hx; hy = it.hy; c = it.c; s = it.s; }
      else if (it.t === 'c') { if (it.r < minR) continue; cx = it.x; cy = it.y; hx = hy = it.r; c = 1; s = 0; }
      else {
        const dx = it.bx - it.ax, dy = it.by - it.ay, l = Math.hypot(dx, dy) || 1e-6;
        if (it.r * 2 < minR * 0.6 && it.h < 1.0) continue;
        cx = (it.ax + it.bx) / 2; cy = (it.ay + it.by) / 2; hx = l / 2 + it.r; hy = it.r; c = dx / l; s = dy / l;
      }
      hx += pad; hy += pad;
      // Ristkülik.
      const ox = (o[0] - cx) * c + (o[1] - cy) * s, oy = -(o[0] - cx) * s + (o[1] - cy) * c;
      const ex = (e[0] - cx) * c + (e[1] - cy) * s, ey = -(e[0] - cx) * s + (e[1] - cy) * c;
      const dx = ex - ox, dy = ey - oy;
      let t0 = 0, t1 = 1;
      const slab = (p, d, h) => {
        if (Math.abs(d) < 1e-9) return p >= -h && p <= h;
        let a = (-h - p) / d, b = (h - p) / d;
        if (a > b) { const tt = a; a = b; b = tt; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        return t0 <= t1;
      };
      if (!slab(ox, dx, hx) || !slab(oy, dy, hy)) continue;
      if (t0 <= 1e-4) continue; // Sihtpunkt on juba laiendatud takistuses; jäta see arvestamata.
      const hAt = o[2] + (e[2] - o[2]) * t0;
      if (hAt > it.h + pad) continue; // Kiir läheb takistusest üle.
      if (t0 < best) best = t0;
    }
    return best;
  }
}

// Ringi väljatõukamine ühest takistusest; kattumise puudumisel null.
function toukaValja(it, x, y, r) {
  if (it.t === 'c') {
    const dx = x - it.x, dy = y - it.y, d = Math.hypot(dx, dy), m = r + it.r;
    if (d >= m) return null;
    if (d < 1e-6) return [it.x + m, y];
    return [it.x + (dx / d) * m, it.y + (dy / d) * m];
  }
  if (it.t === 's') {
    const ax = it.ax, ay = it.ay, vx = it.bx - ax, vy = it.by - ay, l2 = vx * vx + vy * vy || 1e-9;
    let t = ((x - ax) * vx + (y - ay) * vy) / l2;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + vx * t, qy = ay + vy * t, dx = x - qx, dy = y - qy, d = Math.hypot(dx, dy), m = r + it.r;
    if (d >= m) return null;
    if (d < 1e-6) { const l = Math.sqrt(l2); return [qx - (vy / l) * m, qy + (vx / l) * m]; }
    return [qx + (dx / d) * m, qy + (dy / d) * m];
  }
  // Ristkülik.
  const dx = x - it.cx, dy = y - it.cy;
  let lx = dx * it.c + dy * it.s, ly = -dx * it.s + dy * it.c;
  const qx = Math.max(-it.hx, Math.min(it.hx, lx)), qy = Math.max(-it.hy, Math.min(it.hy, ly));
  const ix = Math.abs(lx) < it.hx, iy = Math.abs(ly) < it.hy;
  if (ix && iy) {
    // Keskpunkt sees: tõuka välja väikseima kattumise telje suunas.
    const px = it.hx - Math.abs(lx), py = it.hy - Math.abs(ly);
    if (px < py) lx = (lx < 0 ? -1 : 1) * (it.hx + r); else ly = (ly < 0 ? -1 : 1) * (it.hy + r);
  } else {
    const ex = lx - qx, ey = ly - qy, d = Math.hypot(ex, ey);
    if (d >= r) return null;
    lx = qx + (ex / d) * r; ly = qy + (ey / d) * r;
  }
  return [it.cx + lx * it.c - ly * it.s, it.cy + lx * it.s + ly * it.c];
}

// Pinnakõrguste kaart: hulknurgad täidetakse ridade kaupa lisamise järjekorras.
export class Korgusruudustik {
  constructor(x0, y0, x1, y1, res = 0.1) {
    this.x0 = x0; this.y0 = y0; this.res = res;
    this.nx = Math.ceil((x1 - x0) / res); this.ny = Math.ceil((y1 - y0) / res);
    this.h = new Float32Array(this.nx * this.ny);
  }
  fill(poly, h) {
    const { x0, y0, res, nx, ny } = this;
    let ymin = Infinity, ymax = -Infinity;
    for (const p of poly) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    const j0 = Math.max(0, Math.floor((ymin - y0) / res)), j1 = Math.min(ny - 1, Math.ceil((ymax - y0) / res));
    const xs = [];
    for (let j = j0; j <= j1; j++) {
      const y = y0 + (j + 0.5) * res;
      xs.length = 0;
      for (let k = 0, n = poly.length; k < n; k++) {
        const a = poly[k], b = poly[(k + 1) % n];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - x0) / res - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / res - 0.5));
        for (let i = i0; i <= i1; i++) this.h[j * nx + i] = h;
      }
    }
  }
  at(x, y) {
    const i = Math.floor((x - this.x0) / this.res), j = Math.floor((y - this.y0) / this.res);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return 0;
    return this.h[j * this.nx + i];
  }
}
