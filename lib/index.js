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
var flatten = require('array-flatten');
var parse = require('./parse');
var extend = require('xtend/mutable');
var builtins = require('./builtins');
var types = require('./types');
var getType = require('./getType');
var primitives = require('./primitives');
var operators = require('./operators');
var stdlib = require('./stdlib');


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
GLSL.prototype.replaceStdlib = false;


/**
 * Operator names
 */
GLSL.prototype.operatorNames = operators;


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
GLSL.prototype.maxComplexity = 10;


/**
 * Initialize analysing scopes/vars/types
 */
GLSL.prototype.reset = function () {
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

	//current scope of the node processed
	this.currentScope = 'global';
};


/**
 * Compile whether string or tree to js
 */
GLSL.prototype.compile = function compile (arg) {
	if (typeof arg === 'string') {
		arg = this.parse(arg);
	}

	var result = this.stringify(arg);

	return result;
};


/**
 * Transform any glsl ast node to js
 */
GLSL.prototype.stringify = function stringify (node, arg) {

	if (node == null) return '';

	if (typeof node === 'number') return node;
	if (typeof node === 'string') return node;
	if (typeof node === 'boolean') return node;

	//in some cases glsl-parser returns node object inherited from other node
	//which properties exist only in prototype.
	//Insofar structures take it’s definition type, so should be ignored.
	//See #Structures test for example.
	if (!node.hasOwnProperty('type')) return '';

	var t = this.transforms[node.type];

	//if node was stringified already - just return it.
	if (node._result) return node._result;

	var startCall = false;

	//wrap unknown node
	if (t === undefined) {
		node._result = `/* ${node.type} */`;
		return node._result;
	}

	if (!t) {
		node._result = '';
		return node._result;
	}

	if (typeof t !== 'function') {
		node._result = t;
		return node._result;
	}

	//do start routines on the first call
	if (!this.started) {
		this.emit('start', node);
		this.started = true;
		startCall = true;
	}

	//apply node serialization
	node._result = t.call(this, node, arg);
	node._result === undefined ? '' : node._result;

	//notify that handle has passed
	this.emit(node.type, node);

	//invoke end
	if (startCall) {
		//insert detected stdlib
		node._result += this.stringifyStdlib(this.includes);

		this.started = false;
		this.emit('end', node);
	}

	return node._result;
}



/**
 * List of transforms for various token types
 */
