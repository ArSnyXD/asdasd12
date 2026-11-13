// Stseeni hooned.
// H1: kuus korrust, kitsas tänavafassaad ja sügav põhjapoolne maht.
// H2: seitse korrust, läbiv hele betoon. N1 on H1 naaber eesaia ja majaga.
// E1 edelakülg: madal müür istutuskastidega, N2, N3 ning kauged N4/N5.
// Iga koostaja lisab kokkupõrkekehad, valgustid ja kaamera laepiirangud ühisesse konteksti.
import { H1, H2, PLAAN, PARK, AUTOMAADID, h2Plaan } from './seaded.js';
import { plaanikast, fassaadinelinurk, rng, cyl, beam, obox, blob, nihutatudJoon, kogupikkused, punktKaugusel, taidaHulknurk } from './abifunktsioonid.js';
import { jooneOsa, on, Koordinaadistik } from './geomeetria.js';
import { hekirida } from './taimestik.js';

const VALGUSTATUD = [2, 3, 5, 7, 10, 13], VALGUSTAMATA = [0, 1, 4, 6, 8, 9, 11, 12, 14, 15];
const cell = (k) => {
  const cx = k % 4, cy = Math.floor(k / 4), e = 0.004;
  return [cx / 4 + e, 1 - (cy + 1) / 4 + e, (cx + 1) / 4 - e, 1 - cy / 4 - e];
};

// Kast fassaadikoordinaatides: a piki fassaadi, o seinatasapinnast väljapoole.
export function fassaadikast(f, plane, a0, a1, h0, h1, o0, o1, opt) {
  if (f === 'S') return plaanikast(a0, a1, plane - o1, plane - o0, h0, h1, opt);
  if (f === 'N') return plaanikast(a0, a1, plane + o0, plane + o1, h0, h1, opt);
  if (f === 'E') return plaanikast(plane + o0, plane + o1, a0, a1, h0, h1, opt);
  return plaanikast(plane - o1, plane - o0, a0, a1, h0, h1, opt);
}

// Aken või rõduuks: tekstuuriatlase nelinurk, eenduv raam ja aknaplekk.
export function win(B, R, f, plane, c, w, h0, h1, o = {}) {
  const k = o.cell ?? (R() < (o.lit ?? 0.2) ? R.pick(VALGUSTATUD) : R.pick(VALGUSTAMATA));
  const off = (f === 'S' || f === 'W') ? -0.015 : 0.015;
  B.add('windows', fassaadinelinurk(f, plane + off, c, w, h0, h1, cell(k)));
  const fm = o.frame || 'hallMetall', d = o.depth ?? 0.08, t = 0.05;
  B.add(fm, fassaadikast(f, plane, c - w / 2 - t, c + w / 2 + t, h1, h1 + t, 0, d));
  B.add(fm, fassaadikast(f, plane, c - w / 2 - t, c - w / 2, h0, h1, 0, d));
  B.add(fm, fassaadikast(f, plane, c + w / 2, c + w / 2 + t, h0, h1, 0, d));
  if (o.aknaplekk === false) B.add(fm, fassaadikast(f, plane, c - w / 2 - t, c + w / 2 + t, h0 - t, h0, 0, d));
  else B.add(o.aknaplekiMaterjal || 'h1Serv', fassaadikast(f, plane, c - w / 2 - 0.08, c + w / 2 + 0.08, h0 - 0.07, h0, 0, 0.13));
}

// Kliimaseadme välisosa.
export function ac(B, f, plane, c, h0) {
  B.add('valge', fassaadikast(f, plane, c - 0.4, c + 0.4, h0, h0 + 0.58, 0.04, 0.32));
  B.add('tumeMetall', fassaadikast(f, plane, c - 0.32, c + 0.12, h0 + 0.08, h0 + 0.5, 0.32, 0.335));
}

// Hoone valgusti luuakse koos tänavavalgustitega põhimoodulis.
const light = (ctx, X, Y, h, color, intensity, distance) => ctx.lights.push({ X, Y, h, color, intensity, distance });

