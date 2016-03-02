var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');
var compile = require('../string');
var GLSL = require('../');
var TokenStream = require('glsl-tokenizer/stream');
var ParseStream = require('glsl-parser/stream');
var CompileStream = require('../stream');
var test = require('tst');
var assert = require('assert');
var fs = require('fs');
var isBrowser = require('is-browser');
var StringStream = require('stream-array');
var Sink = require('stream').Writable;



//clean empty strings
function clean (str) {
	return str.trim().replace(/^\s*\n/gm, '').replace(/^\s*/gm, '');
}


test('Interface', function () {
	//examplary source, containing all possible tokens
	var source = `
	precision mediump float;
	attribute vec2 uv, xy = vec2(0);
	attribute vec4 color;
	varying vec4 fColor, twoColors[2];
	uniform vec2 uScreenSize;
	float coeff = 1.0, coeff2 = coeff + 1.0, a[2], b[3][2] = float[3](a, a, a);

	int count (float num);

	void main (void) {
		fColor = color;
		vec2 position = coeff * vec2(uv.x, -uv.y);
		position.x *= uScreenSize.y / uScreenSize.x;
		xy.xy *= uv.yx;
		gl_Position = vec4(position.yx / 2.0, 0, 1);
		gl_FragColor[0] = gl_FragCoord[0] / 2.0;
		return;
	}

	/* just a test function */
	int count (in float num) {
		int sum = 0;
		for (int i = 0; i < 10; i++) {
			sum += i;
			if (i > 4) continue;
			else break;

			discard;
		}
		int i = 0;
		while (i < 10) {
			--sum;
		}
		do {
			sum += i < 5 ? (i > 2 ? 1 : 2) : 0;
		}
		while (i < 10);
		return sum;
	}
	`;

	var result = `
	var uv = vec2(), xy = vec2(0);
	var color = vec4();
	var fColor = vec4(), twoColors = [vec4(), vec4()];
	var uScreenSize = vec2();
	var coeff = 1.0, coeff2 = coeff + 1.0, a = [0, 0], b = [a, a, a];

	function main () {
		fColor = color;
		var position = vec2(uv.x, -uv.y).multiply(coeff);
		position.x *= uScreenSize.y / uScreenSize.x;
		xy.xy = xy.xy.multiply(uv.yx);
		gl_Position = vec4(position.yx.divide(2.0), 0, 1);
		gl_FragColor[0] = gl_FragCoord[0] / 2.0;
		return;
	};

	function count (num) {
		var sum = 0;
		for (var i = 0; i < 10; i++) {
			sum += i;
			if (i > 4) {
				continue;
			} else {
				break;
			};

			discard();
		};
		var i = 0;
		while (i < 10) {
			--sum;
		};
		do {
			sum += i < 5 ? (i > 2 ? 1 : 2) : 0;
		} while (i < 10);
		return sum;
	};
	`;

	var shortResult = `
	var coeff = 1.0, coeff2 = coeff + 1.0, a = [0, 0], b = [a, a, a];

	function main () {
		fColor = color;
		var position = [[uv[0], -uv[1]][0] * coeff, [uv[0], -uv[1]][1] * coeff];
		position[0] *= uScreenSize[1] / uScreenSize[0];
		$(xy, 'xy', mult($(xy, 'xy'), $uv.yx));
		gl_Position = [position[1] / 2.0, position[0] / 2.0, 0, 1];
		gl_FragColor[0] = gl_FragCoord[0] / 2.0;
		return;
	};

	function count (num) {
		var sum = 0;
		for (var i = 0; i < 10; i++) {
			sum += i;
			if (i > 4) {
				continue;
			} else {
				break;
			};

			discard();
		};
		var i = 0;
		while (i < 10) {
			--sum;
		};
		do {
			sum += i < 5 ? (i > 2 ? 1 : 2) : 0;
		} while (i < 10);
		return sum;
	};
	`;


	test('Direct', function () {
		// assert.equal(clean(compile(source)).split('\n')[4], clean(result).split('\n')[4]);
		assert.equal(clean(compile(source)), clean(result));
	});

	test('Stream', function (done) {
		var res = '';

		StringStream(source.split('\n').map(function(v){return v + '\n'}))
		.pipe(TokenStream())
		// .on('data', function (chunk) {
		// 	console.log(chunk);
		// })
		.pipe(ParseStream())
		.pipe(CompileStream())
		.on('end', function() {
			assert.equal(clean(res), clean(result))
			done();
		})

		//to release data
		.pipe(Sink({
			objectMode: true,
			write: function (data, enc, cb) {
				res += data + '\n';
				cb();
			}
		}))
	});

	test.skip('Detect attributes, uniforms, varying', function () {
		var glsl = new GLSL({
			removeAttributes: true,
			removeUniforms: true,
			removeVarying: true,
			unswizzle: true
		});

		var result = glsl.compile(source);

		// assert.equal(clean(result).split('\n')[5], clean(shortResult).split('\n')[5]);
		assert.equal(clean(result), clean(shortResult));

		assert.deepEqual(Object.keys(glsl.attributes), ['uv', 'xy', 'color']);

		assert.deepEqual(Object.keys(glsl.varying), ['fColor', 'twoColors']);

		assert.deepEqual(Object.keys(glsl.uniforms), ['uScreenSize']);

		assert.deepEqual(glsl.types, ['vec2', 'vec4', 'float', 'int']);
	});
});


