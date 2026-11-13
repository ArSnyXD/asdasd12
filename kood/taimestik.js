import { project } from './geomeetria.js';
// Taimestik: kuus pargipuud, suured puud aia taga ja lihtsustatud metsamaht.
// Hekid ja rohelised istutusalad tüvede ümber.
// Võra koosneb okstest, läbipaistmatust südamikust ja läbipaistvuslävega lehepindadest.
import * as THREE from 'three';
import { PARK, SUURED_PUUD } from './seaded.js';
import { rng, ahenevToru, blob, LehepindadeKogum, plaanikast, taidaHulknurk, punktHulknurgas } from './abifunktsioonid.js';

const UP = new THREE.Vector3(0, 1, 0);

export const PARK_TREE = {
  forkH: 2.5, trunkR: 0.14, radial: 7, lean: 0.06,
  limbs: 5, limbLen: 0.78, limbR: 0.55, subs: 2,
  extra: 9, clumpR: 0.95, cards: 12, card: 1.05, coreK: 0.5,
  lehed: 'pargipuuLehed', core: 'pargiLehestik',
};
export const BIG_TREE = {
  forkH: 4.6, trunkR: 0.5, radial: 10, lean: 0.08,
  limbs: 6, limbLen: 0.66, limbR: 0.5, subs: 3,
  extra: 22, clumpR: 2.2, cards: 16, card: 2.0, coreK: 0.6,
  lehed: 'suurpuuLehed', core: 'lehestik', roots: 5,
};

function perp(v) {
  const a = Math.abs(v.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(v, a).normalize();
}

// Oks: kaarjas toru a ja b vahel, keskosa tõstetud.
function oks(B, a, b, r0, r1, bend, radial) {
  const m = a.clone().lerp(b, 0.45);
  m.y += bend;
  const c = new THREE.CatmullRomCurve3([a.clone(), m, b.clone()]);
  B.add('puukoor', ahenevToru(c, 6, radial, r0, r1, { uvAround: 0.5, uvAlong: 1.0 }));
}

// Lehestikukimp: tihe südamik ja lehepinnad selle ümber, eeskätt väljas ja üleval.
function lehekimp(B, cards, o, R, c, r, crownC) {
  if (o.coreK > 0) B.add(o.core, blob(c.x, c.y, c.z, r * o.coreK, { rng: R, sy: 0.7, rough: 0.6, detail: 1 }));
  const cb = cards[o.lehed];
  const out = c.clone().sub(crownC).setY(0);
  if (out.lengthSq() > 1e-4) out.normalize();
  for (let i = 0; i < o.cards; i++) {
    const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1);
    if (d.lengthSq() < 1e-3) d.set(0, 1, 0);
    d.normalize().addScaledVector(out, 0.45).addScaledVector(UP, 0.25).normalize();
    const p = c.clone().addScaledVector(d, r * (0.45 + 0.55 * R()));
    const s = o.card * (0.7 + 0.6 * R());
    const face = d.clone().lerp(new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5), 0.6).normalize();
    const u = perp(face), v = new THREE.Vector3().crossVectors(face, u).normalize();
    const rot = R() * Math.PI * 2, cr = Math.cos(rot), sr = Math.sin(rot);
    const uu = u.clone().multiplyScalar(cr).addScaledVector(v, sr).multiplyScalar(s);
    const vv = v.clone().multiplyScalar(cr).addScaledVector(u, -sr).multiplyScalar(s);
    const ln = p.clone().sub(crownC).normalize().lerp(UP, 0.3).normalize();
    cb.add(p, uu, vv, ln);
  }
}

