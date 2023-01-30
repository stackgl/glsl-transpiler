'use strict'
/**
 * Transform glsl to js.
 *
 * Dev notes.
 * glsl-parser often creates identifiers/other nodes by inheriting them from definition.
 * So by writing som additional info into nodes, note that it will be accessible everywhere below, where initial id is referred by.
 *
 * @module  glsl-transpiler/lib/index
 */

import Emitter from 'events'
import inherits from 'inherits'
import assert from 'assert'
import parse from './parse.js'
import builtins from './builtins.js'
import types from './types.js'
import operators from './operators.js'
import stdlib from './stdlib.js'
import Descriptor from './descriptor.js'
import prepr from 'prepr'

var floatRE = /^-?[0-9]*(?:.[0-9]+)?(?:e-?[0-9]+)?$/i
var swizzleRE = /^[xyzwstpdrgba]{1,4}$/

/**
 * Create GLSL codegen instance
 *
 * @constructor
 */
function GLSL (options) {
	if (!(this instanceof GLSL)) return new GLSL(options)

	Object.assign(this, options)

	this.reset()

	//return function compiler for convenience
	var compile = this.compile.bind(this)
	compile.compiler = this
	compile.compile = compile

	return compile
}

inherits(GLSL, Emitter)


/**
 * Basic rendering settings
 */
GLSL.prototype.optimize = true
GLSL.prototype.preprocess = prepr
GLSL.prototype.debug = false
GLSL.prototype.version = '100 es'


/**
 * Operator names
 */
GLSL.prototype.operators = operators.operators


/**
 * Type constructors
 */
GLSL.prototype.types = types


/**
 * Map of builtins with their types
 */
GLSL.prototype.builtins = builtins


/**
 * Parse string arg, return ast.
 */
GLSL.prototype.parse = parse


/**
 * Stdlib functions
 */
GLSL.prototype.stdlib = stdlib


/**
 * Initialize analysing scopes/vars/types
 */
GLSL.prototype.reset = function () {
	if (this.descriptors) this.descriptors.clear()

	//cache of descriptors associated with nodes
	else this.descriptors = new Map()

	//scopes analysed. Each scope is named after the function they are contained in
	this.scopes = {
		global: {
			__name: 'global',
			__parentScope: null
		}
	}

	//hash of registered structures
	this.structs = {

	}

	//collected uniforms
	this.uniforms = {

	}

	//collected varying-s
	this.varyings = {

	}

	//collected attributes
	this.attributes = {

	}

	//collected functions, with output types
	this.functions = {

	}

	//collected stdlib functions need to be included
	if (this.includes == null || this.includes === true) {
		this.includes = {

		}
	}

	//current scope of the node processed
	this.currentScope = 'global'
}


/**
 * Compile whether string or tree to js
 */
GLSL.prototype.compile = function compile (arg) {
	//apply preprocessor
	if (this.preprocess) {
		if (this.preprocess instanceof Function) {
			arg = this.preprocess(arg)
		}
		else {
			arg = prepr(arg)
		}
	}

	arg = this.parse(arg)

	var result = this.process(arg)

	result = this.stringifyStdlib(this.includes) + '\n' + result

	return result
}


/**
 * Process glsl AST node so that it returns descriptor for a node
 * which by default casts to a string
 * but contains additional info:
 * `component` values, if node operates on array
 * `type` which is returned from the node
 * `complexity` of the node
 */
GLSL.prototype.process = function (node, arg) {
	//we don’t process descriptors
	if (node instanceof String) {
		return node
	}

	//return cached descriptor, if already was processed
	if (this.descriptors.has(node)) {
		return this.descriptors.get(node)
	}

	//cache simple things as easy descriptors
	if (node == null ||
		typeof node === 'number' ||
		typeof node === 'string' ||
		typeof node === 'boolean') {
		return this.cache(node, Descriptor(node, {complexity: 0}))
	}


	//in some cases glsl-parser returns node object inherited from other node
	//which properties exist only in prototype.
	//Insofar structures take it’s definition type, so should be ignored.
	//See #Structures test for example.
	if (!node.hasOwnProperty('type')) return this.cache(node, Descriptor(null))

	var t = this.transforms[node.type]

	var startCall = false

	//wrap unknown node
	if (t === undefined) {
		console.warn(`Unknown node type '${node.type}'`)
		return this.cache(node, null)
	}

	if (!t) {
		return this.cache(node, null)
	}

	if (typeof t !== 'function') {
		return this.cache(node, t)
	}

	//do start routines on the first call
	if (!this.started) {
		this.emit('start', node)
		this.started = true
		startCall = true
	}

	//apply node serialization
	var result = t.call(this, node, arg)

	if (this.optimize) {
		result = this.optimizeDescriptor(result)
	}

	this.cache(result)

	this.addInclude(result.include)

	//invoke end
	if (startCall) {
		this.started = false
		this.emit('end', node)
	}

	return result
}


