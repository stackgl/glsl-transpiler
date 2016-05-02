//ref https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
var test = require('tst');
var stdlib = require('../lib/stdlib');
var assert = require('assert');
var GLSL = require('../');
var compile = GLSL.compile;
var parse = require('glsl-parser/direct');
var tokenize = require('glsl-tokenizer/string');
var glmat = require('gl-matrix');
var almost = require('almost-equal');
var eval = require('./eval');
var ndarray = require('ndarray');

/**
 * Add almost method
 */
assert.almost = function (x, y) {
	if (Array.isArray(x) && Array.isArray(y)) return x.every(function (x, i) {
		assert.almost(x, y[i]);
	});

	var EPSILON = 10e-10;
	if (!almost(x, y, EPSILON)) assert.fail(x, y,
		`${x} ≈ ${y}`, '≈');
	return true;
};


test('Primitives', function () {
	//recognise input array
	test('float(1)', function () {
		assert.equal(eval('+float(1);'), 1);
	});

	// converts an unsigned integer to a signed integer
	test('int(uint)', function () {
		assert.equal(eval('+int(1243);'), 1243);
	});

	// converts a Boolean value to an int
	test('int(bool)', function () {
		assert.equal(eval('+int(true);'), 1);
		assert.equal(eval('+int(false);'), 0);
	});

	// converts a float value to an int
	test('int(float)', function () {
		assert.equal(eval('+int(123.4);'), 123);
	});

	// converts a double value to a signed integer
	test('int(double)', function () {
		assert.equal(eval('+int(10e5);'), 10e5);
	});

	// converts a signed integer value to an unsigned integer
	test('uint(int)', function () {
		assert.equal(eval('+uint(123);'), 123);
	});

	// converts a Boolean value to an unsigned integer
	test('uint(bool)', function () {
		assert.equal(eval('+uint(true);'), 1);
	});

	// converts a float value to an unsigned integer
	test('uint(float)', function () {
		assert.equal(eval('+uint(123.4);'), 123);
	});

	// converts a double value to an unsigned integer
	test('uint(double)', function () {
		assert.equal(eval('+int(123.4e3);'), 123400);
	});

	// converts a signed integer value to a Boolean
	test('bool(int)', function () {
		assert.equal(eval('+bool(123);'), true);
		assert.equal(eval('+bool(0);'), false);
		assert.equal(eval('bool x = true; x;'), true);
		assert.equal(eval('bool x = false; x;'), false);
		assert.equal(eval('bool x = bool(true); x;'), true);
		assert.equal(eval('bool x = bool(false); x;'), false);
	});

	// converts an unsigned integer value to a Boolean value
	test('bool(uint)', function () {
		assert.equal(eval('+bool(123);'), true);
	});

	// converts a float value to a Boolean
	test('bool(float)', function () {
		assert.equal(eval('+bool(123.4);'), true);
	});

	// converts a double value to a Boolean
	test('bool(double)', function () {
		assert.equal(eval('+bool(123.4e100);'), true);
	});

	// converts a signed integer value to a float
	test('float(int)', function () {
		assert.equal(eval('+float(123);'), 123);
	});

	// converts an unsigned integer value to a float value
	test('float(uint)', function () {
		assert.equal(eval('+float(34);'), 34);
	});

	// converts a Boolean value to a float
	test('float(bool)', function () {
		assert.equal(eval('+float(true);', {debug: false}), 1);
		assert.equal(eval('+float(false);'), 0);
	});

	// converts a double value to a float
	test('float(double)', function () {
		assert.equal(eval('+float(double(10e15));'), 10e15);
	});

	// converts a signed integer value to a double
	test('double(int)', function () {
		assert.equal(eval('+double(34);'), 34);
	});

	// converts an unsigned integer value to a double
	test('double(uint)', function () {
		assert.equal(eval('+double(uint(34));'), 34);
	});

	// converts a Boolean value to a double
	test('double(bool)', function () {
		assert.equal(eval('+double(true);'), 1);
		assert.equal(eval('+double(false);'), 0);
	});

	// converts a float value to a double
	test('double(float)', function () {
		assert.equal(eval('+double(34.45);'), 34.45);
	});
});

test('Vector constructors', function () {
	test('vec3()', function () {
		assert.equal(eval('+vec3().length();'), 3);
		assert.deepEqual(eval('vec3();'), [0, 0, 0]);
		assert.equal(eval('vec3()[3];'), undefined);
	});

	// initializes each component of the vec3 with the float
	test('vec3(float)', function () {
		assert.equal(eval('+vec3(2.2).length();'), 3);
		assert.deepEqual(eval('vec3(2.2);'), [2.2, 2.2, 2.2]);
		assert.equal(eval('vec3(2.2)[3];'), undefined);
	});

	// makes a vec4 with component-wise conversion
	test('vec4(ivec4)', function () {
		assert.equal(eval('vec4(ivec4(0, 1, 2, 3)).length();'), 4);
		assert.equal(eval('vec4(ivec4(0, 1, 2, 3))[0];'), 0);
		assert.equal(eval('vec4(ivec4(0, 1, 2, 3))[1];'), 1);
		assert.equal(eval('vec4(ivec4(0, 1, 2, 3))[2];'), 2);
		assert.equal(eval('vec4(ivec4(0, 1, 2, 3))[3];'), 3);
	});

	// the vec4 is column 0 followed by column 1
	test('vec4(mat2)', function () {
		assert.equal(eval('vec4(mat2(0, 1, 2, 3)).length();'), 4);
		assert.equal(eval('vec4(mat2(0, 1, 2, 3))[0];'), 0);
		assert.equal(eval('vec4(mat2(0, 1, 2, 3))[1];'), 1);
		assert.equal(eval('vec4(mat2(0, 1, 2, 3))[2];'), 2);
		assert.equal(eval('vec4(mat2(0, 1, 2, 3))[3];'), 3);
	});

	// initializes a vec2 with 2 floats
	test('vec2(float, float)', function () {
		assert.equal(eval('vec2(1.2, 3.3).length();'), 2);
		assert.equal(eval('vec2(1.2, 3.3)[0];'), 1.2);
		assert.equal(eval('vec2(1.2, 3.3)[1];'), 3.3);
		assert.equal(eval('vec2(1.2, 3.3)[2];'), undefined);
		assert.equal(eval('vec2(1.2, 3.3)[3];'), undefined);
	});

	// initializes an ivec3 with 3 ints
	test('ivec3(int, int, int)', function () {
		assert.equal(eval('ivec3(1.2, 3.3, 5).length();'), 3);
		assert.deepEqual(eval('ivec3(1.2, 3.3, 5);', {debug: false}), [1,3,5]);
		assert.equal(eval('ivec3(1.2, 3.3, 5)[3];'), undefined);
	});

	// uses 4 Boolean conversions
	test('bvec4(int, int, float, float)', function () {
		assert.equal(eval('bvec4(0, 4, 1.2, false).length();'), 4);
		assert.equal(eval('bvec4(true, 0, 1.2, false)[0];'), true);
		assert.equal(eval('bvec4(true, 0, 1.2, false)[1];'), false);
		assert.equal(eval('bvec4(true, 0, 1.2, false)[2];'), true);
		assert.equal(eval('bvec4(true, 0, 1.2, false)[3];'), false);
	});

	// drops the third component of a vec3
	test('vec2(vec3)', function () {
		assert.equal(eval('vec2(vec3(0, 4, 1.2)).length();'), 2);
		assert.deepEqual(eval('vec2(vec3(0, 4, 1.2));', {debug: false}), [0, 4]);
		assert.equal(eval('vec2(vec3(0, 4, 1.2))[2];'), undefined);
	});

	// drops the fourth component of a vec4
	test('vec3(vec4)', function () {
		assert.equal(eval('vec3(vec4(0, 4, 1.2, 2)).length();'), 3);
		assert.equal(eval('vec3(vec4(0, 4, 1.2, 2))[0];'), 0);
		assert.equal(eval('vec3(vec4(0, 4, 1.2, 2))[1];'), 4);
		assert.equal(eval('vec3(vec4(0, 4, 1.2, 2))[2];'), 1.2);
		assert.equal(eval('vec3(vec4(0, 4, 1.2, 2))[3];'), undefined);
	});

	// vec3.x = vec2.x, vec3.y = vec2.y, vec3.z = float
	test('vec3(vec2, float)', function () {
		assert.equal(eval('vec3(vec2(0, 4), 1.2).length();'), 3);
		assert.equal(eval('vec3(vec2(0, 4), 1.2).x;'), 0);
		assert.equal(eval('vec3(vec2(0, 4), 1.2).y;'), 4);
		assert.equal(eval('vec3(vec2(0, 4), 1.2).z;'), 1.2);
		assert.equal(eval('vec3(vec2(0, 4), 1.2).w;'), undefined);
	});

	// vec3.x = float, vec3.y = vec2.x, vec3.z = vec2.y
	test('vec3(float, vec2)', function () {
		assert.equal(eval('vec3(0, vec2(4, 1.2)).length();'), 3);
		assert.equal(eval('vec3(0, vec2(4, 1.2)).r;'), 0);
		assert.equal(eval('vec3(0, vec2(4, 1.2)).g;'), 4);
		assert.equal(eval('vec3(0, vec2(4, 1.2)).b;'), 1.2);
		assert.equal(eval('vec3(0, vec2(4, 1.2)).a;'), undefined);
	});

	test('vec4(vec3, float)', function () {
		assert.equal(eval('vec4(vec3(0, 4, 1.2), 0).length();'), 4);
		assert.equal(eval('vec4(vec3(0, 4, 1.2), 0).s;'), 0);
		assert.equal(eval('vec4(vec3(0, 4, 1.2), 0).t;'), 4);
		assert.equal(eval('vec4(vec3(0, 4, 1.2), 0).p;'), 1.2);
		assert.equal(eval('vec4(vec3(0, 4, 1.2), 0).d;'), 0);
	});

	test('vec4(float, vec3)', function () {
		assert.equal(eval('vec4(0, vec3(4, 1.2, 0)).length();'), 4);
		assert.equal(eval('vec4(0, vec3(4, 1.2, 0))[0];'), 0);
		assert.equal(eval('vec4(0, vec3(4, 1.2, 0))[1];'), 4);
		assert.equal(eval('vec4(0, vec3(4, 1.2, 0))[2];'), 1.2);
		assert.equal(eval('vec4(0, vec3(4, 1.2, 0))[3];'), 0);
	});

	test('vec4(vec2, vec2)', function () {
		assert.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0)).length();'), 4);
		assert.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[0];'), 0);
		assert.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[1];'), 4);
		assert.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[2];'), 1.2);
		assert.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[3];'), 0);
	});
});

