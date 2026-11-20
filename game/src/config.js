// config.js — tuning constants and the Coral Bay palette for Neon Harbor.
export const WORLD = { w: 4000, h: 3000 };
export const PALETTE = {
  sky: '#1a1033', asphalt: '#2b2f3a', roadLine: '#f5d76e', sidewalk: '#8a8f9e',
  grass: '#2e7d4f', sand: '#f2d492', ocean: '#0e6b8a', ocean2: '#1299b8',
  neonPink: '#ff2e88', neonCyan: '#00e5ff', neonYellow: '#ffe600', neonPurple: '#b967ff',
  building: ['#3a3f5c','#4a3555','#2f4a5c','#5c3a4a','#3d5c3a','#554a2f','#2f3a6b','#6b2f4a'],
  carColors: ['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa','#ec407a','#00acc1','#f5f5f5','#37474f'],
};
export const TUNING = {
  playerSpeed: 165, sprintMult: 1.65, playerRadius: 13,
  carAccel: 340, carMaxSpeed: 430, carReverse: 130, carTurn: 2.6,
  trafficCount: 24, pedCount: 42, packageCount: 20, packageReward: 250,
  bustedRadius: 46, bustedTime: 2.2,
};
export const PLACES = {
  garage: { x: 620, y: 1620, label: "Marco's Garage" },
  marina: { x: 3520, y: 1450, label: 'Coral Bay Marina' },
  policeStation: { x: 1500, y: 950, label: 'CBPD Station' },
  hospital: { x: 2450, y: 1950, label: 'Coral Bay Hospital' },
  marcoSpot: { x: 3480, y: 1520, label: 'Marco Vale' },
};
