/** Evaluate a GLSL snippet, returning its last expression without hiding errors. */
import GLSL from '../../index.js'

export default function evaluate(source, options = {}, data) {
	const compiler = GLSL(options).compiler
	const tree = compiler.parse(source)
	const last = tree.children.at(-1)
	if (last?.type === 'stmt' && last.children[0]?.type === 'expr') {
		last.children = [{ type: 'return', children: last.children, parent: last }]
	}
	const code = compiler.compile(tree)
	if (options.debug) console.log(code)
	return new Function('_', code)(data)
}
