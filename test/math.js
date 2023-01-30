import test from 'tape'
import evaluate from './util/eval.js'
import almost from './util/almost.js'

// math
import stdlib from '../lib/stdlib.js'
var mat4 = stdlib.mat4;
var vec4 = stdlib.vec4;
var pi2 = Math.PI * 2;

test('type radians (type degrees)', function (t) {
	t.deepEqual(evaluate('radians(360);'), Math.PI * 2);
	t.deepEqual(evaluate('radians(vec4(360));'), vec4(Math.PI * 2));
	t.deepEqual(evaluate('radians(mat4(360));'), mat4(Math.PI * 2));
	t.end()
})

test('type degrees (type radians)', function (t) {
	t.deepEqual(evaluate(`degrees(${pi2});`), 360);
	t.deepEqual(evaluate(`degrees(vec4(${pi2}));`), vec4(360));
	t.deepEqual(evaluate(`degrees(mat4(${pi2}));`), mat4(360));
	t.end()
})

test('type sin (type angle)', function (t) {
	t.ok(almost(evaluate(`sin(${pi2});`), 0));
	t.ok(almost(evaluate(`sin(vec4(${pi2}));`), vec4(0)));
	t.ok(almost(evaluate(`sin(mat4(${pi2}));`), mat4(0)));
	t.end()
})

test('type cos (type angle)', function (t) {
	t.ok(almost(evaluate(`cos(${pi2});`), 1));
	t.ok(almost(evaluate(`cos(vec4(${pi2}));`), vec4(1)));
	// t.ok(almost(evaluate(`cos(mat4(${pi2}));`), mat4(1)));
	t.end()
})

test('type tan (type angle)', function (t) {
	t.ok(almost(evaluate(`tan(${pi2});`), 0));
	t.ok(almost(evaluate(`tan(vec4(${pi2}));`), vec4(0)));
	// t.ok(almost(evaluate(`tan(mat4(${pi2}));`), mat4(0)));
	t.end()
})

test('type asin (type x)', function (t) {
	t.ok(almost(evaluate(`asin(1);`), Math.PI/2));
	t.ok(almost(evaluate(`asin(vec4(1));`), vec4(Math.PI/2)));
	// t.ok(almost(evaluate(`asin(mat4(1));`), mat4(Math.PI/2)));
	t.end()
})

test('type acos (type x)', function (t) {
	t.ok(almost(evaluate(`acos(1);`), 0));
	t.ok(almost(evaluate(`acos(vec4(1));`), vec4(0)));
	// t.ok(almost(evaluate(`acos(mat4(1));`), mat4(0)));
	t.end()
})

test('type atan (type y_over_x)', function (t) {
	t.ok(almost(evaluate(`atan(1);`), Math.PI/4));
	t.ok(almost(evaluate(`atan(vec4(1));`), vec4(Math.PI/4)));
	// t.ok(almost(evaluate(`atan(mat4(1));`), mat4(Math.PI/4)));
	t.end()
})

test('type atan (type y, type x)', function (t) {
	t.ok(almost(evaluate(`atan(1, 0);`), Math.PI/2));
	t.ok(almost(evaluate(`atan(vec4(1), vec4(0));`), vec4(Math.PI/2)));
	// t.ok(almost(evaluate(`atan(mat4(1), mat4(0));`), mat4(Math.PI/2)));
	t.end()
})

test('type pow (type x, type y)', function (t) {
	var x = Math.random() * 100, y = Math.random() * 100;
	t.ok(almost(evaluate(`pow(${x}, ${y});`), Math.pow(x, y)));
	t.ok(almost(evaluate(`pow(vec4(${x}), vec4(${y}));`), vec4(Math.pow(x, y))));
	// t.ok(almost(evaluate(`pow(mat4(${x}), mat4(${y}));`), mat4(Math.pow(x, y))));
	t.end()
})

test('type exp (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(evaluate(`exp(${x});`), Math.exp(x)));
	t.ok(almost(evaluate(`exp(vec4(${x}));`), vec4(Math.exp(x))));
	// t.ok(almost(evaluate(`exp(mat4(${x}));`), mat4(Math.exp(x))));
	t.end()
})

test('type log (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(evaluate(`log(${x});`), Math.log(x)));
	t.ok(almost(evaluate(`log(vec4(${x}));`), vec4(Math.log(x))));
	// t.ok(almost(evaluate(`log(mat4(${x}));`), mat4(Math.log(x))));
	t.end()
})

