var extend = require('xtend/mutable');

var π = Math.PI, ππ = π*2;


/**
 * Convert degrees to radians
 */
function radians (degrees) {
	return degrees * π / 180;
}


/**
 * Convert radians to degrees
 */
function degrees (radians) {
	return radians * 180 / π;
}

/**
 * Extended atan
 */
function atan (y, x) {
	if (arguments.length > 1) {
		return Math.atan(y/x);
	}
	return Math.atan(y);
}

/**
 * Exp/log base 2
 */
function log2 (x) {
	return Math.log(x) / Math.LN2;
}
function exp2 (base, power) {
    if (power === 0) {
        return 1;
    } else if (power === 1) {
        return base;
    } else if (base % 2 === 0) {
        return exp2(base, power / 2) * exp2(base, power / 2)
    } else {
        return base * exp2(base, (power - 1) / 2) * exp2(base, (power - 1) / 2);
    }
}

/**
 * Inverse sqrt
 */
function inversesqrt (x) {
	return 1/Math.sqrt(x);
}


/**
 * Sign
 */
function sign (x) {
	x = +x; // convert to a number
	if (x === 0 || isNaN(x)) {
		return x;
	}

	return x > 0 ? 1 : -1;
}

/**
 * fract
 */
function fract (x) {

}


extend(exports, Math);
extend(exports, {
	radians: radians,
	degrees: degrees,
	atan: atan,
	log2: Math.log2 || log2,
	exp2: exp2,
	inversesqrt: inversesqrt,
	sign: Math.sign || sign,
	fract: fract
});


`
type mod (type x, float y)
type mod (type x, type y)
type min (type x, type y)
type min (type x, float y)
type max (type x, type y)
type max (type x, float y)
type clamp (type x, type minV, type maxV)
type clamp (type x, float minV, float maxV)
type mix (type x, type y, type a)
type mix (type x, type y, float a)
type step (type edge, type x)
type step (float edge, type x)
type smoothstep (type a, type b, type x)
type smoothstep (float a, float b, type x)
mat matrixCompMult (mat x, mat y)
float length (type x)
float distance (type p0, type p1)
float dot (type x, type y)
vec3 cross (vec3 x, vec3 y)
type normalize (type x)
type faceforward (type N, type I, type Nref)
type reflect (type I, type N)
type refract (type I, type N,float eta)
bvec lessThan(vec x, vec y)
bvec lessThan(ivec x, ivec y)
bvec lessThanEqual(vec x, vec y)
bvec lessThanEqual(ivec x, ivec y)
bvec greaterThan(vec x, vec y)
bvec greaterThan(ivec x, ivec y)
bvec greaterThanEqual(vec x, vec y)
bvec greaterThanEqual(ivec x, ivec y)
bvec equal(vec x, vec y)
bvec equal(ivec x, ivec y)
bvec equal(bvec x, bvec y)
bvec notEqual(vec x, vec y)
bvec notEqual(ivec x, ivec y)
bvec notEqual(bvec x, bvec y)
bool any(bvec x)
bool all(bvec x)
bvec not(bvec x)
vec4 texture2D(sampler2D sampler, vec2 coord )
vec4 texture2D(sampler2D sampler, vec2 coord, float bias)
vec4 textureCube(samplerCube sampler, vec3 coord)
vec4 texture2DProj(sampler2D sampler, vec3 coord )
vec4 texture2DProj(sampler2D sampler, vec3 coord, float bias)
vec4 texture2DProj(sampler2D sampler, vec4 coord)
vec4 texture2DProj(sampler2D sampler, vec4 coord, float bias)
vec4 texture2DLodEXT(sampler2D sampler, vec2 coord, float lod)
vec4 texture2DProjLodEXT(sampler2D sampler, vec3 coord, float lod)
vec4 texture2DProjLodEXT(sampler2D sampler, vec4 coord, float lod)
vec4 textureCubeLodEXT(samplerCube sampler, vec3 coord, float lod)
vec4 texture2DGradEXT(sampler2D sampler, vec2 P, vec2 dPdx, vec2 dPdy)
vec4 texture2DProjGradEXT(sampler2D sampler, vec3 P, vec2 dPdx, vec2 dPdy)
vec4 texture2DProjGradEXT(sampler2D sampler, vec4 P, vec2 dPdx, vec2 dPdy)
vec4 textureCubeGradEXT(samplerCube sampler, vec3 P, vec3 dPdx, vec3 dPdy)
type dFdx( type x ), dFdy( type x )
type fwidth( type p )
`