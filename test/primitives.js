var tokenize = require('glsl-tokenizer/string')
var parse = require('glsl-parser/direct')
var GLSL = require('../')
var compile = GLSL.compile
var TokenStream = require('glsl-tokenizer/stream')
var ParseStream = require('glsl-parser/stream')
var CompileStream = require('../stream')
var test = require('tape')
var StringStream = require('stream-array')
var Sink = require('stream').Writable
var eval = require('./util/eval')
var clean = require('cln')
var glsl = require('glslify')


var compile = GLSL({})



// recognise input array
test('float(1)', function (t) {
	t.equal(eval('+float(1);'), 1);
	t.end()
})

// converts an unsigned integer to a signed integer
test('int(uint)', function (t) {
	t.equal(eval('+int(1243);'), 1243);
	t.end()
})

// converts a Boolean value to an int
test('int(bool)', function (t) {
	t.equal(eval('+int(true);'), 1);
	t.equal(eval('+int(false);'), 0);
	t.end()
})

// converts a float value to an int
test('int(float)', function (t) {
	t.equal(eval('+int(123.4);'), 123);
	t.end()
})

// converts a double value to a signed integer
test('int(double)', function (t) {
	t.equal(eval('+int(10e5);'), 10e5);
	t.end()
})

// converts a signed integer value to an unsigned integer
test('uint(int)', function (t) {
	t.equal(eval('+uint(123);'), 123);
	t.end()
})

// converts a Boolean value to an unsigned integer
test('uint(bool)', function (t) {
	t.equal(eval('+uint(true);'), 1);
	t.end()
})

// converts a float value to an unsigned integer
test('uint(float)', function (t) {
	t.equal(eval('+uint(123.4);'), 123);
	t.end()
})

// converts a double value to an unsigned integer
test('uint(double)', function (t) {
	t.equal(eval('+int(123.4e3);'), 123400);
	t.end()
})

// converts a signed integer value to a Boolean
test('bool(int)', function (t) {
	t.equal(!!eval('+bool(123);'), true);
	t.equal(!!eval('+bool(0);'), false);
	t.equal(eval('bool x = true; x;'), true);
	t.equal(eval('bool x = false; x;'), false);
	t.equal(eval('bool x = bool(true); x;'), true);
	t.equal(eval('bool x = bool(false); x;'), false);
	t.end()
})

// converts an unsigned integer value to a Boolean value
test('bool(uint)', function (t) {
	t.equal(!!eval('+bool(123);'), true);
	t.end()
})

// converts a float value to a Boolean
test('bool(float)', function (t) {
	t.equal(!!eval('+bool(123.4);'), true);
	t.end()
})

// converts a double value to a Boolean
test('bool(double)', function (t) {
	t.equal(!!eval('+bool(123.4e100);'), true);
	t.end()
});
var test= require('tape')

// converts a signed integer value to a float
test('float(int)', function (t) {
	t.equal(eval('+float(123);'), 123);
	t.end()
})

// converts an unsigned integer value to a float value
test('float(uint)', function (t) {
	t.equal(eval('+float(34);'), 34);
	t.end()
})

// converts a Boolean value to a float
test('float(bool)', function (t) {
	t.equal(eval('+float(true);', {debug: false}), 1);
	t.equal(eval('+float(false);'), 0);
	t.end()
})

// converts a double value to a float
test('float(double)', function (t) {
	t.equal(eval('+float(double(10e15));'), 10e15);
	t.end()
})

// converts a signed integer value to a double
test('double(int)', function (t) {
	t.equal(eval('+double(34);'), 34);
	t.end()
})

// converts an unsigned integer value to a double
test('double(uint)', function (t) {
	t.equal(eval('+double(uint(34));'), 34);
	t.end()
})

// converts a Boolean value to a double
test('double(bool)', function (t) {
	t.equal(eval('+double(true);'), 1);
	t.equal(eval('+double(false);'), 0);
	t.end()
})

// converts a float value to a double
test('double(float)', function (t) {
	t.equal(eval('+double(34.45);'), 34.45);
	t.end()
})


test('should allow valid int initializations', function(t) {
	t.equal(
		clean(compile('void main() { int test = 1; }')),
		clean('function main () {\nvar test = 1;\n};'));
	t.equal(
		clean(compile('void main() { int test = 55; }')),
		clean('function main () {\nvar test = 55;\n};'));
	t.equal(
		clean(compile('void main() { int test = 0x23; }')),
		clean('function main () {\nvar test = 35;\n};'));
	t.equal(
		clean(compile('void main() { int test = 023; }')),
		clean('function main () {\nvar test = 19;\n};'));
	t.equal(
		clean(compile('void main() { int test, foo = 2, bar; }')),
		clean('function main () {\nvar test = 0, foo = 2, bar = 0;\n};'));
	t.end()
})