/**
 * Try to optimize descriptor -
 * whether expanding components is more profitable than keeping complex version
 */
GLSL.prototype.optimizeDescriptor = function (descriptor) {
	//try to optimize
	if (this.optimize && descriptor.optimize !== false && descriptor.components) {
		var complexity = descriptor.components.reduce(function (prev, curr) {
				return prev + curr.complexity||0
			}, 0)

		if (complexity < descriptor.complexity) {
			//expand array, if complexity is ok
			if (descriptor.components && descriptor.components.length > 1) {
				var include = descriptor.components.map(function (c) { return c.include;}, this).filter(Boolean)
				return Descriptor(`[${descriptor.components.join(', ')}]`, Object.assign(descriptor, {
					include: include,
					complexity: complexity
				}))
			}
		}
	}

	return descriptor
}


/**
 * Cache descriptor, return it
 */
GLSL.prototype.cache = function (node, value) {
	if (this.descriptors.has(node)) return this.descriptors.get(node)

	//force descriptor on save
	if (!(value instanceof String)) value = Descriptor(value)

	this.descriptors.set(node, value)

	return this.descriptors.get(node)
}



/**
 * List of transforms for various token types
 */
GLSL.prototype.transforms = {
	stmtlist: function (node) {
		if (!node.children.length) return Descriptor(null)

		var result = node.children.map(this.process, this).join('\n')

		return Descriptor(result)
	},

	stmt: function (node) {
		var result = node.children.map(this.process, this).join('')

		if (result && result[result.length - 1] !== ';') result += ';'

		return Descriptor(result)
	},

	struct: function (node) {
		var structName = node.children[0].data

		//get args nodes
		var args = node.children.slice(1)
		var argTypes = []

		//arg names
		var argsList = args.map(function (arg) {
			if (arg.type !== 'decl') throw Error('Struct statements should be declarations.')

			var decllist = arg.children[arg.children.length - 1]

			if (decllist.type !== 'decllist') throw Error('Struct statement declaration has wrong structure.')

			return decllist.children.map(function (node) {
				// { vec3 direction; }
				if (node.type === 'ident') return node.data

				// { vec3 data[2]; }
				if (node.type === 'quantifier') {
					console.log(node)
				}

				throw Error('Struct statement contains something strange.')
			})
		}).flat()

		var argTypes = args.map(function (arg) {
			var type = arg.children[4].token.data
			var decllist = arg.children[arg.children.length - 1]
			return decllist.children.map(function () {
				return type
			})
		}).flat()

		var struct = function struct () {
			var args = arguments

			var includes = []

			var fields = argsList.map(function (argName, i) {
				if (args[i]) {
					var initValue = this.process(args[i])
				}
				else {
					var initValue = this.types[argTypes[i]].call(this, args[i])
				}
				initValue = this.optimizeDescriptor(initValue)
				includes = includes.concat(initValue.include)
				return Descriptor(`${argName}: ${initValue}`, {
					type: argTypes[i],
					optimize: false,
					components: initValue.components
				})
			}, this)

			return Descriptor(`{\n${fields.join(',\n')}\n}`, {
				type: structName,
				optimize: false,
				include: includes.filter(Boolean),
				components: fields
			})
		}.bind(this)

		//we should set length to be a compatible type constructor
		Object.defineProperty(struct, 'length', {value: argTypes.length})

		//register struct constructor, in a fashion of type constructors
		this.structs[structName] =
		this.types[structName] = struct

		return Descriptor(null)
	},

	function: function (node) {
		var result = ''

		//if function has no body, that means it is interface for it. We can ignore it.
		if (node.children.length < 3) return Descriptor(null)

		//add function name - just render ident node
		assert.equal(node.children[0].type, 'ident', 'Function should have an identifier.')
		var name = this.process(node.children[0])

		//add args
		assert.equal(node.children[1].type, 'functionargs', 'Function should have arguments.')
		var args = this.process(node.children[1])

		//get out type of the function in declaration
		var outType = node.parent.children[4].token.data


		//add argument types suffix to a fn
		var argTypesSfx = args.components.map(function (arg) {
			return `${arg.type}`
		}).join('_')

		//sort arguments by qualifier
		var inArgs = []
		var outArgs = []
		args.components.forEach(function (arg, index) {
			arg.index = index
			if (arg.qualifier.slice(0, 2) === 'in') {
				inArgs.push(arg)
			}
			if (arg.qualifier.slice(-3) === 'out') {
				outArgs.push(arg)
			}
		})
		if (outArgs.length === 0) {
			outArgs = null
		}

		//if main name is registered - provide type-scoped name of function
		if (this.functions[name] && argTypesSfx) {
			name = `${name}_${argTypesSfx}`
		}

		//add body
		assert.equal(node.children[2].type, 'stmtlist', 'Function should have a body.')

		//create function body
		result += `function ${name} (${args}) {\n`

		//guard input parameters from being mutated
		inArgs.forEach(function (arg) {
			if (/^(vec|mat)/.test(arg.type)) {
				result += `${arg} = ${arg}.slice();\n`
			}
		})

		//populate current scope information
		//this is used by the `return` transform
		var scope = this.scopes[this.currentScope]
		scope.callName = name
		scope.outArgs = outArgs

		result += this.process(node.children[2])

		if (outArgs && outType === 'void') {
			//the output list is usually created when transforming the `return` statement
			//but this function does not have a `return` at the end
			result += `\n${name}.__out__ = [${outArgs.join(', ')}];`
		}

		result = result.replace(/\n/g, '\n\t')
		result += '\n}'

		//get scope back to the global after fn ended
		this.currentScope = this.scopes[this.currentScope].__parentScope.__name

		//create descriptor
		result = Descriptor(result, {
			type: outType,
			complexity: 999
		})

		//save the output arguments list
		//this is used by the `call` transform
		result.outArgs = outArgs

		//register function descriptor
		this.functions[name] = result

		return result
	},

	//function arguments are just shown as a list of ids
	functionargs: function (node) {
		//create new scope - func args are the unique token stream-style detecting a function entry
		var lastScope = this.currentScope
		var scopeName = (node.parent && node.parent.children[0].data) || 'global'
		this.currentScope = scopeName

		if (!this.scopes[scopeName]) {
			this.scopes[scopeName] = {
				__parentScope: this.scopes[lastScope],
				__name: scopeName
			}
		}

		var comps = node.children.map(this.process, this)

		return Descriptor(comps.join(', '), {
			components: comps
		})
	},

	//declarations are mapped to var a = n, b = m
	//decl defines it’s inner placeholders rigidly
	decl: function (node) {
		var result

		var typeNode = node.children[4]
		var decllist = node.children[5]

		//register structure
		if (node.token.data === 'struct') {
			this.process(typeNode)
			if (!decllist) return Descriptor(null)
		}


		assert(
			decllist.type === 'decllist' ||
			decllist.type === 'function' ||
			decllist.type === 'struct',
		'Decl structure is malicious')


		//declare function as hoisting one
		if (decllist.type === 'function') {
			return this.process(decllist)
		}

		//case of function args - drop var
		if (node.parent.type === 'functionargs') {
			result = this.process(decllist)

			// in/out/inout
			var qualifier = node.token.data
			if (qualifier === result.type) {
				result.qualifier = 'in'
			} else {
				result.qualifier = qualifier
			}

			return result
		}
		//default type, like variable decl etc
		else {
			result = this.process(decllist)
		}

		//prevent empty var declaration
		if (!result || !result.trim()) return Descriptor(null, {
			type: result.type,
			components: result.components,
			optimize: false
		})

		return Descriptor(`var ${result}`, {
			type: result.type,
			components: result.components,
			optimize: false
		})
	},


	//decl list is the same as in js, so just merge identifiers, that's it
	decllist: function (node) {
		var ids = []

		var lastId = 0

		//get datatype - it is the 4th children of a decl
		var dataType = node.parent.children[4].token.data

		//unwrap anonymous structure type
		if (dataType === 'struct') {
			dataType = node.parent.children[4].children[0].data
		}

		//attribute, uniform, varying etc
		var bindingType = node.parent.children[1].token.data

		//get dimensions - it is from 5th to the len-1 nodes of a decl
		//that’s in case if dimensions are defined first-class like `float[3] c = 1;`
		//result is [] or [3] or [1, 2] or [4, 5, 5], etc.
		//that is OpenGL 3.0 feature
		var dimensions = []
		for (var i = 5, l = node.parent.children.length - 1; i < l; i++) {
			dimensions.push(parseInt(node.parent.children[i].children[0].children[0].data))
		}

		for (var i = 0, l = node.children.length; i < l; i++) {
			var child = node.children[i]

			if (child.type === 'ident') {
				var ident = this.process(child)
				ident.type = dataType
				lastId = ids.push(ident)

				//save identifier to the scope
				this.variable(ident, {
					type: dataType,
					binding: bindingType,
					node: child,
					dimensions: []
				})
			}
			else if (child.type === 'quantifier') {
				//with non-first-class array like `const float c[3]`
				//dimensions might be undefined, so we have to specify them here
				var dimensions = this.variable(ids[lastId - 1]).dimensions
				dimensions.push(parseInt(child.children[0].children[0].data))
				this.variable(ids[lastId - 1], {dimensions: dimensions})
			}
			else if (child.type === 'expr') {
				var ident = ids[lastId - 1]

				//ignore wrapping literals
				var value = this.process(child)

				//save identifier initial value
				this.variable(ident, {value: value})
			}
			else {
				throw Error('Undefined type in decllist: ' + child.type)
			}
		}

		var functionargs = node.parent.parent.type === 'functionargs'

		//get binding type fn
		var replace = this[bindingType]

		var comps = ids.map(function (ident, i) {
			if (functionargs) return ident

			var result = this.variable(ident).value

			//emptyfier, like false or null value
			if (replace !== undefined && !replace) {
				return ''
			}
			//function replacer
			else if (replace instanceof Function) {
				var callResult = replace(ident, this.variable(ident))

				//if call result is something sensible - use it
				if (callResult != null) {
					result = callResult
				}
			}

			//if result is false/null/empty string - ignore variable definition
			if (!(result+'') && result !== 0) return ident

			return `${ident} = ${result}`
		}, this).filter(Boolean)

		var res = Descriptor(comps.join(', '), {
			type: dataType
		})

		return res
	},

	//placeholders are empty objects - ignore them
	placeholder: function (node) {
		return node.token.data
	},

	//i++, --i etc
	suffix: function (node) {
		var str = this.process(node.children[0])
		return Descriptor(str + node.data, {type: str.type})
	},

	//loops are the same as in js
	forloop: function (node) {
		var init = this.process(node.children[0])
		var cond = this.process(node.children[1])
		var iter = this.process(node.children[2])
		var body = this.process(node.children[3])

		return Descriptor(`for (${init}; ${cond}; ${iter}) {\n${body}\n}`, {

		})
	},

	whileloop: function (node) {
		var cond = this.process(node.children[0])
		var body = this.process(node.children[1])

		return Descriptor(`while (${cond}) {\n${body}\n}`, {
		})
	},

	operator: function (node) {
		//access operators - expand to arrays
		if (node.data === '.') {
			// a.x or a().x
			var identNode = node.children[0]
			var ident = this.process(identNode)
			var type = ident.type
			var prop = node.children[1].data

			//ab.xyz for example
			if (swizzleRE.test(prop)) {
				return this.unswizzle(node)
			}

			return Descriptor(`${ident}.${prop}`, {
				type: type
			})
		}

		throw Error('Unknown operator ' + node.data)
	},

	expr: function (node) {
		var complexity = 0

		var result = node.children.map(function (n) {
			var res = this.process(n)
			complexity += res.complexity;
			return res
		}, this).join('')

		result = Descriptor(result, {complexity: complexity})

		return result
	},

	precision: function () {
		return Descriptor(null)
	},

	//FIXME: it never creates comments
	comment: function (node) {
		return Descriptor(null)
	},

	preprocessor: function (node) {
		return Descriptor('/* ' + node.token.data + ' */')
	},

	keyword: function (node) {
		var type
		if (node.data === 'true' || node.data === 'false') type = 'bool'
		//FIXME: guess every other keyword is a type, isn’t it?
		else type = node.data
		return Descriptor(node.data, {
			type: type,
			complexity: 0,
			optimize: false
		})
	},

	ident: function (node) {
		//get type of registered var, if possible to find it
		var id = node.token.data
		var scope = this.scopes[this.currentScope]

		//find the closest scope with the id
		while (scope[id] == null) {
			scope = scope.__parentScope
			if (!scope) {
				// console.warn(`'${id}' is not defined`)
				break
			}
		}

		var str = node.data

		if (scope) {
			var type = scope[id].type
			var res = Descriptor(str, {
				type: type,
				complexity: 0
			})

			return res
		}

		//FIXME: guess type more accurately here
		return Descriptor(str, {
			type: null,
			complexity: 0
		})
	},

	return: function (node) {
		var expr = this.process(node.children[0])

		var result
		var scope = this.scopes[this.currentScope]
		if (scope.outArgs) {
			var outStmt = `${scope.callName}.__out__ = [${scope.outArgs.join(', ')}]`

			if (expr.visible) {
				// func.__return__ = <expression>;
				// func.__out__ = [outArg1, outArg2, ...];
				// return func.__return__;
				result = `${scope.callName}.__return__ = ${expr};\n${outStmt};\nreturn ${scope.callName}.__return__`
			} else {
				// func.__out__ = [outArg1, outArg2, ...];
				// return;
				result = `${outStmt};\nreturn`
			}
		} else {
			// return <expression>;
			result = 'return' + (expr.visible ? ' ' + expr : '')
		}
		return Descriptor(result, {type: expr.type})
	},

	continue: function () {return Descriptor('continue')},

	break: function () {return Descriptor('break')},

	discard:  function () {return Descriptor('discard()')},

	'do-while': function (node) {
		var exprs = this.process(node.children[0])
		var cond = this.process(node.children[1])
		return Descriptor(`do {\n${exprs}\n} while (${cond})`, {
		})
	},

	binary: function (node) {
		var leftNode = node.children[0]
		var rightNode = node.children[1]
		var left = this.process(leftNode)
		var right = this.process(rightNode)
		var leftType = left.type
		var rightType = right.type
		var operator = node.data

		//data access operator
		if (node.data === '[') {
			//for case of glsl array access like float[3]
			if (this.types[node.type]) {
				return Descriptor(`${leftType}[${right}]`, {
					type: this.types[leftType].type,
					complexity: left.complexity + right.complexity + 1
				})
			}

			//matrix/etc double access a[1][2]
			if (leftNode.type === 'binary') {
				var matNode = leftNode.children[0]
				var matDesc = this.process(matNode)
				var vecSize = this.types[leftType].length
				var matType = matDesc.type
				var matSize = this.types[matType].length
				var outerRight = this.process(leftNode.children[1])

				var idx = parseFloat(outerRight)|0
				var offset = parseFloat(right)|0

				//if number - try to access component
				if (!isNaN(idx) && !isNaN(offset)) {
					return Descriptor(matDesc.components[vecSize*idx + offset], {
						type: 'float',
						complexity: matDesc.complexity + right.complexity + 1
					})
				}

				//if calc - do slice
				else {
					return Descriptor(`${matDesc}[${outerRight} * ${vecSize} + ${right}]`, {
						type: 'float',
						complexity: matDesc.complexity + outerRight.complexity + right.complexity + 2
					})
				}
			}

			//matrix single access a[0] → vec
			if (/mat/.test(leftType)) {
				var size = this.types[leftType].length
				var start = this.processOperation(right, Descriptor(size), '*')
				var end = this.processOperation(start, Descriptor(size), '+')
				var comps = floatRE.test(start) && floatRE.test(end) ? left.components.slice(start, end) : undefined
				var res = Descriptor(`${left}.slice(${start}, ${end})`, {
					type: this.types[leftType].type,
					complexity: left.complexity + size,
					components: comps
				})
				res = this.optimizeDescriptor(res)
				return res
			}

			//detect array access
			//FIXME: double array access here will fail
			var leftVar = this.variable(left)
			var type = leftVar && leftVar.dimensions && leftVar.dimensions.length ? leftType : this.types[leftType].type

			//something[N] return as is
			return Descriptor(`${left}[${right}]`, {
				type: type || null,
				complexity: left.complexity + right.complexity + 1
			})
		}

		//default binary operators a × b
		return this.processOperation(left, right, operator)
	},

	assign: function (node) {
		var result = ''
		var operator = node.data
		var right = this.process(node.children[1])
		if (node.children[0].type === 'identifier') {
			var left = Descriptor(node.children[0].data, {
				type: right.type,
				optimize: false,
				complexity: 0
			})
		}
		else {
			var left = this.process(node.children[0])
		}

		var target = left

		// here some targets may be unswizzled already, eg.
		// [a[0], a[1]], a[0][0], etc.
		var isSwizzle = node.children[0].type === 'operator' &&
			swizzleRE.test(node.children[0].children[1].data)

		//a *= b.x
		if (!isSwizzle && this.types[right.type].length == 1 && this.types[target.type].length == 1) {
			return Descriptor(`${target} ${operator} ${right}`, {
				type: right.type,
				complexity: target.complexity + 1 + right.complexity
			})
		}

		//FIXME: left can be a structure property set a.prop

		//in cases of setting swizzle - we have to place left unswizzle to the right
		if (isSwizzle) {
			var positions = this.swizzlePositions(node.children[0].children[1].data)
			var len = this.types[this.process(node.children[0].children[0]).type].length
			var ids = Array(len).fill('null')

			for (var i = 0; i < positions.length; i++) {
				ids[positions[i]] = i
			}

			var targetType = node.children[0].children[0].type

			// a.x = ...
			if ((targetType === 'ident' || targetType === 'builtin')) {
				target = Descriptor(node.children[0].children[0].data, {
					type: right.type,
					optimize: false
				})
			}

			//a.wy *= a.zx →
			//a = [null, 1, null, 0].map(function (idx, i) {
			//	return idx == null ? gl_position[i] : this[idx]
			//}, a.wy * a.zx)
			if (positions.length > 1) {
				//*=
				if (operator.length > 1) {
					var subOperator = operator.slice(0, -1)
					right = this.processOperation(this.unswizzle(node.children[0]), right, subOperator)
					right = this.optimizeDescriptor(right)
				}

				var comps = Array(len)
				for (var i = 0; i < len; i++) {
					comps[i] = Descriptor(`${target}[${i}]`, {
						type: 'float',
						complexity: 1
					})
				}
				for (var i = 0; i < positions.length; i++) {
					comps[positions[i]] = right.components[i]
				}

				right = Descriptor(
					`[${ids.join(', ')}].map(function (idx, i) { return idx == null ? ${target}[i] : this[idx]; }, ${right})`, {
						type: right.type,
						complexity: len*4 + right.complexity,
						include: right.include,
						components: comps
				})
				right = this.optimizeDescriptor(right)

				return Descriptor(`${target} = ${right}`, {
					type: right.type,
					optimize: false,
					include: right.include
				})
			}
			//a.x *= b → a[0] *= b
			else {
				if (targetType === 'builtin' || targetType === 'ident') {
					return Descriptor(`${target}[${positions[0]}] ${operator} ${right}`, {
						type: right.type,
						optimize: false
					})
				} else {
					return Descriptor(`${target} ${operator} ${right}`, {
						type: right.type,
						optimize: false
					})
				}
			}
		}

		//`a *= x` → `a = a * x`
		else if (operator.length > 1) {
			var subOperator = operator.slice(0, -1)
			right = this.processOperation(left, right, subOperator)
			right = this.optimizeDescriptor(right)
		}

		//simple assign, =
		return Descriptor(`${target} = ${right}`, {
			type: right.type,
			complexity: 1,
			include: right.include
		})
	},

	ternary: function (node) {
		var cond = this.process(node.children[0])
		var a = this.process(node.children[1])
		var b = this.process(node.children[2])

		return Descriptor(`${cond} ? ${a} : ${b}`, {type: a.type})
	},

	unary: function (node) {
		var str = this.process(node.children[0])

		var complexity = str.complexity + 1

		//ignore + operator, we dont need to cast data
		if (node.data === '+') {
			//++x
			if (node.children[0].type === 'unary') {
				return Descriptor(node.data + str, {type: str.type, complexity: complexity})
			}
			else if (node.children[0].parent.type === 'unary') {
				return Descriptor(node.data + str, {type: str.type, complexity: complexity})
			}

			//+x
			return Descriptor(str)
		}

		return this.processOperation(null, str, node.data)
	},

	//gl_Position, gl_FragColor, gl_FragPosition etc
	builtin: function (node) {
		return Descriptor(node.data, {
			type: this.builtins[node.data],
			complexity: 0
		})
	},

	call: function (node) {
		var args = node.children.slice(1)
		var argValues = args.map(this.process, this)
		var argTypes = argValues.map(function (arg) {
			return arg.type
		}, this)

		//if first node is an access, like a.b() - treat special access-call case
		if (node.children[0].data === '.') {
			var methodNode = node.children[0].children[1]
			var holderNode = node.children[0].children[0]
			var methodName = this.process(methodNode)
			var holderName = this.process(holderNode)
			var type = holderName.type

			//if length call - return length of a vector
			//vecN.length → N
			if (methodName == 'length' && this.types[type].length > 1) {
				return Descriptor(this.types[type].length, {
					type: 'int',
					complexity: 0
				})
			}

			var callName = Descriptor(`${holderName}.${methodName}`, {
				type: methodName.type,
				complexity: holderName.complexity + methodName.complexity
			})
		}

		//first node is caller: float(), float[2](), vec4[1][3][4]() etc.
		else {
			var callName = this.process(node.children[0])
		}

		//if first child of the call is array call - expand array
		//FIXME: in cases of anonymously created arrays of arrays, outside of declarations, there might be an issue: `vec4[3][3](0,1)`
		if (node.children[0].data === '[') {
			var dimensions = []
			var keywordNode = node.children[0]
			while (keywordNode.type != 'keyword') {
				dimensions.push(parseInt(keywordNode.children[1].data))
				keywordNode = keywordNode.children[0]
			}

			//if nested type is primitive - expand literals without wrapping
			var value = ''
			if (this.types[callName]) {
				value += args.map(this.process, this).join(', ')
			} else {
				value += callName + '('
				value += args.map(this.process, this).join(', ')
				value += ')'
			}

			//wrap array init expression
			return Descriptor(this.wrapDimensions(argValues, dimensions.reverse()), {
				type: callName.type,
				complexity: 999
			})
		}

		//else treat as function/constructor call
		else {
			if (this.debug) {
				if (callName == 'print') {
					var args = argValues.map(function (a) {
						return a+':'+a.type
					})
					console.log.apply(console, args)
					return Descriptor(null)
				}

				if (callName == 'show') {
					console.log.apply(console, argValues.map(function (a) {
						return a
					}))
					return Descriptor(null)
				}
			}

			//struct(), vec2(), float()
			if (this.types[callName]) {
				return this.types[callName].apply(this, args)
			}

			//someFn()
			else {
				var type, optimize = true, outArgs = null

				//registered fn()
				var fn = this.functions[callName]
				if (fn) {
					var sfx = argTypes.join('_')
					if (sfx && this.functions[`${callName}_${sfx}`]) {
						fn = this.functions[`${callName}_${sfx}`]
						type = fn.type
						outArgs = fn.outArgs
						callName = Descriptor(`${callName}_${sfx}`, {
							complexity: callName.complexity
						})
					}
					else {
						type = fn.type
						outArgs = fn.outArgs
					}
				}

				//stdlib()
				else if (this.stdlib[callName]) {
					this.addInclude(callName)

					//if callname is other than included name - redirect call name
					if (this.stdlib[callName].name) {
						callName = this.stdlib[callName].name
					}

					//add other includes if any
					this.addInclude(this.stdlib[callName].include)

					type = this.stdlib[callName].type
					if (typeof type === 'function') {
						type = type.call(this, node)
					}
				}

				if (!type) {
					// Unable to guess the type of '${callName}'
					// keep type as null, meaning that can be any
					type = null
					optimize = false
				}

				var res = `${callName}(${argValues.join(', ')})`
				if (outArgs) {
					// calling func(in a, out b, out c):
					// (func(a, b, c), [b, c] = func.__out__, func.__return__)
					var outList = outArgs.map(function (arg) {
						return argValues[arg.index]
					})
					res = `(${res}, [${outList.join(', ')}] = ${callName}.__out__, ${callName}.__return__)`
				}

				return Descriptor(res, {
					type: type || callName.type,
					complexity: 999 /* argValues.reduce(function (prev, curr) {
						return curr.complexity+prev
					}, callName.complexity||999) */,
					optimize: optimize
				})

			}
		}
	},

	literal: function (node) {
		//convert 023 → 0o23
		if (/^0[0-9]+/.test(node.data)) {
			node.data = '0o' + node.data.slice(1)
		}

		//if special format - parse it as int, else - return unchanged
		var result = /^[0-9][xob]/.test(node.data) ? Number(node.data) : node.data

		//guess type - as far in js any number tends to be a float, give priority to it
		//in order to avoid unnecessary types alignment
		var type
		if (/true|false/i.test(node.data)) type = 'bool'
		else if (/^[0-9]+$/.test(node.data) > 0) type = 'int'
		else if (floatRE.test(node.data)) type = 'float'
		return Descriptor(result, {type: type, complexity: 0})
	},

	//ifs are the same as js
	if: function (node) {
		var cond = this.process(node.children[0])
		var ifBody = this.process(node.children[1])

		var result = `if (${cond}) {\n${ifBody}\n}`

		if (node.children.length > 1) {
			var elseBody = this.process(node.children[2])
			if (elseBody.visible) result += ` else {\n${elseBody}\n}`
		}

		return Descriptor(result, {
			type: 'float'
		})
	},

	//grouped expression like a = (a - 1)
	group: function (node) {
		//children are like (1, 2, 3) - does not make a big sense
		//the last one is always taken as a result
		var children = node.children.map(this.process, this)

		var result = '(' + children.join(', ') + ')'

		var last = children[children.length - 1]

		//each component therefore should be wrapped to group as well
		//FIXME: single-multiplocation ops like (x*34.) + 1. are possible to be unwrapped, providing that they are of the most precedence.
		if (last.components) {
			last.components = last.components.map(function (comp) {
				//if component contains no operations (we not smartly guess that each op adds to complexity) - keep component as is.
				if (comp.complexity === 1) return comp

				//otherwise wrap it, as it may contain precedences etc.
				return Descriptor('(' + comp + ')', comp)
			})
		}

		return Descriptor(result, {
			type: last.type,
			components: last.components,
			complexity: children.reduce(function (prev, curr) {return prev+curr.complexity||0}, 0)
		})
	}

	// switch: function () {
	//FIXME: not implemented in glsl-parser
	// }
}

