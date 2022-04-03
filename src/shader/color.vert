#version 300 es

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

in vec2 a_position;

void main() {
    vec4 worldPosition = u_worldMatrix * vec4(a_position, 0., 1.);
    vec4 viewPosition = u_viewMatrix * worldPosition;
    gl_Position = u_projectionMatrix * viewPosition;
}
