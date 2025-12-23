precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D srcTexture;

void main() {
  fragColor = texture(srcTexture, vUv);
}
