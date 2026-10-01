/** GLSL grammar on Subscript's Pratt parser. No token stream is needed. */
import subscript, { lookup, token, expr, skip, cur, idx } from 'subscript/parse.js'
import types from './types.js'
import builtins from './builtins.js'

const qualifiers = new Set('const attribute uniform varying in out inout centroid flat smooth invariant lowp mediump highp'.split(' '))
const storage = new Set('attribute uniform varying in out inout'.split(' '))
const grammar = []
let names, anonymous, defaultLayout

function node(type, data = '', children = []) {
	const result = { type, data, token: { data }, children }
	for (const child of children) if (child) child.parent = result
	return result
}

function error(message = 'Unexpected token') {
	const lines = cur.slice(1, idx).split('\n')
	throw new SyntaxError(`${message} at ${lines.length}:${lines.at(-1).length + 1}`)
}

function space() {
	while (idx < cur.length) {
		if (/\s/.test(cur[idx])) { skip(); continue }
		if (cur.startsWith('//', idx)) {
			while (idx < cur.length && cur[idx] !== '\n') skip()
			continue
		}
		if (cur.startsWith('/*', idx)) {
			const end = cur.indexOf('*/', idx + 2)
			if (end < 0) error('Unclosed comment')
			skip(end + 2 - idx)
			continue
		}
		break
	}
	return cur.charCodeAt(idx)
}

function peek(value) { space(); return cur.startsWith(value, idx) }
function take(value) { if (peek(value)) { skip(value.length); return true } return false }
function expect(value) { if (!take(value)) error(`Expected '${value}'`) }
function word() { space(); return /^[A-Za-z_]\w*/.exec(cur.slice(idx))?.[0] }
function read() { const value = word(); if (!value) error('Expected identifier'); skip(value.length); return value }
function required(prec = 0) { return expr(prec) || error('Expected expression') }
function expression(prec = 0) { return node('expr', '', [required(prec)]) }
function parens(condition = false) { expect('('); const value = condition && isDeclaration() ? declaration() : expression(); expect(')'); return value }

function atom() {
	const number = /^(?:0[xX][\da-fA-F]+[uU]?|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[uUfF]?)/.exec(cur.slice(idx))
	if (number) {
		skip(number[0].length)
		if (/[uU]$/.test(number[0]) && !/^(?:0[xX][\da-fA-F]+|\d+)[uU]$/.test(number[0])) error('Invalid unsigned integer')
		if (/^0\d*[89]\d*[uU]?$/.test(number[0])) error('Invalid octal integer')
		if (/\w/.test(cur[idx] || '')) error('Invalid number')
		return node('literal', number[0])
	}
	const value = word()
	if (!value) return
	read()
	return node(value === 'true' || value === 'false' || names.has(value) ? 'keyword' : Object.hasOwn(builtins, value) ? 'builtin' : 'ident', value)
}

// Subscript's registry is shared with other dialects. Save and restore it both
// when defining this grammar and when parsing, so importing GLSL is isolated.
const previous = lookup.slice()
lookup.length = 0
for (const [op, prec] of [
	[',', 1], ['= += -= *= /= %= <<= >>= &= ^= |=', 2],
	['||', 4], ['^^', 5], ['&&', 6], ['|', 7], ['^', 8], ['&', 9],
	['== !=', 10], ['< > <= >=', 11], ['<< >>', 12], ['+ -', 13], ['* / %', 14]
].flatMap(([ops, prec]) => ops.split(' ').map(op => [op, prec])).sort((a, b) => a[0].length - b[0].length)) {
	token(op, prec, a => {
		if (!a || /^(?:[+*/%&|^=<>-]=|&&|\|\||\^\^|<<|>>|\+\+|--)/.test(op + cur[idx]) && op.length === 1) return
		if ((op === '<<' || op === '>>') && cur[idx] === '=') return
		return node(prec === 2 ? 'assign' : 'binary', op, [a, required(prec - (prec === 2))])
	})
}
// Compound operators must follow their prefixes: Subscript tries newest first.
for (const op of ['+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='])
	token(op, 2, a => a && node('assign', op, [a, required(1)]))
for (const op of ['+', '-', '!', '~']) token(op, 15, a => !a && node('unary', op, [required(14)]))
for (const op of ['++', '--']) token(op, 16, a => node(a ? 'suffix' : 'unary', op, [a || required(14)]))
token('?', 3, a => {
	if (!a) return
	const yes = required(); expect(':')
	return node('ternary', '?', [a, yes, required(2)])
})
token('.', 18, a => {
	if (!a) { skip(-1); return atom() }
	return node('operator', '.', [a, node('ident', read())])
})
token('[', 18, a => {
	if (!a) return
	const value = peek(']') ? node('literal', '') : required()
	expect(']')
	return node('binary', '[', [a, value])
})
token('(', 18, a => {
	const args = []
	if (!peek(')')) do { args.push(required(1)) } while (take(','))
	expect(')')
	if (!a && !args.length) error('Empty expression')
	return node(a ? 'call' : 'group', '(', a ? [a, ...args] : args)
})
token('{', 20, a => !a && body())
grammar.push(...lookup)
lookup.splice(0, lookup.length, ...previous)

function body() {
	const children = []
	while (!take('}')) {
		if (idx >= cur.length) error('Unclosed block')
		children.push(statement())
	}
	return node('stmtlist', '', children)
}

function dimensions() {
	const result = []
	while (take('[')) {
		const value = peek(']') ? node('expr') : expression()
		expect(']'); result.push(node('quantifier', '[', [value]))
	}
	return result
}

