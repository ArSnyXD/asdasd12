// Stiliseeritud jalutav tegelane.
// Must tuka ja näoäärsete salkudega soeng, valge mask, avatud tume tepitud sulejope,
// puhvis varrukad, tumehall kampsun, rinnale rippuva otsaga sall ja tumesinine
// plisseeritud seelik, heledad sukkpüksid ning paksu tallaga kõrged tumepruunid saapad.
// Mudel luuakse koodiga, ühendades ristlõikerõngad keha, varrukate ja jalgade pindadeks.
// Jalalabad, tallad, juuksed ja mask; kätel peopesa, neli kõverdatud sõrme ning pöial.
// Iga liigese geomeetria ühendatakse materjalide kaupa, et vähendada joonistamiskutseid.
// Luustik: vaagen → kere → kael/pea; õlg → küünarnukk → käsi;
// puus → põlv → pahkluu. Seismine, kõnd ja jooks segunevad tegeliku kiiruse järgi.
// Keha toetub tugijala kanna või varba madalaimale punktile; jalad ei vaju maa alla.
// Tegelane vaatab kohaliku +Z suunas; y-pööre on plaanisuund + π/2.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const COL = {
  nahk: 0xe9d5c8, juuksed: 0x141317, mask: 0xeeede9, jacket: 0x2a2c32, sweater: 0x3c3b41,
  scarf: 0x30211f, skirt: 0x1d2640, tights: 0xd5d2ce, boots: 0x30221a, sole: 0x141110, eye: 0x1a1210,
};

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const nrm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const along = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l, p[2] + d[2] * l];

function looTegelaseMaterjalid() {
  const m = (color, o = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, vertexColors: true, ...o });
  return {
    nahk: m(COL.nahk, { roughness: 0.68 }),
    juuksed: m(COL.juuksed, { roughness: 0.42, side: THREE.DoubleSide }),
    mask: m(COL.mask, { roughness: 0.9, side: THREE.DoubleSide }),
    jacket: m(COL.jacket, { roughness: 0.75, side: THREE.DoubleSide }),
    sweater: m(COL.sweater, { roughness: 0.95 }),
    // Vill ilma peegelhelgita: automaatide valgustid ei pleegita salli ülapinda.
    scarf: new THREE.MeshLambertMaterial({ color: COL.scarf, vertexColors: true }),
    skirt: m(COL.skirt, { roughness: 0.85, side: THREE.DoubleSide }),
    tights: m(COL.tights, { roughness: 0.72 }),
    boots: m(COL.boots, { roughness: 0.42 }),
    sole: m(COL.sole, { roughness: 0.9 }),
    eye: m(COL.eye, { roughness: 0.3 }),
  };
}

// Geomeetria koostajad.

