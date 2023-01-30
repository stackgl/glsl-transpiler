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
 * @module  glsl-transpiler/lib/types
 */


import Descriptor from './descriptor.js';

const Types = {}

// null type means any type
// we keep single argument for float operations complacency
// that means by default that undefined types are treated as floats
// FIXME that can be wrong in general, but easier to read
Types.null = function (n) {}


var floatRE = /^-?[0-9]*(?:.[0-9]+)?(?:e-?[0-9]+)?$/i;

Types.void = function () {
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

Types.bool = bool;


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

Types.int =
Types.uint =
Types.byte =
Types.short = int;


function float (node) {
	if (node == null) return Descriptor(0, {type: 'float', complexity: 0});

	var result;

	if (node instanceof String) {
		if (node.components) {
			result = node.components[0];
		}
		else {
			result = node;
		}
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

Types.float =
Types.double = float;

function createVec2 (type, vecType) {
	vec2.type = type;
	function vec2 (x, y) {
		//vec2(*) → vec2(*, *)
		if (x == null) x = 0;
		if (y == null) y = x;

		var x = this.process(x);
		var y = this.process(y);

		var components = [], map = ``, include;

		//map type, if input args are of diff type (unlikely required)
		if (x.components && y.components) {
			if (!subType(x.components[0].type, type) || !subType(y.components[0].type, type)) {
				map = `.map(${type})`;
				include = type;
			}
		}

		//vec2(vec2) → vec2
		if (this.types[x.type].length === 2) {
			return x;
		}

		//vec2(vec3) → vec3.slice(0, 2)
		if (this.types[x.type].length > 2) {
			return Descriptor(`${x}.slice(0, 2)${map}`, {
				components: x.components && x.components.slice(0, 2).map(this.types[type], this),
				type: vecType,
				complexity: x.complexity + 2,
				include: include
			});
		};

		//vec2(float) → [0, 0].fill(float)
		if (x === y) {
			return Descriptor(`[0, 0].fill(${x})${map}`, {
				complexity: x.complexity + 2,
				components: [x, y].map(this.types[type], this),
				type: vecType,
				include: include
			});
		}

		//vec2(simple, simple) → [simple, simple]
		return Descriptor(`[${[x,y].join(', ')}]${map}`, {
			components: [x, y].map(this.types[type], this),
			type: vecType,
			complexity: x.complexity + y.complexity,
			include: include
		});
	}
	return vec2;
};

function createVec3 (type, vecType) {
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
		if (x.components && (!subType(x.components[0].type, type)  || !subType(y.components[0].type, type)  || !subType(z.components[0].type, type))) {
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
				type: vecType,
				complexity: x.complexity + 3 + 3,
				include: include
			});
		}

		//vec3(vec2, *) → vec2.concat(*)
		if (this.types[x.type].length === 2) {
			return Descriptor(`${x}.concat(${this.types.float.call(this, y)})${map}`, {
				components: x.components.concat(y.components[0]).map(this.types[type], this),
				type: vecType,
				complexity: x.complexity + y.complexity + 3,
				include: include
			});
		}

		//vec3(float, vecN) → [float].concat(vecN.slice(0,2));
		if (this.types[y.type].length > 1) {
			return Descriptor(`[${x}].concat(${this.types.vec2.call(this, y, z)})${map}`, {
				components: [x].concat(y.components.slice(0, 2)).map(this.types[type], this),
				type: vecType,
				complexity: x.complexity + y.complexity + z.complexity + 3,
				include: include
			});
		}

		return Descriptor(`[${[x,y,z].join(', ')}]${map}`, {
			components: [x, y, z].map(this.types[type], this),
			type: vecType,
			complexity: x.complexity + y.complexity + z.complexity + 3,
			include: include
		});
	}
	return vec3;
};

