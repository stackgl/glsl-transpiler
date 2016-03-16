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



exports.void = function () {
	return '';
}


function bool (node) {
	if (node == null) return false;

	var result;

	//node passed
	if (typeof node === 'object') {
		var type = this.getType(node);
		if (this.types[type] && this.types[type].length > 1) {
			result = this.getComponent(node, 0);
		}
		else {
			result = this.stringify(node);
		}
	}
	//string/value passed
	else {
		result = node;
	}

	//bool?
	if (result === 'true' || result === true) return true;
	if (result === 'false' || result === false) return false;

	//number/string?
	var num = parseFloat(result);

	//it was string - preserve complex argument
	if (isNaN(num)) {
		return '!!' + result;
	}

	//cast number to bool
	return !!num;
}
bool.type = 'bool';

exports.bool = bool;


function int (node) {
	if (node == null) return 0;

	if (typeof node !== 'object') return +node|0;

	var result;

	//node?
	if (typeof node === 'object') {
		var type = this.getType(node);

		//if passed vec/mat (something long enough, containint elements)
		//we should typecast each it’s component
		if (this.types[type] && this.types[type].length > 1) {
			result = this.getComponent(node, 0);
		}
		else {
			result = this.stringify(node);
		}
	}
	//number/string?
	else {
		result = node;
	}

	//bool?
	if (result === 'true' || result === true) return 1;
	if (result === 'false' || result === false) return 0;

	var num = parseFloat(result);

	//it was number
	if (!isNaN(num)) {
		return +num|0;
	}
	//it was string
	else {
		result += '|0';
	}

	return result;
}
int.type = 'int';

exports.int =
exports.uint =
exports.byte =
exports.short = int;