// Valmisgeomeetria ilma UV-ta, tipuvärvidega ühendamise ja õmbluste varjutamise jaoks.
function prep(g, shade = 1) {
  g.deleteAttribute('uv');
  if (!g.attributes.color) {
    const a = new Float32Array(g.attributes.position.count * 3).fill(shade);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
  return g;
}

const centreOf = (r) => {
  const c = [0, 0, 0];
  for (const p of r) { c[0] += p[0] / r.length; c[1] += p[1] / r.length; c[2] += p[2] / r.length; }
  return c;
};
const ristSkalaarkorrutis = (a, b, c, o) => {   // ((c − a) × (b − a)) · (a − o)
  const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
  return nx * (a[0] - o[0]) + ny * (a[1] - o[1]) + nz * (a[2] - o[2]);
};

// Ristlõikerõngaste pind; kõigil rõngastel sama arv punkte kujul [x, y, z].
// Varjutus on värvikordaja rõnga kaupa või funktsioonina (j, i); rõngaid saab sulgeda.
// Esimese ja viimase otsa sulgemine on valikuline; normaalid suunatakse automaatselt välja.
function surf(rings, { shade = null, closed = true, cap0 = false, cap1 = false } = {}) {
  const n = rings[0].length, R = rings.length, pos = [], col = [], idx = [];
  const sh = typeof shade === 'function' ? shade : (j) => (shade ? shade[j] : 1);
  const put = (p, k) => { pos.push(p[0], p[1], p[2]); col.push(k, k, k); return pos.length / 3 - 1; };
  for (let j = 0; j < R; j++) for (let i = 0; i < n; i++) put(rings[j][i], sh(j, i));
  const m = closed ? n : n - 1;
  const j0 = Math.floor((R - 1) / 2), c0 = centreOf(rings[j0]);
  let dot = 0;
  for (let i = 0; i < m; i++) dot += ristSkalaarkorrutis(rings[j0][i], rings[j0][(i + 1) % n], rings[j0 + 1][i], c0);
  const flip = dot < 0;
  for (let j = 0; j < R - 1; j++) for (let i = 0; i < m; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n), c = a + n, d = b + n;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const cap = (j, away) => {
    const r = rings[j], c = centreOf(r), o = centreOf(rings[away]), k = sh(j, 0);
    const ci = put(c, k), base = pos.length / 3;
    for (const p of r) put(p, k);
    let s = 0;
    for (let i = 0; i < n; i++) s += ristSkalaarkorrutis(c, r[(i + 1) % n], r[i], o);   // Normaal (c, p_i, p_i+1).
    for (let i = 0; i < n; i++) {
      const a1 = base + i, b1 = base + ((i + 1) % n);
      if (s >= 0) idx.push(ci, a1, b1); else idx.push(ci, b1, a1);
    }
  };
  if (cap0) cap(0, 1);
  if (cap1) cap(R - 1, R - 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Rõngas vertikaaltelje ümber kõrgusel y: poollaius +X (xo) ja −X (xi), sügavus ees zf ja taga zb.
// e määrab superellipsi kandilisuse (2 = ellips); cx/cz kesknihke, a0..a1 kaare.
function rongasY(y, xo, xi, zf, zb, n, { e = 2, cx = 0, cz = 0, a0 = 0, a1 = TAU, closed = true } = {}) {
  const pts = [], q = 2 / e, cnt = closed ? n : n - 1;
  for (let i = 0; i < n; i++) {
    const t = a0 + ((a1 - a0) * i) / cnt, s = Math.sin(t), c = Math.cos(t);
    const ps = Math.sign(s) * Math.abs(s) ** q, pc = Math.sign(c) * Math.abs(c) ** q;
    pts.push([cx + ps * (s >= 0 ? xo : xi), y, cz + pc * (c >= 0 ? zf : zb)]);
  }
  return pts;
}

// Jalalaba või talla rõngas XY-tasandil kaugusel z: poollaius w, ülaserv yt ja alaserv yb.
// Laiem koht on tallal; e määrab ülaosa, eb lameda talla kandilisuse.
function rongasZ(z, w, yt, yb, n, e = 2.4, eb = 5) {
  const mid = yb + Math.min(0.022, (yt - yb) * 0.4), pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, s = Math.sin(t), c = Math.cos(t), up = s >= 0, q = 2 / (up ? e : eb);
    const px = Math.sign(c) * Math.abs(c) ** q, py = Math.sign(s) * Math.abs(s) ** q;
    pts.push([px * w, up ? mid + py * (yt - mid) : mid + py * (mid - yb), z]);
  }
  return pts;
}

// Püstine pind ridadest [y, xo, xi, zf, zb, vari?]; külg −1 vahetab sise- ja väliskülje.
function pindY(rows, n, { e = 2, side = 1, cap0 = false, cap1 = false } = {}) {
  const rings = rows.map((r) => rongasY(r[0], side > 0 ? r[1] : r[2], side > 0 ? r[2] : r[1], r[3], r[4], n, { e }));
  return surf(rings, { shade: rows.map((r) => r[5] ?? 1), cap0, cap1 });
}

// Kõrgusprofiil kahaneva y järgi: valitud veeru lineaarne interpolatsioon.
function profiilKohas(rows, y, col) {
  if (y >= rows[0][0]) return rows[0][col];
  for (let i = 1; i < rows.length; i++) {
    if (y >= rows[i][0]) {
      const a = rows[i - 1], b = rows[i];
      return lerp(b[col], a[col], (y - b[0]) / (a[0] - b[0]));
    }
  }
  return rows[rows.length - 1][col];
}

// Peegeldus X-telje järgi parema käe jaoks; kolmnurkade järjestus ja normaalid parandatakse.
function peegeldaX(g) {
  const m = g.clone();
  m.scale(-1, 1, 1);
  const ix = m.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  m.index.needsUpdate = true;
  return m;
}

const UP = new THREE.Vector3(0, 1, 0);
// Kapsel punktide a ja b vahel sõrmelüli jaoks.
function kapsel(a, b, r, radial = 6) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 2, radial);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return prep(g);
}

function ellipsoid(rx, ry, rz, x, y, z, ws = 10, hs = 8, rotY = 0) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rx, ry, rz);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return prep(g);
}

function merge(list, what) {
  const g = list.length === 1 ? list[0] : mergeGeometries(list);
  if (!g) throw new Error('Tegelase geomeetria ühendamine ebaõnnestus (' + what + ')');
  return g;
}

// Kehaosad ja riietus.

// Avatud sulejope kere koordinaatides: [y, poollaius, ees, taga, õmblusvari, kandilisus].
const JOPE = [
  [0.432, 0.074, 0.066, 0.070, 0.80, 2.0],   // Püstkrae.
  [0.418, 0.080, 0.070, 0.074, 1.00, 2.0],
  [0.398, 0.092, 0.076, 0.080, 0.85, 2.1],   // Krae.
  [0.382, 0.112, 0.084, 0.088, 1.00, 2.3],   // Õlakaar ilma õlapatjadeta.
  [0.362, 0.136, 0.096, 0.100, 1.00, 2.6],
  [0.338, 0.158, 0.108, 0.110, 0.95, 2.9],   // Õlajoon; varrukad algavad y = 0,335 juures.
  [0.300, 0.172, 0.120, 0.116, 0.62, 3.0],   // Passeõmblus.
  [0.258, 0.176, 0.131, 0.122, 1.00, 3.0],   // Rinnaosa.
  [0.216, 0.170, 0.128, 0.119, 0.62, 3.0],
  [0.172, 0.166, 0.130, 0.121, 1.00, 2.9],
  [0.128, 0.156, 0.122, 0.114, 0.62, 2.8],
  [0.084, 0.152, 0.123, 0.116, 1.00, 2.7],
  [0.040, 0.142, 0.115, 0.110, 0.62, 2.6],   // Vöökoht.
  [-0.004, 0.148, 0.121, 0.118, 1.00, 2.6],
  [-0.048, 0.150, 0.119, 0.120, 0.62, 2.6],
  [-0.090, 0.162, 0.130, 0.131, 1.00, 2.6],  // Alumised tepingud ja kerge laienemine.
  [-0.122, 0.166, 0.133, 0.134, 0.90, 2.6],  // Serv.
  [-0.131, 0.158, 0.125, 0.126, 0.55, 2.6],  // Alumine tagasipööre.
  [-0.126, 0.146, 0.113, 0.115, 0.40, 2.6],
];
const JACKET_OUT = JOPE.slice(0, 17);
const gapAt = (y) => lerp(0.028, 0.056, clamp01((0.432 - y) / 0.56));   // Poollaius.
const jacketFront = (y) => profiilKohas(JACKET_OUT, y, 2);

