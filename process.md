* What code is better: implicit (+) or explicit (-)? E. g. create unfolded object for each structure instance or provide type constructor?
	* + implicit is able to be unfolded - closurecompiler or ast-eval
	* - implicit is sometimes senseless like var a = bool();
		* + same time it may provide different implementation of bool.
	* + implicit way avoids unfolding matrices multiplication: `mat2d['*'](a, b)`
	* - explicit is easier to read
	* - explicit corresponds to swizzles
	* - implicit may be slower in simple cases like `var a = false`
		* + but times faster in multiple use like `var a = mat4(3)`
	* - in some cases implicits are N times slower: `xy.xy *= uv.yx;`. Expanding to explicit almost take no time to calculate `xy[0] *= uv[0]; xy[1] *= uv[1];`, and also concise. But dealing with types is cumbersome: `vec2.mult(vec2.xy(xy), vec2.yx(uv), xy);`
		* + at the same way, explicits are over-calculative, eg `a.xy *= b.x / b.y` — for each component of `a` we calculate `b.x/b.y`, and if it is a call for some troublesome method, it will be called up to 16 times (`mat4 = meth()`). Whereas with implicit call it will calculate `b.x/b.y` once and do assignment.
			* - still opened version is loads of time (3 times) faster.
	* + From the other POV, who on earth cares about the beauty of compiled code?
	* ✔ The good compromise is found in extending objects returned from types with swizzles etc. Takes more time on object constructs, but resulting code is pretty: `m = m.mult(n);`
		* Unfortunately, we have to extend native arrays prototype to keep execution fast enough.
* Why on earth we need to wrap floats/ints/bools? Need we?
	* + things like `vec4 a = 2.0 * vec4()`
		* - but they are better unwrapper as `var a = vec4().mult(1.0)` rather than `var a = float(1.0).mult(vec4())`
	* + implicit types are difficult to guess: `int a = 1, b = 2, c; c = a + b;` - which plus operator should we use?
		* - not that difficult, actually. Result of assignment is always typed. Same as each operand. We just have to track map of variables
	* - we have to mind swizzle types as well then: `a.x = b.y`
	* ✔ No wrapping, it is faster and easier to read.

* How to speed up code?
	* + Expand swizzles. Anyways you have to do multiplications manually in methods.
	* + Do not use vector types. FloatArrays are proved being 10 times faster, so fast that js shaders code is only 10 times slower than gl shaders one.
	* + `xy.xy *= uv.yx;` via fns is `$(xy, 'xy', mult($(xy, 'xy'), $(xy, 'yx')));` — not really faster than swizzle getters.
		* The optimal way: `{let xyxy = vec2.mult(xy, vec2(uv[1], uv[0])); xy = vec2(xyxy[0], xyxy[1])}`. Deswizzling is slow, as any kind of function call, like getter etc, the optimal way is straight literal access.
	* + Use plain arrays instead of Float32Arrays to construct vectors - that saves time on creating.
	* + Unwrap multiplication operations eg m1 * m2 → m1[0] * m2[0]; m1[1] * m2[1]; ...
	* + Using function calls is not that bad, 2% loose. Some things are impossible without functions, like `fn(x) * vec4()`.
		* We can polyfill methods for each type of operation like `floatMultVec3`, but that would force us passing lib as a param, which is the same slow as using gl-matrix.
		* We cannot really provide functions init code in a shader call, so we basically need to.
			* We possibly could’ve modified fake-gl processFragment so that it does not take lib as a param... But that seems to be difficult due to need to provide clean context for each call.
		* So there is nothing but to pass gl-matrix as a lib and provide transforms so to use it’s methods. Because polyfilling the same isn’t faster really, but prone to difficulties and errors.