test.skip('main function', function() {
	test('should throw an error without a main function', function() {
		assert.throws(function () {
			compile('');
		}, /Parse error/);
	});

	test('should throw an error if main function returns incorrect type', function() {
		assert.throws('int main() {}', /main function must return void/);
	});

	test('should throw an error if main function accepts arguments', function() {
		assert.throws('void main(int a) {}', /No main function found/);
	});

	test('should throw an error if main function doesn\'t have a body', function() {
		assert.throws('void main();', /No main function found/);
	});

	test('should generate asm.js boilerplate', function() {
		compare(glsl.compile('void main() {}'), BOILERPLATE);
	});
});


test('primative variable declarations', function() {
	test('should default ints to 0', function() {
	assert.equal(
		clean(compile('void main() { int test; }')),
		clean('function main () {\nvar test = 0;\n};'));
	assert.equal(
		clean(compile('void main() { int test, foo; }')),
		clean('function main () {\nvar test = 0, foo = 0;\n};'));
	});

	test('should default floats to 0.0', function() {
	assert.equal(
		clean(compile('void main() { float test; }')),
		clean('function main () {\nvar test = 0;\n};'));
	assert.equal(
		clean(compile('void main() { float test, foo; }')),
		clean('function main () {\nvar test = 0, foo = 0;\n};'));
	});

	test('should default bools to 0 (false)', function() {
	assert.equal(
		clean(compile('void main() { bool test; }')),
		clean('function main () {\nvar test = false;\n};'));
	assert.equal(
		clean(compile('void main() { bool test, foo; }')),
		clean('function main () {\nvar test = false, foo = false;\n};'));
	});
});


