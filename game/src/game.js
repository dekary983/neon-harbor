// game.js — boot, fixed-timestep loop, camera, day cycle, world rendering and the state machine for Neon Harbor.
import { WORLD, PALETTE, PLACES, TUNING } from './config.js';
import { makeRng, clamp, dist } from './rng.js';
import { generateCity } from './city.js';
import { SynthAudio } from './audio.js';
import { Input } from './input.js';
import { spawnTraffic, spawnParked, updatePlayerCar, updateTrafficCar, drawCar } from './vehicles.js';
import { makePlayer, spawnPeds, updatePlayerOnFoot, tryPunch, updatePed, drawPerson } from './people.js';
import { PoliceSystem } from './police.js';
import { createMissionState, startNextMission, updateMissions, objectiveText, missionMarker, persuadeDebtor, makePackages, MARCO_LINES } from './missions.js';
import { drawHUD, drawTitleScreen, drawOverlay } from './hud.js';
import { loadSave, writeSave, hasSave } from './save.js';
import { applyShot, isShotMode } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 1280, H = 720;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

const rng = makeRng(2026);
const city = generateCity(2026);
const audio = new SynthAudio();
const input = new Input(canvas);

const PARKED_SPOTS = [
  [3350, 1180, Math.PI / 2], [3260, 1700, 0], [950, 1330, 0], [1450, 830, 0], [1950, 1470, 0],
  [2450, 830, 0], [600, 470, 0], [1100, 1970, 0], [2200, 1970, 0], [3050, 470, 0], [700, 2300, 0], [2800, 1330, 0],
];

function buildWorld() {
  const traffic = spawnTraffic(city, rng, TUNING.trafficCount, (r, arr) => arr[Math.floor(r() * arr.length)]);
  const parked = spawnParked(rng, PARKED_SPOTS);
  // ensure a sport car on Ocean Drive for mission 1 and a cab exists
  parked[0].kind = 'sport'; parked[0].color = '#ff5252';
  const cab = traffic.find((c) => c.kind === 'cab'); if (cab) { cab.color = '#fdd835'; }
  return {
    cars: [...traffic, ...parked],
    peds: spawnPeds(rng, TUNING.pedCount),
    packages: makePackages(rng),
  };
}

const world = buildWorld();
const player = makePlayer(PLACES.marcoSpot.x - 60, PLACES.marcoSpot.y + 30);
const police = new PoliceSystem();
const missions = createMissionState();

const S = {
  mode: 'title', // title | playing | paused | busted | wasted | complete
  player, police, missions, cars: world.cars, peds: world.peds, packages: world.packages,
  city, dayT: 0.3, time: 0, camera: { x: player.x, y: player.y },
  shotObjective: null, cashPickups: [], taxiPassenger: null, saveTimer: 0,
  stepWorld: null,
};
window.__NEON_HARBOR__ = S; // handy for debugging / headless checks

function playerPos() { return player.inCar ? { x: player.inCar.x, y: player.inCar.y } : { x: player.x, y: player.y }; }

