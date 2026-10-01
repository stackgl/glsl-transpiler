import test from 'tape'
import GLSL from '../index.js'

const plain = value => ArrayBuffer.isView(value) || Array.isArray(value) ? Array.from(value, plain) : value
function run(source, options = {}, env) {
	const compile = GLSL({ version: '300 es', ...options })
	const js = compile(source)
	return plain(new Function('env', js + '\nreturn result;')(env))
}

for (const optimize of [true, false]) {
	const check = (t, source, expected, label) => t.deepEqual(run(source, { optimize }), expected, `${label} (optimize: ${optimize})`)
	test(`WebGL 2 integer semantics (${optimize})`, t => {
		for (const [expression, expected] of [
			['uint(-1)', 4294967295], ['0xffffffffu', 4294967295], ['0x80000000U >> 1', 1073741824],
			['0xffffffffu + 1u', 0], ['0u - 1u', 4294967295], ['0xffffffffu * 0xffffffffu', 1],
			['~0u', 4294967295], ['7 / 2', 3], ['-7 / 2', -3], ['7 % 3', 1],
			['true ^^ false', true], ['true ^^ true', false], ['1u < 2u', true],
			['uvec3(4294967295u, 16777217u, 2147483648u)', [4294967295, 16777217, 2147483648]],
			['uvec2(0xffffffffu) >> 1', [2147483647, 2147483647]],
			['uvec2(0xffffffffu) + uvec2(1u)', [0, 0]],
			['ivec2(-7, 7) / 2', [-3, 3]],
			['uvec2(0x80000000u, 0xffffffffu).yx', [4294967295, 2147483648]],
			['uvec2(1u) == uvec2(1u)', true], ['vec2(1.) != vec2(2.)', true]
		]) check(t, `${Array.isArray(expected) ? expression.startsWith('ivec') ? 'ivec2' : 'uvec' + expected.length : typeof expected === 'boolean' ? 'bool' : expected < 0 ? 'int' : 'uint'} result = ${expression};`, expected, expression)
		check(t, 'uint n = 0xffffffffu; n += 1u; uint result = n;', 0, 'compound overflow')
		check(t, 'uint n = 0xffffffffu; n++; uint result = n;', 0, 'increment overflow')
		t.end()
	})

	test(`WebGL 2 matrix shapes (${optimize})`, t => {
		for (let cols = 2; cols <= 4; cols++) for (let rows = 2; rows <= 4; rows++) {
			const type = `mat${cols}x${rows}`, data = Array.from({ length: cols * rows }, (_, i) => i + 1)
			check(t, `${type} result = ${type}(${data.join(',')});`, data, type + ' constructor')
			check(t, `${type} m = ${type}(${data.join(',')}); float result = m[${cols - 1}][${rows - 1}];`, data.length, type + ' element')
			check(t, `${type} m = ${type}(${data.join(',')}); int c = ${cols - 1}; int r = ${rows - 1}; float result = m[c][r];`, data.length, type + ' dynamic element')
			check(t, `${type} m; int result = m.length();`, cols, type + ' length')
			const sums = Array.from({ length: rows }, (_, row) => data.filter((_, i) => i % rows === row).reduce((a,b) => a+b))
			check(t, `${type} m = ${type}(${data.join(',')}); vec${rows} result = m * vec${cols}(1.);`, sums, type + ' times vector')
			const colSums = Array.from({ length: cols }, (_, col) => data.slice(col * rows, (col + 1) * rows).reduce((a,b) => a+b))
			check(t, `${type} m = ${type}(${data.join(',')}); vec${cols} result = vec${rows}(1.) * m;`, colSums, 'vector times ' + type)
			check(t, `${type} m = ${type}(${data.join(',')}); mat${rows}x${cols} result = transpose(m);`, Array.from({ length: data.length }, (_, i) => data[(i % cols) * rows + Math.floor(i / cols)]), type + ' transpose')
		}
		check(t, 'mat2x3 a = mat2x3(1,2,3,4,5,6); mat4x2 b = mat4x2(1,2,3,4,5,6,7,8); mat4x3 result = a * b;', [9,12,15,19,26,33,29,40,51,39,54,69], 'rectangular product')
		check(t, 'mat2x3 result = mat2x3(mat4x2(1,2,3,4,5,6,7,8));', [1,2,0,3,4,0], 'matrix conversion')
		check(t, 'mat3x2 result = outerProduct(vec2(2,3), vec3(4,5,6));', [8,12,10,15,12,18], 'outerProduct column order')
		t.end()
	})

	test(`WebGL 2 built-ins (${optimize})`, t => {
		for (const [expression, type, expected] of [
			['roundEven(vec4(2.5, 3.5, -2.5, -3.5))', 'vec4', [2,4,-2,-4]],
			['trunc(vec2(-1.7, 1.7))', 'vec2', [-1,1]], ['round(vec2(1.2,1.8))', 'vec2', [1,2]],
			['sinh(0.) + tanh(0.) + asinh(0.) + acosh(1.) + atanh(0.) + cosh(0.)', 'float', 1],
			['isnan(vec2(0./0., 1.))', 'bvec2', [true,false]], ['isinf(vec3(1./0., -1./0., 0.))', 'bvec3', [true,true,false]],
			['floatBitsToUint(vec2(1., -0.))', 'uvec2', [1065353216,2147483648]],
			['floatBitsToInt(-1.)', 'int', -1082130432], ['uintBitsToFloat(1065353216u)', 'float', 1],
			['intBitsToFloat(-1082130432)', 'float', -1], ['packUnorm2x16(vec2(0.,1.))', 'uint', 4294901760],
			['unpackUnorm2x16(0xffffffffu)', 'vec2', [1,1]], ['unpackSnorm2x16(packSnorm2x16(vec2(-1.,1.)))', 'vec2', [-1,1]],
			['packHalf2x16(vec2(1.,-2.))', 'uint', 3221240832], ['unpackHalf2x16(0xc0003c00u)', 'vec2', [1,-2]],
			['mix(vec2(0./0., 2.), vec2(3., 0./0.), bvec2(true, false))', 'vec2', [3,2]]
		]) check(t, `${type} result = ${expression};`, expected, expression)
		check(t, 'float whole; float fraction = modf(-3.25, whole); vec2 result = vec2(whole, fraction);', [-3,-0.25], 'modf output parameter')
		t.end()
	})

	test(`WebGL 2 statements and arrays (${optimize})`, t => {
		check(t, 'int result = 0; int n = 2; switch(n) { case 1: result=10; break; case 2: result=20; case 3: result+=3; break; default: result=99; }', 23, 'switch fallthrough')
		check(t, 'int result=0; for(int i=0;i<5;i++){ if(i==1) continue; result+=i; if(i==3) break; }', 5, 'loop jumps')
		check(t, 'const int N=2; float a[N+1]; int result=a.length();', 3, 'constant array length')
		check(t, 'float a[] = float[](1.,2.,3.); float result=a[2];', 3, 'inferred array length')
		check(t, 'mat2x3 a[2]; a[1][0] = vec3(4,5,6); vec3 result = a[1][0];', [4,5,6], 'array of matrix column assignment')
		check(t, 'vec4 a[2]; a[1].zy = vec2(3,4); vec4 result=a[1];', [0,4,3,0], 'array element swizzle assignment')
		check(t, 'vec2 a=vec2(1,2); vec2 b=a; b.x=9.; vec2 result=a;', [1,2], 'vector declaration copies value')
		check(t, 'int n=0; float next(){n++; return float(n);} vec3 a=vec3(next()); vec4 result=vec4(a,float(n));', [1,1,1,1], 'constructor evaluates once')
		check(t, 'int n=0; vec2 a[2]; a[n++].yx=vec2(2,3); vec3 result=vec3(a[0],float(n));', [3,2,1], 'lvalue evaluates once')
		check(t, 'float result=1.; { vec2 result=vec2(2.); result.x=3.; }', 1, 'block scope')
		t.end()
	})
}

