/**
 * Descriptor of a node.
 *
 * @module  glsl-js/lib/descriptor
 */
var extend = require('xtend/mutable');

function Descriptor (str, options) {
	//strings which are rendered to something
	if (str) {
		var descriptor = extend(new String((str+'').trim()), {
			components: [str],
			type: 'float',
			complexity: 0,
			visible: true
		});
	}
	//strings which are rendered to nothing, like preprocessors etc
	else {
		var descriptor = extend(new String(), {
			components: [],
			visible: false
		});
	}

	//take over existing info
	if (str instanceof String) {
		extend(descriptor, str);
	}

	//take over options
	extend(descriptor, options);

	return descriptor;
}

module.exports = Descriptor;
