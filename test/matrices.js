import test  from  'tape'
import evaluate from  './util/eval.js'

// constructors

// To initialize the diagonal of a matrix with all other elements set to zero:
test('mat2(float)', function (t) {
	t.equal(evaluate('mat2(1.2).length();'), 2);
	t.equal(evaluate('mat2(1.2)[0][0];', {debug: false}), 1.2);
	t.equal(evaluate('mat2(1.2)[0][1];'), 0);
	t.equal(evaluate('mat2(1.2)[1][0];', {debug: false}), 0);
	t.equal(evaluate('mat2(1.2)[1][1];', {debug: false}), 1.2);
	t.equal(evaluate('mat2(1.2)[1][1];', {debug: false, optimize: false}), 1.2);
	t.end()
})

test('mat3(float)', function (t) {
	t.equal(evaluate('mat3(1.2).length();'), 3);
	t.equal(evaluate('mat3(1.2)[0][0];'), 1.2);
	t.equal(evaluate('mat3(1.2)[0][1];'), 0);
	t.equal(evaluate('mat3(1.2)[0][2];'), 0);
	t.equal(evaluate('mat3(1.2)[1][0];'), 0);
	t.equal(evaluate('mat3(1.2)[1][1];'), 1.2);
	t.equal(evaluate('mat3(1.2)[1][2];'), 0);
	t.equal(evaluate('mat3(1.2)[2][0];'), 0);
	t.equal(evaluate('mat3(1.2)[2][1];'), 0);
	t.equal(evaluate('mat3(1.2)[2][2];'), 1.2);
	t.end()
})

test('mat4(float)', function (t) {
	t.equal(evaluate('mat4(1.2).length();'), 4);
	t.equal(evaluate('mat4(1.2)[0][0];'), 1.2);
	t.equal(evaluate('mat4(1.2)[0][1];'), 0);
	t.equal(evaluate('mat4(1.2)[0][2];'), 0);
	t.equal(evaluate('mat4(1.2)[0][3];'), 0);
	t.equal(evaluate('mat4(1.2)[1][0];'), 0);
	t.equal(evaluate('mat4(1.2)[1][1];'), 1.2);
	t.equal(evaluate('mat4(1.2)[1][2];'), 0);
	t.equal(evaluate('mat4(1.2)[1][3];'), 0);
	t.equal(evaluate('mat4(1.2)[2][0];'), 0);
	t.equal(evaluate('mat4(1.2)[2][1];'), 0);
	t.equal(evaluate('mat4(1.2)[2][2];'), 1.2);
	t.equal(evaluate('mat4(1.2)[2][3];'), 0);
	t.equal(evaluate('mat4(1.2)[3][0];'), 0);
	t.equal(evaluate('mat4(1.2)[3][1];'), 0);
	t.equal(evaluate('mat4(1.2)[3][2];'), 0);
	t.equal(evaluate('mat4(1.2)[3][3];'), 1.2);
	t.end()
})


// one column per argument
test('mat2(vec2, vec2);', function (t) {
	t.equal(evaluate('mat2(vec2(0, 1.2), vec2(-3, 3.3)).length();'), 2);
	t.equal(evaluate('mat2(vec2(0, 1.2), vec2(-3, 3.3))[0][0];'), 0);
	t.equal(evaluate('mat2(vec2(0, 1.2), vec2(-3, 3.3))[0][1];'), 1.2);
	t.equal(evaluate('mat2(vec2(0, 1.2), vec2(-3, 3.3))[1][0];'), -3);
	t.equal(evaluate('mat2(vec2(0, 1.2), vec2(-3, 3.3))[1][0];', {optimize: false}), -3);
	t.equal(evaluate('mat2(vec2(0, 1.2), vec2(-3, 3.3))[1][1];'), 3.3);
	t.end()
})


// one column per argument
test('mat3(vec3, vec3, vec3)', function (t) {
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3)).length();'), 3);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[0][0];'), 1.2);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[0][1];'), 1.2);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[0][2];'), 1.2);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[1][0];'), 0);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[1][1];'), 0);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[1][2];'), 0);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[2][0];'), 1);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[2][1];'), 2);
	t.equal(evaluate('mat3(vec3(1.2), vec3(), vec3(1,2,3))[2][2];'), 3);
	t.end()
})


// one column per argument
test('mat4(vec4, vec4, vec4, vec4);', function (t) {
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx).length();'), 4);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][0];'), 0);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][1];'), 0);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][2];'), 0);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[0][3];'), 0);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][0];'), 1.2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][1];'), 1.2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][2];'), 1.2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[1][3];'), 1.2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][0];'), -2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][1];'), -2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][2];'), -2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[2][3];'), -2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][0];'), 3);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][1];'), 2);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][2];'), 1);
	t.equal(evaluate('mat4(vec4(), vec4(1.2), vec4(-2).zzzz, vec4(0,1,2,3).wzyx)[3][3];'), 0);
	t.end()
})


