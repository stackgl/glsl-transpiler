/**
 * Transform glsl to js.
 *
 * Dev notes.
 * glsl-parser often creates identifiers/other nodes by inheriting them from definition.
 * So by writing som additional info into nodes, note that it will be accessible everywhere below, where initial id is referred by.
 *
 * @module  glsl-js/lib/index
 */

var Emitter = require('events');
var inherits = require('inherits');
var assert = require('assert');
var parse = require('./parse');
var extend = require('xtend/mutable');
var builtins = require('./builtins');
var types = require('./types');
var primitives = require('./primitives');
var operators = require('./operators');
var stdlib = require('./stdlib');
var flatten = require('array-flatten');
var Descriptor = require('./descriptor');


/**
 * Create GLSL codegen instance
 *
 * @constructor
 */
function GLSL (options) {
	if (!(this instanceof GLSL)) return new GLSL(options);

	extend(this, options);

	this.reset();

	//return function compiler for convenience
	var compile = this.compile.bind(this);
	compile.glsl = this;
	compile.compile = compile;

	return compile;
};

inherits(GLSL, Emitter);


/**
 * Basic rendering settings
 */
GLSL.prototype.replaceUniform = false;
GLSL.prototype.replaceAttribute = false;
GLSL.prototype.replaceVarying = false;
GLSL.prototype.optimize = true;


/**
 * Operator names
 */
GLSL.prototype.operators = operators.operators;


/**
 * Primitive types, which are presented as numbers in js
 */
GLSL.prototype.primitives = primitives;


/**
 * Type constructors
 */
GLSL.prototype.types = types;


/**
 * Map of builtins with their types
 */
GLSL.prototype.builtins = builtins;


/**
 * Parse string arg, return ast.
 */
GLSL.prototype.parse = parse;


/**
 * Stdlib functions
 */
GLSL.prototype.stdlib = stdlib;


/**
 * Max number of operations allowable to repeat in unfolding vec/mat to arrays.
 * Basically that is the price of calling gl-matrix method or array native method.
 * If an vec/mat expression is below that number of complexity, it will be exposed by repeating calc for each component, otherwise - called a special method.
 *
 * e.g.
 * `vec(fn(x)) → [fn(x), fn(x)]`, if complexity of fn(x) < 10.
 * `vec(fn(x)) → [0, 0].fill(fn(x))`, if complexity of fn(x) > 10
 */
GLSL.prototype.maxComplexity = 50;


/**
 * Initialize analysing scopes/vars/types
 */
GLSL.prototype.reset = function () {
	if (this.descriptors) this.descriptors.clear();

	//cache of descriptors associated with nodes
	else this.descriptors = new Map();

	//scopes analysed. Each scope is named after the function they are contained in
	this.scopes = {
		global: {
			__name: 'global',
			__parentScope: null
		}
	};

	//hash of registered structures
	this.structures = {

	};

	//collected uniforms
	this.uniforms = {

	};

	//collected varying-s
	this.varying = {

	};

	//collected attributes
	this.attributes = {

	};

	//collected functions, with output types
	this.functions = {

	};

	//collected stdlib functions need to be included
	this.includes = {

	};

	//defined constants
	this.define = {
		__LINE__: 0,
		__FILE__: '',
		__VERSION__: 100
	};

	//current scope of the node processed
	this.currentScope = 'global';
};


/**
 * Compile whether string or tree to js
 */
GLSL.prototype.compile = function compile (arg) {
	var result = this.process(this.parse(arg));
	result = this.stringifyStdlib(this.includes) + '\n' + result;
	return result;
};


/**
 * Process glsl AST node so that it returns descriptor for a node
 * which by default casts to a string
 * but contains additional info:
 * `component` values, if node operates on array
 * `type` which is returned from the node
 * `complexity` of the node
 */
