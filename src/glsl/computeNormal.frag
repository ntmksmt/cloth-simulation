precision highp float;
precision highp sampler2DArray;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D integerPosition;
uniform sampler2D fractionalPosition;
uniform sampler2DArray adjacentIndices;
uniform vec2 resolution;

#include packPosition.glsl;
#include getUv.glsl;

void main() {
  vec3 pos = packPosition(integerPosition, fractionalPosition, vUv);

  vec3 nor = vec3(0.0);
  bool hasFirst = false;
  vec3 firstPos, prevPos;
  for(int i = 0; i < ADJ_ARR_TEX_LEN; i++) {
    vec4 adjIdxs = texture(adjacentIndices, vec3(vUv, float(i)));

    for(int j = 0; j < 4; j++) {
      float adjIdx = adjIdxs[j];
      if(adjIdx < 0.0) break;

      vec3 curtPos = packPosition(integerPosition, fractionalPosition, getUv(adjIdx, resolution));

      if(!hasFirst) {
        firstPos = curtPos;
        prevPos = curtPos;
        hasFirst = true;
        continue;
      }

      nor += cross(prevPos - pos, curtPos - pos);
      prevPos = curtPos;
    }
  }

  if(hasFirst) {
    nor += cross(prevPos - pos, firstPos - pos);
    nor = normalize(nor);
  }

  fragColor = vec4(nor, 1.0);
}
