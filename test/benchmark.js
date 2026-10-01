import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import GLSL from '../index.js'

const source = readFileSync(new URL('./fixture/source2.glsl', import.meta.url), 'utf8')
const iterations = Number(process.argv[2] || 100)
if (!Number.isInteger(iterations) || iterations < 1) throw new Error('Expected a positive iteration count')
for (const optimize of [true,false]) {
	const compile = GLSL({optimize})
	for (let i=0;i<10;i++) compile(source)
	const start = performance.now()
	for (let i=0;i<iterations;i++) compile(source)
	const elapsed = performance.now()-start
	console.log(`optimize=${optimize}: ${(elapsed/iterations).toFixed(2)} ms/shader (${iterations} compilations, ${Buffer.byteLength(compile(source))} output bytes)`)
}
