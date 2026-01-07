import { ModelData } from './modelData';
import { QuadRenderPass } from './pass';
import { GuiParams } from '../lib/guiParams';
import { Pointer } from './pointer';
import { Common } from './common';

import basicVert from '../glsl/basic.vert';
import initPositionFrag from '../glsl/initPosition.frag';
import integrateVerletFrag from '../glsl/integrateVerlet.frag';
import copyPositionFrag from '../glsl/copyPosition.frag';
import applyExternalForceFrag from '../glsl/applyExternalForce.frag';
import solveConstraintsFrag from '../glsl/solveConstraints.frag';
import computeNormalFrag from '../glsl/computeNormal.frag';

import * as THREE from 'three';

const ZERO_VEC3 = new THREE.Vector3();

export class ClothSimulation {
  private _params: Record<string, any>;
  private _isFirstRender: boolean = true;
  private _initPosition: QuadRenderPass;
  private _integrateVerlet: QuadRenderPass;
  private _copyPosition: QuadRenderPass;
  private _applyExternalForce: QuadRenderPass;
  private _solveConstraints: QuadRenderPass;
  private _computeNormal: QuadRenderPass;

  constructor(modelData: ModelData) {
    this._params = {
      cursorSize: 0.15,
      solveIterations: 40
    };

    const dataTexture = modelData.dataTexture;
    const fixedResolution = new THREE.Vector2(dataTexture.resolution, dataTexture.resolution);

    this._initPosition = new QuadRenderPass({
      outputTarget: 'renderTarget',
      fixedResolution: fixedResolution,
      renderTargetOptions: {
        count: 2
      },
      shader: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: initPositionFrag,
        uniforms: {
          originalPosition: { value: dataTexture.position }
        }
      })
    });

    this._integrateVerlet = new QuadRenderPass({
      outputTarget: 'renderTarget',
      fixedResolution: fixedResolution,
      renderTargetOptions: {
        count: 2
      },
      shader: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: integrateVerletFrag,
        uniforms: {
          customModelMatrix: { value: null },
          originalPosition: { value: dataTexture.position },
          prevIntegerPosition: { value: null },
          prevFractionalPosition: { value: null },
          integerPosition: { value: null },
          fractionalPosition: { value: null },
          tension: { value: null },
          damping: { value: null },
          mass: { value: null },
          deltaTime: { value: null }
        }
      })
    });
    this._setIntegrateVerletParams();
    GuiParams.instance.addHandler('tension', () => this._setIntegrateVerletParams());
    GuiParams.instance.addHandler('mass', () => this._setIntegrateVerletParams());
    GuiParams.instance.addHandler('dampingRatio', () => this._setIntegrateVerletParams());

    this._copyPosition = new QuadRenderPass({
      outputTarget: 'renderTarget',
      fixedResolution: fixedResolution,
      renderTargetOptions: {
        count: 2
      },
      shader: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: copyPositionFrag,
        uniforms: {
          integerPosition: { value: null },
          fractionalPosition: { value: null }
        }
      })
    });

    this._applyExternalForce = new QuadRenderPass({
      outputTarget: 'renderTarget',
      fixedResolution: fixedResolution,
      renderTargetOptions: {
        count: 2
      },
      shader: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: applyExternalForceFrag,
        uniforms: {
          grabbedVertexIndex: { value: null },
          grabbedVertexPosition: { value: null },
          integerPosition: { value: null },
          fractionalPosition: { value: null },
          originalPosition: { value: dataTexture.position },
          cursorSize: { value: this._params.cursorSize }
        }
      })
    });

    this._solveConstraints = new QuadRenderPass({
      outputTarget: 'renderTarget',
      fixedResolution: fixedResolution,
      needsSwap: true,
      renderTargetOptions: {
        count: 2
      },
      shader: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: solveConstraintsFrag,
        uniforms: {
          integerPosition: { value: null },
          fractionalPosition: { value: null },
          adjacentIndices: { value: dataTexture.adjacentIndices },
          adjacentDistances: { value: dataTexture.adjacentDistances }
        },
        defines: {
          ADJ_ARR_TEX_LEN: dataTexture.adjArrTexLen
        }
      })
    });

    this._computeNormal = new QuadRenderPass({
      outputTarget: 'renderTarget',
      fixedResolution: fixedResolution,
      shader: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: computeNormalFrag,
        uniforms: {
          integerPosition: { value: null },
          fractionalPosition: { value: null },
          adjacentIndices: { value: dataTexture.adjacentIndices }
        },
        defines: {
          ADJ_ARR_TEX_LEN: dataTexture.adjArrTexLen
        }
      })
    });
  }

  private _setIntegrateVerletParams() {
    const tension = GuiParams.instance.prod.tension.value;
    const mass = GuiParams.instance.dev.mass.value;
    const dampingRatio = GuiParams.instance.dev.dampingRatio.value;

    const damping = 2 * Math.sqrt(tension * mass) * dampingRatio;

    this._integrateVerlet.setUniforms({
      tension: tension,
      damping: damping,
      mass: mass
    });
  }

  update(pointer: Pointer) {
    let prevPositionRt, positionRt;
    if(this._isFirstRender) {
      this._initPosition.render();

      prevPositionRt = positionRt = this._initPosition.getOutputRenderTarget();

      this._isFirstRender = false;
    } else {
      prevPositionRt = this._copyPosition.getOutputRenderTarget();
      positionRt = this._solveConstraints.getOutputRenderTarget();
    }

    this._integrateVerlet.setUniforms({
      customModelMatrix: pointer.customModelMatrix,
      prevIntegerPosition: prevPositionRt.textures[0],
      prevFractionalPosition: prevPositionRt.textures[1],
      integerPosition: positionRt.textures[0],
      fractionalPosition: positionRt.textures[1],
      deltaTime: Math.min(Common.instance.deltaTime, 1 / 30)
    });
    this._integrateVerlet.render();

    this._copyPosition.setUniforms({
      integerPosition: positionRt.textures[0],
      fractionalPosition: positionRt.textures[1]
    });
    this._copyPosition.render();

    this._applyExternalForce.setUniforms({
      grabbedVertexIndex: pointer.grabbedVertex?.index ?? - 1,
      grabbedVertexPosition: pointer.grabbedVertex?.position ?? ZERO_VEC3,
      integerPosition: this._integrateVerlet.getOutputRenderTarget().textures[0],
      fractionalPosition: this._integrateVerlet.getOutputRenderTarget().textures[1]
    });
    this._applyExternalForce.render();

    for(let i = 0; i < this._params.solveIterations; i++) {
      const positionRt = i === 0
        ? this._applyExternalForce.getOutputRenderTarget()
        : this._solveConstraints.getOutputRenderTarget();

      this._solveConstraints.setUniforms({
        integerPosition: positionRt.textures[0],
        fractionalPosition: positionRt.textures[1]
      });
      this._solveConstraints.render();
    }

    this._computeNormal.setUniforms({
      integerPosition: this._solveConstraints.getOutputRenderTarget().textures[0],
      fractionalPosition: this._solveConstraints.getOutputRenderTarget().textures[1]
    });
    this._computeNormal.render();
  }

  getOutputRenderTarget() {
    return {
      position: this._solveConstraints.getOutputRenderTarget(),
      normal: this._computeNormal.getOutputRenderTarget()
    };
  }
}
