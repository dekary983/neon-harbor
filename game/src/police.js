// police.js — wanted stars, heat decay, police cars that chase and box in, officers, BUSTED/WASTED.
import { clamp, dist } from './rng.js';
import { makeCar, moveCar } from './vehicles.js';

export class PoliceSystem {
  constructor() {
    this.wanted = 0; this.heat = 0; this.seenTimer = 0; this.bustedMeter = 0;
    this.cars = []; this.officers = []; this.spawnTimer = 0;
  }
  addCrime(amount, witnessed = true) {
    if (!witnessed) amount *= 0.4;
    this.heat = clamp(this.heat + amount, 0, 5.99);
    this.wanted = Math.floor(this.heat);
    this.seenTimer = 3;
  }
  setWanted(n) { this.wanted = clamp(n, 0, 5); this.heat = Math.max(this.heat, n + 0.05); }
  update(dt, playerPos, playerInCar, city, onBusted) {
    // heat decays when unseen
    this.seenTimer -= dt;
    const anyNear = this.cars.some((c) => dist(c.x, c.y, playerPos.x, playerPos.y) < 340) || this.officers.some((o) => dist(o.x, o.y, playerPos.x, playerPos.y) < 240);
    if (anyNear) this.seenTimer = 2.5;
    if (this.seenTimer <= 0 && this.wanted > 0) {
      this.heat -= dt * 0.14;
      if (this.heat < this.wanted) this.wanted = Math.max(0, Math.floor(this.heat));
      if (this.wanted === 0) { this.cars = []; this.officers = []; this.heat = 0; }
    }
    // spawn to match wanted level
    this.spawnTimer -= dt;
    const desiredCars = this.wanted === 0 ? 0 : Math.min(1 + this.wanted, 5);
    if (this.wanted > 0 && this.spawnTimer <= 0 && this.cars.length < desiredCars) {
      this.spawnTimer = 1.6;
      const a = Math.random() * Math.PI * 2, d = 520;
      const car = makeCar(clamp(playerPos.x + Math.cos(a) * d, 60, 3940), clamp(playerPos.y + Math.sin(a) * d, 60, 2940), a, { kind: 'police', color: '#fff', driver: 'cop' });
      this.cars.push(car);
      if (this.wanted >= 2 && this.officers.length < this.wanted) {
        this.officers.push({ x: car.x + 20, y: car.y + 16, angle: 0, hp: 40, speed: 128 });
      }
    }
    if (this.wanted === 0) { this.cars.length = 0; this.officers.length = 0; }
    // chase cars
    for (const car of this.cars) {
      const targetAngle = Math.atan2(playerPos.y - car.y, playerPos.x - car.x);
      let diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      const d = dist(car.x, car.y, playerPos.x, playerPos.y);
      const want = d > 70 ? 330 : 90;
      car.speed += clamp(want - car.speed, -420 * dt, 300 * dt);
      moveCar(car, dt, city);
    }
    // officers on foot chase
    for (const o of this.officers) {
      const d = dist(o.x, o.y, playerPos.x, playerPos.y);
      if (d > 26) { o.angle = Math.atan2(playerPos.y - o.y, playerPos.x - o.x); o.x += Math.cos(o.angle) * o.speed * dt; o.y += Math.sin(o.angle) * o.speed * dt; }
    }
    // BUSTED meter: an officer or stopped police car close while player is slow / on foot
    const playerSpeed = playerInCar ? Math.abs(playerInCar.speed) : 0;
    const threatNear = this.officers.some((o) => dist(o.x, o.y, playerPos.x, playerPos.y) < 44) ||
      (!playerInCar && this.cars.some((c) => dist(c.x, c.y, playerPos.x, playerPos.y) < 52)) ||
      (playerInCar && playerSpeed < 22 && this.cars.some((c) => dist(c.x, c.y, playerPos.x, playerPos.y) < 58));
    if (this.wanted > 0 && threatNear) {
      this.bustedMeter += dt / 2.2;
      if (this.bustedMeter >= 1) { this.bustedMeter = 0; onBusted && onBusted(); }
    } else this.bustedMeter = Math.max(0, this.bustedMeter - dt * 0.8);
  }
}