GLSL.prototype.process = function stringify (node, arg) {
	//return cached descriptor, if already was processed
	if (this.descriptors.has(node)) return this.descriptors.get(node);

	if (node == null ||
		typeof node === 'number' ||
		typeof node === 'string' ||
		typeof node === 'boolean' ||
		node instanceof String) return this.cache(node, node);

	//in some cases glsl-parser returns node object inherited from other node
	//which properties exist only in prototype.
	//Insofar structures take it’s definition type, so should be ignored.
	//See #Structures test for example.
	if (!node.hasOwnProperty('type')) return this.cache(node, null);

	var t = this.transforms[node.type];

	var startCall = false;

	//wrap unknown node
	if (t === undefined) {
		console.warn(`Unknown node type '${node.type}'`);
		return this.cache(node, null);
	}

	if (!t) {
		return this.cache(node, null);
	}

	if (typeof t !== 'function') {
		return this.cache(node, t);
	}

	//do start routines on the first call
	if (!this.started) {
		this.emit('start', node);
		this.started = true;
		startCall = true;
	}

	//apply node serialization
	var result = t.call(this, node, arg);

	//apply optimization, if possible
	if (result.complexity < this.maxComplexity) {
		//expand array
		if (result.components.length > 1) {
			result = Descriptor(`[${result.components.join(', ')}]`, result);
			result.components.forEach(function (c) {this.addInclude(c.include);}, this);
		}
	}
	//unoptimal result usually requires includes
	else {
		this.addInclude(result.include);
	}

	this.cache(result);

	//invoke end
	if (startCall) {
		this.started = false;
		this.emit('end', node);
	}

	return result;
}


/**
 * Cache descriptor, return it
 */
GLSL.prototype.cache = function (node, value) {
	if (this.descriptors.has(node)) return this.descriptors.get(node);

	//force descriptor on save
	if (!(value instanceof String)) value = Descriptor(value);

	this.descriptors.set(node, value);

	return this.descriptors.get(node);
}



/**
 * List of transforms for various token types
 */