function declaration(parameter = false) {
	const quals = [], layout = {}
	while (qualifiers.has(word()) || word() === 'layout') {
		const q = read()
		if (q !== 'layout') { quals.push(q); continue }
		expect('(')
		do { const key = read(); layout[key] = take('=') ? required(1).data : true } while (take(','))
		expect(')')
	}
	if (peek(';') && quals.includes('uniform')) { Object.assign(defaultLayout, layout); return node('precision') }
	let type = read(), typeNode = node('keyword', type)
	const block = quals.includes('uniform') && peek('{') ? type : null
	if (type === 'struct' || block) {
		const name = block || (peek('{') ? `_struct${anonymous++}` : read())
		names.add(name)
		expect('{'); const fields = []
		while (!take('}')) { fields.push(declaration()); expect(';') }
		typeNode = node('struct', 'struct', [node('ident', name), ...fields])
	}
	const binding = quals.find(q => storage.has(q)) || ''
	const head = [node('placeholder'), node('placeholder', binding), node('placeholder'), node('placeholder'), typeNode]
	const leading = dimensions()
	const decl = node('decl', typeNode.type === 'struct' ? 'struct' : quals[0] || type, head)
	decl.qualifiers = quals; decl.layout = block ? { ...defaultLayout, ...layout } : layout; decl.block = block
	if (peek(';') || (parameter && (peek(',') || peek(')')))) {
		if (typeNode.type !== 'struct') { const list = node('decllist'); list.parent = decl; head.push(list) }
		return decl
	}
	const name = node('ident', read())
	if (take('(')) {
		const args = []
		if (word() === 'void' && /^void\s*\)/.test(cur.slice(idx))) read()
		else if (!peek(')')) do { args.push(declaration(true)) } while (take(','))
		expect(')')
		const fn = node('function', '', [name, node('functionargs', '', args)])
		if (take('{')) { const block = body(); block.parent = fn; fn.children.push(block) }
		fn.parent = decl; head.push(fn)
		return decl
	}
	const ids = []
	let id = name
	do {
		ids.push(id, ...leading.map(q => node('quantifier', '[', q.children)), ...dimensions())
		if (take('=')) ids.push(expression(1))
		if (parameter || !take(',')) break
		id = node('ident', read())
	} while (true)
	const list = node('decllist', '', ids); list.parent = decl; head.push(list)
	return decl
}

function isDeclaration() {
	const first = word()
	if (first === 'struct' || first === 'layout' || qualifiers.has(first)) return true
	if (!names.has(first)) return false
	const start = idx
	try { read(); dimensions(); return !!word() }
	finally { skip(start - idx) }
}

function statement() {
	if (take(';')) return node('stmt')
	if (take('{')) return node('block', '', [body()])
	if (take('#')) {
		const start = idx - 1
		while (idx < cur.length && cur[idx] !== '\n') skip()
		return node('preprocessor', cur.slice(start, idx))
	}
	const kind = word()
	if (kind === 'invariant' && /^invariant\s+[A-Za-z_]\w*\s*;/.test(cur.slice(idx))) { read(); read(); expect(';'); return node('precision') }
	if (kind === 'precision') {
		read(); read(); read(); expect(';'); return node('precision')
	}
	if (kind === 'if') {
		read(); const children = [parens(), statementBody()]
		if (word() === 'else') { read(); children.push(statementBody()) }
		return node('stmt', '', [node('if', '', children)])
	}
	if (kind === 'for') {
		read(); expect('(')
		const init = peek(';') ? node('expr') : isDeclaration() ? declaration() : expression()
		expect(';'); const cond = peek(';') ? node('expr') : isDeclaration() ? declaration() : expression()
		expect(';'); const step = peek(')') ? node('expr') : expression()
		expect(')')
		return node('stmt', '', [node('forloop', '', [init, cond, step, statementBody()])])
	}
	if (kind === 'while' || kind === 'switch') {
		read(); const cond = parens(kind === 'while')
		return node('stmt', '', [node(kind === 'while' ? 'whileloop' : 'switch', '', [cond, statementBody()])])
	}
	if (kind === 'case' || kind === 'default') {
		read(); const children = kind === 'case' ? [expression()] : []
		expect(':'); return node(kind, '', children)
	}
	if (kind === 'do') {
		read(); const block = statementBody()
		if (read() !== 'while') error("Expected 'while'")
		const cond = parens(); expect(';')
		return node('stmt', '', [node('do-while', '', [block, cond])])
	}
	if (['return', 'break', 'continue', 'discard'].includes(kind)) {
		read(); const children = kind === 'return' && !peek(';') ? [expression()] : []
		expect(';'); return node('stmt', '', [node(kind, kind, children)])
	}
	const value = isDeclaration() ? declaration() : expression()
	if (value.type !== 'decl' || value.children.at(-1)?.type !== 'function' || value.children.at(-1).children.length < 3) {
		// Preserve the API's ability to compile a final bare expression.
		if (!take(';') && !peek('}')) error("Expected ';'")
	}
	return node('stmt', '', [value])
}

function statementBody() { return take('{') ? body() : statement() }

export default function parse(source) {
	if (source && typeof source === 'object' && source.children) return source
	if (typeof source !== 'string') throw new TypeError('Expected GLSL source or AST')
	const saved = lookup.slice(), id = subscript.id, whitespace = subscript.space
	lookup.splice(0, lookup.length, ...grammar)
	subscript.id = atom; subscript.space = space
	names = new Set(Object.keys(types)); anonymous = 0; defaultLayout = {}
	try { return subscript('{' + source + '\n}') }
	finally {
		lookup.splice(0, lookup.length, ...saved)
		subscript.id = id; subscript.space = whitespace
	}
}
