import * as THREE from 'three';

const WALK_SPEED = 3.3;
const RUN_SPEED = 6.4;
const RADIUS = 0.38;

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Moves the character relative to the camera heading and keeps it out of colliders.
export class Player {
  constructor(world) {
    this.world = world;
    this.position = new THREE.Vector3(world.start.x, world.groundHeightAt(world.start.x, world.start.z), world.start.z);
    this.heading = world.start.heading;
    this.velocity = new THREE.Vector2();
    this.speed = 0;
    this.running = false;
  }

  update(dt, input, cameraYaw) {
    const f = input.forward, s = input.strafe;
    let mx = 0, mz = 0;
    if (f || s) {
      const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);   // camera forward on the ground
      mx = fx * f - fz * s;
      mz = fz * f + fx * s;
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
    }
    this.running = input.run && (f !== 0 || s !== 0);
    const targetSpeed = f || s ? (this.running ? RUN_SPEED : WALK_SPEED) : 0;

    const k = 1 - Math.exp(-dt * 12);
    this.velocity.x += (mx * targetSpeed - this.velocity.x) * k;
    this.velocity.y += (mz * targetSpeed - this.velocity.y) * k;

    if (f || s) {
      const want = Math.atan2(mx, mz);
      this.heading += wrapAngle(want - this.heading) * (1 - Math.exp(-dt * 14));
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.y * dt;
    this.resolveCollisions();

    const b = this.world.bounds;
    this.position.x = Math.min(b.maxX, Math.max(b.minX, this.position.x));
    this.position.z = Math.min(b.maxZ, Math.max(b.minZ, this.position.z));

    const gy = this.world.groundHeightAt(this.position.x, this.position.z);
    this.position.y += (gy - this.position.y) * (1 - Math.exp(-dt * 16));
    this.speed = this.velocity.length();
  }

  resolveCollisions() {
    const p = this.position;
    for (let pass = 0; pass < 3; pass++) {
      for (const c of this.world.colliders) {
        if (c.type === 'circle') {
          let dx = p.x - c.x, dz = p.z - c.z;
          const dist = Math.hypot(dx, dz), min = c.r + RADIUS;
          if (dist < min) {
            if (dist < 1e-4) { dx = 1; dz = 0; }
            const push = min - Math.max(dist, 1e-4);
            p.x += (dx / Math.max(dist, 1e-4)) * push;
            p.z += (dz / Math.max(dist, 1e-4)) * push;
          }
          continue;
        }
        const cx = Math.min(c.maxX, Math.max(c.minX, p.x));
        const cz = Math.min(c.maxZ, Math.max(c.minZ, p.z));
        const dx = p.x - cx, dz = p.z - cz;
        const dist = Math.hypot(dx, dz);
        if (dist >= RADIUS) continue;
        if (dist > 1e-4) {
          const push = RADIUS - dist;
          p.x += (dx / dist) * push;
          p.z += (dz / dist) * push;
        } else {
          // centre is inside the box: leave through the nearest face
          const exits = [
            [c.minX - RADIUS - p.x, 0], [c.maxX + RADIUS - p.x, 0],
            [0, c.minZ - RADIUS - p.z], [0, c.maxZ + RADIUS - p.z],
          ];
          exits.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
          p.x += exits[0][0];
          p.z += exits[0][1];
        }
      }
    }
  }
}
