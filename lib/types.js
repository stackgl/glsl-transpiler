var extend = require('xtend/mutable');
var inherits = require('inherits');


function noop () {};


/**
 * Bool cast
 */
function bool (value) {
	if (value[0] != null) value = value[0];
	return !!value;
};


/**
 * Int cast
 */
function int (value) {
	if (value[0] != null) value = value[0];
	return +value|0;
};


/**
 * Float cast
 */
function float (value) {
	if (value[0] != null) value = value[0];
	return +value;
};



/**
 * Generic vector class
 */
function vec () {}

inherits(vec, Array);

vec.prototype.length = function length () {
	return this.constructor.dimensions;
};

vec.prototype.valueOf = function () {
	var res = [], n = this.dimensions;
	for (var i = 0; i < n; i++) {
		res.push(this[i]);
	}
	return res;
};

vec.prototype.toString = function () {
	var n = this.dimensions;
	return `vec${n}(${this.valueOf().join(', ')})`;
};

//provide swizzles
swizzle(vec.prototype);

/**
 * Provide swizzles for a vector - a xxxx-getters
 */
function swizzle (target) {
	var dim = 4;

	var abbr = ['xyzw', 'stpd', 'rgba'].map(function (abbr) {
		abbr = abbr.split('').slice(0, dim);
		abbr.push('');
		return abbr;
	});


	//.xyzw, .xxyy, ...
	abbr.forEach(function (abbr) {
		for (var i = 0; i <= dim; i++) {
			for (var j = 0; j <= dim; j++) {
				for (var k = 0; k <= dim; k++) {
					for (var l = 0; l <= dim; l++) {
						createSwizzle(target, i,j,k,l,abbr);
					}
				}
			}
		}
	});

	//FIXME: in some unknown reason node@5.5.0 increases the processing time here x100
	function createSwizzle (target, i,j,k,l, abbr) {
		var x = abbr[i];
		var y = abbr[j];
		var z = abbr[k];
		var w = abbr[l];

		var prop = x + y + z + w;

		if (!prop) return;
		if (target.hasOwnProperty(prop)) return;

		var len = prop.length;

		Object.defineProperty(target, prop, {
			get: function () {
				if (len < 2) return this[i];
				if (len < 3) return this.constructor.vec2(this[i], this[j]);
				if (len < 4) return this.constructor.vec3(this[i], this[j], this[k]);
				return this.constructor.vec4(this[i], this[j], this[k], this[l]);
			},
			set: function (value) {
				if (x === y || x === z || x === w || y === z || y === w || z === w) throw Error(`Illegal — duplicating swizzle`);
				if (value.length() !== len) throw Error(`Illegal — mismatch between vec${len} and vec${value.length}`);

				var map = this.constructor.type;
				if (len < 2) {
					this[i] = map(value);
					return;
				}

				this[j] = map(value[1]);
				if (len < 3) return;
				this[k] = map(value[2]);
				if (len < 4) return;
				this[l] = map(value[3]);
			}
		});
	};

	return target;
};


/**
 * Multiply vector and something else
 */
vec.prototype.multiply = function (arg) {
	var len = this.length();
	var result = this.constructor['vec' + len]();

	if (arg instanceof mat) {

	}
	else if (arg instanceof vec) {
		result[0] = this[0] * arg[0];
		result[1] = this[1] * arg[1];
		if (len > 2) result[2] = this[2] * arg[2];
		if (len > 3) result[3] = this[3] * arg[3];
	}
	else {
		arg = float(arg);
		result[0] = this[0] * arg;
		result[1] = this[1] * arg;
		if (len > 2) result[2] = this[2] * arg;
		if (len > 3) result[3] = this[3] * arg;
	}

	return result;
};


/**
 * Sum vector and something else
 */
vec.prototype.add = function (arg) {
	var len = this.length();
	var result = this.constructor['vec' + len]();

	if (arg instanceof mat) {

	}
	else if (arg instanceof vec) {
		result[0] = this[0] + arg[0];
		result[1] = this[1] + arg[1];
		if (len > 2) result[2] = this[2] + arg[2];
		if (len > 3) result[3] = this[3] + arg[3];
	}
	else {
		arg = float(arg);
		result[0] = this[0] + arg;
		result[1] = this[1] + arg;
		if (len > 2) result[2] = this[2] + arg;
		if (len > 3) result[3] = this[3] + arg;
	}

	return result;
};


