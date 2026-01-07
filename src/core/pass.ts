import { Resize } from '../lib/resize';
import { Common } from './common';

import basicVert from '../glsl/basic.vert';
import copyFrag from '../glsl/copy.frag';

import * as THREE from 'three';
import type {
  Wrapping,
  MagnificationTextureFilter,
  MinificationTextureFilter,
  PixelFormat,
  TextureDataType
} from 'three';

const QUAD_CAMERA = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
const QUAD_MESH = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const COPY_SHADER = new THREE.RawShaderMaterial({
  glslVersion: THREE.GLSL3,
  vertexShader: basicVert,
  fragmentShader: copyFrag,
  uniforms: {
    srcTexture: { value: null }
  }
});

type OutputTarget = 'screen' | 'renderTarget' | 'both';

type RenderTargetOptions = {
  wrapS: Wrapping;
  wrapT: Wrapping;
  magFilter: MagnificationTextureFilter;
  minFilter: MinificationTextureFilter;
  generateMipmaps: boolean;
  format: PixelFormat;
  type: TextureDataType;
  depthBuffer: boolean;
  stencilBuffer: boolean;
  samples: number;
  count: number;
};

const TEXTURE_DATA_TYPE = (/(iPad|iPhone|iPod)/g.test(navigator.userAgent))
  ? THREE.HalfFloatType
  : THREE.FloatType;
const DEFAULT_RTO: RenderTargetOptions = {
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,
  magFilter: THREE.LinearFilter,
  minFilter: THREE.LinearFilter,
  generateMipmaps: false,
  format: THREE.RGBAFormat,
  type: TEXTURE_DATA_TYPE,
  depthBuffer: false,
  stencilBuffer: false,
  samples: 0,
  count: 1
};

export abstract class Pass {
  private _outputTarget: OutputTarget;
  private _isFixedResolution: boolean = false;
  private _resolution: THREE.Vector2 = new THREE.Vector2();
  private _pxScale: THREE.Vector2 = new THREE.Vector2();
  private _resolutionScale: number = 1;
  private _needsSwap: boolean = false;
  private _renderTargets?: {
    read?: THREE.WebGLRenderTarget;
    write: THREE.WebGLRenderTarget;
  };

  constructor({
    outputTarget,
    fixedResolution,
    resolutionScale = 1,
    needsSwap = false,
    renderTargetOptions
  }: {
    outputTarget: OutputTarget;
    fixedResolution?: THREE.Vector2;
    resolutionScale?: number;
    needsSwap?: boolean;
    renderTargetOptions?: Partial<RenderTargetOptions>
  }) {
    this._outputTarget = outputTarget;

    if(fixedResolution) {
      this._resolution.copy(fixedResolution);
      this._pxScale.set(1 / this._resolution.x, 1 / this._resolution.y);

      this._isFixedResolution = true;
    }

    this._resolutionScale = resolutionScale;

    this._needsSwap = needsSwap;

    if(this._outputTarget !== 'screen') {
      const { x, y } = fixedResolution ?? { x: 1, y: 1 };
      const rto = { ...DEFAULT_RTO, ...renderTargetOptions };
      const renderTarget = new THREE.WebGLRenderTarget(x, y, rto);

      this._renderTargets = { write: renderTarget };
      if(this._needsSwap) this._renderTargets.read = renderTarget.clone();
    }

    Resize.instance.addHandler(this._resize.bind(this));
  }

  private _resize() {
    if(this._isFixedResolution) return;

    this._resolution
      .copy(Resize.instance.windowSize)
      .multiplyScalar(Common.instance.renderer.getPixelRatio())
      .multiplyScalar(this._resolutionScale);

    this._pxScale.set(1 / this._resolution.x, 1 / this._resolution.y);

    if(this._renderTargets) {
      Object.values(this._renderTargets).forEach(renderTarget =>
        renderTarget?.setSize(this._resolution.x, this._resolution.y)
      );
    }
  }

  protected get resolution() {
    return this._resolution;
  }

  protected get pxScale() {
    return this._pxScale;
  }

  private _validateHexColor(value: any) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  }

  protected setUniformsInternal(shader: THREE.Material | THREE.Material[], uniforms: Record<string, any>) {
    if(Array.isArray(shader) || !(shader instanceof THREE.ShaderMaterial)) {
      throw new Error('canvas.error: Pass.setUniformsInternal is only available for ShaderMaterial.');
    }

    Object.entries(uniforms).forEach(([key, value]) => {
      const isHexColor = this._validateHexColor(value);
      if(isHexColor) {
        (shader.uniforms[key].value as THREE.Color).set(value);
      } else {
        shader.uniforms[key].value = value;
      }
    });
  }

  protected renderInternal(object3d: THREE.Object3D, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    const renderTarget = this._outputTarget === 'screen' ? null : this._renderTargets!.write;
    Common.instance.renderer.setRenderTarget(renderTarget);
    Common.instance.renderer.render(object3d, camera);

    if(this._outputTarget === 'both') {
      this.setUniformsInternal(COPY_SHADER, {
        srcTexture: this._renderTargets!.write.textures[0]
      });
      QUAD_MESH.material = COPY_SHADER;

      Common.instance.renderer.setRenderTarget(null);
      Common.instance.renderer.render(QUAD_MESH, QUAD_CAMERA);
    }

    if(this._needsSwap && this._renderTargets) {
      const tmp = this._renderTargets.read!;
      this._renderTargets.read = this._renderTargets.write;
      this._renderTargets.write = tmp;
    }
  }

  abstract render(...args: any): void;

  getOutputRenderTarget() {
    if(!this._renderTargets) throw new Error('canvas.error: Pass._renderTargets was not found.');

    return this._needsSwap ? this._renderTargets.read! : this._renderTargets.write;
  }
}

export class QuadRenderPass extends Pass {
  private _shader: THREE.ShaderMaterial;

  constructor({
    shader,
    ...passParameters
  }: {
    shader: THREE.ShaderMaterial;
  } & ConstructorParameters<typeof Pass>[0]) {
    super(passParameters);

    this._shader = shader;
    this._shader.uniforms.resolution = { value: this.resolution };
    this._shader.uniforms.pxScale = { value: this.pxScale };
  }

  setUniforms(uniforms: Record<string, any>) {
    super.setUniformsInternal(this._shader, uniforms);
  }

  render() {
    QUAD_MESH.material = this._shader;
    super.renderInternal(QUAD_MESH, QUAD_CAMERA);
  }
}
