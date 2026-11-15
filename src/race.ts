import * as THREE from 'three';
import { Track } from './track';
import { VehicleDef, VehicleModel, buildVehicle, VEHICLES } from './vehicles';
import * as T from './textures';

export type ItemId = 'gordita' | 'llanta' | 'bache';
export const ITEM_NAMES: Record<ItemId, string> = { gordita: 'GORDITA DE CHICHARRÓN', llanta: 'LLANTA DE REFACCIÓN', bache: 'BACHE PORTÁTIL' };
export interface Input { throttle: number; steer: number; drift: boolean; item: boolean }
export interface Bache { x: number; z: number; s: number; lat: number; r: number; type: 0 | 1 | 2; mesh: THREE.Mesh; temp: boolean; alive: boolean }
interface Box { x: number; z: number; mesh: THREE.Mesh; cool: number }
export interface RaceEvent { kind: 'bache' | 'flat' | 'item' | 'shield' | 'boost' | 'lap' | 'finish'; car: Car; value?: number; text?: string }

export const LAPS = 3;
const DMG = [0, 9, 17];

export class Car {
  model: VehicleModel;
  x = 0; z = 0; h = 0; vx = 0; vz = 0;
  near = -1; s = 0; lat = 0; lap = -1; progress = 0;
  susp = 100; flat = 0; boost = 0; heat = 0; shield = false; item: ItemId | null = null; itemT = 0;
  driftT = 0; drifting = false; offroad = false; located = false; lastLap = 0; stall = 0; stuckT = 0;
  hits = 0; dodged = 0; flats = 0; streak = 0; bestStreak = 0;
  finished = false; time = 0; bestLap = Infinity; lapStart = 0; place = 1;
  bounce = 0; bounceV = 0; roll = 0; pitch = 0;
  aiLat = 0; aiSkill = 1; aiNext = 0; cool = new Map<Bache, number>(); seen = new Set<Bache>();
  shieldMesh: THREE.Mesh;
  readonly maxSpeed: number; readonly accel: number; readonly turn: number; readonly dmgK: number;
  constructor(public def: VehicleDef, public isPlayer: boolean, public id: number) {
    this.model = buildVehicle(def);
    this.maxSpeed = 27 + def.vel * 1.15; this.accel = 8 + def.ace * 1.5; this.turn = 1.55 + def.man * 0.13; this.dmgK = 1.7 - def.sus * 0.11;
    this.shieldMesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.2, 10, 20), new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.9 }));
    this.shieldMesh.position.set(0, 3.2, -0.6); this.shieldMesh.visible = false; this.model.root.add(this.shieldMesh);
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
}

export class Race {
  cars: Car[] = []; player!: Car; baches: Bache[] = []; boxes: Box[] = [];
  time = 0; started = false; over = false; events: RaceEvent[] = [];
  private bacheMats: THREE.Material[]; private bacheGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  private dust: Dust; private r = T.rng(99);
  puddles: { x: number; z: number; r: number }[] = [];

