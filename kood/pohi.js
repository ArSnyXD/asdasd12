// Rakenduse algus: stseeni koostamine, tegelane, juhtimine ja kolmanda isiku kaamera.
// Algus- ja pausimenüü, seaded ning kokkupandav püsivaadete ja pealtvaate paneel.
// Aadressiparameetrid:
// view=<vaade> avab otse püsivaate.
// retro=0|1, fog=0|1 lülitavad retrofiltrit ja udu; ui=0 peidab kasutajaliidese.
// q=low|medium|high määrab kvaliteedi, vaikimisi keskmine.
// maxdt=<s> piirab kaadri ajasammu; vaikimisi 0,1 s, lubatud 0,02–0,5 s.
// manual=1 võimaldab kontrollides kaadreid käsitsi sammuda.
import * as THREE from 'three';
import { VAATED, ILME, KVALITEET } from './seaded.js';
import { Materjaliruhmad, V3 } from './abifunktsioonid.js';
import { laadiTekstuurid, looMaterjalid } from './varad.js';
import { looMaapind } from './maapind.js';
import { looH1, looH2, looN1, looE1Louna } from './hooned.js';
import { Kokkuporkemaailm } from './maailm.js';
import { looTaust } from './taust.js';
import { looTaimestik } from './taimestik.js';
import { looTanav } from './tanav.js';
import { looRenderdaja, looTaevas, looValgustid, looJareltootlus } from './renderdus.js';
import { VaadeteHaldur } from './vaated.js';
import { Tegelane } from './tegelane.js';
import { Sisend, Mangija } from './mangija.js';

const Q = new URLSearchParams(location.search);
const state = {
  view: VAATED[Q.get('view')] ? Q.get('view') : null,
  retro: Q.get('retro') !== '0',
  fog: Q.get('fog') !== '0',
  ui: Q.get('ui') !== '0',
  quality: KVALITEET[Q.get('q')] ? Q.get('q') : 'medium',
};
const SUURIM_AJASAMM = Math.min(0.5, Math.max(0.02, Number(Q.get('maxdt')) || 0.1));
const KASITSI = Q.get('manual') === '1';

// Lamedad ja helendavad pinnad ei heida varje.
const VARJUTA = ['asfalt', 'teeKulumine', 'varv', 'peatu', 'kaevuluuk', 'tellis', 'pargiplaat', 'muld', 'muru',
  'windows', 'fuajee', 'sisemus', 'klaaspiire', 'lambiKlaas', 'led', 'kaugeLehestik', 'automaadid', 'nimesilt', 'ruloo',
  'poesilt', 'suletudSilt', 'suletudSiltTaga', 'merevaigulamp'];
const VARJUD = { default: { cast: true, receive: true }, juhe: { cast: false, receive: false },
  suurpuuLehed: { cast: true, receive: false }, pargipuuLehed: { cast: true, receive: false } };
for (const k of VARJUTA) VARJUD[k] = { cast: false, receive: !['lambiKlaas', 'led', 'kaugeLehestik', 'merevaigulamp'].includes(k) };

const $ = (id) => document.getElementById(id);

function teataViga(e) {
  console.error(e);
  window.__VIGA = String((e && e.stack) || e);
  const box = $('error');
  box.textContent = 'Stseeni käivitamine ebaõnnestus: ' + ((e && e.message) || e);
  box.style.display = 'block';
  $('loading').style.display = 'none';
}