GLSL.prototype.transforms = {
	//FIXME: To keep lines consistency should be rendered with regarding line numbers
	//but that is difficult in stream cases
	stmtlist: function (node) {
		if (!node.children.length) return '';

		var result = node.children.map(this.stringify, this).join('\n');

		return result;
	},

	//statement should just map children per-line
	stmt: function (node) {
		var result = '';

		result += node.children.map(this.stringify, this).join('');

		if (result) result += ';';

		return result;
	},

	//structures for simplicity are presented with constructors
	struct: function (node) {
		var structName = node.children[0].data;

		//register structure in the types stack
		this.structures[structName] = true;

		//get args list
		var args = node.children.slice(1);

		var argsList = flatten(args.map(function (arg) {
			assert.equal(arg.type, 'decl', 'Struct statements should be declarations.')

			var decllist = arg.children[arg.children.length - 1];

			assert.equal(decllist.type, 'decllist', 'Struct statement declaration has wrong structure.');

			return decllist.children.map(function (ident) {
				assert.equal(ident.type, 'ident', 'Struct statement contains something other than just identifiers.');
				return ident.data;
			});
		}));

		var assignments = argsList.map(function (arg) {
			return `this.${arg} = ${arg};`;
		});

		var result = `function ${structName} (${argsList.join(', ')}) {\n`;
		result += `\tif (!(this instanceof ${structName})) return new ${structName}(${argsList.join(', ')});\n\n`;
		result += `\t${assignments.join('\n\t')}`;
		result += `\n}`;

		return result;
	},

	//functions are mapped as they are
	function: function (node) {
		var result = '';

		//if function has no body, that means it is interface for it. We can ignore it.
		if (node.children.length < 3) return '';

		//add function name - just render ident node
		assert.equal(node.children[0].type, 'ident', 'Function should have an identifier.');
		var name = this.stringify(node.children[0]);

		//add args
		assert.equal(node.children[1].type, 'functionargs', 'Function should have arguments.');
		var args = this.stringify(node.children[1]);


		//add body
		assert.equal(node.children[2].type, 'stmtlist', 'Function should have a body.');
		result += `function ${name} (${args}) {\n`;
		result += this.stringify(node.children[2]);
		result = result.replace(/\n/g, '\n\t');
		result += '\n}';

		//get scope back to the global after fn ended
		this.currentScope = this.scopes[this.currentScope].__parentScope.__name;

		return result;
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

		var result = node.children.map(this.stringify, this).join(', ');

		return result;
	},

	//declarations are mapped to var a = n, b = m;
	//decl defines it’s inner placeholders rigidly
	decl: function (node) {
		var result = '';

		var typeNode = node.children[node.children.length - 2];
		var decllist = node.children[node.children.length - 1];

		assert(
			decllist.type === 'decllist' ||
			decllist.type === 'function' ||
			decllist.type === 'struct',
		'Decl structure is malicious');

		//declare function as hoisting one
		if (decllist.type === 'function') {
			return this.stringify(decllist);
		}

		//define variables
		if (node.token.data === 'attribute') {
			result += 'var ' + this.stringify(decllist, this.replaceAttribute);
		}
		else if (node.token.data === 'varying') {
			result += 'var ' + this.stringify(decllist, this.replaceVarying);
		}
		else if (node.token.data === 'uniform') {
			result += 'var ' + this.stringify(decllist, this.replaceUniform);
		}
		else if (node.token.data === 'buffer') {
			result += 'var ' + this.stringify(decllist);
		}
		else if (node.token.data === 'shared') {
			result += 'var ' + this.stringify(decllist);
		}
		else if (node.token.data === 'const') {
			result += 'var ' + this.stringify(decllist);
		}
		//structure
		else if (this.structures[node.token.data] != null) {
			result += 'var ' + this.stringify(decllist);
		}
		//case of function args - drop var
		else if (node.parent.type === 'functionargs') {
			result += this.stringify(decllist);
		}
		//case of struct - also drop var
		else if (node.parent.type === 'stmt' && node.parent.token.data === 'struct') {
			result += this.stringify(decllist);
		}
		//default type
		else {
			result += 'var ' + this.stringify(decllist);
		}

		return result;
	},


	//decl list is the same as in js, so just merge identifiers, that's it
	decllist: function (node, replace) {
		var ids = [];
		var lastId = 0;

		//get datatype - it is the 4th children of a decl
		var dataType = node.parent.children[4].token.data;

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
				var ident = this.stringify(child);
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
				var value = this.stringify(child);

				//save identifier initial value
				this.variable(ident, {value: value});
			}
			else {
				throw Error('Undefined type in decllist: ' + child.type);
			}
		}

		var functionargs = node.parent.parent.type === 'functionargs';

		return ids.map(function (ident, i) {
			if (functionargs) return ident;

			//function replacer
			if (replace instanceof Function) {
				return `${ident} = ${replace(ident, this.variable(ident))}`;
			}
			else {
				return `${ident} = ${this.variable(ident).value}`;
			}
		}, this).join(', ');
	},

	//placeholders are empty objects - ignore them
	placeholder: function (node) {
		return node.token.data;
	},

	//i++, --i etc
	suffix: function (node) {
		return this.stringify(node.children[0]) + node.data;
	},

	//loops are the same as in js
	forloop: function (node) {
		var init = this.stringify(node.children[0]);
		var cond = this.stringify(node.children[1]);
		var iter = this.stringify(node.children[2]);
		var body = this.stringify(node.children[3]);

		return `for (${init}; ${cond}; ${iter}) {\n${body}\n}`;
	},

	whileloop: function (node) {
		var cond = this.stringify(node.children[0]);
		var body = this.stringify(node.children[1]);

		return `while (${cond}) {\n${body}\n}`;
	},

	//access operators - expand to arrays
	operator: function (node) {
		if (node.data === '.') {
			var identNode = node.children[0];
			var ident = identNode.token.data;
			var type = this.getType(identNode);
			var prop = node.children[1].data;

			//ab.xyz for example
			if (this.isSwizzle(node)) {
				//if ident.x - provide arg access
				// if (node.parent.type === 'assign' && node.parent.children[0] === node) {
				// 	return this.unswizzle(node, true);
				// } else {
					return this.unswizzle(node);
				// }
			}

			return `${ident}.${prop}`;
		}

		throw Error('Unknown operator ' + node.data);

		return '';
	},

	//simple expressions are mapped 1:1
	//but unswizzling, multiplying etc takes part
	expr: function (node) {
		var result = '';

		result += node.children.map(this.stringify, this).join('');

		return result;
	},

	//precisions are just ignored
	precision: function () {
		return '';
	},

	//FIXME: it never creates comments
	comment: function (node) {
	},

	//FIXME: manage this guys
	// preprocessor: null,

	//keywords are rendered as they are
	keyword: function (node) {
		return node.data;
	},

	//identifier is a name of variable or function, just return it as is
	ident: function (node) {
		return node.data;
	},

	return: function (node) {
		var expr = this.stringify(node.children[0]);
		return 'return' + (expr ? ' ' + expr : '');
	},

	continue: 'continue',

	break: 'break',

	discard: 'discard()',

	'do-while': function (node) {
		var exprs = this.stringify(node.children[0]);
		var cond = this.stringify(node.children[1]);
		return `do {\n${exprs}\n} while (${cond})`;
	},

	//simple binary expressions
	binary: function (node) {
		var result = '';

		var left = this.stringify(node.children[0]);
		var right = this.stringify(node.children[1]);
		var typeA = this.getType(node.children[0]);
		var typeB = this.getType(node.children[1]);
		var leftNode = node.children[0];
		var rightNode = node.children[1];
		var operator = node.data;

		if (node.data === '[') {
			//for case of array access like float[3]
			if (this.types[node.type]) {
				return `${typeA}[${right}]`;
			}

			//simple number access, like a[3] → retrieve component, if available
			if (/[0-9]+/.test(right)) {
				return this.getComponent(node.children[0], +right);
			}

			//something[N] return as is
			return `${left}[${right}]`;
		}

		//FIXME: some operators can be unwrapped, like 1.0 * [x[1], x[0]] → [1.0 * x[1], 1.0 * x[0]];

		//resolve not primitive opertations issue
		if (!this.primitives[typeA] || !this.primitives[typeB]) {
			var outType = this.primitives[typeA] ? typeB : typeA;

			//evaluableNum * vec → [vec[0] * n, vec[n] * n]
			//vec * evaluableNum → [n * vec[0], n * vec[n]]
			//eVec * eVec → [vec[0] * vec[0], vec[n] * vec[n]]
			if (this.complexity(node.children[0]) + this.complexity(node.children[1]) < this.maxComplexity) {
				var l = this.types[outType].length;
				var operands = [];
				for (var i = 0; i < l; i++) {
					var leftOp = this.getComponent(leftNode, i), rightOp = this.getComponent(rightNode, i);

					var operation = '';

					//handle ridiculous math cases like x + 0, x * 0, x + 1
					if (operator === '+' || operator === '-') {
						//0 + x
						if (leftOp == 0) operation = rightOp;

						//x + 0
						if (rightOp == 0) operation = leftOp;
					}

					else if (operator === '*') {
						//0 * x
						if (leftOp == 0 || rightOp == 0) operation = 0;

						//1 * x
						else if (parseFloat(leftOp) === 1) operation = rightOp;

						//x * 1
						else if (parseFloat(rightOp) === 1) operation = leftOp;
					}

					operation = operation || `${leftOp} ${operator} ${rightOp}`;

					operands.push(operation);
				}

				//save operands as node components
				this.setComponents(node, operands);

				return `[${operands.join(', ')}]`;
			}

			//otherA * otherB → type.operation(result, otherA, otherB)
			//bring both sides to an output type
			left = this.createType(outType, node.children[0], [node.children[0]]);
			right = this.createType(outType, node.children[1], [node.children[1]]);

			return `${outType}.${this.operatorNames[operator]}([], ${left}, ${right})`;
		}
		else {
			return `${left} ${operator} ${right}`;
		}
	},

	//assign - same as binary basically
	assign: function (node) {
		var result = '';

		var operator = node.data;

		var left = this.stringify(node.children[0]);
		var right = this.stringify(node.children[1]);
		var leftType = this.getType(node.children[0]);
		var rightType = this.getType(node.children[1]);

		//handle primitive with no doubts as floats
		if (this.primitives[leftType] && this.primitives[rightType]) {
			return `${left} ${operator} ${right}`;
		}

		//otherwise - expand custom assignments
		//operatory assign, eg a *= x → a = a * x
		if (operator.length > 1) {
			var nonPrimitive = this.primitives[leftType] ? rightType : leftType;
			var subOperator = operator.slice(0, -1);
			var opName = this.operatorNames[subOperator];

			//in cases of setting swizzle - we gotta be discreet, eg
			//v.yx *= coef → vec2.multiply(v, [v[0], v[1], [0, 0].fill(coef)]);
			var target;
			//a.xy *= ... → mult(a, ....)
			if (this.isSwizzle(node.children[0])) {
				target = this.stringify(node.children[0].children[0]);
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
			var result = this.stringify(binaryNode);

			return `${target} = ${result}`;
		}

		//simple assign, =
		return `${left} = ${right}`
	},

	ternary: function (node) {
		var cond = this.stringify(node.children[0]);
		var a = this.stringify(node.children[1]);
		var b = this.stringify(node.children[2]);

		return `${cond} ? ${a} : ${b}`;
	},

	unary: function (node) {
		return node.data + this.stringify(node.children[0]);
	},

	//gl_Position, gl_FragColor, gl_FragPosition etc
	builtin: function (node) {
		return node.token.data;
	},

	//if a function call - then just make a call
	//or if a data type - then save type as well, avoid wrapping literals
	call: function (node) {
		var result = '';

		//if first node is an access, like a.b() - treat special access-call case
		if (node.children[0].data === '.') {
			var methodNode = node.children[0].children[1];
			var holderNode = node.children[0].children[0];
			var methodName = this.stringify(methodNode);
			var holderName = this.stringify(holderNode);
			var type = this.getType(holderNode);

			//if length call - return length of a vector
			//vecN.length → N
			if (methodName === 'length' && this.types[type].length > 1) {
				return this.types[type].length;
			}

			return `${holderName}.${methodName}`;
		}

		//first node is caller: float(), float[2](), vec4[1][3][4]() etc.
		var callerNode = node.children[0];
		var callName = this.stringify(node.children[0]);

		var args = node.children.slice(1);
		var argValues = args.map(this.stringify, this);


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
				value += args.map(this.stringify, this).join(', ');
			} else {
				value += callName + '(';
				value += args.map(this.stringify, this).join(', ');
				value += ')';
			}

			//wrap array init expression
			result += this.wrapDimensions(argValues, dimensions.reverse());
		}

		//else treat as function/constructor call
		else {
			//vec2(), float()
			if (this.types[callName]) {
				result += this.createType(callName, node, args);
			}
			//someFn()
			else {
				result += callName + '(';
				result += args.map(this.stringify, this).join(', ');
				result += ')';
			}
		}

		return result;
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

		return result;
	},

	//ifs are the same as js
	if: function (node) {
		var cond = this.stringify(node.children[0]);
		var ifBody = this.stringify(node.children[1]);

		var result = `if (${cond}) {\n${ifBody}\n}`;

		if (node.children.length > 1) {
			var elseBody = this.stringify(node.children[2]);
			result += ` else {\n${elseBody}\n}`;
		}

		return result;
	},

	//grouped expression like a = (a - 1);
	group: function (node) {
		//bring components of a child
		var result = '(' + node.children.map(this.stringify, this).join(', ') + ')';
		this.setComponents(node, this.getComponents(node.children[0]));

		return result;
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

	return /[xyzwstpdrgba]{1,4}/.test(prop);
}