  constructor(public track: Track, public scene: THREE.Object3D, playerId: string, public difficulty = 1) {
    this.bacheMats = [0, 1, 2].map((t) => new THREE.MeshStandardMaterial({ map: T.bacheTexture(31 + t, t === 2), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    this.dust = new Dust(scene);
    // Parrilla: el jugador sale ultimo.
    const order = [...VEHICLES.filter((v) => v.id !== playerId), VEHICLES.find((v) => v.id === playerId)!];
    order.forEach((def, i) => {
      const c = new Car(def, def.id === playerId, i), row = i, s = track.length - 8 - row * 6.5, lat = i % 2 ? -3.4 : 3.4;
      const p = track.at(s, lat); c.x = p.x; c.z = p.z; c.h = track.heading(s);
      c.aiLat = lat; c.aiSkill = 0.86 + this.r() * 0.16 + (difficulty - 1) * 0.06;
      scene.add(c.model.root); this.cars.push(c); if (c.isPlayer) this.player = c;
      c.place = i + 1; this.locate(c); this.sync(c, 0);
    });
    this.spawnBaches(); this.spawnBoxes(); this.spawnPuddles();
  }

  private addBache(s: number, lat: number, type: 0 | 1 | 2, temp = false) {
    const r = [1.0, 1.5, 2.0][type], p = this.track.at(s, lat);
    const mesh = new THREE.Mesh(this.bacheGeo, this.bacheMats[type]); mesh.scale.set(r * 1.25, 1, r * (0.95 + this.r() * 0.5)); mesh.rotation.y = this.r() * 6.28;
    mesh.position.set(p.x, 0.03 + this.baches.length * 0.0004, p.z); mesh.receiveShadow = true; this.scene.add(mesh);
    const b: Bache = { x: p.x, z: p.z, s, lat, r, type, mesh, temp, alive: true }; this.baches.push(b); return b;
  }

  private spawnBaches() {
    const n = Math.round(62 + this.difficulty * 14), L = this.track.length;
    const coneM = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.6 }), coneG = new THREE.ConeGeometry(0.32, 0.95, 12), stripeG = new THREE.CylinderGeometry(0.2, 0.25, 0.16, 12), stripeM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea });
    for (let i = 0; i < n; i++) {
      const s = 45 + this.r() * (L - 150), lat = (this.r() * 2 - 1) * (this.track.halfWidth - 1.6), k = this.r();
      const type: 0 | 1 | 2 = k < 0.5 ? 0 : k < 0.86 ? 1 : 2;
      if (this.baches.some((b) => Math.abs(b.s - s) < 5 && Math.abs(b.lat - lat) < 3.5)) continue;
      const b = this.addBache(s, lat, type);
      if (type === 2) { // los hondos traen su propio cono
        const c = new THREE.Mesh(coneG, coneM), st = new THREE.Mesh(stripeG, stripeM); c.position.set(b.x + 1.2, 0.48, b.z + 1.2); st.position.set(b.x + 1.2, 0.55, b.z + 1.2); c.castShadow = true; this.scene.add(c, st);
      }
    }
  }

  private spawnBoxes() {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5), tex = T.textPanel(['DESPENSA', '?'], '#ffc61a', '#1b1a1d', 256, 256);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0x553a00, emissiveIntensity: 0.5 });
    for (const f of [0.14, 0.4, 0.66, 0.9]) for (const lat of [-5.2, -1.8, 1.8, 5.2]) {
      const p = this.track.at(this.track.length * f, lat), mesh = new THREE.Mesh(geo, mat); mesh.position.set(p.x, 1.5, p.z); mesh.castShadow = true; this.scene.add(mesh);
      this.boxes.push({ x: p.x, z: p.z, mesh, cool: 0 });
    }
  }

  private spawnPuddles() {
    const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ map: T.puddleTexture(), transparent: true, depthWrite: false, roughness: 0.04, metalness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    for (const [f, lat, r] of [[0.33, 3.5, 5], [0.62, -3, 4.5], [0.81, 1, 5.5]]) {
      const p = this.track.at(this.track.length * f, lat), m = new THREE.Mesh(geo, mat); m.scale.set(r, 1, r * 0.8); m.position.set(p.x, 0.05, p.z); m.rotation.y = this.track.heading(this.track.length * f); this.scene.add(m);
      this.puddles.push({ x: p.x, z: p.z, r: r * 0.9 });
    }
  }

  private locate(c: Car) {
    const L = this.track.length, n = this.track.nearest(c.x, c.z, c.near), prev = c.s;
    c.near = n.i; c.lat = n.lat;
    if (c.located) { const d = n.s - prev; if (d < -L / 2) c.lap++; else if (d > L / 2) c.lap--; }
    c.located = true; c.s = n.s; c.progress = c.lap * L + c.s;
  }

  private ai(c: Car, dt: number): Input {
    const tr = this.track, v = c.speed;
    c.aiNext -= dt;
    if (c.aiNext <= 0) { c.aiNext = 1.5 + this.r() * 3; c.aiLat = THREE.MathUtils.clamp(c.aiLat + (this.r() - 0.5) * 5, -5.5, 5.5); }
    // Esquivar baches que vienen de frente (no siempre lo logran).
    let lat = c.aiLat;
    for (const b of this.baches) {
      if (!b.alive) continue; let ds = b.s - c.s; if (ds < -tr.length / 2) ds += tr.length;
      if (ds > 2 && ds < 12 + v * 0.7 && Math.abs(b.lat - c.lat) < b.r + 1.3) {
        if (!c.seen.has(b)) { c.seen.add(b); if (this.r() > 0.42 * c.aiSkill + b.type * 0.12) c.cool.set(b, -1); }
        if (c.cool.get(b) !== -1) lat = b.lat + (c.lat >= b.lat ? 1 : -1) * (b.r + 1.6);
      }
    }
    lat = THREE.MathUtils.clamp(lat, -6.3, 6.3);
    const look = 9 + v * 0.55, tp = tr.at(c.s + look, lat);
    let d = Math.atan2(tp.x - c.x, tp.z - c.z) - c.h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    let cmax = 0; for (let k = 0; k < 14; k++) cmax = Math.max(cmax, Math.abs(tr.curv[tr.idx(c.s + k * 4 + v * 0.3)]));
    const gap = this.player.progress - c.progress;
    const band = 1 + THREE.MathUtils.clamp(gap / 400, -0.06, 0.08);
    const vT = Math.min(c.maxSpeed * band * c.aiSkill, Math.sqrt((19 + c.def.man) * c.aiSkill / Math.max(cmax, 1e-4)));
    if (c.item) { c.itemT -= dt; }
    return { throttle: v < vT ? 1 : v > vT + 4 ? -1 : 0, steer: THREE.MathUtils.clamp(d * 2.6, -1, 1), drift: false, item: !!c.item && c.itemT <= 0 };
  }

  private useItem(c: Car) {
    const it = c.item; if (!it) return; c.item = null;
    if (it === 'gordita') { c.boost = c.def.id === 'lonches' ? 2.6 : 2; c.heat += 1; this.events.push({ kind: 'boost', car: c }); }
    if (it === 'llanta') { c.shield = true; c.shieldMesh.visible = true; }
    if (it === 'bache') { const b = this.addBache(c.s - c.model.length * 0.5 - 3, c.lat, 1, true); c.cool.set(b, this.time + 3); }
  }

  private step(c: Car, inp: Input, dt: number) {
    const tr = this.track;
    if (c.finished) inp = { ...this.ai(c, dt), item: false };
    if (c.flat > 0) { c.flat -= dt; inp = { throttle: 0, steer: 0, drift: false, item: false }; if (c.flat <= 0) c.susp = 50; }
    if (c.stall > 0) { c.stall -= dt; inp = { ...inp, throttle: 0 }; }
    if (inp.item) this.useItem(c);
    let onPuddle = false; if (c.def.id !== 'pipero') for (const p of this.puddles) if (Math.hypot(c.x - p.x, c.z - p.z) < p.r) onPuddle = true;
    c.offroad = Math.abs(c.lat) > tr.halfWidth;
    // Direccion
    const fx0 = Math.sin(c.h), fz0 = Math.cos(c.h), vf0 = c.vx * fx0 + c.vz * fz0;
    const wasDrift = c.drifting; c.drifting = inp.drift && Math.abs(vf0) > 9 && Math.abs(inp.steer) > 0.15 && c.flat <= 0;
    if (c.drifting) c.driftT += dt; else { if (wasDrift && c.driftT > 0.9) { c.boost = Math.max(c.boost, 0.7); this.events.push({ kind: 'boost', car: c }); } c.driftT = 0; }
    const sf = THREE.MathUtils.clamp(Math.abs(vf0) / 7, 0, 1), turn = c.turn * (c.drifting ? 1.3 : 1) / (1 + Math.abs(vf0) / 60);
    c.h += inp.steer * turn * sf * Math.sign(vf0 || 1) * dt;
    // Velocidad en el marco del vehiculo
    const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx;
    let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz;
    const maxV = c.maxSpeed * (c.offroad ? 0.62 : 1) * (c.boost > 0 ? 1.32 : 1) * (c.susp < 30 ? 0.93 : 1);
    if (c.boost > 0) { c.boost -= dt; vf += 16 * dt; }
    if (inp.throttle > 0) vf += c.accel * inp.throttle * THREE.MathUtils.clamp(1 - vf / maxV, -0.6, 1) * dt * (vf < 0 ? 2.5 : 1);
    else if (inp.throttle < 0) vf -= (vf > 0.5 ? 30 : 9) * dt;
    if (vf > maxV) vf -= Math.min(vf - maxV, 14 * dt);
    vf -= vf * (c.offroad ? 0.55 : 0.18) * dt; if (vf < -9) vf = -9;
    if (c.flat > 0) vf *= Math.exp(-3.5 * dt);
    const grip = onPuddle ? 0.5 : c.drifting ? 2.4 : 6.5 + c.def.man * 0.25; vl *= Math.exp(-grip * dt);
    c.vx = fx * vf + rx * vl; c.vz = fz * vf + rz * vl;
    c.x += c.vx * dt; c.z += c.vz * dt;
    this.locate(c);
    // Bardas: no se puede salir de la banqueta.
    const lim = tr.wall + 1.6;
    if (Math.abs(c.lat) > lim) {
      const i = c.near, nx = tr.tz[i], nz = -tr.tx[i], sg = Math.sign(c.lat), over = Math.abs(c.lat) - lim;
      c.x -= nx * sg * over; c.z -= nz * sg * over; const vn = (c.vx * nx + c.vz * nz) * sg;
      if (vn > 0) { c.vx -= nx * sg * vn * 1.3; c.vz -= nz * sg * vn * 1.3; if (vn > 5) { c.vx *= 0.7; c.vz *= 0.7; } }
      c.lat = sg * lim;
    }
    if (c.heat > 0) c.heat = Math.max(0, c.heat - dt * 0.12);
    // Rival atorado contra una barda: se reacomoda al centro del carril.
    if (!c.isPlayer && c.flat <= 0 && c.stall <= 0) { c.stuckT = c.speed < 2.5 ? c.stuckT + dt : 0; if (c.stuckT > 2.5) { const q = tr.at(c.s + 4, 0); c.x = q.x; c.z = q.z; c.h = tr.heading(c.s + 4); c.vx = c.vz = 0; c.stuckT = 0; this.locate(c); } }
    // Baches
    for (const b of this.baches) {
      if (!b.alive) continue; const dx = c.x - b.x, dz = c.z - b.z;
      if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
      const d = Math.hypot(dx, dz), cd = c.cool.get(b) ?? 0;
      if (d < b.r + 0.75 && this.time <= cd) c.cool.set(b, this.time + 1.2); // sigue encima: no vuelve a danar
      if (d < b.r + 0.75 && this.time > cd && c.flat <= 0) {
        c.cool.set(b, this.time + 1.2);
        if (c.shield) { c.shield = false; c.shieldMesh.visible = false; this.events.push({ kind: 'shield', car: c }); }
        else {
          const dmg = Math.round(DMG[b.type] * c.dmgK); const k = [0.86, 0.72, 0.5][b.type];
          c.vx *= k; c.vz *= k; c.susp -= dmg; c.hits++; c.streak = 0; c.bounceV = 3 + b.type * 2.2;
          this.events.push({ kind: 'bache', car: c, value: dmg });
          if (c.susp <= 0) { c.susp = 0; c.flat = 2; c.flats++; this.events.push({ kind: 'flat', car: c }); }
        }
        if (b.temp) { b.alive = false; b.mesh.visible = false; }
      } else if (c.isPlayer && d < b.r + 3.2 && d >= b.r + 0.75 && !c.seen.has(b)) {
        c.seen.add(b); // paso rozando
      }
    }
    // Cajas de despensa
    for (const bx of this.boxes) if (bx.cool <= 0 && !c.item && Math.hypot(c.x - bx.x, c.z - bx.z) < 2.1) {
      bx.cool = 4; bx.mesh.visible = false;
      const back = (c.place - 1) / 7, k = this.r();
      c.item = k < 0.25 + back * 0.4 ? 'gordita' : k < 0.62 + back * 0.2 ? 'llanta' : 'bache'; c.itemT = 1 + this.r() * 3;
      this.events.push({ kind: 'item', car: c });
    }
    // Vueltas y meta
    if (!c.finished) {
      const lapNow = Math.max(0, c.lap);
      if (c.lap > 0 && lapNow > c.lastLap) { const lt = this.time - c.lapStart; c.bestLap = Math.min(c.bestLap, lt); c.lapStart = this.time; this.events.push({ kind: 'lap', car: c, value: lapNow + 1 }); }
      c.lastLap = lapNow;
      if (c.lap >= LAPS) { c.finished = true; c.time = this.time; this.events.push({ kind: 'finish', car: c }); }
    }
    this.sync(c, dt);
    if (vf > 6 && (c.offroad || c.drifting)) this.dust.emit(c.x - fx * 1.6, c.z - fz * 1.6, c.offroad ? 0xcdb48a : 0xbdbdbd);
  }

  private sync(c: Car, dt: number) {
    const m = c.model, fx = Math.sin(c.h), fz = Math.cos(c.h), vf = c.vx * fx + c.vz * fz, vl = -c.vx * fz + c.vz * fx;
    c.bounceV -= (c.bounce * 90 + c.bounceV * (4 + c.susp * 0.09)) * dt; c.bounce += c.bounceV * dt;
    if (c.speed > 4) c.bounceV += (this.r() - 0.5) * (c.offroad ? 14 : 2.5 + (100 - c.susp) * 0.05) * dt * 6;
    c.roll += (THREE.MathUtils.clamp(vl * 0.03, -0.14, 0.14) - c.roll) * Math.min(1, dt * 8);
    m.root.position.set(c.x, c.offroad ? 0.18 : 0, c.z); m.root.rotation.y = c.h;
    m.body.position.y = Math.max(-0.1, c.bounce * 0.12); m.body.rotation.z = c.roll + (c.flat > 0 ? 0.07 : 0); m.body.rotation.x = -c.bounce * 0.02;
    for (const w of m.wheels) w.rotation.x += vf * dt / 0.45;
    if (c.shield) c.shieldMesh.rotation.y += dt * 2;
  }

  update(dt: number, playerInput: Input) {
    if (!this.started) { for (const c of this.cars) this.sync(c, dt); this.dust.update(dt); return; }
    this.time += dt;
    for (const c of this.cars) this.step(c, c.isPlayer ? playerInput : this.ai(c, dt), dt);
    // Choques entre vehiculos
    for (let i = 0; i < this.cars.length; i++) for (let j = i + 1; j < this.cars.length; j++) {
      const a = this.cars[i], b = this.cars[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 2.5;
      if (d < min && d > 0.001) {
        const nx = dx / d, nz = dz / d, push = (min - d), ma = a.def.mass, mb = b.def.mass, t = ma + mb;
        a.x -= nx * push * mb / t; a.z -= nz * push * mb / t; b.x += nx * push * ma / t; b.z += nz * push * ma / t;
        const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rel < 0) { const jmp = -rel * 1.3; a.vx -= nx * jmp * mb / t; a.vz -= nz * jmp * mb / t; b.vx += nx * jmp * ma / t; b.vz += nz * jmp * ma / t; }
      }
    }
    const order = [...this.cars].sort((a, b) => (a.finished && b.finished ? a.time - b.time : a.finished ? -1 : b.finished ? 1 : b.progress - a.progress));
    order.forEach((c, i) => (c.place = i + 1));
    for (const bx of this.boxes) { bx.mesh.rotation.y += dt * 1.5; bx.mesh.rotation.x += dt * 0.7; if (bx.cool > 0) { bx.cool -= dt; if (bx.cool <= 0) bx.mesh.visible = true; } }
    // Baches esquivados por el jugador: los que quedaron atras sin tocarlos.
    const p = this.player;
    for (const b of p.seen) { const cd = p.cool.get(b) ?? 0; let ds = p.s - b.s; if (ds < -this.track.length / 2) ds += this.track.length; if (ds > b.r + 4 && ds < 30) { p.seen.delete(b); if (this.time > cd + 3) { p.dodged++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak); } } }
    this.dust.update(dt);
    if (p.finished && !this.over) this.over = true;
  }

  standings() { return [...this.cars].sort((a, b) => a.place - b.place); }
}