function jopeGeomeetria() {
  const n = 34, rings = [];
  for (const [y, w, f, b, , e] of JOPE) {
    const d = Math.asin(Math.min(0.95, (gapAt(y) / w) ** (e / 2)));
    rings.push(rongasY(y, w, w, f, b, n, { e, a0: d, a1: TAU - d, closed: false }));
  }
  const parts = [surf(rings, { shade: JOPE.map((r) => r[4]), closed: false })];
  // Mõlema hõlma avatud serva nähtav paksus.
  for (const k of [0, n - 1]) {
    const tube = rings.map((ring) => {
      const p = ring[k];
      return rongasY(p[1], 0.011, 0.011, 0.011, 0.011, 6, { cx: p[0], cz: p[2] - 0.004 });
    });
    parts.push(surf(tube, { shade: JOPE.map((r) => 0.85 + 0.15 * r[4]) }));
  }
  return merge(parts, 'jacket');
}

// Jopealune kampsun: [y, poollaius, ees, taga].
const KAMPSUN = [
  [0.445, 0.050, 0.048, 0.050], [0.405, 0.078, 0.066, 0.070], [0.365, 0.128, 0.088, 0.090],
  [0.305, 0.150, 0.110, 0.104], [0.245, 0.152, 0.119, 0.108], [0.165, 0.142, 0.114, 0.104],
  [0.065, 0.130, 0.104, 0.100], [-0.020, 0.134, 0.106, 0.104], [-0.110, 0.140, 0.110, 0.110],
  [-0.140, 0.136, 0.104, 0.106],
];
function kampsuniGeomeetria() {
  const rings = KAMPSUN.map((r) => rongasY(r[0], r[1], r[1], r[2], r[3], 28, { e: 2.6 }));
  return surf(rings, { shade: (j, i) => (i % 2 ? 0.84 : 1) });   // Soonik.
}

// Sall: kaks keerdu krae ümber ja rippuv ots vasaku hõlma peal.
function salliGeomeetria() {
  const loop = (R, tube, y, tilt, sx, sz, shade) => {
    const g = new THREE.TorusGeometry(R, tube, 8, 22);
    g.rotateX(Math.PI / 2); g.scale(sx, 1, sz); g.rotateX(tilt); g.translate(0, y, 0.004);
    return prep(g, shade);
  };
  // Keerud on tumendatud, et tugev ülaltvalgus ei muudaks bordoopunast roosaks.
  const parts = [loop(0.073, 0.027, 0.426, 0.2, 1.14, 1.06, 0.88), loop(0.064, 0.021, 0.452, -0.06, 1.12, 1.04, 0.78)];
  const rings = [];
  for (let k = 0; k <= 6; k++) {
    const t = k / 6, y = lerp(0.405, 0.165, t), hw = lerp(0.036, 0.032, t);
    rings.push(rongasY(y, hw, hw, 0.009, 0.009, 12, { e: 5, cx: 0.03 + 0.008 * t, cz: jacketFront(y) + 0.022 }));
  }
  parts.push(surf(rings, { shade: (j) => (j === 6 ? 0.8 : 1), cap1: true }));
  return merge(parts, 'scarf');
}

// Puhvis tepitud varrukad: [y, raadius, vari]. Ülaosa algab kupliga õlast.
// Alaosa algab küünarnukist ja lõpeb elastse manseti ning nähtava avaga.
const SLEEVE_UP = [
  [0.028, 0.014, 1.0], [0.022, 0.038, 1.0], [0.008, 0.054, 1.0], [-0.014, 0.063, 1.0],
  [-0.044, 0.065, 0.62], [-0.080, 0.066, 1.0], [-0.115, 0.062, 0.62], [-0.155, 0.064, 1.0],
  [-0.198, 0.058, 0.62], [-0.240, 0.060, 1.0], [-0.282, 0.055, 0.70], [-0.305, 0.050, 0.70],
];
const SLEEVE_LO = [
  [0.040, 0.046, 0.70], [0.012, 0.056, 1.0], [-0.032, 0.052, 0.62], [-0.076, 0.056, 1.0],
  [-0.120, 0.051, 0.62], [-0.162, 0.055, 1.0], [-0.198, 0.054, 0.85], [-0.214, 0.047, 0.75],
  [-0.228, 0.045, 0.80], [-0.236, 0.040, 0.55], [-0.233, 0.033, 0.35], [-0.215, 0.031, 0.30],
];
function varrukaGeomeetria(rows, s, cap0 = false) {
  const rings = rows.map(([y, r]) => rongasY(y, s > 0 ? r : r * 0.92, s > 0 ? r * 0.92 : r, r * 1.02, r * 1.04, 16));
  return surf(rings, { shade: rows.map((r) => r[2]), cap0 });
}

