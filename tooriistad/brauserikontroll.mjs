// Valikuline brauserikontroll. Eeldab käivat serverit, Playwrighti ja Chromiumi.
import assert from 'node:assert/strict';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { throw new Error('Brauserikontroll vajab arenduskeskkonda paigaldatud Playwrighti. Mäng ise seda ei vaja.'); }
const aadress = process.env.MANGU_AADRESS || 'http://127.0.0.1:8000/';
const valikud = { headless: true };
if (process.env.BRAUSERI_FAIL) valikud.executablePath = process.env.BRAUSERI_FAIL;
const brauser = await chromium.launch(valikud);
const vead = [], puuduvad = [];
try {
  const leht = await brauser.newPage({ viewport: { width: 1440, height: 900 } });
  leht.on('pageerror', viga => vead.push(String(viga)));
  leht.on('console', teade => { if (teade.type() === 'error') vead.push(teade.text()); });
  leht.on('response', vastus => { if (vastus.status() >= 400) puuduvad.push(vastus.url()); });
  const url = new URL(aadress); url.searchParams.set('manual', '1');
  await leht.goto(url.href);
  await leht.waitForFunction(() => window.__VALMIS || window.__VIGA, null, { timeout: 60000 });
  assert.equal(await leht.evaluate(() => window.__VIGA), undefined, 'Mängu käivitamine ebaõnnestus.');
  assert.equal(await leht.locator('html').getAttribute('lang'), 'et');
  await leht.getByRole('button', { name: 'Alusta jalutuskäiku', exact: true }).click();
  const algus = await leht.evaluate(() => window.__MANG.state());
  await leht.keyboard.down('KeyW');
  await leht.evaluate(() => window.__MANG.step(1 / 60, 120));
  await leht.keyboard.up('KeyW');
  const kond = await leht.evaluate(() => window.__MANG.state());
  assert.ok(Math.hypot(kond.x - algus.x, kond.y - algus.y) > 2, 'Kõndimine ei toiminud.');
  await leht.keyboard.down('KeyW'); await leht.keyboard.down('ShiftLeft');
  await leht.evaluate(() => window.__MANG.step(1 / 60, 120));
  await leht.keyboard.up('KeyW'); await leht.keyboard.up('ShiftLeft');
  const jooks = await leht.evaluate(() => window.__MANG.state());
  assert.ok(Math.hypot(jooks.x - kond.x, jooks.y - kond.y) > 4, 'Jooksmine ei toiminud.');
  await leht.keyboard.press('Escape');
  assert.equal(await leht.locator('#mtitle').innerText(), 'Paus');
  for (const kvaliteet of ['low', 'medium', 'high']) await leht.locator('#quality').selectOption(kvaliteet);
  await leht.locator('#retro').uncheck(); await leht.locator('#fog').uncheck();
  const nupud = leht.locator('#views button');
  const vaateid = await nupud.count();
  for (let i = 0; i < vaateid; i++) await nupud.nth(i).click();
  assert.ok((await leht.locator('#overlay').textContent()).includes('Põhi'), 'Pealtvaate tähised puuduvad.');
  await leht.keyboard.press('Escape');
  await leht.locator('#retro').check(); await leht.locator('#fog').check();
  await leht.getByRole('button', { name: 'Tagasi algusesse', exact: true }).click();
  assert.equal(await leht.locator('body').getAttribute('data-mode'), 'walk');
  assert.deepEqual(vead, [], 'Brauseris esines vigu.');
  assert.deepEqual(puuduvad, [], 'Osa faile puudub.');
  console.log(JSON.stringify({ tulemus: 'Läbitud', vaateid, puuduvad, vead,
    piirang: 'Automaatkontroll ei asenda kuue arhitektuuriparanduse visuaalset võrdlust.' }, null, 2));
} finally { await brauser.close(); }
