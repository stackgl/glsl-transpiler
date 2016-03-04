/**
 * Infer data type for a node.
 * It is not a separate module but a method of glsl instance, placed to a file,
 * because it is too large.
 */

//TODO: cache node type on node to speed up return

var types = require('./types');

module.exports = function getType (node) {
	if (node != null && (typeof node !== 'object')) return 'float';

	if (node.type === 'ident') {
		var id = node.token.data;

		var scope = this.scopes[this.currentScope];

		//find the closest scope with the id
		while (scope[id] == null) {
			scope = scope.__parentScope;
			if (!scope) throw `'${id}' is not defined`;
		}

		return scope[id].type;
	}
	else if (node.type === 'call') {
		var fnName = node.children[0].data;
		if (types[fnName]) return fnName;

		//if function type is registered - return its type
		if (this.functions[fnName]) return this.functions[fnName];

		//FIXME: if function is builtin like length() or pow() etc

		//if function is a method (weiiird, but vec.length stuff)
		if (node.children[0].data === '.') {
			if (node.children[0].children[1].data === 'length') {
				return 'float';
			}
		}

		//FIXME: if function is not defined - suppose it’s output argument is wrong
		console.warn(`Unable to guess the type of '${fnName}' as it is undefined. Guess it returns the type of the first argument.`);
		return this.getType(node.children[1]);
	}
	else if (node.type === 'literal') {
		if (/true|false/i.test(node.data)) return 'bool';
		if (/.|[0-9]e[0-9]/.test(node.data)) return 'float';
		if (/[0-9]/.test(node.data) > 0) return 'int';
	}
	else if (node.type === 'operator') {
		if (node.data === '.') {
			//FIXME: struct point-access is not necessarily a swizzle
			if (/vec/.test(this.getType(node.children[0]))) {
				var len = node.children[1].data.length;
				//FIXME: not necessarily a float vector
				if (len === 1) return 'float';
				if (len === 2) return 'vec2';
				if (len === 3) return 'vec3';
				if (len === 4) return 'vec4';
			}
			//access operator, like a.xy
			if (!this.structures[node.children[0].data]) {
				if (/[xyzwrgbastpd]+/.test(node.children[1].data)) {
					return `vec${node.children[1].data.length}`;
				}
			}
		}
	}
	//FIXME: guess every keyword is a type, isn’t it?
	else if (node.type === 'keyword') {
		return node.data;
	}
	else if (node.type === 'binary') {
		//a + b
		if (this.operatorNames[node.data]) {
			return this.getType(node.children[0]);
		}
		//a[0]
		else if (node.data === '[') {
			return 'float';
		}
		//a.b
		else {
		}
	}
	else if (node.type === 'builtin') {
		//for builtins just notify their simplicity (no need for them being spec types)
		return this.builtins[node.data];
	}
	else if (node.type === 'ternary') {
		return this.getType(node.children[1]);
	}
	else if (node.type === 'group') {
		return this.getType(node.children[0]);
	}
	// `-x` - return type of x
	else if (node.type === 'unary') {
		return this.getType(node.children[0]);
	}

	throw Error(`getType(${node.type}) is not implemented`);
};