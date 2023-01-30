import test from 'tape'
import GLSL, {compile} from '../index.js'
import evaluate from './util/eval.js'
import clean from 'cln'


test.skip('Arguments', function (t) {
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

	t.equal(clean(compile(src)), clean(res));
	t.end()
})
test('Override', function (t) {
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

	t.equal(clean(compile(src)), clean(res));
	t.end()
})
test('Arguments matching', function (t) {
	t.deepEqual(evaluate(`
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
	t.end()
})
test('should generate asm.js boilerplate', function(t) {
	// compare(compile('void main() {}'), BOILERPLATE);
	t.end()
})

// argument qualifiers
test('Clone inputs', function (t) {
	var compile = GLSL();

	var source = `
		void f(float a, vec3 b, mat4 c) {
			b.x = 1.0;
		}`;

	t.equal(clean(compile(source)), clean(`
		function f (a, b, c) {
			b = b.slice();
			c = c.slice();
			b[0] = 1.0;
		};
	`))
	t.end()
})
test('Output without return statements', function (t) {
	var compile = GLSL();

	var source = `
		void f(float a, out float b) {
			b = 1.0;
		}`;

	t.equal(clean(compile(source)), clean(`
		function f (a, b) {
			b = 1.0;
			f.__out__ = [b];
		};
	`))
	t.end()
})
test('Output with return statements', function (t) {
	var compile = GLSL();

	var source = `
		void f(float a, out float b) {
			if (a < 0.0) {
				b = -1.0;
				return;
			}
			b = 1.0;
		}`;

	t.equal(clean(compile(source)), clean(`
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
	t.end()
})
test('Multiple outputs', function (t) {
	var compile = GLSL();

	var source = `
		float f(out float a, out vec2 b, inout vec2 c) {
			a = 0.1;
			b = vec2(2.0);
			c = b;
			return 0.0;
		}`;

	t.equal(clean(compile(source)), clean(`
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
	t.end()
})
test('Calling function with output arguments', function (t) {
	var compile = GLSL();

	var source = `
		float f(float a, out float b, out float c) {
			b = 1.0;
			c = 2.0;
			return a + 1.0;
		}
		float x = 0.1;
		float y;
		float z;
		x = f(x, y, z);
		gl_Position = vec4(x, y, z, 1.0);
	`;

	t.equal(clean(compile(source)), clean(`
		function f (a, b, c) {
			b = 1.0;
			c = 2.0;
			f.__return__ = a + 1.0;
			f.__out__ = [b, c];
			return f.__return__;
		};
		var x = 0.1;
		var y = 0;
		var z = 0;
		x = (f(x, y, z), [y, z] = f.__out__, f.__return__);
		gl_Position = [x, y, z, 1];
	`))

	t.deepEqual(evaluate(source, {debug: false}), [1.1, 1, 2, 1]);
	t.end()
})

// recursive calling
test('Calling nested functions with output arguments', function (t) {
	var compile = GLSL();

	var source = `
		float f1(float a, out float b) {
			b = 1.0;
			return a + 1.0;
		}
		float f2(float a, out float b) {
			return f1(a, b) + 1.0;
		}
		float x = 0.1;
		float y;
		x = f2(x, y);
		gl_Position = vec4(x, y, 0.0, 1.0);
	`;

	t.equal(clean(compile(source)), clean(`
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
		var x = 0.1;
		var y = 0;
		x = (f2(x, y), [y] = f2.__out__, f2.__return__);
		gl_Position = [x, y, 0, 1];
	`))

	t.deepEqual(evaluate(source, {debug: false}), [2.1, 1, 0, 1]);
	t.end()
})
