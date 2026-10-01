import test from 'tape'
import GLSL from '../index.js'

function sample(type, expression, sampler, optimize = true, resultType = 'vec4') {
	const js = GLSL({version: '300 es', optimize, uniform: () => 'sampler'})(`uniform ${type} image; ${resultType} result=${expression};`)
	const result = new Function('sampler', js + '\nreturn result;')(sampler)
	return typeof result === 'object' ? Array.from(result) : result
}
const pixels = {width: 2, height: 2, data: [1,2,3,4, 5,6,7,8, 9,10,11,12, 13,14,15,16]}
for (const optimize of [true, false]) test(`WebGL 2 textures (${optimize})`, t => {
	for (const [expression, expected] of [
		['texture(image,vec2(.75,.75))', [13,14,15,16]],
		['textureProj(image,vec3(1.5,1.5,2.))', [13,14,15,16]],
		['textureOffset(image,vec2(.25),ivec2(1,0))', [5,6,7,8]],
		['textureProjOffset(image,vec3(.5,.5,2.),ivec2(0,1))', [9,10,11,12]],
		['textureLod(image,vec2(.75),0.)', [13,14,15,16]],
		['textureLodOffset(image,vec2(.25),0.,ivec2(1))', [13,14,15,16]],
		['textureProjLod(image,vec3(1.5,1.5,2.),0.)', [13,14,15,16]],
		['textureProjLodOffset(image,vec3(.5,.5,2.),0.,ivec2(1))', [13,14,15,16]],
		['textureGrad(image,vec2(.75),vec2(0.),vec2(0.))', [13,14,15,16]],
		['textureGradOffset(image,vec2(.25),vec2(0.),vec2(0.),ivec2(1))', [13,14,15,16]],
		['textureProjGrad(image,vec3(1.5,1.5,2.),vec2(0.),vec2(0.))', [13,14,15,16]],
		['textureProjGradOffset(image,vec3(.5,.5,2.),vec2(0.),vec2(0.),ivec2(1))', [13,14,15,16]],
		['texelFetch(image,ivec2(1,0),0)', [5,6,7,8]],
		['texelFetchOffset(image,ivec2(0),0,ivec2(1))', [13,14,15,16]]
	]) t.deepEqual(sample('sampler2D', expression, pixels, optimize), expected, expression)
	t.deepEqual(sample('sampler2D', 'textureSize(image,0)', pixels, optimize, 'ivec2'), [2,2])
	const mip = {levels: [pixels, {width: 1,height: 1,data: [21,22,23,24]}]}
	t.deepEqual(sample('sampler2D', 'textureLod(image,vec2(.5),1.)', mip, optimize), [21,22,23,24])
	t.deepEqual(sample('sampler2D', 'textureSize(image,1)', mip, optimize, 'ivec2'), [1,1])
	t.throws(() => sample('sampler2D', 'textureLod(image,vec2(.5),1.)', pixels, optimize), /mip level 1/)
	t.deepEqual(sample('isampler2D', 'texelFetch(image,ivec2(0),0)', {width:1,height:1,data:[-2147483648,-1,0,2147483647]}, optimize, 'ivec4'), [-2147483648,-1,0,2147483647])
	t.deepEqual(sample('usampler2D', 'texture(image,vec2(.5))', {width:1,height:1,data:[4294967295,16777217,0,1]}, optimize, 'uvec4'), [4294967295,16777217,0,1])
	const volume = {width:1,height:1,depth:2,data:[1,2,3,4,5,6,7,8]}
	t.deepEqual(sample('sampler3D', 'texture(image,vec3(.5,.5,.75))', volume, optimize), [5,6,7,8])
	t.deepEqual(sample('sampler3D', 'textureSize(image,0)', volume, optimize, 'ivec3'), [1,1,2])
	t.deepEqual(sample('sampler2DArray', 'texture(image,vec3(.5,.5,1.))', volume, optimize), [5,6,7,8])
	t.deepEqual(sample('sampler2DArray', 'textureSize(image,0)', volume, optimize, 'ivec3'), [1,1,2])
	const depth = {width:1,height:1,channels:1,data:[.5]}
	t.equal(sample('sampler2DShadow', 'texture(image,vec3(.5,.5,.4))', depth, optimize, 'float'), 1)
	t.equal(sample('sampler2DShadow', 'texture(image,vec3(.5,.5,.6))', depth, optimize, 'float'), 0)
	const cube = {faces: Array.from({length:6},(_,i) => ({width:1,height:1,data:[i,0,0,1]}))}
	for (const [dir, face] of [['1,0,0',0],['-1,0,0',1],['0,1,0',2],['0,-1,0',3],['0,0,1',4],['0,0,-1',5]])
		t.deepEqual(sample('samplerCube', `texture(image,vec3(${dir}))`, cube, optimize), [face,0,0,1])
	t.deepEqual(sample('sampler2D', 'texture(image,vec2(.5))', {texture: p => [p[0],p[1],42,1]}, optimize), [.5,.5,42,1], 'host sampler override')
	t.end()
})

test('Fragment execution hooks', t => {
	t.throws(() => GLSL()('float x=dFdx(1.);'), /host derivative/)
	const js = GLSL({derivatives:{dFdx:'env.dx',dFdy:'env.dy',fwidth:'env.width'}})('vec2 result=vec2(dFdx(1.),dFdy(2.));')
	t.deepEqual(Array.from(new Function('env',js+'\nreturn result;')({dx: () => 3,dy: () => 4})), [3,4])
	const fragment = GLSL()('void main(){ discard; }')
	t.throws(() => new Function(fragment+'\nmain();')(), /Fragment discarded/)
	t.end()
})
