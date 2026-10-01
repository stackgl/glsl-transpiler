// GLSL ES 3.00 additions. Each runtime function is self-contained or declares
// its includes, because the compiler emits only the helpers a shader uses.
const library = {}
const sameType = function (node) { return this.process(node.children[1]).type }
const mappedType = (scalar, prefix) => function (node) {
	const type = this.process(node.children[1]).type
	return /vec/.test(type) ? prefix + type.slice(-1) : scalar
}

function roundEven(x) {
	if (typeof x !== 'number') return Array.from(x, roundEven)
	const low = Math.floor(x), fraction = x - low
	return fraction === 0.5 ? low + (low % 2 !== 0 ? 1 : 0) : Math.round(x)
}
function floatBitsToInt(x) {
	if (typeof x !== 'number') return Array.from(x, floatBitsToInt)
	const data = new DataView(new ArrayBuffer(4))
	data.setFloat32(0, x)
	return data.getInt32(0)
}
function floatBitsToUint(x) {
	if (typeof x !== 'number') return Array.from(x, floatBitsToUint)
	const data = new DataView(new ArrayBuffer(4))
	data.setFloat32(0, x)
	return data.getUint32(0)
}
function intBitsToFloat(x) {
	if (typeof x !== 'number') return Array.from(x, intBitsToFloat)
	const data = new DataView(new ArrayBuffer(4))
	data.setInt32(0, x)
	return data.getFloat32(0)
}
function uintBitsToFloat(x) {
	if (typeof x !== 'number') return Array.from(x, uintBitsToFloat)
	const data = new DataView(new ArrayBuffer(4))
	data.setUint32(0, x)
	return data.getFloat32(0)
}
function packSnorm2x16(v) {
	const part = x => Math.round(Math.min(1, Math.max(-1, x)) * 32767) & 65535
	return (part(v[0]) | (part(v[1]) << 16)) >>> 0
}
function packUnorm2x16(v) {
	const part = x => Math.round(Math.min(1, Math.max(0, x)) * 65535)
	return (part(v[0]) | (part(v[1]) << 16)) >>> 0
}
function unpackSnorm2x16(x) {
	return [Math.max(-1, (x << 16 >> 16) / 32767), Math.max(-1, (x >> 16) / 32767)]
}
function unpackUnorm2x16(x) { return [(x & 65535) / 65535, (x >>> 16) / 65535] }
function packHalf2x16(v) {
	function half(x) {
		const sign = x < 0 || Object.is(x, -0) ? 32768 : 0
		x = Math.abs(Math.fround(x))
		if (Number.isNaN(x)) return 0x7e00
		if (x >= 65520) return sign | 0x7c00
		if (x < 2 ** -14) return sign | roundEven(x * 2 ** 24)
		const exponent = Math.floor(Math.log2(x))
		const mantissa = roundEven((x / 2 ** exponent - 1) * 1024)
		return sign | ((exponent + 15) * 1024 + mantissa)
	}
	return (half(v[0]) | half(v[1]) << 16) >>> 0
}
packHalf2x16.include = ['roundEven']
function unpackHalf2x16(v) {
	function half(x) {
		const sign = x & 32768 ? -1 : 1, exponent = x >> 10 & 31, mantissa = x & 1023
		return sign * (exponent === 31 ? mantissa ? NaN : Infinity : exponent ? 2 ** (exponent - 15) * (1 + mantissa / 1024) : mantissa * 2 ** -24)
	}
	return [half(v & 65535), half(v >>> 16)]
}
function modf(x) {
	const whole = typeof x === 'number' ? Math.trunc(x) : Array.from(x, Math.trunc)
	modf.__out__ = [whole]
	return modf.__return__ = typeof x === 'number' ? x - whole : Array.from(x, (v, i) => v - whole[i])
}
function matrixProduct(a, b, cols, rows, outCols) {
	const result = new Float32Array(rows * outCols)
	for (let col = 0; col < outCols; col++) for (let row = 0; row < rows; row++) {
		let sum = 0
		for (let k = 0; k < cols; k++) sum += a[k * rows + row] * b[col * cols + k]
		result[col * rows + row] = sum
	}
	return result
}
function equalValue(a, b) {
	if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return a === b
	const keys = Object.keys(a)
	return keys.length === Object.keys(b).length && keys.every(key => equalValue(a[key], b[key]))
}
function cloneValue(value) {
	if (ArrayBuffer.isView(value)) return value.slice()
	if (Array.isArray(value)) return value.map(cloneValue)
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneValue(v)]))
	return value
}

function mixSelect(x, y, a) {
	if (typeof a === 'boolean' || typeof a === 'number') return a ? y : x
	return Array.from(a, (v, i) => v ? y[i] : x[i])
}
mixSelect.type = sameType
function discard() {
	const error = new Error('Fragment discarded')
	error.name = 'GLSLDiscard'
	throw error
}
Object.assign(library, { discard, mixSelect, roundEven, floatBitsToInt, floatBitsToUint, intBitsToFloat, uintBitsToFloat, packSnorm2x16, packUnorm2x16, unpackSnorm2x16, unpackUnorm2x16, packHalf2x16, unpackHalf2x16, modf, matrixProduct, equalValue, cloneValue })
roundEven.type = modf.type = sameType
floatBitsToInt.type = mappedType('int', 'ivec')
floatBitsToUint.type = mappedType('uint', 'uvec')
intBitsToFloat.type = uintBitsToFloat.type = mappedType('float', 'vec')
for (const fn of [packSnorm2x16, packUnorm2x16, packHalf2x16]) fn.type = 'uint'
for (const fn of [unpackSnorm2x16, unpackUnorm2x16, unpackHalf2x16]) fn.type = 'vec2'

function sinh(x) {
	if (typeof x !== 'number') return Array.from(x, sinh)
	return Math.sinh(x)
}
library.sinh = sinh
sinh.type = sameType

function cosh(x) {
	if (typeof x !== 'number') return Array.from(x, cosh)
	return Math.cosh(x)
}
library.cosh = cosh
cosh.type = sameType

function tanh(x) {
	if (typeof x !== 'number') return Array.from(x, tanh)
	return Math.tanh(x)
}
library.tanh = tanh
tanh.type = sameType

function asinh(x) {
	if (typeof x !== 'number') return Array.from(x, asinh)
	return Math.asinh(x)
}
library.asinh = asinh
asinh.type = sameType

function acosh(x) {
	if (typeof x !== 'number') return Array.from(x, acosh)
	return Math.acosh(x)
}
library.acosh = acosh
acosh.type = sameType

function atanh(x) {
	if (typeof x !== 'number') return Array.from(x, atanh)
	return Math.atanh(x)
}
library.atanh = atanh
atanh.type = sameType

function trunc(x) {
	if (typeof x !== 'number') return Array.from(x, trunc)
	return Math.trunc(x)
}
library.trunc = trunc
trunc.type = sameType

function round(x) {
	if (typeof x !== 'number') return Array.from(x, round)
	return Math.round(x)
}
library.round = round
round.type = sameType

function isnan(x) {
	if (typeof x !== 'number') return Array.from(x, isnan)
	return Number.isNaN(x)
}
library.isnan = isnan
isnan.type = mappedType("bool", "bvec")

function isinf(x) {
	if (typeof x !== 'number') return Array.from(x, isinf)
	return x === Infinity || x === -Infinity
}
library.isinf = isinf
isinf.type = mappedType("bool", "bvec")

export default library