test('primative variable initializers', function() {
	test('should allow valid int initializations', function() {
		assert.equal(
			clean(compile('void main() { int test = 1; }')),
			clean('function main () {\nvar test = 1;\n};'));
		assert.equal(
			clean(compile('void main() { int test = 55; }')),
			clean('function main () {\nvar test = 55;\n};'));
		assert.equal(
			clean(compile('void main() { int test = 0x23; }')),
			clean('function main () {\nvar test = 35;\n};'));
		assert.equal(
			clean(compile('void main() { int test = 023; }')),
			clean('function main () {\nvar test = 19;\n};'));
		assert.equal(
			clean(compile('void main() { int test, foo = 2, bar; }')),
			clean('function main () {\nvar test = 0, foo = 2, bar = 0;\n};'));
	});

	test('should allow valid float initializations', function() {
		assert.equal(
			clean(compile('void main() { float test = 1.0; }')),
			clean('function main () {\nvar test = 1.0;\n};'));
		assert.equal(
			clean(compile('void main() { float test = .04; }')),
			clean('function main () {\nvar test = .04;\n};'));
		assert.equal(
			clean(compile('void main() { float test = 0.50; }')),
			clean('function main () {\nvar test = 0.50;\n};'));
		assert.equal(
			clean(compile('void main() { float test = 55.23; }')),
			clean('function main () {\nvar test = 55.23;\n};'));
		assert.equal(
			clean(compile('void main() { float test = 5e3; }')),
			clean('function main () {\nvar test = 5e3;\n};'));
		assert.equal(
			clean(compile('void main() { float test = 5.5e3; }')),
			clean('function main () {\nvar test = 5.5e3;\n};'));
		assert.equal(
			clean(compile('void main() { float test = 5.5e-3; }')),
			clean('function main () {\nvar test = 5.5e-3;\n};'));
		assert.equal(
			clean(compile('void main() { float test = .5e3; }')),
			clean('function main () {\nvar test = .5e3;\n};'));
		assert.equal(
			clean(compile('void main() { float test, foo = 2.2, bar; }')),
			clean('function main () {\nvar test = 0, foo = 2.2, bar = 0;\n};'));
	});

	test('should allow valid bool initializations', function() {
		assert.equal(
			clean(compile('void main() { bool test = true; }')),
			clean('function main () {\nvar test = true;\n};'));
		assert.equal(
			clean(compile('void main() { bool test = false; }')),
			clean('function main () {\nvar test = false;\n};'));
		assert.equal(
			clean(compile('void main() { bool test, foo = true, bar; }')),
			clean('function main () {\nvar test = false, foo = true, bar = false;\n};'));
	});

	test.skip('should throw on invalid int initializations', function() {
		assert.throws('void main() { int test = 1.0; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = .04; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = 0.50; }',   /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = 55.23; }',  /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = 5e3; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = 5.5e3; }',  /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = 5.5e-3; }', /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = .5e3; }',   /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = true; }',   /Left and right arguments are of differing types/);
		assert.throws('void main() { int test = false; }',  /Left and right arguments are of differing types/);
	});


	test.skip('should throw on invalid float initializations', function() {
		assert.throws('void main() { float test = 1; }',     /Left and right arguments are of differing types/);
		assert.throws('void main() { float test = 55; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { float test = 0x23; }',  /Left and right arguments are of differing types/);
		assert.throws('void main() { float test = 023; }',   /Left and right arguments are of differing types/);
		assert.throws('void main() { float test = true; }',  /Left and right arguments are of differing types/);
		assert.throws('void main() { float test = false; }', /Left and right arguments are of differing types/);
	});

	test.skip('should throw on invalid bool initializations', function() {
		assert.throws('void main() { bool test = 1; }',      /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 55; }',     /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 0x23; }',   /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 023; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 1.0; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = .04; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 0.50; }',   /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 55.23; }',  /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 5e3; }',    /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 5.5e3; }',  /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = 5.5e-3; }', /Left and right arguments are of differing types/);
		assert.throws('void main() { bool test = .5e3; }',   /Left and right arguments are of differing types/);
	});
});


test('Structures', function () {
	var glsl = GLSL();

	var src = `
	struct light {
		float intensity, range;
		vec3 position;
	};

	light lightVar = light(3.0, 5.0, vec3(1.0, 2.0, 3.0));
	`;

	var res = `
	function light (intensity, range, position) {
		if (!(this instanceof light)) return new light(intensity, range, position);

		this.intensity = intensity;
		this.range = range;
		this.position = position;
	};
	var lightVar = light(3.0, 5.0, vec3(1.0, 2.0, 3.0));
	`;

	assert.equal(clean(glsl.compile(src)), clean(res));
});


