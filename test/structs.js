var tokenize = require('glsl-tokenizer/string')
var parse = require('glsl-parser/direct')
var GLSL = require('../')
var compile = GLSL.compile
var TokenStream = require('glsl-tokenizer/stream')
var ParseStream = require('glsl-parser/stream')
var CompileStream = require('../stream')
var test = require('tape')
var StringStream = require('stream-array')
var Sink = require('stream').Writable
var eval = require('./util/eval')
var clean = require('cln')
var glsl = require('glslify')

var compile = GLSL({})


test('Nested', function (t) {
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

	t.deepEqual(eval(src, {debug: false}), {
		intensity: 3.0,
		range: 5.0,
		position: [1.0, 2.0, 3.0],
		photon: {
			direction: [0, 1, 1]
		}
	});

	t.end()
});

test('Anonymous', function (t) {
	var src = `
	struct photon {
		vec3 direction;
	} x;
	`;

	t.equal(clean(compile(src)), clean(`
		var x = {
			direction: [0, 0, 0]
		};`));

	t.end()
});

// FIXME
test.skip('Quantifier', function (t) {
	t.equal(
		clean(compile(`struct Samples { sampler2D data[2]; };`)),
		clean(`
		var Samples = {
			direction: [0, 0, 0]
		};`)
	);

	t.end()
})
