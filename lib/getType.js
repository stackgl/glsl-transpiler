/**
 * Infer data type for a node.
 * It is not a separate module but a method of glsl instance, placed to a file,
 * because it is too large.
 */

var types = require('./types');

module.exports = function getType (node) {
	if (!node) return 'float';

	if (node != null && (typeof node !== 'object')) return 'float';

	if (node instanceof String) return 'float';

	if (node._type) return node._type;

	if (node.type === 'ident') {
		var id = node.token.data;

		var scope = this.scopes[this.currentScope];

		//find the closest scope with the id
		while (scope[id] == null) {
			scope = scope.__parentScope;
			if (!scope) throw `'${id}' is not defined`;
		}

		return node._type = scope[id].type;
	}
	else if (node.type === 'call') {
		var fnName = node.children[0].data;
		if (types[fnName]) return node._type = fnName;

		//if function type is registered - return its type
		if (this.functions[fnName]) return node._type = this.functions[fnName];

		//FIXME: if function is builtin like length() or pow() etc

		//if function is a method (weiiird, but vec.length stuff)
		if (node.children[0].data === '.') {
			if (node.children[0].children[1].data === 'length') {
				return node._type = 'float';
			}
		}

		//FIXME: if function is not defined - suppose it’s output argument is wrong
		console.warn(`Unable to guess the type of '${fnName}' as it is undefined. Guess it returns the type of the first argument.`);
		return node._type = this.getType(node.children[1]);
	}
	else if (node.type === 'literal') {
		if (/true|false/i.test(node.data)) return node._type = 'bool';
		if (/.|[0-9]e[0-9]/.test(node.data)) return node._type = 'float';
		if (/[0-9]/.test(node.data) > 0) return node._type = 'int';
	}
	else if (node.type === 'operator') {
		if (node.data === '.') {
			//FIXME: struct point-access is not necessarily a swizzle
			if (/vec/.test(this.getType(node.children[0]))) {
				var len = node.children[1].data.length;
				//FIXME: not necessarily a float vector
				if (len === 1) return node._type = 'float';
				if (len === 2) return node._type = 'vec2';
				if (len === 3) return node._type = 'vec3';
				if (len === 4) return node._type = 'vec4';
			}
			//access operator, like a.xy
			if (!this.structures[node.children[0].data]) {
				if (/[xyzwrgbastpd]+/.test(node.children[1].data)) {
					return node._type = `vec${node.children[1].data.length}`;
				}
			}
		}
	}
	//FIXME: guess every keyword is a type, isn’t it?
	else if (node.type === 'keyword') {
		return node._type = node.data;
	}
	else if (node.type === 'binary') {
		//a + b → get the lenghthen type (usually it is true except for mat*mat)
		if (this.operatorNames[node.data]) {
			var typeA = this.getType(node.children[0]);
			var typeB = this.getType(node.children[1]);
			if (this.types[typeA].length > 1) return node._type = typeA;
			if (this.types[typeB].length > 1) return node._type = typeB;
			return node._type = typeA;
		}
		//FIXME: these cases might be wrong
		//a[0]
		else if (node.data === '[') {
			return node._type = 'float';
		}
		//a.b
		else {
		}
	}
	else if (node.type === 'builtin') {
		//for builtins just notify their simplicity (no need for them being spec types)
		return node._type = this.builtins[node.data];
	}
	else if (node.type === 'ternary') {
		return node._type = this.getType(node.children[1]);
	}
	else if (node.type === 'group') {
		return node._type = this.getType(node.children[0]);
	}
	// `-x` - return type of x
	else if (node.type === 'unary') {
		return node._type = this.getType(node.children[0]);
	}

	throw Error(`getType(${node.type}) is not implemented`);
};