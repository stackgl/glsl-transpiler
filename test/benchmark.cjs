var test = require('tst');
var inherits = require('inherits');
var lib = require('../lib/stdlib.cjs');
var glMat = require('gl-matrix');
var ndarray = require('ndarray');


test('TypedArray vs inherited array', function () {
	//task: should we inherit native array?
	//results: we should not really - it is slower and unreliable. Better wrap the array.

	function vec2 (x, y) {
		if (!(this instanceof vec2)) return new vec2(x, y);

		Float32Array.call(this, 2);

		this[0] = x;
		this[1] = y;
	};
	inherits(vec2, Float32Array);


	var max = 10e4;

	test('Inherited array', function () {
		for (var i = 0; i < max; i++) {
			new vec2(i, i);
		}
	});

	test('Float32Array', function () {
		for (var i = 0; i < max; i++) {
			new Float32Array([i, i]);
		}
	});
});


test('TypedArray vs wrapped array', function () {
	//Test setup: how much the wrapper access is slower than array?
	//Result: unfortunately, growth is exponential or even worse, if to provide class wrappers with inner data as array.
	//but defining custom methods on array instances in constructor is quite alright, even faster sometimes. We can easily do swizzles.
	//though that makes constructors amazingly slow.
	//the best solution: own data types. It is the fastest and provides flexy methods. Probably due to some optimizations. Do not use native arrays.
	//also we need to provide wrappers for each literals.

	function vec2prototype (x, y) {
		if (!(this instanceof vec2prototype)) return new vec2prototype(x, y);
		this.data = [x, y];
	};

	Object.defineProperties(vec2prototype.prototype, {
		0: {
			get: function () {
				return this.data[0];
			},
			set: function (v) {
				this.data[0] = v;
			}
		},
		1: {
			get: function () {
				return this.data[1];
			},
			set: function (v) {
				this.data[1] = v;
			}
		}
	});

	function vec2constructor (x, y) {
		if (!(this instanceof vec2constructor)) return new vec2constructor(x, y);
		this.data = [x, y];

		Object.defineProperties(this, {
			0: {
				get: function () {
					return this.data[0];
				},
				set: function (v) {
					this.data[0] = v;
				}
			},
			1: {
				get: function () {
					return this.data[1];
				},
				set: function (v) {
					this.data[1] = v;
				}
			}
		});
	};

	function arrayExtended (arg) {
		var result = arg;

		Object.defineProperties(result, {
			x: {
				get: function () {
					return this[0];
				},
				set: function (v) {
					this[0] = v;
				}
			},
			y: {
				get: function () {
					return this[1];
				},
				set: function (v) {
					this[1] = v;
				}
			}
		});

		return result;
	}

	function nonArray (arg) {
		if (!(this instanceof nonArray)) return new nonArray(arg);

		this.r = arg[0];
		this[0] = arg[0];
		this.g = arg[1];
		this[1] = arg[1];
	}

	Object.defineProperties(nonArray.prototype, {
		x: {
			get: function () {
				return this.r;
			},
			set: function (v) {
				this.r = v;
			}
		},
		y: {
			get: function () {
				return this.g;
			},
			set: function (v) {
				this.g = v;
			}
		}
	});

	function protoVec (x, y) {
		this[0] = x;
		this[1] = y;
	}
	inherits(protoVec, Array);
	Object.defineProperties(protoVec.prototype, {
		x: {
			get: function () {
				return this[0];
			},
			set: function (value) {
				this[0] = value;
			}
		},
		y: {
			get: function () {
				return this[1];
			},
			set: function (value) {
				this[1] = value;
			}
		}
	});
	function descVec (x, y) {
		protoVec.call(this, x, y);
	}
	inherits(descVec, protoVec);
	// descVec.prototype = Object.create(protoVec.prototype);


	//swizzle getter
	function $(target, num) {
		return [target[num]];
	}

	test('Access', function () {
		var max = 10e5;

		test('non-array', function () {
			var vec = nonArray([0,1]);
			for (var i = 0; i < max; i++) {
				vec.x;
				vec.y;
			}
		});

		test('Float32Array', function () {
			var vec = new Float32Array([0, 1]);
			for (var i = 0; i < max; i++) {
				vec[0];
				vec[1];
			}
		});

		test('Prototype vector', function () {
			var vec = vec2prototype(0,1);
			for (var i = 0; i < max; i++) {
				vec[0];
				vec[1];
			}
		});

		test('Constructor vector', function () {
			var vec = vec2constructor(0,1);
			for (var i = 0; i < max; i++) {
				vec[0];
				vec[1];
			}
		});

		test('Extended array', function () {
			var vec = arrayExtended([0,1]);
			for (var i = 0; i < max; i++) {
				vec.x;
				vec.y;
			}
		});

		test('Prototype vector', function () {
			var vec = new descVec(1,2);
			for (var i = 0; i < max; i++) {
				vec.x;
				vec.y;
			}
		});

		test('stdlib.vec2', function () {
			var vec = lib.vec2(0,1);
			// var max = 1;
			for (var i = 0; i < max; i++) {
				vec.x;
				vec.y;
			}
		});

		test('swizzle getter', function () {
			var vec = glMat.vec2.create(0, 1);
			for (var i = 0; i < max; i++) {
				$(vec, 1);
				$(vec, 0);
			}
		});

		test('gl-matrix vec2', function () {
			var vec = glMat.vec2.create(0, 1);
			for (var i = 0; i < max; i++) {
				vec[0];
				vec[1];
			}
		});
	});


	test('Creation', function () {
		var max = 10e4;

		test('Float32Array', function () {
			for (var i = 0; i < max; i++) {
				var vec = new Float32Array([0, 1]);
			}
		});

		test('Array', function () {
			for (var i = 0; i < max; i++) {
				var vec = [0, 1];
			}
		});

		test('Prototype vector', function () {
			for (var i = 0; i < max; i++) {
				var vec = vec2prototype(0,1);
			}
		});

		test('Constructor vector', function () {
			for (var i = 0; i < max; i++) {
				var vec = vec2constructor(0,1);
			}
		});

		test('Extended array', function () {
			for (var i = 0; i < max; i++) {
				var vec = arrayExtended([0,1]);
			}
		});

		test('non-array', function () {
			for (var i = 0; i < max; i++) {
				var vec = nonArray([0,1]);
			}
		});

		test('stdlib.vec2', function () {
			for (var i = 0; i < max; i++) {
				var vec = lib.vec2(0,1);
			}
		});

		test('gl-matrix vec2', function () {
			var vec2 = glMat.vec2.fromValues;
			for (var i = 0; i < max; i++) {
				var vec = vec2(0, 1);
			}
		});

		test('ndarray', function () {
			for (var i = 0; i < max; i++) {
				var vec = ndarray([0,1]);
			}
		});
	});
});