GLSL.prototype.transforms = {
	stmtlist: function (node) {
		if (!node.children.length) return Descriptor(null);

		var result = node.children.map(this.process, this).join('\n');

		return Descriptor(result);
	},

	stmt: function (node) {
		var result = node.children.map(this.process, this).join('');
		if (result) result += ';';

		return Descriptor(result);
	},

	struct: function (node) {
		var structName = node.children[0].data;

		//get args nodes
		var args = node.children.slice(1);
		var argTypes = [];

		//arg names
		var argsList = flatten(args.map(function (arg) {
			assert.equal(arg.type, 'decl', 'Struct statements should be declarations.')

			var decllist = arg.children[arg.children.length - 1];

			assert.equal(decllist.type, 'decllist', 'Struct statement declaration has wrong structure.');

			return decllist.children.map(function (ident) {
				assert.equal(ident.type, 'ident', 'Struct statement contains something other than just identifiers.');
				return ident.data;
			});
		}));

		var argTypes = flatten(args.map(function (arg) {
			var type = arg.children[4].token.data;
			var decllist = arg.children[arg.children.length - 1];
			return decllist.children.map(function () {
				return type;
			});
		}));

		//register struct constructor, in a fashion of type constructors
		this.structures[structName] = function (args) {
			args = args || [];
			var fields = argsList.map(function (argName, i) {
				if (args[i]) {
					var initValue = this.process(args[i]);
				} else {
					var initValue = this.types[argTypes[i]].call(this, args[i]);
				}
				return `${argName}: ${initValue}`
			}, this);
			return `{\n${fields.join(',\n')}\n}`;
		}.bind(this);

		return Descriptor(null);
	},

	function: function (node) {
		var result = '';

		//if function has no body, that means it is interface for it. We can ignore it.
		if (node.children.length < 3) return Descriptor(null);

		//add function name - just render ident node
		assert.equal(node.children[0].type, 'ident', 'Function should have an identifier.');
		var name = this.process(node.children[0]);

		//add args
		assert.equal(node.children[1].type, 'functionargs', 'Function should have arguments.');
		var args = this.process(node.children[1]);


		//add body
		assert.equal(node.children[2].type, 'stmtlist', 'Function should have a body.');
		result += `function ${name} (${args}) {\n`;
		result += this.process(node.children[2]);
		result = result.replace(/\n/g, '\n\t');
		result += '\n}';

		//get scope back to the global after fn ended
		this.currentScope = this.scopes[this.currentScope].__parentScope.__name;

		return Descriptor(result);
	},

	//function arguments are just shown as a list of ids
	functionargs: function (node) {
		//create new scope - func args are the unique token stream-style detecting a function entry
		var lastScope = this.currentScope;
		var scopeName = (node.parent && node.parent.children[0].data) || 'global';
		this.currentScope = scopeName;

		if (!this.scopes[scopeName]) {
			this.scopes[scopeName] = {
				__parentScope: this.scopes[lastScope],
				__name: scopeName
			};
		}

		var result = node.children.map(this.process, this).join(', ');

		return Descriptor(result);
	},

	//declarations are mapped to var a = n, b = m;
	//decl defines it’s inner placeholders rigidly
	decl: function (node) {
		var result = '';

		var typeNode = node.children[4];
		var decllist = node.children[5];

		//register structure
		if (node.token.data === 'struct') {
			this.process(typeNode);
			if (!decllist) return Descriptor(null);
		}


		assert(
			decllist.type === 'decllist' ||
			decllist.type === 'function' ||
			decllist.type === 'struct',
		'Decl structure is malicious');


		//declare function as hoisting one
		if (decllist.type === 'function') {
			return this.process(decllist);
		}

		//define variables
		if (node.token.data === 'struct') {
			result += 'var ' + this.process(decllist);
		}
		else if (node.token.data === 'attribute') {
			result += 'var ' + this.process(decllist, this.replaceAttribute);
		}
		else if (node.token.data === 'varying') {
			result += 'var ' + this.process(decllist, this.replaceVarying);
		}
		else if (node.token.data === 'uniform') {
			result += 'var ' + this.process(decllist, this.replaceUniform);
		}
		else if (node.token.data === 'buffer') {
			result += 'var ' + this.process(decllist);
		}
		else if (node.token.data === 'shared') {
			result += 'var ' + this.process(decllist);
		}
		else if (node.token.data === 'const') {
			result += 'var ' + this.process(decllist);
		}
		//structure
		else if (this.structures[node.token.data] != null) {
			result += 'var ' + this.process(decllist);
		}
		//case of function args - drop var
		else if (node.parent.type === 'functionargs') {
			result += this.process(decllist);
		}
		//case of struct - also drop var
		else if (node.parent.type === 'stmt' && node.parent.token.data === 'struct') {
			result += this.process(decllist);
		}
		//default type
		else {
			result += 'var ' + this.process(decllist);
		}

		return Descriptor(result);
	},


	//decl list is the same as in js, so just merge identifiers, that's it
	decllist: function (node, replace) {
		var ids = [];
		var lastId = 0;

		//get datatype - it is the 4th children of a decl
		var dataType = node.parent.children[4].token.data;

		//unwrap anonymous structure type
		if (dataType === 'struct') {
			dataType = node.parent.children[4].children[0].data;
		}

		//attribute, uniform, varying etc
		var bindingType = node.parent.children[1].token.data;

		//get dimensions - it is from 5th to the len-1 nodes of a decl
		//that’s in case if dimensions are defined first-class like `float[3] c = 1;`
		//result is [] or [3] or [1, 2] or [4, 5, 5], etc.
		//that is OpenGL 3.0 feature
		var dimensions = [];
		for (var i = 5, l = node.parent.children.length - 1; i < l; i++) {
			dimensions.push(parseInt(node.parent.children[i].children[0].children[0].data));
		}

		for (var i = 0, l = node.children.length; i < l; i++) {
			var child = node.children[i];

			if (child.type === 'ident') {
				var ident = this.process(child);
				lastId = ids.push(ident);

				//save identifier to the scope
				this.variable(ident, {
					type: dataType,
					binding: bindingType,
					node: child,
					dimensions: []
				});
			}
			else if (child.type === 'quantifier') {
				//with non-first-class array like `const float c[3]`
				//dimensions might be undefined, so we have to specify them here
				var dimensions = this.variable(ids[lastId - 1]).dimensions;
				dimensions.push(parseInt(child.children[0].children[0].data));
				this.variable(ids[lastId - 1], {dimensions: dimensions});
			}
			else if (child.type === 'expr') {
				var ident = ids[lastId - 1];

				//ignore wrapping literals
				var value = this.process(child);

				//save identifier initial value
				this.variable(ident, {value: value});
			}
			else {
				throw Error('Undefined type in decllist: ' + child.type);
			}
		}

		var functionargs = node.parent.parent.type === 'functionargs';

		var res = Descriptor(ids.map(function (ident, i) {
			if (functionargs) return ident;

			//function replacer
			if (replace instanceof Function) {
				return `${ident} = ${replace(ident, this.variable(ident))}`;
			}
			else {
				return `${ident} = ${this.variable(ident).value}`;
			}
		}, this).join(', '));

		return res;
	},

	//placeholders are empty objects - ignore them
	placeholder: function (node) {
		return node.token.data;
	},

	//i++, --i etc
	suffix: function (node) {
		var str = this.process(node.children[0]);
		return Descriptor(str + node.data, {type: str.type});
	},

	//loops are the same as in js
	forloop: function (node) {
		var init = this.process(node.children[0]);
		var cond = this.process(node.children[1]);
		var iter = this.process(node.children[2]);
		var body = this.process(node.children[3]);

		return `for (${init}; ${cond}; ${iter}) {\n${body}\n}`;
	},

	whileloop: function (node) {
		var cond = this.process(node.children[0]);
		var body = this.process(node.children[1]);

		return `while (${cond}) {\n${body}\n}`;
	},

	//access operators - expand to arrays
	operator: function (node) {
		if (node.data === '.') {
			var identNode = node.children[0];
			var ident = this.process(identNode);
			var type = ident.type;
			var prop = node.children[1].data;

			//ab.xyz for example
			if (this.isSwizzle(node)) {
				return this.unswizzle(node);
			}

			// if (/vec/.test(type)) {
			// 	var len = node.children[1].data.length;
			// 	//FIXME: not necessarily a float vector
			// 	if (len === 1) type = 'float';
			// 	if (len === 2) type = 'vec2';
			// 	if (len === 3) type = 'vec3';
			// 	if (len === 4) type = 'vec4';
			// }

			return Descriptor(`${ident}.${prop}`, {
				type: type
			});
		}

		throw Error('Unknown operator ' + node.data);

		return '';
	},

	//simple expressions are mapped 1:1
	//but unswizzling, multiplying etc takes part
	expr: function (node) {
		var result = node.children.map(this.process, this).join('');

		return Descriptor(result);
	},

	//precisions are just ignored
	precision: function () {
		return '';
	},

	//FIXME: it never creates comments
	comment: function (node) {
	},

	preprocessor: function (node) {
		var str = node.token.data;
		var args = /#\s*([a-z]+)\s*([a-z0-9_]+)(\([^\)]*\))?\s*/i.exec(str);
		var macroName = args[1];
		var varName = args[2];
		var macroArgs = args[3];

		if (!macroName) return;

		if (/^define/.test(macroName)) {
			var restIdx = str.indexOf(varName);
			var rest = str.slice(restIdx + varName.length + (macroArgs ? macroArgs.length : 0)).trim();
			var fnArgs = [];
			if (macroArgs) fnArgs = macroArgs.slice(1, -1).split(/\s*,\s*/)

			//#define FOO (expr)
			//#define FOO(A, B) (expr)
			if(rest[0] === '(' && rest[rest.length - 1] === ')') {
				var fn = new Function(`return ${rest}`);
				Object.defineProperty(this.define, varName, {
					get: fn,
					configurable: true
				});
			}

			//#define FOO insertion
			else {
				if (macroArgs && macroArgs.length) varName += '()';
				Object.defineProperty(this.define, varName, {
					get: (function (name) {
						return function () {
							return this[name] != null ? this[name] : name;
						}
					})(rest),
					configurable: true
				});
			}
		}

		if (/^undef/.test(macroName)) {
			var varNameOnly = /[a-z0-9_]+/i.exec(varName)[0];
			delete this.define[varNameOnly];
			delete this.define[varNameOnly+'()'];
		}
	},

	keyword: function (node) {
		if (node.data === 'true' || node.data === 'false') type = 'bool';
		//FIXME: guess every other keyword is a type, isn’t it?
		else type = node.data;

		return Descriptor(node.data, {
			type: type,
			complexity: 0
		});
	},

	ident: function (node) {
		//get type of registered var
		if (node.parent.type !== 'decllist' && node.parent.type !== 'function' && node.parent.type !== 'call') {
			var id = node.token.data;
			var scope = this.scopes[this.currentScope];

			//find the closest scope with the id
			while (scope[id] == null) {
				scope = scope.__parentScope;
				if (!scope) console.warn(`'${id}' is not defined`);
			}

			var type = scope[id].type;

			var components = [];
			if (this.types[type].length > 1) {
				var l = this.types[type].length;
				if (/mat/.test(type)){
					l *= this.types[this.types[type].type].length;
				}
				components = Array(l).fill(0).map(function (x, i) {
					return `${node.data}[${i}]`;
				});
			}

			return Descriptor(node.data, {
				type: type,
				complexity: 0,
				components: components
			});
		}

		//FIXME: guess type more accurately here
		return Descriptor(node.data, {
			complexity: 0
		});
	},

	return: function (node) {
		var expr = this.process(node.children[0]);
		return Descriptor('return' + (expr.visible ? ' ' + expr : ''), {type: expr.type});
	},

	continue: function () {return Descriptor('continue')},

	break: function () {return Descriptor('break')},

	discard:  function () {return Descriptor('discard()')},

	'do-while': function (node) {
		var exprs = this.process(node.children[0]);
		var cond = this.process(node.children[1]);
		return `do {\n${exprs}\n} while (${cond})`;
	},

	//simple binary expressions
	binary: function (node) {
		var result = '';

		var leftNode = node.children[0];
		var rightNode = node.children[1];
		var left = this.process(leftNode);
		var right = this.process(rightNode);
		var leftType = left.type;
		var rightType = right.type;
		var operator = node.data;

		//data access operator
		if (node.data === '[') {
			//for case of glsl array access like float[3]
			if (this.types[node.type]) {
				return Descriptor(`${leftType}[${right}]`, {
					type: this.types[leftType].type,
					complexity: left.complexity + right.complexity + 1
				});
			}

			//matrix/etc double access a[1][2]
			if (leftNode.type === 'binary') {
				var matNode = leftNode.children[0];
				var matDesc = this.process(matNode);
				var vecSize = this.types[leftType].length;
				var matType = matDesc.type;
				var matSize = this.types[matType].length;
				var outerRight = this.process(leftNode.children[1]);

				var idx = parseFloat(outerRight)|0;
				var offset = parseFloat(right)|0;

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
						complexity: this.maxComplexity
					});
				}
			}

			//matrix single access a[0] → vec
			if (/mat/.test(leftType)) {
				return Descriptor(this.getMatrixComponent(leftNode, right), {
					type: this.types[leftType].type,
					complexity: this.maxComplexity
				});
			}

			//something[N] return as is
			return Descriptor(`${left}[${right}]`, {
				type: this.types[leftType].type,
				complexity: left.complexity + right.complexity + 1
			});
		}


		//default binary operators a × b
		return this.renderOperation(leftNode, rightNode, operator);
	},

	//assign - same as binary basically
	assign: function (node) {
		var result = '';

		var operator = node.data;

		var left = this.process(node.children[0]);
		var right = this.process(node.children[1]);
		var leftType = left.type;
		var rightType = right.type;

		//handle primitive with no doubts as floats
		if (this.primitives[leftType] && this.primitives[rightType]) {
			return Descriptor(`${left} ${operator} ${right}`);
		}

		//otherwise - expand custom assignments
		//operatory assign, eg a *= x → a = a * x
		if (operator.length > 1) {
			var nonPrimitive = this.primitives[leftType] ? rightType : leftType;
			var subOperator = operator.slice(0, -1);
			var opName = this.operators[subOperator];

			//in cases of setting swizzle - we gotta be discreet, eg
			//v.yx *= coef → vec2.multiply(v, [v[0], v[1], [0, 0].fill(coef)]);
			var target;
			//a.xy *= ... → mult(a, ....)
			if (this.isSwizzle(node.children[0])) {
				target = this.process(node.children[0].children[0]);
			}
			//a *= ... → mult(a, ....)
			else {
				target = left;
			}

			var binaryNode = {
				type: 'binary',
				children: [node.children[0], node.children[1]],
				data: subOperator
			};
			var result = this.process(binaryNode);

			return Descriptor(`${target} = ${result}`);
		}

		//simple assign, =
		return Descriptor(`${left} = ${right}`);
	},

	ternary: function (node) {
		var cond = this.process(node.children[0]);
		var a = this.process(node.children[1]);
		var b = this.process(node.children[2]);

		return Descriptor(`${cond} ? ${a} : ${b}`, {type: a.type});
	},

	unary: function (node) {
		var str = this.process(node.children[0]);

		var complexity = str.complexity + 1;

		//ignore + operator, we dont need to cast data
		if (node.data === '+') {
			//++x
			if (node.children[0].type === 'unary') {
				return Descriptor(node.data + str, {type: str.type, complexity: complexity});
			}
			else if (node.children[0].parent.type === 'unary') {
				return Descriptor(node.data + str, {type: str.type, complexity: complexity});
			}

			//+x
			return Descriptor(str);
		}
		return Descriptor(node.data + str, {type: str.type, complexity: complexity});
	},

	//gl_Position, gl_FragColor, gl_FragPosition etc
	builtin: function (node) {
		return Descriptor(node.data, {
			type: this.builtins[node.data],
			complexity: 0
		});
	},

	//if a function call - then just make a call
	//or if a data type - then save type as well, avoid wrapping literals
	call: function (node) {
		//if first node is an access, like a.b() - treat special access-call case
		if (node.children[0].data === '.') {
			var methodNode = node.children[0].children[1];
			var holderNode = node.children[0].children[0];
			var methodName = this.process(methodNode);
			var holderName = this.process(holderNode);
			var type = holderName.type;

			//if length call - return length of a vector
			//vecN.length → N
			if (methodName == 'length' && this.types[type].length > 1) {
				return this.types[type].length;
			}

			return Descriptor(`${holderName}.${methodName}`, {type: methodName.type});
		}

		//first node is caller: float(), float[2](), vec4[1][3][4]() etc.
		var callerNode = node.children[0];
		var callName = this.process(node.children[0]);

		var args = node.children.slice(1);
		var argValues = args.map(this.process, this);


		//if first child of the call is array call - expand array
		//FIXME: in cases of anonymously created arrays of arrays, outside of declarations, there might be an issue: `vec4[3][3](0,1)`
		if (node.children[0].data === '[') {
			var dimensions = [];
			var keywordNode = node.children[0];
			while (keywordNode.type != 'keyword') {
				dimensions.push(parseInt(keywordNode.children[1].data));
				keywordNode = keywordNode.children[0];
			}

			//if nested type is primitive - expand literals without wrapping
			var value = '';
			if (this.types[callName]) {
				value += args.map(this.process, this).join(', ');
			} else {
				value += callName + '(';
				value += args.map(this.process, this).join(', ');
				value += ')';
			}

			//wrap array init expression
			return Descriptor(this.wrapDimensions(argValues, dimensions.reverse()), {type: callName.type});
		}

		//else treat as function/constructor call
		else {
			//vec2(), float()
			if (this.types[callName]) {
				return this.types[callName].apply(this, args);
			}

			//struct()
			else if (this.structures[callName]) {
				return this.structures[callName].call(this, args);
			}

			//someFn()
			else {
				var type;
				//stdlib()
				if (this.stdlib[callName]) {
					this.addInclude(callName);

					//add other includes if any
					this.addInclude(this.stdlib[callName].include);

					type = this.stdlib[callName].type;
					if (type instanceof Function) type = type.call(node);
				}

				if (this.functions[callName]) type = this.functions[callName];

				if (!type) {
					console.warn(`Unable to guess the type of '${callName}' as it is undefined. Guess it returns the type of the first argument.`);
					type = this.process(node.children[1]).type;
				}

				return Descriptor(`${callName}(${args.map(this.process, this).join(', ')})`, {
					type: type || callName.type,
					complexity: this.maxComplexity
				});
			}
		}
	},

	//literal are rendered the same in js, as it very natural
	//FIXME: special cases of floats
	literal: function (node) {
		//convert 023 → 0o23
		if (/^0[0-9]+/.test(node.data)) {
			node.data = '0o' + node.data.slice(1);
		}

		//if special format - parse it as int, else - return unchanged
		var result = /[xob]/.test(node.data) ? Number(node.data) : node.data;

		//guess type
		var type;
		if (/true|false/i.test(node.data)) type = 'bool';
		if (/.|[0-9]e[0-9]/.test(node.data)) type = 'float';
		if (/[0-9]/.test(node.data) > 0) type = 'int';

		return Descriptor(result, {type: type, complexity: 0});
	},

	//ifs are the same as js
	if: function (node) {
		var cond = this.process(node.children[0]);
		var ifBody = this.process(node.children[1]);

		var result = `if (${cond}) {\n${ifBody}\n}`;

		if (node.children.length > 1) {
			var elseBody = this.process(node.children[2]);
			if (elseBody.visible) result += ` else {\n${elseBody}\n}`;
		}

		return result;
	},

	//grouped expression like a = (a - 1);
	group: function (node) {
		var children = node.children.map(this.process, this);
		//bring components of a child
		var result = '(' + children.join(', ') + ')';
		var last = children[children.length - 1];

		return Descriptor(result, {
			type: last.type,
			components: last.components,
			complexity: children.reduce(function (prev, curr) {return prev+curr.complexity||0}, 0)
		});
	}

	// switch: function () {
	//FIXME: not implemented in glsl-parser
	// }
}


