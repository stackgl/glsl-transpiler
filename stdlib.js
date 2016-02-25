/**
 * glsl-js stdlib.
 *
 * @module  glsl-stdlib
 */

var extend = require('xtend/mutable');


function noop () {};


/**
 * Transfer first arg unchanged
 */
function arg (val) { return val };


/**
 * Bool cast
 */
function bool (value) {
	return !!value;
};


/**
 * Int cast
 */
function int (value) {
	return +value|0;
};


/**
 * Float cast
 */
function float (value) {
	return +value;
};


/**
 * vec2
 */
function vec2 () {
	return vec2.create(this, arguments);
};

vector(vec2, {
	dimensions: 2,
	type: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4
});


/**
 * vec3
 */
function vec3 () {
	return vec3.create(this, arguments);
}

vector(vec3, {
	dimensions: 3,
	type: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4
});


/**
 * vec4
 */
function vec4 () {
	return vec4.create(this, arguments);
}

vector(vec4, {
	dimensions: 4,
	type: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4
});

/**
 * ivec2
 */
function ivec2 () {
	return ivec2.create(this, arguments);
};

vector(ivec2, {
	dimensions: 2,
	type: int,
	vec2: ivec2,
	vec3: ivec3,
	vec4: ivec4
});


/**
 * ivec3
 */
function ivec3 () {
	return ivec3.create(this, arguments);
}

vector(ivec3, {
	dimensions: 3,
	type: int,
	vec2: ivec2,
	vec3: ivec3,
	vec4: ivec4
});


/**
 * ivec4
 */
function ivec4 () {
	return ivec4.create(this, arguments);
}

vector(ivec4, {
	dimensions: 4,
	type: int,
	vec2: ivec2,
	vec3: ivec3,
	vec4: ivec4
});


/**
 * bvec2
 */
function bvec2 () {
	return bvec2.create(this, arguments);
};

vector(bvec2, {
	dimensions: 2,
	type: bool,
	vec2: bvec2,
	vec3: bvec3,
	vec4: bvec4
});


/**
 * bvec3
 */
function bvec3 () {
	return bvec3.create(this, arguments);
}

vector(bvec3, {
	dimensions: 3,
	type: bool,
	vec2: bvec2,
	vec3: bvec3,
	vec4: bvec4
});


/**
 * bvec4
 */
function bvec4 () {
	return bvec4.create(this, arguments);
}

vector(bvec4, {
	dimensions: 4,
	type: bool,
	vec2: bvec2,
	vec3: bvec3,
	vec4: bvec4
});


/**
 * mat2
 */
function mat2 () {
	return mat2.create(this, arguments);
};

matrix(mat2, {
	type: vec2,
	dimensions: 2
});


/**
 * Make constructor a vector.
 * Fastest vector implementation is proved to be native data type.
 * Performance is comparable to typed arrays.
 *
 * Options:
 * @param {number} dimensions Vector dimensions
 * @param {function} map function mapper
 */
function vector (constr, opts) {
	//provide array methods
	constr.prototype = Object.create(Array.prototype);

	extend(constr, opts);

	//create instance
	constr.create = function (target, args) {
		if (!(target instanceof constr)) target = new constr();

		args = flatten(args);

		var i = 0, arg, map = this.type, last = map(0), n = this.dimensions;

		while (i < n) {
			arg = args[i];
			target[i] = map(arg == null ? last : arg);
			last = target[i];
			i++;
		}

		return target;
	};

	//provide swizzles
	swizzle(constr);

	//glsl methods
	constr.prototype.length = function length () {
		return constr.dimensions;
	};

	constr.prototype.valueOf = function () {
		var res = [], n = constr.dimensions;
		for (var i = 0; i < n; i++) {
			res.push(this[i]);
		}
		return res;
	};

	constr.prototype.toString = function () {
		var n = constr.dimensions;
		return `vec${n}(${this.valueOf().join(', ')})`;
	};

	constr.prototype.mult = function (arg) {
		if (arg instanceof float) {
			return vec2(this[0] * arg.value, this[1] * arg.value);
		}
	};

	return constr;
};



/**
 * Provide swizzles for an object - a xxxx-getters
 */
function swizzle (constr) {
	var dim = constr.dimensions;

	var abbr = ['xyzw', 'stpd', 'rgba'].map(function (abbr) {
		abbr = abbr.split('').slice(0, dim);
		abbr.push('');
		return abbr;
	});

	//.xyzw, .xxyy, ...
	abbr.forEach(function (abbr) {
		for (var i = 0; i <= dim; i++) {
			for (var j = 0; j <= dim; j++) {
				for (var k = 0; k <= dim; k++) {
					for (var l = 0; l <= dim; l++) {
						createSizzle(constr, i,j,k,l,abbr);
					}
				}
			}
		}
	});

	function createSizzle (constr, i,j,k,l, abbr) {
		var x = abbr[i];
		var y = abbr[j];
		var z = abbr[k];
		var w = abbr[l];
		var prop = x + y + z + w;

		if (!prop) return;
		if (constr.prototype.hasOwnProperty(prop)) return;

		var len = prop.length;
		var vec = constr['vec' + len] || constr.type;

		Object.defineProperty(constr.prototype, prop, {
			get: function () {
				return vec(this[i], this[j], this[k], this[l]);
			},
			set: function (value) {
				if (x === y || x === z || x === w || y === z || y === w || z === w) throw Error(`Illegal — duplicating swizzle`);
				if (value.length() !== len) throw Error(`Illegal — mismatch between vec${len} and vec${value.length}`);

				this[i] = value[0];
				this[j] = value[1];
				if (len < 3) return;
				this[k] = value[2];
				if (len < 4) return;
				this[l] = value[3];
			}
		});
	};

	return constr;
};