/**
 * Transform access node to a swizzle construct
 * ab.xyz → [ab[0], ab[1], ab[2]]
 */
GLSL.prototype.unswizzle = function (node) {
	var identNode = node.children[0];

	var ident = this.stringify(identNode);
	var type = this.getType(identNode);
	var prop = node.children[1].data;

	var swizzles = 'xyzwstpdrgba';

	var args = [], positions = [];

	for (var i = 0, l = prop.length; i < l; i++) {
		var letter = prop[i];
		var position = swizzles.indexOf(letter) % 4;
		positions.push(position);

		//[0, 1].yx → [0, 1]
		// a.yx → [a[1], a[0]]
		var value = this.getComponent(identNode, position);

		args.push(value);
	}

	//save unswizzled components for an unswizzled node
	this.setComponents(node, args);

	//a.x → a[0]
	if (args.length === 1) {
		var result = new String(args[0]);
		result.complexity = 1;
		return result;
	}

	//vec2 a.xy → a
	if (args.length === this.types[type].length && positions.every(function (position, i) { return position === i})) {
		var result = new String(ident);
		result.complexity = 0;
		return result;
	}

	//a.yz → [a[1], a[2]]
	//return components along with the result
	var result = new String(`[${args.join(', ')}]`);
	result.complexity = args.length;

	return result;
}


