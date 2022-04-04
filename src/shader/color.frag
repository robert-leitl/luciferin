#version 300 es

precision highp float;

uniform sampler2D u_particleTexture;
uniform float u_frames;

in vec3 v_position;
in vec3 v_normal;
in vec3 v_viewNormal;
in vec2 v_uv;
in vec3 v_surfaceToView;
in vec3 v_viewPosition;

out vec4 outColor;

#define PI 3.1415926535

void main() {
    vec3 pos = v_position;
    vec3 N = normalize(v_normal);
    vec3 VN = normalize(v_viewNormal);
    vec3 V = normalize(v_surfaceToView);
    vec3 L = normalize(vec3(0., 1., 1.));
    float NdL = dot(N, L);

    // calculate the reflection vector
    float NdV = dot(N, V);
    vec3 R = NdV * N * 2. - V;
    R = normalize(R);

    // calculate the half vector
    vec3 H = normalize(V + N);

    // base color
    vec3 albedo = vec3(0.0, 0.04, 0.1);

    // ambient ligthing
    vec3 ambient = vec3(0., 0.8, 2.0) * 0.1;

    // fresnel term
    float fresnel = min(1., pow(1. - NdV, 2.));

    // diffuse shading
    float diffuse = max(0., NdL) * 0.55;

    // specular shading
    float specular = pow(max(0., dot(H, L)), 60.) * 0.9;

    // color
    vec3 color = albedo + ambient * fresnel * .4 + specular * .1 + diffuse;

    vec4 hullColor = vec4(vec3(0., 0.8, 2.0) * diffuse + ambient, fresnel + 0.1);

    vec2 uv = vec2(gl_FragCoord) / vec2(textureSize(u_particleTexture, 0));
    vec2 RF = refract(normalize(v_viewPosition), VN, 1. / 1.33).xy * .15;
    vec2 chromaOffset = RF * .3;
    vec4 particleColor = vec4(
        texture(u_particleTexture, uv + RF + chromaOffset).r,
        texture(u_particleTexture, uv + RF).g,
        texture(u_particleTexture, uv + RF - chromaOffset).b,
        1.
    );

    outColor = hullColor * hullColor.a + particleColor * (1. - hullColor.a);
}