test('Matrix constructors', function () {
	// To initialize the diagonal of a matrix with all other elements set to zero:
	test('mat2(float)', function () {
		assert.equal(eval('mat2(1.2).length();'), 2);
		assert.equal(eval('mat2(1.2)[0][0];', {debug: false}), 1.2);
		assert.equal(eval('mat2(1.2)[0][1];'), 0);
		assert.equal(eval('mat2(1.2)[1][0];', {debug: false}), 0);
		assert.equal(eval('mat2(1.2)[1][1];', {debug: false}), 1.2);
		assert.equal(eval('mat2(1.2)[1][1];', {debug: false, optimize: false}), 1.2);
	});

	test('mat3(float)', function () {
		assert.equal(eval('mat3(1.2).length();'), 3);
		assert.equal(eval('mat3(1.2)[0][0];'), 1.2);
		assert.equal(eval('mat3(1.2)[0][1];'), 0);
		assert.equal(eval('mat3(1.2)[0][2];'), 0);
		assert.equal(eval('mat3(1.2)[1][0];'), 0);
		assert.equal(eval('mat3(1.2)[1][1];'), 1.2);
		assert.equal(eval('mat3(1.2)[1][2];'), 0);
		assert.equal(eval('mat3(1.2)[2][0];'), 0);
		assert.equal(eval('mat3(1.2)[2][1];'), 0);
		assert.equal(eval('mat3(1.2)[2][2];'), 1.2);
	});

	test('mat4(float)', function () {
		assert.equal(eval('mat4(1.2).length();'), 4);
		assert.equal(eval('mat4(1.2)[0][0];'), 1.2);
		assert.equal(eval('mat4(1.2)[0][1];'), 0);
		assert.equal(eval('mat4(1.2)[0][2];'), 0);
		assert.equal(eval('mat4(1.2)[0][3];'), 0);
		assert.equal(eval('mat4(1.2)[1][0];'), 0);
		assert.equal(eval('mat4(1.2)[1][1];'), 1.2);
		assert.equal(eval('mat4(1.2)[1][2];'), 0);
		assert.equal(eval('mat4(1.2)[1][3];'), 0);
		assert.equal(eval('mat4(1.2)[2][0];'), 0);
		assert.equal(eval('mat4(1.2)[2][1];'), 0);
		assert.equal(eval('mat4(1.2)[2][2];'), 1.2);
		assert.equal(eval('mat4(1.2)[2][3];'), 0);
		assert.equal(eval('mat4(1.2)[3][0];'), 0);
		assert.equal(eval('mat4(1.2)[3][1];'), 0);
		assert.equal(eval('mat4(1.2)[3][2];'), 0);
		assert.equal(eval('mat4(1.2)[3][3];'), 1.2);
	});


	// one column per argument
	test('mat2(vec2, vec2);', function () {
		assert.equal(eval('mat2(vec2(0, 1.2), vec2(-3, 3.3)).length();'), 2);
		assert.equal(eval('mat2(vec2(0, 1.2), vec2(-3, 3.3))[0][0];'), 0);
		assert.equal(eval('mat2(vec2(0, 1.2), vec2(-3, 3.3))[0][1];'), 1.2);
		assert.equal(eval('mat2(vec2(0, 1.2), vec2(-3, 3.3))[1][0];'), -3);
		assert.equal(eval('mat2(vec2(0, 1.2), vec2(-3, 3.3))[1][0];', {optimize: false}), -3);
		assert.equal(eval('mat2(vec2(0, 1.2), vec2(-3, 3.3))[1][1];'), 3.3);
	});


	// one column per argument
	test('mat3(vec3, vec3, vec3)', function () {
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3)).length();'), 3);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[0][0];'), 1.2);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[0][1];'), 1.2);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[0][2];'), 1.2);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[1][0];'), 0);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[1][1];'), 0);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[1][2];'), 0);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[2][0];'), 1);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[2][1];'), 2);
		assert.equal(eval('mat3(vec3(1.2), vec3(), vec3(1,2,3))[2][2];'), 3);
	});


	// one column per argument
	test('mat4(vec4, vec4, vec4, vec4);', function () {
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx).length();'), 4);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][0];'), 0);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][1];'), 0);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][2];'), 0);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][3];'), 0);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][0];'), 1.2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][1];'), 1.2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][2];'), 1.2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][3];'), 1.2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][0];'), -2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][1];'), -2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][2];'), -2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][3];'), -2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][0];'), 3);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][1];'), 2);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][2];'), 1);
		assert.equal(eval('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][3];'), 0);
	});


	// one column per argument
	test.skip('mat3x2(vec2, vec2, vec2);', function () {
		var m = mat3x2(vec2(1.2), vec2(-2).xx, vec2(2,3).yx);

		assert.equal(m.length(), 3);
		assert.equal(m[0][0], 1.2);
		assert.equal(m[0][1], 1.2);
		assert.equal(m[1][0], -2);
		assert.equal(m[1][1], -2);
		assert.equal(m[2][0], 3);
		assert.equal(m[2][1], 2);
	});

	// one column per argument
	test('dmat2(dvec2, dvec2);', function () {
		assert.equal(eval('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3)).length();'), 2);
		assert.equal(eval('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[0][0];'), 0);
		assert.equal(eval('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[0][1];'), 1.2);
		assert.equal(eval('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[1][0];'), -3);
		assert.equal(eval('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[1][1];'), 3.3);
	});


	// one column per argument
	test('dmat3(dvec3, dvec3, dvec3)', function () {
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3)).length();'), 3);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[0][0];'), 1.2);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[0][1];'), 1.2);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[0][2];'), 1.2);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[1][0];'), 0);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[1][1];'), 0);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[1][2];'), 0);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[2][0];'), 1);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[2][1];'), 2);
		assert.equal(eval('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[2][2];'), 3);
	});


	// one column per argument
	test('dmat4(dvec4, dvec4, dvec4, dvec4);', function () {
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx).length();'), 4);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][0];'), 0);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][1];'), 0);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][2];'), 0);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][3];'), 0);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][0];'), 1.2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][1];'), 1.2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][2];'), 1.2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][3];'), 1.2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][0];'), -2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][1];'), -2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][2];'), -2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][3];'), -2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][0];'), 3);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][1];'), 2);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][2];'), 1);
		assert.equal(eval('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][3];'), 0);
	});

	test('mat2(float, float, float, float);', function () {
		assert.equal(eval('mat2(0,1.2,-3,3.3).length();'), 2);
		assert.equal(eval('mat2(0,1.2,-3,3.3)[0][0];'), 0);
		assert.equal(eval('mat2(0,1.2,-3,3.3)[0][1];'), 1.2);
		assert.equal(eval('mat2(0,1.2,-3,3.3)[1][0];'), -3);
		assert.equal(eval('mat2(0,1.2,-3,3.3)[1][1];'), 3.3);
	});

	test('mat3(float × 9)', function () {
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7).length();'), 3);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[0][0];'), 0);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[0][1];'), 1.2);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[0][2];'), -3);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[1][0];'), 1);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[1][1];'), 2);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[1][2];'), 3);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[2][0];'), 5);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[2][1];'), 6);
		assert.equal(eval('mat3(0,1.2,-3, 1,2,3, 5,6,7)[2][2];'), 7);
	});

	test('mat4(float × 16)', function () {
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1).length();'), 4);
		assert.deepEqual(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1);'), [0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1]);
	});

	test.skip('mat2x3(vec2, float, vec2, float);', function () {
		var m = mat2x3(vec2(0,1.2),-3, vec2(3,1),2);

		assert.equal(m.length(), 2);
		assert.equal(m[0][0], 0);
		assert.equal(m[0][1], 1.2);
		assert.equal(m[0][2], -3);
		assert.equal(m[1][0], 3);
		assert.equal(m[1][1], 1);
		assert.equal(m[1][2], 2);
	});

	test.skip('dmat2x4(dvec3, double, double, dvec3)', function () {
		var m = dmat2x4(dvec3(0,1.2,3),-3, 4, dvec3(3,1,2));

		assert.equal(m.length(), 2);
		assert.equal(m[0][0], 0);
		assert.equal(m[0][1], 1.2);
		assert.equal(m[0][2], 3);
		assert.equal(m[0][3], -3);
		assert.equal(m[1][0], 4);
		assert.equal(m[1][1], 3);
		assert.equal(m[1][2], 1);
		assert.equal(m[1][3], 2);
	});


	// takes the upper-left 3x3 of the mat4x4
	test('mat3x3(mat4x4);', function () {
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4))).length();'), 3);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[0][0];'), 1);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[0][1];'), 1);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[0][2];'), 1);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[1][0];'), 2);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[1][1];'), 2);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[1][2];'), 2);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[2][0];'), 3);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[2][1];'), 3);
		assert.equal(eval('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[2][2];'), 3);
	});

	// takes the upper-left 3x3 of the mat3
	test('mat3x3(mat3x3);', function () {
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3))).length();'), 3);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[0][0];'), 1);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[0][1];'), 1);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[0][2];'), 1);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[1][0];'), 2);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[1][1];'), 2);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[1][2];'), 2);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[2][0];'), 3);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[2][1];'), 3);
		assert.equal(eval('mat3(mat3(vec3(1), vec3(2), vec3(3)))[2][2];'), 3);
	});

	// takes the upper-left 3x3 of the mat2
	test('mat3x3(mat2x2);', function () {
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2))).length();'), 3);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[0][0];'), 1);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[0][1];'), 1);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[0][2];'), 0);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[1][0];'), 2);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[1][1];'), 2);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[1][2];'), 0);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[2][0];'), 0);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[2][1];'), 0);
		assert.equal(eval('mat3(mat2(vec2(1), vec2(2)))[2][2];'), 1);
	});

	// takes the upper-left 2x2 of the mat4x4, last row is 0,0
	test.skip('mat2x3(mat4x2);', function () {
		var m = mat2x3(mat4x2(vec2(1), vec2(2), vec2(3), vec2(4)));
		assert.equal(m.length(), 2);
		assert.equal(m[0][0], 1);
		assert.equal(m[0][1], 1);
		assert.equal(m[0][2], 0);
		assert.equal(m[1][0], 2);
		assert.equal(m[1][1], 2);
		assert.equal(m[1][2], 0);
	});

	// puts the mat3x3 in the upper-left, sets the lower right component to 1, and the rest to 0
	test('mat4x4(mat3x3);', function () {
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3))).length();'), 4);
		assert.deepEqual(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)));', {debug: false}), [1,1,1,0, 2,2,2,0, 3,3,3,0, 0,0,0,1]);
		assert.deepEqual(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)));', {optimize: false, debug:false}), [1,1,1,0, 2,2,2,0, 3,3,3,0, 0,0,0,1]);
	});
	test('mat4x4(mat2);', function () {
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2))).length();'), 4);
		assert.deepEqual(eval('mat4(mat2(vec3(1), vec3(2)));'), [1,1,0,0, 2,2,0,0, 0,0,1,0, 0,0,0,1]);
		assert.deepEqual(eval('mat4(mat2(vec3(1), vec3(2)));', {optimize: false}), [1,1,0,0, 2,2,0,0, 0,0,1,0, 0,0,0,1]);
	});
});