test('type exp2 (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(evaluate(`exp2(${x});`), Math.pow(2, x)));
	t.ok(almost(evaluate(`exp2(vec4(${x}));`), vec4(Math.pow(2, x))));
	// t.ok(almost(evaluate(`exp2(mat4(${x}));`), mat4(Math.pow(2, x))));
	t.end()
})

test('type log2 (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(evaluate(`log2(${x});`), Math.log2(x)));
	t.ok(almost(evaluate(`log2(vec4(${x}));`), vec4(Math.log2(x))));
	// t.ok(almost(evaluate(`log2(mat4(${x}));`), mat4(Math.log2(x))));
	t.end()
})

test('type sqrt (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(evaluate(`sqrt(${x});`), Math.sqrt(x)));
	t.ok(almost(evaluate(`sqrt(vec4(${x}));`), vec4(Math.sqrt(x))));
	t.ok(almost(evaluate(`sqrt(mat4(${x}));`), mat4(Math.sqrt(x))));
	t.end()
})

test('type inversesqrt (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(evaluate(`inversesqrt(${x});`), 1/Math.sqrt(x)));
	t.ok(almost(evaluate(`inversesqrt(vec4(${x}));`), vec4(1/Math.sqrt(x))));
	// t.ok(almost(evaluate(`inversesqrt(mat4(${x}));`), mat4(1/Math.sqrt(x))));
	t.end()
})

test('type abs (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`abs(${x});`), Math.abs(x)));
	t.ok(almost(evaluate(`abs(vec4(${x}));`), vec4(Math.abs(x))));
	t.ok(almost(evaluate(`abs(mat4(${x}));`), mat4(Math.abs(x))));
	t.end()
})

test('type sign (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`sign(${x});`), Math.sign(x)));
	t.ok(almost(evaluate(`sign(vec4(${x}));`), vec4(Math.sign(x))));
	t.ok(almost(evaluate(`sign(mat4(${x}));`), mat4(Math.sign(x))));
	t.end()
})

test('type floor (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`floor(${x});`), Math.floor(x)));
	t.ok(almost(evaluate(`floor(vec4(${x}));`), vec4(Math.floor(x))));
	t.ok(almost(evaluate(`floor(mat4(${x}));`), mat4(Math.floor(x))));
	t.end()
})

test('type ceil (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`ceil(${x});`), Math.ceil(x)));
	t.ok(almost(evaluate(`ceil(vec4(${x}));`), vec4(Math.ceil(x))));
	t.ok(almost(evaluate(`ceil(mat4(${x}));`), mat4(Math.ceil(x))));
	t.end()
})

test('type fract (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`fract(${x});`), x - Math.floor(x)));
	t.ok(almost(evaluate(`fract(vec4(${x}));`), vec4(x - Math.floor(x))));
	t.ok(almost(evaluate(`fract(mat4(${x}));`), mat4(x - Math.floor(x))));
	t.end()
})

test('type mod (type x, type y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`mod(${x}, ${y});`), x % y));
	t.ok(almost(evaluate(`mod(vec4(${x}), vec4(${y}));`), vec4(x % y)));
	t.ok(almost(evaluate(`mod(mat4(${x}), mat4(${y}));`), mat4(x % y)));
	t.ok(almost(evaluate(`mod(vec4(${x}), ${y});`), vec4(x % y)));
	t.ok(almost(evaluate(`mod(mat4(${x}), ${y});`), mat4(x % y)));
	t.end()
})

test('type min (type x, type|float y)', function (t) {
	var x = (Math.random()) * 100, y = (Math.random()) * 100;
	t.ok(almost(evaluate(`min(${x}, ${y});`), Math.min(x, y)));
	t.ok(almost(evaluate(`min(vec4(${x}), vec4(${y}));`), vec4(Math.min(x, y))));
	t.ok(almost(evaluate(`min(mat4(${x}), mat4(${y}));`), mat4(Math.min(x, y))));
	t.ok(almost(evaluate(`min(vec4(${x}), ${y});`), vec4(Math.min(x, y))));
	t.ok(almost(evaluate(`min(mat4(${x}), ${y});`), mat4(Math.min(x, y))));
	t.end()
})

test('type max (type x, type|float y)', function (t) {
	var x = (Math.random() - 1) * 100, y = (Math.random() - 1) * 100;
	t.ok(almost(evaluate(`max(${x}, ${y});`), Math.max(x, y)));
	t.ok(almost(evaluate(`max(vec4(${x}), vec4(${y}));`), vec4(Math.max(x, y))));
	t.ok(almost(evaluate(`max(mat4(${x}), mat4(${y}));`), mat4(Math.max(x, y))));
	t.ok(almost(evaluate(`max(vec4(${x}), ${y});`), vec4(Math.max(x, y))));
	t.ok(almost(evaluate(`max(mat4(${x}), ${y});`), mat4(Math.max(x, y))));
	t.end()
})