for (const optimize of [true, false]) test(`Transform regressions (${optimize})`, t => {
	const cases = [
		['mat2 m; m[0][1]=7.; vec2 result=m[0];', [1,7]],
		['mat2x3 m; m[1][2]=7.; float result=m[1][2];', 7],
		['vec2 a=vec2(1,2); a=a.yx; vec2 result=a;', [2,1]],
		['vec2 a=vec2(1,2); a.yx=a.xy; vec2 result=a;', [2,1]],
		['uint x=0u; uint y=x--; uvec2 result=uvec2(x,y);', [4294967295,0]],
		['int x=2147483647; int y=++x; ivec2 result=ivec2(x,y);', [-2147483648,-2147483648]],
		['int n=0; float f(){n++;return 2.;} float x=f()*0.; int result=n;', 1],
		['int n=0; float f(){n++;return 2.;} vec2 x=vec2(f(),f()); vec3 result=vec3(x,float(n));', [2,2,2]],
		['void f(out vec2 x){x=vec2(3,4);} vec4 v=vec4(1); f(v.yx); vec4 result=v;', [4,3,1,1]],
		['void f(out float x){x=7.;} float a[2]; int i=0; f(a[i++]); vec3 result=vec3(a[0],a[1],float(i));', [7,0,1]],
		['float a[2]=float[2](1.,2.); void f(float b[2]){b[0]=9.;} f(a); float result=a[0];', 1],
		['struct S { vec2 x; }; S a=S(vec2(1)); S b=a; b.x.y=9.; float result=a.x.y;', 1],
		['struct S { float x; }; S a=S(1.); void f(S b){b.x=9.;} f(a); float result=a.x;', 1],
		['vec2 a=vec2(1); vec2 f(){return a;} vec2 b=f(); b.x=9.; float result=a.x;', 1],
		['int f(int n){if(n==1)return 2; return 3;} int result=f(1);', 2]
	]
	for (const [source, expected] of cases) t.deepEqual(run(source, {optimize}), expected, source)
	t.throws(() => run('vec2 x; x.xx=vec2(1); vec2 result=x;', {optimize}), /repeat a component/)
	t.end()
})