function createVec4 (type, vecType) {
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
		if (!subType(x.components[0].type, type)  || !subType(y.components[0].type, type)  || !subType(z.components[0].type, type)  || !subType(w.components[0].type, type) ) {
			map = `.map(${type})`;
			include = type;
		}

		//vec4(matN)
		if (/mat/.test(x.type)) {
			return Descriptor(x, {
				components: x.components.map(this.types[type], this),
				type: vecType,
				include: include
			});
		}

		//vec4(vecN) → vecN.slice(0, 4)
		if (this.types[x.type].length > 4) {
			return Descriptor(`${x}.slice(0, 4)${map}`, {
				components: x.components.slice(0, 4).map(this.types[type], this),
				type: vecType,
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
				type: vecType,
				include: include
			});
		}

		//vec4(vec2, *) → vec2.concat(*)
		if (this.types[x.type].length === 2) {
			//vec4(vec2, vecN)
			if (this.types[y.type].length > 1) {
				return Descriptor(`${x}.concat(${this.types.vec2.call(this, y)})${map}`, {
					components: x.components.concat(y.components.slice(0, 2)).map(this.types[type], this),
					type: vecType,
					include: include
				});
			}

			//vec4(vec2, float, float)
			var res = Descriptor(
				`${x}.concat(${this.types.vec2.call(this, y, z)})${map}`, {
					components: x.components.concat(y.components[0], z.components[0]).map(this.types[type], this),
					type: vecType,
					include: include
				});
			return res;
		}

		//vec4(float, vec2, *)
		if (this.types[y.type].length === 2) {
			return Descriptor(`[${x}].concat(${this.types.vec2.call(this, y)}, ${this.types.float.call(this, z)})${map}`, {
				components: x.components.concat(y.components, z.components[0]).map(this.types[type], this),
				type: vecType,
				include: include
			});
		}

		//vec4(float, vecN)
		if (this.types[y.type].length > 2) {
			return Descriptor(`[${x}].concat(${this.types.vec3.call(this, y, z, w)})${map}`, {
				components: x.components.concat(y.components.slice(0, 3)).map(this.types[type], this),
				type: vecType,
				include: include
			});
		}

		//vec4(float, float, vecN)
		if (this.types[z.type].length > 1) {
			return Descriptor(`[${x}].concat(${y}, ${this.types.vec2.call(this, z)})${map}`, {
				components: x.components.concat(y.components[0], z.components.slice(0, 2)).map(this.types[type], this),
				type: vecType,
				include: include
			});
		}

		return Descriptor(`[${[x,y,z,w].join(', ')}]${map}`, {
			components: [x, y, z, w].map(this.types[type], this),
			type: vecType,
			include: include
		});
	}
	return vec4;
}

Types.ivec2 = createVec2('int', 'ivec2');
Types.uvec2 = createVec2('uint', 'uvec2');
Types.bvec2 = createVec2('bool', 'bvec2');
Types.dvec2 = createVec2('double', 'dvec2');
Types.vec2 = createVec2('float', 'vec2');

Types.ivec3 = createVec3('int', 'ivec3');
Types.uvec3 = createVec3('uint', 'uvec3');
Types.bvec3 = createVec3('bool', 'bvec3');
Types.dvec3 = createVec3('double', 'dvec3');
Types.vec3 = createVec3('float', 'vec3');

Types.ivec4 = createVec4('int', 'ivec4');
Types.uvec4 = createVec4('uint', 'uvec4');
Types.bvec4 = createVec4('bool', 'bvec4');
Types.dvec4 = createVec4('double', 'dvec4');
Types.vec4 = createVec4('float', 'vec4');


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
		var comps = [x0, y0, x1, y1];
		return Descriptor(
			`[${comps.join(', ')}]`, {
			components: comps,
			type: 'mat2',
			complexity: cmpl(comps)
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
			].map(float, this),
			type: 'mat2',
			complexity: v0.complexity * 2 + 2,
			include: 'mat2'
		});
		return res;
	}

	//mat2(mat2)
	if (v0.type === 'mat2') {
		return v0;
	}

	//mat(vec, vec)
	var comps = v0.components.slice(0,2).concat(v1.components.slice(0,2));
	return Descriptor(`${this.types.vec2.call(this, v0)}.concat(${this.types.vec2.call(this, v1)})`, {
		components: comps.map(float, this),
		complexity: cmpl(comps),
		type: 'mat2'
	});
}
mat2.type = 'vec2';