test('Math', function () {
	var mat4 = stdlib.mat4;
	var vec4 = stdlib.vec4;
	var pi2 = Math.PI * 2;

	test('type radians (type degrees)', function () {
		assert.deepEqual(eval('radians(360);'), Math.PI * 2);
		assert.deepEqual(eval('radians(vec4(360));'), vec4(Math.PI * 2));
		assert.deepEqual(eval('radians(mat4(360));'), mat4(Math.PI * 2));
	});

	test('type degrees (type radians)', function () {
		assert.deepEqual(eval(`degrees(${pi2});`), 360);
		assert.deepEqual(eval(`degrees(vec4(${pi2}));`), vec4(360));
		assert.deepEqual(eval(`degrees(mat4(${pi2}));`), mat4(360));
	});

	test('type sin (type angle)', function () {
		assert.almost(eval(`sin(${pi2});`), 0);
		assert.almost(eval(`sin(vec4(${pi2}));`), vec4(0));
		assert.almost(eval(`sin(mat4(${pi2}));`), mat4(0));
	});

	test('type cos (type angle)', function () {
		assert.almost(eval(`cos(${pi2});`), 1);
		assert.almost(eval(`cos(vec4(${pi2}));`), vec4(1));
		assert.almost(eval(`cos(mat4(${pi2}));`), mat4(1));
	});

	test('type tan (type angle)', function () {
		assert.almost(eval(`tan(${pi2});`), 0);
		assert.almost(eval(`tan(vec4(${pi2}));`), vec4(0));
		assert.almost(eval(`tan(mat4(${pi2}));`), mat4(0));
	});

	test('type asin (type x)', function () {
		assert.almost(eval(`asin(1);`), Math.PI/2);
		assert.almost(eval(`asin(vec4(1));`), vec4(Math.PI/2));
		assert.almost(eval(`asin(mat4(1));`), mat4(Math.PI/2));
	});

	test('type acos (type x)', function () {
		assert.almost(eval(`acos(1);`), 0);
		assert.almost(eval(`acos(vec4(1));`), vec4(0));
		assert.almost(eval(`acos(mat4(1));`), mat4(0));
	});

	test('type atan (type y_over_x)', function () {
		assert.almost(eval(`atan(1);`), Math.PI/4);
		assert.almost(eval(`atan(vec4(1));`), vec4(Math.PI/4));
		assert.almost(eval(`atan(mat4(1));`), mat4(Math.PI/4));
	});

	test('type atan (type y, type x)', function () {
		assert.almost(eval(`atan(1, 0);`), Math.PI/2);
		assert.almost(eval(`atan(vec4(1), vec4(0));`), vec4(Math.PI/2));
		assert.almost(eval(`atan(mat4(1), mat4(0));`), mat4(Math.PI/2));
	});

	test('type pow (type x, type y)', function () {
		var x = Math.random() * 100, y = Math.random() * 100;
		assert.almost(eval(`pow(${x}, ${y});`), Math.pow(x, y));
		assert.almost(eval(`pow(vec4(${x}), vec4(${y}));`), vec4(Math.pow(x, y)));
		assert.almost(eval(`pow(mat4(${x}), mat4(${y}));`), mat4(Math.pow(x, y)));
	});

	test('type exp (type x)', function () {
		var x = Math.random() * 100;
		assert.almost(eval(`exp(${x});`), Math.exp(x));
		assert.almost(eval(`exp(vec4(${x}));`), vec4(Math.exp(x)));
		assert.almost(eval(`exp(mat4(${x}));`), mat4(Math.exp(x)));
	});

	test('type log (type x)', function () {
		var x = Math.random() * 100;
		assert.almost(eval(`log(${x});`), Math.log(x));
		assert.almost(eval(`log(vec4(${x}));`), vec4(Math.log(x)));
		assert.almost(eval(`log(mat4(${x}));`), mat4(Math.log(x)));
	});

	test('type exp2 (type x)', function () {
		var x = Math.random() * 100;
		assert.almost(eval(`exp2(${x});`), Math.pow(2, x));
		assert.almost(eval(`exp2(vec4(${x}));`), vec4(Math.pow(2, x)));
		assert.almost(eval(`exp2(mat4(${x}));`), mat4(Math.pow(2, x)));
	});

	test('type log2 (type x)', function () {
		var x = Math.random() * 100;
		assert.almost(eval(`log2(${x});`), Math.log2(x));
		assert.almost(eval(`log2(vec4(${x}));`), vec4(Math.log2(x)));
		assert.almost(eval(`log2(mat4(${x}));`), mat4(Math.log2(x)));
	});

	test('type sqrt (type x)', function () {
		var x = Math.random() * 100;
		assert.almost(eval(`sqrt(${x});`), Math.sqrt(x));
		assert.almost(eval(`sqrt(vec4(${x}));`), vec4(Math.sqrt(x)));
		assert.almost(eval(`sqrt(mat4(${x}));`), mat4(Math.sqrt(x)));
	});

	test('type inversesqrt (type x)', function () {
		var x = Math.random() * 100;
		assert.almost(eval(`inversesqrt(${x});`), 1/Math.sqrt(x));
		assert.almost(eval(`inversesqrt(vec4(${x}));`), vec4(1/Math.sqrt(x)));
		assert.almost(eval(`inversesqrt(mat4(${x}));`), mat4(1/Math.sqrt(x)));
	});

	test('type abs (type x)', function () {
		var x = (Math.random() - 0.5) * 100;
		assert.almost(eval(`abs(${x});`), Math.abs(x));
		assert.almost(eval(`abs(vec4(${x}));`), vec4(Math.abs(x)));
		assert.almost(eval(`abs(mat4(${x}));`), mat4(Math.abs(x)));
	});

	test('type sign (type x)', function () {
		var x = (Math.random() - 0.5) * 100;
		assert.almost(eval(`sign(${x});`), Math.sign(x));
		assert.almost(eval(`sign(vec4(${x}));`), vec4(Math.sign(x)));
		assert.almost(eval(`sign(mat4(${x}));`), mat4(Math.sign(x)));
	});

	test('type floor (type x)', function () {
		var x = (Math.random() - 0.5) * 100;
		assert.almost(eval(`floor(${x});`), Math.floor(x));
		assert.almost(eval(`floor(vec4(${x}));`), vec4(Math.floor(x)));
		assert.almost(eval(`floor(mat4(${x}));`), mat4(Math.floor(x)));
	});

	test('type ceil (type x)', function () {
		var x = (Math.random() - 0.5) * 100;
		assert.almost(eval(`ceil(${x});`), Math.ceil(x));
		assert.almost(eval(`ceil(vec4(${x}));`), vec4(Math.ceil(x)));
		assert.almost(eval(`ceil(mat4(${x}));`), mat4(Math.ceil(x)));
	});

	test('type fract (type x)', function () {
		var x = (Math.random() - 0.5) * 100;
		assert.almost(eval(`fract(${x});`), x - Math.floor(x));
		assert.almost(eval(`fract(vec4(${x}));`), vec4(x - Math.floor(x)));
		assert.almost(eval(`fract(mat4(${x}));`), mat4(x - Math.floor(x)));
	});

	test('type mod (type x, type y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`mod(${x}, ${y});`), x % y);
		assert.almost(eval(`mod(vec4(${x}), vec4(${y}));`), vec4(x % y));
		assert.almost(eval(`mod(mat4(${x}), mat4(${y}));`), mat4(x % y));
		assert.almost(eval(`mod(vec4(${x}), ${y});`), vec4(x % y));
		assert.almost(eval(`mod(mat4(${x}), ${y});`), mat4(x % y));
	});

	test('type min (type x, type|float y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`min(${x}, ${y});`), Math.min(x, y));
		assert.almost(eval(`min(vec4(${x}), vec4(${y}));`), vec4(Math.min(x, y)));
		assert.almost(eval(`min(mat4(${x}), mat4(${y}));`), mat4(Math.min(x, y)));
		assert.almost(eval(`min(vec4(${x}), ${y});`), vec4(Math.min(x, y)));
		assert.almost(eval(`min(mat4(${x}), ${y});`), mat4(Math.min(x, y)));
	});

	test('type max (type x, type|float y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`max(${x}, ${y});`), Math.max(x, y));
		assert.almost(eval(`max(vec4(${x}), vec4(${y}));`), vec4(Math.max(x, y)));
		assert.almost(eval(`max(mat4(${x}), mat4(${y}));`), mat4(Math.max(x, y)));
		assert.almost(eval(`max(vec4(${x}), ${y});`), vec4(Math.max(x, y)));
		assert.almost(eval(`max(mat4(${x}), ${y});`), mat4(Math.max(x, y)));
	});

	test('type clamp (type x, type|float min, type|float max)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100;
		assert.almost(eval(`clamp(${x}, ${y}, ${z});`), Math.min(Math.max(x, y), z));
		assert.almost(eval(`clamp(vec4(${x}), vec4(${y}), vec4(${z}));`), vec4(Math.min(Math.max(x, y), z)));
		assert.almost(eval(`clamp(mat4(${x}), mat4(${y}), mat4(${z}));`), mat4(Math.min(Math.max(x, y), z)));
		assert.almost(eval(`clamp(vec4(${x}), ${y}, ${z});`), vec4(Math.min(Math.max(x, y), z)));
		assert.almost(eval(`clamp(mat4(${x}), ${y}, ${z});`), mat4(Math.min(Math.max(x, y), z)));
	});

	test('type mix (type x, type y, type|float a)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, a = Math.random();
		assert.almost(eval(`mix(${x}, ${y}, ${a});`), x*(1-a)+y*a);
		assert.almost(eval(`mix(vec4(${x}), vec4(${y}), vec4(${a}));`), vec4(x*(1-a)+y*a));
		assert.almost(eval(`mix(mat4(${x}), mat4(${y}), mat4(${a}));`), mat4(x*(1-a)+y*a));
		assert.almost(eval(`mix(vec4(${x}), vec4(${y}), ${a});`), vec4(x*(1-a)+y*a));
		assert.almost(eval(`mix(mat4(${x}), mat4(${y}), ${a});`), mat4(x*(1-a)+y*a));
	});

	test('type step (type|float edge, type x)', function () {
		var edge = (Math.random() - 0.5) * 100, x = (Math.random() - 0.5) * 100;

		function step (edge, x) {
			return x < edge ? 0.0 : 1.0;
		}

		assert.almost(eval(`step(${edge}, ${x});`), step(edge, x));
		assert.almost(eval(`step(vec4(${edge}), vec4(${x}));`), vec4(step(edge, x)));
		assert.almost(eval(`step(mat4(${edge}), mat4(${x}));`), mat4(step(edge, x)));
		assert.almost(eval(`step(${edge}, vec4(${x}));`), vec4(step(edge, x)));
		assert.almost(eval(`step(${edge}, mat4(${x}));`), mat4(step(edge, x)));
	});

	test('type smoothstep (type|float a, type|float b, type x)', function () {
		var a = (Math.random() - 0.5) * 100, b = (Math.random() - 0.5) * 100, x = (Math.random() - 0.5) * 100;

		function smoothstep (edge0, edge1, x) {
			var t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
			return t * t * (3.0 - 2.0 * t);
		}

		assert.almost(eval(`smoothstep(${a}, ${b}, ${x});`), smoothstep(a, b, x));
		assert.almost(eval(`smoothstep(vec4(${a}), vec4(${b}), vec4(${x}));`), vec4(smoothstep(a, b, x)));
		assert.almost(eval(`smoothstep(mat4(${a}), mat4(${b}), mat4(${x}));`), mat4(smoothstep(a, b, x)));
		assert.almost(eval(`smoothstep(${a}, ${b}, vec4(${x}));`), vec4(smoothstep(a, b, x)));
		assert.almost(eval(`smoothstep(${a}, ${b}, mat4(${x}));`), mat4(smoothstep(a, b, x)));
	});

	test('float length (type x)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100, w = (Math.random() - 0.5) * 100;
		assert.almost(eval(`length(vec2(${x}, ${y}));`), Math.sqrt(x*x + y*y));
		assert.almost(eval(`length(vec3(${x}, ${y}, ${z}));`), Math.sqrt(x*x + y*y + z*z));
		assert.almost(eval(`length(vec4(${x}, ${y}, ${z}, ${w}));`), Math.sqrt(x*x + y*y + z*z + w*w));
	});

	test('float distance (type x, type y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		var d = x-y;
		assert.almost(eval(`distance(vec2(${x}), vec2(${y}));`), Math.sqrt(d*d + d*d));
		assert.almost(eval(`distance(vec2(${x}, ${y}), vec2(${y}, ${x}));`), Math.sqrt(d*d + d*d));
	});

	test('float dot (type x, type y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		var d = x-y;
		assert.almost(eval(`dot(vec2(${x}), vec2(${y}));`), x*y*2);
		assert.almost(eval(`dot(vec2(${x}, ${y}), vec2(${y}, ${x}));`), x*y*2);
	});

	test('vec3 cross (vec3 x, vec3 y)', function () {
		var x = 1, y = 2, z = 3, a = 4, b = 5, c = 6;
		assert.almost(eval(`cross(vec3(${x}, ${y}, ${z}), vec3(${a}, ${b}, ${c}));`), [-3, 6, -3]);
	});

	test('type normalize (type x)', function () {
		assert.almost(eval(`normalize(vec2(5, 0));`), [1, 0]);
		assert.almost(eval(`normalize(vec3(0, 5, 0));`), [0, 1, 0]);
		assert.almost(eval(`normalize(vec4(0, 0, 0, 0.5));`), [0, 0, 0, 1]);
	});

	test('type faceforward (type N, type I, type Nref)', function () {
		var x = -1, y = -2, z = -3;
		assert.almost(eval(`faceforward(vec3(-1, -2, -3), vec3(-1));`), [1, 2, 3]);
		assert.almost(eval(`faceforward(vec3(1, 2, 3), vec3(-1));`), [1, 2, 3]);
		assert.almost(eval(`faceforward(vec3(1, 2, 3), vec3(1));`), [-1, -2, -3]);
	});

	test('type reflect (type I, type N)', function () {
		assert.almost(eval(`reflect(vec3(1, 1, 0), vec3(1, 0, 0));`), [-1, 1, 0]);
		assert.almost(eval(`reflect(vec2(1, 1), vec2(1, 0));`), [-1, 1]);
		assert.almost(eval(`reflect(vec4(1, 1, 0, 0), vec4(0, 1, 0, 0));`), [1, -1, 0, 0]);
	});

	test('type refract (type I, type N, float eta)', function () {
		assert.almost(eval(`refract(vec2(1, 1), vec2(-1, -1), 0);`), [1, 1]);
	});

	// type dFdx( type x ), dFdy( type x )
	// type fwidth( type p )

	// genType sinh (genType x)
	// genType cosh (genType x)
	// genType tanh (genType x)
	// genType asinh (genType x) Arc hyperbolic sine; returns the inverse of sinh.
	// genType acosh (genType x)
	// genType atanh (genType x)

	// genType trunc (genType x)
	// genDType trunc (genDType x)
	// genType round (genType x)
	// genDType round (genDType x)
	// genType roundEven (genType x)
	// genDType roundEven (genDType x)
	// genType modf (genType x, out genType i)
	// genDType modf (genDType x, out genDType i)
	// genBType isnan (genType x)
	// genBType isnan (genDType x)
	// genBType isinf (genType x)
	// genBType isinf (genDType x)
	// genIType floatBitsToInt (genType value)
	// genUType floatBitsToUint (genType value)
	// genType intBitsToFloat (genIType value)
	// genType uintBitsToFloat (genUType value)
	// genType fma (genType a, genType b, genType c)
	// genDType fma (genDType a, genDType b, genDType c)
	// genType frexp (genType x, out genIType exp)
	// genDType frexp (genDType x, out genIType exp)
	// genType ldexp (genType x, in genIType exp)
	// genDType ldexp (genDType x, in genIType exp)

	// float interpolateAtCentroid (float interpolant)
	// vec2 interpolateAtCentroid (vec2 interpolant)
	// vec3 interpolateAtCentroid (vec3 interpolant)
	// vec4 interpolateAtCentroid (vec4 interpolant)
	// float interpolateAtSample (float interpolant, int sample)
	// vec2 interpolateAtSample (vec2 interpolant, int sample)
	// vec3 interpolateAtSample (vec3 interpolant, int sample)
	// vec4 interpolateAtSample (vec4 interpolant, int sample)
	// float interpolateAtOffset (float interpolant, vec2 offset)
	// vec2 interpolateAtOffset (vec2 interpolant, vec2 offset)
	// vec3 interpolateAtOffset (vec3 interpolant, vec2 offset)
	// vec4 interpolateAtOffset (vec4 interpolant, vec2 offset)

});

