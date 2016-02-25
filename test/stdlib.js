//ref https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf

var test = require('tst');
var _ = require('../stdlib');
var assert = require('assert');


test.skip('Primitives', function () {
	int(uint) // converts an unsigned integer to a signed integer
	int(bool) // converts a Boolean value to an int
	int(float) // converts a float value to an int
	int(double) // converts a double value to a signed integer
	uint(int) // converts a signed integer value to an unsigned integer
	uint(bool) // converts a Boolean value to an unsigned integer
	uint(float) // converts a float value to an unsigned integer
	uint(double) // converts a double value to an unsigned integer
	bool(int) // converts a signed integer value to a Boolean
	bool(uint) // converts an unsigned integer value to a Boolean value
	bool(float) // converts a float value to a Boolean
	bool(double) // converts a double value to a Boolean
	float(int) // converts a signed integer value to a float
	float(uint) // converts an unsigned integer value to a float value
	float(bool) // converts a Boolean value to a float
	float(double)// converts a double value to a float
	double(int) // converts a signed integer value to a double
	double(uint) // converts an unsigned integer value to a double
	double(bool) // converts a Boolean value to a double
	double(float)// converts a float value to a double
});

test.only('Types constructors', function () {
	var {vec2, vec3, vec4, mat2, ivec3, ivec4, bvec4} = _;

	test('vec3()', function () {
		var v = vec3();

		assert.equal(v.length(), 3);
		assert.equal(v[0], 0);
		assert.equal(v[1], 0);
		assert.equal(v[2], 0);
		assert.equal(v[3], undefined);
	});

	// initializes each component of the vec3 with the float
	test('vec3(float)', function () {
		var v = vec3(2.2);

		assert.equal(v.length(), 3);
		assert.equal(v[0], 2.2);
		assert.equal(v[1], 2.2);
		assert.equal(v[2], 2.2);
		assert.equal(v[3], undefined);
	});

	// makes a vec4 with component-wise conversion
	test('vec4(ivec4)', function () {
		var iv = ivec4(0, 1, 2, 3);
		var v = vec4(iv);

		assert.equal(v.length(), 4);
		assert.equal(v[0], 0);
		assert.equal(v[1], 1);
		assert.equal(v[2], 2);
		assert.equal(v[3], 3);
	});

	// the vec4 is column 0 followed by column 1
	test('vec4(mat2)', function () {
		var m = mat2(0, 1, 2, 3);
		console.log(m)
		var v = vec4(m);

		assert.equal(v.length(), 4);
		assert.equal(v[0], 0);
		assert.equal(v[1], 1);
		assert.equal(v[2], 2);
		assert.equal(v[3], 3);
	});

	`
	vec2(float, float) // initializes a vec2 with 2 floats
	ivec3(int, int, int) // initializes an ivec3 with 3 ints
	bvec4(int, int, float, float) // uses 4 Boolean conversions
	vec2(vec3) // drops the third component of a vec3
	vec3(vec4) // drops the fourth component of a vec4
	vec3(vec2, float) // vec3.x = vec2.x, vec3.y = vec2.y, vec3.z = float
	vec3(float, vec2) // vec3.x = float, vec3.y = vec2.x, vec3.z = vec2.y
	vec4(vec3, float)
	vec4(float, vec3)
	vec4(vec2, vec2)

	// To initialize the diagonal of a matrix with all other elements set to zero:
	mat2(float)
	mat3(float)
	mat4(float)


	mat2(vec2, vec2); // one column per argument
	mat3(vec3, vec3, vec3); // one column per argument
	mat4(vec4, vec4, vec4, vec4); // one column per argument
	mat3x2(vec2, vec2, vec2); // one column per argument
	dmat2(dvec2, dvec2);
	dmat3(dvec3, dvec3, dvec3);
	dmat4(dvec4, dvec4, dvec4, dvec4);
	mat2(float, float, // first column
	 float, float); // second column
	mat3(float, float, float, // first column
	 float, float, float, // second column
	 float, float, float); // third column
	mat4(float, float, float, float, // first column
	 float, float, float, float, // second column
	 float, float, float, float, // third column
	 float, float, float, float); // fourth column
	mat2x3(vec2, float, // first column
	 vec2, float); // second column
	dmat2x4(dvec3, double, // first column
	 double, dvec3) // second column

	mat3x3(mat4x4); // takes the upper-left 3x3 of the mat4x4
	mat2x3(mat4x2); // takes the upper-left 2x2 of the mat4x4, last row is 0,0
	mat4x4(mat3x3); // puts the mat3x3 in the upper-left, sets the lower right component to 1, and the rest to 0
	`
});


