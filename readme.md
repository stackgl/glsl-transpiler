> _glsl-js_ transforms [glsl](https://www.opengl.org/documentation/glsl/) source to optimized readable js code. It converts _vec/mat_ to arrays, expands swizzles and engages [gl-matrix](https://github.com/toji/gl-matrix) for complex operations on vectors and matrices.

## Usage

[![npm install glsl-js](https://nodei.co/npm/glsl-js.png?mini=true)](https://npmjs.org/package/glsl-js/)

```js
var Compiler = require('glsl-js');

var compile = Compiler({
	replaceUniform: function (name) {
		return `uniforms.${name}`;
	},
	replaceAttribute: function (name) {
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

//↓ ↓ ↓

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

### glsl-js

To apply compilation to glsl AST or string, require `glsl-js`:

```js
var GLSL = require('glsl-js');

var source = glslify('./source.glsl');
var compile = GLSL(options?);
var result = compile(tree);
```

### Options

| Property | Default | Description |
|---|:---:|---|
| `optimize` | `true` | Enable simple optimizations, for example `mat2(vec2(1, 2), vec2(3, 4))[0][1]` with the flag on will be transformed to `2`, and without to `[[1, 2], [3, 4]][0][1]`. |
| `replaceUniform` | `false` | A function replacing each uniform declaration. Ex: `function (name, node) { return 'uniforms["' + name + '"]'; }` will render each uniform declaration as `var <name> = uniforms["<name>"]`. |
| `replaceAttribute` | `false` | Same as `replaceUniform`, but for attribute declarations. |
| `replaceVarying` | `false` | Same as `replaceUniform`, but for varying declarations. |


### glsl-js/stream

_glsl-js_ can also be used as a stream. For each node from the [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) it will return compiled js chunk:

```js
var compile = require('glsl-js/stream');
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

> [gl-shader-output](https://github.com/dfcreative/gl-shader-output) — eval fragment shader on rectangular vertex input.<br/>
> [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) — build glsl AST.</br>
> [glsl-tokenizer](http://stack.gl/packages/#stackgl/glsl-tokenizer) — detect glsl tokens.</br>
> [glsl spec](https://www.opengl.org/documentation/glsl/) — openGL Shader Language specification.</br>
> [glsl.js](https://npmjs.org/package/glsl) — an alternative glsl to asm.js compiler by [@devongovett](https://github.com/devongovett), built with [jison](https://npmjs.org/package/jison) instead of glsl-parser. Project is abandoned :(.</br>