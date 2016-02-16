var compile = require('./');
var test = require('tst');

test.only('Basic', function () {
	var source = `
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
	`;
	compile(source);

	var result = `
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
	`;
});


test.skip('main function', function() {
	it('should throw an error without a main function', function() {
	throws('', /Parse error/);
	});

	it('should throw an error if main function returns incorrect type', function() {
	throws('int main() {}', /main function must return void/);
	});

	it('should throw an error if main function accepts arguments', function() {
	throws('void main(int a) {}', /No main function found/);
	});

	it('should throw an error if main function doesn\'t have a body', function() {
	throws('void main();', /No main function found/);
	});

	it('should generate asm.js boilerplate', function() {
	compare(glsl.compile('void main() {}'), BOILERPLATE);
	});
});


test.skip('primative variable declarations', function() {
	it('should default ints to 0', function() {
	checkMain('void main() { int test; }',      'function main() { var test = 0; }');
	checkMain('void main() { int test, foo; }', 'function main() { var test = 0, foo = 0; }');
	});

	it('should default floats to 0.0', function() {
	checkMain('void main() { float test; }',      'function main() { var test = (0.0); }');
	checkMain('void main() { float test, foo; }', 'function main() { var test = (0.0), foo = (0.0); }');
	});

	it('should default bools to 0 (false)', function() {
	checkMain('void main() { bool test; }',      'function main() { var test = 0; }');
	checkMain('void main() { bool test, foo; }', 'function main() { var test = 0, foo = 0; }');
	});
});


test.skip('primative variable initializers', function() {
	it('should allow valid int initializations', function() {
		checkMain('void main() { int test = 1; }',           'function main() { var test = 1; }');
		checkMain('void main() { int test = 55; }',          'function main() { var test = 55; }');
		checkMain('void main() { int test = 0x23; }',        'function main() { var test = 35; }');
		checkMain('void main() { int test = 023; }',         'function main() { var test = 19; }');
		checkMain('void main() { int test, foo = 2, bar; }', 'function main() { var test = 0, foo = 2, bar = 0; }');
	});

	it('should allow valid float initializations', function() {
		checkMain('void main() { float test = 1.0; }',           'function main() { var test = (1.0); }');
		checkMain('void main() { float test = .04; }',           'function main() { var test = 0.04; }');
		checkMain('void main() { float test = 0.50; }',          'function main() { var test = 0.5; }');
		checkMain('void main() { float test = 55.23; }',         'function main() { var test = 55.23; }');
		checkMain('void main() { float test = 5e3; }',           'function main() { var test = (5000.0); }');
		checkMain('void main() { float test = 5.5e3; }',         'function main() { var test = (5500.0); }');
		checkMain('void main() { float test = 5.5e-3; }',        'function main() { var test = 0.0055; }');
		checkMain('void main() { float test = .5e3; }',          'function main() { var test = (500.0); }');
		checkMain('void main() { float test, foo = 2.2, bar; }', 'function main() { var test = (0.0), foo = 2.2, bar = (0.0); }');
	});

	it('should allow valid bool initializations', function() {
		checkMain('void main() { bool test = true; }',           'function main() { var test = 1; }');
		checkMain('void main() { bool test = false; }',          'function main() { var test = 0; }');
		checkMain('void main() { bool test, foo = true, bar; }', 'function main() { var test = 0, foo = 1, bar = 0; }');
	});

	it('should throw on invalid int initializations', function() {
		throws('void main() { int test = 1.0; }',    /Left and right arguments are of differing types/);
		throws('void main() { int test = .04; }',    /Left and right arguments are of differing types/);
		throws('void main() { int test = 0.50; }',   /Left and right arguments are of differing types/);
		throws('void main() { int test = 55.23; }',  /Left and right arguments are of differing types/);
		throws('void main() { int test = 5e3; }',    /Left and right arguments are of differing types/);
		throws('void main() { int test = 5.5e3; }',  /Left and right arguments are of differing types/);
		throws('void main() { int test = 5.5e-3; }', /Left and right arguments are of differing types/);
		throws('void main() { int test = .5e3; }',   /Left and right arguments are of differing types/);
		throws('void main() { int test = true; }',   /Left and right arguments are of differing types/);
		throws('void main() { int test = false; }',  /Left and right arguments are of differing types/);
	});


	it('should throw on invalid float initializations', function() {
		throws('void main() { float test = 1; }',     /Left and right arguments are of differing types/);
		throws('void main() { float test = 55; }',    /Left and right arguments are of differing types/);
		throws('void main() { float test = 0x23; }',  /Left and right arguments are of differing types/);
		throws('void main() { float test = 023; }',   /Left and right arguments are of differing types/);
		throws('void main() { float test = true; }',  /Left and right arguments are of differing types/);
		throws('void main() { float test = false; }', /Left and right arguments are of differing types/);
	});

	it('should throw on invalid bool initializations', function() {
		throws('void main() { bool test = 1; }',      /Left and right arguments are of differing types/);
		throws('void main() { bool test = 55; }',     /Left and right arguments are of differing types/);
		throws('void main() { bool test = 0x23; }',   /Left and right arguments are of differing types/);
		throws('void main() { bool test = 023; }',    /Left and right arguments are of differing types/);
		throws('void main() { bool test = 1.0; }',    /Left and right arguments are of differing types/);
		throws('void main() { bool test = .04; }',    /Left and right arguments are of differing types/);
		throws('void main() { bool test = 0.50; }',   /Left and right arguments are of differing types/);
		throws('void main() { bool test = 55.23; }',  /Left and right arguments are of differing types/);
		throws('void main() { bool test = 5e3; }',    /Left and right arguments are of differing types/);
		throws('void main() { bool test = 5.5e3; }',  /Left and right arguments are of differing types/);
		throws('void main() { bool test = 5.5e-3; }', /Left and right arguments are of differing types/);
		throws('void main() { bool test = .5e3; }',   /Left and right arguments are of differing types/);
	});
});