// H1.
// Kitsas ots tänavale, kõrge sügav maht põhja ja täiskõrguses tumedad nurgapostid.
// Elukorruste kaheosalised rõdud plaaditud parapeti ja valge vaheseinaga; vahesein seisab parapeti taga.
// Esimesel korrusel vasakul madal süvis sildi ja lillepeenraga, paremal sügav avatud majaalune läbipääs.
// Läbipääs on sügav, pargi pool betoonsein ja laes valgustid.
export function looH1(B, ctx) {
  const R = rng(101), col = ctx.col;
  const { X0, X1, Y0, Y1, GF, FH, NF, PASS } = H1;
  const TOP = GF + FH * NF;
  const gb = [X0, X1, Y0, Y1, 0, TOP + 0.9];
  const PIL = 0.72, BD = 1.15, XD = -20.3, NW = PASS.X0, ND = PASS.depth, NH = PASS.H;
  const BX0 = X0 + PIL, BX1 = X1 - PIL, NE = PASS.X1, yb = Y0 + BD, yd = Y0 + ND;
  const REC = 1.0, wy = Y0 + REC, PW = NW - 0.3;     // Vasaku süvise sügavus, tagaseina tasapind ja süvise parempoolne post.
  const PT = 0.14;                                    // Rõduparapeti paksus fassaaditasapinnast.

  // Põhimaht, rõdude tagasein ja nurgapostid.
  B.add('h1Plaat', plaanikast(X0, X1, yb, Y1, 0, TOP, { faces: 'NEW', gb }));
  B.add('h1Tume', plaanikast(BX0, BX1, yb, yb + 0.1, GF, TOP, { faces: 'S', gb }));
  for (const [a, b] of [[X0, BX0], [BX1, X1]]) B.add('h1Post', plaanikast(a, b, Y0 - 0.06, yb, 0, TOP + 0.9, { faces: 'SEWT', gb }));

  // Esimene korrus: vasakul 1 m sügavune süvis sildiga tagaseina ja postiga, paremal läbipääs.
  // Süvise lagi on esimese rõdu alapind, külgedeks nurgapost ja süvise post.
  B.add('h1Plaat', plaanikast(BX0, NW, wy, Y0 + 1.6, 0, GF, { faces: 'SE', gb }));            // Süvise tagasein ja läbipääsu lääneseina algus.
  B.add('h1Plaat', plaanikast(PW, NW, Y0, wy, 0, GF, { faces: 'SEW', gb }));                 // Süvise ja läbipääsu vaheline post.
  B.add('betoon', plaanikast(BX0, NW, Y0 + 1.6, yd, 0, GF, { faces: 'E' }));                 // Läbipääsu betoonist läänesein.
  B.add('betoon', plaanikast(NE, NE + 0.3, yb, yd, 0, NH, { faces: 'W' }));                  // Läbipääsu pargipoolne betoonsein algab nurgaposti tagant.
  B.add('tumeBetoon', plaanikast(NW, NE, yd, yd + 0.2, 0, NH, { faces: 'S' }));              // Läbipääsu tagasein.
  B.add('vore', fassaadinelinurk('S', yd - 0.02, (NW + NE) / 2, NE - NW - 0.3, 0.05, 2.3, [0, 0, NE - NW - 0.3, 2.3]));   // Värav hoovi.
  B.add('tumeMetall', plaanikast(NW + 0.1, NE - 0.1, yd - 0.08, yd - 0.02, 2.3, 2.4, { faces: 'NSEWTB' }));
  B.add('h1Plaat', plaanikast(NW, NE, Y0, Y0 + 0.3, NH, GF, { faces: 'SB', gb }));              // Sillus.
  B.add('soffit', plaanikast(NW, NE, Y0 + 0.3, yd, NH, NH, { faces: 'B' }));                   // Läbipääsu lagi.
  B.add('graniit', plaanikast(NW, NE, Y0 - 0.05, yd, 0.05, 0.075, { faces: 'NST' }));          // Lävi.
  // Esiväljak: madal graniitserv kõnnitee ääres, lai ava läbipääsu ja seina ees.
  const fy = ctx.h1Fore ? ctx.h1Fore[0][1] : Y0 - 4.6;
  for (const [a, b] of [[-24.55, -23.9], [-15.9, -15.85]]) B.add('graniit', plaanikast(a, b, fy - 0.02, fy + 0.18, 0, 0.12, { faces: 'NSEWT' }));
  B.add('graniit', plaanikast(-24.55, -24.4, fy + 0.18, Y0 - 0.06, 0, 0.12, { faces: 'NSEWT' }));
  B.add('h1Sokkel', plaanikast(-24.55, -24.4, fy + 0.18, Y0 - 0.06, 0.12, 0.13, { faces: 'T' }));
  col.box(-24.6, -24.4, fy, Y0, 0.12, 'curb');

  // Kaheosalised rõdud. Plaat, parapet ja vahesein on suletud mahud: parapetil on alapind,
  // plaadi alapind algab parapeti tagant ja vahesein seisab parapeti taga, et esipinnad ei kattuks.
  const secs = [[BX0, XD - 0.12], [XD + 0.12, BX1]];
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    B.add('tumeBetoon', plaanikast(BX0, BX1, Y0, yb, f - 0.18, f, { faces: 'T' }));
    B.add('soffit', plaanikast(BX0, BX1, Y0 + PT, yb, f - 0.18, f - 0.18, { faces: 'B' }));
    B.add('h1Plaat', plaanikast(BX0, BX1, Y0 - 0.03, Y0 + PT, f - 0.18, f + 0.9, { faces: 'SNTB', gb }));
    B.add('hallMetall', plaanikast(BX0, BX1, Y0 + 0.02, Y0 + 0.08, f + 1.04, f + 1.08, { faces: 'NSTB' }));
    for (let x = BX0 + 0.55; x < BX1 - 0.3; x += 1.15) B.add('hallMetall', plaanikast(x - 0.015, x + 0.015, Y0 + 0.035, Y0 + 0.065, f + 0.9, f + 1.04, { faces: 'NSEW' }));
    B.add('valge', plaanikast(XD - 0.12, XD + 0.12, Y0 + PT, yb, f, f + FH - 0.18, { faces: 'SEW' }));
    for (const [a, b] of secs) {
      const c = (a + b) / 2;
      win(B, R, 'S', yb, c - 0.55, 1.75, f + 0.05, f + 2.15, { aknaplekk: false, lit: 0.28 });
      win(B, R, 'S', yb, c + 1.12, 0.72, f + 1.0, f + 2.05, { lit: 0.2, aknaplekiMaterjal: 'h1Serv' });
      if (R() < 0.45) ac(B, 'S', yb, c + 1.12, f + 0.02);
    }
  }
  // Pööning, katus, tehnoruum ja mahuti. Pööninguparapeti alapind katab kogu rõdusügavuse.
  B.add('h1Plaat', plaanikast(BX0, BX1, Y0 - 0.03, yb, TOP - 0.18, TOP + 0.9, { faces: 'STB', gb }));
  B.add('tumeBetoon', plaanikast(X0, X1, Y0, Y1, TOP, TOP + 0.02, { faces: 'T' }));
  for (const b of [[X0, X1, Y1 - 0.2, Y1], [X0, X0 + 0.2, yb, Y1 - 0.2], [X1 - 0.2, X1, yb, Y1 - 0.2]]) {   // Külgparapetid lõpevad põhjaparapeti ees.
    B.add('h1Plaat', plaanikast(b[0], b[1], b[2], b[3], TOP, TOP + 0.9, { faces: 'NSEWT', gb }));
  }
  B.add('h1Plaat', plaanikast(-21.6, -18.4, Y1 - 5.4, Y1 - 1.0, TOP, TOP + 2.7, { faces: 'NSEWT', gb }));
  B.add('hallMetall', cyl(-23.3, Y1 - 3.0, TOP, 0.85, 0.85, 1.7, 12));
  B.add('hallMetall', cyl(-17.2, Y1 - 1.8, TOP, 0.03, 0.03, 4.2, 6));

  // Külgfassaadid; akende asukohad fassaaditasandi Y0 suhtes.
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    if (R() < 0.85) win(B, R, 'W', X0, Y0 + 6.6, 0.75, f + 1.0, f + 2.05, { lit: 0.18, aknaplekiMaterjal: 'h1Serv' });
    if (R() < 0.75) win(B, R, 'W', X0, Y0 + 13.9, 0.75, f + 1.0, f + 2.05, { lit: 0.18, aknaplekiMaterjal: 'h1Serv' });
    win(B, R, 'W', X0, Y0 + 20.2, 0.45, f + 0.6, f + 2.1, { lit: 0.1, aknaplekiMaterjal: 'h1Serv' });
    for (const y of [4.0, 8.2, 12.4, 16.6, 20.8]) if (R() < 0.82) win(B, R, 'E', X1, Y0 + y, 1.25, f + 0.95, f + 2.1, { lit: 0.22, aknaplekiMaterjal: 'h1Serv' });
    if (R() < 0.55) ac(B, 'E', X1, Y0 + 6.1 + 4.2 * Math.floor(R() * 4), f + 0.15);
    for (const x of [-22.6, -18.0]) if (R() < 0.8) win(B, R, 'N', Y1, x, 1.3, f + 0.95, f + 2.1, { lit: 0.2, aknaplekiMaterjal: 'h1Serv' });
  }
  for (const y of [8.2, 12.4, 16.6]) win(B, R, 'E', X1, Y0 + y, 1.1, 1.0, 2.1, { lit: 0.15, aknaplekiMaterjal: 'h1Serv' });
  B.add('hallMetall', cyl(X1 + 0.08, yb + 0.3, 0, 0.05, 0.05, TOP + 0.6, 6));
  B.add('hallMetall', cyl(X0 - 0.08, yb + 0.25, 0, 0.05, 0.05, TOP + 0.6, 6));

  // Nimesilt ja seinavalgusti süvise tagaseinal; lillepeenar süvise vasakus otsas fassaadijoonest väljas, parem pool jääb käidavaks.
  B.add('tumeMetall', fassaadikast('S', wy, -23.05, -21.25, 1.28, 1.92, 0, 0.025));
  B.add('nimesilt', fassaadinelinurk('S', wy - 0.03, -22.15, 1.7, 1.32, 1.88));
  B.add('lambiKlaas', fassaadikast('S', wy, PW - 0.62, PW - 0.36, 2.05, 2.4, 0, 0.09));
  B.add('tumeGraniit', plaanikast(-23.8, -22.3, Y0 - 1.5, Y0 - 0.2, 0, 0.45, { faces: 'NSEWT' }));
  hekirida(B, -23.7, -22.4, Y0 - 1.4, Y0 - 0.3, 0.95, 31);
  col.box(-23.8, -22.3, Y0 - 1.5, Y0 - 0.2, 0.9, 'planter');
  light(ctx, PW - 0.49, wy - 0.4, 2.2, 0xffc890, 2.5, 4.5);

  // Läbipääsu alguses postkastid ja fonolukk, küljel klaasuks trepikotta, laes valgustid.
  B.add('hallMetall', fassaadikast('E', NW, Y0 + 1.9, Y0 + 3.7, 0.85, 1.75, 0, 0.32));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    B.add('tumeMetall', fassaadikast('E', NW, Y0 + 2.02 + i * 0.42, Y0 + 2.32 + i * 0.42, 1.0 + j * 0.27, 1.04 + j * 0.27, 0.32, 0.326));
  }
  B.add('tumeMetall', fassaadikast('W', NE, Y0 + 4.2, Y0 + 4.45, 1.15, 1.5, 0, 0.04));
  const dy0 = Y0 + 5.2, dy1 = Y0 + 7.0;
  B.add('fuajee', fassaadinelinurk('E', NW + 0.015, (dy0 + dy1) / 2, dy1 - dy0, 0.07, 2.3));
  B.add('tumeMetall', fassaadikast('E', NW, dy0 - 0.06, dy0, 0.07, 2.3, 0, 0.08));
  B.add('tumeMetall', fassaadikast('E', NW, dy1, dy1 + 0.06, 0.07, 2.3, 0, 0.08));
  B.add('tumeMetall', fassaadikast('E', NW, dy0 - 0.06, dy1 + 0.06, 2.3, 2.4, 0, 0.08));
  for (const y of [Y0 + 2.2, Y0 + 6.0, Y0 + 9.8]) {
    B.add('lambiKlaas', cyl((NW + NE) / 2, y, NH - 0.05, 0.2, 0.2, 0.04, 14));
    light(ctx, (NW + NE) / 2, y, NH - 0.3, 0xffcf96, 4.5, 6.5);
  }

  // Betoonplaatidest sein H1 esiväljaku ja läbipääsu ning pargi vahel.
  const FX = -15.72, FY0 = fy + 0.3, FY1 = PARK.Y1;
  B.add('tumeBetoon', plaanikast(FX - 0.1, FX + 0.1, FY0, FY1, 0, 0.15, { faces: 'NSEWT' }));
  for (let y = FY0 + 0.05, i = 0; y < FY1 - 0.05; y += 0.34, i++) {
    const h = 1.9 + 0.6 * (0.5 + 0.5 * Math.sin(i * 1.7) * Math.cos(i * 0.6));
    B.add('betoon', plaanikast(FX - 0.06, FX + 0.06, y, Math.min(FY1, y + 0.28), 0.15, h, { faces: 'NSEWT' }));
  }
  col.seg([FX, FY0], [FX, FY1], 0.1, 2.0, 'slabFence');

  // Kokkupõrkekehad ja kaamera laepiirangud: süvise tagasein, nurgapostid, süvise post ja läbipääsu seinad.
  col.box(X0, NW, wy, Y1, TOP, 'H1');
  col.box(X0, BX0, Y0 - 0.06, Y1, TOP, 'H1');
  col.box(PW, NW, Y0, wy, TOP, 'H1');
  col.box(NE, X1, Y0 - 0.06, Y1, TOP, 'H1');
  col.box(NW, NE, yd, Y1, TOP, 'H1');
  ctx.laed.push([NW, NE, Y0 + 0.3, yd, NH], [BX0, BX1, Y0, yb, GF - 0.18]);
}

