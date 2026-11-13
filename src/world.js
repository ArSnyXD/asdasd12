import * as THREE from 'three';
import * as T from './textures.js';

// Coordinate system: +x east, -z north (the player starts looking north, up the main street).
// All sizes are in metres. Buildings are axis-aligned boxes; (x, z) is the min corner.

let seed = 4242;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...extra });

const M = {
  white: std('#eeede8'),
  concrete: std('#a8a6a1'),
  curb: std('#b4b2ac'),
  dark: std('#2b2e32'),
  glass: std('#2a3540', { roughness: 0.35 }),
  steel: std('#e4e6e8'),
  wood: std('#8d6a46'),
  trunk: std('#6a5240'),
  hedge: std('#3f6b32', { flatShading: true }),
  metal: std('#777a7e'),
  red: std('#c9312b'),
  line: std('#e9e9e4'),
  rubber: std('#1c1d1f'),
  tile: null,
};

export function buildWorld(scene) {
  const colliders = [];
  const occluders = [];
  const surfaces = [];

  const boxCollider = (minX, maxX, minZ, maxZ) => colliders.push({ type: 'box', minX, maxX, minZ, maxZ });
  const circleCollider = (x, z, r) => colliders.push({ type: 'circle', x, z, r });

  function mesh(geo, mat, x, y, z, { shadow = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = receive;
    scene.add(m);
    return m;
  }
  const box = (w, h, d, mat, x, y, z, opts) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, opts);

  // ---------- ground, roads, sidewalks ----------
  const ground = mesh(new THREE.PlaneGeometry(800, 800), std('#73756e'), 0, 0, 0, { shadow: false });
  ground.rotation.x = -Math.PI / 2;

  const asphaltTex = T.asphalt();
  function road(minX, maxX, minZ, maxZ) {
    const w = maxX - minX, d = maxZ - minZ;
    const t = asphaltTex.tex.clone();
    t.repeat.set(w / asphaltTex.size, d / asphaltTex.size);
    const m = mesh(new THREE.PlaneGeometry(w, d), std('#ffffff', { map: t }), (minX + maxX) / 2, 0.01, (minZ + maxZ) / 2, { shadow: false });
    m.rotation.x = -Math.PI / 2;
  }
  road(-9, -2, -8, 70);       // main street (north-south)
  road(-80, 80, -15, -8);     // cross street in front of H1

  const walkTex = T.paving({ color: '#b7b5ae', grout: '#9a988f', tiles: 4, size: 1.2 });
  const plazaTex = T.paving({ color: '#cdcbc3', grout: '#aeaca4', tiles: 3, size: 2.4, shade: 14 });
  function pavement(minX, maxX, minZ, maxZ, pav = walkTex) {
    const w = maxX - minX, d = maxZ - minZ, h = 0.12;
    const t = pav.tex.clone();
    t.repeat.set(w / pav.size, d / pav.size);
    const top = std('#ffffff', { map: t });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [M.curb, M.curb, top, M.curb, M.curb, M.curb]);
    m.position.set((minX + maxX) / 2, h / 2, (minZ + maxZ) / 2);
    m.receiveShadow = true;
    scene.add(m);
    surfaces.push({ minX, maxX, minZ, maxZ, y: h });
  }
  pavement(-12, -9, -8, 70);          // west sidewalk
  pavement(-2, 2, -8, 70);            // east sidewalk (start point)
  pavement(-80, 80, -18, -15);        // north side of the cross street
  pavement(0.5, 17, -20, -18);        // forecourt in front of the grey tower
  pavement(-80, -12, -8, -5);         // south side, west part
  pavement(32, 80, -8, -5);           // south side, east part
  pavement(2, 32, -8, 52, plazaTex);  // tree plaza with pergolas

  // road markings
  function stripe(w, d, x, z) {
    mesh(new THREE.PlaneGeometry(w, d), M.line, x, 0.02, z, { shadow: false }).rotation.x = -Math.PI / 2;
  }
  stripe(0.12, 78, -8.8, 31);
  stripe(0.12, 78, -2.2, 31);
  stripe(160, 0.12, 0, -14.8);
  stripe(71, 0.12, -44.5, -8.2);
  stripe(82, 0.12, 39, -8.2);
  for (let i = 0; i < 8; i++) stripe(3.6, 0.45, 0, -14.2 + i * 0.8);      // crossing to H1
  for (let i = 0; i < 8; i++) stripe(0.45, 3.6, -8.4 + i * 0.83, -3.4);   // crossing over the main street
  const manhole = new THREE.CircleGeometry(0.4, 16);
  for (const [x, z] of [[-5.5, 6], [-4, 26], [-6.5, -11.5], [-7, 44]]) {
    mesh(manhole, std('#3b3c3f'), x, 0.025, z, { shadow: false }).rotation.x = -Math.PI / 2;
  }

  // ---------- buildings ----------
  function building({ x, z, w, d, h, floors, f, roof = '#8d8c88', junk = true }) {
    const side = (len) => {
      const t = f.tex.clone();
      t.repeat.set(Math.max(1, Math.round(len / f.tileW)), floors);
      return std('#ffffff', { map: t });
    };
    const mx = side(d), mz = side(w), top = std(roof);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h + 0.2, d), [mx, mx, top, top, mz, mz]);
    m.position.set(x + w / 2, h / 2 - 0.1, z + d / 2);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    boxCollider(x, x + w, z, z + d);
    occluders.push(m);
    if (junk) roofJunk(x, z, w, d, h);
    return m;
  }

  function roofJunk(x, z, w, d, h) {
    const p = std('#c9c7c1');
    box(w, 0.9, 0.25, p, x + w / 2, h + 0.45, z + 0.125);
    box(w, 0.9, 0.25, p, x + w / 2, h + 0.45, z + d - 0.125);
    box(0.25, 0.9, d, p, x + 0.125, h + 0.45, z + d / 2);
    box(0.25, 0.9, d, p, x + w - 0.125, h + 0.45, z + d / 2);
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const bw = 1.5 + rand() * 3, bd = 1.5 + rand() * 2.5, bh = 1 + rand() * 2.2;
      box(bw, bh, bd, M.concrete, x + 1.5 + bw / 2 + rand() * (w - bw - 3), h + bh / 2, z + 1.5 + bd / 2 + rand() * (d - bd - 3));
    }
    if (rand() > 0.5) {
      mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10), M.steel, x + w - 2.2, h + 0.8, z + 2.2);
    }
  }

  const F = {
    whiteBalcony: T.facade({ base: '#eceae4', win: '#3a4a5c', bays: 3, winW: 0.62, winH: 0.4, winTop: 0.2, band: '#dcdad3', bandTop: 0.7, bandH: 0.24 }),
    white: T.facade({ base: '#e8e6df', win: '#3d4d60', frame: '#cfccc3', bays: 2, winW: 0.5, winH: 0.42, winTop: 0.24 }),
    cream: T.facade({ base: '#e4e0d4', win: '#44515e', bays: 2, winW: 0.56, winH: 0.4, winTop: 0.26, band: '#d3cfc3', bandTop: 0.76, bandH: 0.18 }),
    greyStrip: T.facade({ base: '#8e9094', win: '#30363d', bays: 2, winW: 0.24, winH: 0.8, winTop: 0.1 }),
    lightGrey: T.facade({ base: '#d6d5cf', win: '#3a4655', bays: 2, winW: 0.46, winH: 0.46, winTop: 0.22 }),
    green: T.facade({ base: '#aec4ab', win: '#36474a', frame: '#dbe3d6', bays: 2, winW: 0.58, winH: 0.44, winTop: 0.22 }),
    horizontal: T.facade({ base: '#e9e8e2', win: '#3b4b5c', bays: 1, bayW: 2, winW: 0.9, winH: 0.42, winTop: 0.24 }),
    pink: T.facade({ base: '#caa49e', win: '#4a3d42', bays: 2, winW: 0.5, winH: 0.44, winTop: 0.24 }),
    glass: T.glassFacade(),
    glassLight: T.glassFacade({ glass: '#9fbdd8', spandrel: '#7f98ae', mullion: '#e0e7ee' }),
  };

  const buildings = [
    // grey tower east of H1 and the row north of the cross street
    { x: 3, z: -42, w: 12, d: 22, h: 40, floors: 13, f: F.greyStrip, roof: '#6f7175' },
    { x: -26, z: -40, w: 15, d: 22, h: 34, floors: 11, f: F.whiteBalcony },
    { x: -46, z: -38, w: 18, d: 20, h: 24, floors: 8, f: F.lightGrey },
    { x: -64, z: -36, w: 14, d: 18, h: 18, floors: 6, f: F.cream },
    { x: 17, z: -46, w: 22, d: 26, h: 26, floors: 8, f: F.horizontal },
    { x: 41, z: -44, w: 20, d: 24, h: 32, floors: 10, f: F.lightGrey },
    { x: 63, z: -40, w: 16, d: 20, h: 22, floors: 7, f: F.cream },
    { x: 48, z: -82, w: 16, d: 18, h: 52, floors: 16, f: F.pink, roof: '#8a6c68' },
    { x: 18, z: -78, w: 22, d: 22, h: 44, floors: 14, f: F.white },
    // west side of the main street
    { x: -30, z: -5, w: 18, d: 16, h: 30, floors: 10, f: F.whiteBalcony },
    { x: -30, z: 13, w: 18, d: 16, h: 22, floors: 7, f: F.white },
    { x: -30, z: 31, w: 18, d: 16, h: 13, floors: 4, f: F.green, roof: '#7f8f7c' },
    { x: -30, z: 49, w: 18, d: 14, h: 20, floors: 6, f: F.lightGrey },
    { x: -48, z: 0, w: 16, d: 24, h: 16, floors: 5, f: F.cream },
    // east side behind the plaza
    { x: 32, z: -5, w: 26, d: 48, h: 27, floors: 9, f: F.horizontal },
    { x: 34, z: 46, w: 24, d: 20, h: 18, floors: 6, f: F.white },
    { x: 2, z: 54, w: 30, d: 16, h: 16, floors: 5, f: F.lightGrey },
    { x: -30, z: 66, w: 18, d: 16, h: 14, floors: 4, f: F.cream },
    { x: 60, z: -5, w: 18, d: 30, h: 12, floors: 4, f: F.green, roof: '#7f8f7c' },
    // distant towers (skyline seen over the roofs)
    { x: -54, z: -72, w: 18, d: 18, h: 95, floors: 30, f: F.glass, roof: '#5e6d7d', junk: false },
    { x: -30, z: -80, w: 16, d: 16, h: 115, floors: 36, f: F.glass, roof: '#5e6d7d', junk: false },
    { x: -84, z: -52, w: 20, d: 20, h: 70, floors: 22, f: F.glassLight, roof: '#6b7b8a', junk: false },
    { x: -90, z: 10, w: 22, d: 22, h: 48, floors: 15, f: F.glassLight, roof: '#6b7b8a', junk: false },
    { x: 80, z: -70, w: 20, d: 20, h: 60, floors: 19, f: F.white, junk: false },
  ];
  buildings.forEach(building);

  buildH1();

  // gates closing the service alleys on both sides of H1
  const gateMat = std('#4a4d52');
  box(2.5, 2.2, 0.15, gateMat, 1.75, 1.1, -18.8);
  boxCollider(0.5, 3, -19, -18.6);
  box(2, 2.2, 0.15, gateMat, -10, 1.1, -18.8);
  boxCollider(-11, -9, -19, -18.6);

  notchedWall();

  // ---------- H1: the narrow white apartment block (reference photo) ----------
  function buildH1() {
    const x0 = -9, x1 = 0.5, z0 = -34, z1 = -18, w = x1 - x0, d = z1 - z0, H = 30, floorH = 3;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const bodyTex = T.facade({ base: '#efeee9', win: '#3c4852', bays: 2, winW: 0.3, winH: 0.4, winTop: 0.24 });
    const side = (len) => {
      const t = bodyTex.tex.clone();
      t.repeat.set(Math.round(len / bodyTex.tileW), 10);
      return std('#ffffff', { map: t });
    };
    const front = std('#efeee9');
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, H + 0.2, d), [side(d), side(d), std('#9d9c98'), front, front, side(w)]);
    body.position.set(cx, H / 2 - 0.1, cz);
    body.castShadow = body.receiveShadow = true;
    scene.add(body);
    occluders.push(body);
    boxCollider(x0, x1, z0, z1);

    // dark tiled ground floor with garage opening and entrance
    const tileTex = T.paving({ color: '#85878b', grout: '#6d6f73', tiles: 8, size: 1.6, shade: 8 });
    const tt = tileTex.tex.clone();
    tt.repeat.set(w / tileTex.size, 3 / tileTex.size);
    const skirt = box(w + 0.2, 3, d + 0.2, std('#ffffff', { map: tt }), cx, 1.5, cz);
    occluders.push(skirt);
    box(3.8, 2.7, 0.5, M.dark, x0 + 2.6, 1.35, z1 - 0.05);                        // garage
    box(1.7, 2.5, 0.12, M.glass, x1 - 1.6, 1.25, z1 + 0.12);                        // entrance door
    box(2.6, 0.12, 1.0, M.white, x1 - 1.6, 2.75, z1 + 0.5);                        // canopy
    box(0.1, 2.6, 1.0, M.metal, x1 - 2.95, 1.3, z1 + 0.5);                         // canopy post

    // balconies on floors 2..10
    const slab = new THREE.BoxGeometry(w, 0.2, 1.3);
    const parapet = new THREE.BoxGeometry(w, 1.1, 0.12);
    const endWall = new THREE.BoxGeometry(0.12, 1.1, 1.3);
    const glassBand = new THREE.BoxGeometry(w - 0.4, 2.1, 0.06);
    const parapetMat = std('#f2f1ec');
    for (let i = 1; i < 10; i++) {
      const y = i * floorH;
      mesh(slab, M.white, cx, y + 0.1, z1 + 0.65);
      mesh(parapet, parapetMat, cx, y + 0.75, z1 + 1.24);
      mesh(endWall, parapetMat, x0 + 0.06, y + 0.75, z1 + 0.65);
      mesh(endWall, parapetMat, x1 - 0.06, y + 0.75, z1 + 0.65);
      mesh(glassBand, M.glass, cx, y + 1.3, z1 + 0.03, { shadow: false });
    }
    // roof: parapet, lift house, antenna
    const p = std('#dcdbd6');
    box(w, 1.0, 0.2, p, cx, H + 0.5, z1 - 0.1);
    box(w, 1.0, 0.2, p, cx, H + 0.5, z0 + 0.1);
    box(0.2, 1.0, d, p, x0 + 0.1, H + 0.5, cz);
    box(0.2, 1.0, d, p, x1 - 0.1, H + 0.5, cz);
    box(4, 2.8, 5, M.white, cx + 1, H + 1.4, cz - 3);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), M.metal, x0 + 1.5, H + 3, z0 + 2);

    // projecting sign at the front-right corner (red disc + text)
    const signTex = T.sign();
    const signMat = std('#ffffff', { map: signTex });
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.4, 1.4), [signMat, signMat, M.steel, M.steel, M.steel, M.steel]);
    signMesh.position.set(x1 + 0.1, 17.5, z1 + 0.9);
    signMesh.castShadow = true;
    scene.add(signMesh);
    box(0.08, 0.1, 1.2, M.metal, x1 + 0.1, 15.6, z1 + 0.6);
  }

  // stepped concrete fence between the garage apron and the sidewalk
  function notchedWall() {
    const heights = [3.2, 2.7, 3.1, 2.6, 3.0, 2.5];
    const len = 2.4 / heights.length;
    heights.forEach((h, i) => box(0.25, h, len, M.concrete, 1.2, 0.12 + h / 2, -18 + len * (i + 0.5)));
    boxCollider(1.05, 1.35, -18, -15.6);
  }

  // ---------- plaza: trees, pergolas, benches ----------
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const canopyMats = ['#4c7a38', '#588a42', '#65974b', '#436f30'].map((c) => std(c, { flatShading: true }));
  const grateGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const grateMat = std('#44464a');
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.27 * s, 4.4 * s, 7), M.trunk);
    trunk.position.y = 2.2 * s;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.11 * s, 2.6 * s, 5), M.trunk);
      br.position.set(0, 4.6 * s, 0);
      br.rotation.set(0, (i / 3) * Math.PI * 2 + rand(), 0.55);
      br.translateY(1.1 * s);
      br.castShadow = true;
      g.add(br);
    }
    const blobs = 6;
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * Math.PI * 2 + rand() * 0.6;
      const r = 1.3 * s + rand() * 0.6 * s;
      const b = new THREE.Mesh(canopyGeo, canopyMats[Math.floor(rand() * canopyMats.length)]);
      b.position.set(Math.cos(a) * 1.3 * s, 6.3 * s + rand() * 1.4 * s, Math.sin(a) * 1.3 * s);
      b.scale.set(r * 1.25, r * 0.9, r * 1.15);
      b.rotation.set(rand() * 3, rand() * 3, 0);
      b.castShadow = true;
      g.add(b);
    }
    const top = new THREE.Mesh(canopyGeo, canopyMats[1]);
    top.position.set(0, 7.6 * s, 0);
    top.scale.set(1.7 * s, 1.3 * s, 1.7 * s);
    top.castShadow = true;
    g.add(top);
    g.position.set(x, 0.12, z);
    scene.add(g);
    const grate = new THREE.Mesh(grateGeo, grateMat);
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(x, 0.125, z);
    scene.add(grate);
    circleCollider(x, z, 0.45);
  }
  for (let i = 0; i < 7; i++) tree(5.5, -3 + i * 7, 1.05 + ((i * 7) % 3) * 0.08);
  tree(21, 8, 1.15);
  tree(21, 28, 1.0);
  tree(27, 44, 1.1);
  tree(-10.5, 40, 0.9);

  function pergola(cx, cz, size = 4.2, h = 3.6) {
    const half = size / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        box(0.18, h, 0.18, M.steel, cx + sx * half, 0.12 + h / 2, cz + sz * half);
        boxCollider(cx + sx * half - 0.1, cx + sx * half + 0.1, cz + sz * half - 0.1, cz + sz * half + 0.1);
      }
      box(size + 0.4, 0.14, 0.14, M.steel, cx, 0.12 + h, cz + sx * half);
      box(0.14, 0.14, size + 0.4, M.steel, cx + sx * half, 0.12 + h, cz);
    }
    for (let i = 0; i < 5; i++) box(size + 0.2, 0.08, 0.08, M.steel, cx, 0.12 + h + 0.1, cz - half + (i + 0.5) * (size / 5));
  }
  pergola(14, 0);
  pergola(14, 10);
  pergola(14, 20);

  function bench(x, z, rotY = 0) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), M.wood);
    seat.position.y = 0.45;
    seat.castShadow = seat.receiveShadow = true;
    g.add(seat);
    for (const sx of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.4), M.metal);
      leg.position.set(sx, 0.21, 0);
      leg.castShadow = true;
      g.add(leg);
    }
    g.position.set(x, 0.12, z);
    g.rotation.y = rotY;
    scene.add(g);
    const hx = rotY ? 0.3 : 0.95, hz = rotY ? 0.95 : 0.3;
    boxCollider(x - hx, x + hx, z - hz, z + hz);
  }
  bench(9.5, 5, Math.PI / 2);
  bench(9.5, 15, Math.PI / 2);
  bench(18.5, 15, Math.PI / 2);

  function hedge(minX, maxX, minZ, maxZ, h = 0.9) {
    box(maxX - minX, h, maxZ - minZ, M.hedge, (minX + maxX) / 2, 0.12 + h / 2, (minZ + maxZ) / 2);
    boxCollider(minX, maxX, minZ, maxZ);
  }
  hedge(3.5, 14.5, -19.6, -18.4);     // in front of the grey tower
  hedge(2.1, 2.9, 26, 31, 0.6);
  hedge(2.1, 2.9, 40, 45, 0.6);
  hedge(-12, -11.2, -4, 2, 0.7);
  hedge(-12, -11.2, 24, 30, 0.7);

  // ---------- street furniture ----------
  function utilityPole(x, z, transformer = false) {
    mesh(new THREE.CylinderGeometry(0.15, 0.2, 11, 8), M.concrete, x, 5.5, z);
    box(2.4, 0.12, 0.14, M.metal, x, 9.9, z);
    for (const dx of [-1, 0, 1]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 6), M.white, x + dx, 10.1, z);
    if (transformer) box(0.55, 0.9, 0.55, M.metal, x + 0.45, 8.4, z);
    circleCollider(x, z, 0.3);
    return new THREE.Vector3(x, 10.1, z);
  }
  const wireMat = new THREE.LineBasicMaterial({ color: 0x24262a });
  function wire(a, b, sag) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  function wires(a, b, n = 3) {
    for (let i = 0; i < n; i++) {
      const off = new THREE.Vector3((i - 1) * 0.5, -i * 0.3, (i - 1) * 0.15);
      wire(a.clone().add(off), b.clone().add(off), 0.5 + i * 0.15);
    }
  }
  const p1 = utilityPole(-1.5, -7.3, true);
  const p2 = utilityPole(-1.75, 1);
  const p3 = utilityPole(-10.6, -6.6);
  const p4 = utilityPole(-10.6, 22, true);
  const p5 = utilityPole(-1.5, 36);
  wires(p1, p2);
  wires(p2, p5);
  wires(p1, p3);
  wires(p3, p4);
  wires(p2, p4);
  wires(p1, new THREE.Vector3(-2, 9.2, -18), 2);
  wires(p3, new THREE.Vector3(-12, 8.6, -5), 2);
  wires(p4, new THREE.Vector3(-12, 8.4, 22), 2);

  // red/white signal pole with a vertical plate sign, next to the fence
  for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), i % 2 ? M.white : M.red, 2.0, 0.62 + i, -15.5);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.06), std('#ffffff', { map: T.platesign() }));
  plate.position.set(2.0, 3.0, -15.2);
  plate.castShadow = true;
  scene.add(plate);
  circleCollider(2.0, -15.5, 0.2);

  function lamp(x, z, dir = 1) {
    mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8), M.metal, x, 3.35, z);
    box(1.4, 0.08, 0.08, M.metal, x + dir * 0.6, 6.5, z);
    box(0.6, 0.18, 0.3, std('#f1f1e6', { emissive: '#bdbd9c', emissiveIntensity: 0.3 }), x + dir * 1.2, 6.42, z);
    circleCollider(x, z, 0.18);
  }
  lamp(1.6, 28, -1);
  lamp(1.6, 54, -1);
  lamp(-9.5, 8, 1);
  lamp(-9.5, 50, 1);

  // recycling bin on the sidewalk
  box(0.7, 1.0, 0.6, std('#3a8a3c'), 1.4, 0.62, 6.5);
  box(0.76, 0.08, 0.66, std('#2d6c2f'), 1.4, 1.16, 6.5);
  boxCollider(1.0, 1.8, 6.2, 6.8);

  // vending machine against the building opposite
  box(1.0, 1.85, 0.75, std('#f1f1ee'), -11.55, 0.12 + 0.925, 18);
  box(0.04, 1.3, 0.55, std('#c83c35'), -11.04, 1.2, 18);
  box(0.03, 0.9, 0.4, M.glass, -11.02, 1.3, 18.05, { shadow: false });
  boxCollider(-12, -11, 17.5, 18.5);

  // cars
  function car(x, z, rotY, color, length = 4.4) {
    const g = new THREE.Group();
    const paint = std(color, { roughness: 0.5, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(length, 0.62, 1.8), paint);
    body.position.y = 0.62;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(length * 0.52, 0.55, 1.65), M.glass);
    cabin.position.set(-length * 0.05, 1.2, 0);
    cabin.castShadow = true;
    g.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(length * 0.5, 0.06, 1.6), paint);
    roof.position.set(-length * 0.05, 1.5, 0);
    g.add(roof);
    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Mesh(wheelGeo, M.rubber);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(sx * length * 0.32, 0.33, sz * 0.85);
        g.add(wheel);
      }
    }
    const lightGeo = new THREE.BoxGeometry(0.06, 0.18, 0.35);
    for (const sz of [-0.6, 0.6]) {
      const head = new THREE.Mesh(lightGeo, std('#f3f0d8'));
      head.position.set(length / 2, 0.75, sz);
      const tail = new THREE.Mesh(lightGeo, std('#b22828'));
      tail.position.set(-length / 2, 0.75, sz);
      g.add(head, tail);
    }
    g.position.set(x, 0.12, z);
    g.rotation.y = rotY;
    scene.add(g);
    const along = Math.abs(Math.cos(rotY)) > 0.5;
    const hx = along ? length / 2 + 0.1 : 1.0, hz = along ? 1.0 : length / 2 + 0.1;
    boxCollider(x - hx, x + hx, z - hz, z + hz);
  }
  car(-5.8, -16.3, 0, '#15171a');                     // black SUV at the garage of H1
  car(-7.6, 24, Math.PI / 2, '#e8e8e4', 3.6);          // white kei-van on the west kerb
  car(-7.6, 44, Math.PI / 2, '#5c6670', 4.2);

  // ---------- sky and clouds ----------
  const skyGeo = new THREE.SphereGeometry(700, 32, 16);
  const pos = skyGeo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const top = new THREE.Color('#5f98db'), horizon = new THREE.Color('#dde7f1');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.pow(Math.max(0, pos.getY(i) / 700), 0.55);
    c.copy(horizon).lerp(top, t);
    col.set([c.r, c.g, c.b], i * 3);
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));

  const cloudMat = std('#ffffff', { flatShading: true, roughness: 1 });
  function cloud(x, y, z, s) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(canopyGeo, cloudMat);
      b.position.set((i - 2) * 1.6 * s + rand() * s, rand() * 0.6 * s, (rand() - 0.5) * 1.2 * s);
      const r = (1.2 + rand() * 0.8) * s;
      b.scale.set(r * 1.5, r * 0.75, r * 1.1);
      g.add(b);
    }
    g.position.set(x, y, z);
    scene.add(g);
  }
  cloud(-60, 120, -160, 6);
  cloud(40, 135, -190, 7);
  cloud(140, 115, -80, 5);
  cloud(-170, 110, 20, 6);
  cloud(90, 125, 150, 6);
  cloud(-40, 130, 190, 5);

  function groundHeightAt(x, z) {
    let y = 0;
    for (const s of surfaces) {
      if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) y = Math.max(y, s.y);
    }
    return y;
  }

  return {
    colliders,
    occluders,
    groundHeightAt,
    bounds: { minX: -50, maxX: 56, minZ: -18, maxZ: 60 },
    start: { x: 0.8, z: 14, heading: Math.PI },
  };
}
