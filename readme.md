> Transform [glsl](https://www.opengl.org/documentation/glsl/) to js.

[![npm install glsl-to-js](https://nodei.co/npm/glsl-to-js.png?mini=true)](https://npmjs.org/package/glsl-to-js/)

```js
var compile = require('glsl-to-js');

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
`);

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

_GLSL_ types like _vectors_ and _matrices_ are converted to typed arrays or to simple arrays. Swizzlings are expanded to member assignments. Stdlib methods are replaced with according js analogs. _GLSL_-specific methods, like _normalize_, _smoothstep_ etc are provided as separate functions, if they are detected in code.


## Related

> [glsl.js](https://npmjs.org/package/glsl) — glsl to asm.js compiler built with [jison](https://npmjs.org/package/jison). Project is abandoned.</br>
> [fake-gl](https://npmjs.org/package/fake-gl) — webgl for node.</br>