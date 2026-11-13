// Valikuline vaatekontroll: salvestab parandusrühmade vastuvõtuvaated, tee ja jaapanikeelsete siltide vaated
// ning tegelase poosid kuvatõmmistena kausta kontrollivaljund/. Eeldab käivat serverit (npm start), Playwrighti ja Chromiumi
// (BRAUSERI_FAIL võib osutada Chrome'i käivitusfailile). Pildid ei ole osa repositooriumist.
// Kasutus: node tooriistad/vaatekontroll.mjs [kaust]   lisavalikud: RETRO=0|1 FOG=0|1 MANGU_AADRESS=...
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { throw new Error('Vaatekontroll vajab arenduskeskkonda paigaldatud Playwrighti. Mäng ise seda ei vaja.'); }

const aadress = process.env.MANGU_AADRESS || 'http://127.0.0.1:8000/';
const kaust = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'kontrollivaljund');
fs.mkdirSync(kaust, { recursive: true });
const valikud = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
if (process.env.BRAUSERI_FAIL) valikud.executablePath = process.env.BRAUSERI_FAIL;
if (process.getuid && process.getuid() === 0) valikud.args.push('--no-sandbox');

// Vaba kaamera vaated: kaamera [X, Y, kõrgus] ja sihtpunkt plaanikoordinaatides.
const VAATED = {
  h1_sissepaas: [[-17.0, 2.2, 1.5], [-18.6, 10.0, 2.2]],          // Süvis, post ja läbipääs eest.
  h1_sissepaas_nurgast: [[-14.9, 4.2, 1.4], [-18.0, 9.6, 1.6]],   // Läbipääsu parem post ja pargipoolne sein.
  h1_suvis_eest: [[-23.5, 1.0, 1.7], [-22.0, 9.0, 1.6]],          // Vasak madal süvis eest.
  h1_rodud_alt: [[-19.0, 3.6, 0.6], [-20.3, 9.0, 7.5]],           // Rõdude alapinnad madalalt.
  h1_rodud_vasakult: [[-25.5, 1.5, 1.2], [-20.0, 9.0, 8.0]],
  h1_rodud_paremalt: [[-12.5, 1.0, 1.0], [-20.3, 9.0, 8.0]],
  park_tanavalt: [[-9.0, -1.5, 1.8], [-9.5, 14.0, 2.0]],
  park_nurk: [[-3.0, 0.5, 1.7], [-11.0, 12.0, 2.0]],
  h2_tanavalt: [[-14.0, 6.0, 1.7], [-10.0, -8.0, 7.0]],
  h2_laanest: [[-24.0, 1.5, 1.7], [-8.0, -9.0, 7.0]],
  h2_idast: [[8.0, -2.5, 1.7], [-6.0, -8.0, 7.0]],
  aed_nurk: [[-4.0, -3.5, 1.5], [5.0, 2.0, 0.9]],
  aed_lahedalt: [[1.2, -1.6, 0.9], [5.2, 1.6, 0.6]],
  automaadid: [[-17.4, 0.3, 1.55], [-19.5, -4.0, 1.0]],
  nimesilt: [[-22.15, 6.9, 1.6], [-22.15, 9.6, 1.6]],
};
// Mängu geomeetriast arvutatud vaated (käivitatakse lehel): E2 ja aia nurk, peatumiskiri ja -märk,
// tõkete sildid, automaatide küljed, poesilt ja H2 esimese korruse aknad.
async function arvutatudVaated() {
  const G = await import(new URL('kood/geomeetria.js', document.baseURI).href);
  const { PLAAN } = await import(new URL('kood/seaded.js', document.baseURI).href);
  const c = window.__KONTEKST, F = c.h2.F, gy = c.h2.gy;
  const p = (pl, s, o, h) => [...G.on(pl, s, o), h];
  const h2 = (x, y, h) => [...F.plaanile(x, y), h];
  const mark = G.on(c.aiaJoon, c.cornerS - 3.1, -1.2);   // Peatumismärgi asukoht nagu tanav.js-is.
  return {
    aed_e2_poolt: [p(c.e2c, 9.0, -2.9, 1.2), p(c.aiaJoon, c.cornerS, 0, 0.7)],
    e2_peatumiskiri: [p(c.e2c, 13.0, -0.6, 1.7), p(c.e2c, 6.5, 0, 0.3)],
    e2_peatumiskiri_kaugelt: [p(c.e2c, 19.0, -0.5, 1.7), p(c.e2c, 6.5, 0, 0.6)],
    e2_peatumismark: [p(c.e2c, 11.0, -0.4, 1.9), [...mark, 2.3]],
    e2_toke: [p(c.e2c, PLAAN.tokeE2 - 5.5, 0, 1.6), p(c.e2c, PLAAN.tokeE2, 0, 1.2)],
    e1_toke: [p(c.e1c, PLAAN.tokeE1 - 5.0, 0, 1.6), p(c.e1c, PLAAN.tokeE1, 0, 1.2)],
    automaat_vasak: [h2(0.45, gy + 2.0, 1.45), h2(1.4, gy + 0.5, 1.1)],
    automaat_parem: [h2(4.9, gy + 2.3, 1.45), h2(2.9, gy + 0.6, 1.1)],
    poesilt: [p(c.e1c, 19.2, 1.6, 1.6), p(c.e1c, 19.2, -4.4, 3.0)],
    h2_aken: [h2(10.4, gy + 7.0, 1.6), h2(10.4, gy, 1.5)],
    h2_aken_kulg: [h2(5.6, gy + 5.6, 1.6), h2(10.4, gy, 1.5)],
  };
}
// Püsivaated eraldi lehelaadimisega.
const PUSIVAATED = ['top', 'main', 'park', 'h2Kulg'];

