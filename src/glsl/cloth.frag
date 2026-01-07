precision highp float;

in vec3 vPosition;
in vec3 vViewPosition;
in vec3 vNormal;
in vec2 vUv;

out vec4 fragColor;

uniform sampler2D normalMap;
uniform vec3 albedo;
uniform vec3 light0Color;
uniform vec3 light1Color;
uniform vec3 bgTopColor;
uniform vec3 bgBottomColor;

#define PI 3.1415926

#include acesToneMapping.glsl;
#include gammaCorrection.glsl;

mat3 getTangentFrame(vec3 eyePos, vec3 surfNor, vec2 uv) {
  vec3 q0 = dFdx(eyePos.xyz);
  vec3 q1 = dFdy(eyePos.xyz);
  vec2 st0 = dFdx(uv.st);
  vec2 st1 = dFdy(uv.st);

  vec3 N = surfNor;

  vec3 q1perp = cross(q1, N);
  vec3 q0perp = cross(N, q0);

  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;

  float det = max(dot(T, T), dot(B, B));
  float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

  return mat3(T * scale, B * scale, N);
}

const float minDot = 1e-3;
float clampedDot(vec3 a, vec3 b) {
  return max(dot(a, b), minDot);
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

float distribution(vec3 nor, vec3 h, float roughness) {
  float a2 = roughness * roughness;
  return a2 / (PI * pow(pow(clampedDot(nor, h), 2.0) * (a2 - 1.0) + 1.0, 2.0));
}

float geometry(float cosTheta, float k) {
  return (cosTheta) / (cosTheta * (1.0 - k) + k);
}

float smiths(float NdotV, float NdotL, float roughness) {
  float k = pow(roughness + 1.0, 2.0) / 8.0;
  return geometry(NdotV, k) * geometry(NdotL, k);
}

float specularBRDF(vec3 nor, vec3 viewDir, vec3 lightDir, vec3 h, float roughness) {
  float D, G, V;

  float NdotL = clampedDot(lightDir, nor);
  float NdotV = clampedDot(viewDir, nor);

  D = distribution(nor, h, roughness);
  G = smiths(NdotV, NdotL, roughness);
  V = G / max(0.0001, (4.0 * NdotV * NdotL));

  return D * V;
}

vec3 getEnvironment(vec3 dir) {
  return mix(bgBottomColor * vec3(2.5, 1.0, 1.2), bgTopColor, dir.y * 0.5 + 0.5) * 0.7;
}

vec3 getAmbientLight(vec3 nor) {
  vec3 grad = mix(vec3(0.15), vec3(1.8), nor.y * 0.5 + 0.5);
  return mix(grad * 0.8, getEnvironment(nor), 0.4);
}

vec3 getIrradiance(vec3 pos, vec3 rd, vec3 nor) {
  float roughness = 0.4;
  float IOR = 1.5;
  vec3 F0 = vec3(pow(IOR - 1.0, 2.0) / pow(IOR + 1.0, 2.0));

  vec3 directDiffuse = vec3(0.0);
  vec3 directSpecular = vec3(0.0);
  for(int i = 0; i < 2; i++) {
    vec3 light = vec3(0.0);
    vec3 lightDir = vec3(0.0);
    if(i == 0) {
      // continue;
      light = light0Color * 0.7;
      vec3 lightPos = vec3(4.0, 5.0, 6.0);
      lightDir = normalize(lightPos - pos);
    } else if(i == 1) {
      // continue;
      light = light1Color * 1.5;
      vec3 lightPos = vec3(3.0, 5.0, - 4.0);
      lightDir = normalize(lightPos - pos);
    }

    float NdotL = dot(nor, lightDir);
    directDiffuse += albedo * light * (NdotL * 0.5 + 0.5);

    vec3 h = normalize(- rd + lightDir);
    vec3 F = fresnelSchlickRoughness(clampedDot(h, - rd), F0, roughness);
    vec3 specular = F * specularBRDF(nor, - rd, lightDir, h, roughness);
    directSpecular += specular * light * clampedDot(nor, lightDir);
  }

  vec3 F = fresnelSchlickRoughness(clampedDot(nor, - rd), F0, roughness);
  
  vec3 kD = 1.0 - F;
  vec3 irradiance = getAmbientLight(nor);
  vec3 ambientDiffuse = irradiance * kD * albedo / PI;

  vec3 env = getEnvironment(nor);
  vec3 ambientSpecular = env * F * 0.7;

  vec3 diffuse = directDiffuse + ambientDiffuse;
  vec3 specular = directSpecular + ambientSpecular;

  return diffuse + specular;
}

void main() {
  vec3 pos = vPosition;

  vec3 rd = normalize(- vViewPosition);

  mat3 tbn = getTangentFrame(- vViewPosition, vNormal, vUv);
  vec3 mapN = texture(normalMap, vUv * vec2(3.6)).xyz * 2.0 - 1.0;
  mapN.xy *= vec2(2.5);
  vec3 nor = normalize(tbn * mapN);
  
  vec3 col = getIrradiance(pos, rd, nor);

  col = acesToneMapping(col);
  col = gammaCorrection(col);

  fragColor = vec4(col, 1.0);
}
