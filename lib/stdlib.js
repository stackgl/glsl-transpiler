/**
 * OpenGL/WebGL environment methods.
 *
 * @module  glsl-js/lib/stdlib
 */

var operators = require('./operators').operators;


/**
 * Types stubs
 */
function bool (val) {
	return !!val;
}

function int (val) {
	return val|0;
}

function float (val) {
	return +val;
}

function vec2 (x, y) {
	if (x == null) x = 0;
	if (y == null) y = x;
	return [x, y]
}

function vec3 (x, y, z) {
	if (x == null) x = 0;
	if (y == null) y = x;
	if (z == null) z = y;
	return [x, y, z]
}

function vec4 (x, y, z, w) {
	if (x == null) x = 0;
	if (y == null) y = x;
	if (z == null) z = y;
	if (w == null) w = z;
	return [x, y, z, w]
}

function mat2 (x) {
	if (x == null) x = 1;
	if (x.length === 4) return x;
	if (x.length === 2) return [x[0], 0, 0, x[1]];
	return [x, 0, 0, x]
}

function mat3 (x) {
	if (x == null) x = 1;
	if (x.length === 9) return x;
	if (x.length === 3) return [x[0], 0, 0, 0, x[1], 0, 0, 0, x[2]];
	return [x, 0, 0, 0, x, 0, 0, 0, x]
}

function mat4 (x) {
	if (x == null) x = 1;
	if (x.length === 16) return x;
	if (x.length === 4) return [x[0], 0, 0, 0, 0, x[1], 0, 0, 0, 0, x[2], 0, 0, 0, 0, x[3]];
	return [x, 0, 0, 0, 0, x, 0, 0, 0, 0, x, 0, 0, 0, 0, x]
}


/**
 * Types operations.
 */
createOperations(vec2, 2);
createOperations(vec3, 3);
createOperations(vec4, 4);
createOperations(mat2, 4);

function createOperations(obj, len) {
	for (var operator in operators) {
		var comps = [];
		for (var i = 0; i < len; i++) {
			comps.push(`out[${i}] = a[${i}] ${operator} b[${i}]`);
		}

		obj[operators[operator]] = new Function ('out', 'a', 'b',
			`${comps.join(';\n')}\nreturn out;`
		);
	}
}


/**
 * Math
 */
function radians (degrees) {
	if (degrees.length) return degrees.map(radians);
	return degrees * 0.017453292519943295;
}

function degrees (radians) {
	if (radians.length) return radians.map(degrees);
	return radians * 57.29577951308232;
}

function sin (angle) {
	if (angle.length) return angle.map(sin);
	return Math.sin(angle);
}

function cos (angle) {
	if (angle.length) return angle.map(cos);
	return Math.cos(angle);
}

function tan (angle) {
	if (angle.length) return angle.map(tan);
	return Math.tan(angle);
}

function asin (x) {
	if (x.length) return x.map(asin);
	return Math.asin(x);
}

function acos (x) {
	if (x.length) return x.map(acos);
	return Math.acos(x);
}

function atan (y, x) {
	if (arguments.length > 1) {
		if (y.length) return y.map(function (y, i) {
			return Math.atan2(y, x[i]);
		});

		return Math.atan2(y, x);
	}

	if (y.length) return y.map(function (y, i) {
		return Math.atan(y)
	});

	return Math.atan(y);
}

function pow (x, y) {
	if (x.length) return x.map(function (x, i) {
		return Math.pow(x, y[i]);
	});
	return Math.pow(x, y);
}

function exp (x) {
	if (x.length) return x.map(exp);
	return Math.exp(x);
}

function log (x) {
	if (x.length) return x.map(log);
	return Math.log(x);
}

var log2 = Math.log2 ? function log2 (x) {
		if (x.length) return x.map(log2);
		return Math.log2(x);
	} : function log2 (x) {
		if (x.length) return x.map(log2);
		return Math.log(x) / Math.LN2;
	};

function exp2 (x) {
	if (x.length) return x.map(exp2);
	return Math.pow(2, x);
}

function sqrt (x) {
	if (x.length) return x.map(sqrt);
	return Math.sqrt(x);
}

function inversesqrt (x) {
	if (x.length) return x.map(inversesqrt);
	return 1 / Math.sqrt(x);
}

function abs (x) {
	if (x.length) return x.map(abs);
	return Math.abs(x);
}

function floor (x) {
	if (x.length) return x.map(floor);
	return Math.floor(x);
}

function ceil (x) {
	if (x.length) return x.map(ceil);
	return Math.ceil(x);
}