function mat3 (v0, v1, v2) {
	//mat3(x0, y0, z0, x1, y1, z1, x2, y2, z2)
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
		var comps = [x0, y0, z0, x1, y1, z1, x2, y2, z2];
		return Descriptor(
			`[${comps.join(', ')}]`, {
			components: comps,
			type: 'mat3',
			complexity: cmpl(comps)
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
			].map(float, this),
			type: 'mat3',
			include: 'mat3',
			complexity: v0.complexity * 3 + 6
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
			].map(float, this),
			type: 'mat3',
			complexity: 9 * 3 + v0.complexity
		});
	}

	//mat3(mat3)
	if (v0.type === 'mat3') {
		return v0;
	}

	//mat3(mat4)
	if (v0.type === 'mat4') {
		var components = v0.components;
		return Descriptor(`${v0}.filter(function (x, i) { return i % 4 !== 3 && i < 12; })`, {
			components: components.slice(0, 3).concat(components.slice(4, 7), components.slice(8, 11)).map(float, this),
			type: 'mat3',
			complexity: 16 * 3 + v0.complexity
		});
	}

	//mat(vec, vec, vec)
	var comps = v0.components.slice(0,3).concat(v1.components.slice(0,3), v2.components.slice(0,3));
	var res = Descriptor(`${this.types.vec3.call(this, v0)}.concat(${this.types.vec3.call(this, v1)}, ${this.types.vec3.call(this, v2)})`, {
		components: comps.map(float, this),
		type: 'mat3',
		complexity: cmpl(comps)
	});
	return res;
}
mat3.type = 'vec3';

function mat4 (v0, v1, v2, v3) {
	//mat4(x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3)
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
		var comps = [x0, y0, z0, w0, x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3];

		return Descriptor(
			`[${comps.join(', ')}]`, {
			components: comps,
			type: 'mat4',
			complexity: cmpl(comps)
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
			].map(float, this),
			type: 'mat4',
			include: 'mat4',
			complexity: v0.complexity * 4 + 12
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
			].map(float, this),
			type: 'mat4',
			complexity: 16 * 3 + v0.complexity
		});
	}

	//mat4(mat3)
	if (v0.type === 'mat3') {
		var components = v0.components;
		return Descriptor(
			`[0,1,2,null,3,4,5,null,6,7,8,null,null,null,null,-1].map(function (i) {return i == null ? 0 : i < 0 ? -i : this[i]}, ${v0})`, {
			components: components.slice(0, 3).concat(0, components.slice(3, 6), 0, components.slice(6, 9), 0, 0, 0, 0, 1).map(float, this),
			type: 'mat4',
			complexity: 16 * 3 + v0.complexity
		});
	}

	//mat(vec, vec, vec, vec)
	var comps = v0.components.slice(0, 4).concat(v1.components.slice(0, 4), v2.components.slice(0, 4), v3.components.slice(0,4));
	return Descriptor(`${this.types.vec4.call(this, v0)}.concat(${this.types.vec4.call(this, v1)}, ${this.types.vec4.call(this, v2)}, ${this.types.vec4.call(this, v3)})`, {
		components: comps.map(float, this),
		type: 'mat4',
		complexity: cmpl(comps)
	});
}
mat4.type = 'vec4';


//helper to calc complexity of a list of components
function cmpl (comps) {
	if (Array.isArray(comps)) {
		var sum = 0;
		for (var i = 0; i < comps.length; i++) {
			sum += comps[i].complexity || 0;
		}
		return sum;
	}
	else return comps.complexity;
}

//helper to calc simple types priority
//@ref 4.1.10 Implicit Conversions in https://www.opengl.org/registry/doc/GLSLangSpec.4.40.pdf
function subType (subType, genType) {
	subType += '';
	genType += '';
	if (subType === genType) return true;
	var typePriority = ['double', 'float', 'int', 'uint'];
	var subIdx = typePriority.indexOf(subType);
	var genIdx = typePriority.indexOf(genType);
	if (subIdx >= 0 && genIdx >= 0 && subIdx >= genIdx) return true;
	return false;
}


Types.mat2 = mat2;
Types.mat3 = mat3;
Types.mat4 = mat4;
Types.mat2x2 = mat2;
Types.mat3x3 = mat3;
Types.mat4x4 = mat4;
// Types.mat2x3 = mat2x3;
// Types.mat2x4 = mat2x4;
// Types.mat3x2 = mat3x2;
// Types.mat3x4 = mat3x4;
// Types.mat4x2 = mat4x2;
// Types.mat4x3 = mat4x3;
Types.dmat2 = mat2;
Types.dmat3 = mat3;
Types.dmat4 = mat4;
Types.dmat2x2 = mat2;
Types.dmat3x3 = mat3;
Types.dmat4x4 = mat4;
// Types.dmat2x3 = mat2x3;
// Types.dmat2x4 = mat2x4;
// Types.dmat3x2 = mat3x2;
// Types.dmat3x4 = mat3x4;
// Types.dmat4x2 = mat4x2;
// Types.dmat4x3 = mat4x3;



