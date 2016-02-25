var test = require('tst');
var inherits = require('inherits');


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


test.only('TypedArray vs wrapped array', function () {
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



	test.only('Access', function () {
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
	});


	test('Creation', function () {
		var max = 10e4;

		test('Float32Array', function () {
			for (var i = 0; i < max; i++) {
				var vec = new Float32Array([0, 1]);
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
	});
});