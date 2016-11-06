> _glsl-transpiler_ transforms [glsl](https://www.opengl.org/documentation/glsl/) source to optimized js code. It converts vectors and matrices to arrays, expands swizzles, applies expressions optimizations and provides stdlib for environment compatibility.

## Usage

[![npm install glsl-transpiler](https://nodei.co/npm/glsl-transpiler.png?mini=true)](https://npmjs.org/package/glsl-transpiler/)

```js
var Compiler = require('glsl-transpiler');

var compile = Compiler({
	uniform: function (name) {
		return `uniforms.${name}`;
	},
	attribute: function (name) {
		return `attributes.${name}`;
	}
});

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
	});
`)

//☟

`
var uv = attributes.uv;
var color = attributes.color;
var fColor = [0, 0, 0, 0];
var uScreenSize = uniforms.uScreenSize;

function main () {
	fColor = color;
	var position = [uv[0], -uv[1]];
	position[0] *= uScreenSize[1] / uScreenSize[0];
	gl_Position = [position[0], position[1], 0, 1];
};
`
```


## API

### glsl-transpiler

To apply compilation to glsl AST or string, require `glsl-transpiler`:

```js
var GLSL = require('glsl-transpiler');

var source = glslify('./source.glsl');
var compile = GLSL(options?);

//compile source code
var result = compile(source);


//get collected info
var compiler = compile.compiler;
compiler.attributes;
compiler.uniforms;
compiler.varyings;
compiler.structs;
compiler.functions;
compiler.scopes;


//clean collected info
compiler.reset();
```

### Options

| Property | Default | Description |
|---|:---:|---|
| `optimize` | `true` | Enable expressions optimizations. |
| `preprocess` | `true` | Apply preprocessing. Pass custom preprocessor function taking src argument and returning the result to set own preprocessing. |
| `uniform` | `false` | A function replacing each uniform declaration. Ex: `function (name, node) { return 'uniforms["' + name + '"]'; }` will render each uniform declaration as `var <name> = uniforms["<name>"]`. |
| `attribute` | `false` | Same as `uniform`, but for attribute declarations. |
| `varying` | `false` | Same as `uniform`, but for varying declarations. |
| `debug` | `false` | Enable debugging facilities: `print(anything);` will log to console a string of transpiled code with it’s type separated by colon, `show(anything);` will print the rendered descriptor of passed fragment of code. Note also that you can safely use `console.log(value)` to debug shader runtime. |

Note that `texture2D` function expects whether ndarray instance or defined `width` and `height` parameters on passed array.


### glsl-transpiler/stream

_glsl-transpiler_ can also be used as a stream. For each node from the [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) it will return compiled js chunk:

```js
var compile = require('glsl-transpiler/stream');
var parse = require('glsl-parser/stream');
var tokenize = require('glsl-tokenizer/stream');

fs.createReadStream('./source.glsl')
.pipe(tokenize())
.pipe(parse())
.pipe(compile(options?))
.once('end', function () {
	//this.source contains the actual version of the compiled code
	//and gets updated on each input chunk of data.
	console.log(this.source);
});
```

## Related

> [nogl-shader-output](https://github.com/dfcreative/nogl-shader-output) — eval fragment shader on rectangular vertex input, gl-less.<br/>
> [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) — build glsl AST.<br/>
> [glsl-tokenizer](http://stack.gl/packages/#stackgl/glsl-tokenizer) — detect glsl tokens.<br/>
> [glsl.js](https://npmjs.org/package/glsl) — an alternative glsl to asm.js compiler by [@devongovett](https://github.com/devongovett), built with [jison](https://npmjs.org/package/jison) instead of glsl-parser. Project is abandoned :(.<br/>
> [js2glsl](https://github.com/jdavidberger/js2glsl) — transform js subset to glsl.<br/>
> [glsl-simulator](https://github.com/burg/glsl-simulator) — OpenGL1.0 simulation in js.<br/>
> [turbo/js](https://github.com/turbo/js) — webgl-based computation
