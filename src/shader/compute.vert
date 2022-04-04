#version 300 es

uniform float u_deltaTime;
uniform int u_frames;

const vec3 capsuleA = vec3(0., .5, 0.);
const vec3 capsuleB = vec3(0., -.5, 0.);
const float capsuleRadius = .5;

in vec3 a_oldPosition;
in vec3 a_oldVelocity;

out vec3 t_newPosition;
out vec3 t_newVelocity;

// Capsule SDF from https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdCapsule( vec3 p, vec3 a, vec3 b, float r )
{
  vec3 pa = p - a, ba = b - a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}

float f(vec3 p) {
    return sdCapsule(p, capsuleA, capsuleB, capsuleRadius);
}

// https://www.iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
vec3 sdCapsuleNormal( in vec3 p )
{
    const float eps = 0.0001;
    const vec2 h = vec2(eps,0);
    return normalize( vec3(f(p+h.xyy) - f(p-h.xyy),
                           f(p+h.yxy) - f(p-h.yxy),
                           f(p+h.yyx) - f(p-h.yyx) ) );
}

#pragma glslify: curlNoise = require(glsl-curl-noise) 
#pragma glslify: cnoise2 = require(glsl-noise/simplex/2d)

void main() {
    vec3 i = a_oldPosition * .95;
    float n2 = cnoise2(a_oldPosition.xz + float(u_frames) * 0.005);
    n2 *= .6;
    vec3 velocity = (a_oldVelocity + curlNoise(vec3(i.x, i.y + n2, i.z) * 2. - 1.) * 0.0007);
    vec3 delta = velocity * u_deltaTime;
    vec3 pos = a_oldPosition + delta;

    // use the capsule SDF to restrict the movement of the particles
    vec3 sdNormal = sdCapsuleNormal(pos);
    float d = dot(sdNormal, delta);
    float offset = capsuleRadius * .1;
    float sd = min(1., max(f(pos), -offset));
    float rs = sd / offset;
    vec3 o = sdNormal * (1. + rs);
    vec3 nPos = pos - o * d;
    vec3 vPos = pos - o * 40.;

    t_newPosition = nPos;
    t_newVelocity = normalize(vPos - a_oldPosition) * length(a_oldVelocity);
}
