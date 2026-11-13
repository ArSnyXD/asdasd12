// Stseeni, tegelase ja liikumise kontroll ilma graafikaprotsessorita.
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('./laadur.mjs', import.meta.url);
const T = await import('three');
const { Materjaliruhmad } = await import('../kood/abifunktsioonid.js');
const { Kokkuporkemaailm } = await import('../kood/maailm.js');
const { looMaterjalid } = await import('../kood/varad.js');
const { Tegelane } = await import('../kood/tegelane.js');
const { Mangija } = await import('../kood/mangija.js');
const kontekst = { col: new Kokkuporkemaailm(), lights: [], laed: [] };
const ruhmad = new Materjaliruhmad();
for (const [fail, nimed] of [
  ['maapind', ['looMaapind']], ['hooned', ['looH1', 'looH2', 'looN1', 'looE1Louna']],
  ['taust', ['looTaust']], ['taimestik', ['looTaimestik']], ['tanav', ['looTanav']],
]) {
  const moodul = await import('../kood/' + fail + '.js');
  for (const nimi of nimed) moodul[nimi](ruhmad, kontekst);
}
const tekstuurid = new Proxy({}, { get: (obj, nimi) => obj[nimi] ??= new T.Texture() });
const stseen = new T.Scene();
ruhmad.build(looMaterjalid(tekstuurid), stseen, {});
function loenda(juur) {
  let vorke = 0, kolmnurki = 0;
  juur.traverse(obj => {
    if (!obj.isMesh) return;
    vorke++;
    const g = obj.geometry;
    kolmnurki += (g.index ? g.index.count : g.attributes.position.count) / 3;
    for (const atribuut of Object.values(g.attributes)) {
      assert.ok([...atribuut.array].every(Number.isFinite), 'Geomeetrias on vigane arv.');
    }
    if (g.index) assert.ok([...g.index.array].every(i => i < g.attributes.position.count), 'Vigane tipuindeks.');
  });
  return { vorke, kolmnurki };
}
const tegelane = new Tegelane();
const mangija = new Mangija(kontekst, tegelane);
const algus = mangija.state();
const sisend = {
  loeHiir: () => [0, 0], loeRatas: () => 0,
  down: (...koodid) => koodid.includes('KeyW'),
};
for (let i = 0; i < 120; i++) mangija.frame(1 / 60, sisend, true);
const lopp = mangija.state();
const nihe = Math.hypot(lopp.x - algus.x, lopp.y - algus.y);
assert.ok(nihe > 2 && nihe < 3.2, 'Kõndimise kaugus on ootamatu.');
for (const kiirus of [0, 1.55, 3.3]) {
  for (let i = 0; i < 60; i++) tegelane.update(1 / 60, kiirus, kiirus > 2, 0);
  loenda(tegelane.root);
}

// Arhitektuuriparanduste proovipunktid: kattuvad pinnad, H1 süvis, pargi proportsioonid, H2 astmed ja aia sokkel.
const { nelinurgad, kattuvused, ala } = await import('./kattuvus.mjs');
const { H1, H2, PARK } = await import('../kood/seaded.js');
const nelinurgad_ = nelinurgad(ruhmad);
const kattuvaidPindu = Object.fromEntries(['H1', 'H2', 'koik'].map((a) => [a, kattuvused(nelinurgad_, ala(a)).length]));
assert.deepEqual(kattuvaidPindu, { H1: 0, H2: 0, koik: 0 }, 'Leiti kattuvaid samatasapinnalisi pindu (vilkumine).');
const col = kontekst.col;
assert.equal(col.overlaps(-21.5, H1.Y0 + 0.5, 0.27).length, 0, 'H1 vasak süvis peab olema avatud.');
assert.ok(col.overlaps(-21.5, H1.Y0 + 1.2, 0.27).length > 0, 'H1 süvise tagasein peab olema läbimatu.');
assert.equal(col.overlaps(-11.0, PARK.Y0 + 1.6, 0.27).length, 0, 'Pargi tänavapoolne sissepääs peab olema vaba.');
assert.ok(col.overlaps(H1.PASS.X0 - 0.15, H1.Y0 + 0.5, 0.27).length > 0, 'H1 süvise ja läbipääsu vaheline post peab olema läbimatu.');
assert.equal(col.overlaps((H1.PASS.X0 + H1.PASS.X1) / 2, H1.Y0 + 6, 0.27).length, 0, 'H1 läbipääs peab olema avatud.');
const pargiLaius = PARK.X1 - PARK.X0, pargiPikkus = PARK.Y1 - PARK.Y0;
assert.ok(pargiLaius <= 10 && pargiPikkus / pargiLaius >= 1.8, 'Park peab olema piklik (pikkus vähemalt 1,8 × laius).');
for (const [x, y] of PARK.trees) assert.ok(x > PARK.X0 + 1 && x < PARK.X1 - 1 && y > PARK.Y0 + 1 && y < PARK.Y1 - 1, 'Pargipuu on väljaspool parki.');
assert.equal(PARK.trees.length, 6, 'Pargis peab olema kuus puud.');
const sugavused = kontekst.h2.bays.map((b) => b.y);
assert.ok(Math.max(...sugavused) - Math.min(...sugavused) >= 1.0 && new Set(sugavused).size >= 2, 'H2 fassaad peab astuma sügavusse vähemalt 1 m.');
assert.ok(kontekst.h2.bays.filter((b) => b.rodud).length >= 2, 'H2 peab säilitama rõdudega fassaadiosad.');
assert.equal(H2.NF + 1, 7, 'H2 on seitsmekorruseline.');
assert.equal(H1.NF + 1, 6, 'H1 on kuuekorruseline.');
const aiaKorgus = Math.max(...col.items.filter((it) => it.tag === 'aed').map((it) => it.h));
assert.ok(aiaKorgus >= 1.9, 'Aia kokkupõrkekeha peab ulatuma kivisokli ja balustraadi kõrguseni.');

const tulemus = {
  stseen: loenda(stseen), tegelane: loenda(tegelane.root),
  takistusi: kontekst.col.items.length, konnimiseNihe: +nihe.toFixed(3),
  kattuvaidPindu, pargiMootmed: { laius: +pargiLaius.toFixed(1), pikkus: +pargiPikkus.toFixed(1) },
  h2Sugavused: sugavused, aiaKorgus: +aiaKorgus.toFixed(2),
  tulemus: 'Läbitud',
  piirang: 'See kontroll ei tõenda visuaalset vastavust ega graafikaprotsessori jõudlust.',
};
console.log(JSON.stringify(tulemus, null, 2));
