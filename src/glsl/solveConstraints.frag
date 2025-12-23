precision highp float;
precision highp sampler2DArray;

in vec2 vUv;

layout (location = 0) out vec4 intPos;
layout (location = 1) out vec4 fractPos;

uniform sampler2D integerPosition;
uniform sampler2D fractionalPosition;
uniform sampler2DArray adjacentIndices;
uniform sampler2DArray adjacentDistances;
uniform vec2 resolution;

#include packPosition.glsl;
#include getUv.glsl;
#include unpackPosition.glsl;

void main() {
  vec3 pos = packPosition(integerPosition, fractionalPosition, vUv);

  vec3 disp = vec3(0.0);
  int cnt = 0;
  for(int i = 0; i < ADJ_ARR_TEX_LEN; i++) {
    vec4 adjIdxs = texture(adjacentIndices, vec3(vUv, float(i)));
    vec4 adjDists = texture(adjacentDistances, vec3(vUv, float(i)));

    for(int j = 0; j < 4; j++) {
      float adjIdx = adjIdxs[j];
      float adjDist = adjDists[j];
      if(adjIdx < 0.0) break;

      vec3 curtPos = packPosition(integerPosition, fractionalPosition, getUv(adjIdx, resolution));
      float curtDist = distance(pos, curtPos);
      if(curtDist == 0.0) continue;

      vec3 dir = (curtPos - pos) / curtDist;
      disp += (curtDist - adjDist) * dir;
      cnt++;
    }
  }

  if(cnt > 0) pos += disp / float(cnt);

  pos = unpackPosition(pos);
  intPos = vec4(floor(pos), 1.0);
  fractPos = vec4(fract(pos), 1.0);
}