/**
 * Return list if ids for swizzle letters
 */
GLSL.prototype.swizzlePositions = function (prop) {
	var swizzles = 'xyzwstpdrgba'
	var positions = []
	for (var i = 0, l = prop.length; i < l; i++) {
		var letter = prop[i]
		var position = swizzles.indexOf(letter) % 4
		positions.push(position)
	}
	return positions
}

/**
 * Transform access node to a swizzle construct
 * ab.xyz → [ab[0], ab[1], ab[2]]
 */
GLSL.prototype.unswizzle = function (node) {
	var identNode = node.children[0]

	var ident = this.process(identNode)
	var type = ident.type
	var prop = node.children[1].data
	var positions = this.swizzlePositions(prop)

	var args = positions.map(function (position) {
		//[0, 1].yx → [1, 0]
		// a.yx → [a[1], a[0]]
		return ident.components && ident.components[position] || position
	})

	//a.x → a[0]
	if (args.length === 1) {
		var result
		// unknown identifiers or calls often have undefined components
		// a.z → a[2]
		if (typeof args[0] === 'number') {
			result = Descriptor(`${ident}[${args[0]}]`, {type: null, complexity: 999})
		}
		else {
			if (args[0] == null) console.warn(`Cannot unswizzle '${ident.type}(${ident}).${prop}': ${prop} is outside the type range.`)

			result = Descriptor(args[0] || `undefined`, {
				type: 'float',
				complexity: 1
			})
		}

		return result
	}

	//vec2 a.xy → a
	if (type && args.length === this.types[type].length && positions.every(function (position, i) { return position === i})) {
		return ident
	}

	var complexity = args.length * ident.complexity

	//a.yz → [1, 2].map(function(x) { return this[x]; }, a)
	var result = Descriptor(`[${positions.join(', ')}].map(function (x, i) { return this[x]}, ${ident})`, {
		complexity: ident.components ? args.length*2 : 999,
		type: `vec${args.length}`,
		components: ident.components && args
	})

	result = this.optimizeDescriptor(result)

	return result
}


