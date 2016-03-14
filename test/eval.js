/**
 * Eval piece of glsl code
 */

var GLSL = require('../');

module.exports = function eval (str, opt) {
	var strLines;

	opt = opt || {};

	var glsl = GLSL(opt).glsl;
	var debugStr = '';

	//take last statement as a result
	try {
		str = glsl.stringify(glsl.parse(str));
		debugStr = str;
		strLines = str.trim().split(/\n/);
		var lastStr = strLines[strLines.length - 1];
		if (!/^var/.test(lastStr) && !/};?\s*$/.test(lastStr)) {
			strLines[strLines.length - 1] = 'return ' + strLines[strLines.length - 1];
		}
		str = strLines.join('\n');
	} catch (e) {
		//NOTE: if initial string is like int x = ...; then it is evaled badly.
		strLines = str.trim().split(/\s*;\s*/).slice(0,-1);
		strLines.unshift('float _');
		strLines[strLines.length - 1] = '_ = ' + strLines[strLines.length - 1];
		str = strLines.join(';\n') + ';';
		str = glsl.stringify(glsl.parse(str));
		debugStr = str;
		str += '\nreturn _;';
	}

	var stdlib = glsl.stringifyStdlib();
	str += stdlib;
	if (opt.debug) console.log(debugStr, stdlib);
	var fn = new Function(str);

	return fn();
}