// H2: hele materjal ja tänava suhtes pööratud asetus.
// Kogu hoone kasutab H2 kohalikku koordinaadistikku: x piki fassaadi lääneotsast,
// y tänavafassaadist väljapoole. Hoone, rõdud, postid, esimene korrus ja automaadid,
// esiväljak, sissesõit, haljastus, kokkupõrkekehad ning kaamera piirangud pööratakse koos.
function hekijoon(B, ctx, F, a, b, w, h, seed) {
  // Pügatud hekk kahe kohaliku punkti vahel: tala ja ebakorrapärased mahud koos kokkupõrkekehaga.
  const R = rng(seed), pa = F.plaanile(a[0], a[1]), pb = F.plaanile(b[0], b[1]);
  B.add('hekk', beam(pa, pb, 0.05, h, w, { uvMeters: true }));
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.75));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, p = F.plaanile(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    B.add('hekk', blob(p[0], h - 0.06, -p[1], w * 0.56, { rng: R, sx: 1.25, sy: 0.42, rough: 0.5, detail: 1 }));
  }
  ctx.col.seg(pa, pb, w / 2, h, 'hekk');
}

export function looH2(B, ctx) {
  const R = rng(202), col = ctx.col;
  const { L, D, GF, FH, NF, ang } = H2;
  const TOP = GF + FH * NF;
  const F = new Koordinaadistik(B, ...h2Plaan(0, 0), ang);
  const gb = [0, L, -D, 0, 0, TOP + 1.1];
  const REC = 2.5, gy = -REC;       // Esimene korrus on rõdude alla tagasi astutud.
  const BAL = 1.3, by = BAL;        // Rõdu sügavus fassaaditasapinnast.
  const X0 = 0, X1 = L, Y0 = -D, Y1 = 0;

  // Tänavafassaad astub plaanis sügavusse: kaks rõdudega eenduvat osa (y = 0), nende vahel kitsas
  // tagasiastuv vahe ja ristmikupoolses otsas tagasiastuv trepikojaosa. Astmed on hoone kehas,
  // külgpinnad ühendavad eri sügavusel olevad fassaadiosad. Esimene korrus jääb läbivalt tasapinnale gy.
  const BAYS = [
    { x0: 0, x1: 7.2, y: 0, rodud: true, units: [[0, 3.6], [3.6, 7.2]], part: [3.6], sides: 'W' },
    { x0: 7.2, x1: 9.0, y: -1.4, rodud: false, sides: '' },
    { x0: 9.0, x1: 19.8, y: 0, rodud: true, units: [[9.0, 12.6], [12.6, 16.2], [16.2, 19.8]], part: [12.6, 16.2], sides: '' },
    { x0: 19.8, x1: L, y: -1.1, rodud: false, sides: 'E' },
  ];
  const yEast = BAYS[BAYS.length - 1].y;

  // Esimene korrus ja ülemine maht samast heledast betoonist; ülemine maht fassaadiosade kaupa.
  // Astmete külgpinnad on rõduribade otsaseinad; hoone otsaseinad lisatakse ainult otsmistele osadele
  // ja otsaseinte taha jäävas osas, et pinnad ei kattuks.
  F.add('h2Sein', plaanikast(X0, X1, Y0, gy, 0, GF, { faces: 'NSEW', gb }));
  for (const b of BAYS) {
    F.add('h2Sein', plaanikast(b.x0, b.x1, Y0, b.y, GF, TOP, { faces: 'NS', gb }));
    for (const s of b.sides) F.add('h2Sein', plaanikast(b.x0, b.x1, Y0, b.rodud ? gy : b.y, GF, TOP, { faces: s, gb }));
    F.add('soffit', plaanikast(b.x0, b.x1, gy, b.rodud ? by : b.y, GF - 0.25, GF - 0.25, { faces: 'B' }));
    // Tagasiastuva osa arkaadilae serv: esipind lae ja ülemise mahu vahel, et sinna ei jääks pilu.
    if (!b.rodud) F.add('h2Sein', plaanikast(b.x0, b.x1, gy, b.y, GF - 0.25, GF, { faces: 'N', gb }));
  }

  // Rõdud klaaspiirete ja mattide vaheseintega eenduvatel osadel; tagasiastuvatel osadel kitsad aknad.
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    for (const b of BAYS) {
      if (!b.rodud) {
        const c = (b.x0 + b.x1) / 2, w = Math.min(1.2, b.x1 - b.x0 - 0.9);
        win(F, R, 'N', b.y, c, w, f + 0.9, f + 2.05, { lit: 0.2, aknaplekiMaterjal: 'h2Plaat' });
        continue;
      }
      const a0 = b.x0 + 0.25, a1 = b.x1 - 0.25;
      F.add('h2Plaat', plaanikast(a0, a1, Y1, by, f - 0.25, f, { faces: 'NEWT' }));
      if (k > 0) F.add('soffit', plaanikast(a0, a1, Y1, by, f - 0.25, f, { faces: 'B' }));
      F.add('klaaspiire', plaanikast(a0, a1, by - 0.09, by - 0.04, f, f + 1.1, { faces: 'NSEWT', vBase: f }));
      F.add('hallMetall', plaanikast(a0, a1, by - 0.1, by - 0.03, f + 1.1, f + 1.15, { faces: 'NST' }));
      for (const x of b.part) F.add('klaaspiire', plaanikast(x - 0.03, x + 0.03, Y1, by - 0.1, f, f + 2.45, { faces: 'EW', vBase: f }));
      for (const [a, c1] of b.units) {
        const c = (a + c1) / 2, w = Math.min(1.5, (c1 - a) / 2 - 0.35);
        win(F, R, 'N', Y1, c - w / 2 - 0.2, w, f + 0.05, f + 2.15, { aknaplekk: false, lit: 0.22 });
        win(F, R, 'N', Y1, c + w / 2 + 0.2, w, f + 0.05, f + 2.15, { aknaplekk: false, lit: 0.22 });
        if (R() < 0.5) ac(F, 'N', Y1, c1 - 0.75, f);
      }
    }
  }
  // Rõduribade otsaseinad igal eenduval osal ning ribade pealmine plaat otsaseinte vahel.
  // Hoone lääneotsa sein ulatub maapinnani ja sulgeb arkaadi; astmete vahel olevad otsaseinad algavad
  // arkaadi laest, et need ei seisaks esimese korruse akende, fuajee ega garaaži ees.
  const CAP = TOP + 0.35;
  const uim = (x0, x1) => {
    const ots = x0 <= X0 + 1e-6 || x1 >= X1 - 1e-6, h0 = ots ? 0 : GF - 0.25;
    F.add('h2Sein', plaanikast(x0, x1, gy, by + 0.05, h0, CAP, { faces: 'NEWT', gb }));
    // Alapind ainult rõduplaadist ettepoole jäävas ribas; ülejäänu katab arkaadi lagi.
    if (!ots) F.add('h2Sein', plaanikast(x0, x1, by, by + 0.05, h0, h0, { faces: 'B', gb }));
    return ots;
  };
  const uimed = [];
  for (const b of BAYS) {
    if (!b.rodud) continue;
    uimed.push([b.x0, b.x0 + 0.25, uim(b.x0, b.x0 + 0.25)], [b.x1 - 0.25, b.x1, uim(b.x1 - 0.25, b.x1)]);
    F.add('h2Plaat', plaanikast(b.x0 + 0.25, b.x1 - 0.25, gy, by + 0.05, TOP - 0.1, CAP, { faces: 'NSTB' }));
  }

  // Esimesel korrusel läänes varikatusega fuajee, teenindusaken ja idas võre taga parkla.
  const LOB = [3.6, 7.0];
  F.add('fuajee', fassaadinelinurk('N', gy + 0.015, (LOB[0] + LOB[1]) / 2, LOB[1] - LOB[0] - 0.2, 0.05, 2.8));
  F.add('tumeMetall', fassaadikast('N', gy, LOB[0] - 0.1, LOB[0], 0.05, 2.8, 0, 0.1));
  F.add('tumeMetall', fassaadikast('N', gy, LOB[1], LOB[1] + 0.1, 0.05, 2.8, 0, 0.1));
  F.add('tumeMetall', fassaadikast('N', gy, LOB[0] - 0.1, LOB[1] + 0.1, 2.8, 2.9, 0, 0.1));
  F.add('h2Plaat', plaanikast(LOB[0] - 0.3, LOB[1] + 0.3, gy, gy + 1.7, 2.95, 3.1, { faces: 'NSEWTB' }));
  const GR = [[14.5, 17.9], [18.0, 21.4]];
  F.add('sisemus', fassaadinelinurk('N', gy + 0.01, 17.95, 7.1, 0, 2.7));
  for (const [a, b] of GR) F.add('vore', fassaadinelinurk('N', gy + 0.3, (a + b) / 2, b - a, 0, 2.35, [0, 0, b - a, 2.35]));
  F.add('tumeMetall', plaanikast(17.85, 18.05, gy, gy + 0.32, 0, 2.7, { faces: 'NSEW' }));
  F.add('h2Plaat', plaanikast(14.3, 21.6, gy, gy + 0.35, 2.7, GF - 0.25, { faces: 'NB' }));
  const AKNAD1 = [[9.2, 1.4], [11.6, 1.4]];   // Esimese korruse aknad: kohalik keskpunkt ja laius.
  win(F, R, 'N', gy, AKNAD1[0][0], AKNAD1[0][1], 1.0, 2.1, { cell: 6, aknaplekiMaterjal: 'h2Plaat' });
  win(F, R, 'N', gy, AKNAD1[1][0], AKNAD1[1][1], 1.0, 2.1, { cell: 7, aknaplekiMaterjal: 'h2Plaat' });
  F.add('hallMetall', fassaadikast('N', gy, 12.6, 13.4, 0.9, 1.8, 0, 0.14));

  // Idaots J/E1 poole: nurgarõdud tagasiastuva otsaosa fassaadijooneni, aknad ja kliimaseadmed.
  const ey0 = Y1 - 4.4, ey1 = yEast;
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    F.add('h2Plaat', plaanikast(X1, X1 + 1.2, ey0, ey1, f - 0.25, f, { faces: 'NSET' }));
    if (k > 0) F.add('soffit', plaanikast(X1, X1 + 1.2, ey0, ey1, f - 0.25, f, { faces: 'B' }));
    F.add('klaaspiire', plaanikast(X1 + 1.11, X1 + 1.16, ey0, ey1, f, f + 1.1, { faces: 'NSEWT', vBase: f }));
    F.add('klaaspiire', plaanikast(X1, X1 + 1.16, ey0 - 0.05, ey0, f, f + 1.1, { faces: 'NSEWT', vBase: f }));
    F.add('klaaspiire', plaanikast(X1, X1 + 1.16, ey1, ey1 + 0.05, f, f + 1.1, { faces: 'NSEWT', vBase: f }));
    win(F, R, 'E', X1, (ey0 + ey1) / 2, 1.6, f + 0.05, f + 2.15, { aknaplekk: false, lit: 0.25 });
    if (R() < 0.8) win(F, R, 'E', X1, -6.5, 1.1, f + 0.9, f + 2.0, { lit: 0.2, aknaplekiMaterjal: 'h2Plaat' });
    if (R() < 0.7) win(F, R, 'E', X1, -9.7, 1.1, f + 0.9, f + 2.0, { lit: 0.2, aknaplekiMaterjal: 'h2Plaat' });
    if (R() < 0.5) ac(F, 'E', X1, -8.1, f + 0.1);
  }
  win(F, R, 'E', X1, -7.4, 1.0, 1.0, 2.0, { cell: 6, aknaplekiMaterjal: 'h2Plaat' });
  F.add('hallMetall', cyl(X1 + 0.08, -11.7, 0, 0.05, 0.05, TOP + 0.6, 6));

  // Lääne- ja lõunafassaad taustal.
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    if (R() < 0.6) win(F, R, 'W', X0, -4.0, 0.8, f + 1.0, f + 2.0, { lit: 0.15, aknaplekiMaterjal: 'h2Plaat' });
    if (R() < 0.5) win(F, R, 'W', X0, -8.5, 0.8, f + 1.0, f + 2.0, { lit: 0.15, aknaplekiMaterjal: 'h2Plaat' });
    for (let x = 1.5; x < X1 - 1; x += 3.6) if (R() < 0.8) win(F, R, 'S', Y0, x, 1.4, f + 0.9, f + 2.05, { lit: 0.2, aknaplekiMaterjal: 'h2Plaat' });
  }

  // Katus: plaat ja parapet järgivad fassaadiosade astmeid. Parapetitükid ei kattu: külgparapetid on
  // täispikad, esi- ja tagaparapet lõpevad nende ees; eenduvatel osadel seisab parapet rõduriba plaadil
  // otsaseinte vahel ning astmete tagasipöörded otsaseintel.
  for (const b of BAYS) F.add('tumeBetoon', plaanikast(b.x0, b.x1, Y0, b.y, TOP, TOP + 0.02, { faces: 'T' }));
  const parapet = [[X0 + 0.2, X1 - 0.2, Y0, Y0 + 0.2, TOP], [X0, X0 + 0.2, Y0, gy, TOP], [X0, X0 + 0.25, gy, BAYS[0].y, CAP],
    [X1 - 0.2, X1, Y0, yEast, TOP]];
  BAYS.forEach((b, i) => {
    const x0 = b.rodud ? b.x0 + 0.25 : i === 0 ? b.x0 + 0.2 : b.x0;
    const x1 = b.rodud ? b.x1 - 0.25 : i === BAYS.length - 1 ? b.x1 - 0.2 : b.x1;
    parapet.push([x0, x1, b.y - 0.2, b.y, b.rodud ? CAP : TOP]);
  });
  for (let i = 1; i < BAYS.length; i++) {
    const a = BAYS[i - 1], b = BAYS[i], lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
    if (hi - lo < 0.01) continue;
    parapet.push(a.y > b.y ? [a.x1 - 0.25, a.x1, lo, hi, a.rodud ? CAP : TOP] : [b.x0, b.x0 + 0.25, lo, hi, b.rodud ? CAP : TOP]);
  }
  for (const b of parapet) {
    F.add('h2Sein', plaanikast(b[0], b[1], b[2], b[3], b[4], TOP + 1.1, { faces: 'NSEWT', gb }));
  }
  F.add('h2Sein', plaanikast(15.5, 19.5, -9.5, -5.0, TOP, TOP + 3.0, { faces: 'NSEWT', gb }));
  F.add('hallMetall', cyl(4.0, -7.0, TOP, 1.0, 1.0, 1.8, 12));
  for (let i = 0; i < 5; i++) F.add('valge', plaanikast(9 + i * 1.3, 9.8 + i * 1.3, -10.8, -10.2, TOP, TOP + 0.6, { faces: 'NSEWT' }));

  // Plaanil pööratud kokkupõrkekastid ja kaamera laepiirangud.
  const ob = (x0, x1, y0, y1, h, tag) => { const c = F.plaanile((x0 + x1) / 2, (y0 + y1) / 2); col.obox(c[0], c[1], (x1 - x0) / 2, (y1 - y0) / 2, ang, h, tag); };
  ob(X0, X1, Y0, gy, TOP, 'H2');
  // Arkaadis on läbimatu ainult maapinnani ulatuv otsasein; kõrgemal algavad otsaseinad jäävad pea kohale.
  for (const [x0, x1, ots] of uimed) if (ots) ob(x0, x1, gy, by + 0.05, TOP, 'H2');
  ob(14.3, 21.6, gy, gy + 0.32, 2.4, 'vore');
  const ceil = (x0, x1, y0, y1, h) => {
    const n = Math.max(1, Math.ceil((x1 - x0) / 4));
    for (let i = 0; i < n; i++) {
      const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n;
      const ps = [F.plaanile(a, y0), F.plaanile(b, y0), F.plaanile(a, y1), F.plaanile(b, y1)];
      ctx.laed.push([Math.min(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[1])), h]);
    }
  };
  ceil(X0, X1, gy, by + 0.05, GF - 0.25);
  ceil(LOB[0] - 0.3, LOB[1] + 0.3, gy, gy + 1.7, 2.95);
  ctx.h2 = { F, L, D, ang, gy, by, GF, TOP, drive: [14.5, 21.4], fuajee: LOB, bays: BAYS, aknad1: AKNAD1, uimed,
    poly: [F.plaanile(0, -D), F.plaanile(L, -D), F.plaanile(L, gy), F.plaanile(0, gy)], origin: F.plaanile(0, 0), edgeY: null };   // Esimese korruse seinte piirjoon kontrollideks; rõdudealune arkaad on avatud.
  looH2Esiväljak(B, ctx, R);
}

