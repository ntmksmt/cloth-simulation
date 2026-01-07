#define GAMMA 2.2

vec3 gammaCorrection(vec3 col) {
  return pow(col, vec3(1.0 / GAMMA));
}
