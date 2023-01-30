/**
 * A wrapper for glsl-parser
 *
 * @module  glsl-transpiler/lib/parse
 */

import glslParse from 'glsl-parser/direct.js';
import tokenize from 'glsl-tokenizer/string.js';

function parse(arg) {
	//ready AST
	if (typeof arg === 'object' && arg.children) return arg;

	//convert string to tokens
	if (typeof arg === 'string') {
		arg = tokenize(arg, { version: this.version || '100 es' });
	}

	//convert tokens to ast
	if (Array.isArray(arg)) {
		arg = glslParse(arg)
	}

	return arg;
}

export default parse;
