// shots.js — deterministic staged scenes for screenshots via ?shot=<name>.
// Each setup positions the player, cars, police and dialog so a headless capture shows real gameplay.
import { PLACES } from './config.js';

export function isShotMode() {
  return new URLSearchParams(location.search).get('shot');
}
export function applyShot(name, S) {
  const { player, police, missions } = S;
  S.mode = 'playing';
  if (name === 'cover') {
    S.dayT = 0.42; // golden sunset
    const car = S.cars.find((c) => c.kind === 'convertible') || S.cars[0];
    car.x = 3350; car.y = 1500; car.angle = Math.PI / 2; car.speed = 190; car.parked = false;
    player.inCar = car; car.driver = 'player'; player.cash = 1840; missions.packagesFound = 3;
    missions.active = { id: 0, title: 'Free Roam', target: { x: PLACES.garage.x, y: PLACES.garage.y, label: "Marco's garage" } };
    S.shotObjective = "Cruise Ocean Drive — deliver the ride to Marco's garage";
  } else if (name === 'chase') {
    S.dayT = 0.3;
    const car = S.cars.find((c) => c.kind === 'sport') || S.cars[0];
    car.x = 1400; car.y = 1400; car.angle = 0.5; car.speed = 300; car.parked = false;
    player.inCar = car; car.driver = 'player'; player.cash = 2650;
    police.setWanted(3);
    // converging police cars placed deterministically around the intersection
    const spots = [[1260, 1290, 0.6], [1560, 1330, 2.8], [1420, 1580, -1.4], [1180, 1480, 0.1]];
    for (const [x, y, a] of spots) {
      // reuse police update spawner by pre-seeding cars through the system array
      police.cars.push({ x, y, angle: a, speed: 240, w: 44, h: 22, kind: 'police', color: '#fff', health: 100, smoke: 0, driver: 'cop' });
    }
    S.shotObjective = 'Lose the heat!';
  } else if (name === 'mission') {
    S.dayT = 0.28;
    player.x = PLACES.marcoSpot.x - 36; player.y = PLACES.marcoSpot.y + 10; player.angle = 0; player.cash = 620;
    missions.dialog = "Rook. I'm Marco Vale. I fix problems in Coral Bay — and right now, you're my favourite solution. First job: a coral-red sports car waits on Ocean Drive. Bring it to my garage.";
    S.shotObjective = 'Talk to Marco Vale — First Wheels';
    // a few peds nearby
    S.peds.slice(0, 6).forEach((p, i) => { p.x = PLACES.marcoSpot.x - 90 + i * 36; p.y = PLACES.marcoSpot.y - 60 + (i % 3) * 34; });
  } else if (name === 'night') {
    S.dayT = 0.92; // night
    player.x = 1420; player.y = 1332; player.angle = 0.4; player.cash = 3110; missions.packagesFound = 7;
    police.setWanted(1);
    police.officers.push({ x: 1545, y: 1415, angle: 2.6, hp: 40, speed: 128 });
    S.shotObjective = 'Night run — stay out of trouble (or don\'t)';
    S.peds.slice(0, 5).forEach((p, i) => { p.x = 1330 + i * 44; p.y = 1470 + (i % 2) * 26; });
  }
  // pre-step the world so traffic is moving and the scene feels alive
  for (let i = 0; i < 40; i++) S.stepWorld(1 / 30, true);
  if (name === 'chase') { /* keep staged police positions after pre-step drift */ }
}
