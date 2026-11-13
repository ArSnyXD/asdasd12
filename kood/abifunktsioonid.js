// Abifunktsioonid: plaanikoordinaadid, murdjooned ja geomeetria loomine.

// Plaan: X itta, Y põhja, ühik meeter; alguspunkt on ristmik J.
// Three.js: x = X, z = −Y, y on kõrgus. Pööre ümber y-telje vastab plaaninurgale vastupäeva idast.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const V3 = (X, Y, h = 0) => new THREE.Vector3(X, h, -Y);

export function rng(seed) {
  let a = seed >>> 0;
  const f = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  return f;
}

// Plaani murdjooned.

export function smooth(pts, step = 1.0) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / step));
  return curve.getSpacedPoints(n).map(v => [v.x, v.y]);
}

export function kogupikkused(pl) {
  const L = [0];
  for (let i = 1; i < pl.length; i++) L.push(L[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
  return L;
}

export function tangents(pl) {
  return pl.map((p, i) => {
    const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  });
}

// Nihe vasakule (d > 0) või paremale (d < 0).
export function nihutatudJoon(pl, d) {
  const T = tangents(pl);
  return pl.map((p, i) => [p[0] - T[i][1] * d, p[1] + T[i][0] * d]);
}

export function punktKaugusel(pl, s) {
  const L = kogupikkused(pl);
  s = Math.max(0, Math.min(L[L.length - 1], s));
  let i = 1;
  while (i < L.length - 1 && L[i] < s) i++;
  const t = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
  const a = pl[i - 1], b = pl[i];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return { p: [a[0] + dx * t, a[1] + dy * t], t: [dx / l, dy / l], n: [-dy / l, dx / l] };
}

export function kogupikkus(pl) { const L = kogupikkused(pl); return L[L.length - 1]; }

// Ruutfunktsiooniga ümardus joone A lõpu ja B alguse vahel; juhtpunkt on puutujate lõikepunkt.
export function uhendaNurk(A, B, n = 10) {
  const p0 = A[A.length - 1], p0b = A[A.length - 2];
  const p2 = B[0], p2b = B[1];
  const d0 = [p0[0] - p0b[0], p0[1] - p0b[1]];
  const d2 = [p2[0] - p2b[0], p2[1] - p2b[1]];
  const den = d0[0] * d2[1] - d0[1] * d2[0];
  let c;
  if (Math.abs(den) < 1e-6) c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
  else {
    const t = ((p2[0] - p0[0]) * d2[1] - (p2[1] - p0[1]) * d2[0]) / den;
    c = [p0[0] + d0[0] * t, p0[1] + d0[1] * t];
  }
  const arc = [];
  for (let i = 1; i < n; i++) {
    const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
    arc.push([a * p0[0] + b * c[0] + d * p2[0], a * p0[1] + b * c[1] + d * p2[1]]);
  }
  return [...A, ...arc, ...B];
}

export function clip(pl, keep) {
  const out = [];
  for (const p of pl) if (keep(p)) out.push(p);
  return out;
}

// Geomeetria.

export function looGeomeetria(pos, nor, uv, idx, uv1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('uv1', new THREE.Float32BufferAttribute(uv1 || uv, 2));
  g.setIndex(idx);
  return g;
}

export function valmistaGeomeetria(g) {
  if (!g.index) {
    const n = g.attributes.position.count, a = [];
    for (let i = 0; i < n; i++) a.push(i);
    g.setIndex(a);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.uv1) g.setAttribute('uv1', g.attributes.uv.clone());
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'uv1'].includes(k)) g.deleteAttribute(k);
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

// Materjalirühmad: sama materjaliga staatiline geomeetria ühendatakse üheks võrguks.
export class Materjaliruhmad {
  constructor() { this.m = new Map(); }
  add(key, g) {
    if (!g) return g;
    if (!this.m.has(key)) this.m.set(key, []);
    this.m.get(key).push(g);
    return g;
  }
  build(mats, parent, shadow = {}) {
    const meshes = {};
    for (const [key, list] of this.m) {
      const mat = mats[key];
      if (!mat) throw new Error('Materjal puudub: ' + key);
      const geo = mergeGeometries(list.map(valmistaGeomeetria), false);
      if (!geo) throw new Error('Geomeetria ühendamine ebaõnnestus: ' + key);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      const o = shadow[key] || shadow.default || {};
      mesh.castShadow = o.cast ?? true;
      mesh.receiveShadow = o.receive ?? true;
      mesh.name = key;
      parent.add(mesh);
      meshes[key] = mesh;
    }
    return meshes;
  }
}

// Telgedega rööbitine risttahukas plaanikoordinaatides; UV on maailmakoordinaatides meetrites.
// Korduse määrab materjal; uv1 normaliseeritakse hoone mõõtmete gb järgi määrdumiskaardi jaoks.
// Tahud: N (+Y), S, E (+X), W, T (ülemine), B (alumine).
export function plaanikast(X0, X1, Y0, Y1, h0, h1, opt = {}) {
  const faces = opt.faces || 'NSEWT';
  const gb = opt.gb || [X0, X1, Y0, Y1, h0, h1];
  const pos = [], nor = [], uv = [], uv1 = [], idx = [];
  const z0 = -Y1, z1 = -Y0;
  const uB = opt.uBase || 0, vB = opt.vBase || 0;
  const n1 = (a, lo, hi) => (hi > lo ? (a - lo) / (hi - lo) : 0);
  const push = (c, n) => {
    const b = pos.length / 3;
    for (const [x, y, z] of c) {
      pos.push(x, y, z); nor.push(...n);
      const X = x, Y = -z;
      let u, v, a, bb;
      if (n[1] !== 0) { u = X; v = Y; a = n1(X, gb[0], gb[1]); bb = n1(Y, gb[2], gb[3]); }
      else if (n[0] > 0) { u = Y; v = y; a = n1(Y, gb[2], gb[3]); bb = n1(y, gb[4], gb[5]); }
      else if (n[0] < 0) { u = -Y; v = y; a = 1 - n1(Y, gb[2], gb[3]); bb = n1(y, gb[4], gb[5]); }
      else if (n[2] > 0) { u = X; v = y; a = n1(X, gb[0], gb[1]); bb = n1(y, gb[4], gb[5]); }
      else { u = -X; v = y; a = 1 - n1(X, gb[0], gb[1]); bb = n1(y, gb[4], gb[5]); }
      if (n[1] === 0) { u -= uB; v -= vB; }
      uv.push(u, v); uv1.push(a, bb);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (const f of faces) {
    if (f === 'E') push([[X1, h0, z1], [X1, h0, z0], [X1, h1, z0], [X1, h1, z1]], [1, 0, 0]);
    else if (f === 'W') push([[X0, h0, z0], [X0, h0, z1], [X0, h1, z1], [X0, h1, z0]], [-1, 0, 0]);
    else if (f === 'S') push([[X0, h0, z1], [X1, h0, z1], [X1, h1, z1], [X0, h1, z1]], [0, 0, 1]);
    else if (f === 'N') push([[X1, h0, z0], [X0, h0, z0], [X0, h1, z0], [X1, h1, z0]], [0, 0, -1]);
    else if (f === 'T') push([[X0, h1, z1], [X1, h1, z1], [X1, h1, z0], [X0, h1, z0]], [0, 1, 0]);
    else if (f === 'B') push([[X0, h0, z0], [X1, h0, z0], [X1, h0, z1], [X0, h0, z1]], [0, -1, 0]);
  }
  return looGeomeetria(pos, nor, uv, idx, uv1);
}

// Fassaadi ristkülik: suund N/S/E/W määrab normaali; c on horisontaalne keskpunkt.
// uvRect = [u0, v0, u1, v1].
export function fassaadinelinurk(facing, plane, c, w, h0, h1, uvRect = [0, 0, 1, 1]) {
  const [u0, v0, u1, v1] = uvRect;
  let C, n;
  const a = c - w / 2, b = c + w / 2;
  if (facing === 'S') { C = [[a, h0, -plane], [b, h0, -plane], [b, h1, -plane], [a, h1, -plane]]; n = [0, 0, 1]; }
  else if (facing === 'N') { C = [[b, h0, -plane], [a, h0, -plane], [a, h1, -plane], [b, h1, -plane]]; n = [0, 0, -1]; }
  else if (facing === 'E') { C = [[plane, h0, -a], [plane, h0, -b], [plane, h1, -b], [plane, h1, -a]]; n = [1, 0, 0]; }
  else { C = [[plane, h0, -b], [plane, h0, -a], [plane, h1, -a], [plane, h1, -b]]; n = [-1, 0, 0]; }
  const pos = [], nor = [];
  for (const p of C) { pos.push(...p); nor.push(...n); }
  const uv = [u0, v0, u1, v0, u1, v1, u0, v1];
  return looGeomeetria(pos, nor, uv, [0, 1, 2, 0, 2, 3]);
}

// Riba piki plaani murdjoont kõrgusel h, nihete offR < offL vahel.
// UV: maailmarežiimis (X, Y) meetrites, ribarežiimis risti- ja pikisuunas meetrites; across01 annab ristisuunas 0..1.
// Vaheta u/v, et telliste u-telg kulgeks piki riba.
export function ribbon(pl, offR, offL, h, opt = {}) {
  const T = tangents(pl), L = kogupikkused(pl);
  const pos = [], nor = [], uv = [], idx = [];
  const h1 = opt.hEnd ?? h;
  for (let i = 0; i < pl.length; i++) {
    const [x, y] = pl[i], [tx, ty] = T[i], nx = -ty, ny = tx;
    const R = [x + nx * offR, y + ny * offR], Lp = [x + nx * offL, y + ny * offL];
    const hh = h + (h1 - h) * (L[i] / (L[L.length - 1] || 1));
    pos.push(R[0], hh, -R[1], Lp[0], hh, -Lp[1]);
    nor.push(0, 1, 0, 0, 1, 0);
    if (opt.uv === 'world') uv.push(R[0], R[1], Lp[0], Lp[1]);
    else {
      const a0 = opt.across01 ? 0 : offR, a1 = opt.across01 ? 1 : offL, v = L[i] + (opt.vOff || 0);
      if (opt.swap) uv.push(v, a0, v, a1); else uv.push(a0, v, a1, v);
    }
  }
  for (let i = 0; i < pl.length - 1; i++) {
    const r0 = 2 * i, l0 = r0 + 1, r1 = r0 + 2, l1 = r0 + 3;
    idx.push(r0, r1, l0, l0, r1, l1);
  }
  return looGeomeetria(pos, nor, uv, idx);
}

// Vertikaalseina normaal osutab liikumissuunas paremale või ümberpööramisel vasakule.
// UV: u on pikkus meetrites, v kõrgus meetrites või normaliseerimisel 0..1.
export function vwall(pl, h0, h1, opt = {}) {
  const L = kogupikkused(pl), T = tangents(pl);
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i < pl.length; i++) {
    const [x, y] = pl[i];
    let nx = T[i][1], ny = -T[i][0];
    if (opt.flip) { nx = -nx; ny = -ny; }
    const hb = typeof h0 === 'function' ? h0(pl[i], i) : h0;
    const ht = typeof h1 === 'function' ? h1(pl[i], i) : h1;
    pos.push(x, hb, -y, x, ht, -y);
    nor.push(nx, 0, -ny, nx, 0, -ny);
    const u = (opt.flip ? -1 : 1) * L[i];
    if (opt.vNorm) uv.push(u, 0, u, 1); else uv.push(u, hb, u, ht);
  }
  for (let i = 0; i < pl.length - 1; i++) {
    const b0 = 2 * i, t0 = b0 + 1, b1 = b0 + 2, t1 = b0 + 3;
    if (opt.flip) idx.push(b1, b0, t0, b1, t0, t1);
    else idx.push(b0, b1, t1, b0, t1, t0);
  }
  return looGeomeetria(pos, nor, uv, idx);
}

// Plaanihulknurga täitmine kõrgusel h; UV = X, Y meetrites.
export function taidaHulknurk(pts, h) {
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, h, 0);
  return g;
}

// Suunatud risttahukas kahe plaanipunkti vahel: rööpad, käsipuud ja risttalad.
export function beam(a, b, h0, h1, depth, opt = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  const g = new THREE.BoxGeometry(len + (opt.extra || 0), h1 - h0, depth);
  if (opt.uvMeters) skaleeriKastiUV(g, len, h1 - h0, depth);
  g.rotateY(Math.atan2(dy, dx));
  g.translate((a[0] + b[0]) / 2, (h0 + h1) / 2, -(a[1] + b[1]) / 2);
  return g;
}

function skaleeriKastiUV(g, sx, sy, sz) {
  // BoxGeometry: kuus nelja tipuga tahku suundades +x, −x, +y, −y, +z, −z.
  const uv = g.attributes.uv;
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
}

// Risttahukas keskpunktiga plaanil, pöördenurgaga ang ja aluskõrgusega h0.
export function obox(X, Y, h0, sx, sy, sz, ang = 0, uvMeters = false) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (uvMeters) skaleeriKastiUV(g, sx, sy, sz);
  g.rotateY(ang);
  g.translate(X, h0 + sy / 2, -Y);
  return g;
}

