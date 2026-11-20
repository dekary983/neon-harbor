// city.js — generates Coral Bay: road grid, blocks, neon buildings, palms, marina, beach and ocean.
import { WORLD, PALETTE } from './config.js';
import { makeRng, randRange, pick } from './rng.js';

export const V_ROADS = [400, 900, 1400, 1900, 2400, 2900, 3350];
export const H_ROADS = [400, 900, 1400, 1900, 2400];
export const ROAD_W = 110;

const SIGN_WORDS = ['NEON', 'CORAL', 'TIDES', 'PALMS', 'HAVANA', 'ORBIT', 'VELVET', 'AZURE', 'MIRAGE', 'SOLSTICE', 'BAY CLUB', 'HOTEL LUNA', 'CAFE SOL', 'DISCO', 'MARINA', 'CASINO'];

export function generateCity(seed = 2026) {
  const rng = makeRng(seed);
  const buildings = [], palms = [], props = [], signs = [];
  // Buildings fill each block between roads, leaving the beach strip (x>3550) clear.
  for (let bi = 0; bi < V_ROADS.length; bi++) {
    for (let bj = 0; bj < H_ROADS.length; bj++) {
      const x0 = (bi === 0 ? 60 : V_ROADS[bi - 1] + ROAD_W / 2 + 18);
      const x1 = V_ROADS[bi] - ROAD_W / 2 - 18;
      const y0 = (bj === 0 ? 60 : H_ROADS[bj - 1] + ROAD_W / 2 + 18);
      const y1 = H_ROADS[bj] - ROAD_W / 2 - 18;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // 1-2 buildings per block
      const n = rng() > 0.5 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const w = randRange(rng, 90, Math.max(100, (x1 - x0) / n - 14));
        const h = randRange(rng, 80, Math.max(90, (y1 - y0) - 20));
        const bx = x0 + k * ((x1 - x0) / n) + 6, by = y0 + randRange(rng, 0, Math.max(0, (y1 - y0) - h - 4));
        const color = pick(rng, PALETTE.building);
        buildings.push({ x: bx, y: by, w, h, color, floors: 3 + Math.floor(rng() * 6) });
        if (rng() > 0.35) signs.push({ x: bx + w / 2, y: by + 16, text: pick(rng, SIGN_WORDS), color: pick(rng, [PALETTE.neonPink, PALETTE.neonCyan, PALETTE.neonYellow, PALETTE.neonPurple]) });
      }
    }
  }
  // Extra downtown towers along the west-center
  for (let i = 0; i < 10; i++) {
    buildings.push({ x: 100 + rng() * 260, y: 300 + i * 260 + rng() * 40, w: 110 + rng() * 70, h: 120 + rng() * 60, color: pick(rng, PALETTE.building), floors: 8 });
  }
  // Palms along Ocean Drive (x=3350) and scattered on grass
  for (let y = 80; y < WORLD.h - 60; y += 95) { palms.push({ x: 3265 + rng() * 20, y, s: 0.9 + rng() * 0.5 }); palms.push({ x: 3445 + rng() * 20, y: y + 40, s: 0.9 + rng() * 0.5 }); }
  for (let i = 0; i < 70; i++) palms.push({ x: 80 + rng() * 3100, y: 80 + rng() * 2800, s: 0.7 + rng() * 0.6 });
  // Props: crates at marina, benches
  for (let i = 0; i < 26; i++) props.push({ x: 3420 + rng() * 120, y: 1150 + rng() * 600, kind: 'crate' });
  // Lane polylines for traffic: each road is a loop segment with two directions
  const lanes = [];
  for (const x of V_ROADS) { lanes.push({ pts: [[x - 26, 40], [x - 26, WORLD.h - 40]], dir: 1 }); lanes.push({ pts: [[x + 26, WORLD.h - 40], [x + 26, 40]], dir: -1 }); }
  for (const y of H_ROADS) { lanes.push({ pts: [[40, y + 26], [3520, y + 26]], dir: 1 }); lanes.push({ pts: [[3520, y - 26], [40, y - 26]], dir: -1 }); }
  return { buildings, palms, props, signs, lanes, colliders: buildings };
}

export function collidesWithBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function isOnRoad(x, y) {
  for (const x0 of V_ROADS) if (Math.abs(x - x0) < ROAD_W / 2) return true;
  for (const y0 of H_ROADS) if (Math.abs(y - y0) < ROAD_W / 2) return true;
  return false;
}
export function nearestRoadPoint(x, y) {
  let best = null, bd = 1e9;
  for (const x0 of V_ROADS) { const d = Math.abs(x - x0); if (d < bd) { bd = d; best = { x: x0, y }; } }
  for (const y0 of H_ROADS) { const d = Math.abs(y - y0); if (d < bd) { bd = d; best = { x, y: y0 }; } }
  return best;
}
