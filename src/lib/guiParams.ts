import GUI from 'lil-gui';

type Mode = 'prod' | 'dev';

type Param<T> = {
  value: T;
};

type NumberParam = Param<number> & {
  type: 'number';
  min: number;
  max: number;
  step: number;
};

type BooleanParam = Param<boolean> & {
  type: 'boolean';
};

type SelectParam = Param<string> & {
  type: 'select';
  options: string[];
};

type ColorParam = Param<string> & {
  type: 'color';
};

type GuiParam =
  | NumberParam
  | BooleanParam
  | SelectParam
  | ColorParam;

const QUALITIES = ['high', 'medium'] as const;
export type Quality = (typeof QUALITIES)[number];

const PROD = {
  quality: { type: 'select', value: QUALITIES[0], options: [...QUALITIES] },
  tension: { type: 'number', value: 300, min: 200, max: 600, step: 10 },
  wireframe: { type: 'boolean', value: false }
} satisfies Record<string, GuiParam>;

const DEV = {
  tension: { type: 'number', value: 300, min: 1, max: 1000, step: 10 },
  mass: { type: 'number', value: 3, min: 1, max: 10, step: 1 },
  dampingRatio: { type: 'number', value: 2.5, min: 0.1, max: 10, step: 0.1 },
  bgTopColor: { type: 'color', value: '#eca0ad' },
  bgBottomColor: { type: 'color', value: '#fffaff' },
  albedo: { type: 'color', value: '#e6abb4' },
  light0Color: { type: 'color', value: '#ffffff' },
  light1Color: { type: 'color', value: '#ffffff' }
} satisfies Record<string, GuiParam>;

type ParamKeys = keyof(typeof PROD & typeof DEV);

export class GuiParams {
  private static _instance: GuiParams;
  private _gui?: GUI;
  private _showGui: boolean = true;
  private _mode: Mode = 'prod';
  private _handlers: Record<string, Function[]> = {};

  prod = PROD;
  dev = DEV;

  private constructor() {
    if(this._showGui) this._gui = new GUI();

    this._addGui();
  }

  static get instance() {
    if(!this._instance) this._instance = new GuiParams();

    return this._instance;
  }

  addHandler(key: ParamKeys, handler: Function) {
    if(!this._handlers[key]) this._handlers[key] = [];

    this._handlers[key].push(handler);
  }

  private _onChange(key: string, value: any) {
    this._handlers[key]?.forEach(handler => handler(value));
  }

  private _addGui() {
    const gui = this._gui;
    if(!gui) return;

    const params = (this._mode === 'prod' ? this.prod : this.dev) as Record<string, GuiParam>;

    Object.entries(params).forEach(([key, guiParam]) => {
      let controller;

      switch(guiParam.type) {
        case 'number':
          controller = gui.add(guiParam, 'value', guiParam.min, guiParam.max, guiParam.step);
          break;
        case 'boolean':
          controller = gui.add(guiParam, 'value');
          break;
        case 'select':
          controller = gui.add(guiParam, 'value', guiParam.options);
          break;
        case 'color':
          controller = gui.addColor(guiParam, 'value');
          break;
      }

      controller.name(key);
      controller.onChange((value: any) => this._onChange(key, value));
    });
  }
}
