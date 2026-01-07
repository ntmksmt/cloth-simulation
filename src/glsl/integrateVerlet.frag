precision highp float;

in vec2 vUv;

layout (location = 0) out vec4 intPos;
layout (location = 1) out vec4 fractPos;

uniform mat4 customModelMatrix;
uniform sampler2D originalPosition;
uniform sampler2D prevIntegerPosition;
uniform sampler2D prevFractionalPosition;
uniform sampler2D integerPosition;
uniform sampler2D fractionalPosition;
uniform float tension;
uniform float damping;
uniform float mass;
uniform float deltaTime;

#include packPosition.glsl;
#include unpackPosition.glsl;

void main() {
  vec3 orgPos = (customModelMatrix * vec4(texture(originalPosition, vUv).xyz, 1.0)).xyz;
  vec3 prevPos = packPosition(prevIntegerPosition, prevFractionalPosition, vUv);
  vec3 pos = packPosition(integerPosition, fractionalPosition, vUv);

  vec3 springF = (orgPos - pos) * tension;
  vec3 dampingF = (pos - prevPos) * damping;
  vec3 force = springF - dampingF;
  vec3 acce = force / mass;

  pos = 2.0 * pos - prevPos + acce * deltaTime * deltaTime;
  
  pos = unpackPosition(pos);
  intPos = vec4(floor(pos), 1.0);
  fractPos = vec4(fract(pos), 1.0);
}
