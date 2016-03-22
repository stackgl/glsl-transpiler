/**
 * Type constructors.
 *
 * If type is detected in the code, like `float[2](1, 2, 3)` or `vec3(vec2(), 1)`,
 * the according function will be called and type is stringified as return.
 *
 * The arguments are nodes, so that we can detect the type of the args
 * to do like mat2(vec2, vec2) etc.
 *
 * Also types save components access, in optimisation purposes.
 * So after you can call `getComponent(node, idx)` for getting shorten stringified version of a node’s component.
 *
 * OpenGL types @ref https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
 *
 * @module  glsl-js/lib/types
 */


var Descriptor = require('./descriptor');


var floatRE = /^-?[0-9]*(?:.[0-9]+)?(?:e-?[0-9]+)?$/i;

exports.void = function () {
	return '';
}


function bool (node) {
	if (node == null) return Descriptor(false, {type: 'bool', complexity: 0});

	var result;

	//node passed
	if (node instanceof String) {
		result = node.components[0];
	}
	else if (typeof node === 'object') {
		result = this.process(node).components[0];
	}
	//string/value passed
	else {
		result = node;
	}

	//bool?
	if (result == 'true' || result === true) return Descriptor(true, {type: 'bool', complexity: 0});
	if (result == 'false' || result === false) return Descriptor(false, {type: 'bool', complexity: 0});

	//number/string?
	var num = floatRE.exec(result);

	//it was string - preserve complex argument
	if (num == null) {
		return Descriptor('!!' + result, {type: 'bool', complexity: result.complexity + 1});
	}

	//cast number to bool
	return Descriptor(!!parseFloat(num), {type: 'bool', complexity: 0});
}
bool.type = 'bool';

exports.bool = bool;


function int (node) {
	if (node == null) return Descriptor(0, {type: 'int', complexity: 0});

	if (typeof node !== 'object') return Descriptor(+node|0, {type: 'int', complexity: 0});

	var result;

	//node?
	if (node instanceof String) {
		result = node.components[0];
	}
	else if (typeof node === 'object') {
		result = this.process(node).components[0];
	}
	//number/string/descriptor?
	else {
		result = node;
	}

	//bool?
	if (result == 'true' || result === true) return Descriptor(1, {type: 'int', complexity: 0});
	if (result == 'false' || result === false) return Descriptor(0, {type: 'int', complexity: 0});

	var num = floatRE.exec(result);

	//it was number
	if (num != null) {
		return Descriptor(+parseFloat(num)|0, {type: 'int', complexity: 0});
	}

	//it was string
	return Descriptor(result + '|0', {type: 'int', complexity: result.complexity});
}
int.type = 'int';

exports.int =
exports.uint =
exports.byte =
exports.short = int;


function float (node) {
	if (node == null) return Descriptor(0, {type: 'float', complexity: 0});

	var result;

	if (node instanceof String) {
		result = node.components[0];
	}
	else if (typeof node === 'object') {
		result = this.process(node).components[0];
	}
	else {
		result = node;
	}

	//bool?
	if (result == 'true' || result === true) return Descriptor(1.0, {type: 'float', complexity: 0});
	if (result == 'false' || result === false) return Descriptor(0.0, {type: 'float', complexity: 0});

	var num = floatRE.exec(result);

	//it was number
	if (num != null) {
		return Descriptor(+parseFloat(num), {type: 'float', complexity: 0});
	}
	//it was string
	else {
		if (result.type === 'int' || result.type === 'float') {
			return Descriptor(result, {type: 'float', complexity: result.complexity});
		} else {
			return Descriptor('+' + result, {type: 'float', complexity: result.complexity + 1});
		}
	}
}
float.type = 'float';

exports.float =
exports.double = float;

