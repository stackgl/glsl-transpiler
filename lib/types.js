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
 * So after you can call `getComponent(node, idx)` for getting shorten stringified version.
 *
 * @module  glsl-js/lib/types
 */



exports.void = function () {
	return '';
}
exports.bool = function bool (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return !!node;

	var type = this.getType(node);
	if (this.types[type] && this.types[type].length > 1) return this.getComponent(node, 0);

	var result = this.stringify(node);

	return !!parseFloat(result);
}

exports.int =
exports.uint =
exports.byte =
exports.short = function int (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return +node|0;

	var type = this.getType(node);
	if (this.types[type] && this.types[type].length > 1) return this.getComponent(node, 0);

	var str = this.stringify(node);
	var result = parseFloat(str);

	if (!isNaN(result)) {
		result = result|0;
	} else {
		result = str;
	}

	return result;
}

exports.float =
exports.double = function float (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return +node;

	var type = this.getType(node);
	if (this.types[type] && this.types[type].length > 1) return this.getComponent(node, 0);

	return this.stringify(node);
}



function vec2 (x, y) {
	//vec2(*) → vec2(*, *)
	if (x == null) x = 0;
	if (y == null) y = x;

	var xType = this.getType(x);
	var yType = this.getType(y);

	var components = [];

	//vec2(vec2) → vec2
	if (this.types[xType].length === 2) {
		return this.createTypeResult(this.stringify(x), [x, x]);
	}

	//vec2(vec3) → vec3.slice(0, 2)
	if (this.types[xType].length > 2) {
		return this.createTypeResult(`${this.stringify(x)}.slice(0, 2)`, [x, x]);
	};

	//vec2(complex, complex) → [0, 0].fill(complex)
	if (x === y && this.complexity(x) > 5) {
		return this.createTypeResult(`[0, 0].fill(${this.stringify(x)})`, [x, y]);
	}

	//vec2(simple, simple) → [simple, simple]
	return this.createTypeResult(`[${[x,y].map(this.stringify, this).join(', ')}]`, [x, y]);
}

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
		return this.createTypeResult(this.stringify(x), [x, x, x]);
	}

	//vec3(vecN) → vecN.slice(0, 3)
	if (this.types[xType].length > 3) {
		return this.createTypeResult(`${this.stringify(x)}.slice(0, 3)`, [x, x, x]);
	}

	//vec3(vec2, *) → vec2.concat(*)
	if (this.types[xType].length === 2) {
		return this.createTypeResult(`${this.stringify(x)}.concat(${this.types.float.call(this, y)})`, [x, x, y]);
	}

	//vec3(float, vecN) → [float].concat(vecN.slice(0,2));
	if (this.types[yType].length > 1) {
		return this.createTypeResult(`[${this.stringify(x)}].concat(${this.types.vec2.call(this, y, z)})`, [x, y, y]);
	}

	return this.createTypeResult(`[${[x,y,z].map(this.stringify, this).join(', ')}]`, [x, y, z]);
}

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

	//vec4(matN) → matN.slice(0, 4)
	if (this.types[xType].length > 4) {
		return this.createTypeResult(`${this.stringify(x)}.slice(0, 4)`, [x, x, x, x]);
	}

	//vec4(vec4) → vec4
	if (this.types[xType].length === 4) {
		return this.createTypeResult(this.stringify(x), [x, x, x, x]);
	}

	//vec4(vec3, *) → vec3.concat(*)
	if (this.types[xType].length === 3) {
		return this.createTypeResult(`${this.stringify(x)}.concat(${this.types.float.call(this, y)})`, [x, x, x, y]);
	}

	//vec4(vec2, *) → vec2.concat(*)
	if (this.types[xType].length === 2) {
		//vec4(vec2, vecN)
		if (this.types[yType].length > 1) {
			return this.createTypeResult(`${this.stringify(x)}.concat(${this.types.vec2.call(this, y)})`, [x, x, y, y]);
		}

		//vec4(vec2, float, float)
		return this.createTypeResult(
			`${this.stringify(x)}.concat(${this.types.vec2.call(this, y, z)})`, [x, x, y, z]);
	}

	//vec4(float, vec2, *)
	if (this.types[yType].length === 2) {
		return this.createTypeResult(`[${this.stringify(x)}].concat(${this.types.vec2.call(this, y)}, ${this.types.float.call(this, z)})`, [x, y, y, z]);
	}

	//vec4(float, vecN)
	if (this.types[yType].length > 2) {
		return this.createTypeResult(`[${this.stringify(x)}].concat(${this.types.vec3.call(this, y, z, w)})`, [x, y, y, y]);
	}

	//vec4(float, float, vecN)
	if (this.types[zType].length > 1) {
		return this.createTypeResult(`[${this.stringify(x)}].concat(${this.stringify(y)}, ${this.types.vec2.call(this, z)})`, [x, y, z, z]);
	}

	return this.createTypeResult(`[${[x,y,z,w].map(this.stringify, this).join(', ')}]`, [x, y, z, w]);

}


exports.ivec3 =
exports.bvec3 =
exports.dvec3 =
exports.vec3 = vec3

exports.ivec2 =
exports.bvec2 =
exports.dvec2 =
exports.vec2 = vec2;

exports.ivec4 =
exports.bvec4 =
exports.dvec4 =
exports.vec4 = vec4;


//OpenGL types @ref https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
// extend(exports, {
// 	void: noop,
// 	bool: bool,
// 	int: int,
// 	uint: int,
// 	float: float,
// 	double: float,
// 	vec2: vec2,
// 	vec3: vec3,
// 	vec4: vec4,
// 	dvec2: vec2,
// 	dvec3: vec3,
// 	dvec4: vec4,
// 	bvec2:	bvec2,
// 	bvec3: bvec3,
// 	bvec4: bvec4,
// 	ivec2: ivec2,
// 	ivec3: ivec3,
// 	ivec4: ivec4,
// 	uvec2: ivec2,
// 	uvec3: ivec3,
// 	uvec4: ivec4,
// 	mat2: mat2,
// 	mat3: mat3,
// 	mat4: mat4,
// 	mat2x2: mat2,
// 	mat2x3: mat2x3,
// 	mat2x4: mat2x4,
// 	mat3x2: mat3x2,
// 	mat3x3: mat3,
// 	mat3x4: mat3x4,
// 	mat4x2: mat4x2,
// 	mat4x3: mat4x3,
// 	mat4x4: mat4,
// 	dmat2: mat2,
// 	dmat3: mat3,
// 	dmat4: mat4,
// 	dmat2x2: mat2,
// 	dmat2x3: mat2x3,
// 	dmat2x4: mat2x4,
// 	dmat3x2: mat3x2,
// 	dmat3x3: mat3,
// 	dmat3x4: mat3x4,
// 	dmat4x2: mat4x2,
// 	dmat4x3: mat4x3,
// 	dmat4x4: mat4,
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