precision highp float;

in vec2 vUv;

layout (location = 0) out vec4 intPos;
layout (location = 1) out vec4 fractPos;

uniform sampler2D originalPosition;

#include unpackPosition.glsl;

void main() {
  vec3 pos = unpackPosition(texture(originalPosition, vUv).xyz);
  intPos = vec4(floor(pos), 1.0);
  fractPos = vec4(fract(pos), 1.0);
}