function float (node) {
	if (node == null) return 0;

	var result;

	if (typeof node === 'object') {
		//bring each component of vec/mat to float
		var type = this.getType(node);
		if (this.types[type] && this.types[type].length > 1) {
			result = this.getComponent(node, 0);
		}
		else {
			result = this.stringify(node);
		}
	}
	else {
		result = node;
	}

	//bool?
	if (result === 'true' || result === true) return 1.0;
	if (result === 'false' || result === false) return 0.0;

	var num = parseFloat(result);

	//it was number
	if (!isNaN(num)) {
		return +num;
	}
	//it was string
	else {
		result = '+' + result;
	}

	return result;
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

		var xType = this.getType(x);
		var yType = this.getType(y);

		var components = [];

		//vec2(vec2) → vec2
		if (this.types[xType].length === 2) {
			return this.createTypeResult(this.stringify(x), [x, x], type);
		}

		//vec2(vec3) → vec3.slice(0, 2)
		if (this.types[xType].length > 2) {
			return this.createTypeResult(`${this.stringify(x)}.slice(0, 2)`, [x, x], type);
		};

		//vec2(complex, complex) → [0, 0].fill(complex)
		if (x === y && this.complexity(x) > 5) {
			return this.createTypeResult(`[0, 0].fill(${this.stringify(x)})`, [x, y], type);
		}

		//vec2(simple, simple) → [simple, simple]
		return this.createTypeResult(`[${[x,y].map(this.stringify, this).join(', ')}]`, [x, y], type);
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

		var xType = this.getType(x);
		var yType = this.getType(y);
		var zType = this.getType(z);

		var components = [];

		//vec3(vec3) → vec3
		if (this.types[xType].length === 3) {
			return this.createTypeResult(this.stringify(x), [x, x, x], type);
		}

		//vec3(vecN) → vecN.slice(0, 3)
		if (this.types[xType].length > 3) {
			return this.createTypeResult(`${this.stringify(x)}.slice(0, 3)`, [x, x, x], type);
		}

		//vec3(vec2, *) → vec2.concat(*)
		if (this.types[xType].length === 2) {
			return this.createTypeResult(`${this.stringify(x)}.concat(${this.types.float.call(this, y)})`, [x, x, y], type);
		}

		//vec3(float, vecN) → [float].concat(vecN.slice(0,2));
		if (this.types[yType].length > 1) {
			return this.createTypeResult(`[${this.stringify(x)}].concat(${this.types.vec2.call(this, y, z)})`, [x, y, y], type);
		}

		return this.createTypeResult(`[${[x,y,z].map(this.stringify, this).join(', ')}]`, [x, y, z], type);
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

		var xType = this.getType(x);
		var yType = this.getType(y);
		var zType = this.getType(z);
		var wType = this.getType(w);

		var components = [];

		//vec4(matN)
		if (/mat/.test(xType)) {
			return this.createTypeResult(this.stringify(x), this.getComponents(x), type);
		}

		//vec4(vecN) → vecN.slice(0, 4)
		if (this.types[xType].length > 4) {
			return this.createTypeResult(`${this.stringify(x)}.slice(0, 4)`, [x, x, x, x], type);
		}

		//vec4(vec4) → vec4
		if (this.types[xType].length === 4) {
			return this.createTypeResult(this.stringify(x), [x, x, x, x], type);
		}

		//vec4(vec3, *) → vec3.concat(*)
		if (this.types[xType].length === 3) {
			return this.createTypeResult(`${this.stringify(x)}.concat(${this.types.float.call(this, y)})`, [x, x, x, y], type);
		}

		//vec4(vec2, *) → vec2.concat(*)
		if (this.types[xType].length === 2) {
			//vec4(vec2, vecN)
			if (this.types[yType].length > 1) {
				return this.createTypeResult(`${this.stringify(x)}.concat(${this.types.vec2.call(this, y)})`, [x, x, y, y], type);
			}

			//vec4(vec2, float, float)
			return this.createTypeResult(
				`${this.stringify(x)}.concat(${this.types.vec2.call(this, y, z)})`, [x, x, y, z], type);
		}

		//vec4(float, vec2, *)
		if (this.types[yType].length === 2) {
			return this.createTypeResult(`[${this.stringify(x)}].concat(${this.types.vec2.call(this, y)}, ${this.types.float.call(this, z)})`, [x, y, y, z], type);
		}

		//vec4(float, vecN)
		if (this.types[yType].length > 2) {
			return this.createTypeResult(`[${this.stringify(x)}].concat(${this.types.vec3.call(this, y, z, w)})`, [x, y, y, y], type);
		}

		//vec4(float, float, vecN)
		if (this.types[zType].length > 1) {
			return this.createTypeResult(`[${this.stringify(x)}].concat(${this.stringify(y)}, ${this.types.vec2.call(this, z)})`, [x, y, z, z], type);
		}

		return this.createTypeResult(`[${[x,y,z,w].map(this.stringify, this).join(', ')}]`, [x, y, z, w], type);
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
		var x0 = arguments[0];
		var y0 = arguments[1];
		var x1 = arguments[2];
		var y1 = arguments[3];
		return this.createTypeResult(
			`[${[x0, y0, x1, y1].map(this.stringify, this).join(', ')}]`,
			[x0, y0, x1, y1], 'vec2');
	};

	//ensure at least identity matrix
	if (v0 == null) v0 = 1;

	var v0Type = this.getType(v0);
	var v1Type = this.getType(v1);

	//mat2(float) → identity matrix
	if (this.types[v0Type].length === 1) {
		var res = this.createTypeResult(
			`mat2(${this.stringify(v0)})`,
			[
				v0, 0,
				0, v0
			], 'vec2', 'mat2');
		return res;
	}

	//mat2(mat2)
	if (v0Type === 'mat2') {
		return this.createTypeResult(this.stringify(v0), this.getComponents(v0), 'vec2');
	}

	//mat(vec, vec)
	return this.createTypeResult(`${this.types.vec2.call(this, v0)}.concat(${this.types.vec2.call(this, v1)})`, [v0, v0, v1, v1], 'vec2');
}
mat2.type = 'vec2';

