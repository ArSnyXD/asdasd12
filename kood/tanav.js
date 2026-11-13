// Tänavadetailid: kivisoklil balustraad piki E2, ümardatud nurk J juures ning jätk E1 ääres.
// Betoonpostid rippuvate juhtmetega, dekoratiivlaternad, LED-valgustid ja liiklusmärgid.
// Pargipostid, raamid ja plokid, kaks joogiautomaati H2 juures ning läbipääsutõkked.
// Kolme käigutee otsad ja kõigi objektide kokkupõrkekehad.
import * as THREE from 'three';
import { PLAAN, PARK, H2, h2Plaan } from './seaded.js';
import { nihutatudJoon, punktKaugusel, kogupikkused, beam, obox, cyl, plaanikast, ahenevToru, rippuvKover, plate, vwall, ribbon, fassaadinelinurk } from './abifunktsioonid.js';
import { on, suundKohas, joonePikkus } from './geomeetria.js';

function looAed(B, ctx) {
  const fl = ctx.aiaJoon;
  // Kivisokkel betoonparapetiga; taga kõrgendatud pinnas, tänav jääb joone paremale küljele.
  B.add('kivimuuriPind', vwall(nihutatudJoon(fl, -0.2), 0, 0.58));
  B.add('betoon', vwall(nihutatudJoon(fl, -0.24), 0.56, 0.64));
  B.add('betoon', ribbon(fl, -0.24, 0.3, 0.64));
  // Balustraad: kaetud postid, ülemine ja alumine rõhttala ning lühikesed balustrid.
  const L = kogupikkused(fl), total = L[L.length - 1];
  const n = Math.round(total / 1.9), posts = [];
  for (let i = 0; i <= n; i++) posts.push(punktKaugusel(fl, (i / n) * total));
  for (const q of posts) {
    const ang = Math.atan2(q.t[1], q.t[0]);
    B.add('aiakivi', obox(q.p[0], q.p[1], 0.64, 0.21, 0.84, 0.21, ang, true));
    B.add('aiakivi', obox(q.p[0], q.p[1], 1.48, 0.27, 0.06, 0.27, ang, true));
    B.add('aiakivi', cyl(q.p[0], q.p[1], 1.54, 0.0, 0.18, 0.11, 4, ang + Math.PI / 4));
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i].p, b = posts[i + 1].p;
    B.add('aiakivi', beam(a, b, 1.25, 1.37, 0.15, { uvMeters: true }));
    B.add('aiakivi', beam(a, b, 0.64, 0.75, 0.17, { uvMeters: true }));
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(2, Math.round(d / 0.27));
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let k = 1; k < m; k++) {
      const t = k / m;
      B.add('aiakivi', obox(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.75, 0.075, 0.5, 0.075, ang, true));
    }
  }
  // Aia teljel läbimatu sein tegelasele ja kaamerale.
  ctx.col.polyline(nihutatudJoon(fl, 0.05), 0.25, 1.55, 'aed');
}

// Postid.

const POLE_H = 11.0;

function juhe(B, a, b, sag, r, mat = 'juhe') {
  const len = a.distanceTo(b);
  B.add(mat, ahenevToru(rippuvKover(a, b, sag, 12), Math.max(8, Math.round(len / 1.2)), 3, r, r));
}

