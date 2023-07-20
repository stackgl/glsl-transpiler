# glsl-transpiler [![Build Status](https://travis-ci.org/stackgl/glsl-transpiler.svg?branch=master)](https://travis-ci.org/stackgl/glsl-transpiler)

Transforms [glsl](https://www.opengl.org/documentation/glsl/) source to optimized js code. It converts vectors and matrices to arrays, expands swizzles, applies expressions optimizations and provides stdlib for environment compatibility.

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
	precision mediump float
	attribute vec2 uv
	attribute vec4 color
	varying vec4 fColor
	uniform vec2 uScreenSize

	void main (void) {
		fColor = color
		vec2 position = vec2(uv.x, -uv.y) * 1.0
		position.x *= uScreenSize.y / uScreenSize.x
		gl_Position = vec4(position, 0, 1)
	}
`)

// result:

`
var uv = attributes.uv
var color = attributes.color
var fColor = [0, 0, 0, 0]
var uScreenSize = uniforms.uScreenSize

function main () {
	fColor = color
	var position = [uv[0], -uv[1]]
	position[0] *= uScreenSize[1] / uScreenSize[0]
	gl_Position = [position[0], position[1], 0, 1]
}
`
```


## API

### glsl-transpiler

To apply compilation to glsl AST or string, require `glsl-transpiler`:

```js
import GLSL from 'glsl-transpiler'

let compile = GLSL({
	// Enable expressions optimizations.
	optimize: true,

	// Apply preprocessing. Pass custom preprocessor function `(srcString) => resultString;` to set own preprocessing.
	preprocess: true,

	// A function replacing each uniform declaration. Eg: ``(name, node) => `uniforms["${name}"]`;`` will render each uniform declaration as `var <name> = uniforms["<name>"]`.
	uniform: false,

	// Same as `uniform`, but for attribute declarations.
	attribute: false,

	// Same as `uniform`, but for varying declarations.
	varying: false,

	// GLSL shader version, one of `'300 es'` or `'100 es'`.
	version: '100 es',

	// Append stdlib includes for the result. Can be bool or an object with defined stdlib functions to include, eg. `{normalize: false, min: false}`.
	includes: true,

	// Enable debugging facilities: `print(anything)` will log to console a string of transpiled code with it’s type separated by colon, `show(anything)` will print the rendered descriptor of passed fragment of code. Note also that you can safely use `console.log(value)` to debug shader runtime.
	debug: false
})

//compile source code
let result = compile('...source.glsl')

//get collected info
let {
	attributes,
	uniforms,
	varyings,
	structs,
	functions,
	scopes
} = compile.compiler


//clean collected info
compiler.reset()
```

Note that `texture2D` function expects whether ndarray instance or defined `width` and `height` parameters on passed array.


### glsl-transpiler/stream

_glsl-transpiler_ can also be used as a stream. For each node from the [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) it will return compiled js chunk:

```js
import compile from 'glsl-transpiler/stream.js'
import parse from 'glsl-parser/stream.js'
import tokenize from 'glsl-tokenizer/stream.js'

fs.createReadStream('./source.glsl')
.pipe(tokenize())
.pipe(parse())
.pipe(compile(options?))
.once('end', function () {
	//this.source contains the actual version of the compiled code
	//and gets updated on each input chunk of data.
	console.log(this.source)
})
```

## Dependencies

* [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) — build glsl AST.<br/>
* [glsl-tokenizer](http://stack.gl/packages/#stackgl/glsl-tokenizer) — detect glsl tokens.<br/>

## Used by

* [nogl-shader-output](https://github.com/dy/nogl-shader-output) — evaluate fragment shader on rectangular vertex input, gl-less.<br/>
* [GLSLRun](https://github.com/iY0Yi/GLSLRun) – debug shader via adding `print()` function.

## Similar

* [glsl.js](https://npmjs.org/package/glsl) — an alternative glsl to asm.js compiler by [@devongovett](https://github.com/devongovett), built with [jison](https://npmjs.org/package/jison) instead of glsl-parser. Project is abandoned :(.<br/>
* [js2glsl](https://github.com/jdavidberger/js2glsl) — transform js subset to glsl.<br/>
* [glsl-simulator](https://github.com/burg/glsl-simulator) — OpenGL1.0 simulation in js.<br/>
* [turbo/js](https://github.com/turbo/js) — webgl-based computation
* [shaderdsl](https://github.com/adobe-webplatform/shaderdsl)
* [wgsl_reflect](https://github.com/brendan-duncan/wgsl_reflect)