function createSampler (type, samplerType) {
	sampler.type = type;
	function sampler () {
		var name = arguments[0];
		return Descriptor(null, {
			type: samplerType,
			include: 'texture2D',
			complexity: 999
		});
	}
	return sampler;
}



Types.sampler1D = createSampler('vec4', 'sampler1D');
Types.image1D = createSampler('vec4', 'image1D');
Types.sampler2D = createSampler('vec4', 'sampler2D');
Types.image2D = createSampler('vec4', 'image2D');
Types.sampler3D = createSampler('vec4', 'sampler3D');
Types.image3D = createSampler('vec4', 'image3D');
Types.samplerCube = createSampler('vec4', 'samplerCube');
Types.imageCube = createSampler('vec4', 'imageCube');
Types.sampler2DRect = createSampler('vec4', 'sampler2DRect');
Types.image2DRect = createSampler('vec4', 'image2DRect');
Types.sampler1DArray = createSampler('vec4', 'sampler1DArray');
Types.image1DArray = createSampler('vec4', 'image1DArray');
Types.sampler2DArray = createSampler('vec4', 'sampler2DArray');
Types.image2DArray = createSampler('vec4', 'image2DArray');
// Types.samplerBuffer =
// Types.imageBuffer =
// Types.sampler2DMS =
// Types.image2DMS =
// Types.sampler2DMSArray =
// Types.image2DMSArray =
// Types.samplerCubeArray =
// Types.imageCubeArray =
Types.sampler1DShadow = createSampler('float', 'sampler1DShadow');
Types.sampler2DShadow = createSampler('float', 'sampler2DShadow');
Types.sampler2DRectShadow = createSampler('float', 'sampler2DRectShadow');
Types.sampler1DArrayShadow = createSampler('float', 'sampler1DArrayShadow');
Types.sampler2DArrayShadow = createSampler('float', 'sampler2DArrayShadow');
Types.samplerCubeShadow = createSampler('float', 'samplerCubeShadow');
Types.samplerCubeArrayShadow = createSampler('float', 'samplerCubeArrayShadow');
Types.isampler1D = createSampler('ivec4', 'isampler1D');
Types.iimage1D = createSampler('ivec4', 'iimage1D');
Types.isampler2D = createSampler('ivec4', 'isampler2D');
Types.iimage2D = createSampler('ivec4', 'iimage2D');
Types.isampler3D = createSampler('ivec4', 'isampler3D');
Types.iimage3D = createSampler('ivec4', 'iimage3D');
Types.isamplerCube = createSampler('ivec4', 'isamplerCube');
Types.iimageCube = createSampler('ivec4', 'iimageCube');
// Types.isampler2DRect =
// Types.iimage2DRect =
// Types.isampler1DArray =
// Types.iimage1DArray =
// Types.isampler2DArray =
// Types.iimage2DArray =
// Types.isamplerBuffer =
// Types.iimageBuffer =
// Types.isampler2DMS =
// Types.iimage2DMS =
// Types.isampler2DMSArray =
// Types.iimage2DMSArray =
// Types.isamplerCubeArray =
// Types.iimageCubeArray =
// Types.usampler1D = createSampler('uvec4', 'usampler1D');
// Types.uimage1D = createSampler('uvec4', 'uimage1D');
// Types.usampler2D = createSampler('uvec4', 'usampler2D');
// Types.uimage2D = createSampler('uvec4', 'uimage2D');
// Types.usampler3D = createSampler('uvec4', 'usampler3D');
// Types.uimage3D = createSampler('uvec4', 'uimage3D');
// Types.usamplerCube = createSampler('uvec4', 'usamplerCube');
// Types.uimageCube = createSampler('uvec4', 'uimageCube');
// Types.usampler2DRect =
// Types.uimage2DRect =
// Types.usampler1DArray =
// Types.uimage1DArray =
// Types.usampler2DArray =
// Types.uimage2DArray =
// Types.usamplerBuffer =
// Types.uimageBuffer =
// Types.usampler2DMS =
// Types.uimage2DMS =
// Types.usampler2DMSArray =
// Types.uimage2DMSArray =
// Types.usamplerCubeArray =
// Types.uimageCubeArray = sampler;
// Types.atomic_uint =


export default Types