/**
 * Get/set variable from/to a [current] scope
 */
GLSL.prototype.variable = function (ident, data, scope) {
	if (!scope) scope = this.currentScope

	//set/update variable
	if (data) {
		//create variable
		if (!this.scopes[scope][ident]) {
			this.scopes[scope][ident] = {}
		}

		var variable = Object.assign(this.scopes[scope][ident], data)

		//preset default value for a variable, if undefined
		if (data.value == null) {
			if (this.types[variable.type]) {
				//for sampler types pass name as arg
				if (/sampler|image/.test(variable.type)) {
					variable.value = this.types[variable.type].call(this, ident)
				}
				else {
					variable.value = this.types[variable.type].call(this)
				}
			}

			//some unknown types
			else {
				variable.value = variable.type + `()`
			}

			variable.value = this.optimizeDescriptor(variable.value)

			variable.value = this.wrapDimensions(variable.value, variable.dimensions)
		}
		//if value is passed - we guess that variable knows how to init itself
		//usually it is `call` node rendered
		// else {
		// }


		//just set an id
		if (variable.id == null) variable.id = ident

		//save scope
		if (variable.scope == null) variable.scope = this.scopes[scope]

		//save variable to the collections
		if (variable.binding === 'uniform') {
			this.uniforms[ident] = variable
		}
		if (variable.binding === 'attribute') {
			this.attributes[ident] = variable
		}
		if (variable.binding === 'varying') {
			this.varyings[ident] = variable
		}

		return variable
	}

	//get varialbe
	return this.scopes[scope][ident]
}


