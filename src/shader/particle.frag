#version 300 es

precision highp float;

out vec4 outColor;

in float v_size;

void main() {
    vec2 c = gl_PointCoord * 2. - 1.;
    float colorMask = 1. - smoothstep(0., .5, length(c));
    float mask = 1. - smoothstep(0., 1., length(c));
    outColor = vec4(vec3(0., 0.2, 0.5) + vec3(v_size) * colorMask, mask * 0.1);
}