/** Polvo: particulas baratas con un solo draw call. */
class Dust {
  private n = 220; private pos: Float32Array; private life: Float32Array; private col: Float32Array; private vel: Float32Array; private pts: THREE.Points; private k = 0; private acc = 0;
  constructor(scene: THREE.Object3D) {
    this.pos = new Float32Array(this.n * 3).fill(-999); this.life = new Float32Array(this.n); this.col = new Float32Array(this.n * 3); this.vel = new Float32Array(this.n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('life', new THREE.BufferAttribute(this.life, 1)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { map: { value: T.dustSprite() } },
      vertexShader: 'attribute float life; attribute vec3 color; varying float vL; varying vec3 vC; void main(){ vL=life; vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=(1.0+(1.0-life)*3.0)*260.0/-mv.z; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vL; varying vec3 vC; void main(){ float a=texture2D(map,gl_PointCoord).a*vL*0.55; if(a<0.01) discard; gl_FragColor=vec4(vC,a); }',
    });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  emit(x: number, z: number, color: number) {
    if (++this.acc % 2) return; const i = this.k = (this.k + 1) % this.n, c = new THREE.Color(color);
    this.pos.set([x + (Math.random() - 0.5), 0.4, z + (Math.random() - 0.5)], i * 3); this.vel.set([(Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2], i * 3);
    this.col.set([c.r, c.g, c.b], i * 3); this.life[i] = 1;
  }
  update(dt: number) {
    for (let i = 0; i < this.n; i++) if (this.life[i] > 0) { this.life[i] = Math.max(0, this.life[i] - dt * 0.9); for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt; if (this.life[i] === 0) this.pos[i * 3 + 1] = -999; }
    const g = this.pts.geometry; g.attributes.position.needsUpdate = true; g.attributes.life.needsUpdate = true; g.attributes.color.needsUpdate = true;
  }
}
