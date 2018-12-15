var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');
var GLSL = require('../');
var compile = GLSL.compile;
var TokenStream = require('glsl-tokenizer/stream');
var ParseStream = require('glsl-parser/stream');
var CompileStream = require('../stream');
var test = require('tst');
var assert = require('assert');
var StringStream = require('stream-array');
var Sink = require('stream').Writable;
var eval = require('./eval');
var clean = require('cln');
var glslifySync = require('glslify');

test('Episodes', function () {
	var compile = GLSL({
	});

	test('vec2 c() {return vec2();}; void a() {vec4 b = vec4(c(), 0, 0);}', function () {
		assert.equal(clean(compile(this.title)), clean(`
			function c () {
				return [0, 0];
			};

			function a () {
				var b = c().concat([0, 0]);
			};
		`));
	});

	test('vec3 x; x += 1;', function () {
		assert.deepEqual(eval(this.title, {debug: false}), [1, 1, 1]);
	})

	test('console.log(123);', function () {
		assert.equal(clean(compile(this.title)), clean(`
			console.log(123);
		`));
	});

	test('for (int i = 0; i < 10; i++) { if (i > 4) ; }', function () {
		assert.equal(clean(compile(this.title)), clean(`
			for (var i = 0; i < 10; i++) {
				if (i > 4) {
				};
			};
			`));
	});

	test('float x; vec2 uv, position = fn(x) * vec2(uv.yx.yx.x, -uv.y);', function () {
		assert.equal(
			clean(compile(this.title, {optimize: true})),
			clean(`
			var x = 0;
			var uv = [0, 0], position = [uv[0], -uv[1]].map(function (_) {return this * _;}, fn(x));
			`)
			//ideal:
			// var fnx = fn(x)
			// var uv = [0, 0], position = [uv[0] * fnx, -uv[1] * fnx];
		);
	});

	test('vec2 position; position *= 1.0 + vec2();', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var position = [0, 0];
			position = [position[0], position[1]];
			`)
		);
	});

	test('vec2 position; position = position * (1.0 + vec2());', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var position = [0, 0];
			position = [position[0], position[1]];
			`)
		);
	});

	test('vec2 v = vec2(1, 1); v.x;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var v = [1, 1];
			v[0];
			`)
		);
	});

	test('vec2 v = vec2(1, 1); v.yx + 1;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var v = [1, 1];
			[v[1] + 1, v[0] + 1];
			`)
		);
	});

	test('gl_Position.xy += gl_Position.yx;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			gl_Position = [gl_Position[0] + gl_Position[1], gl_Position[1] + gl_Position[0], gl_Position[2], gl_Position[3]];
			`)
		);
	});

	test('uniform vec4 v; uniform float c; gl_FragColor = vec4(v.wzyx) * c;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var v = [0, 0, 0, 0];
			var c = 0;
			gl_FragColor = [v[3] * c, v[2] * c, v[1] * c, v[0] * c];
			`)
		);
	});

	test('vec3 x = mat3(2)[1];', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var x = [0, 2, 0];
			`)
		);
	});

	test('mat3 x = mat3(2);', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var x = [2, 0, 0, 0, 2, 0, 0, 0, 2];
			`)
		);
	});

	//constants propagation is unimplemented
	test.skip('vec4 v; float c; gl_FragColor = vec4(v.wzyx) * c;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var v = [0, 0, 0, 0];
			var c = 0;
			gl_FragColor = [0, 0, 0, 0];
			`)
		);
	});

	test('gl_Position.x = gl_Position.y / gl_Position.x;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			gl_Position[0] = gl_Position[1] / gl_Position[0];
			`)
		);
	});

	test.skip('st.prop = val', function () {

	});

	test('vec4 v = vec4(1, 2, 3, 4); v.wy *= v.zx;', function () {
		//gl_Position = [null, 1, null, 0].map(function (idx, i) {
		//	return idx == null ? gl_position[i] : this[idx];
		//}, gl_Position.wy * gl_Position.zx)
		assert.deepEqual(
			eval(this.title),
			[1, 2, 3, 12]
		);
	});

	test('gl_Position.yx = gl_Position.xy / gl_Position.yx;', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			gl_Position = [gl_Position[1] / gl_Position[0], gl_Position[0] / gl_Position[1], gl_Position[2], gl_Position[3]];
			`)
		);
	});

	test('gl_FragColor[0] = gl_FragCoord[0] / gl_Position.length();', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			gl_FragColor[0] = gl_FragCoord[0] / 4;
			`)
		);
	});

	test('vec2 p; gl_Position = vec4(p.yx / 2.0, 0, 1);', function () {
		assert.equal(
			clean(compile(this.title)),
			clean(`
			var p = [0, 0];
			gl_Position = [p[1] / 2.0, p[0] / 2.0, 0, 1];
			`)
		)
	});

	test('int f(float x) {return 1;}; int f(double x) {return 2;}; double x; f(x);', function () {
		assert.equal(eval(this.title, {debug:false}), 2);
	});

	test('main, then again main', function () {
		var compile = GLSL();
		assert.equal(clean(compile(`
			void main (void) {

			};
		`)), clean(`
			function main () {

			};
		`));
		assert.equal(clean(compile(`
			void main (void) {

			};
		`)), clean(`
			function main () {

			};
		`));
		assert.equal(clean(compile(`
			void main () {

			};
		`)), clean(`
			function main () {

			};
		`));
	});

	test('attribute float x, y; uniform float z;', function () {
		var compile = GLSL({
			attribute: false
		});

		assert.equal(clean(compile(this.title)), clean(`
			var z = 0;
		`))
	});

	test('uniform sampler2D s;', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			var s;
		`))
	});

	test('vec2 x, z = (x*2.0+1.0)*x;', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			var x = [0, 0], z = [(x[0] * 2.0 + 1.0) * x[0], (x[1] * 2.0 + 1.0) * x[1]];
		`))
	});

	test('vec3 permute(vec3 x) { return mod289((x*34.0+1.0)*x);}', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			function permute (x) {
				x = x.slice();
				return mod289([(x[0] * 34.0 + 1.0) * x[0], (x[1] * 34.0 + 1.0) * x[1], (x[2] * 34.0 + 1.0) * x[2]]);
			};
		`))
	});

	test('if (true) {} else {x = 1.;}', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			if (true) {
			} else {
			x = 1.;
			};
		`))
	});

	test('attribute float sign;', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			var sign = 0;
		`))
	})

	test(`normalize(vec2(b));`, function () {
		var compile = GLSL({includes: false});

		assert.equal(clean(compile(this.title)), clean(`
			normalize([b, b]);
		`))
	})
});

test('Argument qualifiers', function() {

	// clone inputs
	test('void f(float a, vec3 b, mat4 c) { b.x = 1.0; }', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			function f (a, b, c) {
				b = b.slice();
				c = c.slice();
				b[0] = 1.0;
			};
		`))
	});

	// output w/o return statement
	test('void f(float a, out float b) { b = 1.0; }', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			function f (a, b) {
				b = 1.0;
				f.__out__ = [b];
			};
		`))
	});

	// output w/ return statement
	test('void f(float a, out float b) { if (a < 0.0) { b = -1.0; return; } b = 1.0; }', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			function f (a, b) {
				if (a < 0.0) {
					b = -1.0;
					f.__out__ = [b];
					return;
				};
				b = 1.0;
				f.__out__ = [b];
			};
		`))
	});

	// multiple outputs
	test('float f(out float a, out vec2 b, inout vec2 c) { a = 0.1; b = vec2(2.0); c = b; return 0.0; }', function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			function f (a, b, c) {
				c = c.slice();
				a = 0.1;
				b = [2.0, 2.0];
				c = b;
				f.__return__ = 0.0;
				f.__out__ = [a, b, c];
				return f.__return__;
			};
		`))
	});

	// calling 
	test(`float f(float a, out float b, out float c) { b = 1.0; c = 2.0; return a + 1.0; }
		void main() { float x = 0.1; float y; float z; x = f(x, y, z); }`, function () {
		var compile = GLSL();
		assert.equal(clean(compile(this.title)), clean(`
			function f (a, b, c) {
				b = 1.0;
				c = 2.0;
				f.__return__ = a + 1.0;
				f.__out__ = [b, c];
				return f.__return__;
			};
			function main () {
				var x = 0.1;
				var y = 0;
				var z = 0;
				x = (f(x, y, z), [y, z] = f.__out__, f.__return__);
			};
		`))
	});

	// recursive calling 
	test(`float f1(float a, out float b) { b = 1.0; return a + 1.0; }
		float f2(float a, out float b) { return f1(a, b) + 1.0; }
		void main() { float x = 0.1; float y; x = f2(x, y); }`, function () {
		var compile = GLSL();
		assert.equal(clean(compile(this.title)), clean(`
			function f1 (a, b) {
				b = 1.0;
				f1.__return__ = a + 1.0;
				f1.__out__ = [b];
				return f1.__return__;
			};
			function f2 (a, b) {
				f2.__return__ = (f1(a, b), [b] = f1.__out__, f1.__return__) + 1.0;
				f2.__out__ = [b];
				return f2.__return__;
			};
			function main () {
				var x = 0.1;
				var y = 0;
				x = (f2(x, y), [y] = f2.__out__, f2.__return__);
			};
		`))
	});
})


test('Real cases', function () {
	//FIXME: make parser handle things properly
	test.skip('source1', function () {
		var str = glslifySync('./source1.glsl');

		compile(str);
	});
	test.skip('source2', function () {
		var str = glslifySync('./source2.glsl');

		compile(str);
	});
});


test('Interface', function () {
	//examplary source, containing all possible tokens
	var source = `
		precision mediump float;
		attribute vec2 uv, xy = vec2(1);
		attribute vec4 color;
		varying vec4 fColor, twoColors[2];
		uniform vec2 uScreenSize = vec2(1,1);
		float coeff = 1.0, coeff2 = coeff + 1.0, a[2], b[3][2] = float[3](a, a, a);

		int count (float num);

		void main (void) {
			fColor = color;
			vec2 position = coeff * vec2(uv.x, -uv.y);
			position.x *= uScreenSize.y / uScreenSize.x;
			xy.xy *= uv.yx;
			gl_Position = vec4(position.yx / 2.0, 0, 1);
			gl_FragColor[0] = gl_FragCoord[0] / gl_Position.length();
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
		var uv = [0, 0], xy = [1, 1];
		var color = [0, 0, 0, 0];
		var fColor = [0, 0, 0, 0], twoColors = [[0, 0, 0, 0], [0, 0, 0, 0]];
		var uScreenSize = [1, 1];
		var coeff = 1.0, coeff2 = coeff + 1.0, a = [0, 0], b = [a, a, a];

		function main () {
			fColor = color;
			var position = [coeff * uv[0], coeff * -uv[1]];
			position[0] *= uScreenSize[1] / uScreenSize[0];
			xy = [xy[0] * uv[1], xy[1] * uv[0]];
			gl_Position = [position[1] / 2.0, position[0] / 2.0, 0, 1];
			gl_FragColor[0] = gl_FragCoord[0] / 4;
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
		};`;

	var shortResult = `
		var uv = attributes['uv'], xy = attributes['xy'];
		var color = attributes['color'];
		var fColor = varying['fColor'], twoColors = varying['twoColors'];
		var uScreenSize = uniforms['uScreenSize'];
		var coeff = 1.0, coeff2 = coeff + 1.0, a = [0, 0], b = [a, a, a];

		function main () {
			fColor = color;
			var position = [coeff * uv[0], coeff * -uv[1]];
			position[0] *= uScreenSize[1] / uScreenSize[0];
			xy = [xy[0] * uv[1], xy[1] * uv[0]];
			gl_Position = [position[1] / 2.0, position[0] / 2.0, 0, 1];
			gl_FragColor[0] = gl_FragCoord[0] / 4;
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
		assert.equal(clean(compile(source)).split('\n')[7], clean(result).split('\n')[7]);
		// assert.equal(clean(compile(source)), clean(result));
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

	test('Detect attributes, uniforms, varying', function () {
		var compiler = new GLSL({
			attribute: function (name) { return `attributes['${name}']`;},
			uniform: function (name) { return `uniforms['${name}']`;},
			varying: function (name) { return `varying['${name}']`;}
		}).compiler;

		var result = compiler.compile(source);

		// assert.equal(clean(result).split('\n')[5], clean(shortResult).split('\n')[5]);
		assert.equal(clean(result), clean(shortResult));

		assert.deepEqual(Object.keys(compiler.attributes), ['uv', 'xy', 'color']);

		assert.deepEqual(Object.keys(compiler.varyings), ['fColor', 'twoColors']);

		assert.deepEqual(Object.keys(compiler.uniforms), ['uScreenSize']);
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
		// compare(compile('void main() {}'), BOILERPLATE);
	});
});


test('primitive variable declarations', function() {
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


test('primitive variable initializers', function() {
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
	var compile = GLSL();

	test('Nested', function () {
		var src = `
		struct photon {
			vec3 direction;
		};

		struct light {
			photon photon;
			float intensity, range;
			vec3 position;
		};

		light lightVar = light(photon(vec3(0, 1, 1)), 3.0, 5.0, vec3(1.0, 2.0, 3.0));
		lightVar;
		`;

		assert.deepEqual(eval(src, {debug: false}), {
			intensity: 3.0,
			range: 5.0,
			position: [1.0, 2.0, 3.0],
			photon: {
				direction: [0, 1, 1]
			}
		});
	});

	test('Anonymous', function () {
		var src = `
		struct photon {
			vec3 direction;
		} x;
		`;

		assert.equal(clean(compile(src)), clean(`
			var x = {
				direction: [0, 0, 0]
			};`));
	});
});


test('Components access', function () {
	var compile = GLSL();

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

		assert.equal(clean(compile(src)), clean(res));
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
		var b = [[0, 0, 0, 0], [0, 0, 0, 0]];
		var c = [b, b, b];
		var d = [c, c, c, c];
		`;

		assert.equal(clean(compile(src)), clean(res));
	});

	test('Calculated access', function () {
		assert.equal(clean(compile(`
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
	});


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

});


test('Vec/matrix operators', function () {
	test('vec + number', function () {
		var src = `
			vec3 v = vec3(1,2,3), u = vec3(4,5,6);
			float f = 0.0;
			v = u + f + v;
		`;

		assert.equal(clean(GLSL().compile(src)), clean(`
			var v = [1, 2, 3], u = [4, 5, 6];
			var f = 0.0;
			v = [u[0] + f + v[0], u[1] + f + v[1], u[2] + f + v[2]];
		`));
		assert.deepEqual(eval(src, {debug: false}), [5, 7, 9]);
		assert.deepEqual(eval(src, {optimize: false, debug: false}), [5, 7, 9]);
	});

	test('mat + mat', function () {
		var src2 = `
			mat2 v = mat2(1,2,3,4), u = mat2(5,6,7,8);
			float f = 1.0;
			v += f + u;
		`;

		assert.deepEqual(eval(src2, {optimize: true, debug: false}), [7,9,11,13]);
		assert.deepEqual(eval(src2, {optimize: false, debug: false}), [7,9,11,13]);
	});

	test('vec + vec', function () {
		var src = `
			vec3 v = vec4(mat2x2(1)).xxz, u = vec3(2), w;
			w = v + u;
		`;

		assert.deepEqual(eval(src, {debug: false}), [3, 3, 2]);
		assert.deepEqual(eval(src, {debug: false, optimize: false}), [3, 3, 2]);
	});

	test('vec * mat', function () {
		var src = `
			vec3 v = vec3(2, 2, 1), u;
			mat3 m = mat3(2);
			u = v * m;
		`;

		assert.deepEqual(eval(src, {debug: false}), [4, 4, 2]);
		assert.deepEqual(eval(src, {debug: false, optimize: false}), [4, 4, 2]);
	});

	test('mat * vec', function () {
		var src = `
			vec3 v = vec3(2, 2, 1), u;
			mat3 m = mat3(2);
			u = m * v;
		`;
		assert.deepEqual(eval(src, {debug: false}), [4, 4, 2]);
		assert.deepEqual(eval(src, {debug: false, optimize: false}), [4, 4, 2]);
	});

	test('mat * vec + vec', function () {
		var src = `
			vec2 v = vec2(2, 1), u;
			mat2 m = mat2(2);
			u = m * v + v;
		`;
		assert.deepEqual(eval(src, {debug: false}), [6, 3]);
		assert.deepEqual(eval(src, {debug: false, optimize: false}), [6, 3]);
	});


	test('mat * mat', function () {
		var src = `
			mat3 m = mat3(1), n = mat3(2), r;
			r = m * n;
		`;

		assert.deepEqual(eval(src, {debug: false}), [2, 0, 0, 0, 2, 0, 0, 0, 2]);
		assert.deepEqual(eval(src, {debug: false, optimize: false}), [2, 0, 0, 0, 2, 0, 0, 0, 2]);
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

	test(`mat * mat * mat`, function () {
		var compile = GLSL({includes: false});

		assert.equal(clean(compile(`
		mat2 a, b, c;
		gl_Position = a * b * c;
		`)), clean(`
		var a = [1, 0, 0, 1], b = [1, 0, 0, 1], c = [1, 0, 0, 1];
		gl_Position = [(a[0] * b[0] + a[2] * b[1]) * c[0] + (a[0] * b[2] + a[2] * b[3]) * c[1], (a[1] * b[0] + a[3] * b[1]) * c[0] + (a[1] * b[2] + a[3] * b[3]) * c[1], (a[0] * b[0] + a[2] * b[1]) * c[2] + (a[0] * b[2] + a[2] * b[3]) * c[3], (a[1] * b[0] + a[3] * b[1]) * c[2] + (a[1] * b[2] + a[3] * b[3]) * c[3]];
		`))
	})
});


test('Swizzles', function () {
	test(`p.z;`, function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			p[2];
		`))
	})
	test(`p().z;`, function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			p()[2];
		`))
	})
	test(`p.zw;`, function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			[2, 3].map(function (x, i) { return this[x]}, p);
		`))
	})
	test(`p().zw;`, function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			[2, 3].map(function (x, i) { return this[x]}, p());
		`))
	})
	test(`float x = vec2(1, 2).x;`, function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			var x = 1;
		`))
	})
	test(`float x = vec2(1, 2).xy;`, function () {
		var compile = GLSL();

		assert.equal(clean(compile(this.title)), clean(`
			var x = [1, 2];
		`))
	})

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

test('Functions', function () {
	test.skip('Arguments', function () {
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

	test('Override', function () {
		//as far functions are hoisted, we can not care really much about
		var src = `
		// vec4 f(in vec4 x);
		// vec4 f(in ivec4 x);
		// vec4 f(in dvec4 x);
		vec4 f(in float x);
		vec4 f(in float x, in float y);

		vec4 f(in float x) {
			return vec4(x);
		}

		vec4 f(in float x, in float y) {
			return vec4(x, x, y, y);
		}
		`;

		var res = `
		function f (x) {
			return [x, x, x, x];
		};
		function f_float_float (x, y) {
			return [x, x, y, y];
		};
		`;

		assert.equal(clean(compile(src)), clean(res));
	});


	test('Arguments matching', function () {
		assert.deepEqual(eval(`
			float f (float x) {
				return 1.0;
			}

			int f (int x) {
				return 2;
			}

			int f (int x, float y) {
				return 3;
			}

			double f (double x) {
				return 4.0;
			}

			vec2 f (float x, float y) {
				return vec2(5, 5);
			}

			ivec2 f (int x, int y) {
				return ivec2(6, 6);
			}

			dvec2 f (double x, double y) {
				return ivec2(7, 7);
			}

			ivec2 f (ivec2 x) {
				return ivec2(8, 8);
			}

			vec2 f (vec2 x) {
				return vec2(9, 9);
			}


			void main (void) {
				double dx;
				mat3 res = mat3(f(1.0), f(1), f(1, 2.0), f(dx), f(1.0, 2.0)[0], f(1, 2)[0], f(dx, dx)[0], f(ivec2(1))[1], f(vec2(1))[1]);
				return res;
			};

			main();
		`, {debug: false}), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});
});

test.skip('Builtins', function () {
	// `
	// if (intensity < 0.0)
	//  discard;
	// `
	// `
	// // In the vertex language, the built-ins are intrinsically declared as:
	// in int gl_VertexID;
	// in int gl_InstanceID;
	// out gl_PerVertex {
	//  vec4 gl_Position;
	//  float gl_PointSize;
	//  float gl_ClipDistance[];
	// };


	// // In the geometry language, the built-in variables are intrinsically declared as:
	// in gl_PerVertex {
	//  vec4 gl_Position;
	//  float gl_PointSize;
	//  float gl_ClipDistance[];
	// } gl_in[];
	// in int gl_PrimitiveIDIn;
	// in int gl_InvocationID;
	// out gl_PerVertex {
	//  vec4 gl_Position;
	//  float gl_PointSize;
	//  float gl_ClipDistance[];
	// };
	// out int gl_PrimitiveID;
	// out int gl_Layer;
	// out int gl_ViewportIndex;


	// // In the fragment language, built-in variables are intrinsically declared as:
	// in vec4 gl_FragCoord;
	// in bool gl_FrontFacing;
	// in float gl_ClipDistance[];
	// in vec2 gl_PointCoord;
	// in int gl_PrimitiveID;
	// in int gl_SampleID;
	// in vec2 gl_SamplePosition;
	// in int gl_SampleMaskIn[];
	// in int gl_Layer;
	// in int gl_ViewportIndex;
	// out float gl_FragDepth;
	// out int gl_SampleMask[];


	// //
	// // Implementation-dependent constants. The example values below
	// // are the minimum values allowed for these maximums.
	// //
	// const ivec3 gl_MaxComputeWorkGroupCount = { 65535, 65535, 65535 };
	// const ivec3 gl_MaxComputeWorkGroupSize = { 1024, 1024, 64 };
	// const int gl_MaxComputeUniformComponents = 1024;
	// const int gl_MaxComputeTextureImageUnits = 16;
	// const int gl_MaxComputeImageUniforms = 8;
	// const int gl_MaxComputeAtomicCounters = 8;
	// const int gl_MaxComputeAtomicCounterBuffers = 8;
	// const int gl_MaxVertexAttribs = 16;
	// const int gl_MaxVertexUniformComponents = 1024;
	// const int gl_MaxVaryingComponents = 60;
	// const int gl_MaxVertexOutputComponents = 64;
	// const int gl_MaxGeometryInputComponents = 64;
	// const int gl_MaxGeometryOutputComponents = 128;
	// const int gl_MaxFragmentInputComponents = 128;
	// const int gl_MaxVertexTextureImageUnits = 16;
	// const int gl_MaxCombinedTextureImageUnits = 96;
	// const int gl_MaxTextureImageUnits = 16;
	// const int gl_MaxImageUnits = 8;
	// const int gl_MaxCombinedImageUnitsAndFragmentOutputs = 8; // deprecated
	// const int gl_MaxCombinedShaderOutputResources = 8;
	// const int gl_MaxImageSamples = 0;
	// const int gl_MaxVertexImageUniforms = 0;
	// const int gl_MaxTessControlImageUniforms = 0;
	// const int gl_MaxTessEvaluationImageUniforms = 0;
	// const int gl_MaxGeometryImageUniforms = 0;
	// const int gl_MaxFragmentImageUniforms = 8;
	// const int gl_MaxCombinedImageUniforms = 8;
	// const int gl_MaxFragmentUniformComponents = 1024;
	// const int gl_MaxDrawBuffers = 8;
	// const int gl_MaxClipDistances = 8;
	// const int gl_MaxGeometryTextureImageUnits = 16;
	// const int gl_MaxGeometryOutputVertices = 256;
	// const int gl_MaxGeometryTotalOutputComponents = 1024;
	// const int gl_MaxGeometryUniformComponents = 1024;
	// const int gl_MaxGeometryVaryingComponents = 64; // deprecated
	// const int gl_MaxTessControlInputComponents = 128;
	// const int gl_MaxTessControlOutputComponents = 128;
	// const int gl_MaxTessControlTextureImageUnits = 16;
	// const int gl_MaxTessControlUniformComponents = 1024;
	// const int gl_MaxTessControlTotalOutputComponents = 4096;
	// const int gl_MaxTessEvaluationInputComponents = 128;
	// const int gl_MaxTessEvaluationOutputComponents = 128;
	// const int gl_MaxTessEvaluationTextureImageUnits = 16;
	// const int gl_MaxTessEvaluationUniformComponents = 1024;
	// const int gl_MaxTessPatchComponents = 120;
	// const int gl_MaxPatchVertices = 32;
	// const int gl_MaxTessGenLevel = 64;
	// const int gl_MaxViewports = 16;
	// const int gl_MaxVertexUniformVectors = 256;
	// const int gl_MaxFragmentUniformVectors = 256;
	// const int gl_MaxVaryingVectors = 15;
	// const int gl_MaxVertexAtomicCounters = 0;
	// const int gl_MaxTessControlAtomicCounters = 0;
	// const int gl_MaxTessEvaluationAtomicCounters = 0;
	// const int gl_MaxGeometryAtomicCounters = 0;
	// const int gl_MaxFragmentAtomicCounters = 8;
	// const int gl_MaxCombinedAtomicCounters = 8;
	// const int gl_MaxAtomicCounterBindings = 1;
	// const int gl_MaxVertexAtomicCounterBuffers = 0;
	// const int gl_MaxTessControlAtomicCounterBuffers = 0;
	// const int gl_MaxTessEvaluationAtomicCounterBuffers = 0;
	// const int gl_MaxGeometryAtomicCounterBuffers = 0;
	// const int gl_MaxFragmentAtomicCounterBuffers = 1;
	// const int gl_MaxCombinedAtomicCounterBuffers = 1;
	// const int gl_MaxAtomicCounterBufferSize = 32;
	// const int gl_MinProgramTexelOffset = -8;
	// const int gl_MaxProgramTexelOffset = 7;
	// const int gl_MaxTransformFeedbackBuffers = 4;
	// const int gl_MaxTransformFeedbackInterleavedComponents = 64;
	// `
});