/**
 * Measure how many operations does it take to calc a node.
 * Very euristic approach.
 */
GLSL.prototype.complexity = function (node) {
	var self = this;

	if (typeof node !== 'object') return 0;

	if (node instanceof String) return 0;

	//list of nodes is a sum of complexities
	if (Array.isArray(node)) return node.map(this.complexity, this).reduce(function (prev, curr) { return prev + curr; }, 0);

	if (node._complexity != null) return node._complexity;

	//coeff
	if (node.type === 'ident') {
		return node._complexity = 0;
	}

	//1.0
	if (node.type === 'literal') {
		return node._complexity = 0;
	}

	//-x → x is simple
	if (node.type === 'unary') {
		return node._complexity = 1 + this.complexity(node.children[0]);
	}

	//a + b, a[b]
	if (node.type === 'binary') {
		return node._complexity = this.complexity(node.children[0]) + 1 + this.complexity(node.children[1]);
	}

	//a.x, a.xy - calc complexity of swizzles
	if (node.type === 'operator' && this.isSwizzle(node)){
		var prop = node.children[1].data;

		//a.z → a[3] = 2
		if (prop.length === 1) return node._complexity = 1;

		return node._complexity = this.unswizzle(node).complexity;
	}

	//float(args) is ok → args
	//vec3(args) is not ok → [a, a, a]
	if (node.type === 'call') {
		//knownType(args)
		if (this.types[node.children[0].data]) {
			//if swizzle or other vector is inside - collapse complexities, as probably inner node is also unwrapped
			return node._complexity = node.children.slice(1).reduce(function (sum, curr) {
				return self.complexity(curr) + sum;
			}, 0);
		}

		//unknown type is too difficult to calc
	}

	//group just consist of components
	if (node.type === 'group') {
		return node._complexity = this.complexity(node.children);
	}

	//bools complexity
	if (node.type === 'keyword') {
		if (node.data === 'false' || node.data === 'true') return node._complexity = 0;
	}

	//unknown nodes are too risky to guess
	console.warn(`Unknown complexity of a node '${node.type}'`);
	return node._complexity = this.maxComplexity;
};