function nearestCar(maxD) {
  const p = playerPos(); let best = null, bd = maxD;
  for (const c of S.cars) { const d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  for (const c of police.cars) { const d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function witnessNear(x, y, r = 260) { return S.peds.some((p) => !p.down && dist(x, y, p.x, p.y) < r) || police.cars.length > 0; }

function enterCar(car) {
  const wasParked = car.parked; const hadDriver = car.driver === 'npc';
  if (hadDriver) { // driver flees
    const ped = S.peds.find((p) => p.down) || S.peds[0];
    if (ped) { ped.down = false; ped.hp = 30; ped.x = car.x + 26; ped.y = car.y + 10; ped.state = 'flee'; ped.fleeT = 3; }
  }
  car.driver = 'player'; car.parked = false; player.inCar = car;
  if (wasParked || hadDriver) { if (witnessNear(car.x, car.y)) police.addCrime(1.05); missions.banner = hadDriver ? 'CAR JACKED!' : ''; if (missions.banner) missions.bannerT = 1.4; }
}
function exitCar() {
  const car = player.inCar; if (!car) return;
  car.driver = null; if (Math.abs(car.speed) < 5) car.parked = true; car.speed = 0;
  player.x = car.x + Math.cos(car.angle - Math.PI / 2) * 30; player.y = car.y + Math.sin(car.angle - Math.PI / 2) * 30;
  player.inCar = null;
}
function doBusted() {
  S.mode = 'busted';
  const fine = Math.min(player.cash, 150 + police.wanted * 100);
  player.cash -= fine; S.lastFine = fine;
  police.wanted = 0; police.heat = 0; police.cars = []; police.officers = [];
  if (player.inCar) exitCar();
}
function doWasted() { S.mode = 'wasted'; if (player.inCar) exitCar(); }
function respawn(kind) {
  if (kind === 'busted') { player.x = PLACES.policeStation.x + 40; player.y = PLACES.policeStation.y + 70; }
  else { player.cash = Math.max(0, player.cash - 200); player.x = PLACES.hospital.x + 40; player.y = PLACES.hospital.y + 70; }
  player.hp = 100; police.wanted = 0; police.heat = 0; S.mode = 'playing'; saveGame();
}
function saveGame() { writeSave({ cash: player.cash, hp: player.hp, storyIndex: missions.storyIndex, packagesFound: missions.packagesFound, found: S.packages.map((p) => p.found), x: player.x, y: player.y }); }
function continueGame() {
  const s = loadSave(); if (!s) return false;
  player.cash = s.cash ?? player.cash; missions.storyIndex = s.storyIndex ?? 0; missions.packagesFound = s.packagesFound ?? 0;
  if (Array.isArray(s.found)) s.found.forEach((f, i) => { if (S.packages[i]) S.packages[i].found = f; });
  if (s.x) { player.x = s.x; player.y = s.y; }
  return true;
}

// ---- taxi side activity ----
function updateTaxi(dt) {
  const inCab = player.inCar && player.inCar.kind === 'cab';
  if (!inCab) { S.taxiPassenger = null; return; }
  if (!S.taxiPassenger) {
    // spawn a passenger marker near a road ahead
    if (Math.random() < dt * 0.25) {
      const a = Math.random() * Math.PI * 2;
      S.taxiPassenger = { x: clamp(player.inCar.x + Math.cos(a) * 500, 80, 3480), y: clamp(player.inCar.y + Math.sin(a) * 500, 80, 2920), dest: null, phase: 'pickup' };
    }
    return;
  }
  const tp = S.taxiPassenger, p = playerPos();
  if (tp.phase === 'pickup' && dist(p.x, p.y, tp.x, tp.y) < 55 && Math.abs(player.inCar.speed) < 30) {
    tp.phase = 'dropoff'; tp.dest = { x: 200 + Math.random() * 3200, y: 200 + Math.random() * 2600 };
    missions.banner = 'PASSENGER PICKED UP'; missions.bannerT = 2;
  } else if (tp.phase === 'dropoff' && dist(p.x, p.y, tp.dest.x, tp.dest.y) < 70 && Math.abs(player.inCar.speed) < 30) {
    const fare = 60 + Math.round(dist(tp.x, tp.y, tp.dest.x, tp.dest.y) / 18);
    player.cash += fare; missions.banner = `FARE PAID +$${fare}`; missions.bannerT = 2.5; audio.cash();
    S.taxiPassenger = null;
  }
}

// ---- main world step ----
function stepWorld(dt, silent = false) {
  S.time += dt;
  S.dayT = (S.dayT + dt / 240) % 1; // full day ~4 minutes
  const p = playerPos();
  if (!silent) {
    audio.init();
    if (input.justPressed('KeyM')) audio.muted = !audio.muted;
    if (missions.dialog && (input.justPressed('Enter') || input.mouse.clicked)) missions.dialog = null;
    else if (S.mode === 'playing') {
      // movement / driving
      if (player.inCar) updatePlayerCar(player.inCar, input, dt, city, audio);
      else updatePlayerOnFoot(player, input, dt, city);
      // actions
      if (input.justPressed('KeyE')) {
        if (player.inCar) exitCar();
        else { const c = nearestCar(52); if (c) enterCar(c); }
      }
      if (!player.inCar && (input.justPressed('KeyF') || input.mouse.clicked)) {
        // mission debtor persuasion takes priority when close to target
        const a = missions.active;
        if (a && a.id === 4 && dist(player.x, player.y, a.target.x, a.target.y) < 52) { persuadeDebtor(missions, player, audio); police.addCrime(0.6, witnessNear(player.x, player.y)); }
        else {
          const res = tryPunch(player, S.peds, audio);
          if (res && res.hitPed) {
            if (witnessNear(player.x, player.y)) police.addCrime(0.85);
            if (res.hitPed.hp <= 0 && !res.hitPed.cashDropped) { res.hitPed.cashDropped = true; S.cashPickups.push({ x: res.hitPed.x, y: res.hitPed.y, amount: 20 + Math.floor(Math.random() * 40), t: 0 }); }
          }
        }
      }
      // start mission at Marco marker
      const marker = missionMarker(missions);
      if (!missions.active && marker && missions.storyIndex < 5 && !player.inCar && dist(player.x, player.y, marker.x, marker.y) < 46) {
        if (!missions._metMarco) { missions.dialog = MARCO_LINES.intro; missions._metMarco = true; }
        else startNextMission(missions, S);
        if (missions.dialog === MARCO_LINES.intro) { /* next E press after dialog starts mission */ missions._pendingStart = true; }
      } else if (missions._pendingStart && !missions.dialog && !missions.active && marker && dist(player.x, player.y, marker.x, marker.y) < 60) {
        startNextMission(missions, S); missions._pendingStart = false;
      }
    }
  }
  // traffic + collisions with player car (crime + damage)
  for (const car of S.cars) {
    if (car.driver === 'player') continue;
    updateTrafficCar(car, dt, city, S.cars, player.inCar);
    if (player.inCar && car !== player.inCar && dist(car.x, car.y, player.inCar.x, player.inCar.y) < 40 && Math.abs(player.inCar.speed) > 90) {
      car.health -= 6; player.inCar.health -= 4;
      if (!car._hitCd || S.time - car._hitCd > 2) { car._hitCd = S.time; if (witnessNear(car.x, car.y)) police.addCrime(0.55); }
      player.inCar.speed *= 0.72;
    }
    // running down a pedestrian
    if (player.inCar && Math.abs(player.inCar.speed) > 60) {
      for (const ped of S.peds) if (!ped.down && dist(ped.x, ped.y, player.inCar.x, player.inCar.y) < 26) { ped.down = true; ped.hp = 0; police.addCrime(1.4, witnessNear(ped.x, ped.y)); }
    }
  }
  for (const ped of S.peds) updatePed(ped, dt, p, rng);
  // packages
  for (const pkg of S.packages) {
    if (!pkg.found && dist(p.x, p.y, pkg.x, pkg.y) < 34) { pkg.found = true; missions.packagesFound++; player.cash += TUNING.packageReward; missions.banner = `HIDDEN PACKAGE +$${TUNING.packageReward} (${missions.packagesFound}/20)`; missions.bannerT = 2.5; audio.cash(); saveGame(); }
  }
  // cash pickups
  for (const cp of S.cashPickups) { cp.t += dt; if (dist(p.x, p.y, cp.x, cp.y) < 30) { player.cash += cp.amount; cp.got = true; audio.cash(); } }
  S.cashPickups = S.cashPickups.filter((c) => !c.got && c.t < 25);
  // police
  police.update(dt, p, player.inCar, city, doBusted);
  audio.sirenTick(dt, police.wanted > 0);
  audio.bassline(dt, S.mode === 'playing');
  // missions + taxi
  if (!silent) { updateMissions(missions, dt, { player, playerPos: p, inCar: player.inCar, police, world: S, audio }); updateTaxi(dt); }
  if (missions.storyIndex >= 5 && !S._storyDoneShown && !missions.active) { /* free roam continues */ }
  // officer damage to player when very close and wanted high
  if (police.wanted >= 3) for (const o of police.officers) if (dist(o.x, o.y, p.x, p.y) < 30 && !player.inCar) player.hp -= 9 * dt;
  if (player.inCar && player.inCar.health <= 0) { player.hp -= 14 * dt; player.inCar.health = Math.max(0, player.inCar.health); }
  if (player.hp <= 0 && S.mode === 'playing') doWasted();
  // camera: smooth follow + speed lookahead
  const speed = player.inCar ? player.inCar.speed : 0;
  const ang = player.inCar ? player.inCar.angle : player.angle;
  const tx = clamp(p.x + Math.cos(ang) * speed * 0.28, W / 2 - 200, WORLD.w - W / 2 + 200);
  const ty = clamp(p.y + Math.sin(ang) * speed * 0.28, H / 2 - 200, WORLD.h - H / 2 + 200);
  // for small screens / shot mode keep camera centred simply:
  S.camera.x += ((player.inCar ? p.x : p.x) - S.camera.x) * Math.min(1, dt * 5);
  S.camera.y += ((player.inCar ? p.y : p.y) - S.camera.y) * Math.min(1, dt * 5);
  S.camera.x = clamp(S.camera.x + Math.cos(ang) * speed * 0.12 * dt * 5, 0, WORLD.w);
  S.camera.y = clamp(S.camera.y + Math.sin(ang) * speed * 0.12 * dt * 5, 0, WORLD.h);
  void tx; void ty;
  S.saveTimer += dt; if (S.saveTimer > 6) { S.saveTimer = 0; if (S.mode === 'playing') saveGame(); }
}
S.stepWorld = stepWorld;

// ---- rendering ----
function dayTint() {
  const t = S.dayT; // 0 dawn, .25 noon-ish, .42 sunset, .6 dusk, .92 night
  if (t < 0.35) return { overlay: 'rgba(255,180,80,0.06)', night: 0 };
  if (t < 0.55) return { overlay: 'rgba(255,110,60,0.16)', night: 0.25 }; // sunset
  if (t < 0.7) return { overlay: 'rgba(30,20,90,0.28)', night: 0.6 };
  if (t < 1) { const n = t > 0.8 && t < 0.97 ? 0.85 : 0.6; return { overlay: `rgba(6,8,40,${n * 0.55})`, night: n }; }
  return { overlay: 'rgba(0,0,0,0)', night: 0 };
}
function renderWorld() {
  const cam = S.camera;
  const ox = W / 2 - cam.x, oy = H / 2 - cam.y;
  const tint = dayTint();
  ctx.fillStyle = '#24402e'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);
  // ground tiles: grass base, sand + ocean east
  ctx.fillStyle = PALETTE.grass; ctx.fillRect(cam.x - W / 2 - 20, cam.y - H / 2 - 20, W + 40, H + 40);
  ctx.fillStyle = PALETTE.sand; ctx.fillRect(3550, 0, 130, WORLD.h);
  const wave = Math.sin(S.time * 1.4) * 6;
  ctx.fillStyle = PALETTE.ocean; ctx.fillRect(3680, 0, WORLD.w - 3680, WORLD.h);
  ctx.fillStyle = PALETTE.ocean2; for (let y = 0; y < WORLD.h; y += 90) ctx.fillRect(3680, y + wave, WORLD.w - 3680, 10);
  // marina docks
  ctx.fillStyle = '#6d4c2f'; for (let i = 0; i < 5; i++) ctx.fillRect(3560, 1180 + i * 110, 190, 18);
  ctx.fillStyle = '#eceff1'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.roundRect(3620, 1160 + i * 110, 54, 16, 6); ctx.fill(); }
  // sidewalks + roads
  ctx.fillStyle = PALETTE.sidewalk;
  for (const x of [400, 900, 1400, 1900, 2400, 2900, 3350]) ctx.fillRect(x - 68, 0, 136, WORLD.h);
  for (const y of [400, 900, 1400, 1900, 2400]) ctx.fillRect(0, y - 68, 3550, 136);
  ctx.fillStyle = PALETTE.asphalt;
  for (const x of [400, 900, 1400, 1900, 2400, 2900, 3350]) ctx.fillRect(x - 55, 0, 110, WORLD.h);
  for (const y of [400, 900, 1400, 1900, 2400]) ctx.fillRect(0, y - 55, 3550, 110);
  ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([22, 18]);
  for (const x of [400, 900, 1400, 1900, 2400, 2900, 3350]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h); ctx.stroke(); }
  for (const y of [400, 900, 1400, 1900, 2400]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(3550, y); ctx.stroke(); }
  ctx.setLineDash([]);
  // buildings + signs
  for (const b of city.buildings) {
    if (b.x + b.w < cam.x - W / 2 - 40 || b.x > cam.x + W / 2 + 40 || b.y + b.h < cam.y - H / 2 - 40 || b.y > cam.y + H / 2 + 40) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 24));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if ((i * 7 + j * 13 + b.floors) % 3) ctx.fillRect(b.x + 8 + i * 24, b.y + 8 + j * 22, 12, 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  ctx.font = 'bold 13px system-ui,sans-serif'; ctx.textAlign = 'center';
  for (const sgn of city.signs) {
    if (Math.abs(sgn.x - cam.x) > W / 2 + 80 || Math.abs(sgn.y - cam.y) > H / 2 + 80) continue;
    ctx.fillStyle = sgn.color; if (tint.night > 0.4) { ctx.shadowColor = sgn.color; ctx.shadowBlur = 16; }
    ctx.fillText(sgn.text, sgn.x, sgn.y); ctx.shadowBlur = 0;
  }
  // palms
  for (const p of city.palms) {
    if (Math.abs(p.x - cam.x) > W / 2 + 40 || Math.abs(p.y - cam.y) > H / 2 + 40) continue;
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 10); ctx.stroke();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.4; ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - 10); ctx.quadraticCurveTo(p.x + 4 + Math.cos(a) * 14, p.y - 16 + Math.sin(a) * 6, p.x + 4 + Math.cos(a) * 22, p.y - 8 + Math.sin(a) * 12); ctx.stroke(); }
  }
  for (const pr of city.props) { ctx.fillStyle = '#8d6e63'; ctx.fillRect(pr.x, pr.y, 20, 20); ctx.strokeStyle = '#5d4037'; ctx.strokeRect(pr.x, pr.y, 20, 20); }
  // place labels
  ctx.font = 'bold 15px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText("MARCO'S GARAGE", PLACES.garage.x, PLACES.garage.y - 26);
  ctx.fillText('MARINA', PLACES.marina.x, PLACES.marina.y - 90);
  ctx.fillText('CBPD', PLACES.policeStation.x, PLACES.policeStation.y - 20);
  ctx.fillText('HOSPITAL', PLACES.hospital.x, PLACES.hospital.y - 20);
  // markers: mission / taxi / packages
  const marker = missionMarker(missions);
  const pulse = 12 + Math.sin(S.time * 5) * 4;
  function drawMarker(x, y, letter, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, pulse + 6, 0, 7); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(letter, x, y + 5);
  }
  if (marker) drawMarker(marker.x, marker.y, missions.active ? '!' : 'M', '#ffe600');
  if (S.taxiPassenger) {
    if (S.taxiPassenger.phase === 'pickup') drawMarker(S.taxiPassenger.x, S.taxiPassenger.y, 'P', '#00e5ff');
    else if (S.taxiPassenger.dest) drawMarker(S.taxiPassenger.dest.x, S.taxiPassenger.dest.y, 'D', '#69f0ae');
  }
  // debtor markers (people standing at debtor spots)
  if (missions.active && missions.active.id === 4) drawMarker(missions.active.target.x, missions.active.target.y, '$', '#69f0ae');
  for (const pkg of S.packages) {
    if (pkg.found) continue;
    if (Math.abs(pkg.x - cam.x) > W / 2 + 30 || Math.abs(pkg.y - cam.y) > H / 2 + 30) continue;
    const bob = Math.sin(S.time * 3 + pkg.phase) * 3;
    ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 12;
    ctx.fillRect(pkg.x - 8, pkg.y - 6 + bob, 16, 12); ctx.shadowBlur = 0; ctx.fillStyle = '#111'; ctx.fillRect(pkg.x - 8, pkg.y - 1 + bob, 16, 2);
  }
  for (const cp of S.cashPickups) { ctx.fillStyle = '#7CFC9A'; ctx.beginPath(); ctx.arc(cp.x, cp.y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#063'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('$', cp.x, cp.y + 3); }
  // Marco NPC at his spot
  if (missions.storyIndex < 5 || missions.active) drawPerson(ctx, PLACES.marcoSpot.x, PLACES.marcoSpot.y, -2.4, '#111111', { skin: '#ffccbc' });
  // peds, cars, police, player
  for (const ped of S.peds) {
    if (Math.abs(ped.x - cam.x) > W / 2 + 40 || Math.abs(ped.y - cam.y) > H / 2 + 40) continue;
    if (ped.down) { ctx.save(); ctx.translate(ped.x, ped.y); ctx.rotate(1.2); ctx.fillStyle = ped.color; ctx.fillRect(-12, -5, 24, 10); ctx.restore(); }
    else drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, {});
  }
  for (const car of S.cars) { if (Math.abs(car.x - cam.x) > W / 2 + 70 || Math.abs(car.y - cam.y) > H / 2 + 70) continue; if (player.inCar === car) continue; drawCar(ctx, car, false); }
  for (const car of police.cars) drawCar(ctx, car, false);
  for (const o of police.officers) drawPerson(ctx, o.x, o.y, o.angle, '#1565c0', { badge: true });
  if (player.inCar) drawCar(ctx, player.inCar, true);
  else drawPerson(ctx, player.x, player.y, player.angle, '#ff2e88', { player: true, skin: '#ffccbc' });
  ctx.restore();
  // day/night tint + sunset glow
  if (tint.overlay !== 'rgba(0,0,0,0)') { ctx.fillStyle = tint.overlay; ctx.fillRect(0, 0, W, H); }
  if (tint.night > 0.5) { // neon glow vignette at night
    ctx.fillStyle = 'rgba(255,46,136,0.05)'; ctx.fillRect(0, 0, W, H);
  }
}

