import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface VehicleDef {
  id: string; pilot: string; vehicle: string; bio: string; skill: string;
  vel: number; ace: number; man: number; sus: number; mass: number; color: number;
}

export const VEHICLES: VehicleDef[] = [
  { id: 'lonches', pilot: 'Doña Lonches', vehicle: 'Triciclo lonchero turbo', bio: 'Treinta años repartiendo lonches de adobada por el centro. Conoce cada bache por su nombre.', skill: 'El turbo de gordita dura 30% más.', vel: 5, ace: 9, man: 8, sus: 3, mass: 0.7, color: 0xff5a1f },
  { id: 'repartidor', pilot: 'El Repartidor', vehicle: 'Moto de reparto', bio: 'Entrega en 30 minutos o menos, pase lo que pase con la suspensión.', skill: 'El más ágil de la parrilla.', vel: 7, ace: 9, man: 9, sus: 2, mass: 0.5, color: 0xe84a8a },
  { id: 'godinez', pilot: 'La Godínez', vehicle: 'Sedán a 60 meses', bio: 'Le faltan 47 mensualidades y no piensa dejar la defensa en el Periférico.', skill: 'Equilibrada, sin debilidades.', vel: 7, ace: 6, man: 7, sus: 5, mass: 1, color: 0xb9b4aa },
  { id: 'inge', pilot: 'La Inge', vehicle: 'Pick-up de obra', bio: 'Supervisa una obra que lleva tres administraciones "por concluir".', skill: 'Aguanta bien los baches.', vel: 6, ace: 5, man: 6, sus: 8, mass: 1.3, color: 0xf2efe6 },
  { id: 'lechero', pilot: 'El Lechero', vehicle: 'Camión lechero', bio: 'Sale del establo a las 4 am. A esa hora los baches no se ven.', skill: 'Estable en curva.', vel: 6, ace: 6, man: 5, sus: 7, mass: 1.5, color: 0x8fd0de },
  { id: 'pipero', pilot: 'El Pipero', vehicle: 'Pipa de agua', bio: 'Donde no llega el agua, llega él. Cobra por viaje.', skill: 'Los charcos no lo hacen patinar.', vel: 8, ace: 3, man: 4, sus: 9, mass: 2, color: 0x0b6b4a },
  { id: 'rutero', pilot: 'El Rutero', vehicle: 'Camión de ruta', bio: 'Hace base donde quiere y arranca cuando se llena.', skill: 'Empuja a los ligeros.', vel: 9, ace: 2, man: 3, sus: 10, mass: 2.6, color: 0x2f8fd0 },
  { id: 'candidato', pilot: 'El Candidato', vehicle: 'Camioneta con perifoneo', bio: 'Promete tapar todos los baches. Lleva prometiéndolo desde la pista 1.', skill: 'Mucho ruido.', vel: 8, ace: 7, man: 5, sus: 6, mass: 1.6, color: 0x24222a },
];

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, rough = 0.45, metal = 0.1) {
  const k = `${color}-${rough}-${metal}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return mats.get(k)!;
}
const GLASS = new THREE.MeshStandardMaterial({ color: 0x14212b, roughness: 0.08, metalness: 0.6 });
const TIRE = mat(0x17171a, 0.9, 0);
const RIM = mat(0xc9ccd2, 0.3, 0.8);
const SKIN = mat(0xc98d5e, 0.8, 0);
const LIGHT = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe9a0, emissiveIntensity: 1.6 });
const TAIL = new THREE.MeshStandardMaterial({ color: 0xa01010, emissive: 0xff2010, emissiveIntensity: 1.2 });

function box(g: THREE.Group, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = 0.12) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
function cyl(g: THREE.Group, rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'y') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), m);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2; if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh;
}

export interface VehicleModel { root: THREE.Group; body: THREE.Group; wheels: THREE.Object3D[]; length: number }

function wheel(parent: THREE.Group, list: THREE.Object3D[], x: number, z: number, r = 0.42, w = 0.3) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), TIRE); t.rotation.z = Math.PI / 2; t.castShadow = true; g.add(t);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.58, r * 0.58, w + 0.02, 12), RIM); rim.rotation.z = Math.PI / 2; g.add(rim);
  g.position.set(x, r, z); parent.add(g); list.push(g);
}

function driver(g: THREE.Group, x: number, y: number, z: number, shirt: number, hat?: number) {
  box(g, 0.5, 0.55, 0.34, mat(shirt, 0.8, 0), x, y, z, 0.1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), SKIN); head.position.set(x, y + 0.5, z); head.castShadow = true; g.add(head);
  if (hat !== undefined) { cyl(g, 0.3, 0.32, 0.05, mat(hat, 0.8, 0), x, y + 0.66, z); cyl(g, 0.17, 0.2, 0.16, mat(hat, 0.8, 0), x, y + 0.74, z); }
}

function lights(g: THREE.Group, w: number, y: number, zf: number, zb: number) {
  for (const s of [-1, 1]) { box(g, 0.28, 0.16, 0.08, LIGHT, s * (w / 2 - 0.25), y, zf, 0.04); box(g, 0.26, 0.14, 0.08, TAIL, s * (w / 2 - 0.25), y, zb, 0.04); }
}

/** Construye el modelo del vehiculo. Frente hacia +Z, ruedas apoyadas en y = 0. */
export function buildVehicle(def: VehicleDef): VehicleModel {
  const root = new THREE.Group(), body = new THREE.Group(), wheels: THREE.Object3D[] = [];
  root.add(body);
  const c = mat(def.color, 0.35, 0.25);
  let length = 4;
  switch (def.id) {
    case 'lonches': {
      box(body, 1.7, 0.9, 1.5, c, 0, 0.95, 0.95, 0.14); box(body, 1.72, 0.12, 1.52, mat(0xf6ecd6), 0, 1.44, 0.95, 0.05);
      box(body, 0.9, 0.3, 1.6, mat(0x2a2a2e, 0.6), 0, 0.62, -0.75); box(body, 0.6, 0.12, 0.5, mat(0x3a2a20, 0.8), 0, 0.9, -0.85);
      cyl(body, 0.03, 0.03, 1.5, RIM, 0, 2.1, 0.5); const s = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 12), mat(0xffc61a, 0.7, 0)); s.position.set(0, 2.9, 0.5); s.castShadow = true; body.add(s);
      driver(body, 0, 1.25, -0.85, 0x7a2f8a, 0xf6ecd6);
      lights(body, 1.7, 0.75, 1.72, -1.56);
      wheel(root, wheels, -0.85, 1.0); wheel(root, wheels, 0.85, 1.0); wheel(root, wheels, 0, -1.25, 0.42, 0.34);
      length = 3.6; break;
    }
    case 'repartidor': {
      box(body, 0.42, 0.5, 1.9, c, 0, 0.75, 0, 0.16); box(body, 0.5, 0.14, 0.7, mat(0x1d1d22, 0.7), 0, 1.06, -0.25);
      box(body, 0.85, 0.75, 0.8, mat(0xffffff, 0.5), 0, 1.45, -0.95, 0.1); box(body, 0.87, 0.2, 0.82, c, 0, 1.45, -0.95, 0.05);
      cyl(body, 0.03, 0.03, 0.8, RIM, 0, 1.25, 0.75, 'x'); box(body, 0.3, 0.2, 0.1, LIGHT, 0, 1.0, 0.98, 0.04); box(body, 0.2, 0.12, 0.08, TAIL, 0, 0.9, -1.38, 0.03);
      driver(body, 0, 1.4, -0.15, 0x1d1d22); const h = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), c); h.position.set(0, 1.92, -0.15); body.add(h);
      wheel(root, wheels, 0, 0.95, 0.42, 0.2); wheel(root, wheels, 0, -0.95, 0.42, 0.24);
      length = 2.6; break;
    }
    case 'godinez': case 'candidato': {
      const suv = def.id === 'candidato', h = suv ? 0.85 : 0.6, w = suv ? 2.0 : 1.85;
      box(body, w, h, 4.3, c, 0, 0.45 + h / 2, 0, 0.22);
      box(body, w - 0.18, 0.62, suv ? 2.6 : 2.1, GLASS, 0, 0.45 + h + 0.28, suv ? -0.45 : -0.25, 0.22);
      box(body, w - 0.14, 0.1, suv ? 2.5 : 2.0, c, 0, 0.45 + h + 0.6, suv ? -0.45 : -0.25, 0.05);
      box(body, w + 0.04, 0.2, 0.25, mat(0x2a2a2e, 0.6), 0, 0.5, 2.1, 0.08); box(body, w + 0.04, 0.2, 0.25, mat(0x2a2a2e, 0.6), 0, 0.5, -2.1, 0.08);
      lights(body, w, 0.45 + h * 0.7, 2.14, -2.14);
      if (suv) for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 14, 1, true), mat(0xd8d8dc, 0.4, 0.6)); k.rotation.x = -Math.PI / 2; k.position.set(s * 0.45, 2.25, 0.3); k.castShadow = true; body.add(k); box(body, 0.2, 0.3, 0.2, mat(0x2a2a2e), s * 0.45, 2.05, 0.05, 0.04); }
      for (const z of [1.35, -1.35]) for (const s of [-1, 1]) wheel(root, wheels, s * (w / 2 - 0.08), z, suv ? 0.48 : 0.4);
      length = 4.3; break;
    }
    case 'inge': {
      box(body, 2.0, 0.7, 4.8, c, 0, 0.95, 0, 0.16); box(body, 1.85, 0.75, 1.7, GLASS, 0, 1.62, 0.55, 0.2); box(body, 1.9, 0.1, 1.6, c, 0, 2.02, 0.55, 0.05);
      box(body, 1.8, 0.5, 2.0, mat(0x2a2a2e, 0.7), 0, 1.3, -1.3, 0.05);
      for (const [x, z] of [[-0.5, -1.0], [0.4, -1.5], [0, -1.9]]) { const k = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 12), mat(0xff5a1f, 0.6, 0)); k.position.set(x, 1.85, z); k.castShadow = true; body.add(k); }
      box(body, 0.5, 0.12, 0.3, mat(0xffc61a), 0, 2.14, 0.55, 0.04);
      lights(body, 2.0, 1.0, 2.4, -2.4);
      for (const z of [1.5, -1.5]) for (const s of [-1, 1]) wheel(root, wheels, s * 0.95, z, 0.5, 0.34);
      length = 4.8; break;
    }
    case 'lechero': case 'pipero': {
      const big = def.id === 'pipero', tank = big ? mat(0xc9ccd2, 0.25, 0.85) : mat(0xffffff, 0.3, 0.2);
      box(body, 2.1, 1.5, 1.6, c, 0, 1.5, 1.75, 0.2); box(body, 1.95, 0.6, 0.1, GLASS, 0, 1.85, 2.54, 0.04);
      box(body, 2.0, 0.3, 5.2, mat(0x2a2a2e, 0.7), 0, 0.75, -0.2, 0.06);
      const t = cyl(body, big ? 1.05 : 0.95, big ? 1.05 : 0.95, 3.4, tank, 0, big ? 1.95 : 1.85, -1.0, 'z'); t.receiveShadow = true;
      for (const z of [-2.3, -1.0, 0.3]) cyl(body, (big ? 1.07 : 0.97), (big ? 1.07 : 0.97), 0.1, c, 0, big ? 1.95 : 1.85, z, 'z');
      if (big) cyl(body, 0.09, 0.09, 1.2, mat(0x1d1d22, 0.8), 0.9, 0.9, -2.3, 'z');
      lights(body, 2.1, 1.0, 2.56, -2.78);
      for (const z of [1.7, -1.3, -2.2]) for (const s of [-1, 1]) wheel(root, wheels, s * 0.98, z, 0.5, 0.34);
      length = 5.4; break;
    }
    case 'rutero': {
      box(body, 2.3, 2.3, 6.6, c, 0, 1.75, 0, 0.3); box(body, 2.34, 0.5, 6.64, mat(0xf2efe6, 0.4), 0, 1.15, 0, 0.1);
      box(body, 2.36, 0.75, 5.4, GLASS, 0, 2.2, -0.3, 0.1); box(body, 2.1, 0.9, 0.1, GLASS, 0, 2.1, 3.28, 0.04);
      box(body, 1.2, 0.3, 0.1, mat(0xffc61a), 0, 2.72, 3.3, 0.04);
      lights(body, 2.3, 0.95, 3.32, -3.32);
      for (const z of [2.2, -2.0]) for (const s of [-1, 1]) wheel(root, wheels, s * 1.08, z, 0.55, 0.36);
      length = 6.6; break;
    }
  }
  return { root, body, wheels, length };
}
