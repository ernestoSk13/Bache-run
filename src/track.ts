import * as THREE from 'three';

export interface Near { i: number; s: number; lat: number }

/** Circuito cerrado definido por una curva; todo el juego consulta posiciones como (s, lat). */
export class Track {
  readonly n: number;
  readonly px: Float32Array; readonly pz: Float32Array;
  readonly tx: Float32Array; readonly tz: Float32Array;
  readonly curv: Float32Array;
  readonly length: number;
  readonly ds: number;
  readonly halfWidth = 8;
  readonly wall = 12;

  constructor(pts: [number, number][], n = 900) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    curve.arcLengthDivisions = 4000;
    const sp = curve.getSpacedPoints(n);
    this.n = n; this.length = curve.getLength(); this.ds = this.length / n;
    this.px = new Float32Array(n); this.pz = new Float32Array(n);
    this.tx = new Float32Array(n); this.tz = new Float32Array(n); this.curv = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.px[i] = sp[i].x; this.pz[i] = sp[i].z; }
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n;
      const dx = this.px[b] - this.px[a], dz = this.pz[b] - this.pz[a], l = Math.hypot(dx, dz);
      this.tx[i] = dx / l; this.tz[i] = dz / l;
    }
    for (let i = 0; i < n; i++) {
      const a = (i + n - 3) % n, b = (i + 3) % n;
      let d = Math.atan2(this.tx[b], this.tz[b]) - Math.atan2(this.tx[a], this.tz[a]);
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.curv[i] = d / (6 * this.ds);
    }
  }

  idx(s: number) { return ((Math.round(s / this.ds) % this.n) + this.n) % this.n; }

  /** Punto de la pista mas cercano. `hint` acelera la busqueda (indice anterior) o -1 para buscar en todo. */
  nearest(x: number, z: number, hint = -1): Near {
    let best = 0, bd = Infinity;
    const scan = (i: number) => { const dx = x - this.px[i], dz = z - this.pz[i], d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } };
    if (hint < 0) for (let i = 0; i < this.n; i++) scan(i);
    else for (let k = -24; k <= 24; k++) scan((hint + k + this.n) % this.n);
    const dx = x - this.px[best], dz = z - this.pz[best];
    const along = dx * this.tx[best] + dz * this.tz[best];
    const lat = dx * this.tz[best] - dz * this.tx[best];
    let s = best * this.ds + along;
    if (s < 0) s += this.length; if (s >= this.length) s -= this.length;
    return { i: best, s, lat };
  }

  /** Posicion en el mundo de (s, lat). lat positivo = izquierda del sentido de carrera. */
  at(s: number, lat: number, out = new THREE.Vector3()) {
    const f = ((s / this.ds) % this.n + this.n) % this.n, i = Math.floor(f), j = (i + 1) % this.n, u = f - i;
    const x = this.px[i] + (this.px[j] - this.px[i]) * u, z = this.pz[i] + (this.pz[j] - this.pz[i]) * u;
    const tx = this.tx[i] + (this.tx[j] - this.tx[i]) * u, tz = this.tz[i] + (this.tz[j] - this.tz[i]) * u;
    return out.set(x + tz * lat, 0, z - tx * lat);
  }

  heading(s: number) { const i = this.idx(s); return Math.atan2(this.tx[i], this.tz[i]); }

  /** Cinta de geometria entre dos desplazamientos laterales. */
  ribbon(latA: number, latB: number, y: number, vScale: number) {
    const n = this.n, pos = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4), idx: number[] = [];
    for (let k = 0; k <= n; k++) {
      const i = k % n, nx = this.tz[i], nz = -this.tx[i];
      pos.set([this.px[i] + nx * latA, y, this.pz[i] + nz * latA, this.px[i] + nx * latB, y, this.pz[i] + nz * latB], k * 6);
      uv.set([0, k * this.ds / vScale, 1, k * this.ds / vScale], k * 4);
      if (k < n) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
}

/** Pista 1: Bulevar Bachependencia. Trazo propio inspirado en la cuadricula del centro de Torreon. */
export const BACHEPENDENCIA: [number, number][] = [
  [-40, -134], [90, -132], [215, -126], [276, -78], [280, 0], [236, 58],
  [160, 62], [100, 30], [40, 60], [10, 122], [-70, 150], [-150, 128], [-200, 160],
  [-262, 132], [-286, 50], [-280, -60], [-210, -130], [-120, -134],
];