function createVec2 (type) {
	vec2.type = type;
	function vec2 (x, y) {
		//vec2(*) → vec2(*, *)
		if (x == null) x = 0;
		if (y == null) y = x;

		var x = this.process(x);
		var y = this.process(y);

		var components = [], map = ``, include;

		//map type, if input args are of diff type (unlikely required)
		if (x.components[0].type != type || y.components[0].type != type) {
			map = `.map(${type})`;
			include = type;
		}

		//vec2(vec2) → vec2
		if (this.types[x.type].length === 2) {
			return x;
		}

		//vec2(vec3) → vec3.slice(0, 2)
		if (this.types[x.type].length > 2) {
			return Descriptor(`${x}.slice(0, 2)${map}`, {
				components: x.components.slice(0, 2).map(this.types[type], this),
				type: 'vec2',
				complexity: x.complexity + 2,
				include: include
			});
		};

		//vec2(float) → [0, 0].fill(float)
		if (x === y) {
			return Descriptor(`[0, 0].fill(${x})${map}`, {
				complexity: x.complexity + 2,
				components: [x, y].map(this.types[type], this),
				type: 'vec2',
				include: include
			});
		}

		//vec2(simple, simple) → [simple, simple]
		return Descriptor(`[${[x,y].join(', ')}]${map}`, {
			components: [x, y].map(this.types[type], this),
			type: 'vec2',
			complexity: x.complexity + y.complexity,
			include: include
		});
	}
	return vec2;
};

function createVec3 (type) {
	vec3.type = type;
	function vec3 (x, y, z) {
		//vec3(*) → vec3(*, *, *)
		if (x == null) x = 0;
		if (y == null) y = x;
		if (z == null) z = y;

		x = this.process(x);
		y = this.process(y);
		z = this.process(z);

		var components = [], map = ``, include;

		//map type, if input args are of diff type (unlikely required)
		if (x.components[0].type != type || y.components[0].type != type || z.components[0].type != type) {
			map = `.map(${type})`;
			include = type;
		}

		//vec3(vec3) → vec3
		if (this.types[x.type].length === 3) {
			return x;
		}

		//vec3(vecN) → vecN.slice(0, 3)
		if (this.types[x.type].length > 3) {
			return Descriptor(`${x}.slice(0, 3)${map}`, {
				components: x.components.slice(0, 3).map(this.types[type], this),
				type: 'vec3',
				complexity: x.complexity + 3 + 3,
				include: include
			});
		}

		//vec3(vec2, *) → vec2.concat(*)
		if (this.types[x.type].length === 2) {
			return Descriptor(`${x}.concat(${this.types.float.call(this, y)})${map}`, {
				components: x.components.concat(y.components[0]).map(this.types[type], this),
				type: 'vec3',
				complexity: x.complexity + y.complexity + 3,
				include: include
			});
		}

		//vec3(float, vecN) → [float].concat(vecN.slice(0,2));
		if (this.types[y.type].length > 1) {
			return Descriptor(`[${x}].concat(${this.types.vec2.call(this, y, z)})${map}`, {
				components: [x].concat(y.components.slice(0, 2)).map(this.types[type], this),
				type: 'vec3',
				complexity: x.complexity + y.complexity + z.complexity + 3,
				include: include
			});
		}

		return Descriptor(`[${[x,y,z].join(', ')}]${map}`, {
			components: [x, y, z].map(this.types[type], this),
			type: 'vec3',
			complexity: x.complexity + y.complexity + z.complexity + 3,
			include: include
		});
	}
	return vec3;
};

