export class Update {
  private static _instance: Update;
  private _handlers: Function[] = [];

  private constructor() {
    this.update = this.update.bind(this);
  }

  static get instance() {
    if(!this._instance) this._instance = new Update();

    return this._instance;
  }

  addHandler(handler: Function) {
    this._handlers.push(handler);
  }

  update() {
    this._handlers.forEach(handler => handler());

    window.requestAnimationFrame(this.update);
  }
}