function render() {
  if (S.mode === 'title') { drawTitleScreen(ctx, W, H, hasSave()); return; }
  renderWorld();
  const p = playerPos();
  const marker = missionMarker(missions);
  const inCarSpeed = player.inCar ? Math.abs(player.inCar.speed) * 0.42 : 0;
  let objective = S.shotObjective || objectiveText(missions);
  if (S.taxiPassenger && player.inCar && player.inCar.kind === 'cab') objective = S.taxiPassenger.phase === 'pickup' ? 'Taxi: pick up the passenger (P)' : 'Taxi: drop off at D for a fare';
  let hint = '';
  if (!player.inCar && nearestCar(52)) hint = 'Press E to get in the car';
  else if (!missions.active && missions.storyIndex < 5 && dist(player.x, player.y, PLACES.marcoSpot.x, PLACES.marcoSpot.y) < 60 && !player.inCar) hint = 'Press near Marco / walk into the M marker for work';
  drawHUD(ctx, W, H, { player, police, missions, speedKmh: inCarSpeed, packagesTotal: 20, playerPos: p, playerAngle: player.inCar ? player.inCar.angle : player.angle, marker, objective, inCar: player.inCar, hint });
  if (S.mode === 'paused') drawOverlay(ctx, W, H, 'PAUSED', 'Esc / P to resume · Progress auto-saves', '#00e5ff');
  if (S.mode === 'busted') drawOverlay(ctx, W, H, 'BUSTED', `The CBPD fined you $${S.lastFine || 0}. Press Enter to leave the station.`, '#ff5252');
  if (S.mode === 'wasted') drawOverlay(ctx, W, H, 'WASTED', 'You wake up at Coral Bay Hospital. -$200. Press Enter.', '#e53935');
  if (missions.storyIndex >= 5 && !S._completeShown) { /* handled below once */ }
}

