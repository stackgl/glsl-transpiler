/**
 * glsl-js stdlib.
 *
 * @module  glsl-stdlib
 */


/**
 * Basic type constructors.
 * Research shown that own data type wrappers are the best solution,
 * even with instance check in constructors.
 */

function noop () {};


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
function vec2 (x, y) {
	if (!(this instanceof vec2)) return new vec2(x, y);
	var value = [].concat.apply([], arguments);
	this[0] = value[0] != null ? value[0] : 0;
	this[1] = value[1] != null ? value[1] : this[0];
};

swizzle(vec2.prototype, 2);

vec2.prototype.valueOf = function () {
	return [this[0], this[1]];
};

vec2.prototype.mult = function (arg) {
	if (arg instanceof float) {
		return vec2(this[0] * arg.value, this[1] * arg.value);
	}
};


/**
 * vec3
 */
function vec3 (x, y, z) {
	if (!(this instanceof vec3)) return new vec3(x, y, z);
	var value = [].concat.apply([], arguments);
	this[0] = value[0] != null ? value[0] : 0;
	this[1] = value[1] != null ? value[1] : this[0];
	this[2] = value[2] != null ? value[2] : this[1];
}

swizzle(vec3.prototype, 3);

vec3.prototype.valueOf = function () {
	return [this[0], this[1], this[2]];
};


/**
 * vec4
 */
function vec4 (x, y, z, w) {
	if (!(this instanceof vec4)) return new vec4(x, y, z, w);
	var value = [].concat.apply([], arguments);
	this[0] = value[0] != null ? value[0] : 0;
	this[1] = value[1] != null ? value[1] : this[0];
	this[2] = value[2] != null ? value[2] : this[1];
	this[3] = value[3] != null ? value[3] : this[2];
}

swizzle(vec4.prototype, 4);

vec4.prototype.valueOf = function () {
	return [this[0], this[1], this[2], this[3]];
};


/**
 * mat2
 */
function mat2 (a,b,c,d) {

};


/**
 * Provide swizzles for an object
 */
function swizzle (obj, n) {
	var abbr = ['xyzw', 'stpd', 'rgba'];

	n = Math.min(n || obj.length || 0, 4);

	if (n < 1) return obj;

	//.x, .y
	abbr.forEach(function (abbr) {
		for (var i = 0; i < n; i++) {
			var x = abbr[i];
			Object.defineProperty(obj, x, {
				get: function () {
					return this[i];
				},
				set: function (value) {
					this[i] = value[0] != null ? value[0] : value;
				}
			});
		}
	});

	if (n < 2) return obj;

	//.xy, .yx, ...
	abbr.forEach(function (abbr) {
		for (var i = 0; i < n; i++) {
			for (var j = 0; j < n; j++) {
				var x = abbr[i];
				var y = abbr[j];
				Object.defineProperty(obj, x + y, {
					get: function () {
						return vec2(this[i], this[j]);
					},
					set: function (value) {
						if (x === y) throw Error(`Illegal — '${x}' used twice`);
						if (value.length !== 2) throw Error(`Illegal — mismatch between vec2 and vec${value.length}`);

						this[i] = value[0];
						this[j] = value[1];
					}
				});
			}
		}
	});

	if (n < 3) return obj;

	//.xyz, .yzx, ...
	abbr.forEach(function (abbr) {
		for (var i = 0; i < n; i++) {
			for (var j = 0; j < n; j++) {
				for (var k = 0; k < n; k++) {
					var x = abbr[i];
					var y = abbr[j];
					var z = abbr[k];
					Object.defineProperty(obj, x + y + z, {
						get: function () {
							return vec3(this[i], this[j], this[k]);
						},
						set: function (value) {
							if (x === y || x === z || y === z) throw Error(`Illegal — duplicating swizzle`);
							if (value.length !== 3) throw Error(`Illegal — mismatch between vec3 and vec${value.length}`);

							this[i] = value[0];
							this[j] = value[1];
							this[k] = value[2];
						}
					});
				}
			}
		}
	});

	if (n < 4) return obj;

	//.xyzw, .xxyy, ...
	abbr.forEach(function (abbr) {
		for (var i = 0; i < n; i++) {
			for (var j = 0; j < n; j++) {
				for (var k = 0; k < n; k++) {
					for (var l = 0; l < n; l++) {
						var x = abbr[i];
						var y = abbr[j];
						var z = abbr[k];
						var w = abbr[l];
						Object.defineProperty(obj, x + y + z + w, {
							get: function () {
								return vec4(this[i], this[j], this[k], this[l]);
							},
							set: function (value) {
								if (x === y || x === z || x === w || y === z || y === w || z === w) throw Error(`Illegal — duplicating swizzle`);
								if (value.length !== 4) throw Error(`Illegal — mismatch between vec4 and vec${value.length}`);

								this[i] = value[0];
								this[j] = value[1];
								this[k] = value[2];
								this[l] = value[3];
							}
						});
					}
				}
			}
		}
	});

	return obj;
};



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
exports.bvec2 =	vec2;
exports.bvec3 = vec3;
exports.bvec4 = vec4;
exports.ivec2 = vec2;
exports.ivec3 = vec3;
exports.ivec4 = vec4;
exports.uvec2 = vec2;
exports.uvec3 = vec3;
exports.uvec4 = vec4;
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
exports.uimageCubeArray = vec4;


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