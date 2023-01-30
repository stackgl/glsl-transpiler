var test = require('tape')
var eval = require('./util/eval')
var almost = require('./util/almost')

// math
var stdlib = require('../lib/stdlib')
var mat4 = stdlib.mat4;
var vec4 = stdlib.vec4;
var pi2 = Math.PI * 2;

test('type radians (type degrees)', function (t) {
	t.deepEqual(eval('radians(360);'), Math.PI * 2);
	t.deepEqual(eval('radians(vec4(360));'), vec4(Math.PI * 2));
	t.deepEqual(eval('radians(mat4(360));'), mat4(Math.PI * 2));
	t.end()
})

test('type degrees (type radians)', function (t) {
	t.deepEqual(eval(`degrees(${pi2});`), 360);
	t.deepEqual(eval(`degrees(vec4(${pi2}));`), vec4(360));
	t.deepEqual(eval(`degrees(mat4(${pi2}));`), mat4(360));
	t.end()
})

test('type sin (type angle)', function (t) {
	t.ok(almost(eval(`sin(${pi2});`), 0));
	t.ok(almost(eval(`sin(vec4(${pi2}));`), vec4(0)));
	t.ok(almost(eval(`sin(mat4(${pi2}));`), mat4(0)));
	t.end()
})

test('type cos (type angle)', function (t) {
	t.ok(almost(eval(`cos(${pi2});`), 1));
	t.ok(almost(eval(`cos(vec4(${pi2}));`), vec4(1)));
	// t.ok(almost(eval(`cos(mat4(${pi2}));`), mat4(1)));
	t.end()
})

test('type tan (type angle)', function (t) {
	t.ok(almost(eval(`tan(${pi2});`), 0));
	t.ok(almost(eval(`tan(vec4(${pi2}));`), vec4(0)));
	// t.ok(almost(eval(`tan(mat4(${pi2}));`), mat4(0)));
	t.end()
})

test('type asin (type x)', function (t) {
	t.ok(almost(eval(`asin(1);`), Math.PI/2));
	t.ok(almost(eval(`asin(vec4(1));`), vec4(Math.PI/2)));
	// t.ok(almost(eval(`asin(mat4(1));`), mat4(Math.PI/2)));
	t.end()
})

test('type acos (type x)', function (t) {
	t.ok(almost(eval(`acos(1);`), 0));
	t.ok(almost(eval(`acos(vec4(1));`), vec4(0)));
	// t.ok(almost(eval(`acos(mat4(1));`), mat4(0)));
	t.end()
})

test('type atan (type y_over_x)', function (t) {
	t.ok(almost(eval(`atan(1);`), Math.PI/4));
	t.ok(almost(eval(`atan(vec4(1));`), vec4(Math.PI/4)));
	// t.ok(almost(eval(`atan(mat4(1));`), mat4(Math.PI/4)));
	t.end()
})

test('type atan (type y, type x)', function (t) {
	t.ok(almost(eval(`atan(1, 0);`), Math.PI/2));
	t.ok(almost(eval(`atan(vec4(1), vec4(0));`), vec4(Math.PI/2)));
	// t.ok(almost(eval(`atan(mat4(1), mat4(0));`), mat4(Math.PI/2)));
	t.end()
})

test('type pow (type x, type y)', function (t) {
	var x = Math.random() * 100, y = Math.random() * 100;
	t.ok(almost(eval(`pow(${x}, ${y});`), Math.pow(x, y)));
	t.ok(almost(eval(`pow(vec4(${x}), vec4(${y}));`), vec4(Math.pow(x, y))));
	// t.ok(almost(eval(`pow(mat4(${x}), mat4(${y}));`), mat4(Math.pow(x, y))));
	t.end()
})

test('type exp (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(eval(`exp(${x});`), Math.exp(x)));
	t.ok(almost(eval(`exp(vec4(${x}));`), vec4(Math.exp(x))));
	// t.ok(almost(eval(`exp(mat4(${x}));`), mat4(Math.exp(x))));
	t.end()
})

