// rng.js — deterministic seeded RNG (mulberry32) so screenshots and city layout are reproducible.
export function makeRng(seed = 12345) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randRange(rng, min, max) { return min + rng() * (max - min); }
export function randInt(rng, min, max) { return Math.floor(randRange(rng, min, max + 1)); }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
