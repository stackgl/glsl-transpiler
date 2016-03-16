/**
 * Just names for operators
 *
 * @module  glsl-js/lib/operators
 */


var operators = renderOperation.operators = {
	'*': 'multiply',
	'+': 'add',
	'-': 'subtract',
	'/': 'divide',
	'%': 'mod',
	'<<': 'lshift',
	'>>': 'rshift',
	'&': 'and',
	'|': 'or',
	'^': 'xor',
	'==':'equal',
	'<' : 'less',
	'>': 'greater'
};


/**
 * Return rendered operation
 */
function renderOperation (left, right, operator) {
	var self = this;
	var leftType = this.getType(left);
	var rightType = this.getType(right);
	var operatorName = operators[operator];

	//1. scalar vs scalar
	if (this.primitives[leftType] && this.primitives[rightType]) {
		var a = this.stringify(left), b = this.stringify(right);

		if (!(a instanceof String)) {
			a = new String(a);
			a.complexity = this.complexity(left);
		}
		if (!(b instanceof String)) {
			b = new String(b);
			b.complexity = this.complexity(right);
		}

		return this.createTypeResult(`${a} ${operator} ${b}`, [calculate(a, b, operator)], leftType);
	}

	//2. scalar vs vec/mat → apply scalar to each component
	if (this.primitives[leftType] || this.primitives[rightType]) {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var vec = this.primitives[leftType] ? right : left;
		var scalar = this.primitives[leftType] ? left : right;
		var l = this.types[outType].length;
		if (/mat/.test(outType)) l *= this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = this.getComponent(left, i), rightOp = this.getComponent(right, i);
			if (!(leftOp instanceof String)) {
				leftOp = new String(leftOp);
				leftOp.complexity = this.complexity(left);
			}
			if (!(rightOp instanceof String)) {
				rightOp = new String(rightOp);
				rightOp.complexity = this.complexity(right);
			}

			operands.push(calculate(leftOp, rightOp, operator));
		}

		return this.createTypeResult(
			`${this.stringify(vec)}.map(function (x, i) {return ${calculate('x', this.stringify(scalar), operator)};})`,
			operands,
			this.types[outType].type
		);
	}

	//3. vecN vs vecN → component-wise
	if (/vec/.test(leftType) && /vec/.test(rightType)) {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var l = this.types[outType].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = this.getComponent(left, i), rightOp = this.getComponent(right, i);
			if (!(leftOp instanceof String)) {
				leftOp = new String(leftOp);
				leftOp.complexity = this.complexity(left);
			}
			if (!(rightOp instanceof String)) {
				rightOp = new String(rightOp);
				rightOp.complexity = this.complexity(right);
			}

			operands.push(calculate(leftOp, rightOp, operator));
		}

		var include = {};
		include[leftType] = operatorName;

		return this.createTypeResult(
			`${leftType}.${operatorName}([], ${this.stringify(left)}, ${this.stringify(right)})`,
			operands,
			this.types[outType].type,
			include
		);
	}

	//4. matN +-/ matN → component-wise
	if (/mat/.test(leftType) && /mat/.test(rightType) && operator !== '*') {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var l = this.types[outType].length * this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = this.getComponent(left, i), rightOp = this.getComponent(right, i);
			if (!(leftOp instanceof String)) {
				leftOp = new String(leftOp);
				leftOp.complexity = this.complexity(left);
			}
			if (!(rightOp instanceof String)) {
				rightOp = new String(rightOp);
				rightOp.complexity = this.complexity(right);
			}
			operands.push(calculate(leftOp, rightOp, operator));
		}

		return this.createTypeResult(
			`${this.stringify(left)}.map(function (x, i, m){ return x ${operator} this[i];}, ${this.stringify(right)})`,
			operands,
			this.types[outType].type
		);
	}

	//5. matNxM * matNxM/vecM → matNxM linear multiplication
	if ((/mat/.test(leftType) || /mat/.test(rightType)) && operator === '*') {
		//vec * mat
		if (/vec/.test(leftType)) {
			var outType = leftType;
			var l = this.types[outType].length;
			var operands = [];
			var leftOp = this.stringify(left);
			var dotComponents = [];
			var rightStr = this.stringify(right);
			for (var i = 0; i < l; i++) {
				var rightOp = this.getMatrixComponent(right, i);
				operands.push(`dot(${leftOp}, ${rightOp})`);
				dotComponents.push(calculate(`this[${calculate('o', i, '+')}]`, `v[${i}]`, '*'))
			}
			this.addInclude('dot');
			return this.createTypeResult(
				`${leftOp}.map(function (x, i, v) { var o = i * ${l}; return ${dotComponents.join(' + ')};}, ${rightStr})`,
				operands,
				this.types[outType].type
			);
		}

		//mat * vec
		if (/vec/.test(rightType)) {
			var outType = leftType;

			var vec = right;
			var mat = left;
			var v = this.stringify(vec);
			var m = this.stringify(mat);
			var l = this.types[outType].length;

			var comps = [];
			for (var i = 0; i < l; i++) {
				var sum = [];
				for (var j = 0; j < l; j++) {
					var mc = this.getComponent(mat, j*l + i)
					var vc = this.getComponent(vec, j);
					sum.push(calculate(mc, vc, '*'));
				}
				comps.push(sum.join(' + '));
			}

			return this.createTypeResult(
				`${v}.map(function (x, i, v) { var sum = 0; for (var j = 0; j < ${l}; j++) {sum += ${calculate('this[j*' + l + '+i]', 'v[j]' ,'*')}} return sum; }, ${m})`,
				comps,
				this.types[outType].type
			);
		}

		//mat * mat
		var outType = leftType;

		var l = this.stringify(left);
		var r = this.stringify(right);
		var len = this.types[this.types[outType].type].length;

		var comps = [];

		for (var i = 0; i < len; i++) {
			for (var j = 0; j < len; j++) {
				var sum = [];
				for (var o = 0; o < len; o++) {
					var mc = this.getComponent(left, len*o + i),
						nc = this.getComponent(right, j*len + o);
					sum.push(calculate(mc, nc, '*'));
				}
				comps[j*len + i] = sum.join(' + ');
			}
		}

		return this.createTypeResult(
			`matrixMult(${l}, ${r})`,
			comps,
			this.types[outType].type,
			'matrixMult'
		);
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
		if (operator === '+' || operator === '-') {
			//0 + x
			if (left == 0) operation = right;

			//x + 0
			if (right == 0) operation = left;
		}

		else if (operator === '*') {
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
		operation = new String(operation);

		//guess that any operation costs 1
		operation.complexity = 1 + self.complexity(left) + self.complexity(right);

		return operation;
	}
}


module.exports = renderOperation;