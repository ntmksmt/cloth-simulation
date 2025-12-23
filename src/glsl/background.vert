precision highp float;

in vec3 position;

out vec3 vPosition;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

void main() {
  vec4 mPosition = modelMatrix * vec4(position, 1.0);
  vPosition = mPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * mPosition;
}
