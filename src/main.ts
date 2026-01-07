import './style.css';
import { RenderPipeline } from './core/renderPipeline';

new RenderPipeline(
  document.getElementById('canvas') as HTMLCanvasElement
);
