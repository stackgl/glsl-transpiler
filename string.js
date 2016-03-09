/**
 * Convert glsl string to js string
 *
 * @module  glsl-js
 */

var GLSL = require('./lib');

function compile (src, options) {
	var result = GLSL(options).compile(src);

	return result;
};

module.exports = compile;