import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const loadTexture = (url: string): Promise<THREE.Texture> => {
  return new Promise(resolve =>
    new THREE.TextureLoader().load(url, texture => resolve(texture))
  );
}

export const loadExrTexture = (url: string): Promise<THREE.DataTexture> => {
  return new Promise(resolve =>
    new EXRLoader().load(url, texture => resolve(texture))
  );
}

export const loadCubeTexture = (urls: string[]): Promise<THREE.CubeTexture> => {
  return new Promise(resolve =>
    new THREE.CubeTextureLoader().load(urls, texture => resolve(texture))
  );
}

export const loadGltf = (url: string): Promise<THREE.Mesh> => {
  return new Promise(resolve =>
    new GLTFLoader().load(url, gltf => resolve(gltf.scene.children[0] as THREE.Mesh))
  );
}

type Loads = {
  [key: string]: Promise<THREE.Texture | THREE.DataTexture | THREE.CubeTexture | THREE.Mesh>;
};

export const loadAll = async <T extends Loads>(loads: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
  const assets = await Promise.all(
    Object.entries(loads).map(async ([key, promise]) => [key, await promise] as const)
  );
  return Object.fromEntries(assets) as { [K in keyof T]: Awaited<T[K]> };
}
