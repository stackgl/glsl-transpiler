/**
 * Transform glsl to js.
 *
 * @module  glsl-transpiler
 */

import GLSL from './lib/index.js';


//static bindings
export function compile (str, opt) {
	return GLSL(opt).compile(str);
};

export * from './stream.js';

export default GLSL