export function cyl(X, Y, h0, rTop, rBot, hgt, seg = 8, ang = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBot, hgt, seg, 1, false);
  g.rotateY(ang);
  g.translate(X, h0 + hgt / 2, -Y);
  return g;
}

// Ahenev toru piki kõverat: tüved, oksad ja juhtmed.
export function ahenevToru(curve, segs, radial, r0, r1, opt = {}) {
  const frames = curve.computeFrenetFrames(segs, false);
  const len = curve.getLength();
  const pos = [], nor = [], uv = [], idx = [];
  const around = Math.max(1, Math.round((2 * Math.PI * Math.max(r0, 0.05)) / (opt.uvAround || 1)));
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t);
    const N = frames.normals[i], B = frames.binormals[i];
    const r = opt.rFn ? opt.rFn(t) : r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a);
      const nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
      nor.push(nx, ny, nz);
      uv.push((j / radial) * around, (t * len) / (opt.uvAlong || 1));
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return looGeomeetria(pos, nor, uv, idx);
}

// Ebakorrapärane lehestiku või põõsa maht: nihutatud tippudega ikosaeeder Three.js-koordinaatides.
export function blob(cx, cy, cz, r, opt = {}) {
  const R = opt.rng || rng(Math.abs(Math.floor((cx * 73.1 + cz * 37.7 + cy * 11.3) * 1000)) + 7);
  let g = new THREE.IcosahedronGeometry(1, opt.detail ?? 1);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  const sx = opt.sx ?? 1, sy = opt.sy ?? 0.8, sz = opt.sz ?? 1, rough = opt.rough ?? 0.45;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (R() - 0.5) * rough;
    p.setXYZ(i, cx + p.getX(i) * r * sx * k, cy + p.getY(i) * r * sy * k, cz + p.getZ(i) * r * sz * k);
  }
  g.computeVertexNormals();
  const uv = [];
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i) + p.getZ(i) * 0.7, p.getY(i));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('uv1', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// Lamedate lehepindade kogum: üks geomeetria tuhandetele nelinurkadele.
export class LehepindadeKogum {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; this.n = 0; }
  // c on keskpunkt, u/v poolteljed ja nrm valgustusnormaal (Vector3).
  add(c, u, v, nrm, uvRect = [0, 0, 1, 1]) {
    const b = this.n, [u0, v0, u1, v1] = uvRect;
    const k = [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]];
    for (const [a, bb, uu, vv] of k) {
      this.pos.push(c.x + u.x * a + v.x * bb, c.y + u.y * a + v.y * bb, c.z + u.z * a + v.z * bb);
      this.nor.push(nrm.x, nrm.y, nrm.z);
      this.uv.push(uu, vv);
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.n += 4;
  }
  geometry() { return this.n ? looGeomeetria(this.pos, this.nor, this.uv, this.idx) : null; }
}