// Käsi randme koordinaatides: vasak, parem peegeldatult; peopesa sissepoole (−X),
// pöial ette (+Z), neli lõdvalt kahe lüli juurest kõverdatud sõrme.
function kaeGeomeetria() {
  const PEOPESA = [   // [y, tagapaksus, peopesapaksus, pöidlapoolne laius, väikesõrmepoolne laius, nihe]
    [0.030, 0.019, 0.019, 0.021, 0.021, 0.000],
    [0.004, 0.018, 0.018, 0.024, 0.024, 0.002],
    [-0.018, 0.017, 0.016, 0.031, 0.030, 0.004],
    [-0.042, 0.016, 0.015, 0.037, 0.034, 0.005],
    [-0.066, 0.015, 0.014, 0.038, 0.035, 0.004],
    [-0.082, 0.013, 0.012, 0.035, 0.033, 0.003],
    [-0.090, 0.008, 0.008, 0.028, 0.027, 0.003],
  ];
  const parts = [surf(PEOPESA.map((r) => rongasY(r[0], r[1], r[2], r[3], r[4], 14, { e: 2.5, cz: r[5] })), { cap1: true })];
  const SORMED = [   // [sõrmenukkide z, raadius, lülipikkused, lülipaine, pöidlapööre]
    [0.025, 0.0084, [0.036, 0.030], [0.30, 0.50], 0.10],
    [0.0085, 0.0088, [0.040, 0.033], [0.38, 0.58], 0.03],
    [-0.0075, 0.0082, [0.037, 0.030], [0.45, 0.62], -0.04],
    [-0.022, 0.0072, [0.029, 0.025], [0.52, 0.66], -0.12],
  ];
  for (const [z, r, L, a, sp] of SORMED) {
    const p0 = [-0.002, -0.083, z + 0.003];
    const p1 = along(p0, nrm(-Math.sin(a[0]), -Math.cos(a[0]), Math.sin(sp)), L[0]);
    const p2 = along(p1, nrm(-Math.sin(a[0] + a[1]), -Math.cos(a[0] + a[1]), Math.sin(sp)), L[1] - r);
    parts.push(kapsel(p0, p1, r), kapsel(p1, p2, r * 0.94));
  }
  const t0 = [-0.006, -0.012, 0.027];
  const t1 = along(t0, nrm(-0.3, -0.7, 0.5), 0.03);
  const t2 = along(t1, nrm(-0.52, -0.72, 0.28), 0.019);
  parts.push(kapsel(t0, t1, 0.0105), kapsel(t1, t2, 0.0092));
  parts.push(ellipsoid(0.012, 0.022, 0.014, -0.008, -0.032, 0.019, 8, 6));   // Pöidlapadi.
  return merge(parts, 'hand');
}

// Sukkpükstes reis ja saapasääre kohal olev säär: [y, väljas, sees, ees, taga].
const REIS = [
  // Taastamine 2026-11-12: arvuline muudatus puudus logist; peidetud reie ahenemine rekonstrueeriti.
  // Need väärtused on taastamise ligikaudne lahendus, mitte algse muudatuse täpne koopia.
  [0.030, 0.052, 0.048, 0.060, 0.064], [-0.010, 0.058, 0.052, 0.066, 0.070],
  [-0.070, 0.068, 0.058, 0.071, 0.074], [-0.170, 0.068, 0.058, 0.069, 0.070],
  [-0.270, 0.060, 0.052, 0.061, 0.060], [-0.350, 0.053, 0.048, 0.055, 0.052],
  [-0.410, 0.050, 0.046, 0.054, 0.048], [-0.440, 0.048, 0.045, 0.051, 0.047],
];
const SAAR = [[0.030, 0.049, 0.046, 0.051, 0.048], [-0.050, 0.050, 0.046, 0.050, 0.055], [-0.130, 0.051, 0.047, 0.049, 0.056]];
// Saapasäär põlve koordinaatides: sisesein → ääris → sääremari → pahkluuvoldid.
const SHAFT = [
  [-0.110, 0.055, 0.053, 0.054, 0.061, 0.30],
  [-0.072, 0.056, 0.054, 0.056, 0.062, 0.45],
  [-0.064, 0.060, 0.058, 0.060, 0.066, 0.90],
  [-0.070, 0.064, 0.062, 0.063, 0.070, 1.00],
  [-0.088, 0.063, 0.061, 0.062, 0.069, 0.78],
  [-0.094, 0.061, 0.059, 0.060, 0.067, 1.00],
  [-0.150, 0.062, 0.059, 0.059, 0.070, 1.00],
  [-0.210, 0.058, 0.055, 0.055, 0.064, 1.00],
  [-0.268, 0.052, 0.050, 0.051, 0.056, 1.00],
  [-0.296, 0.051, 0.049, 0.052, 0.054, 0.82],
  [-0.312, 0.048, 0.046, 0.049, 0.051, 1.00],
  [-0.330, 0.050, 0.048, 0.052, 0.052, 0.82],
  [-0.352, 0.046, 0.045, 0.050, 0.048, 1.00],
  [-0.382, 0.047, 0.045, 0.054, 0.047, 1.00],
  [-0.412, 0.046, 0.044, 0.056, 0.046, 1.00],
];
// Saapa jalalaba pahkluu koordinaatides kannast −Z varbani +Z: [z, poollaius, üleval, all].
const JALALABA = [
  [-0.066, 0.012, -0.030, -0.066], [-0.062, 0.027, 0.010, -0.069], [-0.052, 0.035, 0.034, -0.070],
  [-0.030, 0.041, 0.044, -0.070], [0.000, 0.043, 0.044, -0.070], [0.030, 0.044, 0.024, -0.070],
  [0.060, 0.045, 0.000, -0.070], [0.092, 0.046, -0.020, -0.070], [0.122, 0.045, -0.032, -0.070],
  [0.148, 0.041, -0.039, -0.070], [0.166, 0.033, -0.045, -0.070], [0.178, 0.021, -0.052, -0.069],
  [0.184, 0.009, -0.058, -0.068],
];
// Kontsa ja võlvialuse süvendiga tald; alapind kanna- ja varbatähiste kõrgusel −0,086.
const TALD = [
  [-0.069, 0.016, -0.067, -0.083], [-0.065, 0.031, -0.066, -0.086], [-0.052, 0.039, -0.066, -0.086],
  [-0.014, 0.043, -0.066, -0.086], [-0.006, 0.043, -0.066, -0.080], [0.040, 0.046, -0.066, -0.081],
  [0.058, 0.048, -0.066, -0.086], [0.120, 0.048, -0.066, -0.086], [0.150, 0.044, -0.066, -0.086],
  [0.170, 0.036, -0.066, -0.085], [0.182, 0.024, -0.064, -0.083], [0.188, 0.011, -0.062, -0.080],
];
const footGeo = () => surf(JALALABA.map((r) => rongasZ(r[0], r[1], r[2], r[3], 16)), { cap0: true, cap1: true });
const soleGeo = () => surf(TALD.map((r) => rongasZ(r[0], r[1], r[2], r[3], 16, 6, 8)), { cap0: true, cap1: true });

