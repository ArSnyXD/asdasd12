// Asendiplaan ja vaadete seaded. Plaanil X itta, Y põhja, ühik meeter.
// Punkt (0, 0) on ristmik J. Mõõtmed on ligikaudsed, osade vastastikune asetus on säilitatud.
// E1 jätkab S–J peatänavat sujuvalt kagusse, pöörates veidi paremale.
// E2 on eraldi põhjapoolne haru: see hargneb peatänavast J-st läänes ja kulgeb satelliidivaate järgi
// umbes 25° põhjast itta pargi ja kivipiirde vahel. Aed pöördub ristmikul ja jätkub E1 kirdeküljel.

export const PLAAN = {
  S: [-33, 0.2],        // Algus: peatänava ligipääsetava osa lääneots.
  J: [0, 0],            // Ristmik; E1 algus peatänaval.
  E2lopp: [4.7, 25.0],   // Põhjapoolse haru ligipääsetava osa lõpp.
  E1lopp: [20.6, -10.0], // E1 ligipääsetava osa lõpp; tõkke taga kaob tänav udusse.
  // Peatänav edelast läbi S ja J edasi kagusse E1-na.
  peatee: {
    width: 5.0,
    pts: [[-84, -14.2], [-73, -9.6], [-62, -5.6], [-52, -2.6], [-42, -0.6], [-33, 0.2], [-24, 1.0], [-16, 1.3],
      [-8, 0.95], [-3, 0.35], [0, 0],
      [4.5, -0.75], [8.6, -2.2], [12.4, -4.4], [16.2, -6.9], [20.0, -9.6], [24.0, -12.4], [29.0, -15.9],
      [34.5, -19.8], [40.0, -24.5], [45.0, -30.0], [49.0, -37.0], [52.0, -46.0], [54.0, -57.0]],
  },
  // Põhjapoolne haru E2: telg algab peatänava teljelt pargi kagunurga kohalt ja kulgeb sirgelt
  // pargi ääres (läänepoolne äärekivi on pargi piir), seejärel pöördub aeda järgides kirdesse.
  e2Tee: {
    width: 4.4,
    pts: [[-6.6, 0.78], [-4.55, 5.1], [-1.65, 11.2], [1.25, 17.3], [4.4, 24], [7.6, 32.4], [12.6, 40.6], [19.5, 49]],
  },
  aiaNiheE2: 3.75,  // E2 telje ja aia telje vahe itta.
  aiaNiheE1: 4.0,   // E1 telje ja aia telje vahe kirdesse.
  aiaNurgaraadius: 3.0,    // Aia välisnurga ümardusraadius ristmikul; E2 ja E1 vahel on terav nurk.
  pargiNurgaraadius: 3.0,  // Pargi äärekivi ümardus peatänava ja E2 vahel.
  pohjakonnitee: 1.4,       // Kõnnitee.
  lounakonnitee: 1.0,       // Kitsas riba H2 ääres ja E1 edelaküljel.
  aiakonnitee: 1.3,       // Kõnnitee.
  pargiaareRiba: 0.9,     // Tellisriba sõidutee serva ja pargi äärekivi vahel ning E2 läänekõnnitee laius.
  laanetoke: -40.0,      // Peatänava läänetõkke X-koordinaat alguspunkti taga.
  tokeE1: 26.0,      // Kaugus J-st tõkkeni piki E1 telge.
  tokeE2: 26.0,      // Kaugus E2 algusest tõkkeni piki E2 telge.
};

// Peahoonete mõõtmed: põhiseinad ilma rõdudeta.
// H1 kitsas fassaad on umbes 8,6 m lai, piki parki kulgev hoone umbes 23 m sügav.
// H1 on kõnniteest 2 m tagasi nihutatud, et kitsa fassaadi ette jääks nähtav esiväljak.
// Sissepääs on avatud majaalune läbipääs.
export const H1 = { X0: -24.6, X1: -16.0, Y0: 8.6, Y1: 31.6, GF: 3.4, FH: 2.95, NF: 5,   // Kuus korrust.
  PASS: { X0: -20.15, X1: -16.72, depth: 12.0, H: 2.75 } };   // Majaalune läbipääs: X-vahemik, sügavus alates Y0-st ja vaba kõrgus.
