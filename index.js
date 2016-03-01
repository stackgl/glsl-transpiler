/**
 * Transform glsl to js.
 *
 * @module  glsl-js
 */

var Emitter = require('events');
var inherits = require('inherits');
var assert = require('assert');
var flatten = require('array-flatten');
var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');
var stdlib = require('./stdlib');
var extend = require('xtend/mutable');


/**
 * Create GLSL codegen instance
 *
 * @constructor
 */
function GLSL (options) {
	if (!(this instanceof GLSL)) return new GLSL(options);

	extend(this, options);

	this.reset();
};

inherits(GLSL, Emitter);


/**
 * Basic rendering settings
 */
GLSL.prototype.removeUniforms = false;
GLSL.prototype.removeAttributes = false;
GLSL.prototype.removeVarying = false;


/**
 * Minimal webgl default types values. Replace with other stdlib, if required.
 */
GLSL.prototype.stdlib = stdlib;



/**
 * Operator names
 */
GLSL.prototype.operators = {
	'*': 'multiply',
	'+': 'add',
	'-': 'subtract',
	'/': 'divide',
	'%': 'mod',
	'<<': 'lshift',
	'>>': 'rshift'
};


/**
 * Simple types, will be expanded to js instead of wrapped to classes
 */
GLSL.prototype.primitives = {
	void: '',
	bool: false,
	int: 0,
	uint: 0,
	float: 0,
	double: 0
};


/**
 * Initialize analysing scopes/vars/types
 */
GLSL.prototype.reset = function () {
	//collection of types used during processing. To polyfill them after.
	this.usedTypes = {};

	//scopes analysed. Each scope is named by the function they are contained in
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

	//current scope of the node processed
	this.currentScope = 'global';
};


/**
 * Compile whether string or tree to js
 */
GLSL.prototype.compile = function compile (arg) {
	if (typeof arg === 'string') {
		arg = parse(tokenize(arg));
	}

	return this.stringify(arg);
};


/**
 * Transform any glsl ast node to js
 */
GLSL.prototype.stringify = function stringify (node) {
	if (!node) return '';

	//in some [weird] cases glsl-parser returns node object extended from other node
	//which properties exist only in prototype. We gotta ignore that.
	//See #Structures test for example.
	if (!node.hasOwnProperty('type')) return '';

	var t = this.transforms[node.type];

	//wrap unknown node
	if (t === undefined) return `/* ${node.type} */`;

	if (!t) return '';
	if (typeof t !== 'function') return t;

	//do start routines on the first call
	var startCall = false;
	if (!this.started) {
		this.emit('start', node);
		this.started = true;
		startCall = true;
	}

	//apply node serialization
	var result = t.call(this, node);

	//notify that handle has passed
	this.emit(node.type, node);

	//invoke end
	if (startCall) {
		this.started = false;
		this.emit('end', node);
	}

	return result === undefined ? '' : result;
}


/**
 * Polyfill types — generate string source code for the types detected during compilation
 */