test('should allow valid float initializations', function(t) {
	t.equal(
		clean(compile('void main() { float test = 1.0; }')),
		clean('function main () {\nvar test = 1.0;\n};'));
	t.equal(
		clean(compile('void main() { float test = .04; }')),
		clean('function main () {\nvar test = .04;\n};'));
	t.equal(
		clean(compile('void main() { float test = 0.50; }')),
		clean('function main () {\nvar test = 0.50;\n};'));
	t.equal(
		clean(compile('void main() { float test = 55.23; }')),
		clean('function main () {\nvar test = 55.23;\n};'));
	t.equal(
		clean(compile('void main() { float test = 5e3; }')),
		clean('function main () {\nvar test = 5e3;\n};'));
	t.equal(
		clean(compile('void main() { float test = 5.5e3; }')),
		clean('function main () {\nvar test = 5.5e3;\n};'));
	t.equal(
		clean(compile('void main() { float test = 5.5e-3; }')),
		clean('function main () {\nvar test = 5.5e-3;\n};'));
	t.equal(
		clean(compile('void main() { float test = .5e3; }')),
		clean('function main () {\nvar test = .5e3;\n};'));
	t.equal(
		clean(compile('void main() { float test, foo = 2.2, bar; }')),
		clean('function main () {\nvar test = 0, foo = 2.2, bar = 0;\n};'));
	t.end()
})

test('should allow valid bool initializations', function(t) {
	t.equal(
		clean(compile('void main() { bool test = true; }')),
		clean('function main () {\nvar test = true;\n};'));
	t.equal(
		clean(compile('void main() { bool test = false; }')),
		clean('function main () {\nvar test = false;\n};'));
	t.equal(
		clean(compile('void main() { bool test, foo = true, bar; }')),
		clean('function main () {\nvar test = false, foo = true, bar = false;\n};'));
	t.end()
})

test.skip('should throw on invalid int initializations', function(t) {
	t.throws('void main() { int test = 1.0; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { int test = .04; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { int test = 0.50; }',   /Left and right arguments are of differing types/);
	t.throws('void main() { int test = 55.23; }',  /Left and right arguments are of differing types/);
	t.throws('void main() { int test = 5e3; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { int test = 5.5e3; }',  /Left and right arguments are of differing types/);
	t.throws('void main() { int test = 5.5e-3; }', /Left and right arguments are of differing types/);
	t.throws('void main() { int test = .5e3; }',   /Left and right arguments are of differing types/);
	t.throws('void main() { int test = true; }',   /Left and right arguments are of differing types/);
	t.throws('void main() { int test = false; }',  /Left and right arguments are of differing types/);
	t.end()
})


test.skip('should throw on invalid float initializations', function(t) {
	t.throws('void main() { float test = 1; }',     /Left and right arguments are of differing types/);
	t.throws('void main() { float test = 55; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { float test = 0x23; }',  /Left and right arguments are of differing types/);
	t.throws('void main() { float test = 023; }',   /Left and right arguments are of differing types/);
	t.throws('void main() { float test = true; }',  /Left and right arguments are of differing types/);
	t.throws('void main() { float test = false; }', /Left and right arguments are of differing types/);
	t.end()
})

test.skip('should throw on invalid bool initializations', function(t) {
	t.throws('void main() { bool test = 1; }',      /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 55; }',     /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 0x23; }',   /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 023; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 1.0; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = .04; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 0.50; }',   /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 55.23; }',  /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 5e3; }',    /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 5.5e3; }',  /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = 5.5e-3; }', /Left and right arguments are of differing types/);
	t.throws('void main() { bool test = .5e3; }',   /Left and right arguments are of differing types/);
	t.end()
})



test('should default ints to 0', function(t) {
	t.equal(
		clean(compile('void main() { int test; }')),
		clean('function main () {\nvar test = 0;\n};'));
	t.equal(
		clean(compile('void main() { int test, foo; }')),
		clean('function main () {\nvar test = 0, foo = 0;\n};'));
	t.end()
})

test('should default floats to 0.0', function(t) {
	t.equal(
		clean(compile('void main() { float test; }')),
		clean('function main () {\nvar test = 0;\n};'));
	t.equal(
		clean(compile('void main() { float test, foo; }')),
	clean('function main () {\nvar test = 0, foo = 0;\n};'));
	t.end()
})

test('should default bools to 0 (false)', function(t) {
	t.equal(
		clean(compile('void main() { bool test; }')),
		clean('function main () {\nvar test = false;\n};'));
	t.equal(
		clean(compile('void main() { bool test, foo; }')),
	clean('function main () {\nvar test = false, foo = false;\n};'));
	t.end()
})