// H2 pikk maht järgib tänavat diagonaalis, rööbiti keskmise suunaga S–J → E1.
// Nurk on umbes −13°, hinnatud satelliidivaate järgi; varasem −15° oli oletus.
// Idaots asub J juures, tänavafassaad kohalikul tasandil y = 0.
// Rõdud ulatuvad +y suunas tänavale; hoone y ∈ [−D, 0], x ∈ [0, L] läänest itta.
export const H2 = { ang: -13 * Math.PI / 180, L: 22.0, D: 12.0, east: [0.2, -9.6], GF: 3.5, FH: 2.9, NF: 6 };   // Seitse korrust.
// Plaanipunkt H2 kohalikest koordinaatidest: x piki fassaadi lääneotsast, y fassaadist välja.
export function h2Plaan(x, y) {
  const c = Math.cos(H2.ang), s = Math.sin(H2.ang), dx = x - H2.L;
  return [H2.east[0] + dx * c - y * s, H2.east[1] + dx * s + y * c];
}

// Park on satelliidivaate järgi kiil H1 külgseina ja E2 vahel: tänavapoolne ots umbes 7 m,
// põhjaots umbes 16 m lai ning idaserv on E2 läänepoolne äärekivi (äärekivi arvutatakse E2 teljest).
// Kuus puud kahes reas: läänerida H1 ääres, idarida umbes 2,6 m äärekivist piki teed.
// Raamid ja pingid on puuridade vahel, valgustid idaserva lähedal.
export const PARK = {
  X0: -15.3, Y0: 4.4, Y1: 23.4,                   // Plaadiala lääneserv H1 seina juures ning lõuna- ja põhjapiir.
  trees: [[-12.8, 8.5], [-9.3, 8.5], [-12.8, 14.0], [-6.7, 14.0], [-12.8, 19.5], [-4.1, 19.5]],
  frames: [[-10.4, 11.2], [-9.1, 16.75]],
  blocks: [[-10.4, 11.2, 1.57], [-9.1, 16.75, 1.57], [-13.6, 6.0, 1.57], [-9.0, 21.9, 0]],
  lamps: [[-8.5, 6.6], [-1.3, 21.4]],
  sissepaasud: { tanav: [-12.0, -10.0], e2: [[10.3, 12.3], [15.7, 17.7]] },   // Postirea vahed: X peatänava ääres, Y E2 ääres.
};

// Suured puud aia taga; templit ei ehitata. [X, Y, kõrgus, võra raadius]
// E1 kohal olnud puud on viidud aia taha; ristmiku lähim puu järgib aia uut asukohta.
export const SUURED_PUUD = [
  [8.8, 16.5, 20, 7.0], [4.6, 7.4, 21, 7.8], [13.8, 2.8, 19, 7.4], [22.0, -2.2, 18, 7.0],
  [14.0, 26.0, 17, 6.6], [17.0, 10.0, 22, 8.2], [29.6, -6.6, 20, 7.6], [24.5, 5.2, 18, 7.2],
];

// Kaks joogiautomaati H2 tänavafassaadi ääres rõdude all, H1 esiväljaku vastas.
// H2 kohalikud koordinaadid: x piki fassaadi lääneotsast, esikülg tänava poole.
export const AUTOMAADID = [
  { x: 1.55, kind: 0 },
  { x: 2.63, kind: 1 },
];

// Jalutamise algus ning tegelase ja kaamera seaded.
export const LIIKUMINE = {
  start: [-30.6, 0.55], algsuund: 0.0,     // Vaade itta ristmiku poole.
  konnikiirus: 1.55, jooksukiirus: 3.3, radius: 0.27,
  kaameraKaugus: 3.3, kaameraMin: 1.2, kaameraMax: 6.0, kaameraKorgus: 1.52, olanihe: 0.3, kaameraKalle: 0.17,
  hiireTundlikkus: 0.0024,
};

