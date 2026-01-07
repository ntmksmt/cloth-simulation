import * as THREE from 'three';

export class Resize {
  private static _instance: Resize;
  private _handlers: Function[] = [];
  private _timeoutId: number = 0;

  windowSize: THREE.Vector2 = new THREE.Vector2();

  private constructor() {
    window.addEventListener('resize', this._debounceResize.bind(this));
  }

  static get instance() {
    if(!this._instance) this._instance = new Resize();

    return this._instance;
  }

  addHandler(handler: Function) {
    this._handlers.push(handler);
  }

  resize() {
    this.windowSize.set(window.innerWidth, window.innerHeight);

    this._handlers.forEach(handler => handler());
  }

  private _debounceResize() {
    clearTimeout(this._timeoutId);

    this._timeoutId = setTimeout(this.resize.bind(this), 300);
  }
}
