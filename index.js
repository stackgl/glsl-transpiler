/**
 * Transform from glsl to js.
 *
 * @module  glsl-js
 */

var Emitter = require('events');
var inherits = require('inherits');
var assert = require('assert');
var flatten = require('array-flatten');
var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');


/**
 * Create GLSL codegen instance
 *
 * @constructor
 */
function GLSL (stdlib) {
	if (!(this instanceof GLSL)) return new GLSL(stdlib);

	if (stdlib) {
		this.stdlib = stdlib;
	}
};

inherits(GLSL, Emitter);


/**
 * Minimal webgl types. Replace with other stdlib, if required.
 */
GLSL.prototype.stdlib = {
	bool: true,
	int: true,
	float: true,
	vec2: true,
	vec3: true,
	vec4: true,
	bvec2: true,
	bvec3: true,
	bvec4: true,
	ivec2: true,
	ivec3: true,
	ivec4: true,
	mat2: true,
	mat3: true,
	mat4: true,
	sampler2D: true
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
	//in some [weird] cases glsl-parser returns node object extended from other node
	//which properties exist only in prototype. We gotta ignore that.
	//See #Structures test for example.
	if (!node.hasOwnProperty('type')) return '';

	var t = this.transforms[node.type];

	if (t === undefined) return '?' + node.type + '?';
	if (!t) return '';
	if (typeof t !== 'function') return t;

	//invoke start
	var startCall = false;
	if (!this.started) {
		this.emit('start', node);
		this.started = true;
		startCall = true;
	}
	var result = t.call(this, node);

	//notify that handle has passed
	this.emit(node.type, node);

	//envoke end
	if (startCall) {
		this.started = false;
		this.emit('end', node);
	}

	return result === undefined ? '' : result;
}


/**
 * List of transforms for various token types
 */
GLSL.prototype.transforms = {
	//To keep lines consistency, should be rendered with regarding line numbers
	stmtlist: function (node) {
		if (!node.children.length) return '';

		return node.children.map(this.stringify, this).join('\n');
	},

	//statement should just map children per-line
	stmt: function (node) {
		var result = '';

		result += node.children.map(this.stringify, this).join('');

		return result;
	},

	//structures for simplicity are presented with constructors
	struct: function (node) {
		var structName = node.children[0].data;

		//register structure in the types stack
		this.stdlib[structName] = true;

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
		var result = 'function ';

		//add function name - just render ident node
		assert.equal(node.children[0].type, 'ident', 'Function should have an identifier.');
		result += this.stringify(node.children[0]);

		//add args
		assert.equal(node.children[1].type, 'functionargs', 'Function should have arguments.');
		result += ' (' + this.stringify(node.children[1]) + ') ';

		//add body
		assert.equal(node.children[2].type, 'stmtlist', 'Function should have a body.');
		result += '{\n';
		result += this.stringify(node.children[2]);
		result = result.replace(/\n/g, '\n\t').slice(0,-1);
		result += '\n}';

		return result;
	},

	//function arguments are just shown as a list of ids
	functionargs: function (node) {
		return node.children.map(this.stringify, this).join(', ');
	},

	//declarations are mapped to var a = n, b = m;
	//FIXME: no separation of decl types.
	decl: function (node) {
		var result = '';

		if (node.token.data === 'attribute') {
			result += 'var ';
		}
		else if (node.token.data === 'varying') {
			result += 'var ';
		}
		else if (node.token.data === 'uniform') {
			result += 'var ';
		}
		else if (this.stdlib[node.token.data]) {
			result += 'var ';
		}

		result += node.children.map(this.stringify, this).join('');
		result += ';';

		return result;
	},


	//decl list is the same as in js, so just merge identifiers, that's it
	//FIXME: except for maybe there is a variable names conflicts
	decllist: function (node) {
		var result = '';

		node.children.forEach(function (child, i) {
			var str = this.stringify(child);
			if (!str) return;
			if (child.type === 'expr') result += ' = ' + str;
			else result += (i > 0 ? ', ' : '') + this.stringify(child);
		}, this);

		return result;
	},

	//placeholders are empty objects - ignore them
	placeholder: function (node) {
		return node.token.data;
	},

	// forloop: null,
	// whileloop: null,
	// if: null,

	//access operators - expand to arrays
	operator: function (node) {
		var result = '';

		result += this.stringify(node.children[0]);

		//expand swizzles, if any
		var prop = node.children[1].data;
		result += unswizzle(prop);

		return result;
	},

	//simple expressions are mapped 1:1
	//but unswizzling, multiplying etc takes part
	expr: function (node) {
		var result = '';

		if (node.children[0].assignment) {
			var assignment = node.children[0];
			result += this.stringify(assignment.children[0]);
			result += ' = ';
			result += this.stringify(assignment.children[1]);
			result += ';';
		}
		else {
			result += node.children.map(this.stringify, this).join('');
			// result = '???';
		}

		return result;
	},

	//precisions are just ignored
	precision: function () {
		return '';
	},

	// comment: null,
	// preprocessor: null,

	//keywords, like vec2, attribute etc are mostly ignored
	//FIXME: find cases where it is not true
	keyword: function (node) {
	},

	//identifier is a name of variable or function, just return it as is
	ident: function (node) {
		return node.data;
	},
	// return: null,
	// continue: null,
	// break: null,
	// discard: null,
	// 'do-while': null,

	//simple binary expressions
	binary: function (node) {
		var result = '';
		result += this.stringify(node.children[0]);
		result += ' ' + node.data + ' ';
		result += this.stringify(node.children[1]);
		return result;
	},

	// ternary: null,

	unary: function (node) {
		return node.data + this.stringify(node.children[0]);
	},

	//gl_Position, gl_FragColor, gl_FragPosition etc
	builtin: function (node) {
		return node.token.data;
	},

	//whether a function call - then just make a call
	//or data type - then emulate structure via arrays
	call: function (node) {
		var result = '';
		var args = node.children.slice(1);

		result += node.children[0].data + '(';
		result += args.map(this.stringify, this).join(', ');
		result += ')';

		return result;
	},

	literal: function (node) {
		return node.data;
	}
}


/**
 * Transform swizzle to array access
 */
function unswizzle (prop) {
	if (prop === 'x' || prop === 's' || prop === 'r') {
		return '[0]';
	}
	if (prop === 'y') {
		return '[1]';
	}
	if (prop === 'z') {
		return '[2]';
	}
	if (prop === 'w') {
		return '[3]';
	}

	return '.' + prop;
}


module.exports = GLSL;