/**
 *
 */
vec.prototype.subtract = function (arg) {
	var len = this.length();
	var result = this.constructor['vec' + len]();
	var type = this.constructor.type;

	if (arg instanceof mat) {

	}
	else if (arg instanceof vec) {
		result[0] = type(this[0] - arg[0]);
		result[1] = type(this[1] - arg[1]);
		if (len > 2) result[2] = type(this[2] - arg[2]);
		if (len > 3) result[3] = type(this[3] - arg[3]);
	}
	else {
		arg = float(arg);
		result[0] = type(this[0] - arg);
		result[1] = type(this[1] - arg);
		if (len > 2) result[2] = type(this[2] - arg);
		if (len > 3) result[3] = type(this[3] - arg);
	}

	return result;
};


/**
 *
 */
vec.prototype.divide = function (arg) {
	var len = this.length();
	var result = this.constructor['vec' + len]();
	var type = this.constructor.type;

	if (arg instanceof mat) {

	}
	else if (arg instanceof vec) {
		result[0] = type(this[0] / arg[0]);
		result[1] = type(this[1] / arg[1]);
		if (len > 2) result[2] = type(this[2] / arg[2]);
		if (len > 3) result[3] = type(this[3] / arg[3]);
	}
	else {
		arg = float(arg);
		result[0] = type(this[0] / arg);
		result[1] = type(this[1] / arg);
		if (len > 2) result[2] = type(this[2] / arg);
		if (len > 3) result[3] = type(this[3] / arg);
	}

	return result;
};


/**
 * vec2
 */
function vec2 () {
	return vec2.create(this, arguments);
};

vector(vec2, {
	dimensions: 2,
	type: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4
});


/**
 * vec3
 */
function vec3 () {
	return vec3.create(this, arguments);
}

vector(vec3, {
	dimensions: 3,
	type: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4
});


/**
 * vec4
 */
function vec4 () {
	return vec4.create(this, arguments);
}

vector(vec4, {
	dimensions: 4,
	type: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4
});

/**
 * ivec2
 */
function ivec2 () {
	return ivec2.create(this, arguments);
};

vector(ivec2, {
	dimensions: 2,
	type: int,
	vec2: ivec2,
	vec3: ivec3,
	vec4: ivec4
});


/**
 * ivec3
 */
function ivec3 () {
	return ivec3.create(this, arguments);
}

vector(ivec3, {
	dimensions: 3,
	type: int,
	vec2: ivec2,
	vec3: ivec3,
	vec4: ivec4
});


/**
 * ivec4
 */
function ivec4 () {
	return ivec4.create(this, arguments);
}

vector(ivec4, {
	dimensions: 4,
	type: int,
	vec2: ivec2,
	vec3: ivec3,
	vec4: ivec4
});


/**
 * bvec2
 */
function bvec2 () {
	return bvec2.create(this, arguments);
};

vector(bvec2, {
	dimensions: 2,
	type: bool,
	vec2: bvec2,
	vec3: bvec3,
	vec4: bvec4
});


/**
 * bvec3
 */
function bvec3 () {
	return bvec3.create(this, arguments);
}

vector(bvec3, {
	dimensions: 3,
	type: bool,
	vec2: bvec2,
	vec3: bvec3,
	vec4: bvec4
});


/**
 * bvec4
 */
function bvec4 () {
	return bvec4.create(this, arguments);
}

vector(bvec4, {
	dimensions: 4,
	type: bool,
	vec2: bvec2,
	vec3: bvec3,
	vec4: bvec4
});


/**
 * Make constructor a vector.
 * Fastest vector implementation is proved to be native data type.
 * Performance is comparable to typed arrays.
 *
 * Options:
 * @param {number} dimensions Vector dimensions
 * @param {function} map function mapper
 */