// H2 esiväljak: kõnnitee ja fassaadi vahel parkla sissesõit,
// jalgtee fuajeesse, kõnniteeäärsed hekid, väikeste puudega peenrad ja madalad valgustid.
// Tänavat järgiv kõnniteeserv teeb ala kiilukujuliseks: läänes kitsas, J juures lai.
function looH2Esiväljak(B, ctx, R) {
  const { F, L, ang, by, drive, fuajee } = ctx.h2, col = ctx.col;
  const hw = PLAAN.peatee.width / 2 + PLAAN.lounakonnitee;
  // Kõnnitee siseserv kohalikes koordinaatides funktsioonina y(x).
  const c = Math.cos(ang), s = Math.sin(ang), O = h2Plaan(0, 0);
  const toLocal = (p) => [(p[0] - O[0]) * c + (p[1] - O[1]) * s, -(p[0] - O[0]) * s + (p[1] - O[1]) * c];
  const edge = nihutatudJoon(ctx.mainVis, -hw).map(toLocal).filter((p) => p[0] > -6 && p[0] < L + 8).sort((a, b) => a[0] - b[0]);
  const edgeY = (x) => {
    for (let i = 0; i < edge.length - 1; i++) if (x >= edge[i][0] && x <= edge[i + 1][0]) {
      const t = (x - edge[i][0]) / (edge[i + 1][0] - edge[i][0]); return edge[i][1] + (edge[i + 1][1] - edge[i][1]) * t;
    }
    return x < edge[0][0] ? edge[0][1] : edge[edge.length - 1][1];
  };
  ctx.h2.edgeY = edgeY;
  ctx.h2.hekiValispind = F.plaanile(10.55, (edgeY(7.0) + edgeY(14.1)) / 2 - 0.27);   // Sirge kõnniteeäärse heki välispind kontrollideks.
  const IN = 0.22;   // Heki või äärekivi joone nihe kõnnitee servast.
  const strip = (x0, x1, y0, mat, h, inset = 0) => {   // Maapinnariba y0-st kõnnitee servani.
    const pts = [[x0, y0], [x1, y0]];
    for (let x = x1; x >= x0; x -= 1.0) pts.push([x, edgeY(x) - inset]);
    pts.push([x0, edgeY(x0) - inset]);
    F.add(mat, taidaHulknurk(pts, h));
    ctx.korgused.fill(pts.map((p) => F.plaanile(p[0], p[1])), h);
  };
  // Sillutatud esiväljak krundist veidi kõrgemal, sissesõit ja fuajee jalgtee.
  strip(0.3, L + 1.8, -0.4, 'betoon', 0.058);
  strip(drive[0], drive[1], -2.4, 'tumeBetoon', 0.066);
  strip(fuajee[0] + 0.3, fuajee[1] - 0.3, -2.4, 'graniit', 0.07);
  // Graniitserv kõnnitee ääres sissesõidu ja jalgtee avadega.
  const openings = [[drive[0] - 0.2, drive[1] + 0.2], [fuajee[0] + 0.2, fuajee[1] - 0.2]];
  const segs = [];
  let x = 0.6;
  for (const [a, b] of openings.slice().sort((p, q) => p[0] - q[0])) { if (a > x) segs.push([x, a]); x = b; }
  segs.push([x, L + 1.6]);
  for (const [a, b] of segs) {
    const pa = F.plaanile(a, edgeY(a) - 0.06), pb = F.plaanile(b, edgeY(b) - 0.06);
    B.add('graniit', beam(pa, pb, 0, 0.14, 0.12, { uvMeters: true }));
    // Hekk äärekivi taga piisavalt sügavas ribas automaatidest idas.
    if (b - a > 1.2 && a > 3.3) hekijoon(B, ctx, F, [a + 0.2, edgeY(a + 0.2) - IN - 0.3], [b - 0.2, edgeY(b - 0.2) - IN - 0.3], 0.5, 0.9, 40 + Math.round(a));
  }
  // Istutusalad jalgtee ja sissesõidu vahel ning idapoolses otsas J lähedal.
  const beds = [[8.2, drive[0] - 0.6, 0.5], [drive[1] + 0.5, L + 1.4, 0.5]];
  for (const [a, b, y0] of beds) {
    const pts = [[a, y0], [b, y0], [b, edgeY(b) - 1.0], [a, edgeY(a) - 1.0]];
    F.add('muru', taidaHulknurk(pts, 0.1));
    for (const [p, q] of [[pts[0], pts[1]], [pts[1], pts[2]], [pts[2], pts[3]], [pts[3], pts[0]]]) {
      B.add('tumeGraniit', beam(F.plaanile(p[0], p[1]), F.plaanile(q[0], q[1]), 0.06, 0.2, 0.1, { uvMeters: true }));
    }
    ctx.col.obox(...F.plaanile((a + b) / 2, (y0 + edgeY((a + b) / 2) - 1.0) / 2), (b - a) / 2, (edgeY((a + b) / 2) - 1.0 - y0) / 2, ang, 0.4, 'bed');
  }
  // Väikesed puud ja põõsad peenardes; puud luuakse taimestikumoodulis.
  const trees = [[9.6, 2.1], [12.3, 3.2], [11.0, 1.2], [L - 0.4, 2.4], [L + 0.9, 4.6]];
  ctx.h2.trees = trees.map(([x, y], i) => {
    const p = F.plaanile(x, y), h = 5.2 + (i % 3) * 0.6;
    col.circle(p[0], p[1], 0.12, h, 'foreTree');
    return [p[0], p[1], h];
  });
  for (const [x, y, r] of [[8.9, 0.9, 0.5], [13.2, 1.0, 0.45], [L + 0.6, 1.2, 0.55], [L + 1.1, 3.4, 0.5]]) {
    const p = F.plaanile(x, y);
    B.add('roosaPoosas', blob(p[0], 0.5, -p[1], r, { rng: R, sy: 0.75, rough: 0.5, detail: 1 }));
  }
  // Madalad valgustipostid teede ääres ja triibulised postid sissesõidu suudmes.
  for (const [x, y] of [[drive[0] - 0.5, edgeY(drive[0] - 0.5) - 1.4], [fuajee[1] + 0.5, edgeY(fuajee[1] + 0.5) - 1.0]]) {
    const p = F.plaanile(x, y);
    B.add('tumeMetall', cyl(p[0], p[1], 0.06, 0.06, 0.07, 0.9, 8));
    B.add('lambiKlaas', cyl(p[0], p[1], 0.96, 0.07, 0.07, 0.16, 8));
    ctx.lights.push({ X: p[0], Y: p[1], h: 1.0, color: 0xffd9a8, intensity: 3, distance: 5 });
    col.circle(p[0], p[1], 0.08, 1.1, 'lamp');
  }
  // Joogiautomaadid fassaadi ääres rõdude all, kohalik x-koordinaat.
  looAutomaadid(B, ctx, F, ctx.h2.gy);
  // Jalgvärav ja hekk H2 lääneotsa ning läänenaabri vahelises vahes.
  const w0 = F.plaanile(-0.1, -1.0), w1 = [-28.8, -4.7];
  B.add('tumeMetall', beam(w0, [w0[0] - 1.0, w0[1]], 0.05, 1.6, 0.08));
  B.add('hekk', beam([w0[0] - 1.0, w0[1]], w1, 0.05, 1.0, 0.6, { uvMeters: true }));
  col.seg(w0, w1, 0.3, 1.6, 'gate');
}

