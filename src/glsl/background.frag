precision highp float;

in vec3 vPosition;

out vec4 fragColor;

uniform float radius;
uniform vec3 topColor;
uniform vec3 bottomColor;

#define PI 3.1415926

#include acesToneMapping.glsl;
#include gammaCorrection.glsl;

float map(float x, float inMin, float inMax, float outMin, float outMax) {
  return (x - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}

float rand(vec2 uv) {
  float a = 12.9898, b = 78.233, c = 43758.5453;
  float dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, PI);

  return fract(sin(sn) * c);
}

vec3 dithering(vec3 col) {
  float gridPosition = rand(gl_FragCoord.xy);

  vec3 ditherShiftRGB = vec3(0.25 / 255.0, - 0.25 / 255.0, 0.25 / 255.0);
  ditherShiftRGB = mix(2.0 * ditherShiftRGB, - 2.0 * ditherShiftRGB, gridPosition);

  return col + ditherShiftRGB;
}

void main() {
  vec3 col = vec3(0.0);

  float height = vPosition.y / radius;
  float grad = clamp(map(height, - 1.0, 1.0, - 1.0, 2.0), 0.0, 1.0);
  col = mix(bottomColor * vec3(2.5, 1.0, 1.2), topColor, grad);

  col = acesToneMapping(col);
  col = gammaCorrection(col);
  col = dithering(col);

  fragColor = vec4(col, 1.0);
}