function looPostid(B, ctx, lights) {
  const e2 = ctx.e2c, e1 = ctx.e1c, fp = ctx.aiaJoon, sMid = ctx.cornerS;
  const P = {
    M: [-46.0, 2.0], G: [-31.2, 3.95], A: [-28.6, -2.7], B: [-14.3, -2.45],
    C: on(e1, 7.5, -3.0), D: on(fp, sMid, -0.95), E: on(e2, 15, -2.85), F: on(e1, 16, 2.95),
    H: on(e2, 18.5, 2.75), K: on(e2, 31, -2.85), L: on(e1, 31, 2.95),
  };
  ctx.poles = P;
  const SPANS = [['M', 'G'], ['G', 'A'], ['A', 'B'], ['B', 'D'], ['D', 'C'], ['C', 'F'], ['D', 'E'], ['D', 'F'], ['D', 'H'], ['E', 'K'], ['F', 'L']];
  const LOWV = new Set(['A-B', 'B-D', 'D-E', 'D-F', 'G-A', 'M-G']);

  // Risttala suund on juhtmeavade keskmise suunaga risti.
  const arm = {};
  for (const k of Object.keys(P)) {
    const dirs = [];
    for (const [a, b] of SPANS) {
      if (a !== k && b !== k) continue;
      const o = P[a === k ? b : a];
      const d = new THREE.Vector2(o[0] - P[k][0], o[1] - P[k][1]).normalize();
      if (dirs.length && d.dot(dirs[0]) < 0) d.negate();
      dirs.push(d);
    }
    const w = dirs.reduce((s, d) => s.add(d), new THREE.Vector2()).normalize();
    arm[k] = new THREE.Vector2(-w.y, w.x);
  }
  for (const [k, [X, Y]] of Object.entries(P)) {
    B.add('post', cyl(X, Y, 0, 0.12, 0.17, POLE_H, 10));
    B.add('tumeBetoon', cyl(X, Y, 0, 0.21, 0.21, 0.1, 10));
    const c = arm[k];
    B.add('hallMetall', beam([X - c.x * 0.95, Y - c.y * 0.95], [X + c.x * 0.95, Y + c.y * 0.95], 10.3, 10.42, 0.09));
    B.add('hallMetall', beam([X - c.x * 0.45, Y - c.y * 0.45], [X + c.x * 0.45, Y + c.y * 0.45], 8.78, 8.88, 0.08));
    for (const s of [-0.75, 0, 0.75]) B.add('valge', cyl(X + c.x * s, Y + c.y * s, 10.42, 0.035, 0.05, 0.13, 6));
    B.add('hallMetall', beam([X - 0.18, Y], [X + 0.18, Y], 6.55, 6.62, 0.36));
    ctx.col.circle(X, Y, 0.2, POLE_H, 'post');
  }
  // Trafo.
  for (const k of ['A', 'D']) {
    const [X, Y] = P[k], c = arm[k], nx = -c.y, ny = c.x;
    const tx = X + nx * 0.45, ty = Y + ny * 0.45;
    B.add('hallMetall', cyl(tx, ty, 7.3, 0.3, 0.3, 1.0, 12));
    B.add('tumeMetall', cyl(tx, ty, 8.3, 0.12, 0.31, 0.12, 12));
    B.add('tumeMetall', beam([X, Y], [tx, ty], 7.6, 7.68, 0.08));
  }
  // Kollamustad kaitsekatted ristmikul.
  for (const k of ['C', 'D']) {
    const [X, Y] = P[k];
    for (let i = 0; i < 6; i++) B.add(i % 2 ? 'mustMetall' : 'kollane', cyl(X, Y, 0.25 + i * 0.3, 0.19, 0.19, 0.3, 10));
  }
  // Juhe.
  const V = (p, h, c, s) => new THREE.Vector3(p[0] + c.x * s, h, -(p[1] + c.y * s));
  for (const [a, b] of SPANS) {
    const pa = P[a], pb = P[b], ca = arm[a];
    let cb = arm[b];
    if (ca.dot(cb) < 0) cb = cb.clone().negate();
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    for (const s of [-0.75, 0, 0.75]) juhe(B, V(pa, 10.52, ca, s), V(pb, 10.52, cb, s), 0.12 + 0.016 * len, 0.016);
    if (LOWV.has(a + '-' + b)) for (const s of [-0.35, 0.35]) juhe(B, V(pa, 8.95, ca, s), V(pb, 8.95, cb, s), 0.2 + 0.02 * len, 0.018);
    juhe(B, V(pa, 6.5, ca, 0.2), V(pb, 6.5, cb, 0.2), 0.3 + 0.026 * len, 0.03);
    juhe(B, V(pa, 6.15, ca, -0.18), V(pb, 6.15, cb, -0.18), 0.34 + 0.03 * len, 0.024);
  }
  // Hooldusava.
  const n3 = on(e1, 14.2, -4.45);
  const drops = [['B', [-16.1, 5.45, 6.6]], ['A', [-27.9, -3.75, 6.2]], ['C', [n3[0], n3[1], 7.2]], ['H', [0.0, 20.5, 7.5]], ['G', [-31.8, 8.5, 6.8]]];
  for (const [k, [X, Y, h]] of drops) {
    const p = P[k];
    juhe(B, new THREE.Vector3(p[0], 8.0, -p[1]), new THREE.Vector3(X, h, -Y), 0.35, 0.014);
    juhe(B, new THREE.Vector3(p[0], 6.3, -p[1]), new THREE.Vector3(X, h - 0.5, -Y), 0.4, 0.016);
  }
  // LED-valgustid postidel: konsool tänava telje poole.
  const ledAt = (k, tx, ty) => {
    const [X, Y] = P[k], d = new THREE.Vector2(tx - X, ty - Y).normalize();
    const hx = X + d.x * 1.5, hy = Y + d.y * 1.5;
    B.add('hallMetall', beam([X, Y], [hx, hy], 6.9, 6.98, 0.07));
    B.add('hallMetall', obox(hx, hy, 6.86, 0.62, 0.1, 0.26, Math.atan2(d.y, d.x)));
    B.add('led', obox(hx, hy, 6.84, 0.5, 0.02, 0.2, Math.atan2(d.y, d.x)));
    lights.push({ X: hx, Y: hy, h: 6.6, color: 0xdfe6f2, intensity: 34, distance: 22 });
  };
  ledAt('B', -14.3, 1.25);
  ledAt('E', 2.5, 15.0);
  const c0 = on(e1, 7.5, 0);
  ledAt('C', c0[0], c0[1]);
}

