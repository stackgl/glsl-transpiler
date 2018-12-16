//ref https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
var test = require('tape')
var GLSL = require('../');
var compile = GLSL.compile;
var parse = require('glsl-parser/direct');
var tokenize = require('glsl-tokenizer/string');
var glmat = require('gl-matrix');
var almost = require('./util/almost');
var eval = require('./util/eval');
var ndarray = require('ndarray');
var clean = require('cln')

// constructors

test('vec3()', function (t) {
	t.equal(eval('+vec3().length();'), 3);
	t.deepEqual(eval('vec3();'), [0, 0, 0]);
	t.equal(eval('vec3()[3];'), undefined);
	t.end()
})

// initializes each component of the vec3 with the float
test('vec3(float)', function (t) {
	t.equal(eval('+vec3(2.2).length();'), 3);
	t.deepEqual(eval('vec3(2.2);'), [2.2, 2.2, 2.2]);
	t.equal(eval('vec3(2.2)[3];'), undefined);
	t.end()
})

// makes a vec4 with component-wise conversion
test('vec4(ivec4)', function (t) {
	t.equal(eval('vec4(ivec4(0, 1, 2, 3)).length();'), 4);
	t.equal(eval('vec4(ivec4(0, 1, 2, 3))[0];'), 0);
	t.equal(eval('vec4(ivec4(0, 1, 2, 3))[1];'), 1);
	t.equal(eval('vec4(ivec4(0, 1, 2, 3))[2];'), 2);
	t.equal(eval('vec4(ivec4(0, 1, 2, 3))[3];'), 3);
	t.end()
})

// the vec4 is column 0 followed by column 1
test('vec4(mat2)', function (t) {
	t.equal(eval('vec4(mat2(0, 1, 2, 3)).length();'), 4);
	t.equal(eval('vec4(mat2(0, 1, 2, 3))[0];'), 0);
	t.equal(eval('vec4(mat2(0, 1, 2, 3))[1];'), 1);
	t.equal(eval('vec4(mat2(0, 1, 2, 3))[2];'), 2);
	t.equal(eval('vec4(mat2(0, 1, 2, 3))[3];'), 3);
	t.end()
})

// initializes a vec2 with 2 floats
test('vec2(float, float)', function (t) {
	t.equal(eval('vec2(1.2, 3.3).length();'), 2);
	t.equal(eval('vec2(1.2, 3.3)[0];'), 1.2);
	t.equal(eval('vec2(1.2, 3.3)[1];'), 3.3);
	t.equal(eval('vec2(1.2, 3.3)[2];'), undefined);
	t.equal(eval('vec2(1.2, 3.3)[3];'), undefined);
	t.end()
})

// initializes an ivec3 with 3 ints
test('ivec3(int, int, int)', function (t) {
	t.equal(eval('ivec3(1.2, 3.3, 5).length();'), 3);
	t.deepEqual(eval('ivec3(1.2, 3.3, 5);', {debug: false}), [1,3,5]);
	t.equal(eval('ivec3(1.2, 3.3, 5)[3];'), undefined);
	t.end()
})

// uses 4 Boolean conversions
test('bvec4(int, int, float, float)', function (t) {
	t.equal(eval('bvec4(0, 4, 1.2, false).length();'), 4);
	t.equal(eval('bvec4(true, 0, 1.2, false)[0];'), true);
	t.equal(eval('bvec4(true, 0, 1.2, false)[1];'), false);
	t.equal(eval('bvec4(true, 0, 1.2, false)[2];'), true);
	t.equal(eval('bvec4(true, 0, 1.2, false)[3];'), false);
	t.end()
})

// drops the third component of a vec3
test('vec2(vec3)', function (t) {
	t.equal(eval('vec2(vec3(0, 4, 1.2)).length();'), 2);
	t.deepEqual(eval('vec2(vec3(0, 4, 1.2));', {debug: false}), [0, 4]);
	t.equal(eval('vec2(vec3(0, 4, 1.2))[2];'), undefined);
	t.end()
})

// drops the fourth component of a vec4
test('vec3(vec4)', function (t) {
	t.equal(eval('vec3(vec4(0, 4, 1.2, 2)).length();'), 3);
	t.equal(eval('vec3(vec4(0, 4, 1.2, 2))[0];'), 0);
	t.equal(eval('vec3(vec4(0, 4, 1.2, 2))[1];'), 4);
	t.equal(eval('vec3(vec4(0, 4, 1.2, 2))[2];'), 1.2);
	t.equal(eval('vec3(vec4(0, 4, 1.2, 2))[3];'), undefined);
	t.end()
})

// vec3.x = vec2.x, vec3.y = vec2.y, vec3.z = float
test('vec3(vec2, float)', function (t) {
	t.equal(eval('vec3(vec2(0, 4), 1.2).length();'), 3);
	t.equal(eval('vec3(vec2(0, 4), 1.2).x;'), 0);
	t.equal(eval('vec3(vec2(0, 4), 1.2).y;'), 4);
	t.equal(eval('vec3(vec2(0, 4), 1.2).z;'), 1.2);
	t.equal(eval('vec3(vec2(0, 4), 1.2).w;'), undefined);
	t.end()
})