test('Vector relational functions', function () {
	test('bvec lessThan (vec x, vec y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`lessThan(vec2(${x}), vec2(${y}));`), [x < y, x < y]);
		assert.almost(eval(`lessThan(vec3(${x}), vec3(${y}));`), [x < y, x < y, x < y]);
	});

	test('bvec lessThanEqual (vec x, vec y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`lessThanEqual(vec2(${x}), vec2(${y}));`), [x <= y, x <= y]);
		assert.almost(eval(`lessThanEqual(vec3(${x}), vec3(${y}));`), [x <= y, x <= y, x <= y]);
	});

	test('bvec greaterThan (vec x, vec y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`greaterThan(vec2(${x}), vec2(${y}));`), [x > y, x > y]);
		assert.almost(eval(`greaterThan(vec3(${x}), vec3(${y}));`), [x > y, x > y, x > y]);
	});

	test('bvec greaterThanEqual (vec x, vec y)', function () {
		var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
		assert.almost(eval(`greaterThanEqual(vec2(${x}), vec2(${y}));`), [x >= y, x >= y]);
		assert.almost(eval(`greaterThanEqual(vec3(${x}), vec3(${y}));`), [x >= y, x >= y, x >= y]);
	});

	test('bvec equal (vec x, vec y)', function () {
		assert.almost(eval(`equal(vec2(1), vec2(1));`), [true, true]);
		assert.almost(eval(`equal(vec3(1), vec3(1));`), [true, true, true]);
		assert.almost(eval(`equal(vec3(1), vec3(1, 1, -1));`), [true, true, false]);
	});

	test('bvec notEqual (vec x, vec y)', function () {
		assert.almost(eval(`notEqual(vec2(1), vec2(1));`), [false, false]);
		assert.almost(eval(`notEqual(vec3(1), vec3(1));`), [false, false, false]);
		assert.almost(eval(`notEqual(vec3(1), vec3(1, -1, 1));`), [false, true, false]);
	});

	test('bvec not (bvec x)', function () {
		assert.deepEqual(eval(`not(bvec2(false, true));`), [true, false]);
	});

	test('bool any (bvec x)', function () {
		assert.equal(eval(`any(bvec3(false, true, false));`), true);
		assert.equal(eval(`any(bvec3(false, false, false));`), false);
	});

	test('bool all (bvec x)', function () {
		assert.equal(eval(`all(bvec3(false, true, false));`), false);
		assert.equal(eval(`all(bvec3(true, true, true));`), true);
	});
});