// Seelikualused puusad ja 20 voldiga seelik; voldi sügavus suureneb allääre poole.
const HIPS = [
  [0.070, 0.130, 0.130, 0.095, 0.105], [0.020, 0.148, 0.148, 0.104, 0.118],
  [-0.040, 0.156, 0.156, 0.104, 0.124], [-0.090, 0.148, 0.148, 0.096, 0.116],
  [-0.120, 0.110, 0.110, 0.074, 0.088], [-0.135, 0.050, 0.050, 0.040, 0.050],
];
const SEELIK = [   // [y, poollaius, ees, taga, voldisügavus]
  [0.040, 0.146, 0.104, 0.116, 0.000], [-0.010, 0.160, 0.114, 0.128, 0.012],
  // Taastamisel suurendati seeliku alasügavust kirjelduse järgi 1–2 cm.
  [-0.070, 0.184, 0.136, 0.148, 0.030], [-0.135, 0.208, 0.167, 0.177, 0.046],
  [-0.200, 0.230, 0.194, 0.204, 0.060], [-0.208, 0.225, 0.189, 0.199, 0.060],
];
function seelikuGeomeetria() {
  const rings = SEELIK.map(([y, w, f, b, amp]) =>
    rongasY(y, w, w, f, b, 40, { e: 2.2 }).map((p, i) => {
      const k = 1 + amp * (i % 2 ? -1 : 1);
      return [p[0] * k, p[1], p[2] * k];
    }));
  return surf(rings, { shade: (j, i) => (i % 2 ? 0.72 : 1) });
}

// Reie analüütiline keha kasutab samu profiiliridu, elliptilisi ristlõikeid ja e = 2.
// e on puusaliigese pöördmaatriks (vaagen → reis), s jala külg.
const THIGH_TOP = REIS[0][0], THIGH_BOT = REIS[REIS.length - 1][0];
function reieSees(e, s, x, y, z) {
  const yl = e[1] * x + e[5] * y + e[9] * z + e[13];
  if (yl > THIGH_TOP || yl < THIGH_BOT) return false;
  const xl = e[0] * x + e[4] * y + e[8] * z + e[12];
  const zl = e[2] * x + e[6] * y + e[10] * z + e[14];
  let j = 0;
  while (j < REIS.length - 2 && yl < REIS[j + 1][0]) j++;
  const r0 = REIS[j], r1 = REIS[j + 1], t = (r0[0] - yl) / (r0[0] - r1[0]);
  const X = xl * s >= 0 ? lerp(r0[1], r1[1], t) : lerp(r0[2], r1[2], t);
  const Z = zl >= 0 ? lerp(r0[3], r1[3], t) : lerp(r0[4], r1[4], t);
  return (xl / X) ** 2 + (zl / Z) ** 2 < 1;
}
// Reie äärmine esi- või tagapunkt vaagna sirgel (x, y, z); puute puudumisel null.
function reieServ(e, s, x, y, esikulg) {
  const dir = esikulg ? -1 : 1, z0 = esikulg ? 0.34 : -0.34, step = 0.006;
  let zo = z0, zi = null;
  for (let k = 1; k <= 75; k++) {
    const z = z0 + dir * step * k;
    if (reieSees(e, s, x, y, z)) { zi = z; break; }
    zo = z;
  }
  if (zi === null) return null;
  for (let k = 0; k < 7; k++) { const zm = (zo + zi) / 2; if (reieSees(e, s, x, y, zm)) zi = zm; else zo = zm; }
  return zo;
}

