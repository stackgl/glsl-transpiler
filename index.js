/**
 * Transform glsl to js.
 *
 * @module  glsl-js
 */

var GLSL = require('./lib');

GLSL.compile =
GLSL.string = require('./string');
GLSL.stream = require('./stream');

module.exports = GLSL;