function createVec4 (type) {
	vec4.type = type;
	function vec4 (x, y, z, w) {
		if (x == null) x = 0;
		if (y == null) y = x;
		if (z == null) z = y;
		if (w == null) w = z;

		var x = this.process(x);
		var y = this.process(y);
		var z = this.process(z);
		var w = this.process(w);

		var components = [], map = ``, include;

		//map type, if input args are of diff type (unlikely required)
		if (x.components[0].type != type || y.components[0].type != type || z.components[0].type != type || w.components[0].type != type) {
			map = `.map(${type})`;
			include = type;
		}

		//vec4(matN)
		if (/mat/.test(x.type)) {
			return Descriptor(x, {
				components: x.components.map(this.types[type], this),
				type: 'vec4',
				include: include
			});
		}

		//vec4(vecN) → vecN.slice(0, 4)
		if (this.types[x.type].length > 4) {
			return Descriptor(`${x}.slice(0, 4)${map}`, {
				components: x.components.slice(0, 4).map(this.types[type], this),
				type: 'vec4',
				include: include
			});
		}

		//vec4(vec4) → vec4
		if (this.types[x.type].length === 4) {
			return x;
		}

		//vec4(vec3, *) → vec3.concat(*)
		if (this.types[x.type].length === 3) {
			return Descriptor(`${x}.concat(${this.types.float.call(this, y)})${map}`, {
				components: x.components.concat(y.components[0]).map(this.types[type], this),
				type: 'vec4',
				include: include
			});
		}

		//vec4(vec2, *) → vec2.concat(*)
		if (this.types[x.type].length === 2) {
			//vec4(vec2, vecN)
			if (this.types[y.type].length > 1) {
				return Descriptor(`${x}.concat(${this.types.vec2.call(this, y)})${map}`, {
					components: x.components.concat(y.components.slice(0, 2)).map(this.types[type], this),
					type: 'vec4',
					include: include
				});
			}

			//vec4(vec2, float, float)
			var res = Descriptor(
				`${x}.concat(${this.types.vec2.call(this, y, z)})${map}`, {
					components: x.components.concat(y.components[0], z.components[0]).map(this.types[type], this),
					type: 'vec4',
					include: include
				});
			return res;
		}

		//vec4(float, vec2, *)
		if (this.types[y.type].length === 2) {
			return Descriptor(`[${x}].concat(${this.types.vec2.call(this, y)}, ${this.types.float.call(this, z)})${map}`, {
				components: x.components.concat(y.components, z.components[0]).map(this.types[type], this),
				type: 'vec4',
				include: include
			});
		}

		//vec4(float, vecN)
		if (this.types[y.type].length > 2) {
			return Descriptor(`[${x}].concat(${this.types.vec3.call(this, y, z, w)})${map}`, {
				components: x.components.concat(y.components.slice(0, 3)).map(this.types[type], this),
				type: 'vec4',
				include: include
			});
		}

		//vec4(float, float, vecN)
		if (this.types[z.type].length > 1) {
			return Descriptor(`[${x}].concat(${y}, ${this.types.vec2.call(this, z)})${map}`, {
				components: x.components.concat(y.components[0], z.components.slice(0, 2)).map(this.types[type], this),
				type: 'vec4',
				include: include
			});
		}

		return Descriptor(`[${[x,y,z,w].join(', ')}]${map}`, {
			components: [x, y, z, w].map(this.types[type], this),
			type: 'vec4',
			include: include
		});
	}
	return vec4;
}

exports.ivec2 =
exports.uvec2 = createVec2('int');
exports.bvec2 = createVec2('bool');
exports.dvec2 =
exports.vec2 = createVec2('float');

exports.ivec3 =
exports.uvec3 = createVec3('int');
exports.bvec3 = createVec3('bool');
exports.dvec3 =
exports.vec3 = createVec3('float');

exports.ivec4 =
exports.uvec4 = createVec4('int');
exports.bvec4 = createVec4('bool');
exports.dvec4 =
exports.vec4 = createVec4('float');


/**
 * Matrices are arrays of arrays (vectors)
 */
function mat2 (v0, v1) {
	//mat2(x0, y0, x1, y1)
	if (arguments.length >= 4) {
		var x0 = this.process(arguments[0]);
		var y0 = this.process(arguments[1]);
		var x1 = this.process(arguments[2]);
		var y1 = this.process(arguments[3]);
		return Descriptor(
			`[${[x0, y0, x1, y1].join(', ')}]`, {
			components: [x0.components[0], y0.components[0], x1.components[0], y1.components[0]],
			type: 'mat2'
		});
	};

	//ensure at least identity matrix
	if (v0 == null) v0 = 1;

	var v0 = this.process(v0);
	var v1 = this.process(v1);

	//mat2(float) → identity matrix
	if (this.types[v0.type].length === 1) {
		var res = Descriptor(
			`mat2(${v0})`, {
			components: [
				v0, 0,
				0, v0
			],
			type: 'mat2',
			include: 'mat2'
		});
		return res;
	}

	//mat2(mat2)
	if (v0.type === 'mat2') {
		return v0;
	}

	//mat(vec, vec)
	return Descriptor(`${this.types.vec2.call(this, v0)}.concat(${this.types.vec2.call(this, v1)})`, {
		components: v0.components.slice(0,2).concat(v1.components.slice(0,2)),
		type: 'mat2'
	});
}
mat2.type = 'vec2';