function mat3 (v0, v1, v2) {
	//mat2(x0, y0, z0, x1, y1, z1, x2, y2, z2)
	if (arguments.length >= 9) {
		var x0 = arguments[0];
		var y0 = arguments[1];
		var z0 = arguments[2];
		var x1 = arguments[3];
		var y1 = arguments[4];
		var z1 = arguments[5];
		var x2 = arguments[6];
		var y2 = arguments[7];
		var z2 = arguments[8];
		return this.createTypeResult(
			`[${[x0, y0, z0, x1, y1, z1, x2, y2, z2].map(this.stringify, this).join(', ')}]`,
			[x0, y0, z0, x1, y1, z1, x2, y2, z2], 'vec3');
	};

	//ensure at least identity matrix
	if (v0 == null) v0 = 1;

	var v0Type = this.getType(v0);
	var v1Type = this.getType(v1);
	var v2Type = this.getType(v2);

	//mat3(float) → identity matrix
	if (this.types[v0Type].length === 1) {
		var res = this.createTypeResult(
			`mat3(${this.stringify(v0)})`,
			[
				v0, 0, 0,
				0, v0, 0,
				0, 0, v0
			], 'vec3', 'mat3');
		return res;
	}

	//mat3(mat2)
	if (v0Type === 'mat2') {
		return this.createTypeResult(`${this.stringify(v0)}.slice(0, 2).concat(0, ${this.stringify(v0)}.slice(2), 0, 0, 0, 1)`,
			[
			this.getComponent(v0, 0), this.getComponent(v0, 1), 0,
			this.getComponent(v0, 2), this.getComponent(v0, 3), 0,
			0, 0, 1
			], 'vec3');
	}

	//mat3(mat3)
	if (v0Type === 'mat3') {
		return this.createTypeResult(this.stringify(v0), this.getComponents(v0), 'vec3');
	}

	//mat3(mat4)
	if (v0Type === 'mat4') {
		var components = this.getComponents(v0);
		return this.createTypeResult(`${this.stringify(v0)}.filter(function (x, i) { return i % 4 !== 3 && i < 12; })`, components.slice(0, 3).concat(components.slice(4, 7), components.slice(8, 11)), 'vec3');
	}

	//mat(vec, vec, vec)
	return this.createTypeResult(`${this.types.vec3.call(this, v0)}.concat(${this.types.vec3.call(this, v1)}, ${this.types.vec3.call(this, v2)})`, [v0, v0, v0, v1, v1, v1, v2, v2, v2], 'vec3');
}
mat3.type = 'vec3';

function mat4 (v0, v1, v2, v3) {
	//mat2(x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3)
	if (arguments.length >= 16) {
		var x0 = arguments[0];
		var y0 = arguments[1];
		var z0 = arguments[2];
		var w0 = arguments[3];
		var x1 = arguments[4];
		var y1 = arguments[5];
		var z1 = arguments[6];
		var w1 = arguments[7];
		var x2 = arguments[8];
		var y2 = arguments[9];
		var z2 = arguments[10];
		var w2 = arguments[11];
		var x3 = arguments[12];
		var y3 = arguments[13];
		var z3 = arguments[14];
		var w3 = arguments[15];

		return this.createTypeResult(
			`[${[x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3].map(this.stringify, this).join(', ')}]`,
			[x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3], 'vec4');
	};

	//ensure at least identity matrix
	if (v0 == null) v0 = 1;

	var v0Type = this.getType(v0);
	var v1Type = this.getType(v1);
	var v2Type = this.getType(v2);
	var v3Type = this.getType(v3);

	//mat(float) → identity matrix
	if (this.types[v0Type].length === 1) {
		var res = this.createTypeResult(
			`mat4(${this.stringify(v0)})`,
			[
				v0, 0, 0, 0,
				0, v0, 0, 0,
				0, 0, v0, 0,
				0, 0, 0, v0
			], 'vec4', 'mat4');
		return res;
	}

	//mat4(mat2)
	if (v0Type === 'mat2') {
		return this.createTypeResult(`${this.stringify(v0)}.slice(0, 2).concat(0, 0, ${this.stringify(v0)}.slice(2, 4), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)`,
			[
			this.getComponent(v0, 0), this.getComponent(v0, 1), 0, 0,
			this.getComponent(v0, 2), this.getComponent(v0, 3), 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
			], 'vec3');
	}

	//mat4(mat3)
	if (v0Type === 'mat3') {
		var components = this.getComponents(v0);
		return this.createTypeResult(`${this.stringify(v0)}.slice(0, 3).concat(0, ${this.stringify(v0)}.slice(3, 6), 0, ${this.stringify(v0)}.slice(6, 9), 0, 0, 0, 0, 1)`,
			components.slice(0, 3).concat(0, components.slice(3, 6), 0, components.slice(6, 9), 0, 0, 0, 0, 1), 'vec3');
	}

	//mat(vec, vec, vec, vec)
	return this.createTypeResult(`${this.types.vec4.call(this, v0)}.concat(${this.types.vec4.call(this, v1)}, ${this.types.vec4.call(this, v2)}, ${this.types.vec4.call(this, v3)})`, [v0, v0, v0, v0, v1, v1, v1, v1, v2, v2, v2, v2, v3, v3, v3, v3], 'vec4');
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