/**
 * Detect whether node is swizzle
 */
GLSL.prototype.isSwizzle = function (node) {
	if (node.type != 'operator') return false;

	var prop = node.children[1].data;

	return /^[xyzwstpdrgba]{1,4}$/.test(prop);
}

/**
 * Transform access node to a swizzle construct
 * ab.xyz → [ab[0], ab[1], ab[2]]
 */
GLSL.prototype.unswizzle = function (node) {
	var identNode = node.children[0];

	var ident = this.process(identNode);
	var type = ident.type;
	var prop = node.children[1].data;

	var swizzles = 'xyzwstpdrgba';

	var args = [], positions = [];

	for (var i = 0, l = prop.length; i < l; i++) {
		var letter = prop[i];
		var position = swizzles.indexOf(letter) % 4;
		positions.push(position);

		//[0, 1].yx → [0, 1]
		// a.yx → [a[1], a[0]]
		var value = ident.components[position];

		args.push(value);
	}

	//a.x → a[0]
	if (args.length === 1) {
		if (args[0] == null) console.warn(`Cannot unswizzle '${ident.type}(${ident}).${prop}': ${prop} is outside the type range.`);

		var result = Descriptor(args[0]||'undefined', {
			type: 'float',
			complexity: 1,
			components: args
		});
		return result;
	}

	//vec2 a.xy → a
	if (args.length === this.types[type].length && positions.every(function (position, i) { return position === i})) {
		return ident;
	}

	var complexity = args.length * ident.complexity;

	//a.yz → [a[1], a[2]]
	if (complexity < this.maxComplexity) {
		var result = Descriptor(`[${args.join(', ')}]`, {
			type: `vec${args.length}`,
			complexity: complexity,
			components: args
		});
	}
	//a.yz → [1, 2].map(function(x) { return this[x]; }, a)
	else {
		var result = Descriptor(`[${positions.join(', ')}].map(function (x, i) { return this[x]}, ${ident})`, {
			complexity: this.maxComplexity,
			type: `vec${args.length}`,
			components: args
		});
	}

	return result;
}


