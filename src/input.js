// Keyboard and pointer state. Drag/wheel deltas accumulate until the frame consumes them.
export class Input {
  constructor(element) {
    this.keys = new Set();
    this.dragX = 0;
    this.dragY = 0;
    this.wheel = 0;
    this.dragging = false;

    const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (movementKeys.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    let lastX = 0, lastY = 0;
    element.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      element.setPointerCapture(e.pointerId);
    });
    element.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.dragX += e.clientX - lastX;
      this.dragY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const stop = () => { this.dragging = false; };
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointercancel', stop);
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    element.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheel += e.deltaY;
    }, { passive: false });
  }

  get forward() {
    return (this.has('KeyW', 'ArrowUp') ? 1 : 0) - (this.has('KeyS', 'ArrowDown') ? 1 : 0);
  }

  get strafe() {
    return (this.has('KeyD', 'ArrowRight') ? 1 : 0) - (this.has('KeyA', 'ArrowLeft') ? 1 : 0);
  }

  get run() {
    return this.has('ShiftLeft', 'ShiftRight');
  }

  has(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  consumeDrag() {
    const d = { x: this.dragX, y: this.dragY };
    this.dragX = this.dragY = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }
}