test.skip('Textures', function () {
	// int textureSize (gsampler1D sampler, int lod)
	// ivec2 textureSize (gsampler2D sampler, int lod)
	// ivec3 textureSize (gsampler3D sampler, int lod)
	// ivec2 textureSize (gsamplerCube sampler, int lod)
	// int textureSize (sampler1DShadow sampler, int lod)
	// ivec2 textureSize (sampler2DShadow sampler, int lod)
	// ivec2 textureSize (samplerCubeShadow sampler, int lod)
	// ivec3 textureSize (gsamplerCubeArray sampler, int lod)
	// ivec3 textureSize (samplerCubeArrayShadow sampler, int lod)
	// ivec2 textureSize (gsampler2DRect sampler)
	// ivec2 textureSize (sampler2DRectShadow sampler)
	// ivec2 textureSize (gsampler1DArray sampler, int lod)
	// ivec3 textureSize (gsampler2DArray sampler, int lod)
	// ivec2 textureSize (sampler1DArrayShadow sampler, int lod)
	// ivec3 textureSize (sampler2DArrayShadow sampler, int lod)
	// int textureSize (gsamplerBuffer sampler)
	// ivec2 textureSize (gsampler2DMS sampler)
	// ivec3 textureSize (gsampler2DMSArray sampler)

	// vec2 textureQueryLod(gsampler1D sampler, float P)
	// vec2 textureQueryLod(gsampler2D sampler, vec2 P)
	// vec2 textureQueryLod(gsampler3D sampler, vec3 P)
	// vec2 textureQueryLod(gsamplerCube sampler, vec3 P)
	// vec2 textureQueryLod(gsampler1DArray sampler, float P)
	// vec2 textureQueryLod(gsampler2DArray sampler, vec2 P)
	// vec2 textureQueryLod(gsamplerCubeArray sampler, vec3 P)
	// vec2 textureQueryLod(sampler1DShadow sampler, float P)
	// vec2 textureQueryLod(sampler2DShadow sampler, vec2 P)
	// vec2 textureQueryLod(samplerCubeShadow sampler, vec3 P)
	// vec2 textureQueryLod(sampler1DArrayShadow sampler, float P)
	// vec2 textureQueryLod(sampler2DArrayShadow sampler, vec2 P)
	// vec2 textureQueryLod(samplerCubeArrayShadow sampler, vec3 P)

	// int textureQueryLevels(gsampler1D sampler)
	// int textureQueryLevels(gsampler2D sampler)
	// int textureQueryLevels(gsampler3D sampler)
	// int textureQueryLevels(gsamplerCube sampler)
	// int textureQueryLevels(gsampler1DArray sampler)
	// int textureQueryLevels(gsampler2DArray sampler)
	// int textureQueryLevels(gsamplerCubeArray sampler)
	// int textureQueryLevels(sampler1DShadow sampler)
	// int textureQueryLevels(sampler2DShadow sampler)
	// int textureQueryLevels(samplerCubeShadow sampler)
	// int textureQueryLevels(sampler1DArrayShadow sampler)
	// int textureQueryLevels(sampler2DArrayShadow sampler)
	// int textureQueryLevels(samplerCubeArrayShadow sampler)

	// gvec4 texture (gsampler1D sampler, float P [, float bias] )
	// gvec4 texture (gsampler2D sampler, vec2 P [, float bias] )
	// gvec4 texture (gsampler3D sampler, vec3 P [, float bias] )
	// gvec4 texture (gsamplerCube sampler, vec3 P [, float bias] )
	// float texture (sampler1DShadow sampler, vec3 P [, float bias] )
	// float texture (sampler2DShadow sampler, vec3 P [, float bias] )
	// float texture (samplerCubeShadow sampler, vec4 P [, float bias] )
	// gvec4 texture (gsampler1DArray sampler, vec2 P [, float bias] )
	// gvec4 texture (gsampler2DArray sampler, vec3 P [, float bias] )
	// gvec4 texture (gsamplerCubeArray sampler, vec4 P [, float bias] )
	// float texture (sampler1DArrayShadow sampler, vec3 P
	// [, float bias] )
	// float texture (sampler2DArrayShadow sampler, vec4 P)
	// gvec4 texture (gsampler2DRect sampler, vec2 P)
	// float texture (sampler2DRectShadow sampler, vec3 P)
	// float texture (gsamplerCubeArrayShadow sampler, vec4 P,
	// float compare)

	// gvec4 textureProj (gsampler1D sampler, vec2 P [, float bias] )
	// gvec4 textureProj (gsampler1D sampler, vec4 P [, float bias] )
	// gvec4 textureProj (gsampler2D sampler, vec3 P [, float bias] )
	// gvec4 textureProj (gsampler2D sampler, vec4 P [, float bias] )
	// gvec4 textureProj (gsampler3D sampler, vec4 P [, float bias] )
	// float textureProj (sampler1DShadow sampler, vec4 P
	// [, float bias] )
	// float textureProj (sampler2DShadow sampler, vec4 P
	// [, float bias] )
	// gvec4 textureProj (gsampler2DRect sampler, vec3 P)
	// gvec4 textureProj (gsampler2DRect sampler, vec4 P)
	// float textureProj (sampler2DRectShadow sampler, vec4 P)

	// gvec4 textureLod (gsampler1D sampler, float P, float lod)
	// gvec4 textureLod (gsampler2D sampler, vec2 P, float lod)
	// gvec4 textureLod (gsampler3D sampler, vec3 P, float lod)
	// gvec4 textureLod (gsamplerCube sampler, vec3 P, float lod)
	// float textureLod (sampler1DShadow sampler, vec3 P, float lod)
	// float textureLod (sampler2DShadow sampler, vec3 P, float lod)
	// gvec4 textureLod (gsampler1DArray sampler, vec2 P, float lod)
	// gvec4 textureLod (gsampler2DArray sampler, vec3 P, float lod)
	// float textureLod (sampler1DArrayShadow sampler, vec3 P,
	// float lod)
	// gvec4 textureLod (gsamplerCubeArray sampler, vec4 P, float lod)

	// gvec4 textureOffset (gsampler1D sampler, float P,
	// int offset [, float bias] )
	// gvec4 textureOffset (gsampler2D sampler, vec2 P,
	// ivec2 offset [, float bias] )
	// gvec4 textureOffset (gsampler3D sampler, vec3 P,
	// ivec3 offset [, float bias] )
	// gvec4 textureOffset (gsampler2DRect sampler, vec2 P,
	// ivec2 offset )
	// float textureOffset (sampler2DRectShadow sampler, vec3 P,
	// ivec2 offset )
	// float textureOffset (sampler1DShadow sampler, vec3 P,
	// int offset [, float bias] )
	// float textureOffset (sampler2DShadow sampler, vec3 P,
	// ivec2 offset [, float bias] )
	// gvec4 textureOffset (gsampler1DArray sampler, vec2 P,
	// int offset [, float bias] )
	// gvec4 textureOffset (gsampler2DArray sampler, vec3 P,
	// ivec2 offset [, float bias] )
	// float textureOffset (sampler1DArrayShadow sampler, vec3 P,
	// int offset [, float bias] )
	// float textureOffset (sampler2DArrayShadow sampler, vec4 P,
	// ivec2 offset )

	// gvec4 texelFetch (gsampler1D sampler, int P, int lod)
	// gvec4 texelFetch (gsampler2D sampler, ivec2 P, int lod)
	// gvec4 texelFetch (gsampler3D sampler, ivec3 P, int lod)
	// gvec4 texelFetch (gsampler2DRect sampler, ivec2 P)
	// gvec4 texelFetch (gsampler1DArray sampler, ivec2 P, int lod)
	// gvec4 texelFetch (gsampler2DArray sampler, ivec3 P, int lod)
	// gvec4 texelFetch (gsamplerBuffer sampler, int P)
	// gvec4 texelFetch (gsampler2DMS sampler, ivec2 P, int sample)
	// gvec4 texelFetch (gsampler2DMSArray sampler, ivec3 P,
	// int sample)

	// gvec4 texelFetchOffset (gsampler1D sampler, int P, int lod,
	// int offset)
	// gvec4 texelFetchOffset (gsampler2D sampler, ivec2 P, int lod,
	// ivec2 offset)
	// gvec4 texelFetchOffset (gsampler3D sampler, ivec3 P, int lod,
	// ivec3 offset)
	// gvec4 texelFetchOffset (gsampler2DRect sampler, ivec2 P,
	// ivec2 offset)
	// gvec4 texelFetchOffset (gsampler1DArray sampler, ivec2 P, int lod,
	// int offset)
	// gvec4 texelFetchOffset (gsampler2DArray sampler, ivec3 P, int lod,
	// ivec2 offset)

	// gvec4 textureProjOffset (gsampler1D sampler, vec2 P,
	// int offset [, float bias] )
	// gvec4 textureProjOffset (gsampler1D sampler, vec4 P,
	// int offset [, float bias] )
	// gvec4 textureProjOffset (gsampler2D sampler, vec3 P,
	// ivec2 offset [, float bias] )
	// gvec4 textureProjOffset (gsampler2D sampler, vec4 P,
	// ivec2 offset [, float bias] )
	// gvec4 textureProjOffset (gsampler3D sampler, vec4 P,
	// ivec3 offset [, float bias] )
	// gvec4 textureProjOffset (gsampler2DRect sampler, vec3 P,
	// ivec2 offset )
	// gvec4 textureProjOffset (gsampler2DRect sampler, vec4 P,
	// ivec2 offset )
	// float textureProjOffset (sampler2DRectShadow sampler, vec4 P,
	// ivec2 offset )
	// float textureProjOffset (sampler1DShadow sampler, vec4 P,
	// int offset [, float bias] )
	// float textureProjOffset (sampler2DShadow sampler, vec4 P,
	// ivec2 offset [, float bias] )

	// gvec4 textureProjLod (gsampler1D sampler, vec2 P, float lod)
	// gvec4 textureProjLod (gsampler1D sampler, vec4 P, float lod)
	// gvec4 textureProjLod (gsampler2D sampler, vec3 P, float lod)
	// gvec4 textureProjLod (gsampler2D sampler, vec4 P, float lod)
	// gvec4 textureProjLod (gsampler3D sampler, vec4 P, float lod)
	// float textureProjLod (sampler1DShadow sampler, vec4 P, float lod)
	// float textureProjLod (sampler2DShadow sampler, vec4 P, float lod)

	// gvec4 textureProjLodOffset (gsampler1D sampler, vec2 P,
	// float lod, int offset)
	// gvec4 textureProjLodOffset (gsampler1D sampler, vec4 P,
	// float lod, int offset)
	// gvec4 textureProjLodOffset (gsampler2D sampler, vec3 P,
	// float lod, ivec2 offset)
	// gvec4 textureProjLodOffset (gsampler2D sampler, vec4 P,
	// float lod, ivec2 offset)
	// gvec4 textureProjLodOffset (gsampler3D sampler, vec4 P,
	// float lod, ivec3 offset)
	// float textureProjLodOffset (sampler1DShadow sampler, vec4 P,
	// float lod, int offset)
	// float textureProjLodOffset (sampler2DShadow sampler, vec4 P,
	// float lod, ivec2 offset)

	// gvec4 textureGrad (gsampler1D sampler, float P,
	// float dPdx, float dPdy)
	// gvec4 textureGrad (gsampler2D sampler, vec2 P,
	// vec2 dPdx, vec2 dPdy)
	// gvec4 textureGrad (gsampler3D sampler, vec3 P,
	// vec3 dPdx, vec3 dPdy)
	// gvec4 textureGrad (gsamplerCube sampler, vec3 P,
	// vec3 dPdx, vec3 dPdy)
	// gvec4 textureGrad (gsampler2DRect sampler, vec2 P,
	// vec2 dPdx, vec2 dPdy)
	// float textureGrad (sampler2DRectShadow sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy)
	// float textureGrad (sampler1DShadow sampler, vec3 P,
	// float dPdx, float dPdy)
	// float textureGrad (sampler2DShadow sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy)
	// float textureGrad (samplerCubeShadow sampler, vec4 P,
	// vec3 dPdx, vec3 dPdy)
	// gvec4 textureGrad (gsampler1DArray sampler, vec2 P,
	// float dPdx, float dPdy)
	// gvec4 textureGrad (gsampler2DArray sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy)
	// float textureGrad (sampler1DArrayShadow sampler, vec3 P,
	// float dPdx, float dPdy)
	// float textureGrad (sampler2DArrayShadow sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy)
	// gvec4 textureGrad (gsamplerCubeArray sampler, vec4 P,
	// vec3 dPdx, vec3 dPdy)

	// gvec4 textureGradOffset (gsampler1D sampler, float P,
	// float dPdx, float dPdy, int offset)
	// gvec4 textureGradOffset (gsampler2D sampler, vec2 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// gvec4 textureGradOffset (gsampler3D sampler, vec3 P,
	// vec3 dPdx, vec3 dPdy, ivec3 offset)
	// gvec4 textureGradOffset (gsampler2DRect sampler, vec2 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// float textureGradOffset (sampler2DRectShadow sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// float textureGradOffset (sampler1DShadow sampler, vec3 P,
	// float dPdx, float dPdy, int offset )
	// float textureGradOffset (sampler2DShadow sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// gvec4 textureGradOffset (gsampler1DArray sampler, vec2 P,
	// float dPdx, float dPdy, int offset)
	// gvec4 textureGradOffset (gsampler2DArray sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// float textureGradOffset (sampler1DArrayShadow sampler, vec3 P,
	// float dPdx, float dPdy, int offset)
	// float textureGradOffset (sampler2DArrayShadow sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)

	// gvec4 textureProjGrad (gsampler1D sampler, vec2 P,
	// float dPdx, float dPdy)
	// gvec4 textureProjGrad (gsampler1D sampler, vec4 P,
	// float dPdx, float dPdy)
	// gvec4 textureProjGrad (gsampler2D sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy)
	// gvec4 textureProjGrad (gsampler2D sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy)
	// gvec4 textureProjGrad (gsampler3D sampler, vec4 P,
	// vec3 dPdx, vec3 dPdy)
	// gvec4 textureProjGrad (gsampler2DRect sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy)
	// gvec4 textureProjGrad (gsampler2DRect sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy)
	// float textureProjGrad (sampler2DRectShadow sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy)
	// float textureProjGrad (sampler1DShadow sampler, vec4 P,
	// float dPdx, float dPdy)
	// float textureProjGrad (sampler2DShadow sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy)

	// gvec4 textureProjGradOffset (gsampler1D sampler, vec2 P,
	// float dPdx, float dPdy, int offset)
	// gvec4 textureProjGradOffset (gsampler1D sampler, vec4 P,
	// float dPdx, float dPdy, int offset)
	// gvec4 textureProjGradOffset (gsampler2D sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// gvec4 textureProjGradOffset (gsampler2D sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// gvec4 textureProjGradOffset (gsampler2DRect sampler, vec3 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// gvec4 textureProjGradOffset (gsampler2DRect sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// float textureProjGradOffset (sampler2DRectShadow sampler,
	// vec4 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)
	// gvec4 textureProjGradOffset (gsampler3D sampler, vec4 P,
	// vec3 dPdx, vec3 dPdy, ivec3 offset)
	// float textureProjGradOffset (sampler1DShadow sampler, vec4 P,
	// float dPdx, float dPdy, int offset)
	// float textureProjGradOffset (sampler2DShadow sampler, vec4 P,
	// vec2 dPdx, vec2 dPdy, ivec2 offset)

	// gvec4 textureGather (gsampler2D sampler, vec2 P
	// [, int comp])
	// gvec4 textureGather (gsampler2DArray sampler,
	// vec3 P [, int comp])
	// gvec4 textureGather (gsamplerCube sampler,
	// vec3 P [, int comp])
	// gvec4 textureGather (gsamplerCubeArray sampler,
	// vec4 P[, int comp])
	// gvec4 textureGather (gsampler2DRect sampler,
	// vec2 P[, int comp])
	// vec4 textureGather (sampler2DShadow sampler,
	// vec2 P, float refZ)
	// vec4 textureGather (sampler2DArrayShadow sampler,
	// vec3 P, float refZ)
	// vec4 textureGather (samplerCubeShadow sampler,
	// vec3 P, float refZ)
	// vec4 textureGather (samplerCubeArrayShadow
	// sampler,
	// vec4 P, float refZ)
	// vec4 textureGather (sampler2DRectShadow sampler,
	// vec2 P, float refZ)

	// gvec4 textureGatherOffset (
	// gsampler2D sampler,
	// vec2 P, ivec2 offset
	// [, int comp])
	// gvec4 textureGatherOffset (
	// gsampler2DArray sampler,
	// vec3 P, ivec2 offset
	// [, int comp])
	// gvec4 textureGatherOffset (
	// gsampler2DRect sampler,
	// vec2 P, ivec2 offset
	// [, int comp])
	// vec4 textureGatherOffset (
	// sampler2DShadow sampler,
	// vec2 P, float refZ, ivec2 offset)
	// vec4 textureGatherOffset (
	// sampler2DArrayShadow sampler,
	// vec3 P, float refZ, ivec2 offset)
	// vec4 textureGatherOffset (
	// sampler2DRectShadow sampler,
	// vec2 P, float refZ, ivec2 offset)

	// gvec4 textureGatherOffsets (
	// gsampler2D sampler,
	// vec2 P, ivec2 offsets[4]
	// [, int comp])
	// gvec4 textureGatherOffsets (
	// gsampler2DArray sampler,
	// vec3 P, ivec2 offsets[4]
	// [, int comp])
	// gvec4 textureGatherOffsets (
	// gsampler2DRect sampler,
	// vec2 P, ivec2 offsets[4]
	// [, int comp])
	// vec4 textureGatherOffsets (
	// sampler2DShadow sampler,
	// vec2 P, float refZ, ivec2
	// offsets[4])
	// vec4 textureGatherOffsets (
	// sampler2DArrayShadow sampler,
	// vec3 P, float refZ, ivec2
	// offsets[4])
	// vec4 textureGatherOffsets (
	// sampler2DRectShadow sampler,
	// vec2 P, float refZ, ivec2
	// offsets[4])
});


