// missions.js — Marco Vale's 5-mission story chain, taxi fares and hidden packages.
import { PLACES } from './config.js';
import { dist } from './rng.js';

export const MARCO_LINES = {
  intro: "Rook. I'm Marco Vale. I fix problems in Coral Bay — and right now, you're my favourite solution.",
  m1: 'First job, easy money. A coral-red sports car is parked by Ocean Drive. Bring it to my garage. Clean.',
  m2: 'A package waits at the marina. Pick it up and get it across town — fast. The clock is not your friend.',
  m3: 'That car is hot. The moment you touch it, every cop in Coral Bay wakes up. Lose the heat, then deliver.',
  m4: 'Three people owe me money. Visit each one and… persuade them. A little chat, up close. You know how.',
  m5: 'Last run. Hit every checkpoint across Coral Bay before time runs out. Drive like the harbor is on fire.',
  done: 'You did it, Rook. Coral Bay is yours now. Keep earning — the city never sleeps.',
};

export function createMissionState() {
  return {
    storyIndex: 0, // 0..4 next mission, 5 = complete
    active: null, // {id, stage, target, timer, debtorsLeft, checkpoints, cpIndex}
    dialog: null, dialogQueue: [],
    taxi: { passenger: null, carrying: false, fareTimer: 0 },
    packagesFound: 0,
    banner: '', bannerT: 0,
  };
}
export function missionMarker(state) {
  if (state.active) return state.active.target;
  if (state.storyIndex < 5) return { x: PLACES.marcoSpot.x, y: PLACES.marcoSpot.y, label: 'Marco Vale — next job' };
  return null;
}
export function startNextMission(state, world) {
  const i = state.storyIndex;
  if (i >= 5) return;
  if (i === 0) {
    const car = world.cars.find((c) => c.kind === 'sport' && c.parked) || world.cars[0];
    car.isMissionTarget = true;
    state.active = { id: 1, title: 'First Wheels', stage: 'steal', target: { x: car.x, y: car.y, label: 'Steal the sports car' }, targetCar: car, payout: 400 };
    state.dialog = MARCO_LINES.m1;
  } else if (i === 1) {
    state.active = { id: 2, title: 'Package Run', stage: 'pickup', target: { x: PLACES.marina.x, y: PLACES.marina.y, label: 'Pick up the package at the marina' }, timer: 95, payout: 650 };
    state.dialog = MARCO_LINES.m2;
  } else if (i === 2) {
    const car = world.cars.find((c) => c.kind === 'sport') || world.cars[1];
    car.isMissionTarget = true; car.parked = true;
    car.x = 950; car.y = 1330;
    state.active = { id: 3, title: 'Hot Property', stage: 'steal', target: { x: car.x, y: car.y, label: 'Take the hot car' }, targetCar: car, payout: 900 };
    state.dialog = MARCO_LINES.m3;
  } else if (i === 3) {
    const spots = [{ x: 950, y: 480 }, { x: 1950, y: 1480 }, { x: 2950, y: 2280 }];
    state.active = { id: 4, title: 'Collections', stage: 'debtor', debtors: spots, debtorIndex: 0, target: { x: spots[0].x, y: spots[0].y, label: 'Persuade debtor 1 of 3 (stand close + F)' }, payout: 750 };
    state.dialog = MARCO_LINES.m4;
  } else if (i === 4) {
    const cps = [{ x: 400, y: 400 }, { x: 1900, y: 900 }, { x: 3350, y: 1400 }, { x: 1900, y: 2400 }, { x: PLACES.garage.x, y: PLACES.garage.y }];
    state.active = { id: 5, title: 'Harbor Run', stage: 'checkpoint', checkpoints: cps, cpIndex: 0, target: { x: cps[0].x, y: cps[0].y, label: 'Checkpoint 1 of 5' }, timer: 150, payout: 2000 };
    state.dialog = MARCO_LINES.m5;
  }
}
export function completeMission(state, player, audio) {
  const payout = state.active ? state.active.payout : 0;
  player.cash += payout;
  state.banner = `MISSION COMPLETE  +$${payout}`; state.bannerT = 4;
  if (audio) { audio.complete(); audio.cash(); }
  state.active = null; state.storyIndex++;
  if (state.storyIndex >= 5) state.dialog = MARCO_LINES.done;
  return payout;
}
export function objectiveText(state) {
  if (state.active) {
    const a = state.active;
    let t = `${a.title}: ${a.target ? a.target.label : ''}`;
    if (a.timer) t += `  (${Math.max(0, Math.ceil(a.timer))}s)`;
    return t;
  }
  if (state.storyIndex < 5) return 'Go to the M marker — Marco Vale has work for you';
  return 'Story complete — free roam Coral Bay, run taxi fares and find packages';
}
export function updateMissions(state, dt, ctx2) {
  // ctx2: {player, playerPos, inCar, police, world, onCrime}
  const { player, playerPos, police } = ctx2;
  state.bannerT = Math.max(0, state.bannerT - dt);
  const a = state.active;
  if (!a) return;
  if (a.timer) { a.timer -= dt; if (a.timer <= 0) { state.active = null; state.banner = 'MISSION FAILED — return to Marco to retry'; state.bannerT = 4; return; } }
  const d = a.target ? dist(playerPos.x, playerPos.y, a.target.x, a.target.y) : 9999;
  if (a.id === 1) {
    if (a.stage === 'steal' && ctx2.inCar === a.targetCar) { a.stage = 'deliver'; a.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: "Deliver the car to Marco's garage" }; }
    else if (a.stage === 'deliver' && d < 90 && ctx2.inCar) completeMission(state, player, ctx2.audio);
  } else if (a.id === 2) {
    if (a.stage === 'pickup' && d < 70) { a.stage = 'deliver'; a.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: 'Deliver the package to the garage' }; state.banner = 'PACKAGE PICKED UP'; state.bannerT = 2; }
    else if (a.stage === 'deliver' && d < 90) completeMission(state, player, ctx2.audio);
  } else if (a.id === 3) {
    if (a.stage === 'steal' && ctx2.inCar === a.targetCar) { police.setWanted(3); a.stage = 'loseheat'; a.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: 'Lose the heat (wanted ≤ 1), then deliver to the garage' }; }
    else if (a.stage === 'loseheat' && d < 90 && ctx2.inCar && police.wanted <= 1) completeMission(state, player, ctx2.audio);
  } else if (a.id === 4) {
    // handled by persuade action in game.js (F near debtor target)
  } else if (a.id === 5) {
    if (d < 95 && ctx2.inCar) {
      a.cpIndex++;
      if (a.cpIndex >= a.checkpoints.length) completeMission(state, player, ctx2.audio);
      else { a.target = { x: a.checkpoints[a.cpIndex].x, y: a.checkpoints[a.cpIndex].y, label: `Checkpoint ${a.cpIndex + 1} of 5` }; if (ctx2.audio) ctx2.audio.cash(); }
    }
  }
}
export function persuadeDebtor(state, player, audio) {
  const a = state.active;
  if (!a || a.id !== 4) return false;
  a.debtorIndex++;
  if (audio) audio.cash();
  player.cash += 100;
  if (a.debtorIndex >= a.debtors.length) { completeMission(state, player, audio); return true; }
  const s = a.debtors[a.debtorIndex];
  a.target = { x: s.x, y: s.y, label: `Persuade debtor ${a.debtorIndex + 1} of 3 (stand close + F)` };
  state.banner = `DEBT COLLECTED (${a.debtorIndex}/3)  +$100`; state.bannerT = 2.5;
  return true;
}
export function makePackages(rng) {
  const pkgs = [];
  for (let i = 0; i < 20; i++) pkgs.push({ x: 120 + rng() * 3300, y: 120 + rng() * 2760, found: false, phase: rng() * 6 });
  return pkgs;
}
