/**
 * Type constructors.
 *
 * If type is detected in the code, like `float[2](1, 2, 3)` or `vec3(vec2(), 1)`,
 * the according function will be called and type is stringified as the return.
 *
 * The arguments are arg nodes, so that we can detect the type of the args
 * to do like mat2(vec2, vec2) etc.
 */

exports.void = function () {
	return '';
}
exports.bool = function bool (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return !!node;

	var type = this.getType(node);
	if (this.types[type].length > 1) return `${this.stringify[node]}[0]`;

	return this.stringify(node);
}

function num (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return +node|0;

	var type = this.getType(node);
	if (this.types[type].length > 1) return `${this.stringify[node]}[0]`;

	return this.stringify(node);
}

exports.int =
exports.uint =
exports.byte =
exports.short =
exports.float =
exports.double =
num;



function vec2 (x, y) {
	//vec2(*) → vec2(*, *)
	if (x == null) x = 0;
	if (y == null) y = x;

	var xType = this.getType(x);
	var yType = this.getType(y);

	//vec2(vec2) → vec2
	if (this.types[xType].length === 2) return this.stringify(x);

	//vec2(vec3) → vec3.slice(0, 2)
	if (this.types[xType].length > 2) return `${this.stringify(x)}.slice(0, 2)`;

	//vec2(*, *) → [*, *]
	return '[' + [x,y].map(this.stringify, this).join(', ') + ']';
}

function vec3 (x, y, z) {
	//vec3(*) → vec3(*, *, *)
	if (x == null) x = 0;
	if (y == null) y = x;
	if (z == null) z = y;

	var xType = this.getType(x);
	var yType = this.getType(y);
	var zType = this.getType(z);

	//vec3(vec3) → vec3
	if (this.types[xType].length === 3) return this.stringify(x);

	//vec3(vecN) → vecN.slice(0, 3)
	if (this.types[xType].length > 3) return `${this.stringify(x)}.slice(0, 3)`;

	//vec3(vec2, *) → vec2.concat(*)
	if (this.types[xType].length === 2) {
		return `${this.stringify(x)}.concat(${this.types.float.call(this, y)})`;
	}

	//vec3(float, vecN) → [float].concat(vecN.slice(0,2));
	if (this.types[yType].length > 1) {
		return `[${this.stringify(x)}].concat(${this.types.vec2.call(this, y, z)})`
	}

	return '[' + [x,y,z].map(this.stringify, this).join(', ') + ']';
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

	//vec4(matN) → matN.slice(0, 4)
	if (this.types[xType].length > 4) return `${this.stringify(x)}.slice(0, 4)`;

	//vec4(vec4) → vec4
	if (this.types[xType].length === 4) return this.stringify(x);

	//vec4(vec3, *) → vec3.concat(*)
	if (this.types[xType].length === 3) {
		return `${this.stringify(x)}.concat(${this.types.float.call(this, y)})`;
	}

	//vec4(vec2, *) → vec2.concat(*)
	if (this.types[xType].length === 2) {
		return `${this.stringify(x)}.concat(${this.types.vec2.call(this, y, z)})`;
	}

	//vec4(float, *) → [float].concat(*)
	if (this.types[xType].length === 2) {
		return `[${this.stringify(x)}].concat(${this.types.vec3.call(this, y, z, w)})`;
	}

	return '[' + [x,y,z,w].map(this.stringify, this).join(', ') + ']';
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