test('type log (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(eval(`log(${x});`), Math.log(x)));
	t.ok(almost(eval(`log(vec4(${x}));`), vec4(Math.log(x))));
	// t.ok(almost(eval(`log(mat4(${x}));`), mat4(Math.log(x))));
	t.end()
})

test('type exp2 (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(eval(`exp2(${x});`), Math.pow(2, x)));
	t.ok(almost(eval(`exp2(vec4(${x}));`), vec4(Math.pow(2, x))));
	// t.ok(almost(eval(`exp2(mat4(${x}));`), mat4(Math.pow(2, x))));
	t.end()
})

test('type log2 (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(eval(`log2(${x});`), Math.log2(x)));
	t.ok(almost(eval(`log2(vec4(${x}));`), vec4(Math.log2(x))));
	// t.ok(almost(eval(`log2(mat4(${x}));`), mat4(Math.log2(x))));
	t.end()
})

test('type sqrt (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(eval(`sqrt(${x});`), Math.sqrt(x)));
	t.ok(almost(eval(`sqrt(vec4(${x}));`), vec4(Math.sqrt(x))));
	t.ok(almost(eval(`sqrt(mat4(${x}));`), mat4(Math.sqrt(x))));
	t.end()
})

test('type inversesqrt (type x)', function (t) {
	var x = Math.random() * 100;
	t.ok(almost(eval(`inversesqrt(${x});`), 1/Math.sqrt(x)));
	t.ok(almost(eval(`inversesqrt(vec4(${x}));`), vec4(1/Math.sqrt(x))));
	// t.ok(almost(eval(`inversesqrt(mat4(${x}));`), mat4(1/Math.sqrt(x))));
	t.end()
})

test('type abs (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`abs(${x});`), Math.abs(x)));
	t.ok(almost(eval(`abs(vec4(${x}));`), vec4(Math.abs(x))));
	t.ok(almost(eval(`abs(mat4(${x}));`), mat4(Math.abs(x))));
	t.end()
})

test('type sign (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`sign(${x});`), Math.sign(x)));
	t.ok(almost(eval(`sign(vec4(${x}));`), vec4(Math.sign(x))));
	t.ok(almost(eval(`sign(mat4(${x}));`), mat4(Math.sign(x))));
	t.end()
})

test('type floor (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`floor(${x});`), Math.floor(x)));
	t.ok(almost(eval(`floor(vec4(${x}));`), vec4(Math.floor(x))));
	t.ok(almost(eval(`floor(mat4(${x}));`), mat4(Math.floor(x))));
	t.end()
})

test('type ceil (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`ceil(${x});`), Math.ceil(x)));
	t.ok(almost(eval(`ceil(vec4(${x}));`), vec4(Math.ceil(x))));
	t.ok(almost(eval(`ceil(mat4(${x}));`), mat4(Math.ceil(x))));
	t.end()
})

test('type fract (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`fract(${x});`), x - Math.floor(x)));
	t.ok(almost(eval(`fract(vec4(${x}));`), vec4(x - Math.floor(x))));
	t.ok(almost(eval(`fract(mat4(${x}));`), mat4(x - Math.floor(x))));
	t.end()
})

test('type mod (type x, type y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`mod(${x}, ${y});`), x % y));
	t.ok(almost(eval(`mod(vec4(${x}), vec4(${y}));`), vec4(x % y)));
	t.ok(almost(eval(`mod(mat4(${x}), mat4(${y}));`), mat4(x % y)));
	t.ok(almost(eval(`mod(vec4(${x}), ${y});`), vec4(x % y)));
	t.ok(almost(eval(`mod(mat4(${x}), ${y});`), mat4(x % y)));
	t.end()
})

