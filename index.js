/**
 * Transform glsl to js.
 *
 * @module  glsl-transpiler
 */

import GLSL from './lib/index.cjs';


//static bindings
export function compile (str, opt) {
	return GLSL(opt).compile(str);
};

export * from './stream.cjs';

export default GLSL
