precision highp float;

in vec2 vUv;

layout (location = 0) out vec4 intPos;
layout (location = 1) out vec4 fractPos;

uniform float grabbedVertexIndex;
uniform vec3 grabbedVertexPosition;
uniform sampler2D integerPosition;
uniform sampler2D fractionalPosition;
uniform sampler2D originalPosition;
uniform vec2 resolution;
uniform float cursorSize;

#include packPosition.glsl;
#include getUv.glsl;
#include unpackPosition.glsl;

void main() {
  if(grabbedVertexIndex < 0.0) {
    intPos = texture(integerPosition, vUv);
    fractPos = texture(fractionalPosition, vUv);
  } else {
    vec3 pos = packPosition(integerPosition, fractionalPosition, vUv);

    vec3 orgPos = texture(originalPosition, vUv).xyz;
    vec3 grabOrgPos = texture(originalPosition, getUv(grabbedVertexIndex, resolution)).xyz;
    float dist = distance(orgPos, grabOrgPos);

    if(dist <= cursorSize) {
      float strength = smoothstep(cursorSize, 0.0, dist);
      float falloff = pow(strength, 0.5) * 0.15;
      vec3 falloffPos = orgPos;
      falloffPos.z += falloff;

      vec3 offset = grabbedVertexPosition - grabOrgPos;

      vec3 proj = dot(grabOrgPos - orgPos, offset) / dot(offset, offset) * offset * 0.6;

      pos = falloffPos + proj + offset;
    }

    pos = unpackPosition(pos);
    intPos = vec4(floor(pos), 1.0);
    fractPos = vec4(fract(pos), 1.0);
  }
}
