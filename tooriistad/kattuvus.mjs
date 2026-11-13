// Kattuvate samatasapinnaliste pindade kontroll: leiab telgedega rööbitised ristkülikud, millel on
// sama normaal, sama tasapind ja kattuv ala. Sellised paarid vilguvad liikuva kaameraga.
// Pööratud H2 kontrollitakse selle kohalikus koordinaadistikus, kus hoone tahud on teljesihilised.
// Kasutus eraldi: node tooriistad/kattuvus.mjs [H1|H2|koik]; npm test kasutab samu funktsioone.
import { H1, H2, h2Plaan } from '../kood/seaded.js';

// Materjalirühmade staatilise geomeetria nelinurgad (a, b, c, a, c, d) tippude ja materjalivõtmega.
export function nelinurgad(B) {
  const quads = [];
  for (const [key, list] of B.m) {
    for (const g of list) {
      const p = g.attributes.position, idx = g.index ? g.index.array : null;
      if (!idx || !g.attributes.normal) continue;
      for (let t = 0; t + 5 < idx.length; t += 6) {
        if (idx[t + 3] !== idx[t] || idx[t + 4] !== idx[t + 2]) continue;
        const ids = [idx[t], idx[t + 1], idx[t + 2], idx[t + 5]];
        quads.push({ key, pts: ids.map((i) => [p.getX(i), p.getY(i), p.getZ(i)]) });
      }
    }
  }
  return quads;
}

// Teljesihiline ristkülik nelinurgast (pärast valikulist teisendust); muidu null.
function ristkulik(q, teisenda) {
  const pts = teisenda ? q.pts.map(teisenda) : q.pts;
  for (let axis = 0; axis < 3; axis++) {
    const plane = pts[0][axis];
    if (pts.some((v) => Math.abs(v[axis] - plane) > 1e-4)) continue;
    const [a, b] = [0, 1, 2].filter((k) => k !== axis);
    const as = new Set(pts.map((v) => Math.round(v[a] * 1e4))), bs = new Set(pts.map((v) => Math.round(v[b] * 1e4)));
    if (as.size !== 2 || bs.size !== 2) return null;        // Pööratud või kolmnurkne pind.
    // Normaali märk tipujärjestusest: (p1 − p0) × (p2 − p0) telje sihis.
    const u = pts[1].map((v, i) => v - pts[0][i]), w = pts[2].map((v, i) => v - pts[0][i]);
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const lo = [Math.min(...pts.map((v) => v[a])), Math.min(...pts.map((v) => v[b]))];
    const hi = [Math.max(...pts.map((v) => v[a])), Math.max(...pts.map((v) => v[b]))];
    if (hi[0] - lo[0] < 1e-4 || hi[1] - lo[1] < 1e-4) return null;
    return { key: q.key, axis, sign: Math.sign(cr[axis]), plane, lo, hi, a, b };
  }
  return null;
}

// Kattuvate paaride loend; filter valib kontrollitavad ristkülikud.
export function kattuvused(quads, { teisenda = null, filter = () => true } = {}) {
  const byPlane = new Map();
  for (const q of quads) {
    const r = ristkulik(q, teisenda);
    if (!r || !filter(r)) continue;
    const k = `${r.axis}|${r.sign}|${Math.round(r.plane * 2000)}`;
    if (!byPlane.has(k)) byPlane.set(k, []);
    byPlane.get(k).push(r);
  }
  const out = [];
  for (const list of byPlane.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const p = list[i], q = list[j];
      const w = Math.min(p.hi[0], q.hi[0]) - Math.max(p.lo[0], q.lo[0]);
      const h = Math.min(p.hi[1], q.hi[1]) - Math.max(p.lo[1], q.lo[1]);
      if (w > 0.005 && h > 0.005) out.push({ a: p.key, b: q.key, telg: 'xyz'[p.axis], tasand: +p.plane.toFixed(3), ala: +(w * h).toFixed(4) });
    }
  }
  return out;
}

const sees = (r, box) => {
  const c = [0, 0, 0];
  c[r.axis] = r.plane; c[r.a] = (r.lo[0] + r.hi[0]) / 2; c[r.b] = (r.lo[1] + r.hi[1]) / 2;
  return c.every((v, i) => v >= box[i][0] && v <= box[i][1]);
};

// Kontrollialad: H1 maailmakoordinaatides (x = X, z = −Y), H2 oma kohalikus koordinaadistikus.
export function ala(nimi) {
  if (nimi === 'H1') return { filter: (r) => sees(r, [[H1.X0 - 0.5, H1.X1 + 0.5], [-1, 60], [-(H1.Y1 + 0.5), -(H1.Y0 - 2.0)]]) };
  if (nimi === 'H2') {
    const [X, Y] = h2Plaan(0, 0), c = Math.cos(H2.ang), s = Math.sin(H2.ang);
    const teisenda = ([x, y, z]) => { const dx = x - X, dz = z + Y; return [dx * c - dz * s, y, dx * s + dz * c]; };
    return { teisenda, filter: (r) => sees(r, [[-0.5, H2.L + 1.5], [-1, 60], [-2.0, H2.D + 0.5]]) };
  }
  return {};
}

// Koondab paarid tasandi kaupa: "materjal|materjal|telg|tasand" → arv.
export function koond(leitud) {
  const k = {};
  for (const o of leitud) { const n = `${o.a}|${o.b}|${o.telg}|${o.tasand}`; k[n] = (k[n] || 0) + 1; }
  return k;
}

if (process.argv[1] && process.argv[1].endsWith('kattuvus.mjs')) {
  const { register } = await import('node:module');
  register('./laadur.mjs', import.meta.url);
  const { Materjaliruhmad } = await import('../kood/abifunktsioonid.js');
  const { Kokkuporkemaailm } = await import('../kood/maailm.js');
  const ctx = { col: new Kokkuporkemaailm(), lights: [], laed: [] };
  const B = new Materjaliruhmad();
  for (const [fail, nimed] of [['maapind', ['looMaapind']], ['hooned', ['looH1', 'looH2', 'looN1', 'looE1Louna']], ['taimestik', ['looTaimestik']], ['tanav', ['looTanav']]]) {
    const moodul = await import('../kood/' + fail + '.js');
    for (const nimi of nimed) moodul[nimi](B, ctx);
  }
  const nimi = process.argv[2] || 'koik';
  const quads = nelinurgad(B);
  const leitud = kattuvused(quads, ala(nimi));
  console.log(JSON.stringify({ ala: nimi, nelinurki: quads.length, kattuvaid: leitud.length, koond: koond(leitud) }, null, 1));
}
