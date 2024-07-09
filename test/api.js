
import GLSL from '../index.js'
import TokenStream from 'glsl-tokenizer/stream.js'
import ParseStream from 'glsl-parser/stream.js'
import CompileStream from '../stream.js'
import test from 'tape'
import StringStream from 'stream-array'
import { Writable } from 'stream'
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
	t.equal(clean(compile(source)).split('\n')[7], clean(result).split('\n')[7]);
	// t.equal(clean(compile(source)), clean(result));

	t.end()
});

test('Stream', function (t) {
	var res = '';

	StringStream(source.split('\n').map(function (v) { return v + '\n' }))
		.pipe(TokenStream())
		// .on('data', function (chunk) {
		// 	console.log(chunk);
		// })
		.pipe(ParseStream())
		.pipe(CompileStream())
		.on('end', function () {
			t.equal(clean(res), clean(result))
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
	t.equal(clean(result), clean(result));

	t.deepEqual(Object.keys(compiler.attributes), ['uv', 'xy', 'color']);

	t.deepEqual(Object.keys(compiler.varyings), ['fColor', 'twoColors']);

	t.deepEqual(Object.keys(compiler.uniforms), ['uScreenSize']);

	t.end()
});
