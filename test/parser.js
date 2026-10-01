import test from 'tape'
import GLSL from '../index.js'
import parse from '../lib/parse.js'
import subscript from 'subscript'
import compileStream from '../stream.js'
import { Readable } from 'node:stream'

const evaluate = (source, options) => new Function(GLSL(options)(source) + '\nreturn result;')()

test('Subscript grammar and isolation', t => {
	for (const [source, expected] of [
		['float result = .5 + 2. * 3.;', 6.5], ['int result = 1 << 2 + 1;', 8],
		['bool result = false || true && false;', false], ['bool result = true ^^ true || true;', true],
		['int a=0,b=0; a=b=3; int result=a+b;', 6],
		['int result=0; if(true) if(false) result=1; else result=2;', 2],
		['int result=0; do { result++; } while(result<3);', 3],
		['int result=0; for(;;) { result=3; break; }', 3],
		['/* #notADirective */ float result=1.; // trailing comment', 1],
		['float result = 1.25e+2F + 0.5f;', 125.5],
		['#version 300 es\n#if __VERSION__ == 300 && GL_ES\nint result=3;\n#else\nint result=1;\n#endif', 3]
	]) t.equal(evaluate(source), expected, source)
	const dialect = subscript('a + b * 2')
	t.equal(dialect({a: 1, b: 2}), 5)
	GLSL()('float result=2.;')
	t.equal(subscript('a + b * 2')({a: 1, b: 2}), 5, 'GLSL leaves other dialects intact')
	for (const source of ['float x = ;', 'void f( {', 'float x = (2.;', '/* unfinished', 'float x = 2.3abc;', 'float x = 1; @', 'float x; {', 'x[1;', 'x +;', 'float x = ;']) {
		t.throws(() => parse(source), SyntaxError, source)
		t.ok(parse('float x;'), 'parser recovers after failure')
	}
	t.throws(() => parse(1), TypeError)
	t.throws(() => GLSL().compiler.process({ type: 'unimplemented', children: [] }), /Unsupported GLSL node/)
	t.end()
})

test('Shader metadata and uniform blocks', t => {
	const compile = GLSL({ in: name => `env.${name}`, uniform: name => `env.${name}` })
	const source = `#version 300 es
	precision highp float;
	layout(location=2) in vec3 position;
	flat out uint objectId;
	layout(location=0) out vec4 color;
	layout(std140) uniform Camera { mat4 transform; vec3 eye; } camera;
	void main() { objectId=uint(gl_InstanceID); gl_Position=camera.transform*vec4(position,1.); color=vec4(camera.eye,1.); }
	`
	const js = compile(source)
	t.deepEqual(Object.keys(compile.compiler.inputs), ['position'])
	t.deepEqual(Object.keys(compile.compiler.outputs), ['objectId', 'color'])
	t.equal(compile.compiler.inputs.position.layout.location, '2')
	t.ok(compile.compiler.outputs.objectId.qualifiers.includes('flat'))
	t.equal(compile.compiler.uniformBlocks.Camera.instance, 'camera')
	t.equal(compile.compiler.uniformBlocks.Camera.layout.std140, true)
	const identity = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
	const result = new Function('env', 'gl_InstanceID', 'gl_Position', js + '\nmain(); return [Array.from(gl_Position), Array.from(color), objectId];')({position: [2,3,4], camera: { transform: new Float32Array(identity), eye: [1,2,3] }}, 7)
	t.deepEqual(result, [[2,3,4,1], [1,2,3,1], 7])
	t.equal(evaluate('layout(std140) uniform Settings { float gain; }; float result=gain;', {uniform: () => '3'}), 3, 'anonymous uniform block')
	t.equal(evaluate('struct Data { float x; float a[2]; }; Data d; d.x=3.; d.a[1]=4.; float result=d.x+d.a[1];'), 7, 'struct fields and arrays')
	t.end()
})