GLSL.prototype.polyfill = function polyfill (types) {
	unimplemented;
	for (var type in types) {
		var constr = this.stdlib[type];
	}
};


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
			result += 'var ';
		}
		else if (node.token.data === 'varying') {
			result += 'var ';
		}
		else if (node.token.data === 'uniform') {
			result += 'var ';
		}
		else if (node.token.data === 'buffer') {
			result += 'var ';
		}
		else if (node.token.data === 'shared') {
			result += 'var ';
		}
		else if (node.token.data === 'const') {
			result += 'var ';
		}
		//structure
		else if (this.structures[node.token.data] != null) {
			result += 'var ';
		}
		//default type
		//FIXME: elaborate this case
		else if (this.stdlib[node.token.data] != null) {
			result += 'var ';
		}

		result += this.stringify(decllist);

		return result;
	},


	//decl list is the same as in js, so just merge identifiers, that's it
	decllist: function (node) {
		var ids = [];
		var lastId = 0;

		//get datatype - it is the 4th children of a decl
		var dataType = node.parent.children[4].token.data;

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

		return ids.map(function (ident) {
			if (functionargs) return ident;
			return `${ident} = ${this.variable(ident).value}`;
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
		var result = '';

		result += this.stringify(node.children[0]);

		//expand swizzles, if any
		var prop = node.children[1].data;
		result += '.' + prop;

		return result;
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

		var typeA = this.getType(node.children[0]);
		var typeB = this.getType(node.children[1]);
		var operator = this.operators[node.data];
		var left = this.stringify(node.children[0]);
		var right = this.stringify(node.children[1]);

		//for case of array access like float[3] or something[N] - return as is
		if (node.data === '[') {
			return `${typeA}[${right}]`;
		}


		//render primitive types with js operators
		if (this.primitives[typeA] != null && this.primitives[typeB] != null) {
			return `${left} ${node.data} ${right}`;
		}

		//if second arg is not primitive but the first is - swap order
		if (this.primitives[typeA] != null && this.primitives[typeB] == null) {
			return `${right}.${operator}(${left})`;
		}

		//otherwise - apply normal order op
		return `${left}.${operator}(${right})`;
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
		if (this.primitives[leftType] != null && this.primitives[rightType] != null) {
			return `${left} ${operator} ${right}`;
		}

		//otherwise - expand custom assignments
		result += left;
		result += ` = `;

		//operatory assign
		if (operator.length > 1) {
			result += this.transforms.binary.call(this, {
				children: [node.children[0], node.children[1]],
				data: operator.slice(0, -1)
			});
		}
		//simple assign
		else {
			result += right;
		}

		return result;
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
			if (this.primitives[callName] != null) {
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
			result += callName + '(';
			result += args.map(this.stringify, this).join(', ');
			result += ')';
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
		return /[xob]/.test(node.data) ? Number(node.data) : node.data;
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
		return '(' + node.children.map(this.stringify, this).join(', ') + ')';
	}

	// switch: function () {
	//FIXME: not implemented in glsl-parser
	// }
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
			if (this.primitives[variable.type] != null) {
				variable.value = this.primitives[variable.type];
			}
			else {
				variable.value = variable.type + `()`
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
 * Infer dataType of a node.
 */
GLSL.prototype.getType = function (node) {
	if (node.type === 'ident') {
		var id = node.token.data;

		var scope = this.scopes[this.currentScope];

		//find the closest scope with the id
		while (scope[id] == null) {
			scope = scope.__parentScope;
			if (!scope) throw `'${id}' is not defined`;
		}

		return scope[id].type;
	}
	else if (node.type === 'call') {
		//FIXME: function calls are more difficult than this
		return node.children[0].data;
	}
	else if (node.type === 'literal') {
		if (/true|false/i.test(node.data)) return 'bool';
		if (/.|[0-9]e[0-9]/.test(node.data)) return 'float';
		if (/[0-9]/.test(node.data) > 0) return 'int';
	}
	else if (node.type === 'operator') {
		if (node.data === '.') {
			//FIXME: struct point-access is not necessarily a swizzle
			if (/vec/.test(this.getType(node.children[0]))) {
				var len = node.children[1].data.length;
				//FIXME: not necessarily a float vector
				if (len === 1) return 'float';
				if (len === 2) return 'vec2';
				if (len === 3) return 'vec3';
				if (len === 4) return 'vec4';
			}
			//access operator, like a.xy
			if (!this.structures[node.children[0].data]) {
				if (/[xyzwrgbastpd]+/.test(node.children[1].data)) {
					return `vec${node.children[1].data.length}`;
				}
			}
		}
	}
	//FIXME: guess every keyword is a type, isn’t it?
	else if (node.type === 'keyword') {
		return node.data;
	}
	else if (node.type === 'binary') {
		return this.getType(node.children[0]);
	}
	else if (node.type === 'builtin') {
		//for builtins just notify their simplicity (no need for them being spec types)
		return 'bool';
	}
	else if (node.type === 'ternary') {
		return this.getType(node.children[1]);
	}
	else if (node.type === 'group') {
		return this.getType(node.children[0]);
	}

	throw Error(`getType(${node.type}) is not implemented`);
};


module.exports = GLSL;