function mat3 (v0, v1, v2) {
	//mat2(x0, y0, z0, x1, y1, z1, x2, y2, z2)
	if (arguments.length >= 9) {
		var x0 = this.process(arguments[0]);
		var y0 = this.process(arguments[1]);
		var z0 = this.process(arguments[2]);
		var x1 = this.process(arguments[3]);
		var y1 = this.process(arguments[4]);
		var z1 = this.process(arguments[5]);
		var x2 = this.process(arguments[6]);
		var y2 = this.process(arguments[7]);
		var z2 = this.process(arguments[8]);
		return Descriptor(
			`[${[x0, y0, z0, x1, y1, z1, x2, y2, z2].join(', ')}]`, {
			components: [x0, y0, z0, x1, y1, z1, x2, y2, z2],
			type: 'mat3'
		});
	};

	//ensure at least identity matrix
	if (v0 == null) v0 = 1;

	var v0 = this.process(v0);
	var v1 = this.process(v1);
	var v2 = this.process(v2);

	//mat3(float) → identity matrix
	if (this.types[v0.type].length === 1) {
		var res = Descriptor(
			`mat3(${v0})`, {
			components: [
				v0, 0, 0,
				0, v0, 0,
				0, 0, v0
			],
			type: 'mat3',
			include: 'mat3'
		});
		return res;
	}

	//mat3(mat2)
	if (v0.type === 'mat2') {
		return Descriptor(`[0,1,null, 2,3,null, null,null,-1].map(function (i) {return i == null ? 0 : i < 0 ? -i : this[i]}, ${v0})`, {
			components: [
				v0.components[0], v0.components[1], 0,
				v0.components[2], v0.components[3], 0,
				0, 0, 1
			],
			type: 'mat3'
		});
	}

	//mat3(mat3)
	if (v0.type === 'mat3') {
		return v0;
	}

	//mat3(mat4)
	if (v0.type === 'mat4') {
		var components = v0.components;
		return Descriptor(`${this.process(v0)}.filter(function (x, i) { return i % 4 !== 3 && i < 12; })`, {
			components: components.slice(0, 3).concat(components.slice(4, 7), components.slice(8, 11)),
			type: 'mat3'
		});
	}

	//mat(vec, vec, vec)
	return Descriptor(`${this.types.vec3.call(this, v0)}.concat(${this.types.vec3.call(this, v1)}, ${this.types.vec3.call(this, v2)})`, {
		components: v0.components.slice(0,3).concat(v1.components.slice(0,3), v2.components.slice(0,3)),
		type: 'mat3'
	});
}
mat3.type = 'vec3';

function mat4 (v0, v1, v2, v3) {
	//mat2(x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3)
	if (arguments.length >= 16) {
		var x0 = this.process(arguments[0]);
		var y0 = this.process(arguments[1]);
		var z0 = this.process(arguments[2]);
		var w0 = this.process(arguments[3]);
		var x1 = this.process(arguments[4]);
		var y1 = this.process(arguments[5]);
		var z1 = this.process(arguments[6]);
		var w1 = this.process(arguments[7]);
		var x2 = this.process(arguments[8]);
		var y2 = this.process(arguments[9]);
		var z2 = this.process(arguments[10]);
		var w2 = this.process(arguments[11]);
		var x3 = this.process(arguments[12]);
		var y3 = this.process(arguments[13]);
		var z3 = this.process(arguments[14]);
		var w3 = this.process(arguments[15]);

		return Descriptor(
			`[${[x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3].join(', ')}]`, {
			components: [x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3],
			type: 'mat4'
		});
	};

	//ensure at least identity matrix
	if (v0 == null) v0 = 1;

	var v0 = this.process(v0);
	var v1 = this.process(v1);
	var v2 = this.process(v2);
	var v3 = this.process(v3);

	//mat(float) → identity matrix
	if (this.types[v0.type].length === 1) {
		var res = Descriptor(
			`mat4(${v0})`, {
			components: [
				v0, 0, 0, 0,
				0, v0, 0, 0,
				0, 0, v0, 0,
				0, 0, 0, v0
			],
			type: 'mat4',
			include: 'mat4'
		});
		return res;
	}

	//mat4(mat2)
	if (v0.type === 'mat2') {
		return Descriptor(
			`[0,1,null,null, 2,3,null,null, null,null,-1,null, null,null,null,-1].map(function (i) {return i == null ? 0 : i < 0 ? -i : this[i]}, ${v0})`, {
			components: [
			v0.components[0], v0.components[1], 0, 0,
			v0.components[2], v0.components[3], 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
			],
			type: 'mat4'
		});
	}

	//mat4(mat3)
	if (v0.type === 'mat3') {
		var components = v0.components;
		return Descriptor(
			`[0,1,2,null,3,4,5,null,6,7,8,null,null,null,null,-1].map(function (i) {return i == null ? 0 : i < 0 ? -i : this[i]}, ${v0})`, {
			components: components.slice(0, 3).concat(0, components.slice(3, 6), 0, components.slice(6, 9), 0, 0, 0, 0, 1),
			type: 'mat4'
		});
	}

	//mat(vec, vec, vec, vec)
	return Descriptor(`${this.types.vec4.call(this, v0)}.concat(${this.types.vec4.call(this, v1)}, ${this.types.vec4.call(this, v2)}, ${this.types.vec4.call(this, v3)})`, {
		components: v0.components.slice(0, 4).concat(v1.components.slice(0, 4), v2.components.slice(0, 4), v3.components.slice(0,4)),
		type: 'mat4'
	});
}
mat4.type = 'vec4';