test('type clamp (type x, type|float min, type|float max)', function (t) {
	var x = (Math.random() - 1) * 100, y = (Math.random() - 1) * 100, z = (Math.random() - 1) * 100;
	t.ok(almost(evaluate(`clamp(${x}, ${y}, ${z});`), Math.min(Math.max(x, y), z)));
	t.ok(almost(evaluate(`clamp(vec4(${x}), vec4(${y}), vec4(${z}));`), vec4(Math.min(Math.max(x, y), z))));
	t.ok(almost(evaluate(`clamp(mat4(${x}), mat4(${y}), mat4(${z}));`), mat4(Math.min(Math.max(x, y), z))));
	t.ok(almost(evaluate(`clamp(vec4(${x}), ${y}, ${z});`), vec4(Math.min(Math.max(x, y), z))));
	// t.ok(almost(evaluate(`clamp(mat4(${x}), ${y}, ${z});`), mat4(Math.min(Math.max(x, y), z))));
	t.end()
})

test('type mix (type x, type y, type|float a)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, a = Math.random();
	t.ok(almost(evaluate(`mix(${x}, ${y}, ${a});`), x*(1-a)+y*a));
	t.ok(almost(evaluate(`mix(vec4(${x}), vec4(${y}), vec4(${a}));`), vec4(x*(1-a)+y*a)));
	t.ok(almost(evaluate(`mix(mat4(${x}), mat4(${y}), mat4(${a}));`), mat4(x*(1-a)+y*a)));
	t.ok(almost(evaluate(`mix(vec4(${x}), vec4(${y}), ${a});`), vec4(x*(1-a)+y*a)));
	t.ok(almost(evaluate(`mix(mat4(${x}), mat4(${y}), ${a});`), mat4(x*(1-a)+y*a)));
	t.end()
})

test('type step (type|float edge, type x)', function (t) {
	var edge = (Math.random() - 0.5) * 100, x = (Math.random() - 0.5) * 100;

	function step (edge, x) {
		return x < edge ? 0.0 : 1.0;
	}

	t.ok(almost(evaluate(`step(${edge}, ${x});`), step(edge, x)));
	t.ok(almost(evaluate(`step(vec4(${edge}), vec4(${x}));`), vec4(step(edge, x))));
	t.ok(almost(evaluate(`step(mat4(${edge}), mat4(${x}));`), mat4(step(edge, x))));
	t.ok(almost(evaluate(`step(${edge}, vec4(${x}));`), vec4(step(edge, x))));
	// t.ok(almost(evaluate(`step(${edge}, mat4(${x}));`), mat4(step(edge, x))));
	t.end()
})

test('type smoothstep (type|float a, type|float b, type x)', function (t) {
	var a = (Math.random()) * 100, b = (Math.random()) * 100, x = (Math.random()) * 100;

	function smoothstep (edge0, edge1, x) {
		var t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
		return t * t * (3.0 - 2.0 * t);
	}

	t.ok(almost(evaluate(`smoothstep(${a}, ${b}, ${x});`), smoothstep(a, b, x)));
	t.ok(almost(evaluate(`smoothstep(vec4(${a}), vec4(${b}), vec4(${x}));`), vec4(smoothstep(a, b, x))));
	t.ok(almost(evaluate(`smoothstep(mat4(${a}), mat4(${b}), mat4(${x}));`), mat4(smoothstep(a, b, x))));
	t.ok(almost(evaluate(`smoothstep(${a}, ${b}, vec4(${x}));`), vec4(smoothstep(a, b, x))));
	// t.ok(almost(evaluate(`smoothstep(${a}, ${b}, mat4(${x}));`), mat4(smoothstep(a, b, x))));
	t.end()
})

test('float length (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100, w = (Math.random() - 0.5) * 100;
	t.ok(almost(evaluate(`length(vec2(${x}, ${y}));`), Math.sqrt(x*x + y*y)));
	t.ok(almost(evaluate(`length(vec3(${x}, ${y}, ${z}));`), Math.sqrt(x*x + y*y + z*z)));
	t.ok(almost(evaluate(`length(vec4(${x}, ${y}, ${z}, ${w}));`), Math.sqrt(x*x + y*y + z*z + w*w)));
	t.end()
})