test.skip('WebGL subset', function () {
	// type radians (type degrees)
	// type degrees (type radians)
	// type sin (type angle)
	// type cos (type angle)
	// type tan (type angle)
	// type asin (type x)
	// type acos (type x)
	// type atan (type y, type x)
	// type atan (type y_over_x)
	// type pow (type x, type y)
	// type exp (type x)
	// type log (type x)
	// type exp2 (type x)
	// type log2 (type x)
	// type sqrt (type x)
	// type inversesqrt (type x)
	// type abs (type x)
	// type sign (type x)
	// type floor (type x)
	// type ceil (type x)
	// type fract (type x)
	// type mod (type x, float y)
	// type mod (type x, type y)
	// type min (type x, type y)
	// type min (type x, float y)
	// type max (type x, type y)
	// type max (type x, float y)
	// type clamp (type x, type minV, type maxV)
	// type clamp (type x, float minV, float maxV)
	// type mix (type x, type y, type a)
	// type mix (type x, type y, float a)
	// type step (type edge, type x)
	// type step (float edge, type x)
	// type smoothstep (type a, type b, type x)
	// type smoothstep (float a, float b, type x)
	// mat matrixCompMult (mat x, mat y)
	// float length (type x)
	// float distance (type p0, type p1)
	// float dot (type x, type y)
	// vec3 cross (vec3 x, vec3 y)
	// type normalize (type x)
	// type faceforward (type N, type I, type Nref)
	// type reflect (type I, type N)
	// type refract (type I, type N,float eta)
	// bvec lessThan(vec x, vec y)
	// bvec lessThan(ivec x, ivec y)
	// bvec lessThanEqual(vec x, vec y)
	// bvec lessThanEqual(ivec x, ivec y)
	// bvec greaterThan(vec x, vec y)
	// bvec greaterThan(ivec x, ivec y)
	// bvec greaterThanEqual(vec x, vec y)
	// bvec greaterThanEqual(ivec x, ivec y)
	// bvec equal(vec x, vec y)
	// bvec equal(ivec x, ivec y)
	// bvec equal(bvec x, bvec y)
	// bvec notEqual(vec x, vec y)
	// bvec notEqual(ivec x, ivec y)
	// bvec notEqual(bvec x, bvec y)
	// bool any(bvec x)
	// bool all(bvec x)
	// bvec not(bvec x)
	// vec4 texture2D(sampler2D sampler, vec2 coord )
	// vec4 texture2D(sampler2D sampler, vec2 coord, float bias)
	// vec4 textureCube(samplerCube sampler, vec3 coord)
	// vec4 texture2DProj(sampler2D sampler, vec3 coord )
	// vec4 texture2DProj(sampler2D sampler, vec3 coord, float bias)
	// vec4 texture2DProj(sampler2D sampler, vec4 coord)
	// vec4 texture2DProj(sampler2D sampler, vec4 coord, float bias)
	// vec4 texture2DLodEXT(sampler2D sampler, vec2 coord, float lod)
	// vec4 texture2DProjLodEXT(sampler2D sampler, vec3 coord, float lod)
	// vec4 texture2DProjLodEXT(sampler2D sampler, vec4 coord, float lod)
	// vec4 textureCubeLodEXT(samplerCube sampler, vec3 coord, float lod)
	// vec4 texture2DGradEXT(sampler2D sampler, vec2 P, vec2 dPdx, vec2 dPdy)
	// vec4 texture2DProjGradEXT(sampler2D sampler, vec3 P, vec2 dPdx, vec2 dPdy)
	// vec4 texture2DProjGradEXT(sampler2D sampler, vec4 P, vec2 dPdx, vec2 dPdy)
	// vec4 textureCubeGradEXT(samplerCube sampler, vec3 P, vec3 dPdx, vec3 dPdy)
	// type dFdx( type x ), dFdy( type x )
	// type fwidth( type p )
});



test.skip('Trigonometry', function () {
	// genType radians (genType degrees)
	// genType degrees (genType radians)
	// genType sin (genType angle) The standard trigonometric sine function.
	// genType cos (genType angle) The standard trigonometric cosine function.
	// genType tan (genType angle) The standard trigonometric tangent.
	// genType asin (genType x)
	// genType acos (genType x)
	// genType atan (genType y, genType x)
	// genType atan (genType y_over_x)
	// genType sinh (genType x)
	// genType cosh (genType x)
	// genType tanh (genType x)
	// genType asinh (genType x) Arc hyperbolic sine; returns the inverse of sinh.
	// genType acosh (genType x)
	// genType atanh (genType x)
});

