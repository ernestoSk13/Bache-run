import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Track } from './track';
import * as T from './textures';

const A = (f: string) => `${import.meta.env.BASE_URL}assets/torreon/${f}`;

export interface World { scene: THREE.Scene; sun: THREE.DirectionalLight; update(focus: THREE.Vector3): void }

interface Reserved { side: number; s0: number; s1: number }

export async function buildWorld(renderer: THREE.WebGLRenderer, track: Track): Promise<World> {
  const scene = new THREE.Scene();
  const r = T.rng(2026);

  // --- Cielo, sol y polvo -------------------------------------------------
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(205));
  const sky = new Sky(); sky.scale.setScalar(8000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4.5; u.rayleigh.value = 1.1; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.8; u.sunPosition.value.copy(sunDir);
  scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(), sky2 = sky.clone(); envScene.add(sky2);
  scene.environment = pm.fromScene(envScene, 0.02).texture; scene.environmentIntensity = 0.09;
  scene.fog = new THREE.FogExp2(0xc9b48e, 0.0015);

  scene.add(new THREE.HemisphereLight(0xcfe2f0, 0x9c8460, 0.55));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
  scene.add(sun, sun.target);

  // --- Suelo, calle y banquetas -------------------------------------------
  const gt = T.groundTexture(); gt.repeat.set(160, 160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; scene.add(ground);

  const road = new THREE.Mesh(track.ribbon(-track.halfWidth, track.halfWidth, 0, 32), new THREE.MeshLambertMaterial({ map: T.asphaltTexture() }));
  flip(road.geometry); road.receiveShadow = true; scene.add(road);
  const swT = T.sidewalkTexture(), swM = new THREE.MeshLambertMaterial({ map: swT });
  const curbM = new THREE.MeshLambertMaterial({ color: 0xe8b923 });
  for (const s of [-1, 1]) {
    const sw = new THREE.Mesh(track.ribbon(s * track.halfWidth, s * (track.wall + 3), 0.18, 4), swM); sw.receiveShadow = true;
    const curb = new THREE.Mesh(track.ribbon(s * (track.halfWidth - 0.25), s * track.halfWidth, 0.19, 4), curbM);
    if (s > 0) { flip(sw.geometry); flip(curb.geometry); }
    scene.add(sw, curb);
  }

  // --- Fotos reales de Torreon --------------------------------------------
  const names = ['fachada_galicia.jpg', 'fachada_teatro.jpg', 'cerro_noas.png', 'esp_cristo.jpg', 'esp_plaza.jpg', 'esp_nazas.jpg', 'esp_canal.jpg', 'esp_reloj.jpg', 'esp_plaza_mayor.jpg'];
  const img: Record<string, HTMLImageElement> = {};
  await Promise.all(names.map(async (n) => { try { img[n] = await T.loadImage(A(n)); } catch { /* sin foto: se usa textura generada */ } }));

  // Horizonte: silueta del Cerro de las Noas recortada de una foto, al sur de la pista.
  if (img['cerro_noas.png']) {
    const mt = T.photoTexture(img['cerro_noas.png']); mt.wrapS = THREE.MirroredRepeatWrapping; mt.repeat.set(3, 1);
    const mm = new THREE.MeshBasicMaterial({ map: mt, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false, color: 0xe9dcc4 });
    const back = new THREE.Mesh(new THREE.CylinderGeometry(1700, 1700, 330, 64, 1, true, Math.PI * 1.05, Math.PI * 0.9), mm);
    back.position.y = 120; back.renderOrder = -1; scene.add(back);
  }

  const reserved: Reserved[] = [];
  const place = (obj: THREE.Object3D, s: number, lat: number, face = 0) => {
    track.at(s, lat, obj.position); obj.rotation.y = track.heading(s) + face; scene.add(obj);
  };
  const roofM = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 });
  const sideM = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
  /** Caja con la fachada hacia la calle. El eje X local sigue la calle. */
  const building = (w: number, h: number, d: number, front: THREE.Material, side: THREE.Material, s: number, sgn: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), [front, front, roofM, roofM, side, side]);
    m.castShadow = true; m.receiveShadow = true;
    place(m, s, sgn * (track.wall + 3.2 + d / 2)); m.position.y = h / 2;
    reserved.push({ side: sgn, s0: s - w / 2 - 2, s1: s + w / 2 + 2 });
    return m;
  };

  // Tecnica 1: fachada proyectada. La foto rectificada es la cara del edificio.
  if (img['fachada_galicia.jpg']) building(34, 20, 16, new THREE.MeshStandardMaterial({ map: T.galiciaTexture(img['fachada_galicia.jpg']), roughness: 0.9 }), sideM(0x7c3a2c), track.length * 0.115, 1);
  if (img['fachada_teatro.jpg']) building(26, 26, 20, new THREE.MeshStandardMaterial({ map: T.photoTexture(img['fachada_teatro.jpg']), roughness: 0.9 }), sideM(0xd9cf9a), track.length * 0.19, 1);

  // Tecnica 2: espectaculares. La foto turistica junto a la realidad de la calle.
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.7 });
  const esp = (file: string, lines: string[], sFrac: number, sgn: number) => {
    const g = new THREE.Group(), s = track.length * sFrac;
    const photo = img[file] ? new THREE.MeshBasicMaterial({ map: T.photoTexture(img[file]) }) : new THREE.MeshStandardMaterial({ color: 0x0b6b4a });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), photo); p.position.y = 15; g.add(p);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: T.textPanel(lines, '#0b6b4a', '#ffffff', 1024, 192) })); c.position.y = 9.4; g.add(c);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(16.6, 11.8, 0.5), steel); fr.position.set(0, 13.4, -0.3); fr.castShadow = true; g.add(fr);
    for (const x of [-5, 5]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 8, 10), steel); pole.position.set(x, 4, -0.3); pole.castShadow = true; g.add(pole); }
    place(g, s, sgn * (track.wall + 7), Math.PI + sgn * 0.5);
    reserved.push({ side: sgn, s0: s - 10, s1: s + 10 });
  };
  esp('esp_cristo.jpg', ['TORREÓN TE ABRAZA', 'y te cobra la alineación'], 0.045, 1);
  esp('esp_nazas.jpg', ['EL NAZAS CON AGUA', 'Foto de archivo. No se garantiza existencia'], 0.30, 1);
  esp('esp_plaza.jpg', ['CENTRO HISTÓRICO', 'Histórico también el bache de la esquina'], 0.44, -1);
  esp('esp_canal.jpg', ['CANAL DE LA PERLA', 'Lo único subterráneo que sí se terminó'], 0.58, 1);
  esp('esp_reloj.jpg', ['EL RELOJ SÍ DA LA HORA', 'La obra de enfrente, no'], 0.72, 1);
  esp('esp_plaza_mayor.jpg', ['OBRA TERMINADA*', '*Etapa 1 de 9'], 0.88, 1);

  // --- Ciudad generada ----------------------------------------------------
  const low = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => new THREE.MeshStandardMaterial({ map: T.lowriseTexture(100 + i, i % 3 === 0 ? 1 : 2), roughness: 0.92 }));
  const towerT = [0, 1, 2, 3].map((i) => T.towerTexture(200 + i));
  const sideCols = [0xb9a98c, 0xa39a8c, 0xc4b08a, 0x9c8f80];
  const free = (sgn: number, a: number, b: number) => !reserved.some((q) => q.side === sgn && a < q.s1 && b > q.s0);
  for (const sgn of [-1, 1]) {
    let s = 6;
    while (s < track.length - 14) {
      const tall = r() < 0.16, w = 12 + r() * 12, d = 12 + r() * 8, h = tall ? 18 + r() * 34 : (r() < 0.35 ? 5 : 8.5) + r() * 1.5;
      const mid = s + w / 2, i = track.idx(mid), inner = track.curv[i] * sgn > 0; // lado interno de la curva: las cajas se enciman
      const lat = sgn * (track.wall + 3.2 + d / 2), c = track.at(mid, lat), nr = track.nearest(c.x, c.z);
      const clash = Math.abs(nr.lat) < track.wall + d * 0.5 + 1;
      if (free(sgn, s, s + w) && !clash && !(inner && Math.abs(track.curv[i]) > 0.006)) {
        let front: THREE.Material;
        if (tall) { const t = towerT[(r() * 4) | 0].clone(); t.repeat.set(Math.round(w / 12), Math.round(h / 12)); t.needsUpdate = true; front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); }
        else front = low[(r() * low.length) | 0];
        building(w, h, d, front, sideM(sideCols[(r() * 4) | 0]), mid, sgn);
        if (!tall && r() < 0.5) { // tinaco en la azotea
          const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.6 }));
          track.at(mid + (r() - 0.5) * w * 0.5, lat, tk.position); tk.position.y = h + 0.8; tk.castShadow = true; scene.add(tk);
        }
      }
      s += w + 0.6 + r() * 2.5;
    }
  }

  // Relleno: manzanas alrededor y dentro del circuito, y la plaza al centro.
  const PLAZA = new THREE.Vector3(-25, 0, 5), PR = 58;
  for (let x = -470; x <= 470; x += 44) for (let z = -330; z <= 350; z += 44) {
    const bx = x + (r() - 0.5) * 12, bz = z + (r() - 0.5) * 12, nr = track.nearest(bx, bz);
    if (Math.abs(nr.lat) < track.wall + 34 || Math.hypot(bx - PLAZA.x, bz - PLAZA.z) < PR + 16 || r() < 0.12) continue;
    const tall = r() < 0.14, w = 16 + r() * 14, d = 16 + r() * 12, h = tall ? 16 + r() * 30 : 4.5 + r() * 5;
    let front: THREE.Material;
    if (tall) { const t = towerT[(r() * 4) | 0].clone(); t.repeat.set(Math.round(w / 12), Math.round(h / 12)); t.needsUpdate = true; front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); }
    else front = low[(r() * low.length) | 0];
    const m = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), [front, front, roofM, roofM, front, front]);
    m.position.set(bx, h / 2, bz); m.rotation.y = r() < 0.5 ? 0 : Math.PI / 2; m.castShadow = !tall ? false : true; m.receiveShadow = true; scene.add(m);
  }
  const grass = new THREE.Mesh(new THREE.CircleGeometry(PR, 40), new THREE.MeshStandardMaterial({ color: 0x5f8a4a, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(PLAZA.x, 0.02, PLAZA.z); grass.receiveShadow = true; scene.add(grass);
  const kio = new THREE.Group(), kb = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.9 })); kb.position.y = 0.7;
  const kr = new THREE.Mesh(new THREE.ConeGeometry(7, 3, 8), new THREE.MeshStandardMaterial({ color: 0x8c2f24, roughness: 0.8 })); kr.position.y = 7; kr.castShadow = true;
  kio.add(kb, kr); for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.4, 8), new THREE.MeshStandardMaterial({ color: 0xf4f1ea })); c.position.set(Math.cos(i * Math.PI / 4) * 5.4, 3.4, Math.sin(i * Math.PI / 4) * 5.4); kio.add(c); }
  kio.position.copy(PLAZA); scene.add(kio);

  // --- Mobiliario: postes, palmas, arco de salida -------------------------
  const poleG = new THREE.CylinderGeometry(0.12, 0.16, 9, 8), armG = new THREE.BoxGeometry(2.6, 0.12, 0.12), lampG = new THREE.BoxGeometry(0.7, 0.14, 0.3);
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe9a0, emissiveIntensity: 0.6 });
  for (let s = 20; s < track.length; s += 46) for (const sgn of [-1, 1]) {
    const g = new THREE.Group(), p = new THREE.Mesh(poleG, steel); p.position.y = 4.5; p.castShadow = true;
    const a = new THREE.Mesh(armG, steel); a.position.set(-1.2 * sgn, 8.9, 0);
    const l = new THREE.Mesh(lampG, lampM); l.position.set(-2.4 * sgn, 8.8, 0);
    g.add(p, a, l); place(g, s + (sgn > 0 ? 0 : 23), sgn * (track.halfWidth + 1.2));
  }
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x7b6348, roughness: 1 }), leafM = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.9, side: THREE.DoubleSide });
  const frondG = new THREE.ConeGeometry(0.55, 4.2, 5); frondG.translate(0, -2.1, 0);
  const palm = (h: number) => {
    const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, h, 8), trunkM); t.position.y = h / 2; t.castShadow = true; g.add(t);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(frondG, leafM); f.position.y = h; f.rotation.set(0, 0, 0); f.rotation.order = 'YXZ'; f.rotation.y = (i / 9) * Math.PI * 2; f.rotation.x = Math.PI * (0.58 + (i % 2) * 0.12); f.scale.set(1, 1, 0.25); f.castShadow = true; g.add(f); }
    return g;
  };
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 14 + r() * (PR - 18), p = palm(6 + r() * 5); p.position.set(PLAZA.x + Math.cos(a) * d, 0, PLAZA.z + Math.sin(a) * d); scene.add(p); }
  for (let s = 8; s < track.length; s += 31) { const sgn = r() < 0.5 ? -1 : 1; place(palm(7 + r() * 4), s, sgn * (track.halfWidth + 2.6)); }

  const arch = new THREE.Group();
  for (const x of [-9.6, 9.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 9, 0.9), new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.6 })); p.position.set(x, 4.5, 0); p.castShadow = true; arch.add(p); }
  const banM = new THREE.MeshBasicMaterial({ map: T.textPanel(['BACHE RUN', 'GRAN PREMIO DE LA LAGUNA'], '#ffc61a', '#1b1a1d', 1024, 192) });
  const ban = new THREE.Mesh(new THREE.BoxGeometry(20, 3.4, 0.5), [roofM, roofM, roofM, roofM, banM, banM]); ban.position.y = 8.6; ban.castShadow = true; arch.add(ban);
  place(arch, 0, 0);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(track.halfWidth * 2, 2), new THREE.MeshStandardMaterial({ map: T.checkerTexture(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  line.rotation.x = -Math.PI / 2; const lg = new THREE.Group(); lg.add(line); place(lg, 0, 0); lg.position.y = 0.02;

  // Cerro con el Cristo estilizado, visible entre el polvo al sur.
  const hill = new THREE.Mesh(new THREE.ConeGeometry(420, 170, 11, 3), new THREE.MeshStandardMaterial({ color: 0xa8916c, roughness: 1, flatShading: true }));
  const hp = hill.geometry.attributes.position; for (let i = 0; i < hp.count; i++) hp.setXYZ(i, hp.getX(i) * (0.85 + r() * 0.3), hp.getY(i) * (0.92 + r() * 0.12), hp.getZ(i) * (0.85 + r() * 0.3));
  hill.geometry.computeVertexNormals(); hill.position.set(-120, 78, 860); scene.add(hill);
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.7 }), cr = new THREE.Group();
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 30, 10), white); b1.position.y = 15;
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(30, 3.4, 3), white); b2.position.y = 25;
  const b3 = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 10), white); b3.position.y = 32.5;
  cr.add(b1, b2, b3); cr.position.set(-120, 160, 860); scene.add(cr);

  return {
    scene, sun,
    update(focus) { sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(sunDir, 180); },
  };
}

function flip(g: THREE.BufferGeometry) {
  const i = g.index!; for (let k = 0; k < i.count; k += 3) { const a = i.getX(k); i.setX(k, i.getX(k + 1)); i.setX(k + 1, a); }
  g.computeVertexNormals();
}
