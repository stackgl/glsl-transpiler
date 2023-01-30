/**
 * Convert stream of AST nodes to strings.
 *
 * @module
 */

import tokenize from 'glsl-tokenizer/string.js'
import parse from './lib/parse.js'
import GLSL from './lib/index.js'
import {Transform} from 'stream'
import inherits from 'inherits'

function GlslTranspilerStream (options) {
	if (!(this instanceof GlslTranspilerStream)) return new GlslTranspilerStream(options);

	Transform.call(this, {
		objectMode: true
	});

	//actual version of tree
	this.tree = null;

	//actual version of code
	this.source = '';

	this.on('data', function (data) {
		this.source += data + '\n';
	});

	//glsl compiler
	this.compiler = GLSL(options).compiler;
};

inherits(GlslTranspilerStream, Transform);


// glsl-parser streams data for each token from the glsl-tokenizer,
// it generates lots of duplicated ASTs, which does not make any sense in the output.
// So the satisfactory behaviour here is to render each statement in turn.
GlslTranspilerStream.prototype._transform = function (chunk, enc, cb) {
	//if string passed - tokenize and parse it
	if (typeof chunk === 'string') {
		//FIXME: there is a problem of invalid input chunks; gotta wait till some sensible thing is accumulated and then parse.
		var tree = parse(tokenize(chunk, {version: '300 es'}));
		cb(null, this.compiler.process(tree));

		this.tree = tree;
	}
	//if tree - compile the tree
	else {
		//if function statements expected - wait for stmtlist of it to render fully
		if (this._isFunctionMode) {
			if (chunk.type === 'function') {
				this._isFunctionMode = false;
			}
			cb(null);
		}

		else {
			if (chunk.type === 'stmt')	{
				cb(null, this.compiler.process(chunk));
			}
			else {
				//detect entering function mode to avoid reacting on stmts
				if (chunk.type === 'functionargs') {
					this._isFunctionMode = true;
				}
				//save last stmtlist to pass to the end
				else if (chunk.type === 'stmtlist') {
					this.tree = chunk;
				}
				cb(null);
			}
		}
	}
};

export default GlslTranspilerStream;