var sign = Math.sign ? function sign (x) {
	if (x.length) return x.map(sign);
	return Math.sign(x);
} : function sign (x) {
	if (x.length) return x.map(sign);

	x = +x; // convert to a number

	if (x === 0 || isNaN(x)) {
		return x;
	}

	return x > 0 ? 1 : -1;
};

function fract (x) {
	if (x.length) return x.map(fract);
	return x - Math.floor(x);
}

function mod (x, y) {
	if (x.length) {
		if (y.length) return x.map(function (x, i) {
			return x % y[i];
		});
		return x.map(function (x, i) {
			return x % y;
		});
	}
	return x % y;
}

function min (x, y) {
	if (x.length) {
		if (y.length) return x.map(function (x, i) {
			return Math.min(x, y[i]);
		});
		return x.map(function (x, i) {
			return Math.min(x, y);
		});
	}
	return Math.min(x, y);
}

function max (x, y) {
	if (x.length) {
		if (y.length) return x.map(function (x, i) {
			return Math.max(x, y[i]);
		});
		return x.map(function (x, i) {
			return Math.max(x, y);
		});
	}
	return Math.max(x, y);
}

function clamp (x, min, max) {
	if (x.length) {
		if (min.length) return x.map(function (x, i) {
			return Math.min(Math.max(x, min[i]), max[i]);
		});
		return x.map(function (x, i) {
			return Math.min(Math.max(x, min), max);
		});
	}

	return Math.min(Math.max(x, min), max);
}

function mix (x, y, a) {
	if (x.length) {
		if (a.length) return x.map(function (x, i) {
			return mix(x, y[i], a[i]);
		});
		return x.map(function (x, i) {
			return mix(x, y[i], a);
		});
	}

	return x * (1.0 - a) + y * a;
}

function step (edge, x) {
	if (x.length) {
		if (edge.length) return x.map(function (x, i) {
			return step(edge[i], x);
		});
		return x.map(function (x, i) {
			return step(edge, x);
		});
	}

	return x < edge ? 0.0 : 1.0;
}
step.type = function (node) {
	return this.getType(node.children[1]);
}

function smoothstep (edge0, edge1, x) {
	if (x.length) {
		if (edge0.length) return x.map(function (x, i) {
			return smoothstep(edge0[i], edge1[i], x);
		});
		return x.map(function (x, i) {
			return smoothstep(edge0, edge1, x);
		});
	}

	var t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
	return t * t * (3.0 - 2.0 * t);
}

function length (x) {
	var sum = 0;
	for (var i = 0; i < x.length; i++) {
		sum += x[i]*x[i];
	}
	return Math.sqrt(sum);
}
length.type = 'float';

function distance(x, y) {
	var sum = 0;
	for (var i = 0; i < x.length; i++) {
		sum += (x[i]-y[i])*(x[i]-y[i]);
	}
	return Math.sqrt(sum);
}
distance.type = 'float';

function dot (x, y) {
	var sum = 0;
	for (var i = 0; i < x.length; i++) {
		sum += x[i]*y[i];
	}
	return sum;
}
dot.type = 'float';

function cross (x, y) {
	var x0 = x[0], x1 = x[1], x2 = x[2],
	y0 = y[0], y1 = y[1], y2 = y[2];
	var out = [0, 0, 0];
	out[0] = x1 * y2 - x2 * y1;
	out[1] = x2 * y0 - x0 * y2;
	out[2] = x0 * y1 - x1 * y0;
	return out;
}
cross.type = 'vec3';

function normalize (x) {
	var len = 0;
	for (var i = 0; i < x.length; i++) {
		len += x[i]*x[i];
	}

	var out = Array(x.length).fill(0);
	if (len > 0) {
		len = 1 / Math.sqrt(len);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] * len;
		}
	}
	return out;
}

function faceforward (N, I, Nref) {
	if (Nref == null) Nref = N;

	var dot = 0;
	for (var i = 0; i < N.length; i++) {
		dot += Nref[i]*I[i];
	}

	return dot > 0 ? N.map(function (x) { return -x;}) : N;
}

function reflect (I, N) {
	var dot = 0;
	for (var i = 0; i < N.length; i++) {
		dot += N[i]*I[i];
	}

	var out = Array(N.length);
	for (var i = 0; i < N.length; i++) {
		out[i] = I[i] - 2 * dot * N[i];
	}

	return out;
}

