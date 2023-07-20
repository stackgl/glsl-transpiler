import GLSL from '../index.js'
import test from 'tape'
import evaluate from './util/eval.js'
import clean from 'cln'
import glsl from 'glslify'

import './functions.js'
import './math.js'
import './primitives.js'
import './vectors.js'
import './matrices.js'
import './builtins.js'
import './preprocessor.js'
import './api.js'
import './structs.js'

var compile = GLSL({})


test('vec2 c() {return vec2();}; void a() {vec4 b = vec4(c(), 0, 0);}', function (t) {
	t.equal(clean(compile(t.name)), clean(`
		function c () {
			return [0, 0];
		};

		function a () {
			var b = c().concat([0, 0]);
		};
	`));
	t.end()
})
test('vec3 x; x += 1;', function (t) {
	t.deepEqual(evaluate(t.name, {debug: false}), [1, 1, 1]);
	t.end()
})
test('console.log(123);', function (t) {
	t.equal(clean(compile(t.name)), clean(`
		console.log(123);
	`));
	t.end()
})
test('for (int i = 0; i < 10; i++) { if (i > 4) ; }', function (t) {
	t.equal(clean(compile(t.name)), clean(`
		for (var i = 0; i < 10; i++) {
			if (i > 4) {
			};
		};
		`));
	t.end()
})
test('float x; vec2 uv, position = fn(x) * vec2(uv.yx.yx.x, -uv.y);', function (t) {
	t.equal(
		clean(compile(t.name, {optimize: true})),
		clean(`
		var x = 0;
		var uv = [0, 0], position = [uv[0], -uv[1]].map(function (_) {return this * _;}, fn(x));
		`)
		//ideal:
		// var fnx = fn(x)
		// var uv = [0, 0], position = [uv[0] * fnx, -uv[1] * fnx];
	);
	t.end()
})
test('vec2 uv = vec2(1.); uv += mix(uv, uv, 0.);', function (t) {
	t.deepEqual(evaluate(t.name), [2, 2]);
	t.end()
})
test('vec2 uv = vec2(0., 0.5); uv *= smoothstep(0., 1., uv);', function (t) {
	t.deepEqual(evaluate(t.name), [0, 0.25]);
	t.end()
})
test('float x = 0.5; vec2 uv = vec2(0., 0.5); uv *= smoothstep(0., 1., x);', function (t) {
	t.deepEqual(evaluate(t.name), [0, 0.25]);
	t.end()
})
test('vec2 position; position *= 1.0 + vec2();', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var position = [0, 0];
		position = [position[0], position[1]];
		`)
	);
	t.end()
})
test('vec2 position; position = position * (1.0 + vec2());', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var position = [0, 0];
		position = [position[0], position[1]];
		`)
	);
	t.end()
})
test('vec2 v = vec2(1, 1); v.x;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var v = [1, 1];
		v[0];
		`)
	);
	t.end()
})
test('vec2 v = vec2(1, 1); v.yx + 1;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var v = [1, 1];
		[v[1] + 1, v[0] + 1];
		`)
	);
	t.end()
})
test('gl_Position.xy += gl_Position.yx;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		gl_Position = [gl_Position[0] + gl_Position[1], gl_Position[1] + gl_Position[0], gl_Position[2], gl_Position[3]];
		`)
	);
	t.end()
})
test('uniform vec4 v; uniform float c; gl_FragColor = vec4(v.wzyx) * c;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var v = [0, 0, 0, 0];
		var c = 0;
		gl_FragColor = [v[3] * c, v[2] * c, v[1] * c, v[0] * c];
		`)
	);
	t.end()
})
test('vec3 x = mat3(2)[1];', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var x = [0, 2, 0];
		`)
	);
	t.end()
})
test('mat3 x = mat3(2);', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var x = [2, 0, 0, 0, 2, 0, 0, 0, 2];
		`)
	);
	t.end()
})
//constants propagation is unimplemented
test.skip('vec4 v; float c; gl_FragColor = vec4(v.wzyx) * c;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var v = [0, 0, 0, 0];
		var c = 0;
		gl_FragColor = [0, 0, 0, 0];
		`)
	);
	t.end()
})
test('gl_Position.x = gl_Position.y / gl_Position.x;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		gl_Position[0] = gl_Position[1] / gl_Position[0];
		`)
	);
	t.end()
})
test.skip('st.prop = val', function (t) {
	t.end()
})
test('vec4 v = vec4(1, 2, 3, 4); v.wy *= v.zx;', function (t) {
	//gl_Position = [null, 1, null, 0].map(function (idx, i) {
	//	return idx == null ? gl_position[i] : this[idx];
	//}, gl_Position.wy * gl_Position.zx)
	t.deepEqual(
		evaluate(t.name),
		[1, 2, 3, 12]
	);
	t.end()
})
test('gl_Position.yx = gl_Position.xy / gl_Position.yx;', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		gl_Position = [gl_Position[1] / gl_Position[0], gl_Position[0] / gl_Position[1], gl_Position[2], gl_Position[3]];
		`)
	);
	t.end()
})
test('gl_FragColor[0] = gl_FragCoord[0] / gl_Position.length();', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		gl_FragColor[0] = gl_FragCoord[0] / 4;
		`)
	);
	t.end()
})
test('vec2 p; gl_Position = vec4(p.yx / 2.0, 0, 1);', function (t) {
	t.equal(
		clean(compile(t.name)),
		clean(`
		var p = [0, 0];
		gl_Position = [p[1] / 2.0, p[0] / 2.0, 0, 1];
		`)
	)
	t.end()
})
test('int f(float x) {return 1;}; int f(double x) {return 2;}; double x; f(x);', function (t) {
	t.equal(evaluate(t.name, {debug:false}), 2);
	t.end()
})
test('main, then again main', function (t) {
	var compile = GLSL();
	t.equal(clean(compile(`
		void main (void) {

		};
	`)), clean(`
		function main () {

		};
	`));
	t.equal(clean(compile(`
		void main (void) {

		};
	`)), clean(`
		function main () {

		};
	`));
	t.equal(clean(compile(`
		void main () {

		};
	`)), clean(`
		function main () {

		};
	`));
	t.end()
})
test('attribute float x, y; uniform float z;', function (t) {
	var compile = GLSL({
		attribute: false
	});

	t.equal(clean(compile(t.name)), clean(`
		var z = 0;
	`))
	t.end()
})
test('uniform sampler2D s;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var s;
	`))
	t.end()
})
test('vec2 x, z = (x*2.0+1.0)*x;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var x = [0, 0], z = [(x[0] * 2.0 + 1.0) * x[0], (x[1] * 2.0 + 1.0) * x[1]];
	`))
	t.end()
})
test('vec3 permute(vec3 x) { return mod289((x*34.0+1.0)*x);}', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		function permute (x) {
			x = x.slice();
			return mod289([(x[0] * 34.0 + 1.0) * x[0], (x[1] * 34.0 + 1.0) * x[1], (x[2] * 34.0 + 1.0) * x[2]]);
		};
	`))
	t.end()
})
test('if (true) {} else {x = 1.;}', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		if (true) {
		} else {
		x = 1.;
		};
	`))
	t.end()
})
test('attribute float sign;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var sign = 0;
	`))
	t.end()
})
test(`normalize(vec2(b));`, function (t) {
	var compile = GLSL({includes: false})

	t.equal(clean(compile(t.name)), clean(`
		normalize([b, b]);
	`))
	t.end()
})
test(`a[0].x = 0.0; a[1].y = 1.0;`, function (t) {
	var compile = GLSL({includes: false})

	t.equal(clean(compile(t.name)), clean(`
		a[0][0] = 0.0;
		a[1][1] = 1.0;
	`))
	t.end()
})
test.skip(`a[2].zw = 2.0;`, function (t) {
	var compile = GLSL({includes: false});

	t.equal(clean(compile(t.name)), clean(`
		[a[2][2], a[2][3]] = [2.0, 2.0]
	`))
	t.end()
})
test(`const float E = 2.7182817459106445e+0;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var E = 2.7182817459106445e+0;
	`))
	t.end()
})
//FIXME: make parser handle things properly
test.skip('source1', function (t) {
	var str = glsl('./fixture/source1.glsl');

	compile(str);
	t.end()
})
test.skip('source2', function (t) {
	var str = glsl('./fixture/source2.glsl');

	compile(str);
	t.end()
})
test('texture2D', function (t) {
	var data = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
	data.width = 2;
	data.height = 2;

	t.deepEqual(evaluate(`
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
	t.end()
})
test('Array constructs', function (t) {
	var src = `
	const float c[3] = float[3](5.0, 7.2, 1.1), x, y = 1;
	// const float d[3] = float[](5.0, 7.2, 1.1);

	float g, x = 0;
	float a[5] = float[5](g, 1, g, 2.3, g);
	float b[3];
	b = float[3](g, g + 1.0, g + 2.0);
	`;

	var res = `
	var c = [5.0, 7.2, 1.1], x = 0, y = 1;
	var g = 0, x = 0;
	var a = [g, 1, g, 2.3, g];
	var b = [0, 0, 0];
	b = [g, g + 1.0, g + 2.0];
	`;

	t.equal(clean(compile(src)), clean(res));
	t.end()
})
test('Arrays of arrays', function (t) {
	var src = `
	vec4 b[2];
	vec4 c[3][2] = vec4[3](b, b, b);
	vec4 d[4][3][2] = vec4[4](c, c, c, c);
	// vec4[3][2](b, b, b); // constructor
	// vec4[][2](b, b, b); // constructor, valid, size deduced
	// vec4[3][](b, b, b); // constructor, valid, size deduced
	// vec4[][](b, b, b); // constructor, valid, both sizes deduced
	`;

	var res = `
	var b = [[0, 0, 0, 0], [0, 0, 0, 0]];
	var c = [b, b, b];
	var d = [c, c, c, c];
	`;

	t.equal(clean(compile(src)), clean(res));
	t.end()
})
test('Calculated access', function (t) {
	t.equal(clean(compile(`
		vec4 b[2];
		float x = +1.0;
		b[++x].prop;
		b[x++].a;
		b[--x].x;
		b[x--].xy.length();
		b.yx;
	`)), clean(`
		var b = [[0, 0, 0, 0], [0, 0, 0, 0]];
		var x = +1.0;
		b[++x].prop;
		b[x++][3];
		b[--x][0];
		2;
		[b[1], b[0]];
	`));
	t.end()
})
test(`p.z;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		p[2];
	`))
	t.end()
})
test(`p().z;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		p()[2];
	`))
	t.end()
})
test(`p.zw;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		[2, 3].map(function (x, i) { return this[x]}, p);
	`))
	t.end()
})
test(`p().zw;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		[2, 3].map(function (x, i) { return this[x]}, p());
	`))
	t.end()
})
test(`float x = vec2(1, 2).x;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var x = 1;
	`))
	t.end()
})
test(`float x = vec2(1, 2).xy;`, function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var x = [1, 2];
	`))
	t.end()
})

test('float x = 1.0; float y = -x;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var x = 1.0;
		var y = -x;
	`))
	t.end()
})
test('vec3 x = vec3(1.0); vec3 y = -x;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var x = [1, 1, 1];
		var y = [-x[0], -x[1], -x[2]];
	`))
	t.end()
})
test('vec3 x = vec3(1.0); vec3 y = 0. - x;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)), clean(`
		var x = [1, 1, 1];
		var y = [-x[0], -x[1], -x[2]];
	`))
	t.end()
})
test('float s = 0.; --s;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)),
	clean`
		var s = 0.;
		--s;
	`)

	t.end()
})
test('float s = 0.; s--;', function (t) {
	var compile = GLSL();

	t.equal(clean(compile(t.name)),
	clean`
		var s = 0.;
		s--;
	`)

	t.end()
})
test('vec3 f() { return vec3(3.); } vec3 x = -f();', function (t) {
	t.equal(clean(compile(t.name)),
	clean`
		function f () {
			return [3., 3., 3.];
		};
		var x = f().map(function (_) {return -_;});
	`)
	console.log()
	t.deepEqual(evaluate(t.name + ';x;'), [-3,-3,-3])

	t.end()
})

test('uvec2 n = uvec2(1);', function (t) {
	var compile = GLSL({version: '300 es'})
	t.equal(clean(compile(t.name)),
	clean`function uint (val) {
		return val|0;
	}
	var n = [1, 1].map(uint);`)
	t.deepEqual(evaluate(t.name + ';n;', {version: '300 es'}), [1,1])

	t.end()
})

// 	`
// 	vec2 pos;
// 	float height;
// 	pos.x // is legal
// 	pos.z // is illegal
// 	height.x // is legal
// 	height.y // is illegal


// 	vec4 v4;
// 	v4.rgba; // is a vec4 and the same as just using v4,
// 	v4.rgb; // is a vec3,
// 	v4.b; // is a float,
// 	v4.xy; // is a vec2,
// 	v4.xgba; // is illegal - the component names do not come from
// 	 // the same set.

// 	vec4 pos = vec4(1.0, 2.0, 3.0, 4.0);
// 	vec4 swiz= pos.wzyx; // swiz = (4.0, 3.0, 2.0, 1.0)
// 	vec4 dup = pos.xxyy; // dup = (1.0, 1.0, 2.0, 2.0)
// 	float f = 1.2;
// 	vec4 dup = f.xxxx; // dup = (1.2, 1.2, 1.2, 1.2)

// 	vec4 f;
// 	vec4 g = pos.xyzwxy.xyzw; // illegal; pos.xyzwxy is non-existent “vec6”

// 	vec4 pos = vec4(1.0, 2.0, 3.0, 4.0);
// 	pos.xw = vec2(5.0, 6.0); // pos = (5.0, 2.0, 3.0, 6.0)
// 	pos.wx = vec2(7.0, 8.0); // pos = (8.0, 2.0, 3.0, 7.0)
// 	pos.xx = vec2(3.0, 4.0); // illegal - 'x' used twice
// 	pos.xy = vec3(1.0, 2.0, 3.0); // illegal - mismatch between vec2 and vec3

// 	vec3 v;
// 	const int L = v.length();
// 	L === 3;


// 	mat4 m;
// 	m[1] = vec4(2.0); // sets the second column to all 2.0
// 	m[0][0] = 1.0; // sets the upper left element to 1.0
// 	m[2][3] = 2.0; // sets the 4th element of the third column to 2.0
// 	mat3x4 v;
// 	const int L = v.length();
// 	`;

// `
// 	mat2x2 a = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );
// 	mat2x2 b = { vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) };
// 	mat2x2 c = { { 1.0, 0.0 }, { 0.0, 1.0 } };
// `;

// `
// float a[2] = { 3.4, 4.2, 5.0 }; // illegal
// vec2 b = { 1.0, 2.0, 3.0 }; // illegal
// mat3x3 c = { vec3(0.0), vec3(1.0), vec3(2.0), vec3(3.0) }; // illegal
// mat2x2 d = { 1.0, 0.0, 0.0, 1.0 }; // illegal, can't flatten nesting
// struct {
//  float a;
//  int b;
// } e = { 1.2, 2, 3 }; // illegal
// `;


//array opertators
//  field selector .
// equality == !=
// assignment =
// indexing (arrays only) [ ]