// Dekoratiivlaternad ja pargivalgustid.

function dekoratiivlatern(B, ctx, X, Y, lights) {
  B.add('mustMetall', cyl(X, Y, 0, 0.15, 0.2, 0.42, 10));
  B.add('mustMetall', cyl(X, Y, 0.42, 0.055, 0.085, 3.45, 8));
  B.add('mustMetall', cyl(X, Y, 3.87, 0.0, 0.07, 0.32, 8));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5, dx = Math.cos(a), dy = Math.sin(a);
    const p0 = new THREE.Vector3(X, 3.62, -Y);
    const p1 = new THREE.Vector3(X + dx * 0.32, 3.86, -(Y + dy * 0.32));
    const p2 = new THREE.Vector3(X + dx * 0.48, 3.62, -(Y + dy * 0.48));
    B.add('mustMetall', ahenevToru(new THREE.CatmullRomCurve3([p0, p1, p2]), 8, 4, 0.025, 0.02));
    const hx = X + dx * 0.48, hy = Y + dy * 0.48;
    B.add('mustMetall', cyl(hx, hy, 3.5, 0.03, 0.07, 0.12, 8));
    B.add('lambiKlaas', cyl(hx, hy, 3.2, 0.075, 0.15, 0.3, 10));
  }
  lights.push({ X, Y, h: 3.25, color: 0xffb46e, intensity: 16, distance: 16 });
  ctx.col.circle(X, Y, 0.2, 3.9, 'lamp');
}

function pargivalgusti(B, ctx, X, Y, lights) {
  B.add('tumeMetall', cyl(X, Y, 0.12, 0.07, 0.09, 3.8, 8));
  B.add('lambiKlaas', cyl(X, Y, 3.92, 0.16, 0.16, 0.42, 12));
  B.add('tumeMetall', cyl(X, Y, 4.34, 0.05, 0.22, 0.1, 12));
  lights.push({ X, Y, h: 3.9, color: 0xffd09a, intensity: 12, distance: 14 });
  ctx.col.circle(X, Y, 0.1, 4.3, 'lamp');
}

// Liiklusmärgid, postid ja pargimööbel.

function sign(B, ctx, X, Y, h, size, faceAng, mat) {
  B.add('hallMetall', cyl(X, Y, 0, 0.03, 0.03, h + size * 0.45, 6));
  B.add(mat, plate(X, Y, h, size, size, faceAng, 0.04));
  B.add(mat + 'Taga', plate(X, Y, h, size, size, faceAng + Math.PI, -0.035));
  ctx.col.circle(X, Y, 0.05, h, 'sign');
}

function tokestuspost(B, ctx, X, Y, striped) {
  if (striped) {
    for (let i = 0; i < 4; i++) B.add(i % 2 ? 'valge' : 'punane', cyl(X, Y, i * 0.2, 0.06, 0.06, 0.2, 10));
    B.add('valge', cyl(X, Y, 0.8, 0.0, 0.06, 0.06, 10));
  } else {
    B.add('hallMetall', cyl(X, Y, 0, 0.055, 0.055, 0.8, 10));
    B.add('hallMetall', cyl(X, Y, 0.8, 0.0, 0.055, 0.05, 10));
    B.add('kollane', cyl(X, Y, 0.62, 0.058, 0.058, 0.06, 10));
  }
  ctx.col.circle(X, Y, 0.07, 0.85, 'tokestuspost');
}