test('Textures compat', function () {
	test('texture1D');
	// vec4 texture1D (sampler1D sampler,
	// float coord [, float bias] )
	// vec4 texture1DProj (sampler1D sampler,
	// vec2 coord [, float bias] )
	// vec4 texture1DProj (sampler1D sampler,
	// vec4 coord [, float bias] )
	// vec4 texture1DLod (sampler1D sampler,
	// float coord, float lod)
	// vec4 texture1DProjLod (sampler1D sampler,
	// vec2 coord, float lod)
	// vec4 texture1DProjLod (sampler1D sampler,
	// vec4 coord, float lod)

	test('texture2D', function () {
		var data = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
		data.width = 2;
		data.height = 2;

		assert.deepEqual(eval(`
			uniform sampler2D t;
			texture2D(t, vec2(0.2, 0.8));
		`, {
			uniform: function (name, variable) {
				if (variable.type === 'sampler2D') return `_.${name}`
			},
			debug: false
		}, {
			// t: ndarray(data, [2,2,4])
			t: data
		}), [0, 0, 1, 0]);
	});
	// vec4 texture2D (sampler2D sampler,
	// vec2 coord [, float bias] )
	// vec4 texture2DProj (sampler2D sampler,
	// vec3 coord [, float bias] )
	// vec4 texture2DProj (sampler2D sampler,
	// vec4 coord [, float bias] )
	// vec4 texture2DLod (sampler2D sampler,
	// vec2 coord, float lod)
	// vec4 texture2DProjLod (sampler2D sampler,
	// vec3 coord, float lod)
	// vec4 texture2DProjLod (sampler2D sampler,
	// vec4 coord, float lod)

	test('texture3D');
	// vec4 texture3D (sampler3D sampler,
	// vec3 coord [, float bias] )
	// vec4 texture3DProj (sampler3D sampler,
	// vec4 coord [, float bias] )
	// vec4 texture3DLod (sampler3D sampler,
	// vec3 coord, float lod)
	// vec4 texture3DProjLod (sampler3D sampler,
	// vec4 coord, float lod)

	test('textureCube');
	// vec4 textureCube (samplerCube sampler,
	// vec3 coord [, float bias] )
	// vec4 textureCubeLod (samplerCube sampler,
	// vec3 coord, float lod)

	test('shadow1D');
	// vec4 shadow1D (sampler1DShadow sampler,
	// vec3 coord [, float bias] )
	// vec4 shadow2D (sampler2DShadow sampler,
	// vec3 coord [, float bias] )
	// vec4 shadow1DProj (sampler1DShadow sampler,
	// vec4 coord [, float bias] )
	// vec4 shadow2DProj (sampler2DShadow sampler,
	// vec4 coord [, float bias] )
	// vec4 shadow1DLod (sampler1DShadow sampler,
	// vec3 coord, float lod)
	// vec4 shadow2DLod (sampler2DShadow sampler,
	// vec3 coord, float lod)
	// vec4 shadow1DProjLod(sampler1DShadow sampler,
	// vec4 coord, float lod)
	// vec4 shadow2DProjLod(sampler2DShadow sampler,
	// vec4 coord, float lod)
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

test('Matrix functions', function () {
	test('mat matrixCompMult (mat x, mat y)', function () {
		assert.deepEqual(eval(`
			mat3 m = mat3(1, 1, 1, 2, 2, 2, 3, 3, 3);
			mat3 n = mat3(vec3(4), vec3(5), vec3(6));
			matrixCompMult(m, n);
		`, {optimize: true, debug: false}), [4, 4, 4, 10, 10, 10, 18, 18, 18]);
	});

	test('matN outerProduct (vecN, vecN)', function () {
		assert.deepEqual(eval(`
			outerProduct(vec3(1, 2, 3), vec3(1));
		`, {debug:false}), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
		assert.deepEqual(eval(`
			outerProduct(vec2(1, 2), vec2(3, 4));
		`, {debug:false}), [3, 4, 6, 8]);
	});

	test('matN transpose (matN m)', function () {
		assert.deepEqual(eval(`
			transpose(mat3(1,2,3,4,5,6,7,8,9));
		`, {debug:false}), [1,4,7,2,5,8,3,6,9]);
	});

	test('determinant (mat m)', function () {
		assert.equal(eval(`
			determinant(mat2(1, 2, 3, 4));
		`), -2);
		assert.equal(eval(`
			determinant(mat3(1, 0, 0, 0, 1, 0, 1, 2, 1));
		`), 1);
		assert.equal(eval(`
			determinant(mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1));
		`), 1);
	});

	test('mat inverse (mat m)', function () {
		assert.deepEqual(eval(`
			inverse(mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1));
		`), [1,0,0,0,0,1,0,0,0,0,1,0,-1,-2,-3,1]);
		assert.deepEqual(eval(`
			inverse(mat3(1, 0, 0, 0, 1, 0, 1, 2, 1));
		`), [1,0,0,0,1,0,-1,-2,1]);
		assert.deepEqual(eval(`
			inverse(mat2(1, 2, 3, 4));
		`), [-2, 1, 1.5, -0.5]);
	});
});


test.skip('Noise functions', function () {
	// float noise1 (genType x) Returns a 1D noise value based on the input value x.
	// vec2 noise2 (genType x) Returns a 2D noise value based on the input value x.
	// vec3 noise3 (genType x) Returns a 3D noise value based on the input value x.
	// vec4 noise4 (genType x) Returns a 4D noise value based on the input value x.
})