function vector (constr, opts) {
	inherits(constr, vec);
	// constr.prototype = Object.create(vec.prototype);
	extend(constr, opts);

	//bind vec1 synonym (common access)
	if (!constr.vec1) constr.vec1 = constr.type;

	//create instance
	constr.create = function (target, args) {
		if (!(target instanceof constr)) target = new constr();

		var i = 0, arg, map = constr.type, last = map(0), n = constr.dimensions;

		args = flatten(args, n);

		while (i < n) {
			arg = args[i];
			target[i] = map(arg == null ? last : arg);
			last = target[i];
			i++;
		}

		return target;
	};

	return constr;
};


/**
 * Generic matrix class, implementing generic ops etc
 */
function mat () {
	//implement in descendants
}

inherits(mat, Array);

//length returns number of vectors
mat.prototype.length = function () {
	return this.constructor.dimensions;
};

/**
 * mat2
 */
function mat2 () {
	return mat2.create(this, arguments);
};

matrix(mat2, {
	type: vec2,
	dimensions: 2
});

/**
 * mat2x3
 */
function mat2x3 () {
	return mat2x3.create(this, arguments);
};

matrix(mat2x3, {
	type: vec3,
	dimensions: 2
});

/**
 * mat2x4
 */
function mat2x4 () {
	return mat2x4.create(this, arguments);
};

matrix(mat2x4, {
	type: vec4,
	dimensions: 2
});


/**
 * mat3
 */
function mat3 () {
	return mat3.create(this, arguments);
};

matrix(mat3, {
	type: vec3,
	dimensions: 3
});

/**
 * mat3x2
 */
function mat3x2 () {
	return mat3x2.create(this, arguments);
};

matrix(mat3x2, {
	type: vec2,
	dimensions: 3
});

/**
 * mat3x4
 */
function mat3x4 () {
	return mat3x4.create(this, arguments);
};

matrix(mat3x4, {
	type: vec4,
	dimensions: 3
});


/**
 * mat4
 */
function mat4 () {
	return mat4.create(this, arguments);
};

matrix(mat4, {
	type: vec4,
	dimensions: 4
});

/**
 * mat4x2
 */
function mat4x2 () {
	return mat4x2.create(this, arguments);
};

matrix(mat4x2, {
	type: vec2,
	dimensions: 4
});

/**
 * mat4x3
 */
function mat4x3 () {
	return mat4x3.create(this, arguments);
};

matrix(mat4x3, {
	type: vec3,
	dimensions: 4
});


/**
 * Matriz constructor.
 * Matrix is a set of n-dim float vectors.
 *
 * Options:
 * @param {vec} type Vector class to use as a base
 * @param {number} dimensions Number of columns
 */
function matrix (constr, opts) {
	inherits(constr, mat);
	extend(constr, opts);

	//matrix is created whether from a number of columns as vectors, or a list of args
	constr.create = function (target, args) {
		if (!(target instanceof constr)) target = new constr();

		var vec = constr.type;
		var size = constr.dimensions;

		//create vectors
		for (var i = 0; i < size; i++) {
			target[i] = vec();
		}

		//apply args
		var i = 0, j = 0, arg, last = 0, col, dim = vec.dimensions;

		//of only one arg passed - init diagonal
		if (args.length === 1 && args[0] != null) {
			if (typeof args[0] === 'number') {
				arg = args[0];
			} else if (args[0] instanceof mat) {
				arg = 1;
			}

			for (var l = Math.min(size, dim); i < l; i++) {
				target[i][i] = arg;
			}

			//if arg passed is also matrix - simplify creation
			if (args[0] instanceof mat) {
				var m = args[0];
				dim = Math.min(dim, m[0].length());
				size = Math.min(size, m.length());

				for (i = 0; i < size; i++) {
					col = target[i];
					for (j = 0; j < dim; j++) {
						arg = m[i][j];
						col[j] = arg == null ? last : arg;
						last = col[j];
					}
				}
			}

			return target;
		}

		args = flatten(args);

		//otherwise do component-fill
		for (i = 0; i < size; i++) {
			col = target[i];
			for (j = 0; j < dim; j++) {
				arg = args[i*dim + j];
				col[j] = arg == null ? last : arg;
				last = col[j];
			}
		}

		return target;
	};
};


