// Keyboard and mouse, and nothing else: WASD or arrows to move, Shift to
// sneak, click to throw a pebble where the mouse points, F for smoke,
// G to douse the nearest lamp. The game also reads a scripted input queue,
// which the screenshot scenes use to play themselves.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
    this.script = [];
    this.scriptIndex = 0;
    this.scriptTime = 0;
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.clicked = true;
      this.mouse.clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.clickY = (event.clientY - rect.top) * (canvas.height / rect.height);
    });
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  // Scripted inputs for a screenshot scene: [{ at, keys: ['w'], click: {x,y} }]
  // applied in order while the scene plays forward.
  loadScript(script) {
    this.script = script;
    this.scriptIndex = 0;
    this.scriptTime = 0;
  }

  updateScript(dt) {
    this.scriptTime += dt;
    while (this.scriptIndex < this.script.length && this.script[this.scriptIndex].at <= this.scriptTime) {
      const step = this.script[this.scriptIndex];
      this.scriptIndex += 1;
      this.keys = new Set(step.keys || []);
      if (step.click) {
        this.mouse.clicked = true;
        this.mouse.clickX = step.click.x;
        this.mouse.clickY = step.click.y;
      }
      if (step.clear) this.keys.clear();
    }
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  get sneaking() {
    return this.keys.has('shift');
  }

  consumeClick() {
    if (!this.mouse.clicked) return null;
    this.mouse.clicked = false;
    return { x: this.mouse.clickX, y: this.mouse.clickY };
  }

  consumeKey(key) {
    const k = key.toLowerCase();
    if (this.keys.has(k)) {
      this.keys.delete(k);
      return true;
    }
    return false;
  }
}
