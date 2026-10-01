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

const Types = Object.create(null)

// null type means any type
// we keep single argument for float operations complacency
// that means by default that undefined types are treated as floats
// FIXME that can be wrong in general, but easier to read
Types.null = function (n) { }


var floatRE = /^[-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?$/;

Types.void = function () {
	return '';
}

function bool(node) {
	if (node == null) return Descriptor(false, { type: 'bool', complexity: 0 });

	var result;

	//node passed
	if (node instanceof String) {
		result = node.components?.[0] || node;
	}
	else if (typeof node === 'object') {
		result = this.process(node);
		result = result.components?.[0] || result;
	}
	//string/value passed
	else {
		result = node;
	}

	//bool?
	if (result == 'true' || result === true) return Descriptor(true, { type: 'bool', complexity: 0 });
	if (result == 'false' || result === false) return Descriptor(false, { type: 'bool', complexity: 0 });

	//number/string?
	var num = floatRE.exec(result);

	//it was string - preserve complex argument
	if (num == null) {
		return Descriptor('!!(' + result + ')', { type: 'bool', complexity: result.complexity + 1 });
	}

	//cast number to bool
	return Descriptor(!!parseFloat(num), { type: 'bool', complexity: 0 });
}
bool.type = 'bool';

Types.bool = bool;


function int(node) {
	if (node == null) return Descriptor(0, { type: 'int', complexity: 0 });

	if (typeof node !== 'object') return Descriptor(+node | 0, { type: 'int', complexity: 0 });

	var result;

	//node?
	if (node instanceof String) {
		result = node.components?.[0] || node;
	}
	else if (typeof node === 'object') {
		result = this.process(node);
		result = result.components?.[0] || result;
	}
	//number/string/descriptor?
	else {
		result = node;
	}

	//bool?
	if (result == 'true' || result === true) return Descriptor(1, { type: 'int', complexity: 0 });
	if (result == 'false' || result === false) return Descriptor(0, { type: 'int', complexity: 0 });

	var num = floatRE.exec(result);

	//it was number
	if (num != null) {
		return Descriptor(+parseFloat(num) | 0, { type: 'int', complexity: 0 });
	}

	//it was string
	return Descriptor('(' + result + ')|0', { type: 'int', complexity: result.complexity });
}
int.type = 'int';

Types.int =
	Types.byte =
	Types.short = int;


function uint(node) {
	const value = node == null ? Descriptor(0) : this.process(node)
	const scalar = value.components?.[0] || value
	return Descriptor(isNaN(Number(scalar)) ? `(${scalar}) >>> 0` : Number(scalar) >>> 0, {
		type: 'uint', complexity: value.complexity, optimize: value.optimize
	})
}
uint.type = 'uint'
Types.uint = uint


function float(node) {
	if (node == null) return Descriptor(0, { type: 'float', complexity: 0 });

	var result;

	if (node instanceof String) {
		if (node.components) {
			result = node.components?.[0] || node;
		}
		else {
			result = node;
		}
	}
	else if (typeof node === 'object') {
		result = this.process(node);
		result = result.components?.[0] || result;
	}
	else {
		result = node;
	}

	//bool?
	if (result == 'true' || result === true) return Descriptor(1.0, { type: 'float', complexity: 0 });
	if (result == 'false' || result === false) return Descriptor(0.0, { type: 'float', complexity: 0 });

	var num = floatRE.exec(result);

	//it was number
	if (num != null) {
		return Descriptor(Object.is(parseFloat(num), -0) ? '-0' : +parseFloat(num), { type: 'float', complexity: 0 });
	}
	//it was string
	else {
		if (result.type === 'int' || result.type === 'float') {
			return Descriptor(result, { type: 'float', complexity: result.complexity });
		} else {
			return Descriptor('+(' + result + ')', { type: 'float', complexity: result.complexity + 1 });
		}
	}
}
float.type = 'float';

Types.float =
	Types.double = float;


// Constructors carry their column/component count and element type as metadata.
// Runtime arguments are evaluated once; components are only expanded when safe.
function vector(size, scalar, type) {
	function construct(...nodes) {
		const args = (nodes[0] != null ? nodes : [0]).map(n => this.process(n))
		const ctor = scalar === 'bool' ? 'Array' : scalar === 'uint' ? 'Uint32Array' : scalar === 'int' ? 'Int32Array' : 'Float32Array'
		const width = value => this.types[value.type]?.length || 1
		const components = args.flatMap(value => value.components || [value])
		if (args.length === 1 && width(args[0]) === 1) {
			const value = this.types[scalar].call(this, args[0])
			return Descriptor(`new ${ctor}(${size}).fill(${value})`, {
				type, components: Array(size).fill(value), complexity: value.complexity + size + 1,
				optimize: value.optimize
			})
		}
		const values = components.slice(0, size).map(value => this.types[scalar].call(this, value))
		if (values.length < size) throw new TypeError(`${type} needs ${size} components`)
		let source = args.map(value => width(value) > 1 ? `...${value}` : this.types[scalar].call(this, value)).join(', ')
		let code = scalar === 'bool' ? `[${source}]` : `new ${ctor}([${source}])`
		if (components.length > size) code += `.${scalar === 'bool' ? 'slice' : 'subarray'}(0, ${size})`
		if (scalar === 'bool') code += '.map(x => !!x)'
		return Descriptor(code, {
			type, components: values, complexity: args.reduce((n, a) => n + a.complexity, size + 1),
			optimize: args.every(a => a.optimize !== false)
		})
	}
	Object.defineProperty(construct, 'length', { value: size })
	construct.type = scalar
	return construct
}

for (const [prefix, scalar] of [['', 'float'], ['i', 'int'], ['u', 'uint'], ['b', 'bool'], ['d', 'double']]) {
	for (let size = 2; size <= 4; size++) {
		const type = `${prefix}vec${size}`
		Types[type] = vector(size, scalar, type)
	}
}

function matrix(cols, rows, type) {
	function construct(...nodes) {
		const args = (nodes[0] != null ? nodes : [1]).map(n => this.process(n))
		const first = args[0], input = this.types[first.type]
		let components, code
		if (args.length === 1 && /mat/.test(first.type)) {
			const oldRows = Types[input.type].length, oldCols = input.length
			const indices = Array.from({ length: cols * rows }, (_, i) => {
				const col = Math.floor(i / rows), row = i % rows
				return col < oldCols && row < oldRows ? col * oldRows + row : row === col ? -1 : -2
			})
			components = indices.map(i => i < 0 ? Descriptor(i === -1 ? 1 : 0, { complexity: 0 }) : first.components[i])
			code = `new Float32Array([${indices}].map(i => i < 0 ? +(i === -1) : m[i]))`
			code = `(m => ${code})(${first})`
		} else if (args.length === 1 && input.length === 1) {
			components = Array.from({ length: cols * rows }, (_, i) => i % rows === Math.floor(i / rows) ? first : Descriptor(0, { complexity: 0 }))
			code = `(x => new Float32Array([${components.map((_, i) => i % rows === Math.floor(i / rows) ? 'x' : '0')}]))(${first})`
		} else {
			components = args.flatMap(a => a.components || [a])
			if (components.length !== cols * rows) throw new TypeError(`${type} needs ${cols * rows} components`)
			code = `new Float32Array([${args.map(a => (this.types[a.type].length > 1 ? '...' : '') + a).join(', ')}])`
		}
		return Descriptor(code, {
			type, components, complexity: args.reduce((n, a) => n + a.complexity, cols * rows + 1),
			optimize: args.every(a => a.optimize !== false)
		})
	}
	Object.defineProperty(construct, 'length', { value: cols })
	construct.type = `vec${rows}`
	return construct
}

for (let cols = 2; cols <= 4; cols++) for (let rows = 2; rows <= 4; rows++) {
	const type = cols === rows ? `mat${cols}` : `mat${cols}x${rows}`
	Types[type] = matrix(cols, rows, type)
	Types[`mat${cols}x${rows}`] = Types[type]
	Types[`d${type}`] = Types[type]
	Types[`dmat${cols}x${rows}`] = Types[type]
}

function createSampler(type, samplerType) {
	sampler.type = type;
	function sampler() {
		var name = arguments[0];
		return Descriptor(null, {
			type: samplerType,
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

for (const sampler of ['2D', '3D', 'Cube', '2DArray']) {
	Types[`isampler${sampler}`] = createSampler('ivec4', `isampler${sampler}`)
	Types[`usampler${sampler}`] = createSampler('uvec4', `usampler${sampler}`)
}


Types.gl_DepthRangeParameters = function () {
	return Descriptor('{near: 0, far: 1, diff: 1}', {type: 'gl_DepthRangeParameters', optimize: false})
}
Types.gl_DepthRangeParameters.fields = Object.fromEntries(['near','far','diff'].map(name => [name, {name, type: 'float', dimensions: []}]))

export default Types