test('Generated temporaries cannot shadow shader variables', t => {
	for (const optimize of [true,false]) for (const [source, expected] of [
		['vec2 a; float o=3.; a.xy=vec2(o); vec2 result=a;', [3,3]],
		['int i=7; int a[2]; a[1]=i; int result=a[1];', 7],
		['uint v=4294967295u; v++; uint result=v;', 0],
		['void f(out float x,out float y){x=3.;y=4.;} float a[2]; float b[2]; f(a[0],b[1]); vec2 result=vec2(a[0],b[1]);', [3,4]],
		['float constructor=2., toString=3.; float result=constructor+toString;', 5],
		['struct S { float x; }; S a=S(1.),b=S(1.); bool result=a==b;', true],
		['float a[2]=float[2](1.,2.),b[2]=float[2](1.,2.); bool result=a==b;', true]
	]) t.deepEqual(run(source,{optimize}),expected,source)
	t.end()
})

test('Boolean vector values and texture-coordinate swizzles', t => {
	for (const optimize of [true,false]) {
		t.deepEqual(run('vec4 result=vec4(1,2,3,4).qpts;', {optimize}), [4,3,2,1])
		t.deepEqual(run('vec4 result=vec4(1,2,3,4); result.qt=vec2(8,7);', {optimize}), [1,7,3,8])
		t.deepEqual(run('bvec3 result=bvec3(0,2,-1).zyx;', {optimize}), [true,true,false])
		t.equal(run('bool result=bvec2(true)==lessThan(vec2(0.),vec2(1.));', {optimize}), true)
	}
	t.end()
})

test('Scalar constructors preserve expression precedence and identifiers', t => {
	for (const optimize of [true,false]) for (const [source,expected] of [
		['float a1=3.5; vec2 result=vec2(a1);',[3.5,3.5]],
		['float a1=3.5; int result=int(a1);',3],
		['float a1=3.5; bool result=bool(a1);',true],
		['bool yes=true; bool result=bool(yes ? 2 : 0);',true],
		['bool yes=false; int result=int(yes ? 2.9 : 3.9);',3],
		['bool yes=true; float result=float(yes ? false : true);',0]
	]) t.deepEqual(run(source,{optimize}),expected,source)
	t.end()
})

test('Integer literal bit patterns', t => {
	for (const optimize of [true,false]) {
		t.equal(run('int result=0xffffffff;', {optimize}), -1)
		t.equal(run('int result=0x80000000;', {optimize}), -2147483648)
		t.equal(run('int result=4294967295;', {optimize}), -1)
		t.equal(run('uint result=0xffffffffu;', {optimize}), 4294967295)
		t.equal(run('bool result=0xffffffff<0;', {optimize}), true)
	}
	t.throws(() => run('uint result=0xfffffffffu;'), /32 bits/)
	t.throws(() => run('int result=09;'), /octal/)
	t.end()
})
