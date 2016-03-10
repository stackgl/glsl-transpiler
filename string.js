/**
 * Convert glsl string to js string
 *
 * @module  glsl-js
 */

var GLSL = require('./lib');

function compile (src, options) {
	return GLSL(options)(src);
};

module.exports = compile;