// Kaks joogiautomaati H2 koordinaadistikus: läbipaistmatu korpus, suletud kaas,
// otsad, esiraam ja liitekohad; tekstuuriatlases esi- ja külgpaneelid.
function looAutomaadid(B, ctx, F, gy) {
  const w = 1.0, d = 0.72, h = 1.83, ya = gy + 0.3, yz = ya + d;   // Tagasiastuva esimese korruse seina ääres rõdude all.
  let x0 = Infinity, x1 = -Infinity;
  for (const v of AUTOMAADID) {
    const { x: X, kind } = v;
    F.add('tumeMetall', plaanikast(X - w / 2 - 0.01, X + w / 2 + 0.01, ya - 0.01, yz + 0.01, 0.05, 0.13, { faces: 'NSEWT' }));
    // Suletud korpus: küljed, tagasein ja põhi kaane alumise servani; oma servaga kaas (h − 0,035 → h + 0,015).
    F.add('automaadiKulg' + kind, plaanikast(X - w / 2, X + w / 2, ya, yz, 0.13, h - 0.035, { faces: 'NSEWTB' }));
    F.add('automaadiKulg' + kind, plaanikast(X - w / 2 - 0.012, X + w / 2 + 0.012, ya - 0.012, yz + 0.012, h - 0.035, h + 0.015, { faces: 'NSEWTB' }));
    // Taastamisel säilis generaator; atlase vastendus ja väljastusava geomeetria
    // rekonstrueeriti atlase mõõtmete ja automaadi kuvatõmmise järgi.
    F.add('automaadid', fassaadinelinurk('N', yz + 0.003, X, w, 0.13, h, [kind / 3, 0, (kind + 1) / 3, 1]));
    const sideUV = [2 / 3 + kind / 6, 0, 2 / 3 + (kind + 1) / 6, 1];
    F.add('automaadid', fassaadinelinurk('E', X + w / 2 + 0.002, (ya + yz) / 2, d, 0.13, h, sideUV));
    F.add('automaadid', fassaadinelinurk('W', X - w / 2 - 0.002, (ya + yz) / 2, d, 0.13, h, sideUV));
    // Esipaneeli eenduv suletud raam (külgliistud ülemise liistu alla) ja väljastusalus.
    F.add('automaadiKulg' + kind, plaanikast(X - w / 2, X - w / 2 + 0.04, yz, yz + 0.05, 0.13, h - 0.05, { faces: 'NSEWTB' }));
    F.add('automaadiKulg' + kind, plaanikast(X + w / 2 - 0.04, X + w / 2, yz, yz + 0.05, 0.13, h - 0.05, { faces: 'NSEWTB' }));
    F.add('automaadiKulg' + kind, plaanikast(X - w / 2, X + w / 2, yz + 0.012, yz + 0.05, h - 0.05, h + 0.015, { faces: 'NSEWTB' }));   // Ülemine liist algab kaane esiservast.
    // Pikslid vastavad avausele x=70..340, y=706..814 igal 512×872 esipaneelil.
    const slotL = X + w / 2 - 340 / 512 * w, slotR = X + w / 2 - 70 / 512 * w;
    const slotTop = h - 706 / 872 * (h - 0.13), slotBottom = h - 814 / 872 * (h - 0.13);
    F.add('tumeMetall', plaanikast(slotL, slotR, yz, yz + 0.045, slotTop, slotTop + 0.025));
    F.add('tumeMetall', plaanikast(slotL, slotR, yz, yz + 0.045, slotBottom - 0.025, slotBottom));
    F.add('tumeMetall', plaanikast(slotL - 0.015, slotL, yz, yz + 0.045, slotBottom, slotTop));
    F.add('tumeMetall', plaanikast(slotR, slotR + 0.015, yz, yz + 0.045, slotBottom, slotTop));
    x0 = Math.min(x0, X - w / 2); x1 = Math.max(x1, X + w / 2);
  }
  // Madal sein automaatide ja fassaadi vahel ning ühine kokkupõrkekeha.
  F.add('betoon', plaanikast(x0 - 0.05, x1 + 0.05, ya - 0.17, ya - 0.02, 0.05, 1.25, { faces: 'NSEWT' }));
  const c = F.plaanile((x0 + x1) / 2, (ya - 0.17 + yz + 0.05) / 2);
  ctx.col.obox(c[0], c[1], (x1 - x0) / 2 + 0.05, (yz + 0.05 - ya + 0.17) / 2, H2.ang, 1.9, 'automaadid');
  const lp = F.plaanile((x0 + x1) / 2, yz + 0.85);
  ctx.lights.push({ X: lp[0], Y: lp[1], h: 1.75, color: 0xdceaff, intensity: 6, distance: 6 });
  ctx.vendingFront = F.plaanile((x0 + x1) / 2, yz);
}

