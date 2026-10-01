// Exercise the normal suite and fail if any supported AST transform is untested.
// Runtime helpers are emitted into generated functions; ordinary source coverage
// alone cannot measure their execution. Numerical tests cover those separately.
import GLSL from '../index.js'

const transforms = GLSL().compiler.transforms
const hits = new Map()
for (const [name, transform] of Object.entries(transforms)) {
	hits.set(name, 0)
	transforms[name] = function (...args) {
		hits.set(name, hits.get(name) + 1)
		return transform.apply(this, args)
	}
}
process.on('exit', () => {
	const missing = [...hits].filter(([,count]) => !count).map(([name]) => name)
	console.log(`# AST transforms exercised: ${hits.size - missing.length}/${hits.size}`)
	if (missing.length) {
		console.error(`Untested transforms: ${missing.join(', ')}`)
		process.exitCode = 1
	}
})
await import('./index.js')
