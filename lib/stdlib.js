/**
 * OpenGL X environment methods.
 *
 * @module  glsl-js/lib/stdlib
 */


var π = Math.PI, ππ = π*2;
var TO_RADIANS = π / 180;
var TO_DEGREES = 180 / π;


/**
 * Types
 */
function bool (val) {
	return !!val;
}

function int (val) {
	return val|0;
}

function float (val) {
	return +val;
}

function vec2 (x) {
	if (x == null) x = 0;
	return [x, x]
}

function vec3 (x) {
	if (x == null) x = 0;
	return [x, x, x]
}

function vec4 (x) {
	if (x == null) x = 0;
	return [x, x, x, x]
}

function mat2 (x) {
	if (x == null) x = 1;
	return [x, 0, 0, x]

}

function mat3 (x) {
	if (x == null) x = 1;
	return [x, 0, 0, 0, x, 0, 0, 0, x]
}

function mat4 (x) {
	if (x == null) x = 1;
	return [x, 0, 0, 0, 0, x, 0, 0, 0, 0, x, 0, 0, 0, 0, x]
}


/**
 * Convert degrees to radians
 */
function radians (degrees) {
	if (degrees.length) return degrees.map(radians);
	return degrees * 0.017453292519943295;
}


/**
 * Convert radians to degrees
 */
function degrees (radians) {
	if (radians.length) return radians.map(degrees);
	return radians * 57.29577951308232;
}

function sin (angle) {
	if (angle.length) return angle.map(sin);
	return Math.sin(angle);
}

function cos (angle) {
	if (angle.length) return angle.map(cos);
	return Math.cos(angle);
}

function tan (angle) {
	if (angle.length) return angle.map(tan);
	return Math.tan(angle);
}

function asin (x) {
	if (x.length) return x.map(asin);
	return Math.asin(x);
}

function acos (x) {
	if (x.length) return x.map(acos);
	return Math.acos(x);
}

/**
 * Extended atan
 */
function atan (y, x) {
	if (arguments.length > 1) {
		if (y.length) return y.map(function (y, i) {
			return Math.atan2(y, x[i]);
		});

		return Math.atan2(y, x);
	}

	if (y.length) return y.map(function (y, i) {
		return Math.atan(y)
	});

	return Math.atan(y);
}

/**
 * Exp/log base 2
 */
function pow (x, y) {
	if (x.length) return x.map(function (x, i) {
		return Math.pow(x, y[i]);
	});
	return Math.pow(x, y);
}

function exp (x) {
	if (x.length) return x.map(exp);
	return Math.exp(x);
}

function log (x) {
	if (x.length) return x.map(log);
	return Math.log(x);
}

var log2 = Math.log2 ? function log2 (x) {
		if (x.length) return x.map(log2);
		return Math.log2(x);
	} : function log2 (x) {
		if (x.length) return x.map(log2);
		return Math.log(x) / Math.LN2;
	};

function exp2 (x) {
	if (x.length) return x.map(exp2);
	return Math.pow(2, x);
}

function sqrt (x) {
	if (x.length) return x.map(sqrt);
	return Math.sqrt(x);
}

/**
 * Inverse sqrt
 */
function inversesqrt (x) {
	if (x.length) return x.map(inversesqrt);
	return 1 / Math.sqrt(x);
}

function abs (x) {
	if (x.length) return x.map(abs);
	return Math.abs(x);
}

function floor (x) {
	if (x.length) return x.map(floor);
	return Math.floor(x);
}

function ceil (x) {
	if (x.length) return x.map(ceil);
	return Math.ceil(x);
}


/**
 * Sign
 */
var sign = Math.sign ? function sign (x) {
	if (x.length) return x.map(sign);
	return Math.sign(x);
} : function sign (x) {
	if (x.length) return x.map(sign);

	x = +x; // convert to a number

	if (x === 0 || isNaN(x)) {
		return x;
	}

	return x > 0 ? 1 : -1;
};

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


exports.bool = bool;
exports.int = int;
exports.uint = int;
exports.float = float;
exports.double = float;
exports.vec2 = vec2;
exports.vec3 = vec3;
exports.vec4 = vec4;
exports.dvec2 = vec2;
exports.dvec3 = vec3;
exports.dvec4 = vec4;
exports.ivec2 = vec2;
exports.ivec3 = vec3;
exports.ivec4 = vec4;
exports.uvec2 = vec2;
exports.uvec3 = vec3;
exports.uvec4 = vec4;
exports.mat2 = mat2;
exports.mat3 = mat3;
exports.mat4 = mat4;
exports.mat3x3 = mat3;
exports.mat4x4 = mat4;
exports.radians = radians;
exports.degrees = degrees;
exports.sin = sin;
exports.cos = cos;
exports.tan = tan;
exports.asin = asin;
exports.acos = acos;
exports.atan = atan;
exports.pow = pow;
exports.exp = exp;
exports.log = log;
exports.log2 = log2;
exports.exp2 = exp2;
exports.sqrt = sqrt;
exports.inversesqrt = inversesqrt;
exports.abs = abs;
exports.sign = sign;
exports.floor = floor;
exports.ceil = ceil;
exports.fract = fract;
exports.mod = mod;
exports.clamp = clamp;
exports.mix = mix;
exports.step = step;
exports.smoothstep = smoothstep;
exports.length = length;
exports.distance = distance;
exports.faceforward = faceforward;
exports.normalize = normalize;
exports.reflect = reflect;
exports.refract = refract;
exports.lessThan = lessThan;
exports.lessThanEqual = lessThanEqual;
exports.greaterThan = greaterThan;
exports.greaterThanEqual = greaterThanEqual;
exports.equal = equal;
exports.notEqual = notEqual;
exports.any = any;
exports.all = all;
exports.not = not;



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