/**
 * Tiny array-like structures flattener, for args recognition
 */
function flatten (arr, max) {
	var result = [];

	if (!arr.length) return arr;

	var l = typeof arr.length === 'number' ? arr.length : arr.length();

	for (var i = 0; i < l; i++) {
		if (arr[i].length != null) result = result.concat(flatten(arr[i], max - result.length));
		else result.push(arr[i]);
	}

	return result;
}



//OpenGL types @ref https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
extend(exports, {
	void: noop,
	bool: bool,
	int: int,
	uint: int,
	float: float,
	double: float,
	vec2: vec2,
	vec3: vec3,
	vec4: vec4,
	dvec2: vec2,
	dvec3: vec3,
	dvec4: vec4,
	bvec2:	bvec2,
	bvec3: bvec3,
	bvec4: bvec4,
	ivec2: ivec2,
	ivec3: ivec3,
	ivec4: ivec4,
	uvec2: ivec2,
	uvec3: ivec3,
	uvec4: ivec4,
	mat2: mat2,
	mat3: mat3,
	mat4: mat4,
	mat2x2: mat2,
	mat2x3: mat2x3,
	mat2x4: mat2x4,
	mat3x2: mat3x2,
	mat3x3: mat3,
	mat3x4: mat3x4,
	mat4x2: mat4x2,
	mat4x3: mat4x3,
	mat4x4: mat4,
	dmat2: mat2,
	dmat3: mat3,
	dmat4: mat4,
	dmat2x2: mat2,
	dmat2x3: mat2x3,
	dmat2x4: mat2x4,
	dmat3x2: mat3x2,
	dmat3x3: mat3,
	dmat3x4: mat3x4,
	dmat4x2: mat4x2,
	dmat4x3: mat4x3,
	dmat4x4: mat4,
	sampler1D: null,
	image1D: null,
	sampler2D: null,
	image2D: null,
	sampler3D: null,
	image3D: null,
	samplerCube: null,
	imageCube: null,
	sampler2DRect: null,
	image2DRect: null,
	sampler1DArray: null,
	image1DArray: null,
	sampler2DArray: null,
	image2DArray: null,
	samplerBuffer: null,
	imageBuffer: null,
	sampler2DMS: null,
	image2DMS: null,
	sampler2DMSArray: null,
	image2DMSArray: null,
	samplerCubeArray: null,
	imageCubeArray: null,
	sampler1DShadow: null,
	sampler2DShadow: null,
	sampler2DRectShadow: null,
	sampler1DArrayShadow: null,
	sampler2DArrayShadow: null,
	samplerCubeShadow: null,
	samplerCubeArrayShadow: null,
	isampler1D: null,
	iimage1D: null,
	isampler2D: null,
	iimage2D: null,
	isampler3D: null,
	iimage3D: null,
	isamplerCube: null,
	iimageCube: null,
	isampler2DRect: null,
	iimage2DRect: null,
	isampler1DArray: null,
	iimage1DArray: null,
	isampler2DArray: null,
	iimage2DArray: null,
	isamplerBuffer: null,
	iimageBuffer: null,
	isampler2DMS: null,
	iimage2DMS: null,
	isampler2DMSArray: null,
	iimage2DMSArray: null,
	isamplerCubeArray: null,
	iimageCubeArray: null,
	atomic_uint: null,
	usampler1D: null,
	uimage1D: null,
	usampler2D: null,
	uimage2D: null,
	usampler3D: null,
	uimage3D: null,
	usamplerCube: null,
	uimageCube: null,
	usampler2DRect: null,
	uimage2DRect: null,
	usampler1DArray: null,
	uimage1DArray: null,
	usampler2DArray: null,
	uimage2DArray: null,
	usamplerBuffer: null,
	uimageBuffer: null,
	usampler2DMS: null,
	uimage2DMS: null,
	usampler2DMSArray: null,
	uimage2DMSArray: null,
	usamplerCubeArray: null,
	uimageCubeArray: null
});