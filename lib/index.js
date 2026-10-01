'use strict'
/**
 * Transform glsl to js.
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

var swizzleRE = /^[xyzwstpqrgba]{1,4}$/

/**
 * Create GLSL codegen instance
 *
 * @constructor
 */
function GLSL(options) {
	if (!(this instanceof GLSL)) return new GLSL(options)

	Object.assign(this, options)
	this.includeOptions = options?.includes

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
	this.started = false
	this.tempIndex = 0
	this.types = Object.assign(Object.create(null), types)
	for (const collection of ['uniformBlocks', 'inputs', 'outputs', 'structs', 'uniforms', 'varyings', 'attributes', 'functions']) this[collection] = Object.create(null)
	this.structs.gl_DepthRangeParameters = this.types.gl_DepthRangeParameters
	if (this.descriptors) this.descriptors.clear()
	else this.descriptors = new Map()
	this.scopes = Object.create(null)
	this.scopes.global = Object.assign(Object.create(null), { __name: 'global', __parentScope: null })

	//collected stdlib functions need to be included
	this.includes = this.includeOptions === false ? false : { ...(typeof this.includeOptions === 'object' ? this.includeOptions : {}) }

	//current scope of the node processed
	this.currentScope = 'global'
}


/**
 * Compile whether string or tree to js
 */