async function kaivita() {
  document.body.classList.toggle('noui', !state.ui);
  const renderdaja = looRenderdaja($('app'));
  renderdaja.info.autoReset = false;
  const stseen = new THREE.Scene();
  const uduVarv = new THREE.Color(ILME.uduVarv);
  const fog = new THREE.FogExp2(ILME.uduVarv, ILME.uduTihedus);
  stseen.fog = fog;
  stseen.background = uduVarv;

  const T = await laadiTekstuurid(renderdaja, (f) => { $('bar').style.width = Math.round(f * 100) + '%'; });
  const M = looMaterjalid(T);
  const B = new Materjaliruhmad();
  const ctx = { col: new Kokkuporkemaailm(), lights: [], laed: [] };
  looMaapind(B, ctx);
  looH1(B, ctx);
  looH2(B, ctx);
  looN1(B, ctx);
  looE1Louna(B, ctx);
  looTaust(B, ctx);
  looTaimestik(B, ctx);
  const lamps = looTanav(B, ctx);
  B.build(M, stseen, VARJUD);
  window.__KONTEKST = ctx;
  const taevas = looTaevas(stseen);
  const { paike } = looValgustid(stseen);
  for (const L of lamps) {
    const p = new THREE.PointLight(L.color, L.intensity, L.distance, 2);
    p.position.copy(V3(L.X, L.Y, L.h));
    stseen.add(p);
  }

  // Tegelane, juhtimine ja jalutamiskaamera.
  const tegelane = new Tegelane();
  stseen.add(tegelane.root);
  const mangija = new Mangija(ctx, tegelane);
  const sisend = new Sisend(renderdaja.domElement);

  const gl = renderdaja.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const tarkvaraline = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);

  const vm = new VaadeteHaldur($('overlay'));
  vm.seaTeekonnad(ctx);
  let C = looJareltootlus(renderdaja, stseen, mangija.cam, KVALITEET[state.quality].samples);
  const topBg = new THREE.Color(0x24282a);
  const size = new THREE.Vector2();
  let mode = 'menu';                 // Menüü, jalutamine, paus või püsivaade.
  let fps = 0, kaadriteArv = 0, kaadriteAlgus = 0, kaadriAeg = 0;

  const onPealtvaade = () => mode === 'view' && vm.onPealtvaade;
  const aktiivneKaamera = () => (mode === 'view' ? vm.camera : mangija.cam);

  const render = () => {
    const cam = aktiivneKaamera();
    C.renderPass.camera = cam;
    taevas.position.copy(cam.position);
    renderdaja.info.reset();
    const t0 = performance.now();
    C.composer.render();
    const ms = performance.now() - t0;
    renderdaja.getDrawingBufferSize(size);
    window.__INFO = {
      mode, view: mode === 'view' ? state.view : 'walk', quality: state.quality, retro: C.retro.enabled, fog: !!stseen.fog,
      css: [innerWidth, innerHeight], internal: [size.x, size.y], pixelRatio: +renderdaja.getPixelRatio().toFixed(3),
      samples: C.samples, renderMs: Math.round(ms), fps: +fps.toFixed(2), kaadriAeg: Math.round(kaadriAeg),
      triangles: renderdaja.info.render.triangles, calls: renderdaja.info.render.calls, gpu, tarkvaraline, three: THREE.REVISION,
    };
    const label = mode === 'view' ? VAATED[state.view].name : 'Jalutamiskaamera';
    $('info').textContent = `${label} · sisemine lahutusvõime ${size.x}×${size.y} · ${(renderdaja.info.render.triangles / 1000).toFixed(0)} tuhat kolmnurka · ` +
      `${renderdaja.info.render.calls} joonistamiskutset · ${tarkvaraline ? 'tarkvaraline renderdus' : 'GPU'}`;
  };

  const hud = () => {
    const q = KVALITEET[state.quality];
    $('fps').textContent = `${fps ? fps.toFixed(fps < 10 ? 1 : 0) : '—'} kaadrit/s · kvaliteet: ${q.name.toLowerCase()} · ` +
      `${size.x}×${size.y}${tarkvaraline ? ' · tarkvaraline renderdus' : ''}`;
  };

  // Pikslitihedus on kõrglahutusega ekraanil kuni 1,5; retrorežiim kasutab väiksemat
  // lahutusvõimet ja silumiseta suurendust. Pealtvaade jääb alati teravaks.
  const rakendaSuurus = () => {
    const q = KVALITEET[state.quality];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pr = onPealtvaade() ? dpr : C.retro.enabled ? q.retroMootkava : dpr * q.scale;
    renderdaja.setPixelRatio(pr);
    renderdaja.setSize(innerWidth, innerHeight);
    mangija.cam.aspect = innerWidth / innerHeight;
    mangija.cam.updateProjectionMatrix();
    C.resize();
  };

  const rakendaIlme = () => {
    const top = onPealtvaade();
    stseen.fog = state.fog && !top ? fog : null;
    stseen.background = top ? topBg : uduVarv;
    taevas.visible = !top;
    renderdaja.toneMappingExposure = top ? 1.8 : ILME.exposure;
    C.retro.enabled = state.retro && !top;
    renderdaja.domElement.classList.toggle('pixelated', C.retro.enabled);
    rakendaSuurus();
    if (mode !== 'view') $('overlay').style.display = 'none';
  };

  const rakendaKvaliteet = () => {
    const q = KVALITEET[state.quality];
    if (paike.shadow.mapSize.x !== q.shadow) {
      paike.shadow.mapSize.set(q.shadow, q.shadow);
      if (paike.shadow.map) { paike.shadow.map.dispose(); paike.shadow.map = null; }
    }
    tegelane.seaVarjud(q.liikuvVari);     // Dünaamilise varju asemel kasutatakse vajadusel jalgealust varjulaiku.
    renderdaja.shadowMap.needsUpdate = true;      // Arvuta varjukaart uuesti ja eemalda tegelase varasem vari.
    if (C.samples !== q.samples) {
      const old = C;
      C = looJareltootlus(renderdaja, stseen, aktiivneKaamera(), q.samples);
      old.dispose();
    }
    rakendaIlme();
  };

  const naitaMenuud = (kind) => {
    $('menu').classList.toggle('show', !!kind);
    if (!kind) return;
    const p = kind === 'pause';
    $('mtitle').textContent = p ? 'Paus' : 'Tokyo udune tänav';
    $('msub').textContent = p ? 'Jalutamine on peatatud; hiir on vabastatud.' : 'Udune tänav hämarikus · jalutuskäik kolmanda isiku vaates';
    $('start').textContent = p ? 'Jätka' : 'Alusta jalutuskäiku';
    $('toStart').style.display = p ? '' : 'none';
  };
  const seaReziim = (m) => { mode = m; document.body.dataset.mode = m; };
  const uuendaAadress = () => {
    const u = new URL(location.href);
    if (mode === 'view') u.searchParams.set('view', state.view); else u.searchParams.delete('view');
    history.replaceState(null, '', u);
  };

  // Jalutamistsükkel piirab ajasammu pärast pausi, peidetud vahelehte või pikka kaadrit.
  // Tegelane ei hüppa edasi; kaadrisagedus arvutatakse järjestikuste kaadrite järgi.
  let raf = 0, last = 0;
  const jalutamiseKaader = (dt) => {
    mangija.frame(dt, sisend, true);
    if (KVALITEET[state.quality].liikuvVari) renderdaja.shadowMap.needsUpdate = true;
    render();
  };
  const loop = (now) => {
    raf = 0;
    if (mode !== 'walk') return;
    const dt = last ? Math.min(SUURIM_AJASAMM, Math.max(0, (now - last) / 1000)) : 0;
    if (last) kaadriAeg = now - last;
    last = now;
    try { jalutamiseKaader(dt); } catch (e) { teataViga(e); return; }
    if (!kaadriteAlgus) { kaadriteAlgus = now; kaadriteArv = 0; }
    else {
      kaadriteArv++;
      if (now - kaadriteAlgus >= 1000) { fps = (kaadriteArv * 1000) / (now - kaadriteAlgus); kaadriteAlgus = now; kaadriteArv = 0; hud(); }
    }
    raf = requestAnimationFrame(loop);
  };
  const kaivitaTsukkel = () => { last = 0; kaadriteAlgus = 0; if (!raf && !KASITSI) raf = requestAnimationFrame(loop); };
  const peataTsukkel = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const alustaJalutamist = () => {
    peataTsukkel();
    sisend.clear();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    seaReziim('walk');
    naitaMenuud(null);
    rakendaIlme();
    sisend.lock();          // Hiir hõivatakse klõpsukäsitlejas; hõivamiseta saab vaadata lohistades.
    render();
    hud();
    kaivitaTsukkel();
    uuendaAadress();
  };
  const avaMenuu = (kind) => {
    peataTsukkel();
    sisend.clear();
    sisend.unlock();
    seaReziim(kind === 'pause' ? 'pause' : 'menu');
    naitaMenuud(kind);
    rakendaIlme();
    render();
    uuendaAadress();
  };
  const pause = () => { if (mode === 'walk') avaMenuu('pause'); };

  const seaVaade = (name) => {
    if (!VAATED[name]) return;
    peataTsukkel();
    sisend.clear();
    sisend.unlock();
    state.view = name;
    seaReziim('view');
    naitaMenuud(null);
    vm.set(name, innerWidth / innerHeight);
    rakendaIlme();
    render();
    vm.joonistaPealiskiht(innerWidth, innerHeight, mangija);
    for (const b of document.querySelectorAll('#views button')) b.classList.toggle('on', b.dataset.view === name);
    uuendaAadress();
  };

  // Juhtpaneel ja menüü.
  const box = $('views');
  Object.entries(VAATED).forEach(([k, v], i) => {
    const b = document.createElement('button');
    b.dataset.view = k;
    b.textContent = (i < 9 ? `${i + 1} · ` : '') + v.name;
    b.onclick = () => seaVaade(k);
    box.appendChild(b);
  });
  $('start').onclick = alustaJalutamist;
  $('toStart').onclick = () => { mangija.reset(); alustaJalutamist(); };
  $('tagakulg').onclick = alustaJalutamist;
  $('ptoggle').onclick = () => document.body.classList.toggle('pcollapsed');
  if (innerWidth < 800) document.body.classList.add('pcollapsed');   // Kitsal ekraanil on paneel algul suletud.
  $('quality').value = state.quality;
  $('quality').onchange = (e) => { state.quality = e.target.value; rakendaKvaliteet(); render(); hud(); };
  $('retro').checked = state.retro;
  $('fog').checked = state.fog;
  $('retro').onchange = (e) => { state.retro = e.target.checked; rakendaIlme(); render(); };
  $('fog').onchange = (e) => { state.fog = e.target.checked; rakendaIlme(); render(); };

  addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (mode === 'walk') pause();
      else if (mode === 'view') avaMenuu('pause');
      return;
    }
    if (mode === 'walk' || e.repeat) return;            // Jalutades numbriklahvid vaateid ei vaheta.
    if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) return;
    if (/^[1-9]$/.test(e.key)) { const k = Object.keys(VAATED)[Number(e.key) - 1]; if (k) seaVaade(k); }
  });
  sisend.hoiveMuutus = (locked) => { if (!locked && mode === 'walk') pause(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  renderdaja.domElement.addEventListener('click', () => { if (mode === 'walk' && !sisend.locked) sisend.lock(); });
  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (mode === 'view') vm.set(state.view, innerWidth / innerHeight);
      rakendaIlme();
      render();
      if (mode === 'view') vm.joonistaPealiskiht(innerWidth, innerHeight, mangija);
      hud();
    }, 150);
  });

  // Automaatkontrollide liides: oleku lugemine ja käsitsi sammumine.
  // Sisendit kontrollitakse tegelike brauseri klaviatuuri- ja hiiresündmustega.
  window.__MANG = {
    state: () => ({ mode, ...mangija.state(), locked: sisend.locked, keys: [...sisend.keys], fps: +fps.toFixed(2),
      tegelaneNahtav: tegelane.root.visible,
      kaadriAeg: Math.round(kaadriAeg), quality: state.quality, maxDt: SUURIM_AJASAMM }),
    step: (dt = 1 / 30, n = 1, draw = true) => {
      for (let i = 0; i < n; i++) mangija.frame(dt, sisend, mode === 'walk');
      if (draw) {
        if (KVALITEET[state.quality].liikuvVari) renderdaja.shadowMap.needsUpdate = true;
        render();
      }
      return mangija.state();
    },
    reset: (x, y, yaw, draw = false) => { mangija.reset(x, y, yaw); if (draw) render(); return mangija.state(); },
    pealtvaatePiirid: () => vm.box,
    pose: (o) => { Object.assign(mangija, o); mangija.frame(0, null, false); render(); return mangija.state(); },
    render: () => { render(); return window.__INFO; },
    // Kaamera vaba paigutus lähikontrolliks: [X, Y, kõrgus] plaanikoordinaatides.
    look: (pos, at) => { mangija.cam.position.set(pos[0], pos[2], -pos[1]); mangija.cam.lookAt(at[0], at[2], -at[1]); render(); return mangija.state(); },
  };

  rakendaKvaliteet();
  if (state.view) seaVaade(state.view);
  else avaMenuu('start');
  $('loading').style.display = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__VALMIS = true; }));
}

kaivita().catch(teataViga);
