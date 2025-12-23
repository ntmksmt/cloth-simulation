vec2 getUv(float index, vec2 resolution) {
  float x = mod(index, resolution.x);
  float y = floor(index / resolution.x);
  return (vec2(x, y) + 0.5) / resolution;
}