// one column per argument
test.skip('mat3x2(vec2, vec2, vec2);', function (t) {
	var m = mat3x2(vec2(1.2), vec2(-2).xx, vec2(2,3).yx);

	t.equal(m.length(), 3);
	t.equal(m[0][0], 1.2);
	t.equal(m[0][1], 1.2);
	t.equal(m[1][0], -2);
	t.equal(m[1][1], -2);
	t.equal(m[2][0], 3);
	t.equal(m[2][1], 2);
	t.end()
})

// one column per argument
test('dmat2(dvec2, dvec2);', function (t) {
	t.equal(evaluate('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3)).length();'), 2);
	t.equal(evaluate('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[0][0];'), 0);
	t.equal(evaluate('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[0][1];'), 1.2);
	t.equal(evaluate('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[1][0];'), -3);
	t.equal(evaluate('dmat2(dvec2(0, 1.2), dvec2(-3, 3.3))[1][1];'), 3.3);
	t.end()
})


// one column per argument
test('dmat3(dvec3, dvec3, dvec3)', function (t) {
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3)).length();'), 3);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[0][0];'), 1.2);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[0][1];'), 1.2);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[0][2];'), 1.2);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[1][0];'), 0);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[1][1];'), 0);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[1][2];'), 0);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[2][0];'), 1);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[2][1];'), 2);
	t.equal(evaluate('dmat3(dvec3(1.2), dvec3(), dvec3(1,2,3))[2][2];'), 3);
	t.end()
})


// one column per argument
test('dmat4(dvec4, dvec4, dvec4, dvec4);', function (t) {
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx).length();'), 4);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][0];'), 0);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][1];'), 0);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][2];'), 0);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[0][3];'), 0);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][0];'), 1.2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][1];'), 1.2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][2];'), 1.2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[1][3];'), 1.2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][0];'), -2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][1];'), -2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][2];'), -2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[2][3];'), -2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][0];'), 3);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][1];'), 2);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][2];'), 1);
	t.equal(evaluate('dmat4(dvec4(), dvec4(1.2), dvec4(-2).zzzz, dvec4(0,1,2,3).wzyx)[3][3];'), 0);
	t.end()
})

test('mat2(float, float, float, float);', function (t) {
	t.equal(evaluate('mat2(0,1.2,-3,3.3).length();'), 2);
	t.equal(evaluate('mat2(0,1.2,-3,3.3)[0][0];'), 0);
	t.equal(evaluate('mat2(0,1.2,-3,3.3)[0][1];'), 1.2);
	t.equal(evaluate('mat2(0,1.2,-3,3.3)[1][0];'), -3);
	t.equal(evaluate('mat2(0,1.2,-3,3.3)[1][1];'), 3.3);
	t.end()
})

test('mat3(float × 9)', function (t) {
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7).length();'), 3);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[0][0];'), 0);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[0][1];'), 1.2);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[0][2];'), -3);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[1][0];'), 1);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[1][1];'), 2);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[1][2];'), 3);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[2][0];'), 5);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[2][1];'), 6);
	t.equal(evaluate('mat3(0,1.2,-3, 1,2,3, 5,6,7)[2][2];'), 7);
	t.end()
})

test('mat4(float × 16)', function (t) {
	t.equal(evaluate('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1).length();'), 4);
	t.deepEqual(evaluate('mat4(0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1);'), [0,1.2,-3,3, 1,2,3,4, 5,6,7,8, 0,0,-1,-1]);
	t.end()
})

test.skip('mat2x3(vec2, float, vec2, float);', function (t) {
	var m = mat2x3(vec2(0,1.2),-3, vec2(3,1),2);

	t.equal(m.length(), 2);
	t.equal(m[0][0], 0);
	t.equal(m[0][1], 1.2);
	t.equal(m[0][2], -3);
	t.equal(m[1][0], 3);
	t.equal(m[1][1], 1);
	t.equal(m[1][2], 2);
	t.end()
})

test.skip('dmat2x4(dvec3, double, double, dvec3)', function (t) {
	var m = dmat2x4(dvec3(0,1.2,3),-3, 4, dvec3(3,1,2));

	t.equal(m.length(), 2);
	t.equal(m[0][0], 0);
	t.equal(m[0][1], 1.2);
	t.equal(m[0][2], 3);
	t.equal(m[0][3], -3);
	t.equal(m[1][0], 4);
	t.equal(m[1][1], 3);
	t.equal(m[1][2], 1);
	t.equal(m[1][3], 2);
	t.end()
})


// takes the upper-left 3x3 of the mat4x4
test('mat3x3(mat4x4);', function (t) {
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4))).length();'), 3);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[0][0];'), 1);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[0][1];'), 1);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[0][2];'), 1);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[1][0];'), 2);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[1][1];'), 2);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[1][2];'), 2);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[2][0];'), 3);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[2][1];'), 3);
	t.equal(evaluate('mat3(mat4(vec4(1), vec4(2), vec4(3), vec4(4)))[2][2];'), 3);
	t.end()
})

