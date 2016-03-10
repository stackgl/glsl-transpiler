> _glsl-js_ transforms [glsl](https://www.opengl.org/documentation/glsl/) source to optimized readable js code. It converts _vec/mat_ to arrays, expands swizzles and engages [gl-matrix](https://github.com/toji/gl-matrix) for complex operations on vectors and matrices.

## Usage

[![npm install glsl-js](https://nodei.co/npm/glsl-js.png?mini=true)](https://npmjs.org/package/glsl-js/)

```js
var compile = require('glsl-js/string');

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

//result:
`
var uv = [0, 0];
var color = [0, 0, 0, 0];
var fColor = [0, 0, 0, 0];
var uScreenSize = [0, 0];

function main () {
	fColor = color;
	var position = [uv[0], -uv[1]];
	position[0] *= uScreenSize[1] / uScreenSize[0];
	gl_Position = [position[0], position[1], 0, 1];
};
`
```


## API

### glsl-js/string

To compile glsl source code to js directly, just pass a string as the argument and it will return the compiled string:

```js
var compile = require('glsl-js/string');
var glslify = require('glslify');

compile(glslify('./source.glsl'), options?);
```

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

### glsl-js

To apply compilation straight to glsl AST, use the main `glsl-js`:

```js
var GLSL = require('glsl-js');
var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');

var source = glslify('./source.glsl');
var tokens = tokenize(source);
var tree = parse(tokens);
var compile = GLSL(options?);
var result = compile(tree);
```

### Options

To adjust rendering settings it is possible to pass options object `var glsl = GLSL(options);`, which sets `glsl` instance values.

| Property | Default | Description |
|---|:---:|---|
| `replaceUniform` | `false` | A function replacing each uniform declaration. Ex: `replaceUniform: function (name, node) { return 'uniforms["' + name + '"]'; }` will render each uniform declaration as `var <name> = uniforms["<name>"]`. |
| `replaceAttribute` | `false` | Same as `replaceUniforms`, but for attributes. |
| `replaceVarying` | `false` | Same as `replaceUniforms`, but for varying. |


## Related

> [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) — build glsl AST.</br>
> [glsl-tokenizer](http://stack.gl/packages/#stackgl/glsl-tokenizer) — detect glsl tokens.</br>
> [glsl spec](https://www.opengl.org/documentation/glsl/) — openGL Shader Language specification.</br>
> [glsl.js](https://npmjs.org/package/glsl) — an alternative glsl to asm.js compiler by [@devongovett](https://github.com/devongovett), built with [jison](https://npmjs.org/package/jison) instead of glsl-parser. Project is abandoned :(.</br>