// Pea liigese koordinaatides: lõua suunas kitsenev ja kumera kuklaga deformeeritud kera.
// Sama funktsioon koos paisuteguriga k sobitab maski ja juuksed pea kujule.
const PEA = { rx: 0.079, ry: 0.11, rz: 0.095, yc: 0.075, zc: 0.002 };
function peaPunkt(x, y, z, k = 1) {
  let X = x * PEA.rx, Z = z * PEA.rz;
  const Y = y * PEA.ry;
  if (y < 0) {
    const t2 = y * y;
    X *= 1 - 0.36 * t2;
    Z *= z > 0 ? 1 - 0.16 * t2 : 1 - 0.5 * t2;
  } else if (z < 0) Z *= 1 + 0.07 * Math.sin(Math.PI * Math.min(1, y * 1.6));
  return [X * k, PEA.yc + Y * k, PEA.zc + Z * k];
}
const dirOf = (phi, beta) => [Math.cos(beta) * Math.sin(phi), Math.sin(beta), Math.cos(beta) * Math.cos(phi)];

function peaGeomeetria() {
  let g = new THREE.SphereGeometry(1, 22, 16);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const q = peaPunkt(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, q[0], q[1], q[2]);
  }
  g.computeVertexNormals();
  return prep(g);
}

function silmadeGeomeetria() {
  const parts = [];
  for (const s of [1, -1]) {
    const phi = s * 0.4, p = peaPunkt(...dirOf(phi, 0.035), 0.975);
    parts.push(ellipsoid(0.0125, 0.0088, 0.0045, p[0], p[1], p[2], 10, 6, phi));                   // Kulm.
    parts.push(ellipsoid(0.0145, 0.0026, 0.0045, p[0], p[1] + 0.0078, p[2] + 0.0008, 8, 4, phi));   // Ripsmed.
  }
  return merge(parts, 'eyes');
}

// Mask ninast lõuani: väljapoole nihutatud näopind ninakühmu ja voltidega.
function maskiGeomeetria() {
  const rows = [];
  for (const b of [-0.075, -0.17, -0.28, -0.4, -0.53, -0.67, -0.82, -0.97]) {
    const ring = [];
    for (let i = 0; i <= 14; i++) {
      const phi = lerp(-1.22, 1.22, i / 14);
      const nose = 0.12 * Math.exp(-((phi / 0.36) ** 2)) * Math.exp(-(((b + 0.3) / 0.2) ** 2));
      ring.push(peaPunkt(...dirOf(phi, b), 1.05 + nose + 0.006 * Math.cos(b * 22)));
    }
    rows.push(ring);
  }
  return surf(rows, { closed: false, shade: (j) => (j % 2 ? 0.92 : 1) });
}

// Karee: üks kest pealaest allapoole, seejärel vabalt langev osa.
// Näoäärsed salgud lõuani, taga veidi pikemad; sakilised otsad ja salgukimbud.
// s = 0..1 kulgeb pealaest ekvaatorini; s > 1 annab vaba pikkuse 0,105 m ühiku kohta.
function juusteGeomeetria() {
  const n = 40, top = 8, low = 6, cols = [];
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * TAU, a = Math.abs(wrap(phi)), jag = i % 2 ? -0.03 : 0.028;
    let end;
    if (a < 0.64) end = 0.8 + jag * 0.8;
    else if (a < 0.86) end = lerp(0.8, 2.0, smooth((a - 0.64) / 0.22)) + jag;
    else if (a < 2.3) end = 2.0 + 0.06 * smooth((a - 0.86) / 1.44) + jag;
    else end = 2.06 + 0.16 * smooth((a - 2.3) / 0.84) + jag;
    cols.push([phi, end]);
  }
  const rings = [];
  for (let j = 0; j <= top + low; j++) {
    const ring = [];
    for (const [phi, end] of cols) {
      const sA = Math.min(end, 0.8);
      const s = j <= top ? 0.02 + ((sA - 0.02) * j) / top : sA + ((end - sA) * (j - top)) / low;
      const kv = 1.075 + 0.03 * Math.max(0, -Math.cos(phi));   // Kuklapoolne paksendus.
      const lehekimp = 1 + 0.024 * Math.cos(phi * 20) * clamp01((s - 0.5) * 2);
      let p;
      if (s <= 1) {
        p = peaPunkt(...dirOf(phi, (Math.PI / 2) * (1 - s)), kv);
        p = [p[0] * lehekimp, p[1], (p[2] - PEA.zc) * lehekimp + PEA.zc];
      } else {
        const e = peaPunkt(...dirOf(phi, 0), kv), u = s - 1;
        const fl = (1 + 0.075 * u) * lehekimp * (j === top + low ? 0.965 : 1);
        p = [e[0] * fl, e[1] - u * 0.105, (e[2] - PEA.zc) * fl + PEA.zc];
      }
      ring.push(p);
    }
    rings.push(ring);
  }
  return surf(rings, { shade: (j, i) => (i % 2 ? 0.8 : 1) * (1 - 0.15 * (j / (top + low))), cap0: true });
}

function kaelaGeomeetria() {
  const g = new THREE.CylinderGeometry(0.04, 0.045, 0.1, 10, 1, true);
  g.translate(0, 0.04, 0);
  return prep(g);
}

function varjulaik() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.45,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 2;
  m.name = 'varjulaik';
  return m;
}