// vec3.x = float, vec3.y = vec2.x, vec3.z = vec2.y
test('vec3(float, vec2)', function (t) {
	t.equal(eval('vec3(0, vec2(4, 1.2)).length();'), 3);
	t.equal(eval('vec3(0, vec2(4, 1.2)).r;'), 0);
	t.equal(eval('vec3(0, vec2(4, 1.2)).g;'), 4);
	t.equal(eval('vec3(0, vec2(4, 1.2)).b;'), 1.2);
	t.equal(eval('vec3(0, vec2(4, 1.2)).a;'), undefined);
	t.end()
})

test('vec4(vec3, float)', function (t) {
	t.equal(eval('vec4(vec3(0, 4, 1.2), 0).length();'), 4);
	t.equal(eval('vec4(vec3(0, 4, 1.2), 0).s;'), 0);
	t.equal(eval('vec4(vec3(0, 4, 1.2), 0).t;'), 4);
	t.equal(eval('vec4(vec3(0, 4, 1.2), 0).p;'), 1.2);
	t.equal(eval('vec4(vec3(0, 4, 1.2), 0).d;'), 0);
	t.end()
})

test('vec4(float, vec3)', function (t) {
	t.equal(eval('vec4(0, vec3(4, 1.2, 0)).length();'), 4);
	t.equal(eval('vec4(0, vec3(4, 1.2, 0))[0];'), 0);
	t.equal(eval('vec4(0, vec3(4, 1.2, 0))[1];'), 4);
	t.equal(eval('vec4(0, vec3(4, 1.2, 0))[2];'), 1.2);
	t.equal(eval('vec4(0, vec3(4, 1.2, 0))[3];'), 0);
	t.end()
})

test('vec4(vec2, vec2)', function (t) {
	t.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0)).length();'), 4);
	t.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[0];'), 0);
	t.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[1];'), 4);
	t.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[2];'), 1.2);
	t.equal(eval('vec4(vec2(0, 4), vec2(1.2, 0))[3];'), 0);
	t.end()
})





// relational fns

test('bvec lessThan (vec x, vec y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`lessThan(vec2(${x}), vec2(${y}));`), [x < y, x < y]));
	t.ok(almost(eval(`lessThan(vec3(${x}), vec3(${y}));`), [x < y, x < y, x < y]));
	t.end()
})

test('bvec lessThanEqual (vec x, vec y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`lessThanEqual(vec2(${x}), vec2(${y}));`), [x <= y, x <= y]));
	t.ok(almost(eval(`lessThanEqual(vec3(${x}), vec3(${y}));`), [x <= y, x <= y, x <= y]));
	t.end()
})

test('bvec greaterThan (vec x, vec y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`greaterThan(vec2(${x}), vec2(${y}));`), [x > y, x > y]));
	t.ok(almost(eval(`greaterThan(vec3(${x}), vec3(${y}));`), [x > y, x > y, x > y]));
	t.end()
})

test('bvec greaterThanEqual (vec x, vec y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`greaterThanEqual(vec2(${x}), vec2(${y}));`), [x >= y, x >= y]));
	t.ok(almost(eval(`greaterThanEqual(vec3(${x}), vec3(${y}));`), [x >= y, x >= y, x >= y]));
	t.end()
})

test('bvec equal (vec x, vec y)', function (t) {
	t.ok(almost(eval(`equal(vec2(1), vec2(1));`), [true, true]));
	t.ok(almost(eval(`equal(vec3(1), vec3(1));`), [true, true, true]));
	t.ok(almost(eval(`equal(vec3(1), vec3(1, 1, -1));`), [true, true, false]));
	t.end()
})

test('bvec notEqual (vec x, vec y)', function (t) {
	t.ok(almost(eval(`notEqual(vec2(1), vec2(1));`), [false, false]));
	t.ok(almost(eval(`notEqual(vec3(1), vec3(1));`), [false, false, false]));
	t.ok(almost(eval(`notEqual(vec3(1), vec3(1, -1, 1));`), [false, true, false]));
	t.end()
})

test('bvec not (bvec x)', function (t) {
	t.deepEqual(eval(`not(bvec2(false, true));`), [true, false]);
	t.end()
})

test('bool any (bvec x)', function (t) {
	t.equal(eval(`any(bvec3(false, true, false));`), true);
	t.equal(eval(`any(bvec3(false, false, false));`), false);
	t.end()
})

test('bool all (bvec x)', function (t) {
	t.equal(eval(`all(bvec3(false, true, false));`), false);
	t.equal(eval(`all(bvec3(true, true, true));`), true);
	t.end()
})

// operations

