'use strict'

const Compiler = require('../glsl-transpiler')

// import CodeMirror from 'codemirror'
// import 'codemirror/mode/javascript'
// import 'codemirror/lib/codemirror.css'

// var myCodeMirror = CodeMirror(document.body, {
//   value: "function myScript(){return 100;}\n",
//   mode:  "javascript"
// });

document.body.style.margin = 0

let input = document.body.appendChild(document.createElement('textarea'))
input.setAttribute('placeholder', 'glsl...')
input.style.width = '50vw'
input.style.position = 'absolute'
input.style.height = '100vh'
input.style.boxSizing = 'border-box'
input.style.resize = 'none'
input.style.border = 'none'
input.style.padding = '.5rem';
input.style.borderRight = '1px solid #f0f1f2';

let output = document.body.appendChild(document.createElement('textarea'))
output.setAttribute('placeholder', '...js')
output.setAttribute('disabled', true)
output.style.width = '50vw'
output.style.position = 'absolute'
output.style.height = '100vh'
output.style.right = 0
output.style.boxSizing = 'border-box'
output.style.resize = 'none'
output.style.border = 'none'
output.style.padding = '.5rem';
output.style.background = '#fafbfc';


input.addEventListener('change', e => {
	try {
		output.value = Compiler().compile(input.value).trim()
		output.style.color = 'inherit'
	}
	catch (e) {
		output.style.color = 'red'
		output.value = e
	}
})
