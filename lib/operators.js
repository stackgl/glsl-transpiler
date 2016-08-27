/**
 * Just names for operators
 *
 * @module  glsl-js/lib/operators
 */

var Descriptor = require('./descriptor');

var floatRE = /^-?[0-9]*(?:.[0-9]+)?(?:e-?[0-9]+)?$/i;

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

var opsRE = /\*|\+|\-|\/|\%|\<|\=|\>|\&|\||\!|\^|\~/;


/**
 * Return rendered operation
 */
function processOperation (left, right, operator) {
	var self = this;
	var leftType = left.type;
	var rightType = right.type;
	var operatorName = operators[operator];

	//1. scalar vs scalar
	if (this.types[leftType].length == 1 && this.types[rightType].length == 1) {
		var a = left, b = right;

		var res = Descriptor(calculate(a, b, operator), {
			components: [calculate(a, b, operator)],
			type: leftType,
			complexity: a.complexity + b.complexity + 1
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
			var calcStr = this.types[rightType].length == 1 ? calculate('_', scalar, operator) :  calculate(scalar, '_', operator);
			return Descriptor(
				`${vec}.map(function (_) {return ${calcStr};})`, {
				components: operands,
				type: outType,
				complexity: vec.complexity + l * (scalar.complexity + 2) + 1
			});
		}
		else {
			var calcStr = this.types[rightType].length == 1 ? calculate('_', 'this', operator) :  calculate('this', '_', operator);
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

		var include = {};
		include[leftType] = operatorName;
		var res = Descriptor(
			`${leftType}.${operatorName}([], ${left}, ${right})`, {
			components: operands,
			type: outType,
			complexity: left.complexity + right.complexity + l*3 + 1,
			include: include
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
			complexity: left.complexity + right.complexity + l*3,
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
				var rightOp = Descriptor(`${right}.slice(${start}, ${end})`, {
					type: this.types[leftType].type,
					complexity: right.complexity + l,
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
				complexity: left.complexity + right.complexity + l*(l + 3),
				type: outType
			});
			return res;
		}

		//mat * vec
		if (/vec/.test(rightType)) {
			var outType = leftType;

			var vec = right;
			var mat = left;
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

		var l = left;
		var r = right;
		var len = this.types[this.types[outType].type].length;

		var comps = [];

		for (var i = 0; i < len; i++) {
			for (var j = 0; j < len; j++) {
				var sum = [];
				for (var o = 0; o < len; o++) {
					var mc = left.components[len*o + i],
						nc = right.components[j*len + o];
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
		var opResult = undefined;

		//float op float case
		if (floatRE.test(left) && floatRE.test(right)) {
			opResult = eval(`${left} ${operator} ${right}`);
		}

		//handle ridiculous math cases like x + 0, x * 0, x + 1
		if (operator == '+' || operator == '-') {
			//0 + x
			if (left == 0) opResult = right;

			//x + 0
			if (right == 0) opResult = left;
		}

		else if (operator == '*') {
			//0 * x
			if (left == 0 || right == 0) opResult = 0;

			//1 * x
			else if (parseFloat(left) === 1) opResult = right;

			//x * 1
			else if (parseFloat(right) === 1) opResult = left;
		}

		//FIXME: in case if left or right components contain operations symbols we have to group them. That is groups issue.

		if (opResult == null) {
			opResult = `${left} ${operator} ${right}`;
		}

		opResult = Descriptor(opResult, {
			complexity: 1 + left.complexity||0 + right.complexity||0,
			optimize: left.optimize !== false && right.optimize !== false
		});

		return opResult;
	}
}


module.exports = processOperation;
