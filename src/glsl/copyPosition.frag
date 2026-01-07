precision highp float;

in vec2 vUv;

layout (location = 0) out vec4 intPos;
layout (location = 1) out vec4 fractPos;

uniform sampler2D integerPosition;
uniform sampler2D fractionalPosition;

void main() {
  intPos = texture(integerPosition, vUv);
  fractPos = texture(fractionalPosition, vUv);
}
