// Three.js-i WebGL-renderdus: taevas, valgus, udu ja lülitatav retrofilter.
// Vähendatud lahutusvõime, korrapärane hajutus, piiratud värvitoonid ja peen teralisus.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ILME } from './seaded.js';
import { V3 } from './abifunktsioonid.js';

export function looRenderdaja(parent) {
  const renderdaja = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderdaja.toneMapping = THREE.ACESFilmicToneMapping;
  renderdaja.toneMappingExposure = ILME.exposure;
  renderdaja.outputColorSpace = THREE.SRGBColorSpace;
  renderdaja.shadowMap.enabled = true;
  renderdaja.shadowMap.type = THREE.PCFSoftShadowMap;
  renderdaja.shadowMap.autoUpdate = false;     // Staatilise stseeni varjukaart arvutatakse üks kord.
  renderdaja.shadowMap.needsUpdate = true;
  parent.appendChild(renderdaja.domElement);
  return renderdaja;
}

export function looTaevas(stseen) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      zenith: { value: new THREE.Color(ILME.taevaLagi) },
      horizon: { value: new THREE.Color(ILME.silmapiir) },
      glow: { value: new THREE.Color(ILME.taevaKuma) },
      sunDir: { value: new THREE.Vector3(ILME.paikeSuund[0], ILME.paikeSuund[1], -ILME.paikeSuund[2]).normalize() },
    },
    vertexShader: `varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 zenith; uniform vec3 horizon; uniform vec3 glow; uniform vec3 sunDir; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(horizon, zenith, smoothstep(0.02, 0.6, d.y));
        float s = max(dot(d, sunDir), 0.0);
        col = mix(col, glow, pow(s, 5.0) * 0.55 * (1.0 - smoothstep(0.0, 0.45, d.y)));
        col = mix(horizon, col, smoothstep(-0.04, 0.04, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const taevas = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  taevas.renderOrder = -1;
  taevas.frustumCulled = false;
  taevas.name = 'taevas';
  stseen.add(taevas);
  return taevas;
}

export function looValgustid(stseen) {
  const hemi = new THREE.HemisphereLight(ILME.taevavalgus, ILME.maavalgus, ILME.hajusTugevus);
  stseen.add(hemi);
  const paike = new THREE.DirectionalLight(ILME.paikeVarv, ILME.paikeTugevus);
  const target = V3(-12, 2, 0);
  const [sx, sh, sy] = ILME.paikeSuund;
  paike.position.copy(target).add(new THREE.Vector3(sx, sh, -sy).normalize().multiplyScalar(110));
  paike.target.position.copy(target);
  paike.castShadow = true;
  paike.shadow.mapSize.set(2048, 2048);
  const c = paike.shadow.camera;
  c.left = -52; c.right = 52; c.top = 52; c.bottom = -52; c.near = 10; c.far = 260;
  paike.shadow.bias = -0.0005;
  paike.shadow.normalBias = 0.04;
  stseen.add(paike, paike.target);
  return { hemi, paike };
}

const RetroShader = {
  uniforms: {
    tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) },
    levels: { value: 36.0 }, dither: { value: 1.0 }, grain: { value: 0.022 }, seed: { value: 0.37 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float levels; uniform float dither;
    uniform float grain; uniform float seed; varying vec2 vUv;
    float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
    float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 px = floor(vUv * resolution);
      float b = bayer4(px) - 0.5;
      vec3 col = floor(c * levels + 0.5 + b * dither) / levels;
      col += (hash(px) - 0.5) * grain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

// Järeltöötlus: stseen → toonivastendus / sRGB → valikuline retrofilter.
// Sisemise puhvri MSAA: kvaliteeditasemest sõltuvalt 0, 2 või 4 valimit.
export function looJareltootlus(renderdaja, stseen, camera, samples = 4) {
  const size = renderdaja.getSize(new THREE.Vector2()), pr = renderdaja.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(Math.round(size.x * pr), Math.round(size.y * pr), { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderdaja, rt);
  composer.setPixelRatio(pr);
  composer.setSize(size.x, size.y);
  const renderPass = new RenderPass(stseen, camera);
  const output = new OutputPass();
  const retro = new ShaderPass(RetroShader);
  composer.addPass(renderPass);
  composer.addPass(output);
  composer.addPass(retro);
  const resize = () => {
    const s = renderdaja.getSize(new THREE.Vector2()), p = renderdaja.getPixelRatio();
    composer.setPixelRatio(p);
    composer.setSize(s.x, s.y);
    retro.uniforms.resolution.value.set(Math.round(s.x * p), Math.round(s.y * p));
  };
  resize();
  const dispose = () => {
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    retro.material.dispose();
    if (output.dispose) output.dispose();
  };
  return { composer, renderPass, output, retro, resize, dispose, samples };
}