// ---- boot / shot staging ----
const shot = isShotMode();
if (shot) applyShot(shot, S);

// fixed timestep loop
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > 0.25) dt = 0.25; acc += dt;
  const step = 1 / 60;
  while (acc >= step) {
    acc -= step;
    if (S.mode === 'playing') stepWorld(step);
    else if (S.mode === 'title') {
      if (input.justPressed('Enter')) { S.mode = 'playing'; audio.init(); }
      if (input.justPressed('KeyC') && hasSave()) { continueGame(); S.mode = 'playing'; audio.init(); }
      if (input.justPressed('KeyN') && hasSave()) { S.mode = 'playing'; audio.init(); }
      if (input.mouse.clicked) { if (hasSave()) continueGame(); S.mode = 'playing'; audio.init(); }
    } else if (S.mode === 'paused') {
      if (input.justPressed('Escape', 'KeyP')) S.mode = 'playing';
    } else if (S.mode === 'busted') {
      if (input.justPressed('Enter')) respawn('busted');
    } else if (S.mode === 'wasted') {
      if (input.justPressed('Enter')) respawn('wasted');
    }
    if (S.mode === 'playing' && input.justPressed('Escape', 'KeyP')) S.mode = 'paused';
    // story complete overlay flag
    if (missions.storyIndex >= 5 && !S._completeShown) { S._completeShown = true; missions.banner = 'STORY COMPLETE — Coral Bay is yours! Free roam continues.'; missions.bannerT = 6; }
    input.endFrame();
  }
  render();
}
requestAnimationFrame(frame);
