/**
 * Transform from glsl to js.
 *
 * @module  glsl-to-js
 */

var parse = require('glsl-parser/direct');
var tokenize = require('glsl-tokenizer/string');

function transform (src) {
	console.log(src);
	var tokens = tokenize(src);
	var node = parse(tokens);
	var result = '';

	console.log(nodeToJs(node));

	// console.log(generate(esAst));
};


//glsl types
var types = [
'bool',
'int',
'float',
'vec2',
'vec3',
'vec4',
'bvec2',
'bvec3',
'bvec4',
'ivec2',
'ivec3',
'ivec4',
'mat2',
'mat3',
'mat4',
'sampler2D'
];


/**
 * Transform any glsl ast node to js
 */
function nodeToJs (node) {
	var t = transforms[node.type];

	if (t === undefined) return '?' + node.type + '?';
	if (!t) return '';
	if (typeof t !== 'function') return t;

	var result = t(node);
	return result === undefined ? '' : result;
}


/**
 * List of transforms
 */
var transforms = {
	//statement list
	stmtlist: function (node) {
		var result = '';

		result += node.children.map(nodeToJs).join('');

		return result;
	},

	//statement should just map children per-line
	stmt: function (node) {
		var result = '';

		// if (types.indexOf(node.token.data) >= 0) {
		// 	result += 'var ' + node.children.map(nodeToJs).join('');
		// }

		// else {
			result += node.children.map(nodeToJs).join('');
		// }

		return result;
	},

	// struct: null,

	//functions are mapped as they are
	function: function (node) {
		var result = 'function ';

		//add function name - just render ident node
		if (node.children[0].type !== 'ident') throw 'Function has no identifier';
		result += nodeToJs(node.children[0]);

		//add args
		if (node.children[1].type !== 'functionargs') throw 'Function has no args';
		result += ' (' + nodeToJs(node.children[1]) + ') ';

		//add body
		if (node.children[2].type !== 'stmtlist') throw 'Function has no body';
		result += '{\n';
		result += nodeToJs(node.children[2]);
		result = result.replace(/\n/g, '\n\t');
		result += '\n}';


		return result;
	},

	//function arguments are just shown as a list of ids
	functionargs: function (node) {
		return node.children.map(nodeToJs).join(', ');
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
		else if (types.indexOf(node.token.data) >= 0) {
			result += 'var ';
		}

		result += node.children.map(nodeToJs).join('');

		result += ';\n';

		return result;
	},

	//placeholders are empty objects - ignore them
	placeholder: null,

	//decl list is the same as in js, so just merge identifiers, that's it
	//FIXME: except for maybe there is a variable names conflicts
	decllist: function (node) {
		var result = '';

		result += node.children.map(nodeToJs);

		return result;
	},

	// forloop: null,
	// whileloop: null,
	// if: null,

	//access operators - expand to arrays
	operator: function (node) {
		console.log(node);

		var result = '';

		result += nodeToJs(node.children[0]);

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
			result += nodeToJs(assignment.children[0]);
			result += ' = ';
			result += nodeToJs(assignment.children[1]);
			result += ';\n';
		}
		else {
			// console.log(node);
			result += node.children.map(nodeToJs).join('');
			// result = '???';
		}

		return result;
	},

	//precisions are just ignored
	precision: null,

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
		result += nodeToJs(node.children[0]);
		result += ' ' + node.data + ' ';
		result += nodeToJs(node.children[1]);
		return result;
	},

	// ternary: null,
	// unary: null
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

module.exports = transform;