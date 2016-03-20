/**
 * Just names for operators
 *
 * @module  glsl-js/lib/operators
 */

var Descriptor = require('./Descriptor');


var operators = processOperation.operators = {
	'*': 'multiply',
	'+': 'add',
	'-': 'subtract',
	'/': 'divide',
	'%': 'mod',
	'<<': 'lshift',
	'>>': 'rshift',
	'==':'equal',
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


/**
 * Return rendered operation
 */
function processOperation (leftDesc, rightDesc, operator) {
	var self = this;
	var leftType = leftDesc.type;
	var rightType = rightDesc.type;
	var operatorName = operators[operator];

	//1. scalar vs scalar
	if (this.primitives[leftType] && this.primitives[rightType]) {
		var a = leftDesc, b = rightDesc;

		var res = Descriptor(calculate(a, b, operator), {
			components: [calculate(a, b, operator)],
			type: leftType,
			complexity: a.complexity + b.complexity + 1
		});
		return res;
	}

	//2. scalar vs vec/mat → apply scalar to each component
	if (this.primitives[leftType] || this.primitives[rightType]) {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var vec = this.primitives[leftType] ? rightDesc : leftDesc;
		var scalar = this.primitives[leftType] ? leftDesc : rightDesc;
		var l = this.types[outType].length;
		if (/mat/.test(outType)) l *= this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = vec.components[i], rightOp = scalar;
			operands.push(calculate(leftOp, rightOp, operator));
		}
		var res = Descriptor(
			`${vec}.map(function (x, i) {return ${calculate('x', scalar, operator)};})`, {
			components: operands,
			type: outType,
			complexity: vec.complexity + l * (scalar.complexity + 2) + 1
		});
		return res;
	}

	//3. vecN vs vecN → component-wise
	if (/vec/.test(leftType) && /vec/.test(rightType)) {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var l = this.types[outType].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = leftDesc.components[i], rightOp = rightDesc.components[i];
			operands.push(calculate(leftOp, rightOp, operator));
		}

		var include = {};
		include[leftType] = operatorName;

		var res = Descriptor(
			`${leftType}.${operatorName}([], ${leftDesc}, ${rightDesc})`, {
			components: operands,
			type: outType,
			complexity: leftDesc.complexity + rightDesc.complexity + l*3 + 1,
			include: include
		});
		return res;
	}

	//4. matN +-/ matN → component-wise
	if (/mat/.test(leftType) && /mat/.test(rightType) && operator !== '*') {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var l = this.types[outType].length * this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = leftDesc.components[i], rightOp = rightDesc.components[i];
			operands.push(calculate(leftOp, rightOp, operator));
		}

		var res = Descriptor(
			`${leftDesc}.map(function (x, i, m){ return x ${operator} this[i];}, ${rightDesc})`, {
			components: operands,
			complexity: leftDesc.complexity + rightDesc.complexity + l*3,
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
			var leftOp = leftDesc;
			var dotComponents = [];
			var rightStr = rightDesc;
			for (var i = 0; i < l; i++) {
				var rightOp = this.getMatrixComponent(right, i);
				operands.push(`dot(${leftOp}, ${rightOp})`);
				dotComponents.push(calculate(`this[${calculate('o', i, '+')}]`, `v[${i}]`, '*'))
			}
			this.addInclude('dot');
			var res = Descriptor(
				`${leftOp}.map(function (x, i, v) { var o = i * ${l}; return ${dotComponents.join(' + ')};}, ${rightStr})`, {
				components: operands,
				complexity: leftDesc.complexity + rightDesc.complexity + l*(l + 3),
				type: outType
			});
			return res;
		}

		//mat * vec
		if (/vec/.test(rightType)) {
			var outType = leftType;

			var vec = rightDesc;
			var mat = leftDesc;
			var l = this.types[outType].length;

			var comps = [];
			for (var i = 0; i < l; i++) {
				var sum = [];
				for (var j = 0; j < l; j++) {
					var mc = mat.components[j*l + i];
					var vc = vec.components[j];
					sum.push(calculate(mc, vc, '*'));
				}
				comps.push(sum.join(' + '));
			}

			var res = Descriptor(
				`${vec}.map(function (x, i, v) { var sum = 0; for (var j = 0; j < ${l}; j++) {sum += ${calculate('this[j*' + l + '+i]', 'v[j]' ,'*')}} return sum; }, ${mat})`,
				{
					components: comps,
					type: outType,
					complexity: vec.complexity + mat.complexity + l*l*3
			});
			return res;
		}

		//mat * mat
		var outType = leftType;

		var l = leftDesc;
		var r = rightDesc;
		var len = this.types[this.types[outType].type].length;

		var comps = [];

		for (var i = 0; i < len; i++) {
			for (var j = 0; j < len; j++) {
				var sum = [];
				for (var o = 0; o < len; o++) {
					var mc = leftDesc.components[len*o + i],
						nc = rightDesc.components[j*len + o];
					sum.push(calculate(mc, nc, '*'));
				}
				comps[j*len + i] = sum.join(' + ');
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
	function calculate (left, right, operator) {
		var operation = undefined;

		//handle ridiculous math cases like x + 0, x * 0, x + 1
		if (operator == '+' || operator == '-') {
			//0 + x
			if (left == 0) operation = right;

			//x + 0
			if (right == 0) operation = left;
		}

		else if (operator == '*') {
			//0 * x
			if (left == 0 || right == 0) operation = 0;

			//1 * x
			else if (parseFloat(left) === 1) operation = right;

			//x * 1
			else if (parseFloat(right) === 1) operation = left;
		}

		if (operation == null) {
			operation = `${left} ${operator} ${right}`;
		}

		operation = Descriptor(operation, {
			complexity: 1 + left.complexity||0 + right.complexity||0,
			optimize: left.optimize !== false && right.optimize !== false
		});

		return operation;
	}
}


module.exports = processOperation;