test('type min (type x, type|float y)', function (t) {
	var x = (Math.random()) * 100, y = (Math.random()) * 100;
	t.ok(almost(eval(`min(${x}, ${y});`), Math.min(x, y)));
	t.ok(almost(eval(`min(vec4(${x}), vec4(${y}));`), vec4(Math.min(x, y))));
	t.ok(almost(eval(`min(mat4(${x}), mat4(${y}));`), mat4(Math.min(x, y))));
	t.ok(almost(eval(`min(vec4(${x}), ${y});`), vec4(Math.min(x, y))));
	t.ok(almost(eval(`min(mat4(${x}), ${y});`), mat4(Math.min(x, y))));
	t.end()
})

test('type max (type x, type|float y)', function (t) {
	var x = (Math.random() - 1) * 100, y = (Math.random() - 1) * 100;
	t.ok(almost(eval(`max(${x}, ${y});`), Math.max(x, y)));
	t.ok(almost(eval(`max(vec4(${x}), vec4(${y}));`), vec4(Math.max(x, y))));
	t.ok(almost(eval(`max(mat4(${x}), mat4(${y}));`), mat4(Math.max(x, y))));
	t.ok(almost(eval(`max(vec4(${x}), ${y});`), vec4(Math.max(x, y))));
	t.ok(almost(eval(`max(mat4(${x}), ${y});`), mat4(Math.max(x, y))));
	t.end()
})

test('type clamp (type x, type|float min, type|float max)', function (t) {
	var x = (Math.random() - 1) * 100, y = (Math.random() - 1) * 100, z = (Math.random() - 1) * 100;
	t.ok(almost(eval(`clamp(${x}, ${y}, ${z});`), Math.min(Math.max(x, y), z)));
	t.ok(almost(eval(`clamp(vec4(${x}), vec4(${y}), vec4(${z}));`), vec4(Math.min(Math.max(x, y), z))));
	t.ok(almost(eval(`clamp(mat4(${x}), mat4(${y}), mat4(${z}));`), mat4(Math.min(Math.max(x, y), z))));
	t.ok(almost(eval(`clamp(vec4(${x}), ${y}, ${z});`), vec4(Math.min(Math.max(x, y), z))));
	// t.ok(almost(eval(`clamp(mat4(${x}), ${y}, ${z});`), mat4(Math.min(Math.max(x, y), z))));
	t.end()
})

test('type mix (type x, type y, type|float a)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, a = Math.random();
	t.ok(almost(eval(`mix(${x}, ${y}, ${a});`), x*(1-a)+y*a));
	t.ok(almost(eval(`mix(vec4(${x}), vec4(${y}), vec4(${a}));`), vec4(x*(1-a)+y*a)));
	t.ok(almost(eval(`mix(mat4(${x}), mat4(${y}), mat4(${a}));`), mat4(x*(1-a)+y*a)));
	t.ok(almost(eval(`mix(vec4(${x}), vec4(${y}), ${a});`), vec4(x*(1-a)+y*a)));
	t.ok(almost(eval(`mix(mat4(${x}), mat4(${y}), ${a});`), mat4(x*(1-a)+y*a)));
	t.end()
})

test('type step (type|float edge, type x)', function (t) {
	var edge = (Math.random() - 0.5) * 100, x = (Math.random() - 0.5) * 100;

	function step (edge, x) {
		return x < edge ? 0.0 : 1.0;
	}

	t.ok(almost(eval(`step(${edge}, ${x});`), step(edge, x)));
	t.ok(almost(eval(`step(vec4(${edge}), vec4(${x}));`), vec4(step(edge, x))));
	t.ok(almost(eval(`step(mat4(${edge}), mat4(${x}));`), mat4(step(edge, x))));
	t.ok(almost(eval(`step(${edge}, vec4(${x}));`), vec4(step(edge, x))));
	// t.ok(almost(eval(`step(${edge}, mat4(${x}));`), mat4(step(edge, x))));
	t.end()
})

