// Jalutamine kolmanda isiku vaates.
// Sisend: füüsilised klahvikoodid ei sõltu klaviatuuripaigutusest; hiire hõivamine või
// lohistamine ja kerimisratas. Fookuse kadumisel tühjendatakse vajutatud klahvid.
// Mängija liigub kaamera suhtes kiirenduse ja pidurdusega. Kokkupõrgetes tõugatakse ring
// kuni 8 cm sammudega takistusest välja; mööda seinu libisemine ja maapinna kõrgus.
// Tagantvaatekaamera õlanihe, takistustele lähenemine kiirtesti abil,
// piiramine maapinna kohal ning varikatuste ja niššide lagede all.
// Plaanil X itta, Y põhja; Three.js-is (x, y, z) = (X, kõrgus, −Y).
import * as THREE from 'three';
import { LIIKUMINE } from './seaded.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const MANGUKLAHVID = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'Tab']);
export const KALLE_MIN = -0.35, KALLE_MAX = 0.96;   // −20° … 55°.

export class Sisend {
  constructor(el) {
    this.el = el;
    this.keys = new Set();
    this.dx = 0; this.dy = 0; this.wheel = 0;
    this.locked = false; this.drag = false; this.lx = 0; this.ly = 0;
    this.hoiveMuutus = null;
    addEventListener('keydown', (e) => {
      const t = e.target && e.target.tagName;
      if ((t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') && e.code !== 'Escape') return;
      this.keys.add(e.code);
      if (MANGUKLAHVID.has(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    el.addEventListener('mousedown', (e) => {
      if (this.locked || e.button !== 0) return;
      this.drag = true; this.lx = e.clientX; this.ly = e.clientY;
    });
    addEventListener('mouseup', () => { this.drag = false; });
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.dx += e.movementX || 0; this.dy += e.movementY || 0; }
      else if (this.drag) {
        this.dx += e.clientX - this.lx; this.dy += e.clientY - this.ly;
        this.lx = e.clientX; this.ly = e.clientY;
      }
    });
    el.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === el;
      if (this.hoiveMuutus && was !== this.locked) this.hoiveMuutus(this.locked);
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
  }
  lock() {
    if (this.locked || !this.el.requestPointerLock) return;
    try {
      const p = this.el.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* Hõivamiseta saab vaadata hiirt lohistades. */ }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  clear() { this.keys.clear(); this.drag = false; this.dx = 0; this.dy = 0; this.wheel = 0; }
  down(...codes) { for (const c of codes) if (this.keys.has(c)) return true; return false; }
  loeHiir() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  loeRatas() { const w = this.wheel; this.wheel = 0; return w; }
}

export class Mangija {
  constructor(ctx, tegelane) {
    this.ctx = ctx;
    this.ch = tegelane;
    this.cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.08, 900);
    this.reset();
  }

  reset(x = LIIKUMINE.start[0], y = LIIKUMINE.start[1], yaw = LIIKUMINE.algsuund) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.yaw = yaw; this.kaameraSuund = yaw; this.pitch = LIIKUMINE.kaameraKalle;
    this.dist = LIIKUMINE.kaameraKaugus; this.praeguneKaugus = LIIKUMINE.kaameraKaugus; this.sh = LIIKUMINE.olanihe;
    this.h = this.ctx.korgused ? this.ctx.korgused.at(x, y) : 0;
    this.speed = 0; this.poordekiirus = 0; this.hits = 0; this.run = false; this.labitudTee = 0;
    this.tgt = null;
    this.place();
    this.ch.update(0, 0, false, 0);
    this.uuendaKaamera(0);
  }

  place() {
    const r = this.ch.root;
    r.position.set(this.x, this.h, -this.y);
    r.rotation.y = this.yaw + Math.PI / 2;
  }

  // Kaadris loetakse hiirt ja ratast üks kord; liikumine ja animatsioon arvutatakse kuni 1/60 s sammudena.
  // Kaadri kohta kuni 30 alamsammu; kaamera uuendatakse üks kord pärast liikumist.
  frame(dt, inp, active) {
    const n = Math.min(30, Math.max(1, Math.ceil(dt * 60 - 1e-6)));
    const h = dt / n;
    let f = 0, s = 0, run = false;
    if (active && inp) {
      const [mx, my] = inp.loeHiir();
      this.kaameraSuund = wrap(this.kaameraSuund - mx * LIIKUMINE.hiireTundlikkus);
      this.pitch = clamp(this.pitch + my * LIIKUMINE.hiireTundlikkus, KALLE_MIN, KALLE_MAX);
      const wh = inp.loeRatas();
      if (wh) this.dist = clamp(this.dist * Math.pow(1.12, wh), LIIKUMINE.kaameraMin, LIIKUMINE.kaameraMax);
      const turn = (inp.down('ArrowLeft', 'KeyQ') ? 1 : 0) - (inp.down('ArrowRight', 'KeyE') ? 1 : 0);
      this.kaameraSuund = wrap(this.kaameraSuund + turn * 2.2 * dt);
      f = (inp.down('KeyW', 'ArrowUp') ? 1 : 0) - (inp.down('KeyS', 'ArrowDown') ? 1 : 0);
      s = (inp.down('KeyD') ? 1 : 0) - (inp.down('KeyA') ? 1 : 0);
      run = inp.down('ShiftLeft', 'ShiftRight');
    } else if (inp) { inp.loeHiir(); inp.loeRatas(); }
    this.run = run;
    for (let i = 0; i < n; i++) this.step(h, f, s, run);
    this.uuendaKaamera(dt);
  }

  step(dt, f, s, run) {
    const W = LIIKUMINE, c = Math.cos(this.kaameraSuund), sn = Math.sin(this.kaameraSuund);
    const dx = f * c + s * sn, dy = f * sn - s * c, len = Math.hypot(dx, dy);
    const sp = run ? W.jooksukiirus : W.konnikiirus;
    let tx = 0, ty = 0;
    if (len > 1e-6) { tx = (dx / len) * sp; ty = (dy / len) * sp; }
    const acc = tx * tx + ty * ty > this.vx * this.vx + this.vy * this.vy ? 10 : 12;
    const a = 1 - Math.exp(-acc * dt);
    this.vx += (tx - this.vx) * a;
    this.vy += (ty - this.vy) * a;

    const ox = this.x, oy = this.y, mx = this.vx * dt, my = this.vy * dt;
    const m = Math.max(1, Math.ceil(Math.hypot(mx, my) / 0.08));
    let x = ox, y = oy, hit = 0;
    for (let i = 0; i < m; i++) {
      const q = this.ctx.col.resolve(x + mx / m, y + my / m, W.radius, 3, 0.3);
      x = q.x; y = q.y; hit += q.hit;
    }
    this.x = x; this.y = y; this.hits = hit;
    const ax = dt > 0 ? (x - ox) / dt : 0, ay = dt > 0 ? (y - oy) / dt : 0;
    if (hit) { this.vx = ax; this.vy = ay; }        // Mööda seina libisemine ilma kiiruse kuhjumiseta.
    this.speed = Math.hypot(ax, ay);
    this.labitudTee += this.speed * dt;

    if (len > 1e-6) {
      const d = clamp(wrap(Math.atan2(ty, tx) - this.yaw), -9 * dt, 9 * dt);
      this.yaw = wrap(this.yaw + d);
      this.poordekiirus = dt > 0 ? d / dt : 0;
    } else this.poordekiirus = 0;

    const hg = this.ctx.korgused.at(x, y);
    this.h += (hg - this.h) * (1 - Math.exp(-dt * 18));
    this.place();
    this.ch.update(dt, this.speed, run, this.poordekiirus);
  }

  uuendaKaamera(dt) {
    const W = LIIKUMINE, col = this.ctx.col, c = Math.cos(this.kaameraSuund), s = Math.sin(this.kaameraSuund);
    const k = dt > 0 ? 1 - Math.exp(-dt * 12) : 1;
    // Õlanihe paremale väheneb parempoolse seina lähedal, et sihtpunkt ei satuks seina sisse.
    const H0 = [this.x, this.y, this.h + W.kaameraKorgus];
    const fs = col.raycast(H0, [H0[0] + s * W.olanihe, H0[1] - c * W.olanihe, H0[2]], 0.2, 0);
    const shW = W.olanihe * (fs >= 1 ? 1 : Math.max(0, fs - 0.1));
    this.sh = shW < this.sh ? shW : this.sh + (shW - this.sh) * k;
    const T = [H0[0] + s * this.sh, H0[1] - c * this.sh, H0[2]];
    if (!this.tgt || dt <= 0) this.tgt = T.slice();
    else for (let i = 0; i < 3; i++) this.tgt[i] += (T[i] - this.tgt[i]) * k;
    const tg = this.tgt, cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const ex = c * cp, ey = s * cp;
    // Takistus sihtpunkti ja kaamera vahel: kaamera liigub kohe lähemale, eemaldub sujuvalt.
    const want = this.dist;
    const f = col.raycast(tg, [tg[0] - ex * want, tg[1] - ey * want, tg[2] + sp * want], 0.22, 0.25);
    // Miinimum 0,15 m; varasem 0,5 m viis seljaga seina ääres kaamera seina sisse.
    // Varasem H2 idaseina kontroll leidis kaamera 14 cm fassaaditasapinna taga.
    const free = f >= 1 ? want : Math.max(0.15, want * f - 0.1);
    if (free < this.praeguneKaugus || dt <= 0) this.praeguneKaugus = free;
    else this.praeguneKaugus += (free - this.praeguneKaugus) * (1 - Math.exp(-dt * 4));
    const d = this.praeguneKaugus;
    // Pea lähedal peidetakse tegelane, et kaamera ei näitaks mudeli sisemust.
    if (this.ch.root.visible ? d < 0.4 : d > 0.48) this.ch.root.visible = !this.ch.root.visible;
    const px = tg[0] - ex * d, py = tg[1] - ey * d;
    let ph = tg[2] + sp * d;
    ph = Math.max(ph, this.ctx.korgused.at(px, py) + 0.25);
    for (const z of this.ctx.laed) if (px > z[0] && px < z[1] && py > z[2] && py < z[3]) ph = Math.min(ph, z[4] - 0.2);
    this.cam.position.set(px, ph, -py);
    this.cam.lookAt(tg[0], tg[2], -tg[1]);
  }

  state() {
    const r = (v) => Math.round(v * 1000) / 1000;
    return {
      x: r(this.x), y: r(this.y), h: r(this.h), yaw: r(this.yaw), kaameraSuund: r(this.kaameraSuund), pitch: r(this.pitch),
      speed: r(this.speed), run: this.run, hits: this.hits, labitudTee: r(this.labitudTee), kaameraKaugus: r(this.praeguneKaugus),
      cam: [r(this.cam.position.x), r(-this.cam.position.z), r(this.cam.position.y)],
      gait: r(this.ch.w || 0), jooksuOsakaal: r(this.ch.rw || 0),
    };
  }
}