test('Compiler reuse and function signatures', t => {
	const compile = GLSL()
	const source = 'vec2 f(float x); vec2 result=f(2.); vec2 f(float x){ return vec2(x); }'
	t.equal(compile(source), compile(source), 'compiles are independent')
	t.deepEqual(Array.from(evaluate(source)), [2,2], 'forward declaration and call')
	compile('uniform vec2 old; vec2 result=sin(old);')
	t.equal(compile('float result=1.;').trim(), 'var result = 1.;', 'helpers do not leak')
	t.deepEqual(Object.keys(compile.compiler.uniforms), [], 'metadata does not leak')
	compile('struct S { float x; }; S s;')
	t.throws(() => compile('S s;'), SyntaxError, 'types do not leak')
	t.throws(() => GLSL()('S s;'), SyntaxError, 'types do not cross compiler instances')
	t.equal(evaluate('float f(float x); float f(int x); float f(float x){return 1.;} float f(int x){return 2.;} float result=f(1);'), 2)
	t.equal(evaluate('float result; for(int i=0;i<2;i++) { result=float(i); } float i=4.; result+=i;'), 5, 'loop scopes')
	t.end()
})

test('Source streams handle arbitrary chunk boundaries', t => {
	const source = '#version 300 es\n/* split — नमस्ते */\nfloat result=sin(0.);'
	let output = ''
	const stream = compileStream()
	stream.on('data', data => output += data)
	stream.on('error', t.end)
	stream.on('end', () => {
		t.equal(output, GLSL()(source))
		t.equal(stream.source, output)
		t.equal(stream.tree.type, 'stmtlist')
		t.end()
	})
	Readable.from(Array.from(Buffer.from(source), byte => Buffer.from([byte]))).pipe(stream)
})

test('Source streams report syntax errors', t => {
	const stream = compileStream()
	stream.on('error', error => { t.ok(error instanceof SyntaxError); t.end() })
	stream.resume()
	stream.end('float result = ;')
})

test('Declaration conditions and default uniform layout', t => {
	for (const optimize of [true,false]) {
		t.equal(evaluate('int n=0; bool next(){n++;return n<3;} int result=0; while(bool active=next()){if(active)result++;}', {optimize}), 2)
		t.equal(evaluate('int n=0; bool next(){n++;return n<3;} int result=0; for(;bool active=next();){if(active)result++;}', {optimize}), 2)
	}
	const compile=GLSL()
	compile('layout(std140) uniform; uniform A { float x; } a;')
	t.equal(compile.compiler.uniformBlocks.A.layout.std140,true)
	t.throws(() => parse('uint x=1.0u;'), /Invalid unsigned integer/)
	t.end()
})

test('Comments separate tokens and array constructors permit whitespace', t => {
	t.equal(evaluate('float/* type */result/* name */=3.;'), 3)
	t.equal(evaluate('float a[2]=float [2](1.,2.); float result=a[1];'), 2)
	t.equal(evaluate('#define ADD(x) ((x) + \\\n  2)\nfloat result=ADD(3.);'), 5)
	t.end()
})

test('WebGL built-in inputs retain their types', t => {
	const js=GLSL({version:'300 es'})('int result=gl_MaxDrawBuffers/2 + gl_VertexID + gl_InstanceID;')
	t.equal(new Function('gl_MaxDrawBuffers','gl_VertexID','gl_InstanceID',js+'\nreturn result;')(7,1,2),6)
	const depth=GLSL()('float result=gl_DepthRange.far-gl_DepthRange.near;')
	t.equal(new Function('gl_DepthRange',depth+'\nreturn result;')({near:.25,far:.75,diff:.5}),.5)
	t.end()
})

test('Single-statement branches have local declaration scopes', t => {
	t.equal(evaluate('float result=1.; if(true) float result=2.;'), 1)
	t.equal(evaluate('float result=1.; if(false) float result=2.; else float result=3.;'), 1)
	t.equal(evaluate('float result=1.; do float result=2.; while(false);'), 1)
	t.end()
})
