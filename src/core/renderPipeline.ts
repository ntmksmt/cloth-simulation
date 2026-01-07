import { loadAll, loadGltf, loadTexture } from '../lib/assetsLoader';
import { Common } from './common';
import { ModelData } from './modelData';
import { Pointer } from './pointer';
import { ClothSimulation } from './clothSimulation';
import { Output } from './output';
import { Resize } from '../lib/resize';
import { Update } from '../lib/update';

import cylinder from '../assets/models/cylinder6381.glb';
import normalMap from '../assets/images/normalMap.png';

export class RenderPipeline {
  private _pointer!: Pointer;
  private _clothSimulation!: ClothSimulation;
  private _output!: Output;

  constructor(canvas: HTMLCanvasElement) {
    this._init(canvas);
  }

  private async _init(canvas: HTMLCanvasElement) {
    const assets = await loadAll({
      cylinder: loadGltf(cylinder),
      normalMap: loadTexture(normalMap)
    });

    Common.init(canvas, assets.cylinder);

    const modelData = new ModelData(assets.cylinder);

    this._pointer = new Pointer(modelData);

    this._clothSimulation = new ClothSimulation(modelData);

    this._output = new Output(modelData, assets.normalMap);

    Update.instance.addHandler(this._update.bind(this));

    Resize.instance.resize();
    Update.instance.update();
  }

  private _update() {
    this._pointer.update();
    
    this._clothSimulation.update(this._pointer);

    this._output.render(this._clothSimulation.getOutputRenderTarget());
  }
}
