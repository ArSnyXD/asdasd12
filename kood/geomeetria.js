// Plaani abifunktsioonid: murdjoone lõigud kaarepikkuse järgi,
// punkti projektsioon teljele, lõikuvate joonte ümardatud ühendus ning
// kohalik koordinaadistik pööratud hoonetele E1 ääres.
import * as THREE from 'three';
import { kogupikkused, punktKaugusel, uhendaNurk, nihutatudJoon } from './abifunktsioonid.js';

// Murdjoone osa kaarepikkuste s0 ja s1 vahel; otspunktid interpoleeritakse.
export function jooneOsa(pl, s0, s1) {
  const L = kogupikkused(pl), tot = L[L.length - 1];
  s0 = Math.max(0, s0); s1 = Math.min(tot, s1);
  if (s1 <= s0 + 1e-6) return [];
  const out = [punktKaugusel(pl, s0).p];
  for (let i = 0; i < pl.length; i++) if (L[i] > s0 + 1e-4 && L[i] < s1 - 1e-4) out.push(pl[i]);
  out.push(punktKaugusel(pl, s1).p);
  return out;
}

export const joonePikkus = (pl) => { const L = kogupikkused(pl); return L[L.length - 1]; };

// Punkti projektsioon murdjoonele: s on kaarepikkus, off külgnihe, positiivne vasakule.
export function project(pl, P) {
  const L = kogupikkused(pl);
  let best = { s: 0, d: Infinity, off: 0, p: pl[0] };
  for (let i = 0; i < pl.length - 1; i++) {
    const a = pl[i], b = pl[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1e-9, l = Math.sqrt(l2);
    let t = ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const qx = a[0] + dx * t, qy = a[1] + dy * t, e = Math.hypot(P[0] - qx, P[1] - qy);
    if (e < best.d) best = { s: L[i] + t * l, d: e, off: (dx * (P[1] - a[1]) - dy * (P[0] - a[0])) / l, p: [qx, qy] };
  }
  return best;
}

// Punkt murdjoonel kaugusel s ja külgnihkega off, positiivne vasakule.
export const on = (pl, s, off = 0) => { const q = punktKaugusel(pl, s); return [q.p[0] + q.n[0] * off, q.p[1] + q.n[1] * off]; };
export const suundKohas = (pl, s) => { const q = punktKaugusel(pl, s); return Math.atan2(q.t[1], q.t[0]); };

function segX(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + rx * t, a[1] + ry * t];
}

// Ümardatud ühendus: A läheneb nurgale, B eemaldub; jooned lõikuvad.
// Mõlemad jooned kärbitakse puutujapikkuse r·tg(θ/2) võrra ning ühendatakse kaarega.
export function umarUhine(A, B, r, n = 16) {
  let hit = null;
  for (let i = A.length - 2; i >= 0 && !hit; i--) {
    for (let j = 0; j < B.length - 1; j++) {
      const p = segX(A[i], A[i + 1], B[j], B[j + 1]);
      if (p) { hit = { i, j, p }; break; }
    }
  }
  if (!hit) return uhendaNurk(A, B, n);
  const LA = kogupikkused(A), LB = kogupikkused(B);
  const sA = LA[hit.i] + Math.hypot(hit.p[0] - A[hit.i][0], hit.p[1] - A[hit.i][1]);
  const sB = LB[hit.j] + Math.hypot(hit.p[0] - B[hit.j][0], hit.p[1] - B[hit.j][1]);
  const ta = punktKaugusel(A, Math.max(0, sA - 0.4)).t, tb = punktKaugusel(B, sB + 0.4).t;
  const th = Math.acos(Math.max(-1, Math.min(1, ta[0] * tb[0] + ta[1] * tb[1])));
  const d = r * Math.tan(th / 2);
  return uhendaNurk(jooneOsa(A, 0, sA - d), jooneOsa(B, sB + d, LB[LB.length - 1]), n);
}

// Riba telje kahe nihke vahel kõrguskaardi jaoks.
export function ribaHulknurk(pl, a, b) {
  return [...nihutatudJoon(pl, a), ...nihutatudJoon(pl, b).reverse()];
}

// Kohalik plaanikoordinaadistik: algus (X, Y), nurk ang vastupäeva.
// Samade abifunktsioonidega kohalikus koordinaadistikus loodud geomeetria
// teisendatakse maatriksiga plaanile enne materjalirühma lisamist.
export class Koordinaadistik {
  constructor(B, X, Y, ang) {
    this.B = B; this.X = X; this.Y = Y; this.ang = ang;
    this.c = Math.cos(ang); this.s = Math.sin(ang);
    this.m = new THREE.Matrix4().makeTranslation(X, 0, -Y).multiply(new THREE.Matrix4().makeRotationY(ang));
  }
  add(key, g) { if (g) { g.applyMatrix4(this.m); this.B.add(key, g); } return g; }
  plaanile(x, y) { return [this.X + x * this.c - y * this.s, this.Y + x * this.s + y * this.c]; }
}
