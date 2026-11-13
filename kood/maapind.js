// Maapind: asfalt, kulumisjäljed, märgistus, kõnniteed, park, hoovialad ja pinnas aia taga.
// E1 jätkab peatänavat kagusse; aed kulgeb mööda E2 ning pöördub ristmikul J.
// Seejärel jätkub aed E1 kirdeküljel.
// Kõrguskaart toetab tegelase jalgu kõnniteel, äärekivil ja pargiplaatidel.
import * as THREE from 'three';
import { PLAAN, PARK, H1 } from './seaded.js';
import { smooth, nihutatudJoon, ribbon, vwall, taidaHulknurk, uhendaNurk, clip, punktKaugusel, maapinnaNelinurk, plaanikast } from './abifunktsioonid.js';
import { jooneOsa, project, umarUhine, ribaHulknurk, joonePikkus } from './geomeetria.js';
import { Korgusruudustik } from './maailm.js';

function nearX(pl, X) {
  let best = pl[0], d = Infinity;
  for (const p of pl) { const e = Math.abs(p[0] - X); if (e < d) { d = e; best = p; } }
  return best;
}

// Pargi äärekivi telg: piki S–J tänava põhjaserva itta, viltu lõige kagunurgas ja sirge idaserv põhja.
// Joone suund on lääne poolt itta ja edasi põhja, nii et tänav jääb paremale.
function pargiAarekivi(mainW, hwM) {
  const [lx, ly] = PARK.nurgaLoige, xc = PARK.X1 - lx;
  const south = clip(nihutatudJoon(mainW, hwM + 0.9), (p) => p[0] > PARK.X0 && p[0] < xc);
  const ys = south[south.length - 1][1];
  return [...south, [xc, ys], [PARK.X1, ys + ly], [PARK.X1, PARK.Y1]];
}

