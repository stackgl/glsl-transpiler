/**
 * Convert glsl string to js string
 *
 * @module  glsl-js
 */

var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');
var GLSL = require('./');

function compile (src, options) {
	var tokens = tokenize(src);
	var node = parse(tokens);
	var result = GLSL(options).stringify(node);

	return result;
};

module.exports = compile;