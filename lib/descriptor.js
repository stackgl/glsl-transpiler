/**
 * Descriptor of a node.
 *
 * @module  glsl-transpiler/lib/descriptor
 */
import types from './types.js'
import pick from 'pick-by-alias'

/**
 * Constructor of descriptor - a result of mapping a glsl node to js.
 *
 * @param {string} str Result of rendering, complex version (unoptimized)
 * @param {object} options Object with options:
 *
 * @param {array} options.components List of per-component descriptors, eg for vec2 it is descriptor as if each value was rendered separately
 * @param {string} options.type Output type of descriptor
 * @param {string} options.visible Whether component should be visible in output
 * @param {number} options.complexity Empiric difficulty of calculation of the main descriptor string. Each component contains its own complexity metric.
 * @param {string|array} options.include List of stdlib methods to include for a node, if complex version is applied
 * @param {bool} options.optimize Whether to try to optimize the result.
 */
function Descriptor(str, options) {
	//strings which are rendered to something
	if (str != null) {
		var descriptor = new String((str + '').trim());
		descriptor.visible = true;
	}
	//strings which are rendered to nothing, like preprocessors etc
	else {
		var descriptor = new String();
		descriptor.visible = false;
	}

	//take over existing info
	if (str instanceof String) {
		Object.assign(descriptor, pick(str, ['type', 'components', 'visible', 'complexity', 'include', 'optimize']));
	}

	//take over options
	if (options) {
		Object.assign(descriptor, pick(options, ['type', 'components', 'visible', 'complexity', 'include', 'optimize']))
	}

	//in case of undefined complexity we should opt out for average value
	//suppose that user will set desired max complexity in custom cases
	if (descriptor.complexity == null || isNaN(descriptor.complexity)) {
		descriptor.complexity = Math.max(50, descriptor.length);
	}

	//set type based on number of components.
	if (descriptor.type === undefined) {
		if (!(descriptor + '')) {
			descriptor.type = 'void';
			descriptor.components = [];
		}
		else if (descriptor.components == null) {
			descriptor.type = 'float';
			descriptor.components = [descriptor];
		}
		else {
			var l = descriptor.components.length;
			if (l === 1) descriptor.type = 'float';
			else if (l <= 4) descriptor.type = 'vec' + l;
			else descriptor.type = 'mat' + Math.sqrt(l) | 0;
		}
	}
	// null type means type can be any
	else if (descriptor.type === null) { }
	//type !== undefined (any), components == null → set components as item-access
	else if (descriptor.components == null) {
		descriptor.components = [];
		var l = types[descriptor.type].length;
		if (/mat/.test(descriptor.type)) l *= types[types[descriptor.type].type].length;
		if (l === 1) {
			descriptor.components = [descriptor];
		}
		else {
			for (var i = 0; i < l; i++) {
				descriptor.components[i] = Descriptor(`${descriptor}[${i}]`, {
					complexity: 1 + descriptor.complexity
				});
			}
		}
	}

	//set optimize flag if all children are optimizable
	if (descriptor.optimize == null && descriptor.components) {
		descriptor.optimize = descriptor.components.every(function (comp) {
			return !!comp && comp.optimize !== false;
		});
	}

	return descriptor;
}

export default Descriptor;
