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
	'==':'equal'
};


/**
 * Return rendered operation
 */
function renderOperation (left, right, operator) {
	var leftType = this.getType(left);
	var rightType = this.getType(right);
	var operatorName = operators[operator];

	//1. scalar vs scalar
	if (this.primitives[leftType] && this.primitives[rightType]) {
		return this.createTypeResult(`${this.stringify(left)} ${operator} ${this.stringify(right)}`, [calculate(left, right, operator)], leftType);
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

			operands.push(calculate(leftOp, rightOp, operator));
		}
		return this.createTypeResult(
			`${this.stringify(left)}.map(function (x, i) {return ${calculate('x', this.stringify(right)+'[i]', operator)};})`,
			operands,
			this.types[outType].type
		);
	}

	//4. matN +-/ matN → component-wise
	if (/mat/.test(leftType) && /mat/.test(rightType) && operator !== '*') {
		var outType = this.primitives[leftType] ? rightType : leftType;
		var l = this.types[outType].length * this.types[this.types[outType].type].length;
		var operands = [];
		for (var i = 0; i < l; i++) {
			var leftOp = this.getComponent(left, i), rightOp = this.getComponent(right, i);
			operands.push(calculate(leftOp, rightOp, operator));
		}

		return this.createTypeResult(
			`(function (m, n) { return m.map(function (x, i) {return ${calculate('x', 'n[i]', operator)};}) })(${this.stringify(left)}, ${this.stringify(right)})`,
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
				dotComponents.push(calculate(`m[${calculate('o', i, '+')}]`, `v[${i}]`, '*'))
			}
			this.addInclude('dot');
			return this.createTypeResult(
				`(function (v, m) { return v.map(function (x, i) { var o = i * ${l}; return ${dotComponents.join(' + ')};}); })(${leftOp}, ${rightStr})`,
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
			var fullComps = [];
			for (var i = 0; i < l; i++) {
				var sum = [];
				var fullSum = [];
				for (var j = 0; j < l; j++) {
					var mc = this.getComponent(mat, j*l + i)
					var vc = this.getComponent(vec, j);
					sum.push(calculate(mc, vc, '*'));
					fullSum.push(calculate(`m[${j*l + i}]`, `v[${j}]`, '*'));
				}
				comps.push(sum.join(' + '));
				fullComps.push(fullSum.join(' + '));
			}

			return this.createTypeResult(
				`(function (m, v) { return [${fullComps.join(', ')}]; })(${m}, ${v})`,
				comps,
				this.types[outType].type
			);
		}

		//mat * mat

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

		return operation;
	}
}


module.exports = renderOperation;