/**
 * Matriz constructor.
 * Matrix is a set of n-dim float vectors.
 *
 * Options:
 * @param {vec} type Vector class to use as a base
 * @param {number} dimensions Number of columns
 */
function matrix (constr, opts) {
	extend(constr, opts);

	//provide array methods
	constr.prototype = Object.create(Array.prototype);

	//matrix is created whether from a number of columns as vectors, or a list of args
	constr.create = function (target, args) {
		if (!(target instanceof constr)) target = new constr();

		args = flatten(args);

		var vec = this.type;
		var size = this.dimensions;

		//create vectors
		for (var i = 0; i < size; i++) {
			target[i] = vec();
		}

		//apply args
		var i = 0, j = 0, arg, last = 0, col, dim = vec.dimensions, n = size * dim;

		while (i < n) {
			arg = args[i];
			col = target[Math.floor(i / size)];

			col[i % dim] = arg == null ? last : arg;
			last = col[i];
			i++;
		}

		return target;
	};

	//length returns number of vectors
	constr.prototype.length = function () {
		return constr.dimensions;
	};
};


/**
 * Tiny array-like structures flattener, for args recognition
 */
function flatten (arr, max) {
	var result = [];

	if (!arr.length) return arr;

	var l = typeof arr.length === 'number' ? arr.length : arr.length();

	for (var i = 0; i < l; i++) {
		if (arr[i].length != null) result = result.concat(flatten(arr[i], max - result.length));
		else result.push(arr[i]);

		if (i >= max) break;
	}

	return result;
}



//OpenGL types
//https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
exports.void = noop;
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
exports.bvec2 =	bvec2;
exports.bvec3 = bvec3;
exports.bvec4 = bvec4;
exports.ivec2 = ivec2;
exports.ivec3 = ivec3;
exports.ivec4 = ivec4;
exports.uvec2 = ivec2;
exports.uvec3 = ivec3;
exports.uvec4 = ivec4;
exports.mat2 =
exports.mat3 =
exports.mat4 =
exports.mat2x2 =
exports.mat2x3 =
exports.mat2x4 =
exports.mat3x2 =
exports.mat3x3 =
exports.mat3x4 =
exports.mat4x2 =
exports.mat4x3 =
exports.mat4x4 =
exports.dmat2 =
exports.dmat3 =
exports.dmat4 =
exports.dmat2x2 =
exports.dmat2x3 =
exports.dmat2x4 =
exports.dmat3x2 =
exports.dmat3x3 =
exports.dmat3x4 =
exports.dmat4x2 =
exports.dmat4x3 =
exports.dmat4x4 =
exports.sampler1D =
exports.image1D =
exports.sampler2D =
exports.image2D =
exports.sampler3D =
exports.image3D =
exports.samplerCube =
exports.imageCube =
exports.sampler2DRect =
exports.image2DRect =
exports.sampler1DArray =
exports.image1DArray =
exports.sampler2DArray =
exports.image2DArray =
exports.samplerBuffer =
exports.imageBuffer =
exports.sampler2DMS =
exports.image2DMS =
exports.sampler2DMSArray =
exports.image2DMSArray =
exports.samplerCubeArray =
exports.imageCubeArray =
exports.sampler1DShadow =
exports.sampler2DShadow =
exports.sampler2DRectShadow =
exports.sampler1DArrayShadow =
exports.sampler2DArrayShadow =
exports.samplerCubeShadow =
exports.samplerCubeArrayShadow =
exports.isampler1D =
exports.iimage1D =
exports.isampler2D =
exports.iimage2D =
exports.isampler3D =
exports.iimage3D =
exports.isamplerCube =
exports.iimageCube =
exports.isampler2DRect =
exports.iimage2DRect =
exports.isampler1DArray =
exports.iimage1DArray =
exports.isampler2DArray =
exports.iimage2DArray =
exports.isamplerBuffer =
exports.iimageBuffer =
exports.isampler2DMS =
exports.iimage2DMS =
exports.isampler2DMSArray =
exports.iimage2DMSArray =
exports.isamplerCubeArray =
exports.iimageCubeArray =
exports.atomic_uint =
exports.usampler1D =
exports.uimage1D =
exports.usampler2D =
exports.uimage2D =
exports.usampler3D =
exports.uimage3D =
exports.usamplerCube =
exports.uimageCube =
exports.usampler2DRect =
exports.uimage2DRect =
exports.usampler1DArray =
exports.uimage1DArray =
exports.usampler2DArray =
exports.uimage2DArray =
exports.usamplerBuffer =
exports.uimageBuffer =
exports.usampler2DMS =
exports.uimage2DMS =
exports.usampler2DMSArray =
exports.uimage2DMSArray =
exports.usamplerCubeArray =
exports.uimageCubeArray = mat2;


//Preprocessor directives
`
#
#define
#undef
#if
#ifdef
#ifndef
#else
#elif
#endif
#error
#pragma
#extension
#version
#line
defined
##
`;

//WebGL functions
`
type radians (type degrees)
type degrees (type radians)
type sin (type angle)
type cos (type angle)
type tan (type angle)
type asin (type x)
type acos (type x)
type atan (type y, type x)
type atan (type y_over_x)
type pow (type x, type y)
type exp (type x)
type log (type x)
type exp2 (type x)
type log2 (type x)
type sqrt (type x)
type inversesqrt (type x)
type abs (type x)
type sign (type x)
type floor (type x)
type ceil (type x)
type fract (type x)
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
`;