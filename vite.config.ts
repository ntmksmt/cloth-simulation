import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: './',
  plugins: [glsl()],
  assetsInclude: ['**/*.exr', '**/*.gltf', '**/*.glb'],
  server: {
    host: true,
    open: true
  }
});
