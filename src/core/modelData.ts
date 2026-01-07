import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Face = { a: number; b: number; c: number; };

export class ModelData {
  geometry: THREE.BufferGeometry;
  vertices: THREE.Vector3[];
  dataTexture: {
    resolution: number;
    adjArrTexLen: number;
    position: THREE.DataTexture;
    adjacentIndices: THREE.DataArrayTexture;
    adjacentDistances: THREE.DataArrayTexture;
  }

  constructor(model: THREE.Mesh) {
    this.geometry = this._mergeDuplicateVertices(model.geometry);

    this.vertices = this._extractVertices(this.geometry);

    const resolution = Math.ceil(Math.sqrt(this.vertices.length));

    const { adjacentIndices, maxLength } = this._extractAdjacentIndices(this.geometry);
    const adjArrTexLen = Math.ceil(maxLength / 4); // 4-channel(RGBA)

    const dataTextures = this._convertToDataTextures(resolution, adjArrTexLen, this.vertices, adjacentIndices);

    this.dataTexture = {
      resolution: resolution,
      adjArrTexLen: adjArrTexLen,
      ...dataTextures
    };
  }

  private _mergeDuplicateVertices(geometry: THREE.BufferGeometry) {
    geometry.scale(1000, 1000, 1000);
    geometry = mergeVertices(geometry, 2);
    geometry.scale(0.001, 0.001, 0.001);

    return geometry;
  }

  private _extractVertices(geometry: THREE.BufferGeometry) {
    const position = geometry.attributes.position;
    return Array.from({ length: position.count }, (_, index) =>
      new THREE.Vector3().fromBufferAttribute(position, index)
    );
  }

  private _findAdjacentFace(faces: Face[], first: number, next: number) {
    for(const face of faces) {
      const { a, b, c } = face;
      if(
        a === first && b === next ||
        b === first && c === next ||
        c === first && a === next
      ) return face;
    }

    throw new Error('cloth-simulation.error: ModelData.face was not found.');
  }

  private _extractAdjacentIndices(geometry: THREE.BufferGeometry) {
    const positionCount = geometry.attributes.position.count;
    const faces: Face[][] = Array.from({ length: positionCount }, () => []);
    const adjacentIndices: number[][] = Array.from({ length: positionCount }, () => []);

    const index = geometry.index!;
    const indexCount = index.count / 3;
    for(let i = 0; i < indexCount; i++) {
      const i3 = i * 3;
      const face: Face = {
        a: index.getX(i3),
        b: index.getY(i3),
        c: index.getZ(i3)
      };

      Object.values(face).forEach(index =>
        faces[index].push(face)
      );
    }

    let minLength = Infinity;
    let maxLength = 0;
    for(let i = 0; i < faces.length; i++) {
      let face = faces[i][0];
      const firstFace = face;

      while(true) {
        const adjacentIndex = face.a === i ? face.c : face.b === i ? face.a : face.b;
        adjacentIndices[i].push(adjacentIndex);
        face = this._findAdjacentFace(faces[i], i, adjacentIndex);

        if(face === firstFace) break;
      }

      const length = adjacentIndices[i].length;
      if(length < minLength) minLength = length;
      if(length > maxLength) maxLength = length;
    }

    // console.log('minLength: ' + minLength + ', maxLength: ' + maxLength);

    return { adjacentIndices, maxLength };
  }

  private _createDataTexture(data: Float32Array, resolution: number) {
    const dataTexture = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    return dataTexture;
  }

  private _createDataArrayTexture(data: Float32Array, resolution: number, depth: number) {
    const dataArrayTexture = new THREE.DataArrayTexture(data as Float32Array<ArrayBuffer>, resolution, resolution, depth);
    dataArrayTexture.format = THREE.RGBAFormat;
    dataArrayTexture.type = THREE.FloatType;
    dataArrayTexture.needsUpdate = true;

    return dataArrayTexture;
  }

  private _convertToDataTextures(
    resolution: number,
    adjArrTexLen: number,
    unpackPosition: THREE.Vector3[],
    unpackAdjacentIndices: number[][]
  ) {
    const dataLength = resolution * resolution * 4;
    const packPosition = new Float32Array(dataLength).fill(- 1);
    const adjacentDataLength = dataLength * adjArrTexLen;
    const packAdjacentIndices = new Float32Array(adjacentDataLength).fill(- 1);
    const packAdjacentDistances = new Float32Array(adjacentDataLength).fill(- 1);

    for(let i = 0; i < unpackPosition.length; i++) {
      const i4 = i * 4;
      packPosition[i4] = unpackPosition[i].x;
      packPosition[i4 + 1] = unpackPosition[i].y;
      packPosition[i4 + 2] = unpackPosition[i].z;
      packPosition[i4 + 3] = 1;
    }

    for(let i = 0; i < unpackAdjacentIndices.length; i++) {
      const i4 = i * 4;
      const adjIdxs = unpackAdjacentIndices[i];
      const adjIdxsLen = adjIdxs.length;

      for(let j = 0; j < adjArrTexLen; j++) {
        const offset = j * dataLength;
        for(let k = 0; k < 4; k++) {
          const j4k = j * 4 + k;
          if(j4k >= adjIdxsLen) break;

          const adjIdx = adjIdxs[j4k];
          const adjDist = unpackPosition[i].distanceTo(unpackPosition[adjIdx]);

          packAdjacentIndices[offset + i4 + k] = adjIdx;
          packAdjacentDistances[offset + i4 + k] = adjDist;
        }
      }
    }

    const positionDt = this._createDataTexture(packPosition, resolution);
    const adjacentIndicesDt = this._createDataArrayTexture(packAdjacentIndices, resolution, adjArrTexLen);
    const adjacentDistancesDt = this._createDataArrayTexture(packAdjacentDistances, resolution, adjArrTexLen);

    return {
      position: positionDt,
      adjacentIndices: adjacentIndicesDt,
      adjacentDistances: adjacentDistancesDt
    };
  }
}