test.skip('Exponential', function () {
	// genType pow (genType x, genType y)
	// genType exp (genType x)
	// genType log (genType x)
	// genType exp2 (genType x)
	// genType log2 (genType x)
	// genType sqrt (genType x)
	// genDType sqrt (genDType x)
	// genType inversesqrt (genType x)
	// genDType inversesqrt (genDType x)
});

test.skip('Common', function () {
	// genType abs (genType x)
	// genIType abs (genIType x)
	// genDType abs (genDType x)
	// genType sign (genType x)
	// genIType sign (genIType x)
	// genDType sign (genDType x)
	// genType floor (genType x)
	// genDType floor (genDType x)
	// genType trunc (genType x)
	// genDType trunc (genDType x)
	// genType round (genType x)
	// genDType round (genDType x)
	// genType roundEven (genType x)
	// genDType roundEven (genDType x)
	// genType ceil (genType x)
	// genDType ceil (genDType x)
	// genType fract (genType x)
	// genDType fract (genDType x)
	// genType mod (genType x, float y)
	// genType mod (genType x, genType y)
	// genDType mod (genDType x, double y)
	// genDType mod (genDType x, genDType y)
	// genType modf (genType x, out genType i)
	// genDType modf (genDType x,
	//  out genDType i)
	// genType min (genType x, genType y)
	// genType min (genType x, float y)
	// genDType min (genDType x, genDType y)
	// genDType min (genDType x, double y)
	// genIType min (genIType x, genIType y)
	// genIType min (genIType x, int y)
	// genUType min (genUType x, genUType y)
	// genUType min (genUType x, uint y)
	// genType max (genType x, genType y)
	// genType max (genType x, float y)
	// genDType max (genDType x, genDType y)
	// genDType max (genDType x, double y)
	// genIType max (genIType x, genIType y)
	// genIType max (genIType x, int y)
	// genUType max (genUType x, genUType y)
	// genUType max (genUType x, uint y)
	// genType clamp (genType x,
	//  genType minVal,
	//  genType maxVal)
	// genType clamp (genType x,
	//  float minVal,
	//  float maxVal)
	// genDType clamp (genDType x,
	//  genDType minVal,
	//  genDType maxVal)
	// genDType clamp (genDType x,
	//  double minVal,
	//  double maxVal)
	// genIType clamp (genIType x,
	//  genIType minVal,
	//  genIType maxVal)
	// genIType clamp (genIType x,
	//  int minVal,
	//  int maxVal)
	// genUType clamp (genUType x,
	//  genUType minVal,
	//  genUType maxVal)
	// genUType clamp (genUType x,
	//  uint minVal,
	//  uint maxVal)
	// genType mix (genType x,
	//  genType y,
	//  genType a)
	// genType mix (genType x,
	//  genType y,
	//  float a)
	// genDType mix (genDType x,
	//  genDType y,
	//  genDType a)
	// genDType mix (genDType x,
	//  genDType y,
	//  double a)
	// genType mix (genType x,
	//  genType y,
	//  genBType a)
	// genDType mix (genDType x,
	//  genDType y,
	//  genBType a)
	// genType step (genType edge, genType x)
	// genType step (float edge, genType x)
	// genDType step (genDType edge,
	//  genDType x)
	// genDType step (double edge, genDType x)
	// genType smoothstep (genType edge0,
	//  genType edge1,
	//  genType x)
	// genType smoothstep (float edge0,
	//  float edge1,
	//  genType x)
	// genDType smoothstep (genDType edge0,
	//  genDType edge1,
	//  genDType x)
	// genDType smoothstep (double edge0,
	//  double edge1,
	//  genDType x)
	// genBType isnan (genType x)
	// genBType isnan (genDType x)
	// genBType isinf (genType x)
	// genBType isinf (genDType x)
	// genIType floatBitsToInt (genType value)
	// genUType floatBitsToUint (genType value)
	// genType intBitsToFloat (genIType value)
	// genType uintBitsToFloat (genUType value)
	// genType fma (genType a, genType b,
	//  genType c)
	// genDType fma (genDType a, genDType b,
	//  genDType c)
	// genType frexp (genType x,
	//  out genIType exp)
	// genDType frexp (genDType x,
	//  out genIType exp)
	// genType ldexp (genType x,
	//  in genIType exp)
	// genDType ldexp (genDType x,
	//  in genIType exp)
});


