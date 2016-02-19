> Transform [glsl](https://www.opengl.org/documentation/glsl/) to js.

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
var uv;
var color;
var fColor;
var uScreenSize;

function main () {
	fColor = color;
	var position = vec2(uv[0], -uv[1]) * 1.0;
	position[0] = uScreenSize[1] / uScreenSize[0];
	gl_Position = vec4(position, 0, 1)
};
`
```


## API

### glsl-js/string

To compile glsl source code to js directly, just pass string as the argument and it will return compiled string:

```js
var compile = require('glsl-js/string');
var glslify = require('glslify');

compile(glslify('./source.glsl'), stdlib?);
```

### glsl-js/stream

_glsl-js_ can also be used as stream. For each node from the [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) it will return compiled js chunk.

```js
var compile = require('glsl-js/stream');
var parse = require('glsl-parser/stream');
var tokenize = require('glsl-tokenizer/stream')
var glslify = require('glslify');

fs.createReadStream('./source.glsl')
.pipe(tokenize())
.pipe(parse())
.pipe(compile(stdlib?))
.once('end', function () {
	//this.source contains the actual version of the compiled code
	//and gets updated on each input chunk of data.
	console.log(this.source);
});
```

### glsl-js

To apply compilation straight to glsl AST, use main `glsl-js`:

```js
var GLSL = require('glsl-js');
var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');

var source = glslify('./source.glsl');
var tokens = tokenize(source);
var tree = parse(tokens);
var result = GLSL(stdlib?).stringify(tree);
```

### stdlib

`stdlib` is an optional argument, which is an object with basic OpenGL types. By default minimal WebGL types stub is used, but the more complete [glsl-stdlib](https://npmjs.org/package/glsl-stdlib) can be used instead in this regard. Each type detected in glsl source will be polyfilled by the source of a function from the stdlib.

```js
var GLSL = require('glsl-js');
var stdlib = require('glsl-stdlib/opengl');
var tokenize = require('glsl-tokenizer/string');
var parse = require('glsl-parser/direct');

GLSL(stdlib).stringify(parse(tokenize(glslify('./source.glsl'))));
```


## Related

> [fake-gl](https://npmjs.org/package/fake-gl) — webgl implementation in node.</br>
> [glsl-stdlib](https://npmjs.org/package/glsl-stdlib) — webgl/opengl stdlib for node.</br>
> [glsl spec](https://www.opengl.org/documentation/glsl/) — openGL Shader Language specification.
> [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) — build glsl AST.</br>
> [glsl-tokenizer](http://stack.gl/packages/#stackgl/glsl-tokenizer) — detect glsl tokens.</br>
> [glsl.js](https://npmjs.org/package/glsl) — glsl to asm.js by [@devongovett](https://github.com/devongovett) compiler built with [jison](https://npmjs.org/package/jison). Project is abandoned :(.</br>