exports.mat2 = mat2;
exports.mat3 = mat3;
exports.mat4 = mat4;
exports.mat2x2 = mat2;
exports.mat3x3 = mat3;
exports.mat4x4 = mat4;
// exports.mat2x3 = mat2x3;
// exports.mat2x4 = mat2x4;
// exports.mat3x2 = mat3x2;
// exports.mat3x4 = mat3x4;
// exports.mat4x2 = mat4x2;
// exports.mat4x3 = mat4x3;
exports.dmat2 = mat2;
exports.dmat3 = mat3;
exports.dmat4 = mat4;
exports.dmat2x2 = mat2;
exports.dmat3x3 = mat3;
exports.dmat4x4 = mat4;
// exports.dmat2x3 = mat2x3;
// exports.dmat2x4 = mat2x4;
// exports.dmat3x2 = mat3x2;
// exports.dmat3x4 = mat3x4;
// exports.dmat4x2 = mat4x2;
// exports.dmat4x3 = mat4x3;


// extend(exports, {
// 	sampler1D: null,
// 	image1D: null,
// 	sampler2D: null,
// 	image2D: null,
// 	sampler3D: null,
// 	image3D: null,
// 	samplerCube: null,
// 	imageCube: null,
// 	sampler2DRect: null,
// 	image2DRect: null,
// 	sampler1DArray: null,
// 	image1DArray: null,
// 	sampler2DArray: null,
// 	image2DArray: null,
// 	samplerBuffer: null,
// 	imageBuffer: null,
// 	sampler2DMS: null,
// 	image2DMS: null,
// 	sampler2DMSArray: null,
// 	image2DMSArray: null,
// 	samplerCubeArray: null,
// 	imageCubeArray: null,
// 	sampler1DShadow: null,
// 	sampler2DShadow: null,
// 	sampler2DRectShadow: null,
// 	sampler1DArrayShadow: null,
// 	sampler2DArrayShadow: null,
// 	samplerCubeShadow: null,
// 	samplerCubeArrayShadow: null,
// 	isampler1D: null,
// 	iimage1D: null,
// 	isampler2D: null,
// 	iimage2D: null,
// 	isampler3D: null,
// 	iimage3D: null,
// 	isamplerCube: null,
// 	iimageCube: null,
// 	isampler2DRect: null,
// 	iimage2DRect: null,
// 	isampler1DArray: null,
// 	iimage1DArray: null,
// 	isampler2DArray: null,
// 	iimage2DArray: null,
// 	isamplerBuffer: null,
// 	iimageBuffer: null,
// 	isampler2DMS: null,
// 	iimage2DMS: null,
// 	isampler2DMSArray: null,
// 	iimage2DMSArray: null,
// 	isamplerCubeArray: null,
// 	iimageCubeArray: null,
// 	atomic_uint: null,
// 	usampler1D: null,
// 	uimage1D: null,
// 	usampler2D: null,
// 	uimage2D: null,
// 	usampler3D: null,
// 	uimage3D: null,
// 	usamplerCube: null,
// 	uimageCube: null,
// 	usampler2DRect: null,
// 	uimage2DRect: null,
// 	usampler1DArray: null,
// 	uimage1DArray: null,
// 	usampler2DArray: null,
// 	uimage2DArray: null,
// 	usamplerBuffer: null,
// 	uimageBuffer: null,
// 	usampler2DMS: null,
// 	uimage2DMS: null,
// 	usampler2DMSArray: null,
// 	uimage2DMSArray: null,
// 	usamplerCubeArray: null,
// 	uimageCubeArray: null
// });