test.skip('Packing/unpacking', function () {
	// uint packUnorm2x16 (vec2 v)
	// uint packSnorm2x16 (vec2 v)
	// uint packUnorm4x8 (vec4 v)
	// uint packSnorm4x8 (vec4 v)
	// vec2 unpackUnorm2x16 (uint p)
	// vec2 unpackSnorm2x16 (uint p)
	// vec4 unpackUnorm4x8 (uint p)
	// vec4 unpackSnorm4x8 (uint p)
	// double packDouble2x32 (uvec2 v)
	// uvec2 unpackDouble2x32 (double v)
	// uint packHalf2x16 (vec2 v)
	// vec2 unpackHalf2x16 (uint v)
});

test.skip('Geometry', function () {
	// float length (genType x)
	// double length (genDType x)
	// float distance (genType p0, genType p1)
	// double distance (genDType p0,
	// genDType p1)
	// float dot (genType x, genType y)
	// double dot (genDType x, genDType y)
	// vec3 cross (vec3 x, vec3 y)
	// dvec3 cross (dvec3 x, dvec3 y)
	// genType normalize (genType x)
	// genDType normalize (genDType x)
	// genType faceforward (genType N,
	// genType I,
	// genType Nref)
	// genDType faceforward (genDType N,
	// genDType I,
	// genDType Nref)
	// genType reflect (genType I, genType N)
	// genDType reflect (genDType I,
	// genDType N)
	// genType refract (genType I, genType N,
	// float eta)
	// genDType refract (genDType I,
	// genDType N,
	// float eta)
});

test.skip('Matrix functions', function () {
	// mat matrixCompMult (mat x, mat y)

	// mat2 outerProduct (vec2 c, vec2 r)
	// mat3 outerProduct (vec3 c, vec3 r)
	// mat4 outerProduct (vec4 c, vec4 r)
	// mat2x3 outerProduct (vec3 c, vec2 r)
	// mat3x2 outerProduct (vec2 c, vec3 r)
	// mat2x4 outerProduct (vec4 c, vec2 r)
	// mat4x2 outerProduct (vec2 c, vec4 r)
	// mat3x4 outerProduct (vec4 c, vec3 r)
	// mat4x3 outerProduct (vec3 c, vec4 r)

	// mat2 transpose (mat2 m)
	// mat3 transpose (mat3 m)
	// mat4 transpose (mat4 m)
	// mat2x3 transpose (mat3x2 m)
	// mat3x2 transpose (mat2x3 m)
	// mat2x4 transpose (mat4x2 m)
	// mat4x2 transpose (mat2x4 m)
	// mat3x4 transpose (mat4x3 m)
	// mat4x3 transpose (mat3x4 m)

	// float determinant (mat2 m)
	// float determinant (mat3 m)
	// float determinant (mat4 m)

	// mat2 inverse (mat2 m)
	// mat3 inverse (mat3 m)
	// mat4 inverse (mat4 m)
});

test.skip('vector relational fns', function () {
	// bvec lessThan (vec x, vec y)
	// bvec lessThan (ivec x, ivec y)
	// bvec lessThan (uvec x, uvec y)
	// Returns the component-wise compare of x < y.
	// bvec lessThanEqual (vec x, vec y)
	// bvec lessThanEqual (ivec x, ivec y)
	// bvec lessThanEqual (uvec x, uvec y)
	// Returns the component-wise compare of x <= y.
	// bvec greaterThan (vec x, vec y)
	// bvec greaterThan (ivec x, ivec y)
	// bvec greaterThan (uvec x, uvec y)
	// Returns the component-wise compare of x > y.
	// bvec greaterThanEqual (vec x, vec y)
	// bvec greaterThanEqual (ivec x, ivec y)
	// bvec greaterThanEqual (uvec x, uvec y)
	// Returns the component-wise compare of x >= y.
	// bvec equal (vec x, vec y)
	// bvec equal (ivec x, ivec y)
	// bvec equal (uvec x, uvec y)
	// bvec equal (bvec x, bvec y)
	// bvec notEqual (vec x, vec y)
	// bvec notEqual (ivec x, ivec y)
	// bvec notEqual (uvec x, uvec y)
	// bvec notEqual (bvec x, bvec y)
	// Returns the component-wise compare of x == y.
	// Returns the component-wise compare of x != y.
	// bool any (bvec x) Returns true if any component of x is true.
	// bool all (bvec x) Returns true only if all components of x are true.
	// bvec not (bvec x) Returns the component-wise logical complement of x.
});

test('Integer functions', function () {

});

test('Texture functions', function () {

});

test.skip('Noise functions', function () {
	// float noise1 (genType x) Returns a 1D noise value based on the input value x.
	// vec2 noise2 (genType x) Returns a 2D noise value based on the input value x.
	// vec3 noise3 (genType x) Returns a 3D noise value based on the input value x.
	// vec4 noise4 (genType x) Returns a 4D noise value based on the input value x.
})