export class Tegelane {
  constructor() {
    const M = (this.mats = looTegelaseMaterjalid());
    const root = (this.root = new THREE.Group());
    root.name = 'tegelane';
    const body = (this.body = new THREE.Group());
    root.add(body);
    const meshes = (this.meshes = []);
    const bins = new Map();   // Materjal → geomeetriate loend.
    const add = (joint, mat, geo) => {
      if (!bins.has(joint)) bins.set(joint, new Map());
      const b = bins.get(joint);
      if (!b.has(mat)) b.set(mat, []);
      b.get(mat).push(geo);
    };
    const J = (parent, x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      return g;
    };

    // Vaagen: puusad ja plisseeritud seelik.
    const pelvis = (this.pelvis = J(body, 0, 0.96, 0));
    add(pelvis, M.skirt, pindY(HIPS, 16, { e: 2.4, cap0: true, cap1: true }));
    // Seelik on eraldi võrk; reie liikumine tõukab selle tipud väljapoole.
    const skirtG = seelikuGeomeetria();
    skirtG.computeBoundingSphere();
    skirtG.boundingSphere.radius += 0.06;
    const skirt = new THREE.Mesh(skirtG, M.skirt);
    pelvis.add(skirt);
    meshes.push(skirt);
    this._skirt = { g: skirtG, base: Float32Array.from(skirtG.attributes.position.array), m4: new THREE.Matrix4(), moved: false };

    // Kere: avatud sulejope, kampsun ja sall.
    const spine = (this.spine = J(pelvis, 0, 0.06, 0));
    add(spine, M.jacket, jopeGeomeetria());
    add(spine, M.sweater, kampsuniGeomeetria());
    add(spine, M.scarf, salliGeomeetria());

    // Kael ja pea: nägu, silmad, mask ning tukaga karee.
    const neck = (this.neck = J(spine, 0, 0.43, 0));
    add(neck, M.nahk, kaelaGeomeetria());
    const head = (this.head = J(neck, 0, 0.06, 0.004));
    add(head, M.nahk, peaGeomeetria());
    add(head, M.eye, silmadeGeomeetria());
    add(head, M.mask, maskiGeomeetria());
    add(head, M.juuksed, juusteGeomeetria());

    // Käed: s = +1 vasak kohalikul +X-küljel, −1 parem.
    const handL = kaeGeomeetria(), handR = peegeldaX(handL);
    this.arms = [];
    for (const s of [1, -1]) {
      const sh = J(spine, s * 0.172, 0.335, -0.005);
      add(sh, M.jacket, varrukaGeomeetria(SLEEVE_UP, s, true));
      const el = J(sh, 0, -0.29, 0);
      add(el, M.jacket, varrukaGeomeetria(SLEEVE_LO, s));
      add(el, M.jacket, ellipsoid(0.053, 0.05, 0.054, 0, 0, 0, 10, 8));
      const wr = J(el, 0, -0.245, 0);
      add(wr, M.nahk, s > 0 ? handL : handR);
      this.arms.push({ s, sh, el, wr });
    }

    // Jalad: sukkpüksid, kõrged saapad, jalalaba ja kontsaga tald; kanna- ja varbatähised toetuseks.
    this.legs = [];
    for (const s of [1, -1]) {
      const hip = J(pelvis, s * 0.088, -0.055, 0);
      add(hip, M.tights, pindY(REIS, 14, { side: s }));
      const kn = J(hip, 0, -0.42, 0);
      add(kn, M.tights, ellipsoid(0.048, 0.052, 0.05, 0, 0, 0.006, 10, 8));
      add(kn, M.tights, pindY(SAAR, 12, { side: s }));
      add(kn, M.boots, pindY(SHAFT, 16, { side: s }));
      const an = J(kn, 0, -0.4, 0);
      add(an, M.boots, footGeo());
      add(an, M.sole, soleGeo());
      const heel = J(an, 0, -0.086, -0.058), toe = J(an, 0, -0.086, 0.165);
      this.legs.push({ s, hip, kn, an, heel, toe });
    }

    // Üks võrk iga liigese ja materjali kohta.
    for (const [joint, b] of bins) {
      for (const [mat, list] of b) {
        const mesh = new THREE.Mesh(merge(list, 'mesh'), mat);
        joint.add(mesh);
        meshes.push(mesh);
      }
    }

    this.blob = varjulaik();
    if (this.blob) root.add(this.blob);
    this.seaVarjud(false);

    this.t = 0; this.phase = 0; this.vs = 0; this.lean = 0; this.roll = 0;
    this._v = new THREE.Vector3();
    this.update(0, 0, false, 0);
  }

  // Tegelase päikesevarju kasutatakse ainult dünaamiliste varjudega; muidu jalgealune varjulaik.
  seaVarjud(cast) {
    for (const m of this.meshes) { m.castShadow = cast; m.receiveShadow = true; }
  }

