> Transform [glsl](https://www.opengl.org/documentation/glsl/) to js.

[![npm install glsl-to-js](https://nodei.co/npm/glsl-to-js.png?mini=true)](https://npmjs.org/package/glsl-to-js/)

```js
var parse = require('glsl-parse/stream');
var tokenize = require('glsl-tokenize/stream')
var compile = require('glsl-js/stream');
var stdlib = require('glsl-stdlib/webgl');

tokenize(`
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
.pipe(parse())
.pipe(compile(stdlib));

//==>
`
	var uv;
	var color;
	var fColor;
	var uScreenSize;

	function main () {
		fColor = color;
		var position = [uv.x * 1.0, -uv.y * 1.0];
		position.x *= uScreenSize.y / uScreenSize.x;
		gl_Position = [position[0], position[1], 0, 1];
	}
`
```


## Related

> [tiny-gl](https://npmjs.org/package/fake-gl) — webgl implementation in node.</br>
> [glsl-stdlib](https://npmjs.org/package/fake-gl) — webgl/opengl stdlib for node.</br>
> [glsl.js](https://npmjs.org/package/glsl) — glsl to asm.js by [@who]() compiler built with [jison](https://npmjs.org/package/jison). Project is abandoned :(.</br>