GLSL.prototype.compile = function compile(arg) {
	this.reset()
	//apply preprocessor
	if (typeof arg === 'string' && this.preprocess) {
		if (this.preprocess instanceof Function && this.preprocess !== prepr) {
			arg = this.preprocess(arg)
		}
		else {
			const version = /^\s*#version\s+(\d+)/m.exec(arg)?.[1] || parseInt(this.version)
			arg = prepr(arg.replace(/\\\r?\n/g, ' ').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, comment => comment.replace(/[^\n]/g, ' ')), { __VERSION__: +version, GL_ES: 1 })
		}
	}

	arg = this.tree = this.parse(arg)

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
		return this.cache(node, Descriptor(node, { complexity: 0 }))
	}



	var t = Object.hasOwn(this.transforms, node.type) ? this.transforms[node.type] : undefined

	var startCall = false

	//wrap unknown node
	if (t === undefined) {
		throw new SyntaxError(`Unsupported GLSL node '${node.type}'`)
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

	this.cache(node, result)

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
			return prev + curr.complexity || 0
		}, 0)

		if (complexity < descriptor.complexity) {
			//expand array, if complexity is ok
			if (descriptor.components && descriptor.components.length > 1) {
				var include = descriptor.components.map(function (c) { return c.include; }, this).filter(Boolean)
				const ctor = /^uvec/.test(descriptor.type) ? 'Uint32Array' : /^ivec/.test(descriptor.type) ? 'Int32Array' : 'Float32Array'
				return Descriptor(/^bvec/.test(descriptor.type) ? `[${descriptor.components.join(', ')}]` : `new ${ctor}([${descriptor.components.join(', ')}])`, Object.assign(descriptor, {
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

		if (!node.parent) this.declareFunctions(node)
		const render = () => Descriptor(node.children.map(this.process, this).join('\n'))
		return node.parent && node.parent.type !== 'function' ? this.withScope(render) : render()
	},

	block: function (node) { return Descriptor(`{\n${this.process(node.children[0])}\n}`) },
	switch: function (node) { return Descriptor(`switch (${this.process(node.children[0])}) {\n${this.process(node.children[1])}\n}`) },
	case: function (node) { return Descriptor(`case ${this.process(node.children[0])}:`) },
	default: function () { return Descriptor('default:') },

	stmt: function (node) {
		var result = node.children.map(this.process, this).join('')

		if (result && result[result.length - 1] !== ';') result += ';'

		return Descriptor(result)
	},

	struct: function (node) {
		const name = node.children[0].data, fields = []
		for (const decl of node.children.slice(1)) {
			const typeNode = decl.children[4]
			if (typeNode.type === 'struct') this.process(typeNode)
			const type = typeNode.type === 'struct' ? typeNode.children[0].data : typeNode.data
			for (const item of decl.children[5]?.children || []) {
				if (item.type === 'ident') fields.push({ name: item.data, type, dimensions: [] })
				else if (item.type === 'quantifier') fields.at(-1).dimensions.push(this.constant(item.children[0]))
			}
		}
		const construct = (...args) => {
			const values = fields.map((field, i) => {
				let value = args[i] == null ? this.wrapDimensions(this.optimizeDescriptor(this.types[field.type].call(this)), field.dimensions) : this.process(args[i])
				return `${field.name}: ${value}`
			})
			return Descriptor(`{\n${values.join(',\n')}\n}`, { type: name, optimize: false })
		}
		Object.defineProperty(construct, 'length', { value: fields.length })
		construct.fields = Object.fromEntries(fields.map(field => [field.name, field]))
		this.structs[name] = this.types[name] = construct
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
		if (node.callName) name = node.callName
		else if (this.functions[name] && argTypesSfx) name = `${name}_${argTypesSfx}`

		//add body
		assert.equal(node.children[2].type, 'stmtlist', 'Function should have a body.')

		//create function body
		result += `function ${name} (${args}) {\n`

		//guard input parameters from being mutated
		inArgs.forEach((arg) => {
			if (arg.dimensions?.length || this.structs[arg.type]) { this.addInclude('cloneValue'); result += `${arg} = cloneValue(${arg});\n` }
			else if (/^(?:[biud]?vec|d?mat)/.test(arg.type)) {
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

		{
			this.scopes[scopeName] = Object.assign(Object.create(null), { __parentScope: this.scopes[lastScope], __name: scopeName })
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
			if (node.block) {
				this.uniformBlocks[node.block] = { name: node.block, layout: node.layout, fields: this.structs[node.block].fields, instance: decllist?.children[0]?.data }
				if (!decllist) return Descriptor(typeNode.children.slice(1).map(field => {
					field.children[1].token.data = 'uniform'
					return this.process(field) + ';'
				}).join('\n'))
			}
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
			var qualifier = node.qualifiers?.find(q => /^(in|out|inout)$/.test(q)) || 'in'
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

		return Descriptor(`${this.scopes[this.currentScope].__block ? 'let' : 'var'} ${result}`, {
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
					qualifiers: node.parent.qualifiers || [],
					layout: node.parent.layout || {},
					dimensions: []
				})
			}
			else if (child.type === 'quantifier') {
				//with non-first-class array like `const float c[3]`
				//dimensions might be undefined, so we have to specify them here
				var dimensions = this.variable(ids[lastId - 1]).dimensions
				const length = this.constant(child.children[0])
				if (length != null && (!Number.isInteger(length) || length <= 0)) throw new TypeError('Array length must be a positive integer')
				dimensions.push(length)
				ids[lastId - 1].dimensions = dimensions
				this.variable(ids[lastId - 1], { dimensions: dimensions })
			}
			else if (child.type === 'expr') {
				var ident = ids[lastId - 1]

				//ignore wrapping literals
				var value = this.process(child)

				// An unsized array takes its length from its initializer.
				const variable = this.variable(ident)
				if (variable.dimensions[0] == null && variable.dimensions.length) variable.dimensions[0] = value.dimensions?.[0]
				if (/^(?:int|uint)$/.test(variable.type) && !variable.dimensions.length && value.type !== variable.type) value = this.types[variable.type].call(this, value)
				const init = child.children[0]
				if (init && (init.type === 'ident' || init.type === 'operator' || init.type === 'binary' && init.data === '[') && /vec|mat/.test(dataType) && !variable.dimensions.length) value = Descriptor(`(${value}).slice()`, value)
				if ((variable.dimensions.length || this.structs[dataType]) && (init.type === 'ident' || init.type === 'operator' || init.type === 'binary' && init.data === '[')) { this.addInclude('cloneValue'); value = Descriptor(`cloneValue(${value})`, value) }
				this.variable(ident, { value: value })
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
			if (!(result + '') && result !== 0) return ident

			return `${ident} = ${result}`
		}, this).filter(Boolean)

		var res = Descriptor(comps.join(', '), {
			dimensions: functionargs ? ids[0]?.dimensions : undefined,
			type: dataType
		})

		return res
	},

	//i++, --i etc
	suffix: function (node) {
		return this.increment(node, true)
	},

	//loops are the same as in js
	forloop: function (node) {
		return this.withScope(() => {
			const init = this.process(node.children[0]), cond = this.process(node.children[1])
			const iter = this.process(node.children[2]), body = this.process(node.children[3])
			if (node.children[1].type === 'decl') {
				const id = node.children[1].children[5].children[0].data
				return Descriptor(`{ let ${id}; for (${init}; ${String(cond).replace(/^(?:var|let) /, '')}; ${iter}) {\n${body}\n} }`)
			}
			return Descriptor(`for (${init}; ${cond}; ${iter}) {\n${body}\n}`)
		})
	},

	whileloop: function (node) {
		return this.withScope(() => {
			const cond = this.process(node.children[0]), body = this.process(node.children[1])
			if (node.children[0].type === 'decl') {
				const id = node.children[0].children[5].children[0].data
				return Descriptor(`for (let ${id}; ${String(cond).replace(/^(?:var|let) /, '')};) {\n${body}\n}`)
			}
			return Descriptor(`while (${cond}) {\n${body}\n}`)
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

			const field = this.structs[type]?.fields[prop]
			if (field) return Descriptor(`${ident}.${prop}`, { type: field.type, dimensions: field.dimensions, complexity: ident.complexity + 1 })

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
		if (node.children.length === 1) return this.process(node.children[0])
		var complexity = 0

		var result = node.children.map(function (n) {
			var res = this.process(n)
			complexity += res.complexity;
			return res
		}, this).join('')

		result = Descriptor(result, { complexity: complexity })

		return result
	},

	precision: function () {
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
				dimensions: scope[id].dimensions,
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
		if (expr.dimensions?.length || this.structs[expr.type]) { this.addInclude('cloneValue'); expr = Descriptor(`cloneValue(${expr})`, expr) }
		else if (/vec|mat/.test(expr.type) && node.children[0]?.children?.[0]?.type === 'ident') expr = Descriptor(`(${expr}).slice()`, expr)

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
		return Descriptor(result, { type: expr.type })
	},

	continue: function () { return Descriptor('continue') },

	break: function () { return Descriptor('break') },

	discard: function () {
		if (this.discard) return Descriptor(`${this.discard}()`)
		this.addInclude('discard')
		return Descriptor('discard()')
	},

	'do-while': function (node) {
		var exprs = this.withScope(() => this.process(node.children[0]))
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

		if (operator === '[') {
			// Array constructors keep their element type until the call transform.
			if (leftNode.type === 'keyword' && this.types[leftNode.data])
				return Descriptor(`${left}[${right}]`, { type: leftNode.data, complexity: 0 })
			if (left.dimensions?.length) return Descriptor(`${left}[${right}]`, {
				type: leftType, dimensions: left.dimensions.slice(1), complexity: left.complexity + right.complexity + 1,
				optimize: left.optimize !== false && right.optimize !== false
			})
			if (leftNode.type === 'binary' && leftNode.data === '[') {
				const matrix = this.process(leftNode.children[0])
				if (/mat/.test(matrix.type) && !matrix.dimensions?.length) {
					const rows = this.types[this.types[matrix.type].type].length
					const col = this.process(leftNode.children[1])
					const constant = /^\d+$/.test(col) && /^\d+$/.test(right)
					return Descriptor(constant && matrix.optimize !== false ? matrix.components[Number(col) * rows + Number(right)] : `${matrix}[(${col}) * ${rows} + (${right})]`, {
						type: 'float', complexity: matrix.complexity + col.complexity + right.complexity + 1,
						optimize: matrix.optimize !== false && col.optimize !== false && right.optimize !== false
					})
				}
			}
			if (/mat/.test(leftType)) {
				const rows = this.types[this.types[leftType].type].length
				const start = this.processOperation(right, Descriptor(rows), '*')
				const end = this.processOperation(start, Descriptor(rows), '+')
				return Descriptor(`${left}.slice(${start}, ${end})`, {
					type: this.types[leftType].type, complexity: left.complexity + rows,
					components: /^\d+$/.test(right) ? left.components.slice(Number(right) * rows, (Number(right) + 1) * rows) : undefined,
					optimize: left.optimize !== false && right.optimize !== false
				})
			}
			return Descriptor(`${left}[${right}]`, {
				type: this.types[leftType]?.type || null, complexity: left.complexity + right.complexity + 1,
				optimize: left.optimize !== false && right.optimize !== false
			})
		}

		//default binary operators a × b
		return this.processOperation(left, right, operator)
	},

	assign: function (node) {
		const right = this.process(node.children[1]), op = node.data
		const type = this.process(node.children[0]).type
		const code = this.reference(node.children[0], (left, write) => {
			let value = op === '=' ? right : this.processOperation(left, right, op.slice(0, -1))
			value = this.optimizeDescriptor(value)
			if (/^(?:int|uint)$/.test(left.type) && this.types[value.type]?.length === 1 && value.type !== left.type) value = this.types[left.type].call(this, value)
			if (op === '=' && (left.dimensions?.length || this.structs[left.type]) && node.children[1].type !== 'call') {
				this.addInclude('cloneValue'); value = `cloneValue(${value})`
			} else if (op === '=' && /vec|mat/.test(left.type) && (node.children[1].type === 'ident' || node.children[1].type === 'operator' || node.children[1].type === 'binary' && node.children[1].data === '[')) value = `(${value}).slice()`
			return write(value)
		})
		return Descriptor(code, { type, optimize: false })
	},

	ternary: function (node) {
		var cond = this.process(node.children[0])
		var a = this.process(node.children[1])
		var b = this.process(node.children[2])

		return Descriptor(`${cond} ? ${a} : ${b}`, { type: a.type })
	},

	unary: function (node) {
		if (node.data === '++' || node.data === '--') return this.increment(node, false)
		var str = this.process(node.children[0])

		var complexity = str.complexity + 1

		//ignore + operator, we dont need to cast data
		if (node.data === '+') {
			//++x
			if (node.children[0].type === 'unary') {
				return Descriptor(node.data + str, { type: str.type, complexity: complexity })
			}
			else if (node.children[0].parent.type === 'unary') {
				return Descriptor(node.data + str, { type: str.type, complexity: complexity })
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

		const builtin = node.children[0].data
		if (/^(?:texture(?:2D|Cube)?(?:Proj)?(?:Lod|Grad)?(?:Offset)?|textureSize|texelFetch(?:Offset)?)$/.test(builtin) && /sampler/.test(argTypes[0])) {
			const method = builtin.replace(/^texture(?:2D|Cube)/, 'texture')
			const sampler = argValues[0], samplerType = argTypes[0]
			const type = method === 'textureSize' ? /3D|Array/.test(samplerType) ? 'ivec3' : 'ivec2' : this.types[samplerType].type
			this.addInclude('textureLookup')
			return Descriptor(`textureLookup(${sampler}, '${method}', '${samplerType}', [${argValues.slice(1).join(', ')}])`, { type, optimize: false })
		}
		if (['dFdx', 'dFdy', 'fwidth'].includes(builtin)) {
			const replacement = this.derivatives?.[builtin]
			if (!replacement) throw new Error(`${builtin} requires a host derivative function in options.derivatives`)
			return Descriptor(`${replacement}(${argValues[0]})`, { type: argTypes[0], optimize: false })
		}

		//if first node is an access, like a.b() - treat special access-call case
		if (node.children[0].data === '.') {
			var methodNode = node.children[0].children[1]
			var holderNode = node.children[0].children[0]
			var methodName = this.process(methodNode)
			var holderName = this.process(holderNode)
			var type = holderName.type

			//if length call - return length of a vector
			//vecN.length → N
			if (methodName == 'length' && (holderName.dimensions?.length || this.types[type].length > 1)) {
				return Descriptor(holderName.dimensions?.[0] ?? this.types[type].length, {
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
		if (node.children[0].data === '[' && (() => { let n = node.children[0]; while (n.data === '[') n = n.children[0]; return n.type === 'keyword' })()) {
			var dimensions = []
			var keywordNode = node.children[0]
			while (keywordNode.type != 'keyword') {
				dimensions.push(keywordNode.children[1].data === '' ? args.length : this.constant(keywordNode.children[1]))
				keywordNode = keywordNode.children[0]
			}


			//wrap array init expression
			let array = this.wrapDimensions(argValues, dimensions.reverse())
			if (dimensions.length > 1 || this.types[keywordNode.data].length > 1) { this.addInclude('cloneValue'); array = `cloneValue(${array})` }
			return Descriptor(array, {
				type: keywordNode.data,
				dimensions,
				complexity: 999
			})
		}

		//else treat as function/constructor call
		else {
			if (this.debug) {
				if (callName == 'print') {
					var args = argValues.map(function (a) {
						return a + ':' + a.type
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
				var type, optimize = false, outArgs = null

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
					if (callName == 'mix' && /^(?:bool|bvec)/.test(argTypes[2])) callName = 'mixSelect'
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

				if (callName == 'transpose') {
					const cols = this.types[argTypes[0]].length, rows = this.types[this.types[argTypes[0]].type].length
					argValues.push(cols, rows)
				}
				if (callName == 'modf') outArgs = [{ index: 1 }]
				var res = `${callName}(${argValues.join(', ')})`
				if (outArgs) {
					const writes = [], values = argValues.slice()
					const output = index => {
						if (index === outArgs.length) return `(${callName}(${values.join(', ')}), ${writes.map((write, i) => write(`${callName}.__out__[${i}]`)).join(', ')}, ${callName}.__return__)`
						const argIndex = outArgs[index].index
						return this.reference(args[argIndex], (target, write) => {
							values[argIndex] = target; writes[index] = write
							return output(index + 1)
						})
					}
					res = output(0)
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
		const raw = node.data
		const unsigned = /[uU]$/.test(raw)
		let value = raw.replace(/[uUfF]$/, match => /[uU]/.test(match) || !/^0x/i.test(raw) ? '' : match)
		if (/^0[0-7]+$/.test(value)) value = '0o' + value.slice(1)
		const integer = /^(?:0[xX][\da-fA-F]+|0o[0-7]+|\d+)$/.test(value)
		if (integer && Number(value) > 0xffffffff) throw new SyntaxError('Integer literal exceeds 32 bits')
		const result = integer && !unsigned && Number(value) > 0x7fffffff ? Number(value) | 0 : /^0[xXo]/.test(value) ? Number(value) : value
		return Descriptor(result, { type: unsigned ? 'uint' : integer ? 'int' : 'float', complexity: 0 })
	},

	//ifs are the same as js
	if: function (node) {
		var cond = this.process(node.children[0])
		var ifBody = this.withScope(() => this.process(node.children[1]))

		var result = `if (${cond}) {\n${ifBody}\n}`

		if (node.children.length > 1) {
			var elseBody = this.withScope(() => this.process(node.children[2]))
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
		//FIXME: single-multip location ops like (x*34.) + 1. are possible to be unwrapped, providing that they are of the most precedence.
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
			complexity: children.reduce(function (prev, curr) { return prev + curr.complexity || 0 }, 0)
		})
	}

}

/**
 * Return list if ids for swizzle letters
 */
// '$' cannot occur in a GLSL identifier. Each captured reference gets its own
// names so nested output parameters cannot shadow one another or shader locals.
GLSL.prototype.temp = function () { return `$${this.tempIndex++}` }

GLSL.prototype.reference = function (node, update) {
	const value = this.process(node)
	if (node.type === 'operator' && node.data === '.') {
		const base = this.process(node.children[0]), prop = node.children[1].data
		const object = this.temp(), result = this.temp()
		if (!this.structs[base.type] && swizzleRE.test(prop)) {
			const positions = this.swizzlePositions(prop)
			if (new Set(positions).size !== positions.length) throw new TypeError('A writable swizzle cannot repeat a component')
			if (positions.length === 1 && /^(?:ident|builtin)$/.test(node.children[0].type)) {
				const target = Descriptor(`${base}[${positions[0]}]`, { type: value.type })
				return update(target, v => `${target} = ${v}`)
			}
			const target = Descriptor(positions.length === 1 ? `${object}[${positions[0]}]` : `[${positions.map(i => `${object}[${i}]`)}]`, { type: value.type })
			const write = v => positions.length === 1 ? `${object}[${positions[0]}] = ${v}` : `((${result}) => { ${positions.map((p, i) => `${object}[${p}] = ${result}[${i}];`).join(' ')} return ${result}; })(${v})`
			return `((${object}) => ${update(target, write)})(${base})`
		}
		return `((${object}) => ${update(Descriptor(`${object}.${prop}`, value), v => `${object}.${prop} = ${v}`)})(${base})`
	}
	if (node.type === 'binary' && node.data === '[') {
		const object = this.temp(), index = this.temp(), result = this.temp()
		const column = node.children[0]
		if (column.type === 'binary' && column.data === '[') {
			const matrix = this.process(column.children[0])
			if (/mat/.test(matrix.type) && !matrix.dimensions?.length) {
				const rows = this.types[this.types[matrix.type].type].length
				const target = Descriptor(`${object}[${index} * ${rows} + ${result}]`, value)
				return `((${object}, ${index}, ${result}) => ${update(target, v => `${target} = ${v}`)})(${matrix}, ${this.process(column.children[1])}, ${this.process(node.children[1])})`
			}
		}
		const base = this.process(column), subscript = this.process(node.children[1])
		if (/mat/.test(base.type) && !base.dimensions?.length) {
			const rows = this.types[this.types[base.type].type].length
			const target = Descriptor(`${object}.slice(${index} * ${rows}, (${index} + 1) * ${rows})`, value)
			const write = v => `((${result}) => { ${Array.from({length: rows}, (_, i) => `${object}[${index} * ${rows} + ${i}] = ${result}[${i}];`).join(' ')} return ${result}; })(${v})`
			return `((${object}, ${index}) => ${update(target, write)})(${base}, ${subscript})`
		}
		return `((${object}, ${index}) => ${update(Descriptor(`${object}[${index}]`, value), v => `${object}[${index}] = ${v}`)})(${base}, ${subscript})`
	}
	if (!['ident', 'builtin'].includes(node.type)) throw new TypeError('Expected a writable expression')
	return update(value, v => `${value} = ${v}`)
}

GLSL.prototype.increment = function (node, postfix) {
	const value = this.process(node.children[0]), sign = node.data === '++' ? '+' : '-'
	if (value.type !== 'uint' && value.type !== 'int' && !/vec/.test(value.type))
		return Descriptor(postfix ? `${value}${node.data}` : `${node.data}${value}`, { type: value.type, optimize: false })
	const code = this.reference(node.children[0], (target, write) => {
		const name = this.temp(), old = Descriptor(name, { type: target.type })
		const next = this.processOperation(old, Descriptor(1, { type: /u/.test(target.type) ? 'uint' : 'int' }), sign)
		return `((${name}) => (${write(next)}, ${postfix ? name : target}))(${target})`
	})
	return Descriptor(code, { type: value.type, optimize: false })
}

GLSL.prototype.swizzlePositions = function (prop) {
	var swizzles = 'xyzwstpqrgba'
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
			result = Descriptor(`${ident}[${args[0]}]`, { type: null, complexity: 999 })
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
	if (type && args.length === this.types[type].length && positions.every(function (position, i) { return position === i })) {
		return ident
	}

	var complexity = args.length * ident.complexity

	//a.yz → [1, 2].map(function(x) { return this[x]; }, a)
	var ctor = /^uvec/.test(type) ? 'Uint32Array' : /^ivec/.test(type) ? 'Int32Array' : 'Float32Array'
	const swizzle = `[${positions.join(', ')}].map(function (x, i) { return this[x]}, ${ident})`
	var result = Descriptor(/^bvec/.test(type) ? swizzle : `new ${ctor}(${swizzle})`, {
		complexity: ident.components ? args.length * 2 : 999,
		type: `${/^([biud])vec/.exec(type)?.[1] || ''}vec${args.length}`,
		optimize: ident.optimize,
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
		if (variable.binding === 'in') this.inputs[ident] = variable
		if (variable.binding === 'out') this.outputs[ident] = variable
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
	let current = this.scopes[scope]
	while (current) {
		if (Object.hasOwn(current, ident)) return current[ident]
		current = current.__parentScope
	}
}


/**
 * Return value wrapped to the proper number of dimensions
 */
GLSL.prototype.withScope = function (render) {
	const previous = this.currentScope, parent = this.scopes[previous]
	const name = `${previous}:${Object.keys(this.scopes).length}`
	this.scopes[name] = Object.assign(Object.create(null), { __name: name, __parentScope: parent, __block: true, callName: parent.callName, outArgs: parent.outArgs })
	this.currentScope = name
	try { return render() } finally { this.currentScope = previous }
}

GLSL.prototype.declareFunctions = function (root) {
	const signatures = new Map()
	for (const statement of root.children) {
		const decl = statement.children?.[0], fn = decl?.children?.[5]
		if (fn?.type !== 'function') continue
		const name = fn.children[0].data, params = fn.children[1].children
		const signature = name + ':' + params.map(p => p.children[4].data).join('_')
		if (!signatures.has(signature)) signatures.set(signature, this.functions[name] ? `${name}_${params.map(p => p.children[4].data).join('_')}` : name)
		const callName = fn.callName = signatures.get(signature)
		const descriptor = Descriptor(null, { type: decl.children[4].data })
		descriptor.outArgs = params.flatMap((p, index) => (p.qualifiers || []).some(q => q === 'out' || q === 'inout') ? [{ index }] : [])
		if (!descriptor.outArgs.length) descriptor.outArgs = null
		this.functions[callName] = descriptor
	}
}

GLSL.prototype.constant = function (node) {
	if (!node || !node.children?.length && node.type === 'expr') return null
	if (node.type === 'expr' || node.type === 'group') return this.constant(node.children[0])
	if (node.type === 'literal') return Number(this.process(node))
	if (node.type === 'ident') return Number(this.variable(node.data)?.value)
	if (node.type === 'unary') return node.data === '-' ? -this.constant(node.children[0]) : this.constant(node.children[0])
	if (node.type === 'binary') {
		const a = this.constant(node.children[0]), b = this.constant(node.children[1])
		return ({ '+': () => a+b, '-': () => a-b, '*': () => a*b, '/': () => Math.trunc(a/b), '%': () => a%b, '<<': () => a<<b, '>>': () => a>>b, '|': () => a|b, '&': () => a&b })[node.data]?.()
	}
	throw new TypeError('Expected a constant array length')
}

GLSL.prototype.wrapDimensions = function (value, dimensions) {
	//wrap value to dimensions
	if (dimensions?.length) {
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
		if (this.includes[name] == null) {
			this.includes[name] = true
			this.addInclude(this.stdlib[name]?.include)
		}
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
	var methods = [], emitted = new Set()

	for (var meth in includes) {
		if (!includes[meth]) continue

		//eg vecN
		var result = this.stdlib[meth].toString()
		if (!emitted.has(result)) { methods.push(result); emitted.add(result) }

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
