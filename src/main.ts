import '@fontsource/bowlby-one';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import './style.css';
import * as THREE from 'three';
import { Track, BACHEPENDENCIA } from './track';
import { buildWorld } from './world';
import { Race, Input, ITEM_NAMES, LAPS, Car } from './race';
import { VEHICLES } from './vehicles';
import { Sfx } from './audio';

const qs = new URLSearchParams(location.search);
const LOW = qs.get('q') === 'low' || matchMedia('(pointer: coarse)').matches;
const AUTO = qs.has('auto');
const ui = document.getElementById('ui')!;
const $ = (h: string) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild as HTMLElement; };
const fmt = (t: number) => (isFinite(t) ? `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}` : '--');
const money = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

type State = 'title' | 'select' | 'count' | 'race' | 'results';

async function boot() {
  await Promise.all(['400 40px "Bowlby One"', '600 40px "Barlow Condensed"'].map((f) => document.fonts.load(f).catch(() => [])));
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.25 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 6000);

  const track = new Track(BACHEPENDENCIA);
  const world = await buildWorld(renderer, track);
  if (LOW) world.sun.shadow.mapSize.set(1024, 1024);

  const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();

  // Safari en iOS ignora user-scalable=no: se bloquean pellizco y doble toque a mano.
  const stop = (e: Event) => e.preventDefault(), np = { passive: false } as const;
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(ev, stop, np);
  const inMenu = (e: Event) => e.target instanceof Element && !!e.target.closest('.screen');
  document.addEventListener('touchstart', (e) => { if (e.touches.length > 1 || !inMenu(e)) e.preventDefault(); }, np);
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || !inMenu(e)) e.preventDefault(); }, np);
  let lastTap = 0;
  document.addEventListener('touchend', (e) => { const now = performance.now(); if (now - lastTap < 350 && !(e.target instanceof Element && e.target.closest('button'))) e.preventDefault(); lastTap = now; }, np);

  // --- Entrada -------------------------------------------------------------
  const keys = new Set<string>(), touch = { l: false, r: false, gas: false, drift: false, item: false, brake: false };
  let itemEdge = false;
  addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); if (e.code === 'Space' && !e.repeat) itemEdge = true; keys.add(e.code); sfx.start(); });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const readInput = (): Input => {
    const k = (...c: string[]) => c.some((x) => keys.has(x));
    let steer = (k('ArrowLeft', 'KeyA') || touch.l ? 1 : 0) - (k('ArrowRight', 'KeyD') || touch.r ? 1 : 0);
    let throttle = (k('ArrowUp', 'KeyW') || touch.gas ? 1 : 0) - (k('ArrowDown', 'KeyS') || touch.brake ? 1 : 0);
    let drift = k('ShiftLeft', 'ShiftRight') || touch.drift, item = itemEdge || touch.item;
    const gp = navigator.getGamepads?.()[0];
    if (gp) { if (Math.abs(gp.axes[0]) > 0.15) steer = -gp.axes[0]; throttle += (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0); drift ||= !!gp.buttons[5]?.pressed; item ||= !!gp.buttons[0]?.pressed; }
    itemEdge = false; touch.item = false;
    return { throttle: THREE.MathUtils.clamp(throttle, -1, 1), steer, drift, item };
  };

  // --- Estado --------------------------------------------------------------
  const sfx = new Sfx();
  let state: State = 'title', pilot = 'lonches', group = new THREE.Group(), race!: Race;
  let countT = 0, greenAt = 0, jumped = false, shake = 0, toastT = 0, hudT = 0, orbit = 0;
  const newRace = () => { world.scene.remove(group); group = new THREE.Group(); world.scene.add(group); race = new Race(track, group, pilot, 1); camPos.set(0, 0, 0); };
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  newRace();

  // --- Pantallas -----------------------------------------------------------
  let hud: HTMLElement | null = null, mini: CanvasRenderingContext2D | null = null;
  const clear = () => { ui.innerHTML = ''; hud = null; };
  const CREDIT = 'Fotos de Torreón vía Wikimedia Commons: ProtoplasmaKid (CC BY 4.0), Rodrigo.riverag y Alberto.G.Cisneros (CC BY-SA 4.0), BlatZzz (CC BY-SA 3.0), Elias Garcia-Ortiz y Comisión Mexicana de Filmaciones (CC BY-SA 2.0), B.jars (CC0). Detalle en docs/FOTOS.md.';

  function showTitle() {
    state = 'title'; clear();
    const s = $(`<div class="screen title"><div class="c" style="color:var(--am);font-size:1.3em">— Gran Premio de La Laguna</div>
      <h1 class="d">BACHE<br><span>RUN</span></h1>
      <p style="font-size:1.4em;max-width:26em;margin:0">Carreras por Torreón donde el rival más peligroso es la calle.</p>
      <div class="row"><button class="btn" id="go">ARRANCAR</button><span class="c" style="color:var(--gr)">Enter · Toca la pantalla</span></div>
      <div class="credit">Sátira: pilotos, dependencias y marcas son ficticios. Los baches, lamentablemente, no.<br>${CREDIT}</div></div>`);
    ui.append(s); s.querySelector<HTMLElement>('#go')!.onclick = () => { sfx.start(); showSelect(); };
  }

  function showSelect() {
    state = 'select'; clear();
    const s = $(`<div class="screen"><div class="row"><h1 class="d" style="font-size:2.6em;color:var(--am)">ELIGE TU PILOTO</h1><span class="c" style="margin-left:auto;color:var(--gr)">Bulevar Bachependencia · ${LAPS} vueltas</span></div>
      <div class="row" style="align-items:stretch;flex-wrap:nowrap;gap:2em;flex:1">
        <div class="grid" style="flex:1.3;align-content:start"></div><div class="panel" style="flex:1" id="det"></div></div></div>`);
    const grid = s.querySelector('.grid')!, det = s.querySelector<HTMLElement>('#det')!;
    const draw = () => {
      grid.innerHTML = '';
      for (const v of VEHICLES) { const t = $(`<button class="tile ${v.id === pilot ? 'on' : ''}"><i style="background:${hex(v.color)}"></i><b>${v.pilot}</b><span>${v.vehicle}</span></button>`); t.onclick = () => { pilot = v.id; sfx.beep(520, 0.06); draw(); }; grid.append(t); }
      const v = VEHICLES.find((x) => x.id === pilot)!;
      const st = (n: string, x: number, warn = false) => `<div class="stat"><span class="c">${n}</span><div><div style="width:${x * 10}%;${warn && x < 5 ? 'background:var(--na)' : ''}"></div></div><span>${x}</span></div>`;
      det.innerHTML = `<div class="c e">${v.vehicle}</div><div class="d" style="font-size:2.3em">${v.pilot.toUpperCase()}</div><p style="margin:0;line-height:1.4">${v.bio}</p>
        ${st('Velocidad', v.vel)}${st('Aceleración', v.ace)}${st('Manejo', v.man)}${st('Suspensión', v.sus, true)}
        <div style="color:var(--gr)">Habilidad: <span style="color:var(--ar)">${v.skill}</span></div>
        <div class="sign c" style="font-size:.9em">Flechas o WASD: manejar · Shift: derrape · Espacio: objeto</div>
        <button class="btn" style="margin-top:auto;align-self:flex-start" id="ok">A LA PARRILLA</button>`;
      det.querySelector<HTMLElement>('#ok')!.onclick = startCount;
    };
    draw(); ui.append(s);
  }

  function buildHud() {
    hud = $(`<div class="hud">
      <div class="x h-item" style="left:2.4vw;top:3vh;display:flex;gap:.9em;align-items:center"><div id="slot" style="width:4.4em;height:4.4em;background:var(--ar);border:5px solid var(--am);display:flex;align-items:center;justify-content:center;color:var(--asf)" class="d"></div><div><div class="c e h-key">Objeto · Espacio</div><div class="d" id="item" style="font-size:1.15em">SIN OBJETO</div></div></div>
      <div class="x h-lap" style="left:50%;top:3vh;transform:translateX(-50%);display:flex;gap:2.5em"><div><div class="c e">Vuelta</div><div class="d" style="font-size:1.8em" id="lap"></div></div><div style="text-align:right"><div class="c e">Tiempo</div><div class="d" style="font-size:1.8em;font-variant-numeric:tabular-nums" id="time"></div></div></div>
      <div class="x h-mini" style="right:2.4vw;top:3vh"><div class="c e">Bulevar Bachependencia</div><canvas id="mini" width="220" height="150" style="width:11em;height:7.5em;display:block"></canvas></div>
      <div class="pos d"><span id="pos"></span><small>de 8</small></div>
      <div class="x h-susp" style="left:50%;bottom:3vh;transform:translateX(-50%);width:26em"><div style="display:flex;justify-content:space-between"><span class="c e">Suspensión</span><span class="c" style="font-size:.85em" id="hits"></span></div><div class="meter" style="margin:.4em 0"><div id="susp"></div></div><div style="font-size:.85em" id="tip"></div></div>
      <div class="x h-kmh" style="right:2.4vw;bottom:3vh;text-align:right"><div class="d" style="font-size:3.6em;font-variant-numeric:tabular-nums" id="kmh"></div><div class="c" style="color:var(--gr);font-size:.9em">km/h</div></div>
      <div class="toast d" id="toast"></div>
      <div class="lights" id="lights" hidden><i></i><i></i><i></i></div><div class="count d" id="count"></div>
      <div class="touch"><button data-k="l" style="left:3vw;bottom:24vh;width:9em;height:9em;font-size:1em">‹</button><button data-k="r" style="left:calc(3vw + 10em);bottom:24vh;width:9em;height:9em">›</button>
        <button data-k="gas" style="right:3vw;bottom:24vh;width:10em;height:10em;background:rgba(255,198,26,.85);color:var(--asf)">ACELERA</button><button data-k="drift" style="right:calc(3vw + 11em);bottom:24vh;width:7em;height:7em">DERRAPE</button>
        <button data-k="item" style="right:3vw;bottom:calc(24vh + 11em);width:7em;height:7em;background:rgba(255,90,31,.85);color:var(--asf)">OBJETO</button><button data-k="brake" style="left:3vw;bottom:calc(24vh + 10em);width:6em;height:6em">FRENO</button></div></div>`);
    ui.append(hud); mini = hud.querySelector<HTMLCanvasElement>('#mini')!.getContext('2d');
    hud.querySelectorAll<HTMLElement>('.touch button').forEach((b) => {
      const k = b.dataset.k as keyof typeof touch;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); touch[k] = true; sfx.start(); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { if (k !== 'item') touch[k] = false; });
    });
  }
  const q = (id: string) => hud!.querySelector<HTMLElement>('#' + id)!;
  const toast = (t: string) => { if (!hud) return; const e = q('toast'); e.textContent = t; e.classList.add('on'); toastT = 1.1; };

  function startCount() {
    newRace(); clear(); buildHud(); state = 'count'; countT = 0; greenAt = 3 + Math.random() * 2; jumped = false;
    q('lights').hidden = false;
  }

  function showResults() {
    state = 'results'; clear(); const p = race.player, st = race.standings();
    const hitsCost = p.hits * 180, flatCost = p.flats * 450, align = p.hits > 4 ? 600 : 0, total = hitsCost + flatCost + align;
    const prize = [1000, 700, 500, 400, 300, 200, 100, 0][p.place - 1] + p.dodged * 5;
    const s = $(`<div class="screen"><div class="row"><h1 class="d" style="font-size:2.6em;color:var(--am)">${p.place === 1 ? '¡GANASTE!' : 'RESULTADOS'}</h1><span class="c" style="color:var(--gr)">Bulevar Bachependencia</span></div>
      <div class="row" style="align-items:flex-start;gap:2.5em;flex-wrap:nowrap">
      <table style="flex:1.2">${st.map((c) => `<tr class="${c.isPlayer ? 'me' : ''}"><td class="d">${c.place}</td><td>${c.def.pilot}${c.isPlayer ? ' (tú)' : ''}</td><td style="text-align:right">${c.finished ? fmt(c.time) : 'En pista'}</td></tr>`).join('')}</table>
      <div style="flex:1;display:flex;flex-direction:column;gap:1.2em"><div class="ticket"><b style="display:block;text-align:center;font-size:1.2em">TALLER "EL COMPA"</b><span style="display:block;text-align:center">Suspensiones, llantas y resignación</span><hr style="border:0;border-top:2px dashed var(--asf)">
        <div><span>${p.hits} baches x $180</span><span>${money(hitsCost)}</span></div><div><span>${p.flats} ponchaduras</span><span>${money(flatCost)}</span></div><div><span>Alineación y balanceo</span><span>${money(align)}</span></div>
        <hr style="border:0;border-top:2px dashed var(--asf)"><div style="font-weight:700;font-size:1.2em"><span>TOTAL</span><span>${money(total)}</span></div><div><span>Premio de carrera</span><span>-${money(prize)}</span></div>
        <div style="font-weight:700"><span>${total > prize ? 'Sales debiendo' : 'Te sobran'}</span><span>${money(Math.abs(total - prize))}</span></div></div>
        <div class="sign"><div class="c" style="font-size:.85em">Reporte ciudadano enviado · Folio BR-${String(1000 + Math.floor(Math.random() * 9000)).padStart(6, '0')}</div><div>Baches esquivados: ${p.dodged} · Mejor racha: ${p.bestStreak} · Mejor vuelta: ${fmt(p.bestLap)}</div><div>Atención estimada: 3 administraciones</div></div>
        <div class="row"><button class="btn" id="again">OTRA VUELTA</button><button class="btn g" id="chg">CAMBIAR PILOTO</button></div></div></div></div>`);
    ui.append(s); s.querySelector<HTMLElement>('#again')!.onclick = startCount; s.querySelector<HTMLElement>('#chg')!.onclick = showSelect;
  }

  addEventListener('keydown', (e) => { if (e.code === 'Enter') { if (state === 'title') showSelect(); else if (state === 'select') startCount(); else if (state === 'results') startCount(); } });
  showTitle();

  // --- Bucle ---------------------------------------------------------------
  const dbg: { speed: number; top: number[] | null } = { speed: Number(qs.get('speed')) || 1, top: null };
  const clock = new THREE.Clock(); let accum = 0; const STEP = 1 / 120, tmp = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1), p = race.player;
    let input: Input = { throttle: 0, steer: 0, drift: false, item: false };
    if (state === 'count' || state === 'race') input = readInput();
    if (state === 'count') {
      countT += dt; const L = hud!.querySelectorAll<HTMLElement>('#lights i');
      L[0].style.background = countT < greenAt ? '#d93a2b' : '#3a363d';
      L[1].style.background = countT > 1 && countT < greenAt && Math.floor(countT * 6) % 2 ? '#ffc61a' : '#3a363d';
      L[2].style.background = countT >= greenAt ? '#2fd06a' : '#3a363d';
      q('count').textContent = countT < greenAt ? 'SEMÁFORO DESCOMPUESTO' : ''; q('count').style.fontSize = '2em';
      if (countT < greenAt && countT > greenAt - 0.6 && input.throttle > 0) jumped = true;
      if (countT >= greenAt) {
        state = 'race'; race.started = true; sfx.beep(880, 0.4);
        if (jumped) { p.stall = 1.2; toast('¡TE ADELANTASTE! Motor apagado'); }
        for (const c of race.cars) if (!c.isPlayer) c.stall = Math.random() * 0.5;
        setTimeout(() => { if (hud) q('lights').hidden = true; }, 1200);
      }
    }
    if (state === 'race' && countT < greenAt + 0.35 && !jumped && input.throttle > 0 && p.boost <= 0 && race.time < 0.35) { p.boost = 1.1; toast('¡ARRANQUE TURBO!'); }
    if (AUTO && race.started) input = (race as unknown as { ai(c: Car, dt: number): Input }).ai(p, dt);
    accum += dt * dbg.speed; while (accum >= STEP) { race.update(STEP, input); input = { ...input, item: false }; accum -= STEP; }

    for (const e of race.events) {
      if (e.car !== p) continue;
      if (e.kind === 'bache') { shake = 0.5 + (e.value ?? 0) * 0.03; sfx.thump(0.6 + (e.value ?? 0) / 25); toast(e.value ? `¡BACHE! −${e.value}` : '¡BACHE!'); }
      if (e.kind === 'flat') { toast('¡PONCHADURA!'); sfx.thump(1.6); }
      if (e.kind === 'shield') { toast('La llanta de refacción te salvó'); sfx.beep(660, 0.1); }
      if (e.kind === 'item') { sfx.beep(990, 0.08); sfx.beep(1320, 0.12); }
      if (e.kind === 'boost') sfx.beep(220, 0.3, 0.08);
      if (e.kind === 'lap') { toast(e.value === LAPS ? '¡ÚLTIMA VUELTA!' : `Vuelta ${e.value}`); sfx.beep(740, 0.2); }
      if (e.kind === 'finish') { toast('¡META!'); setTimeout(showResults, 2200); }
    }
    race.events.length = 0;
    sfx.engine(p.speed, state === 'race');

    // Camara
    const fx = Math.sin(p.h), fz = Math.cos(p.h);
    if (state === 'title' || state === 'select' || state === 'results') {
      orbit += dt * 0.18; const c = state === 'results' ? p : race.cars[4];
      tmp.set(c.x + Math.sin(orbit) * 15, 4.5, c.z + Math.cos(orbit) * 15); camPos.lerp(tmp, camPos.lengthSq() ? Math.min(1, dt * 2) : 1); camLook.set(c.x, 1.4, c.z); camera.fov = camera.aspect < 1 ? 78 : 50;
    } else {
      const tall = camera.aspect < 1, back = (8.2 + p.model.length * 0.45) * (tall ? 1.25 : 1), v = p.speed;
      tmp.set(p.x - fx * back, (3.6 + p.model.length * 0.12) * (tall ? 1.55 : 1), p.z - fz * back);
      camPos.lerp(tmp, camPos.lengthSq() ? 1 - Math.exp(-dt * 7) : 1); camLook.set(p.x + fx * (tall ? 11 : 7), 1.6, p.z + fz * (tall ? 11 : 7));
      camera.fov += ((tall ? 84 : 60) + v * (tall ? 0.2 : 0.35) + (p.boost > 0 ? 9 : 0) - camera.fov) * Math.min(1, dt * 4);
    }
    shake = Math.max(0, shake - dt * 2.2);
    camera.position.copy(camPos); camera.position.x += (Math.random() - 0.5) * shake * 0.5; camera.position.y += (Math.random() - 0.5) * shake * 0.5;
    camera.lookAt(camLook); camera.updateProjectionMatrix();
    if (dbg.top) { camera.position.set(dbg.top[0], dbg.top[1], dbg.top[2] + 0.01); camera.lookAt(dbg.top[0], 0, dbg.top[2]); }
    world.update(camLook);

    // HUD
    if (hud) {
      toastT -= dt; if (toastT <= 0) q('toast').classList.remove('on');
      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.08;
        q('pos').textContent = `${p.place}.º`; q('lap').innerHTML = `${Math.min(LAPS, Math.max(0, p.lap) + 1)}<span class="c" style="font-size:.5em;color:var(--gr)"> / ${LAPS}</span>`;
        q('time').textContent = fmt(race.time); q('kmh').textContent = String(Math.round(p.speed * 3.6));
        const sp = q('susp'); sp.style.width = `${p.susp}%`; sp.style.background = p.susp < 35 ? 'var(--na)' : 'var(--am)';
        q('hits').textContent = `Baches comidos: ${p.hits} · esquivados: ${p.dodged}`;
        q('tip').textContent = p.flat > 0 ? 'Cambiando la llanta…' : p.susp < 25 ? 'Un bache más y ponchas.' : p.shield ? 'Llevas llanta de refacción.' : p.offroad ? 'En la banqueta vas más lento.' : '';
        q('item').textContent = p.item ? ITEM_NAMES[p.item] : 'SIN OBJETO'; q('slot').textContent = p.item ? ({ gordita: 'GO', llanta: 'LL', bache: 'BP' })[p.item] : '';
        if (mini) drawMini(mini);
      }
    }
    renderer.render(world.scene, camera);
  }

  function drawMini(g: CanvasRenderingContext2D) {
    const W = 220, H = 150; g.clearRect(0, 0, W, H);
    const map = (x: number, z: number): [number, number] => [W / 2 + x * 0.33, H / 2 + z * 0.33];
    g.strokeStyle = '#c9bda6'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= track.n; i += 6) { const [x, y] = map(track.px[i % track.n], track.pz[i % track.n]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.stroke();
    for (const c of [...race.cars].sort((a) => (a.isPlayer ? 1 : -1))) { const [x, y] = map(c.x, c.z); g.fillStyle = hex(c.def.color); g.strokeStyle = '#f6ecd6'; g.lineWidth = c.isPlayer ? 3 : 1.5; g.beginPath(); g.arc(x, y, c.isPlayer ? 7 : 4.5, 0, 7); g.fill(); g.stroke(); }
  }

  Object.assign(window, { __br: { get race() { return race; }, get state() { return state; }, startCount, showResults, camera, dbg } });
  frame();
}

void boot();
