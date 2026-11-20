// hud.js — HUD, minimap, objective banner, dialog box and all menu / end screens.
export function drawHUD(ctx, W, H, s) {
  const { player, police, missions, speedKmh, packagesTotal } = s;
  // top-left: cash + packages
  ctx.fillStyle = 'rgba(8,8,20,0.62)'; ctx.beginPath(); ctx.roundRect(14, 14, 228, 74, 10); ctx.fill();
  ctx.fillStyle = '#7CFC9A'; ctx.font = 'bold 26px system-ui,sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('$' + player.cash.toLocaleString(), 26, 46);
  ctx.fillStyle = '#fff'; ctx.font = '14px system-ui,sans-serif';
  ctx.fillText(`Packages ${missions.packagesFound}/${packagesTotal}`, 26, 70);
  // health bar
  ctx.fillStyle = '#333'; ctx.fillRect(120, 58, 104, 10);
  ctx.fillStyle = player.hp > 30 ? '#4caf50' : '#e53935'; ctx.fillRect(120, 58, 104 * Math.max(0, player.hp) / 100, 10);
  // wanted stars top-right
  ctx.font = '26px system-ui,sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < police.wanted ? '#ffd600' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', W - 18 - (4 - i) * 30, 42); }
  if (police.bustedMeter > 0.02) {
    ctx.fillStyle = '#333'; ctx.fillRect(W - 190, 56, 170, 12);
    ctx.fillStyle = '#ff1744'; ctx.fillRect(W - 190, 56, 170 * police.bustedMeter, 12);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.fillText('BUSTED?', W - 20, 54);
  }
  // speed bottom-right (in car)
  if (s.inCar) {
    ctx.fillStyle = 'rgba(8,8,20,0.62)'; ctx.beginPath(); ctx.roundRect(W - 150, H - 64, 132, 46, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(speedKmh)} km/h`, W - 30, H - 34);
  }
  // objective banner top-center
  ctx.font = 'bold 16px system-ui,sans-serif'; ctx.textAlign = 'center';
  const obj = s.objective;
  const tw = ctx.measureText(obj).width + 32;
  ctx.fillStyle = 'rgba(8,8,20,0.68)'; ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, 14, tw, 34, 8); ctx.fill();
  ctx.fillStyle = '#ffe600'; ctx.fillText(obj, W / 2, 37);
  if (missions.bannerT > 0 && missions.banner) {
    ctx.font = 'bold 30px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(8,8,20,0.7)'; const bw = ctx.measureText(missions.banner).width + 44;
    ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, 64, bw, 48, 10); ctx.fill();
    ctx.fillStyle = '#7CFC9A'; ctx.fillText(missions.banner, W / 2, 97);
  }
  drawMinimap(ctx, W, H, s);
  // dialog box
  if (missions.dialog) {
    ctx.fillStyle = 'rgba(5,5,18,0.88)'; ctx.beginPath(); ctx.roundRect(24, H - 128, W - 48, 104, 12); ctx.fill();
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 15px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('MARCO VALE', 42, H - 100);
    ctx.fillStyle = '#fff'; ctx.font = '17px system-ui,sans-serif';
    wrapText(ctx, missions.dialog, 42, H - 74, W - 84, 22);
    ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui,sans-serif'; ctx.fillText('Click or press Enter to continue', 42, H - 34);
  }
  if (s.hint) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W / 2 - 150, H - 34, 300, 24); ctx.fillStyle = '#fff'; ctx.font = '13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.hint, W / 2, H - 18); }
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = test; }
  if (line) ctx.fillText(line, x, yy);
}
export function drawMinimap(ctx, W, H, s) {
  const size = 168, x0 = 16, y0 = H - size - 16;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,24,0.88)'; ctx.beginPath(); ctx.roundRect(x0, y0, size, size, 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x0, y0, size, size, 10); ctx.clip();
  const sx = size / 4000, sy = size / 3000;
  ctx.fillStyle = '#1d3325'; ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#0e6b8a'; ctx.fillRect(x0 + 3550 * sx, y0, 450 * sx, size);
  ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 3;
  for (const rx of [400, 900, 1400, 1900, 2400, 2900, 3350]) { ctx.beginPath(); ctx.moveTo(x0 + rx * sx, y0); ctx.lineTo(x0 + rx * sx, y0 + size); ctx.stroke(); }
  for (const ry of [400, 900, 1400, 1900, 2400]) { ctx.beginPath(); ctx.moveTo(x0, y0 + ry * sy); ctx.lineTo(x0 + size, y0 + ry * sy); ctx.stroke(); }
  // police blips
  ctx.fillStyle = '#2979ff';
  for (const c of s.police.cars) { ctx.beginPath(); ctx.arc(x0 + c.x * sx, y0 + c.y * sy, 3, 0, 7); ctx.fill(); }
  // mission marker
  if (s.marker) { ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.arc(x0 + s.marker.x * sx, y0 + s.marker.y * sy, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('M', x0 + s.marker.x * sx, y0 + s.marker.y * sy + 3); }
  // player arrow
  const px = x0 + s.playerPos.x * sx, py = y0 + s.playerPos.y * sy;
  ctx.translate(px, py); ctx.rotate(s.playerAngle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(x0, y0, size, size, 10); ctx.stroke();
}
export function drawSkyline(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2b1055'); grad.addColorStop(0.55, '#7597de'); grad.addColorStop(0.78, '#ff9a5a'); grad.addColorStop(1, '#20142e');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(W * 0.72, H * 0.52, 52, 0, 7); ctx.fill();
  ctx.fillStyle = '#14102a';
  const base = H * 0.78;
  for (let i = 0; i < 26; i++) { const bw = 30 + (i * 53) % 60, bh = 70 + (i * 97) % 190, bx = i * (W / 25); ctx.fillRect(bx, base - bh, bw, bh); }
  ctx.fillStyle = '#0e6b8a'; ctx.fillRect(0, base, W, H - base);
  ctx.fillStyle = '#ffe082';
  for (let i = 0; i < 120; i++) ctx.fillRect((i * 173) % W, base - ((i * 89) % 170) - 8, 4, 5);
  // palms silhouettes
  ctx.strokeStyle = '#0a2015'; ctx.lineWidth = 5;
  for (const px of [W * 0.12, W * 0.88]) { ctx.beginPath(); ctx.moveTo(px, base + 10); ctx.quadraticCurveTo(px + 10, base - 60, px + 26, base - 84); ctx.stroke(); for (let k = 0; k < 5; k++) { const a = -0.4 - k * 0.5; ctx.beginPath(); ctx.moveTo(px + 26, base - 84); ctx.lineTo(px + 26 + Math.cos(a) * 34, base - 84 + Math.sin(a) * 22); ctx.stroke(); } }
}
export function drawTitleScreen(ctx, W, H, hasSaveFile) {
  drawSkyline(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff2e88'; ctx.font = '900 84px system-ui,sans-serif'; ctx.fillText('NEON HARBOR', W / 2, H * 0.36);
  ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 22px system-ui,sans-serif'; ctx.fillText('C O R A L   B A Y', W / 2, H * 0.36 + 40);
  ctx.fillStyle = 'rgba(5,5,18,0.75)'; ctx.beginPath(); ctx.roundRect(W / 2 - 240, H * 0.52, 480, hasSaveFile ? 150 : 118, 14); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px system-ui,sans-serif';
  ctx.fillText(hasSaveFile ? '▶  CONTINUE  (C)' : '▶  START  (Enter)', W / 2, H * 0.52 + 48);
  if (hasSaveFile) { ctx.font = '18px system-ui,sans-serif'; ctx.fillText('New game  (N)', W / 2, H * 0.52 + 82); }
  ctx.fillStyle = '#cfd8dc'; ctx.font = '15px system-ui,sans-serif';
  ctx.fillText('WASD move · Shift sprint · E enter/exit car · F / click punch · Space handbrake · Esc pause · M mute', W / 2, H * 0.52 + (hasSaveFile ? 122 : 92));
  ctx.fillStyle = '#ffe600'; ctx.font = '14px system-ui,sans-serif';
  ctx.fillText('Steal cars. Run jobs for Marco Vale. Shake the stars.', W / 2, H - 28);
}
export function drawOverlay(ctx, W, H, title, subtitle, color) {
  ctx.fillStyle = 'rgba(4,4,14,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = '900 64px system-ui,sans-serif'; ctx.fillText(title, W / 2, H / 2 - 16);
  ctx.fillStyle = '#fff'; ctx.font = '19px system-ui,sans-serif'; ctx.fillText(subtitle, W / 2, H / 2 + 28);
  ctx.fillStyle = '#aaa'; ctx.font = '14px system-ui,sans-serif'; ctx.fillText('Press Enter to continue', W / 2, H / 2 + 58);
}