/**
 * Get matrix component, ie vector.
 * eg m2[2] → [1, 2] etc.
 */
GLSL.prototype.getMatrixComponent = function (node, n) {
	var desc = this.process(node);
	var type = desc.type;
	var size = this.types[type].length;
	var offset = parseFloat(n)|0;
	var complexity = desc.complexity;

	//number access can be unfolded, like a[2] → [1, 2, 3]
	if (!isNaN(offset) && complexity*size < this.maxComplexity) {
		var components = desc.components.slice(offset*size, (offset+1)*size);
		return Descriptor(`[${components.join(', ')}]`, {
			type: this.types[type].type,
			components: components,
			complexity: complexity*size
		});
	}
	//calculated access should slice array
	else {
		return Descriptor(`${desc}.slice(${n}*${size}, (${n} + 1) * ${size})`, {
			type: this.types[type].type,
			complexity: this.maxComplexity
		});
	}
}


/**
 * Get/set variable from/to a [current] scope
 */
GLSL.prototype.variable = function (ident, data, scope) {
	if (!scope) scope = this.currentScope;

	//set/update variable
	if (data) {
		//create variable
		if (!this.scopes[scope][ident]) {
			this.scopes[scope][ident] = {};
		}

		var variable = extend(this.scopes[scope][ident], data);

		//preset default value for a variable, if undefined
		if (data.value == null) {
			if (this.types[variable.type]) {
				variable.value = this.types[variable.type].call(this);
			}
			//structs
			else if (this.structures[variable.type]) {
				variable.value = this.structures[variable.type].call(this);
			}

			//some unknown types
			else {
				variable.value = variable.type + `()`;
			}
			variable.value = this.wrapDimensions(variable.value, variable.dimensions);
		}
		//if value is passed - we guess that variable knows how to init itself
		//usually it is `call` node rendered
		// else {
		// }


		//just set an id
		if (variable.id == null) variable.id = ident;

		//save scope
		if (variable.scope == null) variable.scope = this.scopes[scope];

		//save variable to the collections
		if (variable.binding === 'uniform') {
			this.uniforms[ident] = variable;
		}
		if (variable.binding === 'attribute') {
			this.attributes[ident] = variable;
		}
		if (variable.binding === 'varying') {
			this.varying[ident] = variable;
		}

		return variable;
	}

	//get varialbe
	return this.scopes[scope][ident];
};


