#version 300 es

precision highp float;

out vec4 outColor;

in float v_size;

void main() {
    vec2 c = gl_PointCoord * 2. - 1.;
    float colorMask1 = 1. - smoothstep(0., 1., length(c));
    float colorMask2 = 1. - smoothstep(0., .1, length(c));
    vec3 baseColor1 = vec3(0., 0.2, 0.5) * .001;
    vec3 baseColor2 = vec3(0., 0.2, 0.4);
    vec4 color = vec4(baseColor1 + vec3(v_size) * colorMask1, colorMask1 * 0.03);
    color += vec4(baseColor2 + vec3(v_size) * colorMask2, colorMask2 * 0.03);
    outColor = color;
}