function looPark(B, ctx) {
  for (const [X, Y] of PARK.frames) {
    const s = 1.3, h = 3.0, t = 0.08;
    for (const [dx, dy] of [[-s, -s], [s, -s], [s, s], [-s, s]]) {
      B.add('valge', plaanikast(X + dx - t, X + dx + t, Y + dy - t, Y + dy + t, 0.12, h, { faces: 'NSEW' }));
      ctx.col.circle(X + dx, Y + dy, 0.1, h, 'frame');
    }
    B.add('valge', plaanikast(X - s - t, X + s + t, Y - s - t, Y - s + t, h - 0.2, h, { faces: 'NSEWTB' }));
    B.add('valge', plaanikast(X - s - t, X + s + t, Y + s - t, Y + s + t, h - 0.2, h, { faces: 'NSEWTB' }));
    B.add('valge', plaanikast(X - s - t, X - s + t, Y - s + t, Y + s - t, h - 0.2, h, { faces: 'EWTB' }));
    B.add('valge', plaanikast(X + s - t, X + s + t, Y - s + t, Y + s - t, h - 0.2, h, { faces: 'EWTB' }));
    for (const k of [-0.65, 0, 0.65]) B.add('valge', plaanikast(X - s + t, X + s - t, Y + k - 0.05, Y + k + 0.05, h - 0.14, h - 0.04, { faces: 'NSTB' }));
  }
  for (const [X, Y, a] of PARK.blocks) {
    B.add('tumeGraniit', obox(X, Y, 0.12, 1.6, 0.45, 0.5, a, true));
    ctx.col.obox(X, Y, 0.8, 0.25, a, 0.57, 'block');
  }
  // Kivipostid serva ääres, pargi sissepääsudes vahed.
  const inner = nihutatudJoon(ctx.parkCurb, 0.35);
  const L = kogupikkused(inner), total = L[L.length - 1];
  for (let s = 0.6; s < total - 0.4; s += 1.8) {
    const q = punktKaugusel(inner, s);
    const gapMain = q.p[0] > -10.9 && q.p[0] < -8.1 && q.p[1] < 6.0;              // Sissepääs S–J kõnniteelt.
    const gapE2 = ((q.p[1] > 8.6 && q.p[1] < 11.2) || (q.p[1] > 17.0 && q.p[1] < 19.6)) && q.p[0] > -1.5;   // Kaks sissepääsu E2-lt.
    if (gapMain || gapE2) continue;
    B.add('graniit', obox(q.p[0], q.p[1], 0.12, 0.2, 0.55, 0.2, Math.atan2(q.t[1], q.t[0]), true));
    ctx.col.circle(q.p[0], q.p[1], 0.13, 0.67, 'post');
  }
}

// Värav.

function teetoke(B, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  B.add('toke', beam(a, b, 0.8, 0.98, 0.035, { uvMeters: true }));
  B.add('toke', beam(a, b, 0.4, 0.54, 0.035, { uvMeters: true }));
  for (const [p, sg] of [[a, 1], [b, -1]]) {
    const q = [p[0] + ux * 0.07 * sg, p[1] + uy * 0.07 * sg];
    for (const s of [-1, 1]) {
      const top = new THREE.Vector3(q[0], 1.02, -q[1]);
      const foot = new THREE.Vector3(q[0] + nx * 0.32 * s, 0.0, -(q[1] + ny * 0.32 * s));
      B.add('tumeMetall', ahenevToru(new THREE.CatmullRomCurve3([foot, top]), 1, 4, 0.022, 0.022));
    }
  }
}

function koonus(B, X, Y) {
  B.add('mustMetall', plaanikast(X - 0.19, X + 0.19, Y - 0.19, Y + 0.19, 0, 0.04, { faces: 'NSEWT' }));
  B.add('koonus', cyl(X, Y, 0.04, 0.035, 0.16, 0.66, 12));
  B.add('valge', cyl(X, Y, 0.3, 0.094, 0.116, 0.12, 12));
}