test('Components access', function () {
	var glsl = GLSL();

	test('Array constructs', function () {
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

		assert.equal(clean(glsl.compile(src)), clean(res));
	});

	test('Arrays of arrays', function () {
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
		var b = [vec4(), vec4()];
		var c = [b, b, b];
		var d = [c, c, c, c];
		`;

		assert.equal(clean(glsl.compile(src)), clean(res));
	});


	`b[++x].a.length();`;


	`
	vec2 pos;
	float height;
	pos.x // is legal
	pos.z // is illegal
	height.x // is legal
	height.y // is illegal


	vec4 v4;
	v4.rgba; // is a vec4 and the same as just using v4,
	v4.rgb; // is a vec3,
	v4.b; // is a float,
	v4.xy; // is a vec2,
	v4.xgba; // is illegal - the component names do not come from
	 // the same set.

	vec4 pos = vec4(1.0, 2.0, 3.0, 4.0);
	vec4 swiz= pos.wzyx; // swiz = (4.0, 3.0, 2.0, 1.0)
	vec4 dup = pos.xxyy; // dup = (1.0, 1.0, 2.0, 2.0)
	float f = 1.2;
	vec4 dup = f.xxxx; // dup = (1.2, 1.2, 1.2, 1.2)

	vec4 f;
	vec4 g = pos.xyzwxy.xyzw; // illegal; pos.xyzwxy is non-existent “vec6”

	vec4 pos = vec4(1.0, 2.0, 3.0, 4.0);
	pos.xw = vec2(5.0, 6.0); // pos = (5.0, 2.0, 3.0, 6.0)
	pos.wx = vec2(7.0, 8.0); // pos = (8.0, 2.0, 3.0, 7.0)
	pos.xx = vec2(3.0, 4.0); // illegal - 'x' used twice
	pos.xy = vec3(1.0, 2.0, 3.0); // illegal - mismatch between vec2 and vec3

	vec3 v;
	const int L = v.length();
	L === 3;


	mat4 m;
	m[1] = vec4(2.0); // sets the second column to all 2.0
	m[0][0] = 1.0; // sets the upper left element to 1.0
	m[2][3] = 2.0; // sets the 4th element of the third column to 2.0
	mat3x4 v;
	const int L = v.length();
	`;

`
	mat2x2 a = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );
	mat2x2 b = { vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) };
	mat2x2 c = { { 1.0, 0.0 }, { 0.0, 1.0 } };
`;

`
float a[2] = { 3.4, 4.2, 5.0 }; // illegal
vec2 b = { 1.0, 2.0, 3.0 }; // illegal
mat3x3 c = { vec3(0.0), vec3(1.0), vec3(2.0), vec3(3.0) }; // illegal
mat2x2 d = { 1.0, 0.0, 0.0, 1.0 }; // illegal, can't flatten nesting
struct {
 float a;
 int b;
} e = { 1.2, 2, 3 }; // illegal
`;

});


test('Vec/matrix operators', function () {
	test('vec + number', function () {
		var src = `
			vec3 v, u;
			float f;
			v = u + f;
		`;

		var equiv = `
			v.x = u.x + f;
			v.y = u.y + f;
			v.z = u.z + f;
		`;

		var res = `
			var v = vec3(), u = vec3();
			var f = 0;
			v = u.add(f);
		`;

		assert.equal(clean(compile(src)), clean(res));
	});

	test('vec + vec', function () {
		var src = `
			vec3 v, u, w;
			w = v + u;
		`;

		var equiv = `
			w.x = v.x + u.x;
			w.y = v.y + u.y;
			w.z = v.z + u.z;
		`;

		var res = `
			var v = vec3(), u = vec3(), w = vec3();
			w = v.add(u);
		`;

		assert.equal(clean(compile(src)), clean(res));
	});

	test('vec * mat & mat * vec', function () {
		var src = `
			vec3 v, u;
			mat3 m;
			u = v * m;
			u = m * v;
		`;

		var equiv = `
			u.x = dot(v, m[0]); // m[0] is the left column of m
			u.y = dot(v, m[1]); // dot(a,b) is the inner (dot) product of a and b
			u.z = dot(v, m[2]);

			u.x = m[0].x * v.x + m[1].x * v.y + m[2].x * v.z;
			u.y = m[0].y * v.x + m[1].y * v.y + m[2].y * v.z;
			u.z = m[0].z * v.x + m[1].z * v.y + m[2].z * v.z;
		`;

		var res = `
			var v = vec3(), u = vec3();
			var m = mat3();
			u = v.multiply(m);
			u = m.multiply(v);
		`;

		assert.equal(clean(compile(src)), clean(res));
	});

	test('Matrix multiplication', function () {
		var src = `
			mat3 m, n, r;
			r = m * n;
		`;

		var res = `
			var m = mat3(), n = mat3(), r = mat3();
			r = m.multiply(n);
		`;

		var equiv = `
		r[0].x = m[0].x * n[0].x + m[1].x * n[0].y + m[2].x * n[0].z;
		r[1].x = m[0].x * n[1].x + m[1].x * n[1].y + m[2].x * n[1].z;
		r[2].x = m[0].x * n[2].x + m[1].x * n[2].y + m[2].x * n[2].z;
		r[0].y = m[0].y * n[0].x + m[1].y * n[0].y + m[2].y * n[0].z;
		r[1].y = m[0].y * n[1].x + m[1].y * n[1].y + m[2].y * n[1].z;
		r[2].y = m[0].y * n[2].x + m[1].y * n[2].y + m[2].y * n[2].z;
		r[0].z = m[0].z * n[0].x + m[1].z * n[0].y + m[2].z * n[0].z;
		r[1].z = m[0].z * n[1].x + m[1].z * n[1].y + m[2].z * n[1].z;
		r[2].z = m[0].z * n[2].x + m[1].z * n[2].y + m[2].z * n[2].z;
		`;

		assert.equal(clean(compile(src)), clean(res));
	});

	test.skip('vector/matrix.length() → .length', function () {
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
	});
});

test.skip('Functions', function () {
	test('Arguments', function () {
		var src = `
		vec4 f(in vec4 x, out vec4 y); // (A)
		vec4 f(in vec4 x, out uvec4 y); // (B) okay, different argument type
		vec4 f(in ivec4 x, out dvec4 y); // (C) okay, different argument type
		int f(in vec4 x, out vec4 y); // error, only return type differs
		vec4 f(in vec4 x, in vec4 y); // error, only qualifier differs
		vec4 f(const in vec4 x, out vec4 y); // error, only qualifier differs

		f(vec4, vec4); // exact match of vec4 f(in vec4 x, out vec4 y)
		f(vec4, uvec4); // exact match of vec4 f(in vec4 x, out uvec4 y)
		f(vec4, ivec4); // matched to vec4 f(in vec4 x, out vec4 y)
		// (C) not relevant, can't convert vec4 to
		// ivec4. (A) better than (B) for 2nd
		// argument (rule 3), same on first argument.
		f(ivec4, vec4); // NOT matched. All three match by implicit
		// conversion. (C) is better than (A) and (B)
		// on the first argument. (A) is better than
		// (B) and (C).
		`;

		var res = `
		`;

		assert.equal(clean(compile(src)), clean(res));
	});

	test('Interface', function () {
		//as far functions are hoisted, we can not care really much about
		var src = `
		vec4 f(in vec4 x);

		vec4 f(in vec4 x) {
			x;
		}
		`;

		var res = `
		function f(x) {
			x;
		};
		`;
	});
});

test.skip('Builtins', function () {
	`
	if (intensity < 0.0)
	 discard;
	`
	`
	// In the vertex language, the built-ins are intrinsically declared as:
	in int gl_VertexID;
	in int gl_InstanceID;
	out gl_PerVertex {
	 vec4 gl_Position;
	 float gl_PointSize;
	 float gl_ClipDistance[];
	};


	// In the geometry language, the built-in variables are intrinsically declared as:
	in gl_PerVertex {
	 vec4 gl_Position;
	 float gl_PointSize;
	 float gl_ClipDistance[];
	} gl_in[];
	in int gl_PrimitiveIDIn;
	in int gl_InvocationID;
	out gl_PerVertex {
	 vec4 gl_Position;
	 float gl_PointSize;
	 float gl_ClipDistance[];
	};
	out int gl_PrimitiveID;
	out int gl_Layer;
	out int gl_ViewportIndex;


	// In the fragment language, built-in variables are intrinsically declared as:
	in vec4 gl_FragCoord;
	in bool gl_FrontFacing;
	in float gl_ClipDistance[];
	in vec2 gl_PointCoord;
	in int gl_PrimitiveID;
	in int gl_SampleID;
	in vec2 gl_SamplePosition;
	in int gl_SampleMaskIn[];
	in int gl_Layer;
	in int gl_ViewportIndex;
	out float gl_FragDepth;
	out int gl_SampleMask[];


	//
	// Implementation-dependent constants. The example values below
	// are the minimum values allowed for these maximums.
	//
	const ivec3 gl_MaxComputeWorkGroupCount = { 65535, 65535, 65535 };
	const ivec3 gl_MaxComputeWorkGroupSize = { 1024, 1024, 64 };
	const int gl_MaxComputeUniformComponents = 1024;
	const int gl_MaxComputeTextureImageUnits = 16;
	const int gl_MaxComputeImageUniforms = 8;
	const int gl_MaxComputeAtomicCounters = 8;
	const int gl_MaxComputeAtomicCounterBuffers = 8;
	const int gl_MaxVertexAttribs = 16;
	const int gl_MaxVertexUniformComponents = 1024;
	const int gl_MaxVaryingComponents = 60;
	const int gl_MaxVertexOutputComponents = 64;
	const int gl_MaxGeometryInputComponents = 64;
	const int gl_MaxGeometryOutputComponents = 128;
	const int gl_MaxFragmentInputComponents = 128;
	const int gl_MaxVertexTextureImageUnits = 16;
	const int gl_MaxCombinedTextureImageUnits = 96;
	const int gl_MaxTextureImageUnits = 16;
	const int gl_MaxImageUnits = 8;
	const int gl_MaxCombinedImageUnitsAndFragmentOutputs = 8; // deprecated
	const int gl_MaxCombinedShaderOutputResources = 8;
	const int gl_MaxImageSamples = 0;
	const int gl_MaxVertexImageUniforms = 0;
	const int gl_MaxTessControlImageUniforms = 0;
	const int gl_MaxTessEvaluationImageUniforms = 0;
	const int gl_MaxGeometryImageUniforms = 0;
	const int gl_MaxFragmentImageUniforms = 8;
	const int gl_MaxCombinedImageUniforms = 8;
	const int gl_MaxFragmentUniformComponents = 1024;
	const int gl_MaxDrawBuffers = 8;
	const int gl_MaxClipDistances = 8;
	const int gl_MaxGeometryTextureImageUnits = 16;
	const int gl_MaxGeometryOutputVertices = 256;
	const int gl_MaxGeometryTotalOutputComponents = 1024;
	const int gl_MaxGeometryUniformComponents = 1024;
	const int gl_MaxGeometryVaryingComponents = 64; // deprecated
	const int gl_MaxTessControlInputComponents = 128;
	const int gl_MaxTessControlOutputComponents = 128;
	const int gl_MaxTessControlTextureImageUnits = 16;
	const int gl_MaxTessControlUniformComponents = 1024;
	const int gl_MaxTessControlTotalOutputComponents = 4096;
	const int gl_MaxTessEvaluationInputComponents = 128;
	const int gl_MaxTessEvaluationOutputComponents = 128;
	const int gl_MaxTessEvaluationTextureImageUnits = 16;
	const int gl_MaxTessEvaluationUniformComponents = 1024;
	const int gl_MaxTessPatchComponents = 120;
	const int gl_MaxPatchVertices = 32;
	const int gl_MaxTessGenLevel = 64;
	const int gl_MaxViewports = 16;
	const int gl_MaxVertexUniformVectors = 256;
	const int gl_MaxFragmentUniformVectors = 256;
	const int gl_MaxVaryingVectors = 15;
	const int gl_MaxVertexAtomicCounters = 0;
	const int gl_MaxTessControlAtomicCounters = 0;
	const int gl_MaxTessEvaluationAtomicCounters = 0;
	const int gl_MaxGeometryAtomicCounters = 0;
	const int gl_MaxFragmentAtomicCounters = 8;
	const int gl_MaxCombinedAtomicCounters = 8;
	const int gl_MaxAtomicCounterBindings = 1;
	const int gl_MaxVertexAtomicCounterBuffers = 0;
	const int gl_MaxTessControlAtomicCounterBuffers = 0;
	const int gl_MaxTessEvaluationAtomicCounterBuffers = 0;
	const int gl_MaxGeometryAtomicCounterBuffers = 0;
	const int gl_MaxFragmentAtomicCounterBuffers = 1;
	const int gl_MaxCombinedAtomicCounterBuffers = 1;
	const int gl_MaxAtomicCounterBufferSize = 32;
	const int gl_MinProgramTexelOffset = -8;
	const int gl_MaxProgramTexelOffset = 7;
	const int gl_MaxTransformFeedbackBuffers = 4;
	const int gl_MaxTransformFeedbackInterleavedComponents = 64;
	`
});



//include other tests
require('./stdlib');