/**
 * Descriptor of a node.
 *
 * @module  glsl-js/lib/descriptor
 */
var extend = require('xtend/mutable');


/**
 * Constructor of descriptor - a result of mapping a glsl node to js.
 *
 * @param {string} str Result of rendering, complex version (unoptimized)
 * @param {object} options Object with options:
 *
 * @param {array} options.components List of per-component descriptors, eg for vec2 it is descriptor as if each value was rendered separately
 * @param {string} options.type Output type of descriptor
 * @param {string} options.visible Whether component should be visible in output
 * @param {number} options.complexity Empiric difficulty of calculation of the descriptor
 * @param {string|array} options.include List of stdlib methods to include for a node, if complex version is applied
 */
function Descriptor (str, options) {
	//strings which are rendered to something
	if (str != null) {
		var descriptor = new String((str+'').trim());
		descriptor.visible = true;
	}
	//strings which are rendered to nothing, like preprocessors etc
	else {
		var descriptor = new String();
		descriptor.visible = false;
	}

	//take over existing info
	if (str instanceof String) {
		extend(descriptor, str);
	}

	//take over options
	extend(descriptor, options);

	//init values
	if (descriptor.components == null) {
		descriptor.components = [descriptor];
	}
	//set type based on number of components.
	if (descriptor.type == null) {
		var l = descriptor.components.length;
		if (l === 1) descriptor.type = 'float';
		else if (l <= 4) descriptor.type = 'vec' + l;
		else descriptor.type = 'mat' + Math.sqrt(l)|0;
	}
	//set complexity as a sum of components
	if (descriptor.complexity == null) {
		descriptor.complexity = descriptor.components.reduce(function (prev, curr) {
			return prev + curr.complexity||0;
		}, 0);
	};

	return descriptor;
}

module.exports = Descriptor;
