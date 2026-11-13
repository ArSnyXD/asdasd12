// Maapind: asfalt, kulumisjäljed, märgistus, kõnniteed, park, hoovialad ja pinnas aia taga.
// E1 jätkab peatänavat kagusse; E2 hargneb peatänavast pargi kagunurga kohalt ja kulgeb pargi
// ning kivipiirde vahel kirdesse. Aed pöördub ristmikul ja jätkub E1 kirdeküljel.
// Kõrguskaart toetab tegelase jalgu kõnniteel, äärekivil ja pargiplaatidel.
import * as THREE from 'three';
import { PLAAN, PARK, H1 } from './seaded.js';
import { smooth, nihutatudJoon, ribbon, vwall, taidaHulknurk, clip, punktKaugusel, maapinnaNelinurk, plaanikast } from './abifunktsioonid.js';
import { jooneOsa, project, umarUhine, ribaHulknurk, joonePikkus, on } from './geomeetria.js';
import { Korgusruudustik } from './maailm.js';

function nearX(pl, X) {
  let best = pl[0], d = Infinity;
  for (const p of pl) { const e = Math.abs(p[0] - X); if (e < d) { d = e; best = p; } }
  return best;
}

// Murdjoone esimese lõikepunkti X horisontaaljoonel Y.
export function xKorgusel(pl, Y) {
  for (let i = 0; i < pl.length - 1; i++) {
    const a = pl[i], b = pl[i + 1];
    if (a[1] !== b[1] && (a[1] - Y) * (b[1] - Y) <= 0) return a[0] + ((b[0] - a[0]) * (Y - a[1])) / (b[1] - a[1]);
  }
  return null;
}