test('multiplication', function () {
	//task: determine which way of multiplying things is the best
	//for the formula v1.yxzw *= v2.xyzw + fn(coef);
	//result: plain array is the fastest, after (10% slower) - Float32Array, then - gl-matrix.
	//also for operations on multiple objects we have to do precalculations like let _precalc = ...
	//but function calls is not that bad actually, like 5% slower than pure code
	//but we cannot really polyfill functions, as it causes creation of them each time within call, which is bad. We should pass a lib of ready functions, like gl-matrix...
	//seems that we have to use gl-matrix and compile everything to most optimally use that.

	function fn(c) {
		for (var i = 0; i < 100; i++) {
			c = c*c + 1;
		}
		return c;
	}

	var max = 5e5;
	test('gl-matrix', function () {
		var vec4 = glMat.vec4;
		var v1 = vec4.fromValues(1,2.2,3,4);
		var v2 = vec4.fromValues(1,2,3,4);
		var mult = vec4.multiply;
		var add = vec4.add;
		var c = 1.2;

		function create(x,y,z,w){
			if (y == null) y = x;
			if (z == null) z = y;
			if (w == null) w = z;
			return [x,y,z,w];
		}
		glMat.vec4 = create;

		for (var i = 0; i < max; i++) {
			//v1.yxzw = v1.yxzw * (v2.xyzw + fn(coef))
			mult(v1, [v1[1],v1[0],v1[2],v1[3]], add(v2, v2, glMat.vec4(fn(c))));
		}
	});

	test('plain Float32Arrays', function () {
		var v1 = new Float32Array([1,2.2,3,4]);
		var v2 = new Float32Array([1,2,3,4]);
		var c = 1.2;
		for (var i = 0; i < max; i++) {
			let v1yxzw = new Float32Array([v1[1],v1[0],v1[2],v1[3]]);
			let v2xyzw = new Float32Array([v2[0],v2[1],v2[2],v2[3]]);
			v2[0] = (v1yxzw[0] + fn(c)) * v2xyzw[0];
			v2[1] = (v1yxzw[1] + fn(c)) * v2xyzw[1];
			v2[2] = (v1yxzw[2] + fn(c)) * v2xyzw[2];
			v2[3] = (v1yxzw[3] + fn(c)) * v2xyzw[3];
		}
	});

	test('plain arrays', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		for (var i = 0; i < max; i++) {
			let v1yxzw = [v1[1],v1[0],v1[2],v1[3]];
			let v2xyzw = [v2[0],v2[1],v2[2],v2[3]];
			v2[0] = (v1yxzw[0] + fn(c)) * v2xyzw[0];
			v2[1] = (v1yxzw[1] + fn(c)) * v2xyzw[1];
			v2[2] = (v1yxzw[2] + fn(c)) * v2xyzw[2];
			v2[3] = (v1yxzw[3] + fn(c)) * v2xyzw[3];
		}
	});

	test('plain array repeated', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		for (var i = 0; i < max; i++) {
			v2[0] *= v1[1] + fn(c);
			v2[1] *= v1[0] + fn(c);
			v2[2] *= v1[2] + fn(c);
			v2[3] *= v1[3] + fn(c);
		}
	});

	test('plain array optimized', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		for (var i = 0; i < max; i++) {
			var coefPow5 = fn(c);
			v2[0] *= v1[1] + coefPow5;
			v2[1] *= v1[0] + coefPow5;
			v2[2] *= v1[2] + coefPow5;
			v2[3] *= v1[3] + coefPow5;
		}
	});

	test('Float32Array optimized', function () {
		var v1 = new Float32Array([1,2.2,3,4]);
		var v2 = new Float32Array([1,2,3,4]);
		var c = 1.2;
		for (var i = 0; i < max; i++) {
			let coefPow5 = fn(c);
			v2[0] *= v1[1] + coefPow5;
			v2[1] *= v1[0] + coefPow5;
			v2[2] *= v1[2] + coefPow5;
			v2[3] *= v1[3] + coefPow5;
		}
	});

	test('functions', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		function mult (out, v1, v2) {
			out[0] = v2[0] * v1[0];
			out[1] = v2[1] * v1[1];
			out[2] = v2[2] * v1[2];
			out[3] = v2[3] * v1[3];
			return out;
		}
		function add (out, v, c) {
			out[0] = v[0] + c;
			out[1] = v[1] + c;
			out[2] = v[2] + c;
			out[3] = v[3] + c;
			return out;
		}
		for (var i = 0; i < max; i++) {
			mult(v1, add([], [v1[1], v1[0], v1[2], v1[3]], fn(c)), v2);
		}
	});

	test('functions within functions', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		function calc() {
			function mult (out, v1, v2) {
				out[0] = v2[0] * v1[0];
				out[1] = v2[1] * v1[1];
				out[2] = v2[2] * v1[2];
				out[3] = v2[3] * v1[3];
				return out;
			}
			function add (out, v, c) {
				out[0] = v[0] + c;
				out[1] = v[1] + c;
				out[2] = v[2] + c;
				out[3] = v[3] + c;
				return out;
			}
			return mult(v1, add([], [v1[1], v1[0], v1[2], v1[3]], fn(c)), v2);
		}
		for (var i = 0; i < max; i++) {
			calc();
		}
	});

	test('functions as arguments', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		function mult (out, v1, v2) {
			out[0] = v2[0] * v1[0];
			out[1] = v2[1] * v1[1];
			out[2] = v2[2] * v1[2];
			out[3] = v2[3] * v1[3];
			return out;
		}
		function add (out, v, c) {
			out[0] = v[0] + c;
			out[1] = v[1] + c;
			out[2] = v[2] + c;
			out[3] = v[3] + c;
			return out;
		}
		var lib = {mult: mult, add: add};
		function calc(lib) {
			var mult = lib.mult, add = lib.add;
			return mult(v1, add([], [v1[1], v1[0], v1[2], v1[3]], fn(c)), v2);
		}
		for (var i = 0; i < max; i++) {
			calc(lib);
		}
	});

	test('functions evaled', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;
		var mult = new Function('v1', 'v2', `
			v2[0] *= v1[0];
			v2[1] *= v1[1];
			v2[2] *= v1[2];
			v2[3] *= v1[3];
			return v2;
		`);
		var add = new Function('v', 'c', `
			v[0] += c;
			v[1] += c;
			v[2] += c;
			v[3] += c;
			return v;
		`);
		for (var i = 0; i < max; i++) {
			mult(v1, add([v1[1], v1[0], v1[2], v1[3]], fn(c)), v2);
		}
	});

	test('anonymous functions', function () {
		var v1 = [1,2.2,3,4];
		var v2 = [1,2,3,4];
		var c = 1.2;

		for (var i = 0; i < max; i++) {
			var coefPow5 = fn(c);
			(function mult (v1, v2) {
				v2[0] *= v1[0];
				v2[1] *= v1[1];
				v2[2] *= v1[2];
				v2[3] *= v1[3];
				return v2;
			})(v1, (function add (v, c) {
					v[0] += c;
					v[1] += c;
					v[2] += c;
					v[3] += c;
					return v;
				})([v1[1], v1[0], v1[2], v1[3]], coefPow5), v2);
		}
	});
});


test.only('cost of anonymous function', function () {
	//what is component access rate to anonymous function?
	//result: one anonymous fn costs 200 simple sums or 13 map calls

	var max = 10e3;
	var a = [1, 2, 3], b = [1, 2, 3];
	function get(who, what) {
		return who[what];
	}
	test('fn', function () {
		for (var i = 0; i < max; i++) {
			for (var j = 0; j < 1; j++) {
				var x = (function (a, b) {
					return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
				})(a, b);
			}
		}
	});
	test('sum', function () {
		for (var i = 0; i < max; i++) {
			for (var j = 0; j < 200; j++) {
				var x = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
			}
		}
	});
	test('map', function () {
		for (var i = 0; i < max; i++) {
			for (var j = 0; j < 13; j++) {
				var x = a.map(function (x, i) { return x + get(b, i)});
			}
		}
	});
});