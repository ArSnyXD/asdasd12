import * as THREE from 'three';
import { buildWorld } from './world.js';
import { createCharacter } from './character.js';
import { Input } from './input.js';
import { ThirdPersonCamera } from './camera.js';
import { Player } from './player.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d9e3ed');
scene.fog = new THREE.Fog('#d9e3ed', 45, 240);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.2, 900);

// soft daylight: sky/ground ambient plus a warm sun that casts shadows
scene.add(new THREE.HemisphereLight('#cfe0f7', '#8b8a82', 1.5));
const sun = new THREE.DirectionalLight('#fff1dc', 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 5;
sun.shadow.camera.far = 220;
sun.shadow.camera.left = sun.shadow.camera.bottom = -48;
sun.shadow.camera.right = sun.shadow.camera.top = 48;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const sunOffset = new THREE.Vector3(-38, 78, 44);

const world = buildWorld(scene);
const player = new Player(world);
const character = createCharacter();
character.object.position.copy(player.position);
character.object.rotation.y = player.heading;
scene.add(character.object);

const input = new Input(renderer.domElement);
const follow = new ThirdPersonCamera(camera, world.occluders, { yaw: 0, pitch: 0.1, distance: 8 });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();
timer.connect(document);
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);

  player.update(dt, input, follow.yaw);
  character.object.position.copy(player.position);
  character.object.rotation.y = player.heading;
  character.update(dt, player.speed, player.running);
  follow.update(dt, input, player.position);

  // keep the shadow frustum centred on the character
  sun.target.position.copy(player.position);
  sun.position.copy(player.position).add(sunOffset);
  sun.target.updateMatrixWorld();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

renderer.render(scene, camera);   // warm up shaders before the first animated frame
document.getElementById('loading').classList.add('hidden');
frame();

// small debug hook used by the smoke test
window.__streetScene = {
  ready: true,
  playerPosition: () => player.position.clone(),
  cameraYaw: () => follow.yaw,
};
