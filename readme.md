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
var uv = vec2();
var color = vec4();
var fColor = vec4();
var uScreenSize = vec2();

function main () {
	fColor = color;
	var position = vec2(uv.x, -uv.y).mult(1.0);
	position.x *= uScreenSize.y / uScreenSize.x;
	gl_Position = vec4(position, 0, 1);
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
var glsl = GLSL(options?); //create glsl instance
var result = glsl.stringify(tree);
```

### Properties

To adjust rendering settings it is possible to pass options object `var glsl = GLSL(options);`, which just sets `glsl` instance values.

| Property | Default | Description |
|---|:---:|---|
| `glsl.removeUniforms` | `false` | Remove uniforms declarations from the output. Can be useful if uniforms should be provided separately. |
| `glsl.removeAttributes` | `false` | Remove attributes declarations from the output. |
| `glsl.removeVarying` | `false` | Remove varying definitions from the output. |
| `glsl.stdlib` | `require('./stdlib')` | A collection of environment types, which are used as a wrappers for initial data, e. g. `vec2(0, 0, 1)`. |
| `glsl.scopes` | `{}` | Parsed scopes for the whole time of glsl object. Contains scope names with nested variable objects. |
| `glsl.attributes` | `{}` | Parsed attribute variables. |
| `glsl.varying` | `{}` | Parsed varying variables. |
| `glsl.uniforms` | `{}` | Parsed uniform variables. |

### Methods

| Method | Description |
|---|---|
| `glsl.reset()` | Reinitialize scopes, attributes, uniforms, varying. |
| `glsl.on(<event>)` | Bind event: `'start'` — invoked when `glsl.stringify()` is called the first time; `'<nodeType>'` — event with name according to node type is invoked when that node is being stringified. E. g. `'stmt'`, `'stmtlist'`, `'decl'` etc. See [glsl-parser](https://github.com/stackgl/glsl-parser) for the full list; `'end'` — invoked right before the end of the last `glsl.stringify()`.  |


## Related

> [glsl-parser](http://stack.gl/packages/#stackgl/glsl-parser) — build glsl AST.</br>
> [glsl-tokenizer](http://stack.gl/packages/#stackgl/glsl-tokenizer) — detect glsl tokens.</br>
> [glsl spec](https://www.opengl.org/documentation/glsl/) — openGL Shader Language specification.</br>
> [glsl.js](https://npmjs.org/package/glsl) — an alternative glsl to asm.js compiler by [@devongovett](https://github.com/devongovett), built with [jison](https://npmjs.org/package/jison) instead of glsl-parser. Project is abandoned :(.</br>