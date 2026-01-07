import { Pass } from './pass';
import { ModelData } from './modelData';
import { GuiParams } from '../lib/guiParams';
import { Common } from './common';

import backgroundVert from '../glsl/background.vert';
import backgroundFrag from '../glsl/background.frag';
import clothVert from '../glsl/cloth.vert';
import clothFrag from '../glsl/cloth.frag';

import * as THREE from 'three';

export class Output extends Pass {
  private _scene: THREE.Scene;
  private _backgroundMesh: THREE.Mesh;
  private _clothMesh: THREE.Mesh;

  constructor(modelData: ModelData, normalMap: THREE.Texture) {
    super({
      outputTarget: 'screen'
    });

    this._scene = new THREE.Scene();

    this._backgroundMesh = this._createBackgroundMesh();

    this._clothMesh = this._createClothMesh(modelData, normalMap);

    this._scene.add(this._backgroundMesh, this._clothMesh);
  }

  private _createBackgroundMesh() {
    const radius = 100;

    const geometry = new THREE.SphereGeometry(radius);

    const shader = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: backgroundVert,
      fragmentShader: backgroundFrag,
      uniforms: {
        radius: { value: radius },
        topColor: { value: new THREE.Color(GuiParams.instance.dev.bgTopColor.value) },
        bottomColor: { value: new THREE.Color(GuiParams.instance.dev.bgBottomColor.value) }
      },
      side: THREE.DoubleSide
    });
    GuiParams.instance.addHandler('bgTopColor', (color: any) =>
      super.setUniformsInternal(shader, { topColor: color })
    );
    GuiParams.instance.addHandler('bgBottomColor', (color: any) =>
      super.setUniformsInternal(shader, { bottomColor: color })
    );

    return new THREE.Mesh(geometry, shader);
  }

  private _createClothMesh(modelData: ModelData, normalMap: THREE.Texture) {
    const resolution = modelData.dataTexture.resolution;
    const uv = new Float32Array(resolution * resolution * 3);

    for(let i = 0; i < resolution; i++) {
      const row = (i + 0.5) / resolution;
      for(let j = 0; j < resolution; j++) {
        const offset = (i * resolution + j) * 3;
        uv[offset] = (j + 0.5) / resolution;
        uv[offset + 1] = row;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(uv, 3));
    geometry.setAttribute('uv', modelData.geometry.attributes.uv);
    geometry.setIndex(modelData.geometry.index);

    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    
    const shader = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: clothVert,
      fragmentShader: clothFrag,
      uniforms: {
        integerPosition: { value: null },
        fractionalPosition: { value: null },
        normal: { value: null },
        normalMap: { value: normalMap },
        albedo: { value: new THREE.Color(GuiParams.instance.dev.albedo.value) },
        light0Color: { value: new THREE.Color(GuiParams.instance.dev.light0Color.value) },
        light1Color: { value: new THREE.Color(GuiParams.instance.dev.light1Color.value) },
        bgTopColor: { value: new THREE.Color(GuiParams.instance.dev.bgTopColor.value) },
        bgBottomColor: { value: new THREE.Color(GuiParams.instance.dev.bgBottomColor.value) }
      },
      wireframe: GuiParams.instance.prod.wireframe.value
    });
    GuiParams.instance.addHandler('albedo', (color: any) =>
      super.setUniformsInternal(shader, { albedo: color })
    );
    GuiParams.instance.addHandler('light0Color', (color: any) =>
      super.setUniformsInternal(shader, { light0Color: color })
    );
    GuiParams.instance.addHandler('light1Color', (color: any) =>
      super.setUniformsInternal(shader, { light1Color: color })
    );
    GuiParams.instance.addHandler('wireframe', (wireframe: any) =>
      shader.wireframe = wireframe
    );

    return new THREE.Mesh(geometry, shader);
  }

  render(renderTargets: { position: THREE.WebGLRenderTarget, normal: THREE.WebGLRenderTarget }) {
    super.setUniformsInternal(this._clothMesh.material, {
      integerPosition: renderTargets.position.textures[0],
      fractionalPosition: renderTargets.position.textures[1],
      normal: renderTargets.normal.texture
    });
    super.renderInternal(this._scene, Common.instance.camera);
  }
}
