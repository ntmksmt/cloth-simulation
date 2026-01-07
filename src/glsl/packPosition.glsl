vec3 packPosition(sampler2D intPos, sampler2D fractPos, vec2 uv) {
  return (texture(intPos, uv).xyz + texture(fractPos, uv).xyz) / 1024.0;
}
