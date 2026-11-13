import * as THREE from 'three';

// Low-poly humanoid built from boxes. Local +z is the character's front.
export function createCharacter() {
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const colors = {
    skin: mat('#e9bb9c'), hair: mat('#2a211d'), jacket: mat('#2f3c5c'), shirt: mat('#f2f2ee'),
    trousers: mat('#3b3b40'), shoes: mat('#ececea'),
  };
  const part = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();   // everything that bobs while walking
  root.add(body);

  body.add(part(0.44, 0.6, 0.26, colors.jacket, 0, 1.17, 0));
  body.add(part(0.2, 0.3, 0.03, colors.shirt, 0, 1.3, 0.14));
  body.add(part(0.4, 0.16, 0.24, colors.trousers, 0, 0.86, 0));
  body.add(part(0.3, 0.3, 0.3, colors.skin, 0, 1.63, 0));
  body.add(part(0.33, 0.12, 0.33, colors.hair, 0, 1.74, -0.02));
  body.add(part(0.33, 0.14, 0.1, colors.hair, 0, 1.62, -0.13));

  const limb = (x, y, w, h, d, m, foot) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    g.add(part(w, h, d, m, 0, -h / 2, 0));
    if (foot) g.add(part(0.18, 0.1, 0.3, colors.shoes, 0, -h - 0.04, 0.05));
    else g.add(part(0.11, 0.1, 0.12, colors.skin, 0, -h - 0.04, 0));
    body.add(g);
    return g;
  };
  const armL = limb(-0.3, 1.42, 0.13, 0.6, 0.15, colors.jacket, false);
  const armR = limb(0.3, 1.42, 0.13, 0.6, 0.15, colors.jacket, false);
  const legL = limb(-0.11, 0.84, 0.17, 0.78, 0.2, colors.trousers, true);
  const legR = limb(0.11, 0.84, 0.17, 0.78, 0.2, colors.trousers, true);
  armL.rotation.z = 0.08;
  armR.rotation.z = -0.08;

  let phase = 0;
  let weight = 0;   // 0 = idle pose, 1 = full walk cycle
  let runBlend = 0;

  function update(dt, speed, running) {
    const moving = speed > 0.15;
    weight += ((moving ? 1 : 0) - weight) * (1 - Math.exp(-dt * 10));
    runBlend += ((running && moving ? 1 : 0) - runBlend) * (1 - Math.exp(-dt * 6));
    phase += dt * speed * 2.6;
    if (!moving) phase += dt * 4 * weight;   // let the limbs settle smoothly

    const swing = Math.sin(phase) * (0.55 + 0.4 * runBlend) * weight;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * (0.8 + 0.4 * runBlend);
    armR.rotation.x = swing * (0.8 + 0.4 * runBlend);
    armL.rotation.z = 0.08 + 0.1 * runBlend;
    armR.rotation.z = -0.08 - 0.1 * runBlend;
    body.position.y = Math.abs(Math.sin(phase)) * (0.04 + 0.03 * runBlend) * weight;
    body.rotation.x = 0.12 * runBlend;
    body.rotation.z = Math.sin(phase) * 0.03 * weight;
  }

  return { object: root, update };
}
