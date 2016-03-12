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


/**
 * Eval part of glsl in js
 */
function eval (str, opt) {
	var strLines;

	opt = opt || {};

	var glsl = GLSL(opt).glsl;
	var debugStr = '';

	//take last statement as a result
	try {
		str = glsl.stringify(glsl.parse(str));
		debugStr = str;
		strLines = str.trim().split(/\n/);
		if (!/^var/.test(strLines[strLines.length - 1])) {
			strLines[strLines.length - 1] = 'return ' + strLines[strLines.length - 1];
		}
		str = strLines.join('\n');
	} catch (e) {
		//NOTE: if initial string is like int x = ...; then it is evaled badly.
		strLines = str.trim().split(/\s*;\s*/).slice(0,-1);
		strLines.unshift('float _');
		strLines[strLines.length - 1] = '_ = ' + strLines[strLines.length - 1];
		str = strLines.join(';\n') + ';';
		str = glsl.stringify(glsl.parse(str));
		debugStr = str;
		str += '\nreturn _;';
	}

	var stdlib = glsl.stringifyStdlib();
	str += stdlib;
	if (opt.debug) console.log(debugStr, stdlib);

	var fn = new Function(str);

	return fn();
}


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
		assert.equal(eval('+float(true);'), 1);
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
		assert.equal(eval('+vec3()[0];'), 0);
		assert.equal(eval('+vec3()[1];'), 0);
		assert.equal(eval('+vec3()[2];'), 0);
		assert.equal(eval('vec3()[3];'), undefined);
	});

	// initializes each component of the vec3 with the float
	test('vec3(float)', function () {
		assert.equal(eval('+vec3(2.2).length();'), 3);
		assert.equal(eval('vec3(2.2)[0];'), 2.2);
		assert.equal(eval('vec3(2.2)[1];'), 2.2);
		assert.equal(eval('vec3(2.2)[2];'), 2.2);
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
		assert.equal(eval('ivec3(1.2, 3.3, 5)[0];'), 1);
		assert.equal(eval('ivec3(1.2, 3.3, 5)[1];'), 3);
		assert.equal(eval('ivec3(1.2, 3.3, 5)[2];'), 5);
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
		assert.equal(eval('vec2(vec3(0, 4, 1.2))[0];'), 0);
		assert.equal(eval('vec2(vec3(0, 4, 1.2))[1];'), 4);
		assert.equal(eval('vec2(vec3(0, 4, 1.2))[2];'), undefined);
		assert.equal(eval('vec2(vec3(0, 4, 1.2))[3];'), undefined);
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

	// first column
	// second column
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
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[0][0];'), 0);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[0][1];'), 1.2);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[0][2];'), -3);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[0][3];'), 3);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[1][0];'), 1);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[1][1];'), 2);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[1][2];'), 3);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[1][3];'), 4);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[2][0];'), 5);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[2][1];'), 6);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[2][2];'), 7);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[2][3];'), 8);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[3][0];'), 0);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[3][1];'), 0);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[3][2];'), -1);
		assert.equal(eval('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1)[3][3];'), -1);
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
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[0][0];'), 1);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[0][1];'), 1);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[0][2];'), 1);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[0][3];'), 0);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[1][0];'), 2);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[1][1];'), 2);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[1][2];'), 2);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[1][3];'), 0);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[2][0];'), 3);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[2][1];'), 3);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[2][2];'), 3);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[2][3];'), 0);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[3][0];'), 0);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[3][1];'), 0);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[3][2];'), 0);
		assert.equal(eval('mat4(mat3(vec3(1), vec3(2), vec3(3)))[3][3];'), 1);
	});
	test('mat4x4(mat2);', function () {
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2))).length();'), 4);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[0][0];'), 1);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[0][1];'), 1);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[0][2];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[0][3];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[1][0];'), 2);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[1][1];'), 2);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[1][2];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[1][3];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[2][0];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[2][1];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[2][2];'), 1);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[2][3];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[3][0];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[3][1];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[3][2];'), 0);
		assert.equal(eval('mat4(mat2(vec2(1), vec2(2)))[3][3];'), 1);
	});
});

test('Swizzles', function () {
	test('vec2', function () {
		assert.deepEqual(eval('vec2(1, 2).x;'), 1);
		assert.deepEqual(eval('vec2(1, 2).xy;'), [1,2]);
		assert.deepEqual(eval('vec2(1, 2).yy;'), [2,2]);
	});
	test('vec3', function () {
		assert.deepEqual(eval('vec3(1, 2, 3).x;'), 1);
		assert.deepEqual(eval('vec3(1, 2, 3).xy;'), [1,2]);
		assert.deepEqual(eval('vec3(1, 2, 3).xyz;'), [1,2,3]);
		assert.deepEqual(eval('vec3(1, 2, 3).zzz;'), [3,3,3]);
	});
	test('vec4', function () {
		assert.deepEqual(eval('vec4(1, 2, 3, 4).x;'), 1);
		assert.deepEqual(eval('vec4(1, 2, 3, 4).xy;'), [1,2]);
		assert.deepEqual(eval('vec4(1, 2, 3, 4).xyz;'), [1,2,3]);
		assert.deepEqual(eval('vec4(1, 2, 3, 4).xyzw;'), [1,2,3,4]);
		assert.deepEqual(eval('vec4(1, 2, 3, 4).wwww;'), [4,4,4,4]);
		assert.deepEqual(eval('vec4(1, 2, 3, 4).wzyx;'), [4,3,2,1]);
	});
});

test.only('Math', function () {
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