test('type smoothstep (type|float a, type|float b, type x)', function (t) {
	var a = (Math.random()) * 100, b = (Math.random()) * 100, x = (Math.random()) * 100;

	function smoothstep (edge0, edge1, x) {
		var t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0.0), 1.0);
		return t * t * (3.0 - 2.0 * t);
	}

	t.ok(almost(eval(`smoothstep(${a}, ${b}, ${x});`), smoothstep(a, b, x)));
	t.ok(almost(eval(`smoothstep(vec4(${a}), vec4(${b}), vec4(${x}));`), vec4(smoothstep(a, b, x))));
	t.ok(almost(eval(`smoothstep(mat4(${a}), mat4(${b}), mat4(${x}));`), mat4(smoothstep(a, b, x))));
	t.ok(almost(eval(`smoothstep(${a}, ${b}, vec4(${x}));`), vec4(smoothstep(a, b, x))));
	// t.ok(almost(eval(`smoothstep(${a}, ${b}, mat4(${x}));`), mat4(smoothstep(a, b, x))));
	t.end()
})

test('float length (type x)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100, w = (Math.random() - 0.5) * 100;
	t.ok(almost(eval(`length(vec2(${x}, ${y}));`), Math.sqrt(x*x + y*y)));
	t.ok(almost(eval(`length(vec3(${x}, ${y}, ${z}));`), Math.sqrt(x*x + y*y + z*z)));
	t.ok(almost(eval(`length(vec4(${x}, ${y}, ${z}, ${w}));`), Math.sqrt(x*x + y*y + z*z + w*w)));
	t.end()
})

test('float distance (type x, type y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	var d = x-y;
	t.ok(almost(eval(`distance(vec2(${x}), vec2(${y}));`), Math.sqrt(d*d + d*d)));
	t.ok(almost(eval(`distance(vec2(${x}, ${y}), vec2(${y}, ${x}));`), Math.sqrt(d*d + d*d)));
	t.end()
})

test('float dot (type x, type y)', function (t) {
	var x = (Math.random() - 0.5) * 100, y = (Math.random() - 0.5) * 100;
	var d = x-y;
	t.ok(almost(eval(`dot(vec2(${x}), vec2(${y}));`), x*y*2));
	t.ok(almost(eval(`dot(vec2(${x}, ${y}), vec2(${y}, ${x}));`), x*y*2));
	t.end()
})

test('vec3 cross (vec3 x, vec3 y)', function (t) {
	var x = 1, y = 2, z = 3, a = 4, b = 5, c = 6;
	t.ok(almost(eval(`cross(vec3(${x}, ${y}, ${z}), vec3(${a}, ${b}, ${c}));`), [-3, 6, -3]));
	t.end()
})

test('type normalize (type x)', function (t) {
	t.ok(almost(eval(`normalize(vec2(5, 0));`), [1, 0]));
	t.ok(almost(eval(`normalize(vec3(0, 5, 0));`), [0, 1, 0]));
	t.ok(almost(eval(`normalize(vec4(0, 0, 0, 0.5));`), [0, 0, 0, 1]));
	t.end()
})

test('type faceforward (type N, type I, type Nref)', function (t) {
	var x = -1, y = -2, z = -3;
	t.ok(almost(eval(`faceforward(vec3(-1, -2, -3), vec3(-1));`), [1, 2, 3]));
	t.ok(almost(eval(`faceforward(vec3(1, 2, 3), vec3(-1));`), [1, 2, 3]));
	t.ok(almost(eval(`faceforward(vec3(1, 2, 3), vec3(1));`), [-1, -2, -3]));
	t.end()
})

test('type reflect (type I, type N)', function (t) {
	t.ok(almost(eval(`reflect(vec3(1, 1, 0), vec3(1, 0, 0));`), [-1, 1, 0]));
	t.ok(almost(eval(`reflect(vec2(1, 1), vec2(1, 0));`), [-1, 1]));
	t.ok(almost(eval(`reflect(vec4(1, 1, 0, 0), vec4(0, 1, 0, 0));`), [1, -1, 0, 0]));
	t.end()
})

test('type refract (type I, type N, float eta)', function (t) {
	t.ok(almost(eval(`refract(vec2(1, 1), vec2(-1, -1), 0);`), [1, 1]));
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
