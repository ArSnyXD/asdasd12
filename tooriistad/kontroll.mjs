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
const tulemus = {
  stseen: loenda(stseen), tegelane: loenda(tegelane.root),
  takistusi: kontekst.col.items.length, konnimiseNihe: +nihe.toFixed(3),
  tulemus: 'Läbitud',
  piirang: 'See kontroll ei tõenda visuaalset vastavust ega graafikaprotsessori jõudlust.',
};
console.log(JSON.stringify(tulemus, null, 2));