//array opertators
//  field selector .
// equality == !=
// assignment =
// indexing (arrays only) [ ]

test('Preprocessor', function () {
	test('Transform macro to commented', function () {
		assert.equal(clean(compile(`
			#extension A
		`)), clean(`
			/* #extension A */
		`));
	});

	test('Object macros', function () {
		assert.equal(clean(compile(`
			#define QUATRE FOUR
			#define FOUR 4
			int x = QUATRE;
			#undef FOUR
			int y = QUATRE;
			#define FOUR 16
			int z = QUATRE;
		`)), clean(`
			var x = 4;
			var y = FOUR;
			var z = 16;
		`));
	});

	test('Function macros', function () {
		assert.equal(clean(compile(`
			#define lang_init()  c_init()
			int x = lang_init();
			int y = lang_init;
			#undef lang_init
			int z = lang_init();
		`)), clean(`
			var x = c_init();
			var y = lang_init;
			var z = lang_init();
		`));
	});

	test('Macro arguments', function () {
		assert.equal(clean(compile(`
			#define min(X, Y)  ((X) < (Y) ? (X) : (Y))
			x = min(a, b);
			y = min(1, 2);
			z = min(a + 28, p);
			min (min (a, b), c);
		`)), clean(`
			x = ((a) < (b) ? (a) : (b));
			y = ((1) < (2) ? (1) : (2));
			z = ((a + 28) < (p) ? (a + 28) : (p));
			((((a) < (b) ? (a) : (b))) < (c) ? (((a) < (b) ? (a) : (b))) : (c));
		`));
	});
});



//include other tests
require('./stdlib');