// Puu plaanipunktis (X, Y) määratud aluskõrgusel.
export function kasvataPuu(B, cards, X, Y, base, height, crownR, o, seed) {
  const R = rng(seed);
  const root = new THREE.Vector3(X, base, -Y);
  const la = R() * Math.PI * 2, lean = o.lean * (0.5 + R());
  const fork = new THREE.Vector3(X + Math.cos(la) * lean * o.forkH, base + o.forkH, -Y + Math.sin(la) * lean * o.forkH);
  const mid = root.clone().lerp(fork, 0.5).add(new THREE.Vector3((R() - 0.5) * o.trunkR, 0, (R() - 0.5) * o.trunkR));
  const top = fork.clone().add(new THREE.Vector3(0, o.trunkR * 1.5, 0));
  const trunk = new THREE.CatmullRomCurve3([root.clone().setY(base - 0.15), mid, top]);
  B.add('puukoor', ahenevToru(trunk, 8, o.radial, o.trunkR, o.trunkR * 0.7, {
    rFn: (t) => o.trunkR * (0.72 + 0.28 * (1 - t) + 0.5 * Math.pow(Math.max(0, 1 - t * 5), 2)),
    uvAround: 0.5, uvAlong: 1.0,
  }));
  for (let i = 0; i < (o.roots || 0); i++) {
    const a = la + (i / o.roots) * Math.PI * 2 + (R() - 0.5) * 0.6;
    const L = o.trunkR * (2.2 + R() * 1.6);
    const s0 = root.clone().add(new THREE.Vector3(Math.cos(a) * o.trunkR * 0.6, 0.35, Math.sin(a) * o.trunkR * 0.6));
    const s1 = root.clone().add(new THREE.Vector3(Math.cos(a) * L, -0.05, Math.sin(a) * L));
    oks(B, s0, s1, o.trunkR * 0.42, 0.04, 0.05, 5);
  }
  const hc = height - o.forkH;
  const crownC = fork.clone().add(new THREE.Vector3(0, hc * 0.5, 0));
  const rx = crownR, ry = hc * 0.5;
  const ends = [];
  const a0 = R() * Math.PI * 2;
  for (let i = 0; i < o.limbs; i++) {
    const a = a0 + (i / o.limbs) * Math.PI * 2 + (R() - 0.5) * 0.7;
    const reach = rx * o.limbLen * (0.75 + 0.45 * R());
    const up = ry * (-0.15 + 0.75 * R());
    const end = crownC.clone().add(new THREE.Vector3(Math.cos(a) * reach, up, Math.sin(a) * reach));
    const r0 = o.trunkR * o.limbR * (0.8 + 0.4 * R());
    oks(B, fork, end, r0, r0 * 0.3, hc * 0.12, Math.max(5, o.radial - 3));
    ends.push([end, 1.1]);
    for (let k = 0; k < o.subs; k++) {
      const t = 0.45 + 0.35 * R();
      const s = fork.clone().lerp(end, t);
      s.y += hc * 0.12 * 4 * t * (1 - t) * 0.9;
      const b2 = a + (R() - 0.5) * 1.6, len = rx * (0.25 + 0.3 * R());
      const e2 = s.clone().add(new THREE.Vector3(Math.cos(b2) * len, ry * (0.1 + 0.5 * R()), Math.sin(b2) * len));
      oks(B, s, e2, r0 * 0.45, r0 * 0.12, len * 0.1, 4);
      ends.push([e2, 0.85]);
    }
  }
  for (const [e, k] of ends) lehekimp(B, cards, o, R, e, o.clumpR * k * (0.8 + 0.4 * R()), crownC);
  for (let i = 0; i < o.extra; i++) {
    const th = R() * Math.PI * 2, ph = Math.acos(1 - 2 * Math.pow(R(), 0.8)), rr = 0.55 + 0.4 * R();
    const p = crownC.clone().add(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * rx * rr, Math.cos(ph) * ry * rr, Math.sin(ph) * Math.sin(th) * rx * rr));
    lehekimp(B, cards, o, R, p, o.clumpR * (0.7 + 0.6 * R()), crownC);
  }
  return { crownC, rx, ry };
}

// Hekk: pügatud risttahukas ebakorrapärase ülapinnaga.
export function hekirida(B, X0, X1, Y0, Y1, h, seed, mat = 'hekk') {
  B.add(mat, plaanikast(X0, X1, Y0, Y1, 0, h, { faces: 'NSEWT' }));
  const R = rng(seed), alongX = (X1 - X0) >= (Y1 - Y0);
  const L = alongX ? X1 - X0 : Y1 - Y0, n = Math.max(1, Math.round(L / 0.75));
  const w = alongX ? Y1 - Y0 : X1 - X0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cx = alongX ? X0 + t * (X1 - X0) : (X0 + X1) / 2 + R.range(-0.08, 0.08);
    const cy = alongX ? (Y0 + Y1) / 2 + R.range(-0.08, 0.08) : Y0 + t * (Y1 - Y0);
    B.add(mat, blob(cx, h - 0.06, -cy, w * 0.56, { rng: R, sx: alongX ? 1.25 : 1, sz: alongX ? 1 : 1.25, sy: 0.42, rough: 0.5, detail: 1 }));
  }
}