// Püsivaadete asukoht ja sihtpunkt: [X, Y, kõrgus].
export const VAATED = {
  main:    { name: 'Põhivaade', pos: [-32.0, 0.35, 2.25], look: [0.0, 1.2, 3.2], fov: 50 },
  tagasivaade: { name: 'Tagasivaade', pos: [-0.6, 0.5, 2.4], look: [-34.0, 1.3, 3.9], fov: 52 },
  e1:      { name: 'E1-lt ristmikule', pos: [19.4, -8.7, 2.3], look: [-4.0, 3.4, 4.0], fov: 52 },
  pikiE1: { name: 'Piki E1', pos: [2.4, 0.3, 2.0], look: [26.0, -14.8, 2.8], fov: 52 },
  e2:      { name: 'E2-lt ristmikule', pos: [3.2, 21.5, 2.3], look: [-6.0, 1.0, 1.6], fov: 52 },
  aed:   { name: 'Ristmik → aed', pos: [-7.0, 0.9, 2.3], look: [9.0, -0.5, 5.0], fov: 55 },
  h1:      { name: 'H1: fassaad', pos: [-18.2, -2.2, 1.6], look: [-20.4, 8.6, 7.4], fov: 64 },
  h1Sissepaas:  { name: 'H1: esiväljak ja läbipääs', pos: [-17.6, 3.0, 1.6], look: [-18.5, 16.0, 1.4], fov: 58 },
  park:    { name: 'Park H1 kõrval', pos: [-12.4, 1.4, 1.8], look: [-4.5, 20.0, 3.0], fov: 60 },
  pargiNurk: { name: 'Park ja E2 ristmikult', pos: [-12.4, 2.6, 1.6], look: [2.0, 22.0, 2.4], fov: 64 },
  h2Kulg:  { name: 'H2 E1 poolt', pos: [9.6, -3.2, 1.7], look: [-7.0, -9.0, 6.0], fov: 56 },
  h2Esiväljak: { name: 'H2: esiväljak', pos: [...h2Plaan(15.5, 7.4), 1.6], look: [...h2Plaan(15.0, 0.0), 5.5], fov: 60 },
  automaadid: { name: 'Joogiautomaadid', pos: [-17.4, 0.3, 1.55], look: [-19.5, -4.0, 1.0], fov: 50 },
  top:     { name: 'Pealtvaade', ortho: true, center: [-6.0, 4.0], poolKorgus: 34 },
};

export const TAHISED = [
  { id: 'S', text: 'S — algus', at: [-33, 0.2] },
  { id: 'J', text: 'J — ristmik', at: [-3.2, 0.5] },
  { id: 'H1', text: 'H1 — hoone 1 (6 korrust)', at: [-20.3, 20.0] },
  { id: 'H2', text: 'H2 — hoone 2 (7 korrust)', at: h2Plaan(10.0, -6.0) },
  { id: 'P', text: 'P — väikepark, 6 puud', at: [-8.6, 14.6] },
  { id: 'E1', text: 'E1 — tänava jätk kagusse', at: [20.6, -10.0] },
  { id: 'E2', text: 'E2 — põhjapoolne haru', at: [4.7, 25.0] },
  { id: 'V', text: 'joogiautomaadid', at: h2Plaan(2.1, 0.6), cls: 'dim' },
  { id: 'F', text: 'aed ja suured puud (templit post modelleeritud)', at: [15.5, 3.0], cls: 'dim' },
];

// Õhustik: pilvine hiline hämarik, külm hallikasroheline kaugus, soojad aknad ja laternad.
export const ILME = {
  uduVarv: 0x77837f,
  uduTihedus: 0.0165,
  taevaLagi: 0x39434b,
  silmapiir: 0x77837f,
  taevaKuma: 0x8f8a7c,
  taevavalgus: 0x9aa7b1,
  maavalgus: 0x48423a,
  hajusTugevus: 1.35,
  paikeVarv: 0xb7c1cc,
  paikeTugevus: 0.55,
  paikeSuund: [-0.62, 0.42, 0.66],   // Valgusallika suund (X, kõrgus, plaani Y): lääne-loode poolt.
  exposure: 1.0,
  retroPikslisuhe: 0.66,
};

// Kvaliteeditasemed: sisemise lahutusvõime kordaja, MSAA ja varjukaardi suurus.
// Kõrgel tasemel uuendatakse tegelase päikesevarju igal kaadril.
export const KVALITEET = {
  low:    { name: 'Madal', scale: 0.5, retroMootkava: 0.5, samples: 0, shadow: 1024, liikuvVari: false },
  medium: { name: 'Keskmine', scale: 0.8, retroMootkava: 0.6, samples: 2, shadow: 2048, liikuvVari: false },
  high:   { name: 'Kõrge', scale: 1.0, retroMootkava: 0.66, samples: 4, shadow: 2048, liikuvVari: true },
};
