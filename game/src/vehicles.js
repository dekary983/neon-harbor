// vehicles.js — car model/physics, traffic AI, parked cars, player driving, damage and stealing.
import { TUNING, PALETTE } from './config.js';
import { clamp, dist } from './rng.js';
import { collidesWithBuilding } from './city.js';

let carId = 1;
export function makeCar(x, y, angle, opts = {}) {
  return {
    id: carId++, x, y, angle, speed: 0, w: 44, h: 22,
    color: opts.color || '#e53935', kind: opts.kind || 'sedan', // sedan | sport | cab | police | convertible
    health: 100, driver: opts.driver ?? null, parked: !!opts.parked,
    lane: opts.lane || null, laneT: opts.laneT || 0, fleeing: false, smoke: 0,
  };
}
export function spawnTraffic(city, rng, count, pickFn) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const lane = city.lanes[Math.floor(rng() * city.lanes.length)];
    const t = rng();
    const [ax, ay] = lane.pts[0], [bx, by] = lane.pts[1];
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    const angle = Math.atan2(by - ay, bx - ax);
    const kind = i === 0 ? 'cab' : (rng() > 0.82 ? 'sport' : (rng() > 0.5 ? 'convertible' : 'sedan'));
    const car = makeCar(x, y, angle, { color: pickFn(rng, PALETTE.carColors), kind, driver: 'npc' });
    car.lane = lane; car.laneT = t;
    cars.push(car);
  }
  return cars;
}
export function spawnParked(rng, spots) {
  return spots.map(([x, y, a], i) => makeCar(x, y, a, {
    color: PALETTE.carColors[i % PALETTE.carColors.length],
    kind: i % 7 === 0 ? 'sport' : i % 5 === 0 ? 'cab' : 'sedan', parked: true, driver: null,
  }));
}
export function updatePlayerCar(car, input, dt, city, audio) {
  const up = input.down('KeyW', 'ArrowUp'), down = input.down('KeyS', 'ArrowDown');
  const left = input.down('KeyA', 'ArrowLeft'), right = input.down('KeyD', 'ArrowRight');
  const brake = input.down('Space');
  if (up) car.speed += TUNING.carAccel * dt;
  if (down) car.speed -= (car.speed > 10 ? 520 : 200) * dt;
  if (!up && !down) car.speed *= Math.pow(0.35, dt);
  if (brake) car.speed *= Math.pow(0.05, dt);
  car.speed = clamp(car.speed, -TUNING.carReverse, TUNING.carMaxSpeed * (car.kind === 'sport' ? 1.25 : 1));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  if (Math.abs(car.speed) > 4) car.angle += steer * TUNING.carTurn * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 160, 0.35, 1);
  moveCar(car, dt, city);
  if (audio) audio.engineTick(Math.abs(car.speed) / TUNING.carMaxSpeed);
  return Math.abs(car.speed);
}
export function moveCar(car, dt, city) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!collidesWithBuilding(city, nx, ny, 16)) { car.x = nx; car.y = ny; }
  else { if (Math.abs(car.speed) > 120) car.health -= 8; car.speed *= -0.25; }
  car.x = clamp(car.x, 30, 3970); car.y = clamp(car.y, 30, 2970);
  car.smoke = car.health < 45 ? car.smoke + dt : 0;
}
export function updateTrafficCar(car, dt, city, allCars, playerCar) {
  if (car.parked || car.driver !== 'npc') return;
  if (!car.lane) return;
  const [ax, ay] = car.lane.pts[0], [bx, by] = car.lane.pts[1];
  const len = Math.hypot(bx - ax, by - ay);
  let speed = 150;
  // simple avoidance: slow if a car is close ahead
  for (const other of allCars) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < 62) {
      const ahead = Math.cos(car.angle) * (other.x - car.x) + Math.sin(car.angle) * (other.y - car.y);
      if (ahead > 0) speed = Math.min(speed, 40);
    }
  }
  if (playerCar && dist(car.x, car.y, playerCar.x, playerCar.y) < 55) speed = Math.min(speed, 60);
  car.speed += clamp(speed - car.speed, -300 * dt, 200 * dt);
  car.laneT += (car.speed * dt) / len;
  if (car.laneT > 1) { // pick a new lane at the end of the road
    const options = city.lanes.filter((l) => Math.hypot(l.pts[0][0] - bx, l.pts[0][1] - by) < 140);
    if (options.length) { car.lane = options[Math.floor(Math.random() * options.length)]; car.laneT = 0; }
    else car.laneT = 0;
  }
  const [cx, cy] = car.lane.pts[0], [dx, dy] = car.lane.pts[1];
  car.x = cx + (dx - cx) * car.laneT; car.y = cy + (dy - cy) * car.laneT;
  car.angle = Math.atan2(dy - cy, dx - cx);
}
export function drawCar(ctx, car, isPlayer) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-car.w / 2 + 2, -car.h / 2 + 3, car.w, car.h);
  ctx.fillStyle = car.kind === 'police' ? '#f5f5f5' : car.color;
  ctx.beginPath(); ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 6); ctx.fill();
  if (car.kind === 'police') { ctx.fillStyle = '#1565c0'; ctx.fillRect(-8, -car.h / 2, 16, car.h); ctx.fillStyle = '#ff1744'; ctx.fillRect(-4, -6, 8, 4); ctx.fillStyle = '#2979ff'; ctx.fillRect(-4, 2, 8, 4); }
  if (car.kind === 'cab') { ctx.fillStyle = '#fdd835'; ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h); ctx.fillStyle = '#111'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  ctx.fillStyle = '#b3e5fc'; ctx.fillRect(-2, -car.h / 2 + 3, 12, car.h - 6); // windshield
  ctx.fillStyle = '#263238'; ctx.fillRect(-14, -car.h / 2 + 3, 8, car.h - 6);
  if (car.kind === 'convertible') { ctx.fillStyle = '#ffe0b2'; ctx.fillRect(-10, -7, 16, 14); }
  if (car.kind === 'sport') { ctx.fillStyle = '#111'; ctx.fillRect(-car.w / 2, -3, 8, 6); }
  ctx.fillStyle = '#111';
  for (const [wx, wy] of [[-15, -12], [15, -12], [-15, 10], [15, 10]]) ctx.fillRect(wx - 4, wy, 8, 4);
  if (isPlayer) { ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-6, -28); ctx.lineTo(6, -28); ctx.fill(); }
  ctx.restore();
  if (car.health < 45) { ctx.fillStyle = 'rgba(120,120,120,0.55)'; ctx.beginPath(); ctx.arc(car.x + 14, car.y - 6, 6 + (car.smoke * 8 % 8), 0, 7); ctx.fill(); }
}
