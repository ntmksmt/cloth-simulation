precision highp float;

in vec3 position;
in vec2 uv;

out vec3 vPosition;
out vec3 vViewPosition;
out vec3 vNormal;
out vec2 vUv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform sampler2D integerPosition;
uniform sampler2D fractionalPosition;
uniform sampler2D normal;

#include packPosition.glsl;

void main() {
  vec3 pos = packPosition(integerPosition, fractionalPosition, position.xy);

  vec4 mPosition = modelMatrix * vec4(pos, 1.0);
  vPosition = mPosition.xyz;
  
  vec4 mvPosition = viewMatrix * mPosition;
  vViewPosition = - mvPosition.xyz;

  vNormal = normalize(normalMatrix * texture(normal, position.xy).xyz);

  vUv = uv;

  gl_Position = projectionMatrix * mvPosition;
}
