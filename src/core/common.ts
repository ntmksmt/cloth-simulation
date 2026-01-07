import { GuiParams, type Quality } from '../lib/guiParams';
import { Resize } from '../lib/resize';
import { Update } from '../lib/update';

import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export class Common {
  private static _instance: Common;
  private _params: Record<string, any>;
  private _pxRatio: Record<Quality, number> = {
    high: 2,
    medium: 1
  };
  private _clock: THREE.Clock = new THREE.Clock();
  private _stats?: Stats;
  private _showStats: boolean = true;
  private _modelRadius: THREE.Vector3 = new THREE.Vector3();

  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  deltaTime: number = 0;

  private constructor(canvas: HTMLCanvasElement) {
    this._params = {
      modelScale: new THREE.Vector2(0.85, 0.625)
    };

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    this._setPxRatio();
    GuiParams.instance.addHandler('quality', () => {
      this._setPxRatio();
      Resize.instance.resize();
    });

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    if(this._showStats) {
      this._stats = new Stats();
      document.body.appendChild(this._stats.dom);
    }

    Resize.instance.addHandler(this._resize.bind(this));
    Update.instance.addHandler(this._update.bind(this));
  }

  static init(canvas: HTMLCanvasElement, model: THREE.Mesh) {
    if(this._instance) return;

    this._instance = new Common(canvas);

    model.geometry.computeBoundingBox();
    const boundingBox = model.geometry.boundingBox!;
    this._instance._modelRadius.set(
      Math.max(boundingBox.max.x, - boundingBox.min.x),
      Math.max(boundingBox.max.y, - boundingBox.min.y),
      boundingBox.max.z
    );
  }

  static get instance() {
    if(!this._instance) throw new Error('canvas.error: Common is not initialized.');

    return this._instance;
  }

  private _setPxRatio() {
    const quality = GuiParams.instance.prod.quality.value;
    this.renderer.setPixelRatio(this._pxRatio[quality]);
  }

  private _resize() {
    const { x, y } = Resize.instance.windowSize;
    this.renderer.setSize(x, y);

    const aspect = x / y;
    this.camera.aspect = aspect;

    const height = x >= y
      ? this._modelRadius.y / this._params.modelScale.y
      : this._modelRadius.x / this._params.modelScale.x / aspect;
    let cameraPositionZ = height / Math.tan(this.camera.fov / 2 * Math.PI / 180);
    cameraPositionZ += this._modelRadius.z;
    this.camera.position.z = cameraPositionZ;
    this.camera.updateProjectionMatrix();
  }

  private _update() {
    this._stats?.update();
    
    this.deltaTime = this._clock.getDelta();
  }
}
