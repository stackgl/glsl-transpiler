/**
 * Transform glsl to js.
 *
 * @module  glsl-js
 */

var GLSL = require('./lib');

//static bindings
GLSL.compile =
GLSL.string = function (str, opt) {
	return GLSL(opt).compile(str);
};

GLSL.stream = require('./stream');

module.exports = GLSL;