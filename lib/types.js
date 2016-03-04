/**
 * Type constructors.
 *
 * If type is detected in the code, like `float[2](1, 2, 3)` or `vec3(vec2(), 1)`,
 * the according function will be called and type is stringified as the return.
 *
 * The arguments are nodes, so that we can detect the type of the args
 * to do like mat2(vec2, vec2) etc.
 *
 * Also types save components access, in optimisation purposes.
 * So after you can call `node._components[n]` for getting shorten stringified version.
 */



exports.void = function () {
	return '';
}
exports.bool = function bool (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return +(!!node);

	var type = this.getType(node);
	if (this.types[type].length > 1) return this.getComponent(node, 0);

	return this.stringify(node);
}

function num (node) {
	if (node == null) return 0;
	if (typeof node !== 'object') return +node|0;

	var type = this.getType(node);
	if (this.types[type].length > 1) return this.getComponent(node, 0);

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

	var components = [];

	//vec2(vec2) → vec2
	if (this.types[xType].length === 2) {
		return result(this.stringify(x), this.getComponent(x, 0), this.getComponent(x, 1));
	}

	//vec2(vec3) → vec3.slice(0, 2)
	if (this.types[xType].length > 2) {
		return result(`${this.stringify(x)}.slice(0, 2)`, this.getComponent(x, 0), this.getComponent(x, 1));
	};

	//vec2(complex, complex) → [0, 0].fill(complex)
	if (x === y && this.complexity(x) > 5) {
		return result(`[0, 0].fill(${this.stringify(x)})`, this.getComponent(x, 0), this.getComponent(y, 0));
	}

	//vec2(simple, simple) → [simple, simple]
	return result(`[${[x,y].map(this.stringify, this).join(', ')}]`, this.getComponent(x, 0), this.getComponent(y, 0));
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
		return result(this.stringify(x), this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(x, 2));
	}

	//vec3(vecN) → vecN.slice(0, 3)
	if (this.types[xType].length > 3) {
		return result(`${this.stringify(x)}.slice(0, 3)`, this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(x, 2));
	}

	//vec3(vec2, *) → vec2.concat(*)
	if (this.types[xType].length === 2) {
		return result(`${this.stringify(x)}.concat(${this.types.float.call(this, y)})`, this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(y, 0));
	}

	//vec3(float, vecN) → [float].concat(vecN.slice(0,2));
	if (this.types[yType].length > 1) {
		return result(`[${this.stringify(x)}].concat(${this.types.vec2.call(this, y, z)})`, this.getComponent(x, 0), this.getComponent(y, 0), this.getComponent(y, 1));
	}

	return result(`[${[x,y,z].map(this.stringify, this).join(', ')}]`, this.getComponent(x, 0), this.getComponent(y, 0), this.getComponent(z, 0));
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
		return result(`${this.stringify(x)}.slice(0, 4)`, this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(x, 2), this.getComponent(x, 3));
	}

	//vec4(vec4) → vec4
	if (this.types[xType].length === 4) {
		return result(this.stringify(x), this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(x, 2), this.getComponent(x, 3));
	}

	//vec4(vec3, *) → vec3.concat(*)
	if (this.types[xType].length === 3) {
		return result(`${this.stringify(x)}.concat(${this.types.float.call(this, y)})`, this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(x, 2), this.getComponent(y, 0));
	}

	//vec4(vec2, *) → vec2.concat(*)
	if (this.types[xType].length === 2) {
		//vec4(vec2, vecN)
		if (this.types[yType].length > 1) {
			return result(`${this.stringify(x)}.concat(${this.types.vec2.call(this, y)})`, this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(y, 0), this.getComponent(y, 1));
		}
		//vec4(vec2, float, float)
		return result(`${this.stringify(x)}.concat(${this.types.vec2.call(this, y, z)})`, this.getComponent(x, 0), this.getComponent(x, 1), this.getComponent(y, 0), this.getComponent(z, 0));
	}

	//vec4(float, vec2, *)
	if (this.types[yType].length === 2) {
		return result(`[${this.stringify(x)}].concat(${this.types.vec2.call(this, y)}, ${this.types.float.call(this, z)})`, this.getComponent(x, 0), this.getComponent(y, 0), this.getComponent(y, 1), this.getComponent(z, 0));
	}

	//vec4(float, vecN)
	if (this.types[yType].length > 2) {
		return result(`[${this.stringify(x)}].concat(${this.types.vec3.call(this, y, z, w)})`,this.getComponent(x, 0), this.getComponent(y, 0), this.getComponent(y, 1), this.getComponent(y, 2));
	}

	//vec4(float, float, vecN)
	if (this.types[zType].length > 1) {
		return result(`[${this.stringify(x)}].concat(${this.stringify(y)}, ${this.types.vec2.call(this, z)})`, this.getComponent(x, 0), this.getComponent(y, 0), this.getComponent(z, 0), this.getComponent(z, 1));
	}

	return result(`[${[x,y,z,w].map(this.stringify, this).join(', ')}]`, this.getComponent(x, 0), this.getComponent(y, 0), this.getComponent(z, 0), this.getComponent(w, 0));

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


/** Construct result string, containing components */
function result (main, x, y, z, w) {
	var res = new String(main);
	res.components = [];
	if (x != null) res.components[0] = x;
	if (y != null) res.components[1] = y;
	if (z != null) res.components[2] = z;
	if (w != null) res.components[3] = w;
	return res;
}