export function looTaimestik(B, ctx) {
  const cards = { suurpuuLehed: new LehepindadeKogum(), pargipuuLehed: new LehepindadeKogum() };
  const info = { park: [], fore: [], big: [] };

  // Väikepargis on täpselt kuus puud; iga puu ümber kiviservaga roheline istutusruut.
  PARK.trees.forEach(([X, Y], i) => {
    const hgt = 8.4 + (i * 0.37) % 1.4;
    info.park.push(kasvataPuu(B, cards, X, Y, 0.12, hgt, 2.5 + (i % 3) * 0.25, PARK_TREE, 500 + i * 17));
    ctx.col.circle(X, Y, 0.30, 4, 'parkTree');
    const s = 0.7;
    B.add('muru', taidaHulknurk([[X - s, Y - s], [X + s, Y - s], [X + s, Y + s], [X - s, Y + s]], 0.135));
    for (const b of [[X - s - 0.08, X + s + 0.08, Y - s - 0.08, Y - s], [X - s - 0.08, X + s + 0.08, Y + s, Y + s + 0.08],
      [X - s - 0.08, X - s, Y - s, Y + s], [X + s, X + s + 0.08, Y - s, Y + s]]) {
      B.add('tumeGraniit', plaanikast(b[0], b[1], b[2], b[3], 0.12, 0.2, { faces: 'NSEWT' }));
    }
  });
  // H2 esiväljaku väikesed puud: hõredad võrad, loodud pargipuude generaatoriga.
  const small = { ...PARK_TREE, forkH: 1.9, trunkR: 0.09, limbs: 4, extra: 6, clumpR: 0.7, cards: 9, card: 0.8 };
  (ctx.h2 && ctx.h2.trees || []).forEach(([X, Y, H], i) => {
    info.fore.push(kasvataPuu(B, cards, X, Y, 0.1, H, 1.5 + (i % 2) * 0.3, small, 700 + i * 13));
  });

  // Suured puud aia taga kõrgendatud pinnasel.
  SUURED_PUUD.forEach(([X, Y, H, CR], i) => {
    const o = { ...BIG_TREE, trunkR: 0.42 + (i % 3) * 0.08, forkH: 4.0 + (i % 4) * 0.5 };
    ctx.col.circle(X, Y, o.trunkR, H, 'bigTree');
    info.big.push(kasvataPuu(B, cards, X, Y, 0.62, H, CR, o, 900 + i * 31));
  });

  // Lihtsustatud mets suurte puude taga varjab aia kohal taevast.
  const R = rng(77);
  // Võrade alumine serv on umbes 5 m kõrgusel; detailsus 2 ja kaks-kolm kera puu kohta.
  // Nii ei meenuta mets udus nurgelisi telke.
  for (let i = 0, accepted = 0; i < 250 && accepted < 34; i++) {
    const X = 12 + R() * 52, Y = -46 + R() * 100;
    if (!punktHulknurgas([X, Y], ctx.soilPoly) || project(ctx.aiaJoon, [X,Y]).d < 3) continue;
    accepted++;
    const r = 4.2 + R() * 3.6, sy = 0.68;
    const h = Math.max(9.5 + R() * 7, 5.2 + r * sy * 1.3);
    B.add('kaugeLehestik', blob(X, h, -Y, r, { rng: R, sy, rough: 0.42, detail: 2 }));
    const n = 1 + (R() < 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, d = r * (0.55 + R() * 0.3), rr = r * (0.55 + R() * 0.2);
      B.add('kaugeLehestik', blob(X + Math.cos(a) * d, h + r * (0.1 + R() * 0.35), -(Y + Math.sin(a) * d), rr, { rng: R, sy: 0.72, rough: 0.4, detail: 2 }));
    }
    const tr = 0.32 + R() * 0.16;
    B.add('puukoor', ahenevToru(new THREE.LineCurve3(new THREE.Vector3(X, 0.6, -Y), new THREE.Vector3(X + (R() - 0.5) * 0.8, h - r * sy * 0.4, -Y)), 1, 6, tr, tr * 0.6));
  }

  // Hekid H1 musta aia taga ning pargi H1-poolsel ja põhjapoolsel piiril; põhjahekk lõpeb E2 äärekivi ees.
  // H2 tänavahekid luuakse esiväljaku osana ning pööratakse koos hoonega.
  const hekiIda = ctx.pargiIdaX(PARK.Y1 - 0.45) - 0.35;
  hekirida(B, -31.0, -23.7, 5.75, 6.45, 0.95, 11);
  hekirida(B, -15.25, -14.5, PARK.Y0 + 0.9, PARK.Y1 - 0.4, 1.0, 16);
  hekirida(B, -14.5, hekiIda, PARK.Y1 - 0.8, PARK.Y1 - 0.1, 1.15, 17);
  for (const [x, y, r] of [[-13.9, PARK.Y1 - 1.4, 0.7], [-12.6, PARK.Y1 - 1.2, 0.6], [hekiIda - 0.9, PARK.Y1 - 1.3, 0.65], [-14.2, 6.0, 0.55], [-14.3, 12.0, 0.5]]) {
    B.add('hekk', blob(x, 0.45, -y, r, { rng: R, sy: 0.7, rough: 0.5, detail: 1 }));
  }

  // Hekkide kokkupõrkekehad lähtuvad nende piiridest.
  ctx.col.box(-31.0, -23.7, 5.75, 6.45, 0.95, 'hekk');
  ctx.col.box(-15.25, -14.5, PARK.Y0 + 0.9, PARK.Y1 - 0.4, 1.0, 'hekk');
  ctx.col.box(-14.5, hekiIda, PARK.Y1 - 0.8, PARK.Y1 - 0.1, 1.15, 'hekk');
  for (const [k, cb] of Object.entries(cards)) { const g = cb.geometry(); if (g) B.add(k, g); }
  return info;
}
