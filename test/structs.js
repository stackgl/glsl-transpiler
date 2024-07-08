import GLSL from '../index.js'
import test from 'tape'
import evaluate from './util/eval.js'
import clean from './util/clean.js'

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

	t.deepEqual(evaluate(src, { debug: false }), {
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
			direction: new Float32Array([0, 0, 0])
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