// a/b on tõkke otspunktid, face lähenemissuund, ca/cb kokkupõrkekeha otspunktid.
function tokkerida(B, ctx, a, b, face, ca = a, cb = b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const n = Math.max(1, Math.round(L / 1.6)), gap = 0.1, seg = (L - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const s0 = i * (seg + gap), s1 = s0 + seg;
    teetoke(B, [a[0] + ux * s0, a[1] + uy * s0], [a[0] + ux * s1, a[1] + uy * s1]);
  }
  const fx = Math.cos(face), fy = Math.sin(face);
  koonus(B, a[0] + fx * 0.45 + ux * 0.25, a[1] + fy * 0.45 + uy * 0.25);
  koonus(B, b[0] + fx * 0.45 - ux * 0.25, b[1] + fy * 0.45 - uy * 0.25);
  // Läbipääsu keelav silt keskmisel toel vahetult tõkete ees.
  const mx = (a[0] + b[0]) / 2 + fx * 0.12, my = (a[1] + b[1]) / 2 + fy * 0.12;
  for (const s of [-0.34, 0.34]) B.add('hallMetall', cyl(mx + ux * s, my + uy * s, 0, 0.025, 0.025, 1.62, 6));
  B.add('suletudSilt', plate(mx, my, 1.2, 0.62, 0.84, face, 0.03));
  B.add('suletudSiltTaga', plate(mx, my, 1.2, 0.62, 0.84, face + Math.PI, -0.02));
  B.add('merevaigulamp', cyl(mx + ux * 0.34, my + uy * 0.34, 1.62, 0.05, 0.05, 0.09, 8));
  ctx.col.seg(ca, cb, 0.25, 1.2, 'toke');
}

function looTokked(B, ctx) {
  const { e1c, e2c } = ctx;
  // Tänava lääneots alguspunkti S juures.
  const xw = PLAAN.laanetoke;
  tokkerida(B, ctx, [xw, -4.8], [xw, 6.2], 0, [xw, -6.0], [xw, 7.4]);
  // E1: 26 m ristmikust J, aiast N3 fassaadini.
  const s1 = PLAAN.tokeE1, f1 = suundKohas(e1c, s1) + Math.PI;
  tokkerida(B, ctx, on(e1c, s1, 3.75), on(e1c, s1, -4.35), f1, on(e1c, s1, 4.2), on(e1c, s1, -6.0));
  // E2: 26 m ristmikust J, aiast valge maja seinani.
  const s2 = PLAAN.tokeE2, f2 = suundKohas(e2c, s2) + Math.PI;
  tokkerida(B, ctx, on(e2c, s2, -3.5), on(e2c, s2, 4.75), f2, on(e2c, s2, -4.0), on(e2c, s2, 5.6));
}

export function looTanav(B, ctx) {
  const lights = ctx.lights;
  looAed(B, ctx);
  looPostid(B, ctx, lights);
  dekoratiivlatern(B, ctx, -29.6, 4.05, lights);
  dekoratiivlatern(B, ctx, -20.2, 4.65, lights);
  pargivalgusti(B, ctx, -3.4, 5.4, lights);
  pargivalgusti(B, ctx, -2.4, 21.2, lights);
  // Peatumismärk E2-lt ristmikule lähenejale ning parkimiskeelumärk.
  const sTan = ctx.cornerS - 2.6;
  const sp = on(ctx.aiaJoon, sTan - 0.5, -1.2);
  sign(B, ctx, sp[0], sp[1], 2.35, 0.8, suundKohas(ctx.e2c, 9.0), 'peatumismark');
  sign(B, ctx, -1.7, 4.95, 2.3, 0.6, Math.atan2(-4.95, 1.7), 'parkimiskeeld');
  // Postid: kolm aia nurgas, kaks E2 ääres, triibulised H2 juures.
  for (const ds of [-2.4, 0, 2.4]) { const p = on(ctx.aiaJoon, ctx.cornerS + ds, -1.45); tokestuspost(B, ctx, p[0], p[1], false); }
  for (const s of [8.5, 11.0]) { const p = on(ctx.e2c, s, -2.4); tokestuspost(B, ctx, p[0], p[1], false); }
  // Triibulised postid H2 sissesõidu suudmes, H2 kohalikes koordinaatides.
  for (const x of [ctx.h2.drive[0] - 0.45, ctx.h2.drive[1] + 0.45]) { const p = h2Plaan(x, ctx.h2.edgeY(x) - 0.45); tokestuspost(B, ctx, p[0], p[1], true); }
  looPark(B, ctx);
  looTokked(B, ctx);
  return lights;
}