// Rippuv juhe punktide a ja b vahel (Vector3).
export function rippuvKover(a, b, sag, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = a.clone().lerp(b, t);
    p.y -= 4 * sag * t * (1 - t);
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function punktHulknurgas(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Horisontaalne nelinurk: c on plaani keskpunkt, ax/ay tekstuuri u/v ühikvektorid.
// hx/hy on poolmõõtmed; tippude järjestus annab ülespoole normaali.
export function maapinnaNelinurk(c, ax, ay, hx, hy, h, uvRect = [0, 0, 1, 1]) {
  const [u0, v0, u1, v1] = uvRect;
  const P = (sx, sy) => [c[0] + ax[0] * hx * sx + ay[0] * hy * sy, c[1] + ax[1] * hx * sx + ay[1] * hy * sy];
  const pts = [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)];
  const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const pos = [], nor = [], uv = [];
  pts.forEach((p, i) => { pos.push(p[0], h, -p[1]); nor.push(0, 1, 0); uv.push(...uvs[i]); });
  const ccw = ax[0] * ay[1] - ax[1] * ay[0] > 0;
  return looGeomeetria(pos, nor, uv, ccw ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
}

// Vertikaalne silt: normaal osutab plaaninurga faceAng suunas.
export function plate(X, Y, h, w, hh, faceAng, off = 0) {
  const g = new THREE.PlaneGeometry(w, hh);
  g.rotateY(faceAng + Math.PI / 2);
  g.translate(X + Math.cos(faceAng) * off, h, -(Y + Math.sin(faceAng) * off));
  return g;
}
