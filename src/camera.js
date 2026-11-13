import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Orbit-style follow camera: looks at a point above the character, orbits with mouse drag,
// and pulls in when a building sits between the character and the camera.
export class ThirdPersonCamera {
  constructor(camera, occluders, { yaw = 0, pitch = 0.24, distance = 7 } = {}) {
    this.camera = camera;
    this.occluders = occluders;
    this.yaw = yaw;
    this.pitch = pitch;
    this.distance = distance;
    this.currentDistance = distance;
    this.target = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.dir = new THREE.Vector3();
    this.initialized = false;
  }

  update(dt, input, focus) {
    const drag = input.consumeDrag();
    this.yaw -= drag.x * 0.0045;
    this.pitch = clamp(this.pitch + drag.y * 0.004, -0.3, 1.15);
    this.distance = clamp(this.distance * Math.exp(input.consumeWheel() * 0.0012), 3, 13);

    const goal = focus.clone().add(new THREE.Vector3(0, 1.55, 0));
    if (!this.initialized) {
      this.target.copy(goal);
      this.initialized = true;
    } else {
      this.target.lerp(goal, 1 - Math.exp(-dt * 9));
    }

    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    let wanted = this.distance;
    this.raycaster.set(this.target, this.dir);
    this.raycaster.far = this.distance;
    const hit = this.raycaster.intersectObjects(this.occluders, false)[0];
    if (hit) wanted = Math.max(1.2, hit.distance - 0.4);

    // snap in instantly so geometry never clips, ease back out
    this.currentDistance = wanted < this.currentDistance
      ? wanted
      : this.currentDistance + (wanted - this.currentDistance) * (1 - Math.exp(-dt * 5));

    this.camera.position.copy(this.target).addScaledVector(this.dir, this.currentDistance);
    if (this.camera.position.y < 0.45) this.camera.position.y = 0.45;
    this.camera.lookAt(this.target);
  }
}