// Must võreaed betoonsoklil N1 eesaias.
// Punktid peavad järgima X/Y-telgi.
function mustAed(B, ctx, pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const alongX = Math.abs(by - ay) < 1e-3;
    const a0 = alongX ? Math.min(ax, bx) : Math.min(ay, by), a1 = alongX ? Math.max(ax, bx) : Math.max(ay, by);
    const pl = alongX ? ay : ax, L = a1 - a0;
    const box = (u0, u1, w, h0, h1) => (alongX ? plaanikast(u0, u1, pl - w, pl + w, h0, h1, { faces: 'NSEWT' }) : plaanikast(pl - w, pl + w, u0, u1, h0, h1, { faces: 'NSEWT' }));
    // Sokkel ulatub lõigu lõpus üle nurga; järgmine lõik algab nurgasokli tagant, et pinnad ei kattuks.
    const algus = i === 0, kasvav = alongX ? ax < bx : ay < by;
    const e0 = kasvav ? (algus ? 0.09 : -0.09) : 0.09;
    const e1 = kasvav ? 0.09 : (algus ? 0.09 : -0.09);
    B.add('betoon', box(a0 - e0, a1 + e1, 0.09, 0, 0.3));
    B.add('vore', fassaadinelinurk(alongX ? 'S' : 'E', pl, (a0 + a1) / 2, L, 0.3, 1.15, [0, 0, L, 0.85]));
    B.add('mustMetall', box(a0 + 0.03, a1 - 0.03, 0.03, 1.13, 1.19));
    const n = Math.max(1, Math.round(L / 1.2));
    // Nurgapost lisatakse vaid üks kord: lõigu alguspost jääb ära, kui eelmine lõik lõppes samas punktis.
    for (let k = 0; k <= n; k++) {
      const a = a0 + (L * k) / n;
      const nurk = (alongX ? ax < bx : ay < by) ? k === 0 : k === n;
      if (i > 0 && nurk) continue;
      B.add('mustMetall', box(a - 0.035, a + 0.035, 0.035, 0.3, 1.21));
    }
    ctx.col.seg(pts[i], pts[i + 1], 0.1, 1.2, 'fenceN1');
  }
}

