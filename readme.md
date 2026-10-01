# glsl-transpiler [![test](https://github.com/stackgl/glsl-transpiler/actions/workflows/test.yml/badge.svg)](https://github.com/stackgl/glsl-transpiler/actions/workflows/test.yml)

Transforms [glsl](https://www.opengl.org/documentation/glsl/) source to optimized js code. It converts vectors and matrices to arrays, expands swizzles, optimizes expressions and provides stdlib for environment compatibility.

v4 uses [Subscript](https://github.com/dy/subscript) for parsing and adds GLSL ES 3.00 support for WebGL 2 shaders.

## Usage

[![npm install glsl-transpiler](https://nodei.co/npm/glsl-transpiler.png?mini=true)](https://npmjs.org/package/glsl-transpiler/)

```js
import GLSL from 'glsl-transpiler'

var compile = GLSL({
	uniform: function (name) {
		return `uniforms.${name}`
	},
	attribute: function (name) {
		return `attributes.${name}`
	}
})

compile(`
	precision mediump float;
	attribute vec2 uv;
	attribute vec4 color;
	varying vec4 fColor;
	uniform vec2 uScreenSize;

	void main (void) {
		fColor = color;
		vec2 position = vec2(uv.x, -uv.y) * 1.0;
		position.x *= uScreenSize.y / uScreenSize.x;
		gl_Position = vec4(position, 0, 1);
	}
`)
```

Result:

```js
var uv = attributes.uv;
var color = attributes.color;
var fColor = new Float32Array([0, 0, 0, 0]);
var uScreenSize = uniforms.uScreenSize;
function main () {
	fColor = (color).slice();
	var position = new Float32Array([uv[0], -uv[1]]);
	position[0] = position[0] * (uScreenSize[1] / uScreenSize[0]);
	gl_Position = new Float32Array([position[0], position[1], 0, 1]);
};
```

The result is js source. Supply the inputs, call `main()` and read the outputs in your own code.

## API

### glsl-transpiler

To compile a glsl string or an AST from the built-in parser:

```js
import GLSL from 'glsl-transpiler'

let compile = GLSL({
	// Enable expression optimizations.
	optimize: true,

	// Apply preprocessing. Pass false to disable, or a function (source) => source.
	preprocess: true,

	// Replace each uniform initializer with a js expression.
	uniform: name => `uniforms.${name}`,

	// Same as uniform, but for attribute and varying declarations.
	attribute: name => `attributes.${name}`,
	varying: name => `varyings.${name}`,

	// GLSL version: '100 es' or '300 es'. A #version directive takes precedence.
	version: '100 es',

	// Include the stdlib functions used by the shader. Can also be false,
	// or an object selecting individual functions, eg. { normalize: false }.
	includes: true,

	// Enable print() and show() for inspecting compiled expressions.
	debug: false
})

// compile source code
let result = compile('vec2 position = vec2(1.0);')

// get collected info
let {
	attributes,
	uniforms,
	varyings,
	inputs,
	outputs,
	uniformBlocks,
	structs,
	functions,
	scopes
} = compile.compiler

// compile an AST
let tree = compile.compiler.parse('vec2 position;')
result = compile(tree)

// clean collected info
compile.compiler.reset()
```

Each call to `compile()` starts fresh. For a single compilation, you can also use `import { compile } from 'glsl-transpiler'` and call `compile(source, options)`.

Declaration callbacks receive `(name, variable)`, including the variable's `type`, `dimensions`, `binding`, `qualifiers` and `layout`. Omit a callback to use the usual initializer, or set it to `false` to omit those declarations. Callbacks initialize shader variables; read their values after `main()` to collect outputs.

With `debug: true`, `print(expression)` logs the compiled expression and its type; `show(expression)` logs its descriptor. You can also use `console.log(value)` inside a shader to debug it at runtime.

### glsl-transpiler/stream

_glsl-transpiler_ can also be used as a stream. Pipe glsl source into it; when the input ends, it returns the compiled js:

```js
import fs from 'node:fs'
import compile from 'glsl-transpiler/stream.js'

fs.createReadStream('./source.glsl')
.pipe(compile())
.pipe(fs.createWriteStream('./source.js'))
```

The stream keeps the result in `source`, the AST in `tree` and collected info in `compiler`. Compilation failures emit an `error` event.

## WebGL 2

Use `#version 300 es` in the shader, or pass `version: '300 es'`. The `in` and `out` callbacks work just like `attribute` and `varying`:

```js
let compile = GLSL({
	version: '300 es',
	in: name => `inputs.${name}`,
	uniform: name => `uniforms.${name}`
})

compile(`
	in vec3 position;
	uniform mat4 transform;
	out vec4 color;

	void main () {
		gl_Position = transform * vec4(position, 1.0);
		color = vec4(position * 0.5 + 0.5, 1.0);
	}
`)
```

This includes unsigned integers and bitwise operators, all nine matrix shapes, array constructors, `switch`, layout and interpolation qualifiers, uniform blocks, and the ES 3.00 math, packing and texture functions. Uniform blocks become js objects; their layout is available in `compile.compiler.uniformBlocks`.

The host still supplies built-in inputs such as `gl_FragCoord` and `gl_InstanceID`, shader linking and rendering. Uniform blocks aren't packed into `std140` buffers. Floating-point calculations use js numbers and vector/matrix storage uses `Float32Array`; precision qualifiers don't reproduce GPU precision. The parser accepts some extensions beyond GLSL ES, so use a WebGL compiler to validate shaders for the GPU.

Derivatives need neighboring fragments. Supply js functions through `derivatives: { dFdx: 'host.dx', dFdy: 'host.dy', fwidth: 'host.width' }` when using them. `discard` throws an error named `GLSLDiscard` by default; pass `discard: 'host.discard'` to handle it yourself.

## Textures

`texture2D` and the ES 3.00 texture functions accept an ndarray, an array with `width` and `height` properties, or an object:

```js
let image = {
	width: 2,
	height: 1,
	data: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1])
}
```

The included sampler uses nearest sampling and clamps coordinates to the edges. For 3D textures add `depth`; for 2D arrays add `layers`. Cube textures have six `faces` in `+X, -X, +Y, -Y, +Z, -Z` order. Mipmaps go in `levels`, starting at level zero; requesting a missing level throws. `channels` defaults to four. Shadow samplers compare `reference <= depth`, or call your `compare(reference, depth)` function.

For your own filtering or texture formats, give the sampler methods named after the glsl functions:

```js
let image = {
	texture(coord, bias) { return sampleImage(coord, bias) },
	textureSize(lod) { return imageSize(lod) }
}
```

## From v3 to v4

* Node.js 18 or later is required.
* Subscript replaces `glsl-parser` and `glsl-tokenizer`. Streams now take source directly; token arrays and ASTs from the old parser need to be replaced with source or the built-in parser.
* Each compilation starts fresh. For lower-level work that keeps compiler state, use `compile.compiler.process(tree)`.
* Vectors, matrices, arrays and structs are copied on assignment. Read outputs after calling the shader instead of relying on changes to an array passed into it.
* Integer arithmetic wraps at 32 bits and integer division truncates. Boolean vectors contain booleans, texture-coordinate swizzles use `stpq`, and `outerProduct` returns column-major data.

## Development

```sh
npm test
npm run test:coverage
npm run benchmark -- 100
```

Tests check generated code with optimizations on and off. `test:coverage` also checks that every AST transform is exercised. See [process.md](process.md) for the implementation and test map, including the limits of those checks.

## Dependencies

* [subscript](https://github.com/dy/subscript) — parse glsl expressions.<br/>
* [prepr](https://github.com/dy/prepr) — expand macros and preprocessor directives.<br/>

## Used by

* [nogl-shader-output](https://github.com/dy/nogl-shader-output) — evaluate fragment shader on rectangular vertex input, gl-less.<br/>
* [GLSLRun](https://github.com/iY0Yi/GLSLRun) — debug shader via adding `print()` function.

## Similar

* [glsl.js](https://npmjs.org/package/glsl) — an alternative glsl to asm.js compiler by [@devongovett](https://github.com/devongovett), built with [jison](https://npmjs.org/package/jison).<br/>
* [js2glsl](https://github.com/jdavidberger/js2glsl) — transform js subset to glsl.<br/>
* [glsl-simulator](https://github.com/burg/glsl-simulator) — OpenGL 1.0 simulation in js.<br/>
* [turbo/js](https://github.com/turbo/js) — webgl-based computation.
* [shaderdsl](https://github.com/adobe-webplatform/shaderdsl)
* [wgsl_reflect](https://github.com/brendan-duncan/wgsl_reflect)
* [glm-js](https://github.com/humbletim/glm-js)
