// The client's gradient shapes (src/assets/ai-shapes), extruded in 3D with a brand gradient. Shared by the waitlist
// film and the shapes floating behind the page.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

const svgs = import.meta.glob('../assets/ai-shapes/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const svg = (n: string) => svgs[`../assets/ai-shapes/shape-${n}.svg`];

// brand gradients for the shapes: teal through sun to tangerine, never through grey
export const PAL = {
  brand: ['#5FD3C7', '#FFD08A', '#FF9A4A'],
  teal: ['#9BE8DF', '#5FD3C7', '#14A098'],
  sun: ['#FFE2B0', '#FFD08A', '#FF9A4A'],
  deep: ['#5FD3C7', '#14A098', '#0B7E79'],
};

const shapeVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec2 vP;
  void main() {
    vP = position.xy;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const shapeFrag = /* glsl */ `
  uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec2 dir; uniform float span;
  varying vec3 vN; varying vec3 vV; varying vec2 vP;
  void main() {
    float g = clamp(dot(vP, dir) / span * .5 + .5, 0., 1.);
    vec3 base = g < .5 ? mix(c0, c1, g * 2.) : mix(c1, c2, g * 2. - 1.);
    vec3 n = normalize(vN);
    vec3 L = normalize(vec3(-.4, .7, .9));
    float diff = .78 + .26 * max(dot(n, L), 0.);
    float spec = pow(max(dot(reflect(-L, n), vV), 0.), 24.) * .35;
    float rim = pow(1. - abs(dot(n, vV)), 2.5) * .28;
    gl_FragColor = vec4(base * diff + spec + rim, 1.);
    #include <colorspace_fragment>
  }`;

// brand gradient across the face, soft key light, a little specular and rim
export function gradientMaterial(pal: string[], span: number) {
  return new THREE.ShaderMaterial({
    vertexShader: shapeVert, fragmentShader: shapeFrag, side: THREE.DoubleSide,
    uniforms: { c0: { value: new THREE.Color(pal[0]) }, c1: { value: new THREE.Color(pal[1]) }, c2: { value: new THREE.Color(pal[2]) }, dir: { value: new THREE.Vector2(.6, -.8) }, span: { value: span } },
  });
}

export function buildShape(markup: string, pal: string[], size: number) {
  const data = new SVGLoader().parse(markup);
  const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 26, bevelEnabled: true, bevelThickness: 7, bevelSize: 5, bevelSegments: 4, curveSegments: 28 });
  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox!; const span = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
  const k = size / span; geo.scale(k, -k, k);                    // SVG y runs down
  geo.computeVertexNormals();
  const mat = gradientMaterial(pal, size * .55);
  return new THREE.Mesh(geo, mat);
}

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