function refract (I, N, eta) {
	var dot = 0;
	for (var i = 0; i < N.length; i++) {
		dot += N[i]*I[i];
	}

	var k = 1 - eta*eta*(1 - dot*dot);

	var out = Array(N.length).fill(0);

	if (k > 0) {
		for (var i = 0; i < N.length; i++) {
			out[i] = eta*I[i] - (eta*dot + Math.sqrt(k)) * N[i];
		}
	}

	return out;
}


/**
 * Vector relational functions
 */
function lessThan (x, y) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] < y[i];
		}
		return out;
	}
	return x < y;
}

function lessThanEqual (x, y) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] <= y[i];
		}
		return out;
	}
	return x <= y;
}

function greaterThan (x, y) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] > y[i];
		}
		return out;
	}
	return x > y;
}

function greaterThanEqual (x, y) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] >= y[i];
		}
		return out;
	}
	return x >= y;
}

function equal (x, y) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] == y[i];
		}
		return out;
	}
	return x == y;
}

function notEqual (x, y) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = x[i] != y[i];
		}
		return out;
	}
	return x != y;
}

function any(x) {
	return x.some(function (x) {return x;});
}

function all(x) {
	return x.every(function (x) {return x;});
}

function not (x) {
	if (x.length) {
		var out = Array(x.length);
		for (var i = 0; i < x.length; i++) {
			out[i] = !x[i];
		}
		return out;
	}
	return !x
}


/**
 * Matrices
 */
function matrixCompMult (x, y) {
	var out = Array(x.length);
	for (var i = 0; i < x.length; i++) {
		out[i] = x[i]*y[i];
	}
	return out;
}

function outerProduct (c, r) {
	var out = [];
	var l = c.length;
	for (var i = 0; i < c.length; i++) {
		for (var j = 0; j < r.length; j++) {
			out[i*l + j] = c[i]*r[j];
		}
	}
	return out;
}
outerProduct.type = function (node) {
	var child1Type = this.getType(node.children[0]);
	var child2Type = this.getType(node.children[1]);
	var dim1 = child1Type.slice(-1);
	var dim2 = child2Type.slice(-1);
	return 'mat${dim1}x${dim2}';
};


/**
 * Helpers
 */
/**
 * mat * mat
 */
function matrixMult (m, n) {
	var l = m.length === 16 ? 4 : m.length === 9 ? 3 : 2;
	var out = Array(m.length);
	for (var i = 0; i < l; i++) {
		for (var j = 0; j < l; j++) {
			var sum = 0;
			for (var o = 0; o < l; o++) {
				sum += m[l*o + i] * n[j*l + o];
			}
			out[j*l + i] = sum;
		}
	}
	return out;
}


exports.bool = bool;
exports.int = int;
exports.uint = int;
exports.float = float;
exports.double = float;
exports.vec2 = vec2;
exports.vec3 = vec3;
exports.vec4 = vec4;
exports.dvec2 = vec2;
exports.dvec3 = vec3;
exports.dvec4 = vec4;
exports.ivec2 = vec2;
exports.ivec3 = vec3;
exports.ivec4 = vec4;
exports.uvec2 = vec2;
exports.uvec3 = vec3;
exports.uvec4 = vec4;
exports.mat2 = mat2;
exports.mat3 = mat3;
exports.mat4 = mat4;
exports.mat3x3 = mat3;
exports.mat4x4 = mat4;
exports.radians = radians;
exports.degrees = degrees;
exports.sin = sin;
exports.cos = cos;
exports.tan = tan;
exports.asin = asin;
exports.acos = acos;
exports.atan = atan;
exports.pow = pow;
exports.exp = exp;
exports.log = log;
exports.log2 = log2;
exports.exp2 = exp2;
exports.sqrt = sqrt;
exports.inversesqrt = inversesqrt;
exports.abs = abs;
exports.sign = sign;
exports.floor = floor;
exports.ceil = ceil;
exports.fract = fract;
exports.mod = mod;
exports.min = min;
exports.max = max;
exports.clamp = clamp;
exports.mix = mix;
exports.step = step;
exports.smoothstep = smoothstep;
exports.length = length;
exports.distance = distance;
exports.dot = dot;
exports.cross = cross;
exports.faceforward = faceforward;
exports.normalize = normalize;
exports.reflect = reflect;
exports.refract = refract;
exports.lessThan = lessThan;
exports.lessThanEqual = lessThanEqual;
exports.greaterThan = greaterThan;
exports.greaterThanEqual = greaterThanEqual;
exports.equal = equal;
exports.notEqual = notEqual;
exports.any = any;
exports.all = all;
exports.not = not;
exports.matrixCompMult = matrixCompMult;
exports.matrixMult = matrixMult;
exports.outerProduct = outerProduct;