/**
 * Try to retrieve the most deep argument value from the node
 * Eg [[0, 1][1]][0] → 1, [a, b, c][0] → a
 *
 * but a[3] → a[3]
 */
GLSL.prototype.getComponent = function (node, n) {
	//pass on ready values like 0, null, a etc
	if (typeof node !== 'object') return node;


	//if stringify found a shorter component values - use them
	//FIXME: node can have components of it’s prototype (ident). We can try to update prototype’s values for each `setComponents` call so that optimisation there will be better (constants hoist etc)
	if (node.hasOwnProperty('_components') && node._components[n] != null) {
		return node._components[n];
	}

	var nodeType = this.getType(node);

	//primitives are accessed straightly
	if (this.primitives[nodeType]) {
		return this.stringify(node);
	}
	//basic way to access components in js: a[n]
	else {
		return `${this.stringify(node)}[${n}]`;
	}
}

/**
 * Return components as a list
 */
GLSL.prototype.getComponents = function (node) {
	var nodeType = this.getType(node);

	var components = [];
	for (var i = 0, l = Math.max(this.types[nodeType].length, node._components && node._components.length || 0); i < l; i++) {
		components[i] = this.getComponent(node, i);
	}

	return components;
};


/**
 * Save components to the node, if it is vector.
 * Like vec3(a, b, c) ~→ [aStr, bStr, cStr], but stringified.
 */
