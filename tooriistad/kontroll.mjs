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
const { H1, H2, PARK, PLAAN } = await import('../kood/seaded.js');
const nelinurgad_ = nelinurgad(ruhmad);
const kattuvaidPindu = Object.fromEntries(['H1', 'H2', 'koik'].map((a) => [a, kattuvused(nelinurgad_, ala(a)).length]));
assert.deepEqual(kattuvaidPindu, { H1: 0, H2: 0, koik: 0 }, 'Leiti kattuvaid samatasapinnalisi pindu (vilkumine).');
const col = kontekst.col;
assert.equal(col.overlaps(-21.5, H1.Y0 + 0.5, 0.27).length, 0, 'H1 vasak süvis peab olema avatud.');
assert.ok(col.overlaps(-21.5, H1.Y0 + 1.2, 0.27).length > 0, 'H1 süvise tagasein peab olema läbimatu.');
assert.equal(col.overlaps(-11.0, PARK.Y0 + 1.6, 0.27).length, 0, 'Pargi tänavapoolne sissepääs peab olema vaba.');
assert.ok(col.overlaps(H1.PASS.X0 - 0.15, H1.Y0 + 0.5, 0.27).length > 0, 'H1 süvise ja läbipääsu vaheline post peab olema läbimatu.');
assert.equal(col.overlaps((H1.PASS.X0 + H1.PASS.X1) / 2, H1.Y0 + 6, 0.27).length, 0, 'H1 läbipääs peab olema avatud.');
const pargiLaius = (Y) => kontekst.pargiIdaX(Y) - PARK.X0;
const pargiPikkus = PARK.Y1 - PARK.Y0, lounaLaius = pargiLaius(PARK.Y0 + 2.5), pohjaLaius = pargiLaius(PARK.Y1 - 0.5);
assert.ok(lounaLaius < 9 && pohjaLaius > lounaLaius + 5, 'Park peab olema kiil: kitsas tänava poolt, lai põhjas.');
assert.ok(pargiPikkus / ((lounaLaius + pohjaLaius) / 2) >= 1.5, 'Park peab jääma piklikuks.');
for (const [x, y] of PARK.trees) assert.ok(x > PARK.X0 + 1 && x < kontekst.pargiIdaX(y) - 1.5 && y > PARK.Y0 + 1 && y < PARK.Y1 - 1, 'Pargipuu on väljaspool parki.');
assert.equal(PARK.trees.length, 6, 'Pargis peab olema kuus puud.');
// E2 kulgeb pargi ääres: pargi idaserva ja E2 läänepoolse sõidutee serva vahel on ainult tellisriba,
// mitte asfaldiväli; E2 suund pargi kohal on satelliidivaate järgi 20–30° põhjast itta.
const { on: teljel, project: projitseeri } = await import('../kood/geomeetria.js');
const e2 = kontekst.e2c, hwF = PLAAN.e2Tee.width / 2;
for (let y = 7; y <= 22; y += 1) {
  const sY = projitseeri(e2, [kontekst.pargiIdaX(y), y]).s, serv = teljel(e2, sY, hwF);
  const vahe = Math.hypot(serv[0] - kontekst.pargiIdaX(y), serv[1] - y);
  assert.ok(vahe < PLAAN.pargiaareRiba + 0.45, `Pargi ja E2 vahel on liiga lai riba (Y = ${y}: ${vahe.toFixed(2)} m).`);
  const keskel = teljel(e2, sY, hwF + PLAAN.pargiaareRiba / 2);
  assert.ok(Math.abs(kontekst.korgused.at(keskel[0], keskel[1]) - 0.03) < 0.005, 'Pargi ja E2 vahel peab olema tellisriba.');
}
const e2Nurk = Math.atan2(teljel(e2, 18)[0] - teljel(e2, 6)[0], teljel(e2, 18)[1] - teljel(e2, 6)[1]) * 180 / Math.PI;
assert.ok(e2Nurk > 20 && e2Nurk < 30, `E2 suund pargi kohal on ootamatu (${e2Nurk.toFixed(1)}°).`);
const sugavused = kontekst.h2.bays.map((b) => b.y);
assert.ok(Math.max(...sugavused) - Math.min(...sugavused) >= 1.0 && new Set(sugavused).size >= 2, 'H2 fassaad peab astuma sügavusse vähemalt 1 m.');
assert.ok(kontekst.h2.bays.filter((b) => b.rodud).length >= 2, 'H2 peab säilitama rõdudega fassaadiosad.');
assert.equal(H2.NF + 1, 7, 'H2 on seitsmekorruseline.');
// H2 esimese korruse aknad peavad olema arkaadist tervikuna nähtavad: kiired akna nurkadesse ja keskele
// otse eest ning mõlemalt küljelt peavad esimesena tabama akent, mitte otsaseina või muud eendit.
{
  const h2 = kontekst.h2, kiir = new T.Raycaster();
  const kohal = (x, y, h) => { const p = h2.F.plaanile(x, y); return new T.Vector3(p[0], h, -p[1]); };
  stseen.updateMatrixWorld(true);
  const varjatud = [];
  for (const [c, w] of h2.aknad1) for (const vx of [-1.8, 0, 1.8]) {
    for (const [dx, dh] of [[-w / 2 + 0.12, 1.15], [w / 2 - 0.12, 1.15], [-w / 2 + 0.12, 1.95], [w / 2 - 0.12, 1.95], [0, 1.55]]) {
      const o = kohal(c + vx, h2.gy + 2.2, 1.5), t = kohal(c + dx, h2.gy, dh), suund = t.clone().sub(o);
      kiir.set(o, suund.clone().normalize()); kiir.far = suund.length() + 0.05;
      const tabamus = kiir.intersectObjects(stseen.children, false)[0];
      if (!tabamus || tabamus.object.name !== 'windows') varjatud.push({ aken: c, vaade: vx, punkt: [dx, dh], tabas: tabamus && tabamus.object.name });
    }
  }
  assert.deepEqual(varjatud, [], 'H2 esimese korruse aken on osaliselt varjatud.');
  for (const [x0, x1, ots] of h2.uimed) if (!ots) {
    const p = h2.F.plaanile((x0 + x1) / 2, h2.gy + 1.5);
    assert.equal(col.overlaps(p[0], p[1], 0.27).length, 0, 'Arkaadi kohale tõstetud otsaseinal ei tohi maapinnal kokkupõrkekeha olla.');
  }
}
assert.equal(H1.NF + 1, 6, 'H1 on kuuekorruseline.');
const aiaKorgus = Math.max(...col.items.filter((it) => it.tag === 'aed').map((it) => it.h));
assert.ok(aiaKorgus >= 1.9, 'Aia kokkupõrkekeha peab ulatuma kivisokli ja balustraadi kõrguseni.');

const tulemus = {
  stseen: loenda(stseen), tegelane: loenda(tegelane.root),
  takistusi: kontekst.col.items.length, konnimiseNihe: +nihe.toFixed(3),
  kattuvaidPindu, pargiMootmed: { lounaots: +lounaLaius.toFixed(1), pohjaots: +pohjaLaius.toFixed(1), pikkus: +pargiPikkus.toFixed(1) },
  e2Suund: +e2Nurk.toFixed(1),
  h2Sugavused: sugavused, aiaKorgus: +aiaKorgus.toFixed(2),
  tulemus: 'Läbitud',
  piirang: 'See kontroll ei tõenda visuaalset vastavust ega graafikaprotsessori jõudlust.',
};
console.log(JSON.stringify(tulemus, null, 2));