const brauser = await chromium.launch(valikud);
const vead = [];
try {
  const leht = await brauser.newPage({ viewport: { width: 1280, height: 720 } });
  leht.on('pageerror', (v) => vead.push(String(v)));
  leht.on('console', (t) => { if (t.type() === 'error') vead.push(t.text()); });
  leht.on('response', (v) => { if (v.status() >= 400) vead.push('HTTP ' + v.status() + ' ' + v.url()); });
  const url = new URL(aadress);
  for (const [k, v] of Object.entries({ manual: '1', ui: '0', q: 'high', retro: process.env.RETRO ?? '0', fog: process.env.FOG ?? '1' })) url.searchParams.set(k, v);
  await leht.goto(url.href);
  await leht.waitForFunction(() => window.__VALMIS || window.__VIGA, null, { timeout: 120000 });
  if (await leht.evaluate(() => window.__VIGA)) throw new Error('Mängu käivitamine ebaõnnestus.');
  await leht.evaluate(() => document.getElementById('start').click());
  await leht.waitForTimeout(300);
  Object.assign(VAATED, await leht.evaluate(arvutatudVaated));
  for (const [nimi, [pos, siht]] of Object.entries(VAATED)) {
    // Tegelane viiakse pildist välja; vaba kaamera kasutab jalutamiskaamerat.
    await leht.evaluate(([p, a]) => { const m = window.__MANG; m.reset(-38, 0.5, 0, false); m.look(p, a); }, [pos, siht]);
    await leht.waitForTimeout(80);
    await leht.evaluate(([p, a]) => window.__MANG.look(p, a), [pos, siht]);
    await leht.screenshot({ path: path.join(kaust, nimi + '.png') });
  }
  // Tegelane seistes, kõndides ja joostes jalutamiskaameraga.
  const poos = async (nimi, klahvid, kaadreid) => {
    await leht.evaluate(() => window.__MANG.reset(-26.0, 0.55, 0, false));
    for (const k of klahvid) await leht.keyboard.down(k);
    await leht.evaluate((n) => window.__MANG.step(1 / 60, n, true), kaadreid);
    for (const k of klahvid) await leht.keyboard.up(k);
    await leht.screenshot({ path: path.join(kaust, nimi + '.png') });
  };
  await poos('tegelane_seisab', [], 1);
  await poos('tegelane_konnib', ['KeyW'], 70);
  await poos('tegelane_jookseb', ['KeyW', 'ShiftLeft'], 70);
  for (const v of PUSIVAATED) {
    url.searchParams.set('view', v);
    await leht.goto(url.href);
    await leht.waitForFunction(() => window.__VALMIS || window.__VIGA, null, { timeout: 120000 });
    await leht.waitForTimeout(200);
    await leht.evaluate(() => window.__MANG.render());
    await leht.screenshot({ path: path.join(kaust, 'pusivaade_' + v + '.png') });
  }
  console.log(JSON.stringify({ tulemus: vead.length ? 'Vigadega' : 'Läbitud', kaust, pilte: Object.keys(VAATED).length + 3 + PUSIVAATED.length, vead,
    piirang: 'Pildid tuleb inimesel üle vaadata; skript ei hinda visuaalset vastavust.' }, null, 2));
} finally { await brauser.close(); }
