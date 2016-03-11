/**
 * A wrapper for glsl-parser
 *
 * @module  glsl-js/lib/parse
 */

var glslParse = require('glsl-parser/direct');
var tokenize = require('glsl-tokenizer/string');

function parse(arg) {
	//ready AST
	if (typeof arg === 'object' && arg.children) return arg;

	//convert string to tokens
	if (typeof arg === 'string') {
		arg = tokenize(arg);
	}

	//convert tokens to ast
	if (Array.isArray(arg)) {
		arg = glslParse(arg)
	}

	return arg;
}

module.exports = parse;