// takes the upper-left 3x3 of the mat3
test('mat3x3(mat3x3);', function (t) {
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3))).length();'), 3);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[0][0];'), 1);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[0][1];'), 1);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[0][2];'), 1);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[1][0];'), 2);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[1][1];'), 2);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[1][2];'), 2);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[2][0];'), 3);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[2][1];'), 3);
	t.equal(evaluate('mat3(mat3(vec3(1), vec3(2), vec3(3)))[2][2];'), 3);
	t.end()
})

// takes the upper-left 3x3 of the mat2
test('mat3x3(mat2x2);', function (t) {
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2))).length();'), 3);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[0][0];'), 1);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[0][1];'), 1);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[0][2];'), 0);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[1][0];'), 2);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[1][1];'), 2);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[1][2];'), 0);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[2][0];'), 0);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[2][1];'), 0);
	t.equal(evaluate('mat3(mat2(vec2(1), vec2(2)))[2][2];'), 1);
	t.end()
})

// takes the upper-left 2x2 of the mat4x4, last row is 0,0
test.skip('mat2x3(mat4x2);', function (t) {
	var m = mat2x3(mat4x2(vec2(1), vec2(2), vec2(3), vec2(4)));
	t.equal(m.length(), 2);
	t.equal(m[0][0], 1);
	t.equal(m[0][1], 1);
	t.equal(m[0][2], 0);
	t.equal(m[1][0], 2);
	t.equal(m[1][1], 2);
	t.equal(m[1][2], 0);
	t.end()
})

// puts the mat3x3 in the upper-left, sets the lower right component to 1, and the rest to 0
test('mat4x4(mat3x3);', function (t) {
	t.equal(evaluate('mat4(mat3(vec3(1), vec3(2), vec3(3))).length();'), 4);
	t.deepEqual(evaluate('mat4(mat3(vec3(1), vec3(2), vec3(3)));', {debug: false}), [1,1,1,0, 2,2,2,0, 3,3,3,0, 0,0,0,1]);
	t.deepEqual(evaluate('mat4(mat3(vec3(1), vec3(2), vec3(3)));', {optimize: false, debug:false}), [1,1,1,0, 2,2,2,0, 3,3,3,0, 0,0,0,1]);
	t.end()
})
test('mat4x4(mat2);', function (t) {
	t.equal(evaluate('mat4(mat2(vec2(1), vec2(2))).length();'), 4);
	t.deepEqual(evaluate('mat4(mat2(vec3(1), vec3(2)));'), [1,1,0,0, 2,2,0,0, 0,0,1,0, 0,0,0,1]);
	t.deepEqual(evaluate('mat4(mat2(vec3(1), vec3(2)));', {optimize: false}), [1,1,0,0, 2,2,0,0, 0,0,1,0, 0,0,0,1]);
	t.end()
})


// operations
test('mat matrixCompMult (mat x, mat y)', function (t) {
	t.deepEqual(evaluate(`
		mat3 m = mat3(1, 1, 1, 2, 2, 2, 3, 3, 3);
		mat3 n = mat3(vec3(4), vec3(5), vec3(6));
		matrixCompMult(m, n);
	`, {optimize: true, debug: false}), [4, 4, 4, 10, 10, 10, 18, 18, 18]);
	t.end()
})

test('matN outerProduct (vecN, vecN)', function (t) {
	t.deepEqual(evaluate(`
		outerProduct(vec3(1, 2, 3), vec3(1));
	`, {debug:false}), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
	t.deepEqual(evaluate(`
		outerProduct(vec2(1, 2), vec2(3, 4));
	`, {debug:false}), [3, 4, 6, 8]);
	t.end()
})

test('matN transpose (matN m)', function (t) {
	t.deepEqual(evaluate(`
		transpose(mat3(1,2,3,4,5,6,7,8,9));
	`, {debug:false}), [1,4,7,2,5,8,3,6,9]);
	t.end()
})

test('determinant (mat m)', function (t) {
	t.equal(evaluate(`
		determinant(mat2(1, 2, 3, 4));
	`), -2);
	t.equal(evaluate(`
		determinant(mat3(1, 0, 0, 0, 1, 0, 1, 2, 1));
	`), 1);
	t.equal(evaluate(`
		determinant(mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1));
	`), 1);
	t.end()
})

test('mat inverse (mat m)', function (t) {
	t.deepEqual(evaluate(`
		inverse(mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1));
	`), [1,0,0,0,0,1,0,0,0,0,1,0,-1,-2,-3,1]);
	t.deepEqual(evaluate(`
		inverse(mat3(1, 0, 0, 0, 1, 0, 1, 2, 1));
	`), [1,0,0,0,1,0,-1,-2,1]);
	t.deepEqual(evaluate(`
		inverse(mat2(1, 2, 3, 4));
	`), [-2, 1, 1.5, -0.5]);
	t.end()
})