test('vec + number', function (t) {
	var src = `
		vec3 v = vec3(1,2,3), u = vec3(4,5,6);
		float f = 0.0;
		v = u + f + v;
	`;

	t.equal(clean(GLSL().compile(src)), clean(`
		var v = [1, 2, 3], u = [4, 5, 6];
		var f = 0.0;
		v = [u[0] + f + v[0], u[1] + f + v[1], u[2] + f + v[2]];
	`));
	t.deepEqual(eval(src, {debug: false}), [5, 7, 9]);
	t.deepEqual(eval(src, {optimize: false, debug: false}), [5, 7, 9]);
	t.end()
})

test('mat + mat', function (t) {
	var src2 = `
		mat2 v = mat2(1,2,3,4), u = mat2(5,6,7,8);
		float f = 1.0;
		v += f + u;
	`;

	t.deepEqual(eval(src2, {optimize: true, debug: false}), [7,9,11,13]);
	t.deepEqual(eval(src2, {optimize: false, debug: false}), [7,9,11,13]);
	t.end()
})

test('vec + vec', function (t) {
	var src = `
		vec3 v = vec4(mat2x2(1)).xxz, u = vec3(2), w;
		w = v + u;
	`;

	t.deepEqual(eval(src, {debug: false}), [3, 3, 2]);
	t.deepEqual(eval(src, {debug: false, optimize: false}), [3, 3, 2]);
	t.end()
})

test('vec * mat', function (t) {
	var src = `
		vec3 v = vec3(2, 2, 1), u;
		mat3 m = mat3(2);
		u = v * m;
	`;

	t.deepEqual(eval(src, {debug: false}), [4, 4, 2]);
	t.deepEqual(eval(src, {debug: false, optimize: false}), [4, 4, 2]);
	t.end()
})

test('mat * vec', function (t) {
	var src = `
		vec3 v = vec3(2, 2, 1), u;
		mat3 m = mat3(2);
		u = m * v;
	`;
	t.deepEqual(eval(src, {debug: false}), [4, 4, 2]);
	t.deepEqual(eval(src, {debug: false, optimize: false}), [4, 4, 2]);
	t.end()
})

test('mat * vec + vec', function (t) {
	var src = `
		vec2 v = vec2(2, 1), u;
		mat2 m = mat2(2);
		u = m * v + v;
	`;
	t.deepEqual(eval(src, {debug: false}), [6, 3]);
	t.deepEqual(eval(src, {debug: false, optimize: false}), [6, 3]);
	t.end()
})


test('mat * mat', function (t) {
	var src = `
		mat3 m = mat3(1), n = mat3(2), r;
		r = m * n;
	`;

	t.deepEqual(eval(src, {debug: false}), [2, 0, 0, 0, 2, 0, 0, 0, 2]);
	t.deepEqual(eval(src, {debug: false, optimize: false}), [2, 0, 0, 0, 2, 0, 0, 0, 2]);
	t.end()
})

test.skip('vector/matrix.length() → .length', function (t) {
	var src = `
		vec2 x, y = vec2(1, 2);
		mat2 xy = mat2(x, y);
		int z = vec4(x.length(), y.length(), mat2[0].length(), mat2.length()).length();
	`;

	var res = `
		var x = vec2(), y = vec2(1, 2);
		var xy = mat2(x, y);
		var z = vec4(x.length, y.length, mat2[0].length, mat2.length).length;
	`;
	t.end()
})

test(`mat * mat * mat`, function (t) {
	var compile = GLSL({includes: false});

	t.equal(clean(compile(`
	mat2 a, b, c;
	gl_Position = a * b * c;
	`)), clean(`
	var a = [1, 0, 0, 1], b = [1, 0, 0, 1], c = [1, 0, 0, 1];
	gl_Position = [(a[0] * b[0] + a[2] * b[1]) * c[0] + (a[0] * b[2] + a[2] * b[3]) * c[1], (a[1] * b[0] + a[3] * b[1]) * c[0] + (a[1] * b[2] + a[3] * b[3]) * c[1], (a[0] * b[0] + a[2] * b[1]) * c[2] + (a[0] * b[2] + a[2] * b[3]) * c[3], (a[1] * b[0] + a[3] * b[1]) * c[2] + (a[1] * b[2] + a[3] * b[3]) * c[3]];
	`))

	t.end()
})

test(`mat * mat * mat * vec`, function (t) {
	var compile = GLSL({includes: false});

	t.equal(clean(compile(`
	mat2 a, b, c;
	vec2 d;
	gl_Position = a * b * c * d;
	`)), clean(`
	var a = [1, 0, 0, 1], b = [1, 0, 0, 1], c = [1, 0, 0, 1];
	var d = [0, 0];
	gl_Position = [((a[0] * b[0] + a[2] * b[1]) * c[0] + (a[0] * b[2] + a[2] * b[3]) * c[1]) * d[0] + ((a[0] * b[0] + a[2] * b[1]) * c[2] + (a[0] * b[2] + a[2] * b[3]) * c[3]) * d[1], ((a[1] * b[0] + a[3] * b[1]) * c[0] + (a[1] * b[2] + a[3] * b[3]) * c[1]) * d[0] + ((a[1] * b[0] + a[3] * b[1]) * c[2] + (a[1] * b[2] + a[3] * b[3]) * c[3]) * d[1]];
	`))

	t.end()
})