GLSL.prototype.setComponents = function (node, components) {
	if (!node) return;
	if (typeof node !== 'object') return;

	var type = this.getType(node);

	if (this.primitives[type]) return;

	var len = this.types[type].length;

	if (node._components) return;

	node._components = [];

	for (var i = 0; i < len; i++) {
		node._components[i] = components[i];
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
				variable.value = this.createType(variable.type, variable.node);
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
 * Construct type for a node with the arguments.
 */
GLSL.prototype.createType = function (typeName, node, args) {
	var result = this.types[typeName].apply(this, args);
	if (result.components) {
		this.setComponents(node, result.components);
	}
	return result + '';
};


/**
 * Infer dataType of a node.
 */
GLSL.prototype.getType = getType;


/**
 * Construct result string for a type, containing components.
 * Supposed to be used by type constructors.
 * Makes decision on output format - if it is simple enough to calculate -
 * return just a straight newly created output eg [1, 2, 3, 4] instead of [1, 2].concat(3, 4).
 * Also decides on whether we should cast type, eg if component node is of diff type.
 *
 * @param {string} str Main stringified version of the constructor
 * @param {Array} components List of nodes - components of the constructor
 */
GLSL.prototype.createTypeResult = function (str, compNodes, typeName) {
	//rendered components
	var components = [];

	var n = 0, prev, curr;
	for (var i = 0; i < compNodes.length; i++) {
		curr = compNodes[i];

		if (curr === prev) {
			n = n+1;
		} else {
			n = 0;
		}

		var comp = this.getComponent(curr, n);

		if (typeName === 'int') {
			comp = this.types.int(comp);
		}
		if (typeName === 'bool') {
			comp = this.types.bool(comp);
		}

		components[i] = comp;

		prev = curr;
	}

	//decide on complexity of inner nodes
	//if it is too high, use js functions
	if (this.complexity(compNodes) > this.maxComplexity) {
		if (typeName === 'int') {
			str += '.map(bool)';

			this.includes['bool'] = true;
		}
		if (typeName === 'bool') {
			str += '.map(int)';

			this.includes['int'] = true;
		}

		var result = new String(str);
	}
	else {
		var result = new String(`[${components.join(', ')}]`);
	}

	//pass components separately
	result.components = components;

	return result;
}


/**
 * Get stdlib source for includes
 */
GLSL.prototype.stringifyStdlib = function (includes) {
	var methods = [];

	for (var meth in includes) {
		var result;
		if (this.replaceStdlib) {
			result = this.replaceStdlib(meth);
		}
		else {
			result = this.stdlib[meth];
		}
		methods.push(result);
	}

	return methods.join('\n');
};


module.exports = GLSL;