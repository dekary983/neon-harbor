// input.js — keyboard + mouse state, edge-triggered keys for menus and actions.
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.mouse.clicked = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    canvas.addEventListener('touchstart', () => { this.mouse.clicked = true; }, { passive: true });
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  justPressed(...codes) { return codes.some((c) => this.pressed.has(c)); }
  endFrame() { this.pressed.clear(); this.mouse.clicked = false; }
}