  // Seelik peab katma reie kõnnil ja eriti jooksul, kui puusanurk ulatub ±0,62 radiaanini.
  // Varem tungis reie esi- või tagakülg allääre voltidest heledate kiiludena läbi.
  // Seeliku tipud liiguvad vaagna koordinaatides ainult mööda Z-telge väljapoole, reiepinnast 8 mm kaugusele.
  // Liigutatakse ainult kokkupuutekohti; seistes seeliku kuju ei muutu.
  _nihutaSeelik() {
    // Leia reie serv seeliku esi- ja tagapaneeli tippude kohal ning
    // lükka kangas varuga väljapoole; kontrolli reie serva tipust 4 mm allpool,
    // sest kaldus reie juures peab alläär katma ka veidi madalamat kohta. Allääre varu on 12 mm.
    // Nihe silutakse rõngal naabritele kordajatega 0,6 ja 0,3, et vahepealsed kõõlud
    // ei lõikaks reie nurka ning alläär ei muutuks sakiliseks.
    const S = this._skirt, pos = S.g.attributes.position, a = pos.array, b = S.base, N = 40;
    const nv = b.length / 3, d = S.d || (S.d = new Float32Array(nv)), t = S.t || (S.t = new Float32Array(nv));
    d.fill(0);
    for (const leg of this.legs) {
      leg.hip.updateMatrix();
      const e = S.m4.copy(leg.hip.matrix).invert().elements;
      for (let v = 0, i = 0; v < nv; v++, i += 3) {
        const x = b[i], y = b[i + 1], z = b[i + 2];
        if (y > 0.03) continue;
        const xl = e[0] * x + e[4] * y + e[8] * z + e[12];
        if (Math.abs(xl) > 0.095) continue;
        const esikulg = z > 0, edge = reieServ(e, leg.s, x, y - 0.004, esikulg);
        if (edge === null) continue;
        const m = y < -0.19 ? 0.012 : 0.008;
        const dz = (esikulg ? edge + m : edge - m) - z;
        if (esikulg ? dz > d[v] : dz < d[v]) d[v] = dz;
      }
    }
    let moved = false;
    for (let v = 0; v < nv; v++) {
      const r0 = v - (v % N), i = v % N, zs = b[3 * v + 2];
      let best = d[v];
      for (let o = -2; o <= 2; o++) {
        if (!o) continue;
        const q = d[r0 + ((i + o + N) % N)] * (Math.abs(o) === 1 ? 0.6 : 0.3);
        if ((q > 0 && zs >= 0) || (q < 0 && zs <= 0)) if (Math.abs(q) > Math.abs(best)) best = q;
      }
      t[v] = best;
      if (best) moved = true;
    }
    a.set(b);
    if (moved) for (let v = 0; v < nv; v++) a[3 * v + 2] += t[v];
    if (moved || S.moved) { pos.needsUpdate = true; S.g.computeVertexNormals(); }
    S.moved = moved;
  }

  // dt on ajasamm, kiirus on tegelik m/s, jooks tähistab jooksuklahvi, pöördekiirus on rad/s.
  update(dt, speed, run, poordekiirus = 0) {
    this.t += dt;
    const k = 1 - Math.exp(-dt * 9);
    this.vs += (speed - this.vs) * (dt > 0 ? k : 1);
    const v = Math.max(0, this.vs);
    const w = smooth(v / 0.4);              // Kõnni osakaal; 0 tähendab seismist.
    const rw = smooth((v - 2.0) / 1.0);     // Jooksu osakaal.
    const At = lerp(0.12, 0.42, clamp01(v / 1.55)) + 0.2 * rw;
    const L = Math.max(0.5, 3.3 * Math.sin(At));
    this.phase = (this.phase + TAU * (v / L) * dt) % TAU;
    const ph = this.phase, t = this.t;

    for (const leg of this.legs) {
      const p = leg.s > 0 ? ph : ph + Math.PI;
      const th = -At * Math.sin(p) * w;
      const c = Math.cos(p + 0.3);
      const knee = (0.06 + (1.0 + 0.5 * rw) * Math.max(0, c) ** 2 + 0.12 * Math.max(0, -c)) * w + 0.04 * (1 - w);
      const push = 0.25 * Math.exp(-((wrap(p - 1.35 * Math.PI) / 0.5) ** 2));
      leg.hip.rotation.set(th, 0, leg.s * 0.03 * (1 - w));
      leg.kn.rotation.x = knee;
      leg.an.rotation.x = -(th + knee) * 0.9 + push * w;
    }
    this._nihutaSeelik();

    const sway = Math.sin(ph) * w;
    this.pelvis.rotation.set(0, 0.09 * sway, 0.03 * Math.cos(ph) * w + 0.012 * Math.sin(t * 0.7) * (1 - w));
    this.lean += (0.05 * w + 0.13 * rw - this.lean) * (dt > 0 ? k : 1);
    const breathe = Math.sin(t * 1.9) * 0.012 * (1 - w);
    this.spine.rotation.set(this.lean + breathe, -0.054 * sway, -this.pelvis.rotation.z * 0.6);
    this.head.rotation.set(-this.lean * 0.6 - breathe, 0.3 * Math.sin(t * 0.31) * Math.sin(t * 0.13 + 1) * (1 - w), 0);

    // Käed veidi rohkem külgedele: 0,10 rad varasema 0,07 asemel, et varrukad ei lõikuks jopega.
    const Aa = 0.06 + 0.32 * w + 0.3 * rw;
    for (const a of this.arms) {
      const sw = Math.sin(ph) * a.s;
      a.sh.rotation.set(Aa * sw * w + 0.02 * Math.sin(t * 1.9) * (1 - w), 0, a.s * (0.1 + 0.03 * rw));
      a.el.rotation.x = -(0.18 + 0.25 * Math.max(0, -sw) * w + 1.0 * rw);
      a.wr.rotation.x = -0.1;
    }

    // Kallutus.
    const roll = Math.max(-0.1, Math.min(0.1, -poordekiirus * v * 0.02));
    this.roll += (roll - this.roll) * (dt > 0 ? k : 1);
    this.body.rotation.z = this.roll;

    // Jalgade toetus: kanna või varba madalaim punkt jääb maapinnale.
    this.body.position.y = 0;
    this.root.updateMatrixWorld(true);
    let lo = Infinity;
    for (const leg of this.legs) for (const m of [leg.heel, leg.toe]) lo = Math.min(lo, m.getWorldPosition(this._v).y);
    this.body.position.y = -(lo - this.root.position.y);
    this.root.updateMatrixWorld(true);
    this.w = w; this.rw = rw;
  }
}
