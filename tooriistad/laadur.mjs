// Suuna Node.js-i Three.js-i impordid kaasasolevasse teeki.
const alus = new URL('../teegid/three/', import.meta.url);
export async function resolve(nimi, kontekst, edasi) {
  if (nimi === 'three') return { url: new URL('build/three.module.js', alus).href, shortCircuit: true };
  if (nimi.startsWith('three/addons/')) {
    return { url: new URL('examples/jsm/' + nimi.slice(13), alus).href, shortCircuit: true };
  }
  return edasi(nimi, kontekst);
}