export function looMaapind(B, ctx) {
  const mainFull = smooth(PLAAN.peatee.pts, 0.8);            // Edelast läbi S ja J kagusse.
  const sJ = project(mainFull, PLAAN.J).s;
  const sS = project(mainFull, PLAAN.S).s;
  const sEnd = sJ + 50;                                       // Edasi kaob tänav udusse.
  const mainW = jooneOsa(mainFull, 0, sJ);                     // Lääs.
  const e1c = jooneOsa(mainFull, sJ, joonePikkus(mainFull));      // J → kagu (E1).
  const mainVis = jooneOsa(mainFull, 0, sEnd);
  const e2c = smooth(PLAAN.e2Tee.pts, 0.8);                   // J → põhi (E2).
  const hwM = PLAAN.peatee.width / 2, hwF = PLAAN.e2Tee.width / 2;
  const F2 = PLAAN.aiaNiheE2, F1 = PLAAN.aiaNiheE1;
  // Aia telg: põhjast mööda E2, ümardatud välisnurk J juures, edasi E1; tänav jääb paremale.
  const aiaJoon = umarUhine(nihutatudJoon(e2c, -F2).reverse(), nihutatudJoon(e1c, F1), PLAAN.aiaNurgaraadius);
  Object.assign(ctx, { main: mainFull, mainW, mainVis, e1c, e2c, aiaJoon, sJ, sS, hwM, hwF });
  {
    // Ümarduse keskkoht: nihutatud E2 ja E1 joonte lõikepunkti projektsioon.
    const oa = nihutatudJoon(e2c, -F2), ob = nihutatudJoon(e1c, F1);
    const sx = (p, p2, q, q2) => {
      const r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]], d = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(d) < 1e-9) return null;
      const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / d, u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [p[0] + r[0] * t, p[1] + r[1] * t] : null;
    };
    let P = null;
    for (let i = 0; i < oa.length - 1 && !P; i++) for (let j = 0; j < ob.length - 1 && !P; j++) P = sx(oa[i], oa[i + 1], ob[j], ob[j + 1]);
    ctx.cornerPoint = P;
    ctx.cornerS = project(aiaJoon, P || [0, 0]).s;
  }
  ctx.pohiteekond = jooneOsa(mainFull, sS, sJ + PLAAN.tokeE1);
  ctx.teekondE2 = jooneOsa(e2c, 0, PLAAN.tokeE2);

  // Asfaldi aluspind ulatub kaugele udu taha.
  const base = new THREE.PlaneGeometry(460, 460, 1, 1);
  base.rotateX(-Math.PI / 2);
  base.translate(-10, 0, -4);
  {
    const p = base.attributes.position, uv = base.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
  }
  B.add('asfalt', base);

  // Kulumine ja rööpad: peatänav jätkub katkematult E1-na, E2 liitub küljelt.
  B.add('teeKulumine', ribbon(mainVis, -hwM, hwM, 0.01, { across01: true }));
  B.add('teeKulumine', ribbon(jooneOsa(e2c, 2.4, joonePikkus(e2c)), -hwF, hwF, 0.01, { across01: true }));

  // Valge joon.
  const lw = 0.075;
  const mN = clip(nihutatudJoon(mainW, hwM - 0.3), (p) => p[0] < PARK.X1 - PARK.nurgaLoige[0] - 0.3);
  const e2W = clip(nihutatudJoon(e2c, hwF - 0.25), (p) => p[1] > PARK.Y1 + 1.2);
  // Pargi nurk: joon kulgeb 0,3 m kõnniteeservast väljas piki pargi viltu lõiget ja sirget idaserva
  // ning liitub pargist põhjas E2 servaga.
  const pargiServ = nihutatudJoon(pargiAarekivi(mainW, hwM), -1.2).slice(-3);
  const north = [...mN, ...pargiServ, ...e2W];
  const south = nihutatudJoon(mainVis, -(hwM - 0.3));                         // Katkematu lõunaserv S → J → E1.
  const fenceEdge = umarUhine(nihutatudJoon(e2c, -(hwF - 0.25)).reverse(),
    nihutatudJoon(jooneOsa(mainFull, sJ, sEnd), hwM - 0.3), PLAAN.aiaNurgaraadius + 1.5);   // Serv.
  for (const l of [north, south, fenceEdge]) B.add('varv', ribbon(l, -lw, lw, 0.016, { across01: true }));

  // Peatumisjoon ja peatumiskiri E2-l enne peatänavat.
  const st = punktKaugusel(e2c, 5.2);
  B.add('varv', maapinnaNelinurk(st.p, st.t, st.n, 0.22, hwF - 0.35, 0.017, [0, 0, 1, 2 * (hwF - 0.35)]));
  const tt = punktKaugusel(e2c, 7.3);
  B.add('peatu', maapinnaNelinurk(tt.p, tt.n, [-tt.t[0], -tt.t[1]], 1.45, 1.2, 0.017));

  // Kaevuluugid.
  const mh = (p) => B.add('kaevuluuk', maapinnaNelinurk(p, [1, 0], [0, 1], 0.34, 0.34, 0.014));
  mh(nearX(mainW, -21.0));
  mh(nearX(mainW, -9.6));
  mh(punktKaugusel(e1c, 11).p);

  // Hoovialad (betoon, 5 cm): põhjas pargini, lõunas H2 ja E1 ääres, pargist põhjas valge maja.
  const northEdge = clip(nihutatudJoon(mainW, hwM + PLAAN.pohjakonnitee), (p) => p[0] > -46 && p[0] < -15.3);
  const northLot = [...northEdge, [-15.3, 30.6], [-46, 30.6]];
  const sW = project(mainFull, [-46, -1]).s;
  const southEdge = nihutatudJoon(jooneOsa(mainFull, sW, sJ + 45), -(hwM + PLAAN.lounakonnitee));
  const southLot = [...southEdge, [40, -60], [-46, -60]];
  const whiteLot = [[-15.3, PARK.Y1 + 0.4], [0.4, PARK.Y1 + 0.4], [0.4, 31.5], [-15.3, 31.5]];
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

  // Kõnniteed: tellissillutis peaaegu sõidutee kõrgusel.
  const swN = clip(mainW, (p) => p[0] < -14.6);
  B.add('tellis', ribbon(swN, hwM, hwM + PLAAN.pohjakonnitee, 0.03, { swap: true }));
  B.add('tellis', ribbon(mainVis, -(hwM + PLAAN.lounakonnitee), -hwM, 0.03, { swap: true }));
  B.add('tellis', ribbon(aiaJoon, -1.55, -0.2, 0.03, { swap: true }));
  const swE2 = clip(e2c, (p) => p[1] > PARK.Y1 + 0.2);
  B.add('tellis', ribbon(swE2, hwF, hwF + 1.0, 0.03, { swap: true }));

  // Väikepark: plaadid 12 cm sõiduteest kõrgemal, graniitserv, viltu lõigatud kagunurk ja sirge idaserv.
  // Pikem külg kulgeb piki H1 külgseina E2 suunas; lühem külg avaneb S–J tänavale.
  // Idaserva ja E2 sõidutee vahele jääv ala on asfalt (tee laiend), sest E2 ja aia asetust ei muudeta.
  const curb = pargiAarekivi(mainW, hwM);
  ctx.parkCurb = curb;
  B.add('tellis', ribbon(curb, -0.9, 0, 0.03, { swap: true }));
  B.add('graniit', ribbon(curb, 0, 0.24, 0.15));
  B.add('graniit', vwall(curb, 0, 0.15));
  const inner = nihutatudJoon(curb, 0.24);
  const a = inner[0], z = inner[inner.length - 1];
  const pargiHulknurk = [...inner, [z[0], PARK.Y1], [PARK.X0, PARK.Y1], [PARK.X0, a[1]]];
  ctx.pargiHulknurk = pargiHulknurk;
  B.add('pargiplaat', taidaHulknurk(pargiHulknurk, 0.12));
  // Pargi põhjaserv: graniitäärekivi ja madal müür valge maja krundi poole.
  B.add('graniit', plaanikast(PARK.X0, PARK.X1, PARK.Y1, PARK.Y1 + 0.24, 0, 0.15, { faces: 'NSEWT' }));

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
  HG.fill(ribaHulknurk(swE2, hwF, hwF + 1.0), 0.03);
  HG.fill(ribaHulknurk(curb, -0.9, 0), 0.03);
  HG.fill(pargiHulknurk, 0.12);
  HG.fill(ribaHulknurk(curb, 0, 0.24), 0.15);
  HG.fill(soilPoly, 0.62);
  ctx.korgused = HG;
}
