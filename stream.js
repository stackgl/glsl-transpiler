/** Compile a complete shader from arbitrarily split UTF-8 source chunks. */
import { Transform } from 'node:stream'
import { StringDecoder } from 'node:string_decoder'
import GLSL from './lib/index.js'

export class GlslTranspilerStream extends Transform {
	constructor(options) {
		super({ writableObjectMode: true })
		this.compiler = GLSL(options).compiler
		this.source = ''
		this.tree = null
		this.chunks = []
		this.decoder = new StringDecoder('utf8')
	}
	_transform(chunk, encoding, done) {
		try {
			if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) throw new TypeError('Expected GLSL source chunks')
			this.chunks.push(Buffer.isBuffer(chunk) ? this.decoder.write(chunk) : this.decoder.end() + chunk)
			done()
		} catch (error) { done(error) }
	}
	_flush(done) {
		try {
			this.source = this.compiler.compile(this.chunks.join('') + this.decoder.end())
			this.tree = this.compiler.tree
			this.chunks.length = 0
			this.push(this.source)
			done()
		} catch (error) { done(error) }
	}
}

export default function compileStream(options) { return new GlslTranspilerStream(options) }
