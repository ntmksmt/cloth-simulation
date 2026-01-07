import { ModelData } from './modelData';
import { Resize } from '../lib/resize';
import { Common } from './common';

import * as THREE from 'three';

export class Pointer {
  private _params: Record<string, any>;
  private _isDown: boolean = false;
  private _coordinates: THREE.Vector2 = new THREE.Vector2();
  private _raycaster: THREE.Raycaster = new THREE.Raycaster();
  private _isNoHit: boolean = false;
  private _modelMesh: THREE.Mesh;
  private _modelVertices: THREE.Vector3[];
  private _plane: THREE.Plane;
  private _grabStartPosition: THREE.Vector3 = new THREE.Vector3();
  private _rotation: THREE.Quaternion = new THREE.Quaternion();

  grabbedVertex: {
    index: number;
    position: THREE.Vector3;
  } | null = null;
  customModelMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(modelData: ModelData) {
    this._params = {
      planeConstant: 0.5
    };

    window.addEventListener('mousedown', this._mouseDown.bind(this));
    window.addEventListener('mousemove', this._mouseMove.bind(this));
    window.addEventListener('mouseup', this._mouseUp.bind(this));
    window.addEventListener('mouseout', this._mouseUp.bind(this));

    window.addEventListener('touchstart', this._touchStart.bind(this));
    window.addEventListener('touchmove', this._touchMove.bind(this));
    window.addEventListener('touchend', this._touchEnd.bind(this));

    document.body.style.cursor = 'grab';

    this._modelMesh = new THREE.Mesh(modelData.geometry);
    this._modelVertices = modelData.vertices;

    this._plane = new THREE.Plane(new THREE.Vector3(0, 0, - 1), this._params.planeConstant);
  }

  private _setCoordinates(clientX: number, clientY: number) {
    const { x, y } = Resize.instance.windowSize;
    this._coordinates.set(
      clientX / x * 2 - 1,
      (y - clientY) / y * 2 - 1
    );
  }

  private _mouseDown(event: MouseEvent) {
    this._isDown = true;
    document.body.style.cursor = 'grabbing';

    this._mouseMove(event);
  }

  private _mouseMove(event: MouseEvent) {
    if(this._isDown) this._setCoordinates(event.clientX, event.clientY);
  }

  private _mouseUp() {
    this._isDown = false;
    document.body.style.cursor = 'grab';
    this._isNoHit = false;
    this.grabbedVertex = null;
  }

  private _touchStart(event: TouchEvent) {
    this._isDown = true;

    this._touchMove(event);
  }

  private _touchMove(event: TouchEvent) {
    this._setCoordinates(event.touches[0].clientX, event.touches[0].clientY);
  }

  private _touchEnd() {
    this._isDown = false;
    this._isNoHit = false;
    this.grabbedVertex = null;
  }

  private _updateCustomModelMatrix() {
    const newRotation = new THREE.Quaternion();

    if(this.grabbedVertex) {
      const originalPosition = this._modelVertices[this.grabbedVertex.index];
      const originalPositionVec = originalPosition.clone().normalize();
      const originalPositionVecXY = new THREE.Vector3(originalPositionVec.x, originalPositionVec.y, 0).normalize();

      const planeXY = new THREE.Plane(originalPositionVecXY, - originalPosition.dot(originalPositionVecXY));
      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), - originalPosition.z);

      const planeZIntersection = new THREE.Vector3();
      this._raycaster.setFromCamera(this._coordinates, Common.instance.camera);
      this._raycaster.ray.intersectPlane(planeZ, planeZIntersection);
      const distance = planeXY.distanceToPoint(planeZIntersection);

      if(distance < 0) {
        const axis = new THREE.Vector3().crossVectors(this._grabStartPosition, this.grabbedVertex.position).normalize();

        const normalAngle = Math.acos(originalPositionVec.dot(new THREE.Vector3(0, 0, 1))) + 0.1;
        const pullAngle = Math.abs(distance) * 2;

        newRotation.setFromAxisAngle(axis, Math.min(normalAngle, pullAngle));
      }
    }

    this._rotation.slerp(newRotation, this._isDown ? 0.1 : 0.05);
    this.customModelMatrix.compose(this._modelMesh.position, this._rotation, this._modelMesh.scale);
  }

  update() {
    if(this._isDown && !this._isNoHit) {
      this._raycaster.setFromCamera(this._coordinates, Common.instance.camera);

      if(!this.grabbedVertex) {
        const modelIntersection = this._raycaster.intersectObject(this._modelMesh)[0];
        if(!modelIntersection) {
          this._isNoHit = true;
          return;
        }

        const face = modelIntersection.face!;
        const indices = [face.a, face.b, face.c];
        const point = modelIntersection.point;

        let nearestIndex = indices[0], minDistance = Infinity;
        indices.forEach(index => {
          const distance = point.distanceTo(this._modelVertices[index]);
          if(distance < minDistance) {
            minDistance = distance;
            nearestIndex = index;
          }
        });

        this.grabbedVertex = {
          index: nearestIndex,
          position: new THREE.Vector3()
        };

        this._raycaster.ray.intersectPlane(this._plane, this._grabStartPosition);
      }

      this._raycaster.ray.intersectPlane(this._plane, this.grabbedVertex.position);
    }

    this._updateCustomModelMatrix();
  }
}
