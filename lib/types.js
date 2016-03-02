/**
 * Env types.
 * If type is detected in the code, like `float[2](1, 2, 3)` or `vec3(vec2(), 1)`,
 * the according function will be called and type is stringified as the return
 */

exports.void = function () {
	return '';
}
exports.bool = function (value) {
	if (value == null) value = false;
	return !!value;
}
exports.int = function (value) {
	if (value == null) value = 0;
	return +value|0;
}
exports.uint = function (value) {
	if (value == null) value = 0;
	return +value|0;
}
exports.float = function (value) {
	if (value == null) value = 0;
	return +value;
}
exports.double = function (value) {
	return +value;
}
exports.ivec2 =
exports.bvec2 =
exports.dvec2 =
exports.vec2 =
function (x, y) {
	if (x == null) x = 0;
	if (y == null) y = x;
	return `[${x}, ${y}]`;
}
exports.ivec3 =
exports.bvec3 =
exports.dvec3 =
exports.vec3 =
function (x, y, z) {
	if (x == null) x = 0;
	if (y == null) y = x;
	if (z == null) z = y;
	return `[${x} ${y}, ${z}]`;
}
exports.ivec4 =
exports.bvec4 =
exports.dvec4 =
exports.vec4 =
function (x, y, z, w) {
	if (x == null) x = 0;
	if (y == null) y = x;
	if (z == null) z = y;
	if (w == null) w = z;
	return `[${x}, ${y}, ${z}, ${w}]`;
}