// N1: kolmekorruseline eesaia ja majaga krunt H1-st läänes.
export function looN1(B, ctx) {
  const R = rng(303), X0 = -31.8, X1 = -25.3, Y0 = 9.0, Y1 = 21.0, GF = 3.2, FH = 2.9, NF = 2, TOP = GF + FH * NF;
  const gb = [X0, X1, Y0, Y1, 0, TOP + 0.8];
  B.add('n1Sein', plaanikast(X0, X1, Y0, Y1, 0, TOP, { faces: 'NSEW', gb }));
  win(B, R, 'S', Y0, -29.9, 0.95, 0.05, 2.15, { cell: 8, aknaplekk: false, frame: 'tumeMetall' });
  B.add('h2Plaat', plaanikast(-30.7, -29.1, Y0 - 0.8, Y0, 2.4, 2.52, { faces: 'NSEWTB' }));
  win(B, R, 'S', Y0, -27.3, 1.6, 0.95, 2.1, { lit: 0.3, aknaplekiMaterjal: 'h1Serv' });
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    for (const x of [-30.4, -28.0]) win(B, R, 'S', Y0, x, 1.5, f + 0.85, f + 2.05, { lit: 0.25, aknaplekiMaterjal: 'h1Serv' });
    if (R() < 0.7) ac(B, 'S', Y0, -26.3, f + 0.1);
  }
  for (let k = 0; k <= NF; k++) {
    const f = k === 0 ? 0 : GF + (k - 1) * FH;
    for (const y of [12.0, 16.0, 19.5]) if (R() < 0.7) win(B, R, 'E', X1, y, 1.0, f + 0.95, f + 2.0, { lit: 0.18, aknaplekiMaterjal: 'h1Serv' });
    for (const y of [12.5, 17.5]) if (R() < 0.6) win(B, R, 'W', X0, y, 1.0, f + 0.95, f + 2.0, { lit: 0.15, aknaplekiMaterjal: 'h1Serv' });
  }
  B.add('tumeBetoon', plaanikast(X0, X1, Y0, Y1, TOP, TOP + 0.02, { faces: 'T' }));
  for (const b of [[X0, X1, Y0, Y0 + 0.2], [X0, X1, Y1 - 0.2, Y1], [X0, X0 + 0.2, Y0 + 0.2, Y1 - 0.2], [X1 - 0.2, X1, Y0 + 0.2, Y1 - 0.2]]) {
    B.add('n1Sein', plaanikast(b[0], b[1], b[2], b[3], TOP, TOP + 0.8, { faces: 'NSEWT', gb }));
  }
  B.add('hallMetall', cyl(-27.0, 18.5, TOP, 0.7, 0.7, 1.3, 12));
  ctx.col.box(X0, X1, Y0, Y1, TOP, 'N1');
  mustAed(B, ctx, [[-31.85, 6.3], [-31.85, 5.62], [-24.6, 5.62], [-24.6, H1.Y0]]);   // Kuni H1 nurgani, esiväljak tagasi nihutatud.
}