/**
 * Return value wrapped to the proper number of dimensions
 */
GLSL.prototype.wrapDimensions = function (value, dimensions) {
	//wrap value to dimensions
	if (dimensions.length) {
		if (!Array.isArray(value)) value = [value]

		value = dimensions.reduceRight(function (value, curr) {
			var result = []

			//for each dimension number - wrap result n times
			var prevVal, val
			for (var i = 0; i < curr; i++) {
				val = value[i] == null ? prevVal : value[i]
				prevVal = val
				result.push(val)
			}
			return `[${result.join(', ')}]`
		}, value)
	}

	return value
}


/**
 * Operator renderer
 */
GLSL.prototype.processOperation = operators


/**
 * Add include, pass optional prop object
 * For example addInclude('vec3', 'add') will include `vec3` class
 * with its `add` method
 */
GLSL.prototype.addInclude = function (name, prop) {
	if (!name || !this.includes) return

	if (Array.isArray(name)) {
		return name.forEach(function (i) {
			this.addInclude(i)
		}, this)
	}

	if (!(name instanceof String) && typeof name === 'object') {
		for (var subName in name) {
			this.addInclude(subName, name[subName])
		}
		return
	}

	if (!prop) {
		if (this.includes[name] == null) this.includes[name] = true
	}
	else {
		if (this.includes[name] == null || this.includes[name] === true) this.includes[name] = {}
		this.includes[name][prop] = true
	}
}


/**
 * Get stdlib source for includes
 */
GLSL.prototype.stringifyStdlib = function (includes) {
	if (!includes) includes = this.includes
	var methods = []

	for (var meth in includes) {
		if (!includes[meth]) continue

		//eg vecN
		var result = this.stdlib[meth].toString()
		methods.push(result)

		//eg vecN.operation
		if (includes[meth]) {
			for (var prop in includes[meth]) {
				if (!this.stdlib[meth][prop]) {
					console.warn(`Cannot find '${meth}.${prop}' in stdlib`)
					continue
				}
				methods.push(`${meth}.${prop} = ${this.stdlib[meth][prop].toString()}`)
			}
		}
	}

	return methods.join('\n')
}


export default GLSL
