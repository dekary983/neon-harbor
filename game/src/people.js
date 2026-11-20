// people.js — player on-foot movement and punch combat, pedestrian AI (walk, flee, cash drops).
import { TUNING } from './config.js';
import { clamp, dist } from './rng.js';
import { collidesWithBuilding, V_ROADS, H_ROADS } from './city.js';

export function makePlayer(x, y) {
  return { x, y, angle: 0, hp: 100, cash: 120, inCar: null, punchCd: 0, walkPhase: 0, name: 'Rook' };
}
export function makePed(x, y, rng) {
  return {
    x, y, angle: rng() * Math.PI * 2, speed: 42 + rng() * 30, state: 'walk',
    hp: 30, fleeT: 0, color: ['#ffcc80', '#a5d6a7', '#90caf9', '#f48fb1', '#ce93d8', '#fff59d'][Math.floor(rng() * 6)],
    targetX: x, targetY: y, retarget: 0, down: false, cashDropped: false,
  };
}
export function spawnPeds(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    // spawn near sidewalks: beside a road
    const vertical = rng() > 0.5;
    const rx = vertical ? V_ROADS[Math.floor(rng() * V_ROADS.length)] + (rng() > 0.5 ? 68 : -68) : 100 + rng() * 3300;
    const ry = vertical ? 100 + rng() * 2800 : H_ROADS[Math.floor(rng() * H_ROADS.length)] + (rng() > 0.5 ? 68 : -68);
    peds.push(makePed(clamp(rx, 50, 3500), clamp(ry, 50, 2950), rng));
  }
  return peds;
}
export function updatePlayerOnFoot(player, input, dt, city) {
  let mx = 0, my = 0;
  if (input.down('KeyW', 'ArrowUp')) my -= 1;
  if (input.down('KeyS', 'ArrowDown')) my += 1;
  if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
  if (input.down('KeyD', 'ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my) || 1;
  const sprint = input.down('ShiftLeft', 'ShiftRight') ? TUNING.sprintMult : 1;
  const sp = TUNING.playerSpeed * sprint;
  if (mx || my) { player.angle = Math.atan2(my, mx); player.walkPhase += dt * 10 * sprint; }
  const nx = player.x + (mx / len) * sp * dt, ny = player.y + (my / len) * sp * dt;
  if (!collidesWithBuilding(city, nx, player.y, TUNING.playerRadius)) player.x = nx;
  if (!collidesWithBuilding(city, player.x, ny, TUNING.playerRadius)) player.y = ny;
  player.x = clamp(player.x, 24, 3976); player.y = clamp(player.y, 24, 2976);
  player.punchCd = Math.max(0, player.punchCd - dt);
  return (mx || my) ? sprint : 0;
}
// Returns {hitPed} when a punch lands.
export function tryPunch(player, peds, audio) {
  if (player.punchCd > 0) return null;
  player.punchCd = 0.32;
  if (audio) audio.punch();
  for (const ped of peds) {
    if (ped.down) continue;
    if (dist(player.x, player.y, ped.x, ped.y) < 38) { ped.hp -= 18; ped.state = 'flee'; ped.fleeT = 2.4; return { hitPed: ped }; }
  }
  return { hitPed: null };
}
export function updatePed(ped, dt, playerPos, rng) {
  if (ped.down) return;
  ped.retarget -= dt;
  if (ped.state === 'flee') {
    ped.fleeT -= dt;
    const a = Math.atan2(ped.y - playerPos.y, ped.x - playerPos.x);
    ped.angle = a; ped.x += Math.cos(a) * 150 * dt; ped.y += Math.sin(a) * 150 * dt;
    if (ped.fleeT <= 0) ped.state = 'walk';
  } else {
    if (ped.retarget <= 0) { ped.retarget = 2 + rng() * 3; ped.targetX = clamp(ped.x + (rng() - 0.5) * 420, 40, 3540); ped.targetY = clamp(ped.y + (rng() - 0.5) * 420, 40, 2960); }
    const d = dist(ped.x, ped.y, ped.targetX, ped.targetY);
    if (d > 6) { ped.angle = Math.atan2(ped.targetY - ped.y, ped.targetX - ped.x); ped.x += Math.cos(ped.angle) * ped.speed * dt; ped.y += Math.sin(ped.angle) * ped.speed * dt; }
  }
  ped.x = clamp(ped.x, 20, 3960); ped.y = clamp(ped.y, 20, 2980);
  if (ped.hp <= 0 && !ped.down) { ped.down = true; }
}
export function drawPerson(ctx, x, y, angle, color, opts = {}) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 3, 10, 5, 0, 0, 7); ctx.fill();
  ctx.rotate(angle);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); // shoulders / body top-down
  ctx.fillStyle = opts.skin || '#ffccbc'; ctx.beginPath(); ctx.arc(2, 0, 5, 0, 7); ctx.fill(); // head
  if (opts.badge) { ctx.fillStyle = '#2979ff'; ctx.fillRect(-3, -3, 6, 6); }
  if (opts.player) { ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}
