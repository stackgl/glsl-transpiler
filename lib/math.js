var extend = require('xtend/mutable');
var bvec2 = require('./types').bvec2;

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
	return x - Math.floor(x);
}

/**
 * Mod
 */
function mod (x, y) {
	// return x - y * Math.floor(x / y);
	return x % y;
}

/**
 * Clamper
 */
function clamp (x, min, max) {
	return Math.min(max, Math.max(min, x));
}

/**
 * Mix
 */
function mix (x, y, a) {
	return x * (1.0 - a) + y * a;
}


/**
 * Step
 */
function step (edge, x) {
	return x < edge ? 0.0 : 1.0;
}

/**
 * Smoothstep
 */
function smoothstep (edge0, edge1, x) {
	var t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
	return t * t * (3.0 - 2.0 * t);
}

/**
 * Geom length
 */
function length (x) {
	return sqrt(x.x * x.x + x.y * x.y);
}

/**
 * Distance between 2 vecs
 */
function distance(p0, p1) {
	return length(p0 - p1);
}


function faceforward (N, I, Nref) {
	if (Nref == null) return sign(-I.Ng) * N;
	return sign(-I.Nref) * N;
}

function normalize (V) {
	return V / length(V);
}

function reflect (I, N) {
	return I - 2*(I.N)*N;
}

function refract (I, N, eta) {
	var IdotN = I.N;
	var k = 1 - eta*eta*(1 - IdotN*IdotN);
	return k < 0 ? (0,0,0) : eta*I - (eta*IdotN + sqrt(k))*N;
}


// Vector Relational Functions
function lessThan (x, y) {
	return bvec2(x.x < y.x, x.y < y.y);
}

function lessThanEqual (x, y) {
	return bvec2(x.x <= y.x, x.y <= y.y);
}

function greaterThan (x, y) {
	return bvec2(x.x > y.x, x.y > y.y);
}

function greaterThanEqual (x, y) {
	return bvec2(x.x >= y.x, x.y >= y.y);
}

function equal (x, y) {
	return bvec2(x.x == y.x, x.y == y.y);
}

function notEqual (x, y) {
	return bvec2(x.x != y.x, x.y != y.y);
}

function any(x) {
	return x.x || x.y;
}

function all(x) {
	return x.x && x.y;
}

function not (x) {
	return bvec2(!x.x, !x.y);
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
	fract: fract,
	mod: mod,
	clamp: clamp,
	mix: mix,
	step: step,
	smoothstep: smoothstep,
	length: length,
	distance: distance,
	faceforward: faceforward,
	normalize: normalize,
	reflect: reflect,
	refract: refract,
	lessThan: lessThan,
	lessThanEqual: lessThanEqual,
	greaterThan: greaterThan,
	greaterThanEqual: greaterThanEqual,
	equal: equal,
	notEqual: notEqual,
	any: any,
	all: all,
	not: not
});



`
mat matrixCompMult (mat x, mat y)
float dot (type x, type y)
vec3 cross (vec3 x, vec3 y)
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