// E1 edelakülg.
// Madal istutuskastidega müür H2 otsast N3-ni ning madal N2 H2 hoovi taga.
// Viiekorruseline N3 E1 ääres ning kaks kauget mahtu N4/N5 tänava suunas pööratult.
function looN3(B, ctx) {
  const { e1c } = ctx, R = rng(404);
  const P0 = on(e1c, 13.0, -4.4), P1 = on(e1c, 27.5, -4.4);
  const ang = Math.atan2(P1[1] - P0[1], P1[0] - P0[0]), L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), D = 11;
  const F = new Koordinaadistik(B, P0[0], P0[1], ang);
  const GF = 3.3, FH = 2.85, NF = 4, TOP = GF + FH * NF;
  const gb = [0, L, -D, 0, 0, TOP + 0.9];
  F.add('beezPlaat', plaanikast(0, L, -D, 0, 0, TOP, { faces: 'NSEW', gb }));
  // Esimene korrus: kaks suletud ruloodega kauplust, trepikoja sissepääs ja varikatus.
  F.add('ruloo', fassaadinelinurk('N', 0.02, 3.4, 5.0, 0.05, 2.6));
  F.add('ruloo', fassaadinelinurk('N', 0.02, 9.2, 4.4, 0.05, 2.6));
  F.add('fuajee', fassaadinelinurk('N', 0.015, L - 1.6, 1.5, 0.05, 2.35));
  for (const x of [0.85, 5.95, 6.95, 11.45, L - 2.4, L - 0.8]) F.add('tumeMetall', plaanikast(x - 0.05, x + 0.05, 0, 0.06, 0.05, 2.7, { faces: 'NEW' }));
  F.add('h2Plaat', plaanikast(0.4, L - 0.4, 0, 0.85, 2.85, 2.98, { faces: 'NSEWTB' }));
  F.add('poesilt', fassaadinelinurk('N', 0.025, 6.2, 4.2, 3.05, 3.35));
  for (let k = 0; k < NF; k++) {
    const f = GF + k * FH;
    for (let i = 0; i < 4; i++) {
      const c = 1.9 + (i * (L - 3.8)) / 3;
      win(F, R, 'N', 0, c, 1.5, f + 0.8, f + 2.1, { lit: 0.25, aknaplekiMaterjal: 'h2Plaat' });
      if (R() < 0.4) ac(F, 'N', 0, c + 1.15, f + 0.1);
    }
    for (const y of [-2.5, -8.0]) if (R() < 0.75) win(F, R, 'W', 0, y, 1.0, f + 0.9, f + 2.0, { lit: 0.2, aknaplekiMaterjal: 'h2Plaat' });
  }
  F.add('tumeBetoon', plaanikast(0, L, -D, 0, TOP, TOP + 0.02, { faces: 'T' }));
  for (const b of [[0.2, L - 0.2, -0.2, 0], [0.2, L - 0.2, -D, -D + 0.2], [0, 0.2, -D, 0], [L - 0.2, L, -D, 0]]) {
    F.add('beezPlaat', plaanikast(b[0], b[1], b[2], b[3], TOP, TOP + 0.9, { faces: 'NSEWT', gb }));
  }
  F.add('hallMetall', cyl(L - 3.0, -6.0, TOP, 0.9, 0.9, 1.6, 12));
  F.add('hallMetall', cyl(0.08, -0.3, 0, 0.05, 0.05, TOP + 0.5, 6));
  const c = F.plaanile(L / 2, -D / 2);
  ctx.col.obox(c[0], c[1], L / 2, D / 2, ang, TOP, 'N3');
  ctx.n3 = { P0, ang, L, D, TOP };
}

export function looE1Louna(B, ctx) {
  const { main, sJ, hwM, e1c } = ctx;
  // Madal istutuskastidega müür lõunapoolse kõnnitee ääres H2-st N3-ni.
  const off = -(hwM + PLAAN.lounakonnitee + 0.12);
  const wl = nihutatudJoon(jooneOsa(main, sJ + 2.0, sJ + 12.6), off);
  const path = [h2Plaan(H2.L + 1.6, 3.0), ...wl, on(e1c, 13.1, -4.5)];   // H2 esiväljaku idanurgast.
  for (let i = 0; i < path.length - 1; i++) {
    B.add('betoon', beam(path[i], path[i + 1], 0, 1.0, 0.2, { uvMeters: true }));
    B.add('tumeBetoon', beam(path[i], path[i + 1], 1.0, 1.07, 0.26, { uvMeters: true }));
  }
  ctx.col.polyline(path, 0.13, 1.07, 'lowWall');
  const Lw = kogupikkused(wl), tot = Lw[Lw.length - 1], Rb = rng(505);
  for (let s = 1.2; s < tot - 0.8; s += 2.6) {
    const q = punktKaugusel(wl, s);
    B.add('tumeBetoon', obox(q.p[0], q.p[1], 1.07, 0.9, 0.32, 0.36, Math.atan2(q.t[1], q.t[0]), true));
    B.add('hekk', blob(q.p[0], 1.55, -q.p[1], 0.42, { rng: Rb, sx: 1.25, sy: 0.7, sz: 0.75, rough: 0.45, detail: 1 }));
  }
  // N2: madal hele maja H2 külghoovi taga.
  B.add('heleTaust', plaanikast(2.2, 7.4, -21.5, -14.0, 0, 6.8, { faces: 'NSEW' }));
  B.add('tumeBetoon', plaanikast(2.2, 7.4, -21.5, -14.0, 6.78, 6.8, { faces: 'T' }));
  B.add('betoon', plaanikast(2.2, 7.4, -14.2, -14.0, 6.8, 7.6, { faces: 'NSEWT' }));
  ctx.col.box(2.2, 7.4, -21.5, -14.0, 6.8, 'N2');
  looN3(B, ctx);
  // N4/N5: kauged mahud E1 ääres aia taga.
  for (const [s0, s1, of, D, H, mat] of [[28.2, 42, -4.6, 12, 12, 'bg'], [43, 60, -5.0, 14, 15, 'tumeTaust']]) {
    const a = on(e1c, s0, of), b = on(e1c, s1, of);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const F = new Koordinaadistik(B, a[0], a[1], ang);
    F.add(mat, plaanikast(0, L, -D, 0, 0, H, { faces: 'NSEW' }));
    F.add('tumeBetoon', plaanikast(0, L, -D, 0, H - 0.02, H, { faces: 'T' }));
    F.add('betoon', plaanikast(0, L, -0.2, 0, H, H + 0.8, { faces: 'NSEWT' }));
    const c = F.plaanile(L / 2, -D / 2);
    ctx.col.obox(c[0], c[1], L / 2, D / 2, ang, H, 'bgE1');
  }
}
