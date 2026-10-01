/**
 * Just names for operators
 *
 * @module  glsl-transpiler/lib/operators
 */

import Descriptor from './descriptor.js';

var floatRE = /^[-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?$/i


export var operators = processOperation.operators = {
	'*': 'multiply',
	'+': 'add',
	'-': 'subtract',
	'/': 'divide',
	'%': 'mod',
	'<<': 'lshift',
	'>>': 'rshift',
	'==': 'equal',
	'<': 'less',
	'>': 'greater',

	//https://gcc.gnu.org/onlinedocs/cpp/C_002b_002b-Named-Operators.html#C_002b_002b-Named-Operators
	'&&': 'and',
	'&=': 'and_eq',
	'&': 'bitand',
	'|': 'bitor',
	// '~': 'compl',
	// '!': 'not',
	'!=': 'not_eq',
	'||': 'or',
	'|=': 'or_eq',
	'^': 'xor',
	'^=': 'xor_eq'
};

const constant = {
	'+': (a,b) => a+b, '-': (a,b) => a-b, '*': (a,b) => a*b, '/': (a,b) => a/b,
	'%': (a,b) => a%b, '<<': (a,b) => a<<b, '>>': (a,b) => a>>b,
	'&': (a,b) => a&b, '|': (a,b) => a|b, '^': (a,b) => a^b,
	'==': (a,b) => a===b, '!=': (a,b) => a!==b, '<': (a,b) => a<b,
	'>': (a,b) => a>b, '<=': (a,b) => a<=b, '>=': (a,b) => a>=b,
	'&&': (a,b) => a&&b, '||': (a,b) => a||b
}

var opComplexity = {
	'*': 2,
	'+': 1,
	'-': 1,
	'/': 2
}

/**
 * Return rendered operation
 */
function processOperation(left, right, operator) {
	var self = this;
	var leftType = left && left.type;
	var rightType = right.type;
	var operatorName = operators[operator];

	const elementType = type => /vec/.test(type) ? this.types[type].type : type
	const integer = type => /^(?:int|uint)$/.test(elementType(type))
	const comparison = /^(?:==|!=|<=|>=|<|>|&&|\|\||\^\^)$/.test(operator)
	if (operator === ',') return Descriptor(`${left}, ${right}`, { type: rightType, optimize: false })
	if (operator === '^^') return Descriptor(`!!(${left}) !== !!(${right})`, { type: 'bool', optimize: false })
	if ((operator === '==' || operator === '!=') && (this.types[leftType]?.length > 1 || this.types[rightType]?.length > 1 || this.structs[leftType] || left.dimensions?.length)) {
		this.addInclude('equalValue')
		return Descriptor(`${operator === '!=' ? '!' : ''}equalValue(${left}, ${right})`, { type: 'bool', optimize: false })
	}
	if (integer(rightType) && (!left || integer(leftType))) {
		const type = leftType || rightType
		const scalarType = elementType(type), unsigned = scalarType === 'uint'
		const cast = code => `(${code}) ${unsigned ? '>>>' : '|'} 0`
		const op = unsigned && operator === '>>' ? '>>>' : operator
		const calc = (a, b) => comparison ? `${a} ${op} ${b}` : cast(
			operator === '*' ? `Math.imul(${a}, ${b})` : a == null ? `${op}(${b})` : `(${a}) ${op} (${b})`)
		if (this.types[type].length === 1 && this.types[rightType].length === 1) {
			if (operator === '++' || operator === '--') return Descriptor(`${operator}${right}`, { type, optimize: false })
			if (floatRE.test(right) && (!left || floatRE.test(left)) && operator !== '++' && operator !== '--') {
				const a = Number(left), b = Number(right)
				const value = left ? operator === '*' ? Math.imul(a,b) : constant[op]?.(a,b) : ({ '-': -b, '+': b, '~': ~b, '!': !b })[op]
				if (value !== undefined) return Descriptor(comparison || operator === '!' ? value : unsigned ? value >>> 0 : value | 0, { type: comparison || operator === '!' ? 'bool' : type, complexity: 0 })
			}
			return Descriptor(calc(left, right), { type: comparison || operator === '!' ? 'bool' : type, optimize: left?.optimize !== false && right.optimize !== false })
		}
		const size = Math.max(this.types[type].length, this.types[rightType].length)
		const outType = /vec/.test(type) ? type : rightType
		const ctor = /^uvec/.test(outType) ? 'Uint32Array' : 'Int32Array'
		const a = left && this.types[leftType].length > 1 ? 'a[i]' : left ? 'a' : null
		const b = this.types[rightType].length > 1 ? 'b[i]' : 'b'
		return Descriptor(`((a, b) => ${ctor}.from({length: ${size}}, (_, i) => ${calc(a, b)}))(${left || 'null'}, ${right})`, { type: outType, optimize: false })
	}
	if (operator === '*' && this.types[leftType]?.length > 1 && this.types[rightType]?.length > 1 && (/mat\dx/.test(leftType) || /mat\dx/.test(rightType))) {
		const lm = /mat/.test(leftType), rm = /mat/.test(rightType)
		const ac = this.types[leftType].length, ar = lm ? this.types[this.types[leftType].type].length : 1
		const bc = rm ? this.types[rightType].length : 1, br = rm ? this.types[this.types[rightType].type].length : this.types[rightType].length
		if (ac !== br) throw new TypeError(`Incompatible matrix product: ${leftType} * ${rightType}`)
		const type = !lm ? `vec${bc}` : !rm ? `vec${ar}` : bc === ar ? `mat${bc}` : `mat${bc}x${ar}`
		this.addInclude('matrixProduct')
		return Descriptor(`matrixProduct(${left}, ${right}, ${ac}, ${ar}, ${bc})`, { type, optimize: false })
	}

	//0. unary: i++, -x, !x, ~x
	if (!left) {
		// scalar
		if (this.types[rightType].length === 1) {
			var a = null, b = right;

			var res = Descriptor(calculate(a, b, operator), {
				components: [calculate(a, b, operator)],
				type: operator === '!' ? 'bool' : rightType,
				complexity: b.complexity + (opComplexity[operator] || 1)
			});
			return res
		}

		// complex
		var outType = rightType;
		var vec = right;
		var l = this.types[outType].length;
		if (/mat/.test(outType)) l *= this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			if (this.types[rightType].length == 1) {
				var rightOp = right, leftOp = left.components[i];
			}
			else {
				var rightOp = right.components[i], leftOp = left;
			}
			operands.push(calculate(leftOp, rightOp, operator));
		}

		var calcStr = calculate(null, '_', operator);
		return Descriptor(
			`${vec}.map(function (_) {return ${calcStr};})`,
			{
				components: operands,
				type: outType,
				complexity: vec.complexity + l * (2) + 1
			});
	}

	//1. scalar vs scalar
	if (this.types[leftType].length == 1 && this.types[rightType].length == 1) {
		var a = left, b = right;

		var res = Descriptor(calculate(a, b, operator), {
			components: [calculate(a, b, operator)],
			type: comparison ? 'bool' : leftType,
			complexity: a.complexity + b.complexity + (opComplexity[operator] || 1)
		});
		return res;
	}

	//2. scalar vs vec/mat → apply scalar to each component
	if (this.types[leftType].length == 1 || this.types[rightType].length == 1) {
		var outType = this.types[leftType].length == 1 ? rightType : leftType;
		var vec = this.types[leftType].length == 1 ? right : left;
		var scalar = this.types[leftType].length == 1 ? left : right;
		var l = this.types[outType].length;
		if (/mat/.test(outType)) l *= this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			if (this.types[rightType].length == 1) {
				var rightOp = right, leftOp = left.components[i];
			}
			else {
				var rightOp = right.components[i], leftOp = left;
			}
			operands.push(calculate(leftOp, rightOp, operator));
		}

		if (scalar.optimize) {
			var calcStr = this.types[rightType].length == 1 ? calculate('_', scalar, operator) : calculate(scalar, '_', operator);

			return Descriptor(
				`${vec}.map(function (_) {return ${calcStr};})`, {
				components: operands,
				type: outType,
				complexity: vec.complexity + l * (scalar.complexity + 2) + 1
			});
		}
		else {
			var calcStr = this.types[rightType].length == 1 ? calculate('_', 'this', operator) : calculate('this', '_', operator);
			return Descriptor(
				`${vec}.map(function (_) {return ${calcStr};}, ${scalar})`, {
				components: operands,
				type: outType,
				complexity: vec.complexity + l * (scalar.complexity + 2) + 1
			});
		}
	}

	//3. vecN vs vecN → component-wise
	if (/vec/.test(leftType) && /vec/.test(rightType)) {
		var outType = this.types[leftType].length == 1 ? rightType : leftType;
		var l = this.types[outType].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = left.components[i], rightOp = right.components[i];
			operands.push(calculate(leftOp, rightOp, operator));
		}

		var res = Descriptor(
			`((a, b) => a.map((x, i) => x ${operator} b[i]))(${left}, ${right})`, {
			components: operands,
			type: outType,
			complexity: left.complexity + right.complexity + l * 3 + 1
		});
		return res;
	}

	//4. matN +-/ matN → component-wise
	if (/mat/.test(leftType) && /mat/.test(rightType) && operator !== '*') {
		var outType = this.types[leftType].length == 1 ? rightType : leftType;
		var l = this.types[outType].length * this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = left.components[i], rightOp = right.components[i];
			operands.push(calculate(leftOp, rightOp, operator));
		}

		var res = Descriptor(
			`${left}.map(function (x, i, m){ return x ${operator} this[i];}, ${right})`, {
			components: operands,
			complexity: left.complexity + right.complexity + l * 3,
			type: outType
		});
		return res;
	}

	//5. matNxM * matNxM/vecM → matNxM linear multiplication
	if ((/mat/.test(leftType) || /mat/.test(rightType)) && operator === '*') {
		//vec * mat
		if (/vec/.test(leftType)) {
			var outType = leftType;
			var l = this.types[outType].length;
			var operands = [];
			var leftOp = left;
			var dotComponents = [];
			for (var i = 0; i < l; i++) {
				var start = l * i;
				var end = l * i + l;
				var rightOp = Descriptor(`${right}.subarray(${start}, ${end})`, {
					type: this.types[leftType].type,
					complexity: right.complexity + l + 1,
					components: right.components.slice(start, end)
				});
				rightOp = this.optimizeDescriptor(rightOp);

				operands.push(`dot(${leftOp}, ${rightOp})`);
				dotComponents.push(calculate(`this[${calculate('o', i, '+')}]`, `v[${i}]`, '*'))
			}
			this.addInclude('dot');
			var res = Descriptor(
				`${leftOp}.map(function (x, i, v) { var o = i * ${l}; return ${dotComponents.join(' + ')};}, ${right})`, {
				components: operands,
				complexity: left.complexity + right.complexity + l * (l + 3),
				type: outType
			});
			return res;
		}

		//mat * vec
		if (/vec/.test(rightType)) {
			var outType = rightType;

			var vec = right;
			var mat = left;
			var l = this.types[outType].length;

			var comps = [];
			for (var i = 0; i < l; i++) {
				var sum = [], complexity = 0;
				for (var j = 0; j < l; j++) {
					var mc = mat.components[j * l + i];
					var vc = vec.components[j];
					sum.push(calculate(mc, vc, '*'));
					complexity += mc.complexity + vc.complexity
				}
				complexity++;
				comps.push(Descriptor(sum.join(' + '), { complexity }));
			}

			var res = Descriptor(
				`${vec}.map(function (x, i, v) { var sum = 0; for (var j = 0; j < ${l}; j++) {sum += ${calculate('this[j*' + l + '+i]', 'v[j]', '*')}} return sum; }, ${mat})`,
				{
					components: comps,
					type: outType,
					complexity: vec.complexity + mat.complexity + l * l * 3
				});
			return res;
		}

		//mat * mat
		var outType = leftType;

		var l = left;
		var r = right;
		var len = this.types[this.types[outType].type].length;

		var comps = [];

		for (var i = 0; i < len; i++) {
			for (var j = 0; j < len; j++) {
				var sum = [];
				for (var o = 0; o < len; o++) {
					var mc = left.components[len * o + i],
						nc = right.components[j * len + o];
					sum.push(calculate(mc, nc, '*'));
				}

				// calculate sum component
				var sumComp = sum.shift()
				while (sum.length) {
					sumComp = calculate(sumComp, sum.shift(), '+')
				}

				comps[j * len + i] = sumComp
			}
		}

		var res = Descriptor(
			`matrixMult(${l}, ${r})`, {
			components: comps,
			type: outType,
			include: 'matrixMult'
		});
		return res;
	}

	throw Error(`Impossible to render ${leftType} ${operator} ${rightType}.`);


	/**
	 * Try to evaluate operation
	 *
	 * @param {string} left Left operand, stringified js value
	 * @param {string} right Right operand, stringified js value
	 * @param {string} operator operator to eval
	 *
	 * @return {string} shorten pre-evaled operator
	 */
	function calculate(left, right, operator) {
		var opResult = undefined;

		//float ∀ float case
		if (floatRE.test(left) && floatRE.test(right)) {
			// Fold literal operands without evaluating generated JavaScript.
			opResult = constant[operator]?.(Number(left), Number(right));
		}

		// normalize 0 values
		if (floatRE.test(left)) {
			left = Descriptor(left)
			left.value = parseFloat(left)
		}
		if (floatRE.test(right)) {
			right = Descriptor(right)
			right.value = parseFloat(right)
		}

		//handle ridiculous math cases like x + 0, x * 0, x + 1
		if (operator == '+' || operator == '-') {
			//0 + x
			if (!left || left.value === 0) {
				if (operator == '-') opResult = '-' + right;
				else opResult = right;
			}

			//x + 0
			if (left && right == 0) opResult = left;
		}
		// !a, ~a
		else if (operator == '!' || operator == '~') {
			opResult = operator + right
		}
		else if (operator == '*') {
			//0 * x
			if ((left == 0 || left.value === 0 || right == 0) && left.optimize !== false && right.optimize !== false) opResult = 0;

			//1 * x
			else if (left.value === 1) opResult = right;

			//x * 1
			else if (right.value === 1) opResult = left;
		}
		else if (operator == '--' || operator == '++') {
			if (left) opResult = left + operator
			else if (right) opResult = operator + right
		}

		if (opResult == null) {
			opResult = ''

			// complex operators
			if (operator != '+' && operator != '-') {
				if (/\s/.test(left) && !(left[0] == '(' && left[left.length - 1] == ')')) opResult += '(' + left + ')'
				else opResult += left
			}
			else opResult += left

			opResult += ' ' + operator + ' '

			if (operator != '+' && operator != '-') {
				if (/\s/.test(right) && !(right[0] == '(' && right[right.length - 1] == ')')) opResult += '(' + right + ')'
				else opResult += right
			}
			else opResult += right
		}

		opResult = Descriptor(opResult, {
			complexity: 1 + ((left && left.complexity) || 0) + (right.complexity || 0),
			optimize: (left && left.optimize) !== false && right.optimize !== false
		});

		return opResult;
	}
}


export default processOperation;
