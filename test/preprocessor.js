import test from 'tape'
import {compile} from '../index.js'
import clean from 'cln'

test('Transform macro to commented', function (t) {
	t.equal(clean(compile(`
		#extension A
	`)), clean(`
		/* #extension A */
	`));
	t.end()
});

test('Object macros', function (t) {
	t.equal(clean(compile(`
		#define QUATRE FOUR
		#define FOUR 4
		int x = QUATRE;
		#undef FOUR
		int y = QUATRE;
		#define FOUR 16
		int z = QUATRE;
	`)), clean(`
		var x = 4;
		var y = FOUR;
		var z = 16;
	`));
	t.end()
});

test('Function macros', function (t) {
	t.equal(clean(compile(`
		#define lang_init()  c_init()
		int x = lang_init();
		int y = lang_init;
		#undef lang_init
		int z = lang_init();
	`)), clean(`
		var x = c_init();
		var y = lang_init;
		var z = lang_init();
	`));
	t.end()
});

test('Macro arguments', function (t) {
	t.equal(clean(compile(`
		#define min(X, Y)  ((X) < (Y) ? (X) : (Y))
		x = min(a, b);
		y = min(1, 2);
		z = min(a + 28, p);
		min (min (a, b), c);
	`)), clean(`
		x = ((a) < (b) ? (a) : (b));
		y = ((1) < (2) ? (1) : (2));
		z = ((a + 28) < (p) ? (a + 28) : (p));
		((((a) < (b) ? (a) : (b))) < (c) ? (((a) < (b) ? (a) : (b))) : (c));
	`));
	t.end()
});
