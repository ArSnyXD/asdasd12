// Kohalikud protseduurtekstuurid ja materjalid; pildid asuvad tekstuuride kaustas.
// Geomeetria UV-koordinaadid on meetrites; materjal määrab korduse ehk paani suuruse.
import * as THREE from 'three';

const FAILID = {
  asfalt: 'asfalt.jpg', teeKulumine: 'tee_kulumine.png', varv: 'varvijoon.png', peatu: 'peatu.png',
  tellis: 'tellis.jpg', pargiplaat: 'pargiplaat.jpg', graniit: 'graniit.jpg', betoon: 'betoon.jpg',
  h1: 'betoon_h1.jpg', h2: 'betoon_h2.jpg', beezPlaat: 'beez_plaat.jpg', mustus: 'mustus.png',
  win: 'aknaatlas.png', akenKuma: 'aknaatlase_kuma.png', glass: 'roduklaas.jpg',
  fuajee: 'fuajee.jpg', fuajeeKuma: 'fuajee_kuma.jpg', vore: 'vore.png', bg: 'taustafassaad.jpg', bgE: 'taustafassaadi_kuma.jpg',
  puukoor: 'puukoor.jpg', lehed: 'lehed.png', tihedadLehed: 'tihedad_lehed.jpg', hekk: 'hekk.jpg', muru: 'muru.jpg',
  muld: 'muld.jpg', kivimuuriPind: 'kivimuur.jpg', aiakivi: 'aiakivi.jpg', sokkelkivi: 'sokkelkivi.jpg', post: 'post.jpg',
  kaevuluuk: 'kaevuluuk.png', peatumismark: 'peatumismark.png', parkimiskeeld: 'parkimiskeeld.png',
  // Teise etapi tekstuurid.
  vaikePlaat: 'vaike_plaat.jpg', tumePlaat: 'tume_plaat.jpg', nimesilt: 'nimesilt.png', automaadid: 'automaadid.png',
  automaadiKuma: 'automaatide_kuma.png', toke: 'tokketriibud.png', suletudSilt: 'suletud_silt.png', ruloo: 'ruloo.jpg',
  poesilt: 'poesilt.png',
};
const ANDMETEKSTUURID = new Set(['mustus']);

export async function laadiTekstuurid(renderdaja, onProgress) {
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(4, renderdaja.capabilities.getMaxAnisotropy());
  const keys = Object.keys(FAILID), T = {};
  let done = 0;
  await Promise.all(keys.map(async (k) => {
    let t;
    try { t = await loader.loadAsync('./varad/tekstuurid/' + FAILID[k]); }
    catch (e) { throw new Error('Tekstuuri laadimine ebaõnnestus: ' + FAILID[k]); }
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.colorSpace = ANDMETEKSTUURID.has(k) ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    T[k] = t;
    done++;
    if (onProgress) onProgress(done / keys.length);
  }));
  T.mustus.channel = 1;            // Fassaadi määrdumiskaart kasutab atribuuti uv1.
  T.mustus.wrapS = T.mustus.wrapT = THREE.ClampToEdgeWrapping;
  return T;
}

// Tekstuuri koopia eraldi kordusega; GPU-pilt on ühine. Paani suurus tu × tv meetrit.
function rep(t, tu, tv = tu) {
  const c = t.clone();
  c.repeat.set(1 / tu, 1 / tv);
  c.needsUpdate = true;
  return c;
}

