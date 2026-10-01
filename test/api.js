
import GLSL from '../index.js'
import CompileStream from '../stream.js'
import test from 'tape'
import { Readable, Writable } from 'node:stream'
import clean from './util/clean.js'

var compile = GLSL({})

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

		bool foo = true;
		bool bar = !foo == false && ~foo || foo;
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
	var uv = new Float32Array([0, 0]), xy = new Float32Array([1, 1]);
	var color = new Float32Array([0, 0, 0, 0]);
	var fColor = new Float32Array([0, 0, 0, 0]), twoColors = [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])];
	var uScreenSize = new Float32Array([1, 1]);
	var coeff = 1.0, coeff2 = coeff + 1.0, a = [0, 0], b = [a, a, a];

	function main () {
		(fColor[0] = color[0], fColor[1] = color[1], fColor[2] = color[2], fColor[3] = color[3], fColor);
		var position = new Float32Array([coeff * uv[0], coeff * -uv[1]]);
		position[0] *= uScreenSize[1] / uScreenSize[0];
		xy = new Float32Array([xy[0] * uv[1], xy[1] * uv[0]]);
		(gl_Position[0] = position[1] / 2.0, gl_Position[1] = position[0] / 2.0, gl_Position[2] = 0, gl_Position[3] = 1, gl_Position);
		gl_FragColor[0] = gl_FragCoord[0] / 4;
		var foo = true;
		var bar = (!foo == false) && (~foo || foo);
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

test('Direct', function (t) {
	const run = new Function('gl_FragCoord', compile(source) + '\nlet gl_Position, gl_FragColor = new Float32Array(4); main(); return Array.from(gl_Position);');
	t.deepEqual(run([4,0,0,0]), [-0,0,0,1]);
	// t.equal(clean(compile(source)), clean(result));

	t.end()
});

test('Stream', function (t) {
	var res = '';

	Readable.from(source.split('\n').map(function (v) { return v + '\n' }))

		.pipe(CompileStream())
		.on('end', function () {
			t.equal(clean(res), clean(compile(source)))
			t.end();
		})

		//to release data
		.pipe(Writable({
			objectMode: true,
			write: function (data, enc, cb) {
				res += data + '\n';
				cb();
			}
		}))
});

test('Detect attributes, uniforms, varying', function (t) {
	var compiler = new GLSL({
		attribute: function (name) { return `attributes['${name}']`; },
		uniform: function (name) { return `uniforms['${name}']`; },
		varying: function (name) { return `varying['${name}']`; }
	}).compiler;

	var result = compiler.compile(source);

	// t.equal(clean(result).split('\n')[5], clean(shortResult).split('\n')[5]);
	t.ok(result.includes("attributes['uv']"));
	t.ok(result.includes("uniforms['uScreenSize']"));
	t.ok(result.includes("varying['fColor']"));

	t.deepEqual(Object.keys(compiler.attributes), ['uv', 'xy', 'color']);

	t.deepEqual(Object.keys(compiler.varyings), ['fColor', 'twoColors']);

	t.deepEqual(Object.keys(compiler.uniforms), ['uScreenSize']);

	t.end()
});