// Kaarepikkus, mille juures kasvav suurus f(s) jõuab väärtuseni v.
function jaam(f, v, lo, hi) {
  for (let k = 0; k < 48; k++) { const m = (lo + hi) / 2; if (f(m) < v) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// Kahe murdjoone esimene lõikepunkt.
function loikepunkt(A, B) {
  for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < B.length - 1; j++) {
    const a = A[i], b = A[i + 1], c = B[j], d = B[j + 1];
    const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return [a[0] + rx * t, a[1] + ry * t];
  }
  return null;
}

export function looMaapind(B, ctx) {
  const mainFull = smooth(PLAAN.peatee.pts, 0.8);            // Edelast läbi S ja J kagusse.
  const sJ = project(mainFull, PLAAN.J).s;
  const sS = project(mainFull, PLAAN.S).s;
  const sEnd = sJ + 50;                                       // Edasi kaob tänav udusse.
  const mainW = jooneOsa(mainFull, 0, sJ);                     // Lääs.
  const e1c = jooneOsa(mainFull, sJ, joonePikkus(mainFull));      // J → kagu (E1).
  // E1 joon pikendatuna üle ristmiku läände: aia ja servajoone nurk asub J-st läänes, kus E2 hargneb.
  const e1Laiend = jooneOsa(mainFull, sJ - 14, joonePikkus(mainFull));
  const mainVis = jooneOsa(mainFull, 0, sEnd);
  const e2c = smooth(PLAAN.e2Tee.pts, 0.8);                   // Peatänavalt pargi ja aia vahelt kirdesse (E2).
  const hwM = PLAAN.peatee.width / 2, hwF = PLAAN.e2Tee.width / 2;
  const F2 = PLAAN.aiaNiheE2, F1 = PLAAN.aiaNiheE1, riba = PLAAN.pargiaareRiba;
  // Aia telg: põhjast mööda E2, ümardatud välisnurk ristmikul, edasi E1; tänav jääb paremale.
  const aiaJoon = umarUhine(nihutatudJoon(e2c, -F2).reverse(), nihutatudJoon(e1Laiend, F1), PLAAN.aiaNurgaraadius);
  Object.assign(ctx, { main: mainFull, mainW, mainVis, e1c, e2c, aiaJoon, sJ, sS, hwM, hwF });
  {
    // Ümarduse keskkoht: nihutatud E2 ja E1 joonte lõikepunkti projektsioon.
    const P = loikepunkt(nihutatudJoon(e2c, -F2), nihutatudJoon(e1Laiend, F1));
    ctx.cornerPoint = P;
    ctx.cornerS = project(aiaJoon, P || [0, 0]).s;
  }
  ctx.pohiteekond = jooneOsa(mainFull, sS, sJ + PLAAN.tokeE1);
  ctx.teekondE2 = jooneOsa(e2c, 0, PLAAN.tokeE2);

  // Pargi äärekivi: peatänava põhjaserva ja E2 lääneserva paralleelid tellisriba laiuse kaugusel,
  // ühendatud ümardatud nurgaga. Lõikejaamad annavad täpsed liited naaberkõnniteedega.
  const sX0 = jaam((s) => on(mainW, s, hwM + riba)[0], PARK.X0, 0, sJ);
  const sPark = jaam((s) => on(e2c, s, hwF + riba)[1], PARK.Y1, 0, joonePikkus(e2c));
  const pkS = nihutatudJoon(jooneOsa(mainW, sX0, sJ), hwM + riba);
  const pkE = nihutatudJoon(jooneOsa(e2c, 0, sPark), hwF + riba);
  const curb = umarUhine(pkS, pkE, PLAAN.pargiNurgaraadius);
  ctx.parkCurb = curb;
  {
    // Äärekivi nurga keskpunkt ja väljapoole (tänavale) suunatud ühikvektor märgi paigutamiseks.
    const apex = loikepunkt(pkS, pkE);
    let mid = curb[0], d = Infinity;
    for (const p of curb) { const e = Math.hypot(p[0] - apex[0], p[1] - apex[1]); if (e < d) { d = e; mid = p; } }
    const l = Math.hypot(apex[0] - mid[0], apex[1] - mid[1]) || 1;
    ctx.pargiNurk = { p: mid, valja: [(apex[0] - mid[0]) / l, (apex[1] - mid[1]) / l] };
  }

  // Asfaldi aluspind ulatub kaugele udu taha.
  const base = new THREE.PlaneGeometry(460, 460, 1, 1);
  base.rotateX(-Math.PI / 2);
  base.translate(-10, 0, -4);
  {
    const p = base.attributes.position, uv = base.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
  }
  B.add('asfalt', base);

  // Kulumine ja rööpad: peatänav jätkub katkematult E1-na, E2 liitub küljelt peatänava serva tagant.
  B.add('teeKulumine', ribbon(mainVis, -hwM, hwM, 0.01, { across01: true }));
  B.add('teeKulumine', ribbon(jooneOsa(e2c, (hwM + 0.6) / 0.9, joonePikkus(e2c)), -hwF, hwF, 0.01, { across01: true }));

  // Valged servajooned 0,3 m sõidutee servast. Põhjajoon kulgeb peatänava põhjaserva pidi,
  // pöörab pargi nurgas ümber ja jätkub E2 lääneserva pidi; lõunajoon on katkematu S → J → E1;
  // aiapoolne joon pöörab E2 idaservalt ümber aia nurga E1 põhjaservale. Keskjoont ei ole.
  const lw = 0.075;
  const mN = nihutatudJoon(jooneOsa(mainW, 0, sX0), hwM - 0.3);
  const pargiJoon = nihutatudJoon(curb, -(riba + 0.3));
  const e2W = nihutatudJoon(jooneOsa(e2c, sPark, joonePikkus(e2c)), hwF - 0.3);
  const north = [...mN, ...pargiJoon.slice(1), ...e2W.slice(1)];
  const south = nihutatudJoon(mainVis, -(hwM - 0.3));
  const fenceEdge = umarUhine(nihutatudJoon(e2c, -(hwF - 0.3)).reverse(),
    nihutatudJoon(jooneOsa(mainFull, sJ - 14, sEnd), hwM - 0.3), PLAAN.aiaNurgaraadius + F2 - hwF + 0.3);
  for (const l of [north, south, fenceEdge]) B.add('varv', ribbon(l, -lw, lw, 0.016, { across01: true }));

  // Peatumisjoon ja peatumiskiri E2-l enne peatänavat: joon 1,5–2 m enne peatänava serva,
  // kiri selle taga lõunasse sõitjale loetavalt (kirja ülaserv ristmiku poole).
  const st = punktKaugusel(e2c, 5.2);
  B.add('varv', maapinnaNelinurk(st.p, st.t, st.n, 0.22, hwF - 0.35, 0.017, [0, 0, 1, 2 * (hwF - 0.35)]));
  const tt = punktKaugusel(e2c, 7.5);
  B.add('peatu', maapinnaNelinurk(tt.p, tt.n, [-tt.t[0], -tt.t[1]], 1.2, 1.3, 0.017));
  ctx.peatumisjoon = { s: 5.2, kiri: 7.5 };

  // Kaevuluugid.
  const mh = (p) => B.add('kaevuluuk', maapinnaNelinurk(p, [1, 0], [0, 1], 0.34, 0.34, 0.014));
  mh(nearX(mainW, -21.0));
  mh(nearX(mainW, -10.6));
  mh(punktKaugusel(e1c, 11).p);

  // Hoovialad (betoon, 5 cm): põhjas pargini, lõunas H2 ja E1 ääres, pargist põhjas valge maja
  // kuni E2 läänekõnniteeni, et hoovi ja kõnnitee vahele ei jääks asfaldikiilu.
  const northEdge = clip(nihutatudJoon(mainW, hwM + PLAAN.pohjakonnitee), (p) => p[0] > -46 && p[0] < -15.3);
  const northLot = [...northEdge, [-15.3, 30.6], [-46, 30.6]];
  const sW = project(mainFull, [-46, -1]).s;
  const southEdge = nihutatudJoon(jooneOsa(mainFull, sW, sJ + 45), -(hwM + PLAAN.lounakonnitee));
  const southLot = [...southEdge, [40, -60], [-46, -60]];
  const swE2 = jooneOsa(e2c, sPark, joonePikkus(e2c));
  const swE2Valis = nihutatudJoon(swE2, hwF + riba);
  const yL0 = PARK.Y1 + 0.24, yL1 = 31.5;
  const whiteLot = [[PARK.X0, yL0], [xKorgusel(swE2Valis, yL0), yL0],
    ...swE2Valis.filter((p) => p[1] > yL0 + 0.05 && p[1] < yL1 - 0.05), [xKorgusel(swE2Valis, yL1), yL1], [PARK.X0, yL1]];
  B.add('betoon', taidaHulknurk(northLot, 0.05));
  B.add('betoon', taidaHulknurk(southLot, 0.05));
  B.add('betoon', taidaHulknurk(whiteLot, 0.05));
  // H1 esiväljak: hele sillutis kõnniteest kitsa fassaadini, N1 aia ja pargimüüri vahel;
  // sama sillutis jätkub esimese korruse vasaku süvise põranda alla.
  // Majaaluse läbipääsu graniitpõrand jätkab väljakut sügavusse.
  const yF = nearX(northEdge, -18.4)[1] + 0.02;
  const fore = [[-24.55, yF], [-15.85, yF], [-15.85, H1.Y0 + 0.3], [-20.45, H1.Y0 + 0.3], [-20.45, H1.Y0 + 1.0],
    [-23.88, H1.Y0 + 1.0], [-23.88, H1.Y0 + 0.3], [-24.55, H1.Y0 + 0.3]];
  B.add('beezPlaat', taidaHulknurk(fore, 0.07));
  const h1Path = [[H1.PASS.X0, H1.Y0 - 0.3], [H1.PASS.X1, H1.Y0 - 0.3], [H1.PASS.X1, H1.Y0 + H1.PASS.depth], [H1.PASS.X0, H1.Y0 + H1.PASS.depth]];
  B.add('graniit', taidaHulknurk(h1Path, 0.075));
  ctx.h1Fore = fore;

  // Kõnniteed: tellissillutis peaaegu sõidutee kõrgusel. Peatänava põhjakõnnitee lõpeb pargi
  // lääneserval, kust jätkub pargi tellisriba; E2 läänekõnnitee algab täpselt pargi põhjaotsast.
  const swN = jooneOsa(mainW, 0, sX0);
  B.add('tellis', ribbon(swN, hwM, hwM + PLAAN.pohjakonnitee, 0.03, { swap: true }));
  B.add('tellis', ribbon(mainVis, -(hwM + PLAAN.lounakonnitee), -hwM, 0.03, { swap: true }));
  B.add('tellis', ribbon(aiaJoon, -1.55, -0.2, 0.03, { swap: true }));
  B.add('tellis', ribbon(swE2, hwF, hwF + riba, 0.03, { swap: true }));

  // Väikepark: plaadid 12 cm sõiduteest kõrgemal ja graniitäärekivi. Park on kiil H1 ja E2 vahel:
  // lõunaots avaneb peatänavale, idaserv on E2 läänepoolne äärekivi ning ümardatud nurk ühendab need.
  B.add('tellis', ribbon(curb, -riba, 0, 0.03, { swap: true }));
  B.add('graniit', ribbon(curb, 0, 0.24, 0.15));
  B.add('graniit', vwall(curb, 0, 0.15));
  const inner = nihutatudJoon(curb, 0.24);
  const xN = xKorgusel(inner, PARK.Y1);
  const pargiHulknurk = [...inner.filter((p) => p[1] < PARK.Y1 - 0.02), [xN, PARK.Y1], [PARK.X0, PARK.Y1], [PARK.X0, inner[0][1]]];
  ctx.pargiHulknurk = pargiHulknurk;
  ctx.pargiIdaX = (Y) => xKorgusel(inner, Y);
  B.add('pargiplaat', taidaHulknurk(pargiHulknurk, 0.12));
  // Pargi põhjaserv: graniitäärekivi valge maja krundi poole kuni idaserva äärekivini.
  B.add('graniit', plaanikast(PARK.X0, xN - 0.02, PARK.Y1, PARK.Y1 + 0.24, 0, 0.15, { faces: 'NSEWT' }));

  // Aia taga kõrgendatud maapind suurte puude all; templihooneid post.
  const soilPoly = [...nihutatudJoon(aiaJoon, 0.25), [95, -70], [95, 56]];
  ctx.soilPoly = soilPoly;
  B.add('muld', taidaHulknurk(soilPoly, 0.62));

  // Tegelase kõrguskaardi täitmine: lisamise järjekord määrab kattumise.
  const HG = new Korgusruudustik(-50, -32, 40, 36, 0.1);
  HG.fill(northLot, 0.05); HG.fill(southLot, 0.05); HG.fill(whiteLot, 0.05);
  HG.fill(fore, 0.07); HG.fill(h1Path, 0.075);
  HG.fill(ribaHulknurk(swN, hwM, hwM + PLAAN.pohjakonnitee), 0.03);
  HG.fill(ribaHulknurk(mainVis, -(hwM + PLAAN.lounakonnitee), -hwM), 0.03);
  HG.fill(ribaHulknurk(aiaJoon, -1.55, -0.2), 0.03);
  HG.fill(ribaHulknurk(swE2, hwF, hwF + riba), 0.03);
  HG.fill(ribaHulknurk(curb, -riba, 0), 0.03);
  HG.fill(pargiHulknurk, 0.12);
  HG.fill(ribaHulknurk(curb, 0, 0.24), 0.15);
  HG.fill(soilPoly, 0.62);
  ctx.korgused = HG;
}