/**
 * Return value wrapped to the proper number of dimensions
 */
GLSL.prototype.wrapDimensions = function (value, dimensions) {

	//wrap value to dimensions
	if (dimensions.length) {
		if (!Array.isArray(value)) value = [value];

		value = dimensions.reduceRight(function (value, curr) {
			var result = [];

			//for each dimension number - wrap result n times
			var prevVal, val;
			for (var i = 0; i < curr; i++) {
				val = value[i] == null ? prevVal : value[i];
				prevVal = val;
				result.push(val);
			}
			return `[${result.join(', ')}]`;
		}, value);
	}

	return value;
};


/**
 * Operator renderer
 */
GLSL.prototype.renderOperation = operators;


/**
 * Add include, pass optional prop object
 */
GLSL.prototype.addInclude = function (name, prop) {
	if (!name) return;

	if (Array.isArray(name)) {
		return name.forEach(this.addInclude, this);
	}

	if (typeof name === 'object') {
		for (var subName in name) {
			this.addInclude(subName, name[subName]);
		}
		return;
	}

	if (!prop) {
		if (!this.includes[name]) this.includes[name] = true;
	}
	else {
		if (!this.includes[name] || this.includes[name] === true) this.includes[name] = {};
		this.includes[name][prop] = true;
	}
}


/**
 * Get stdlib source for includes
 */
GLSL.prototype.stringifyStdlib = function (includes) {
	if (!includes) includes = this.includes;

	var methods = [];

	for (var meth in includes) {
		//eg vecN
		var result = this.stdlib[meth].toString();
		methods.push(result);

		//eg vecN.operation
		if (includes[meth]) {
			for (var prop in includes[meth]) {
				if (!this.stdlib[meth][prop]) {
					console.warn(`Cannot find '${meth}.${prop}' in stdlib`);
					continue;
				}
				methods.push(`${meth}.${prop} = ${this.stdlib[meth][prop].toString()}`);
			}
		}
	}

	return methods.join('\n');
};


module.exports = GLSL;