// Lehtede kahepoolsed pinnad kasutavad läbipaistvusläve. Tavaline varjutaja pööraks tagakülje normaali.
// Pööramine on keelatud, et võra radiaalsed normaalid toimiksid mõlemal küljel.
function leheMaterjal(map, color) {
  const m = new THREE.MeshStandardMaterial({ map, color, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  m.customProgramCacheKey = () => 'leaf-noflip';
  return m;
}

export function looMaterjalid(T) {
  const S = (o) => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.0, ...o });
  const overlay = (o, k = 2) => S({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -k, ...o });
  const M = {
    // Maapind.
    asfalt: S({ map: rep(T.asfalt, 6), roughness: 0.97 }),
    teeKulumine: overlay({ map: rep(T.teeKulumine, 1, 16), roughness: 0.95 }, 1),
    varv: overlay({ map: rep(T.varv, 1, 2.5), roughness: 0.8 }, 3),
    peatu: overlay({ map: T.peatu, roughness: 0.8 }, 3),
    kaevuluuk: S({ map: T.kaevuluuk, alphaTest: 0.5, metalness: 0.45, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    tellis: S({ map: rep(T.tellis, 2), roughness: 0.9 }),
    pargiplaat: S({ map: rep(T.pargiplaat, 4), roughness: 0.85 }),
    graniit: S({ map: rep(T.graniit, 1.2), color: 0xc9c9c4, roughness: 0.75 }),
    tumeGraniit: S({ map: rep(T.graniit, 1.2), color: 0x55575a, roughness: 0.55 }),
    betoon: S({ map: rep(T.betoon, 2) }),
    tumeBetoon: S({ map: rep(T.betoon, 2), color: 0x77777a }),
    muru: S({ map: rep(T.muru, 1.5) }),
    muld: S({ map: rep(T.muld, 2.5) }),
    // H1: hallikasbeež betoon ja tume sokkel.
    h1Sein: S({ map: rep(T.h1, 3, 2.95), aoMap: T.mustus, aoMapIntensity: 1.0 }),
    h1Serv: S({ map: rep(T.h1, 3, 2.95), color: 0xe9e5dc }),
    h1Sokkel: S({ map: rep(T.betoon, 2), color: 0x3e3f42, roughness: 0.8 }),
    // H2: hele betoon, sügavad plaadid ja mattklaas.
    h2Sein: S({ map: rep(T.h2, 3), aoMap: T.mustus, aoMapIntensity: 0.9 }),
    h2Plaat: S({ map: rep(T.h2, 3), color: 0xf6f6f2 }),
    beezPlaat: S({ map: rep(T.beezPlaat, 1), roughness: 0.7 }),
    soffit: S({ map: rep(T.betoon, 2), color: 0x9a9a96 }),
    klaaspiire: S({ map: rep(T.glass, 1.2, 1.1), roughness: 0.35 }),
    windows: S({ map: T.win, emissiveMap: T.akenKuma, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.3 }),
    fuajee: S({ map: T.fuajee, emissiveMap: T.fuajeeKuma, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.3 }),
    vore: S({ map: rep(T.vore, 2), alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.6 }),
    sisemus: S({ color: 0x0d0e10, roughness: 1 }),
    // Taustahooned.
    bg: S({ map: rep(T.bg, 12), emissiveMap: rep(T.bgE, 12), emissive: 0xffffff, emissiveIntensity: 1.0 }),
    heleTaust: S({ map: rep(T.bg, 12), emissiveMap: rep(T.bgE, 12), emissive: 0xffffff, emissiveIntensity: 0.9, color: 0xeeeee8 }),
    tumeTaust: S({ map: rep(T.bg, 12), emissiveMap: rep(T.bgE, 12), emissive: 0xffffff, emissiveIntensity: 0.8, color: 0x83888a }),
    // Metall.
    tumeMetall: S({ color: 0x2b2d30, metalness: 0.5, roughness: 0.55 }),
    hallMetall: S({ color: 0x86898c, metalness: 0.5, roughness: 0.5 }),
    mustMetall: S({ color: 0x18191b, metalness: 0.3, roughness: 0.6 }),
    valge: S({ color: 0xdedbd4, roughness: 0.7 }),
    punane: S({ color: 0xa3262a, roughness: 0.6 }),
    kollane: S({ color: 0xcfa62a, roughness: 0.6 }),
    juhe: S({ color: 0x151617, roughness: 0.6 }),
    post: S({ map: T.post, roughness: 0.85 }),
    lambiKlaas: S({ color: 0xfff1da, emissive: 0xffc27c, emissiveIntensity: 3.2, roughness: 0.4 }),
    led: S({ color: 0xf0f4ff, emissive: 0xdfe8ff, emissiveIntensity: 2.4 }),
    peatumismark: S({ map: T.peatumismark, alphaTest: 0.5, roughness: 0.5 }),
    parkimiskeeld: S({ map: T.parkimiskeeld, alphaTest: 0.5, roughness: 0.5 }),
    peatumismarkTaga: S({ map: T.peatumismark, alphaTest: 0.5, color: 0x3a3b3d, roughness: 0.6 }),
    parkimiskeeldTaga: S({ map: T.parkimiskeeld, alphaTest: 0.5, color: 0x3a3b3d, roughness: 0.6 }),
    // Aed.
    kivimuuriPind: S({ map: rep(T.kivimuuriPind, 4, 1) }),
    aiakivi: S({ map: T.aiakivi, roughness: 0.85 }),
    sokkelkivi: S({ map: T.sokkelkivi, roughness: 0.92 }),   // Sokli plokkide atlas: neli tooni, UV ploki kaupa.
    // Taimestik.
    puukoor: S({ map: rep(T.puukoor, 1, 2), roughness: 0.95 }),
    suurpuuLehed: leheMaterjal(T.lehed, 0xaebba2),
    pargipuuLehed: leheMaterjal(T.lehed, 0xd6dfb4),
    lehestik: S({ map: rep(T.tihedadLehed, 2), color: 0x8f9a88, roughness: 0.95 }),
    kaugeLehestik: S({ map: rep(T.tihedadLehed, 3), color: 0x6c7569, roughness: 1 }),
    pargiLehestik: S({ map: rep(T.tihedadLehed, 1.5), color: 0xa9b68f, roughness: 0.95 }),
    hekk: S({ map: rep(T.hekk, 1.2), roughness: 0.95 }),
    roosaPoosas: S({ map: rep(T.hekk, 1.2), color: 0xe7a9b8, roughness: 0.95 }),
    // H1 heledad väikeplaadid ja tumedad postid, N1, N3, joogiautomaadid ja tõkked.
    h1Plaat: S({ map: rep(T.vaikePlaat, 1), aoMap: T.mustus, aoMapIntensity: 0.85, roughness: 0.75 }),
    h1Post: S({ map: rep(T.tumePlaat, 1), roughness: 0.6 }),
    h1Tume: S({ map: rep(T.h1, 3, 2.95), color: 0x8f8a82 }),
    nimesilt: S({ map: T.nimesilt, metalness: 0.3, roughness: 0.45 }),
    n1Sein: S({ map: rep(T.betoon, 2), color: 0xa49d92, aoMap: T.mustus, aoMapIntensity: 0.9 }),
    ruloo: S({ map: T.ruloo, metalness: 0.35, roughness: 0.55 }),
    poesilt: S({ map: T.poesilt, roughness: 0.5 }),
    automaadid: S({ map: T.automaadid, emissiveMap: T.automaadiKuma, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.35 }),
    automaadiKulg0: S({ color: 0xd8b238, metalness: 0.2, roughness: 0.5 }),
    automaadiKulg1: S({ color: 0xe0a62c, metalness: 0.2, roughness: 0.5 }),
    toke: S({ map: rep(T.toke, 0.5), roughness: 0.6 }),
    koonus: S({ color: 0xd2561e, roughness: 0.6 }),
    suletudSilt: S({ map: T.suletudSilt, alphaTest: 0.5, roughness: 0.5 }),
    suletudSiltTaga: S({ map: T.suletudSilt, alphaTest: 0.5, color: 0x3a3b3d, roughness: 0.6 }),
    merevaigulamp: S({ color: 0xffb050, emissive: 0xff8a20, emissiveIntensity: 2.5, roughness: 0.4 }),
    // Inimene.
    riie: S({ color: 0x2a2d33, roughness: 0.95 }),
    tumeRiie: S({ color: 0x1c1d21, roughness: 0.95 }),
    nahk: S({ color: 0x8e705e, roughness: 0.8 }),
    juuksed: S({ color: 0x111112, roughness: 0.9 }),
  };
  return M;
}