test('float distance (type x, type y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	var d = x-y;
	t.ok(almost(evaluate(`distance(vec2(${x}), vec2(${y}));`), Math.sqrt(d*d + d*d)));
	t.ok(almost(evaluate(`distance(vec2(${x}, ${y}), vec2(${y}, ${x}));`), Math.sqrt(d*d + d*d)));
	t.end()
})

test('float dot (type x, type y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	var d = x-y;
	t.ok(almost(evaluate(`dot(vec2(${x}), vec2(${y}));`), x*y*2));
	t.ok(almost(evaluate(`dot(vec2(${x}, ${y}), vec2(${y}, ${x}));`), x*y*2));
	t.end()
})

test('vec3 cross (vec3 x, vec3 y)', function (t) {
	var x = 1, y = 2, z = 3, a = 4, b = 5, c = 6;
	t.ok(almost(evaluate(`cross(vec3(${x}, ${y}, ${z}), vec3(${a}, ${b}, ${c}));`), [-3, 6, -3]));
	t.end()
})

test('type normalize (type x)', function (t) {
	t.ok(almost(evaluate(`normalize(vec2(5, 0));`), [1, 0]));
	t.ok(almost(evaluate(`normalize(vec3(0, 5, 0));`), [0, 1, 0]));
	t.ok(almost(evaluate(`normalize(vec4(0, 0, 0, 0.5));`), [0, 0, 0, 1]));
	t.end()
})

test('type faceforward (type N, type I, type Nref)', function (t) {
	var x = -1, y = -2, z = -3;
	t.ok(almost(evaluate(`faceforward(vec3(-1, -2, -3), vec3(-1));`), [1, 2, 3]));
	t.ok(almost(evaluate(`faceforward(vec3(1, 2, 3), vec3(-1));`), [1, 2, 3]));
	t.ok(almost(evaluate(`faceforward(vec3(1, 2, 3), vec3(1));`), [-1, -2, -3]));
	t.end()
})

test('type reflect (type I, type N)', function (t) {
	t.ok(almost(evaluate(`reflect(vec3(1, 1, 0), vec3(1, 0, 0));`), [-1, 1, 0]));
	t.ok(almost(evaluate(`reflect(vec2(1, 1), vec2(1, 0));`), [-1, 1]));
	t.ok(almost(evaluate(`reflect(vec4(1, 1, 0, 0), vec4(0, 1, 0, 0));`), [1, -1, 0, 0]));
	t.end()
})

test('type refract (type I, type N, float eta)', function (t) {
	t.ok(almost(evaluate(`refract(vec2(1, 1), vec2(-1, -1), 0);`), [1, 1]));
	t.end()
})

// type dFdx( type x ), dFdy( type x )
// type fwidth( type p )

// genType sinh (genType x)
// genType cosh (genType x)
// genType tanh (genType x)
// genType asinh (genType x) Arc hyperbolic sine; returns the inverse of sinh.
// genType acosh (genType x)
// genType atanh (genType x)

// genType trunc (genType x)
// genDType trunc (genDType x)
// genType round (genType x)
// genDType round (genDType x)
// genType roundEven (genType x)
// genDType roundEven (genDType x)
// genType modf (genType x, out genType i)
// genDType modf (genDType x, out genDType i)
// genBType isnan (genType x)
// genBType isnan (genDType x)
// genBType isinf (genType x)
// genBType isinf (genDType x)
// genIType floatBitsToInt (genType value)
// genUType floatBitsToUint (genType value)
// genType intBitsToFloat (genIType value)
// genType uintBitsToFloat (genUType value)
// genType fma (genType a, genType b, genType c)
// genDType fma (genDType a, genDType b, genDType c)
// genType frexp (genType x, out genIType exp)
// genDType frexp (genDType x, out genIType exp)
// genType ldexp (genType x, in genIType exp)
// genDType ldexp (genDType x, in genIType exp)

// float interpolateAtCentroid (float interpolant)
// vec2 interpolateAtCentroid (vec2 interpolant)
// vec3 interpolateAtCentroid (vec3 interpolant)
// vec4 interpolateAtCentroid (vec4 interpolant)
// float interpolateAtSample (float interpolant, int sample)
// vec2 interpolateAtSample (vec2 interpolant, int sample)
// vec3 interpolateAtSample (vec3 interpolant, int sample)
// vec4 interpolateAtSample (vec4 interpolant, int sample)
// float interpolateAtOffset (float interpolant, vec2 offset)
// vec2 interpolateAtOffset (vec2 interpolant, vec2 offset)
// vec3 interpolateAtOffset (vec3 interpolant, vec2 offset)
// vec4 interpolateAtOffset (vec4 interpolant, vec2 offset)
