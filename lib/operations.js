/**
 * List of functions for operations on vectors
 */

var types = require('./types');
var operators = require('./operators');
var primitives = require('./primitives');


//form exports
// for (var typeA in types) {
// 	for (typeB in types) {
// 		for (var operator in operators) {
// 			var name = `${typeA}_${operator}_${typeB}`;
// 			if (exports[name]) continue;

// 			var body = '';

// 			if

// 			exports[name] = new Function('a', 'b', body);
// 		}
// 	}
// }
// exports.primitive_operator_vecN = function (out, b, c) {
// 	out[0] = b[0] ${operator} c;
// 	out[1] = b[1] ${operator} c;
// 	out[2] = b[2] ${operator} c;
// 	out[3] = b[3] ${operator} c;
// 	return a;
// };
// exports.vecN_mult_ = function (out, b, c) {
// 	out[0] = b[0] ${operator} c[0];
// 	out[1] = b[1] ${operator} c[1];
// 	out[2] = b[2] ${operator} c[2];
// 	out[3] = b[3] ${operator} c[3];
// 	return a;
// };