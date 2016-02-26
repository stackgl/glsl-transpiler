/**
 * @module  glsl-js/stdlib
 */

var extend = require('xtend/mutable');

extend(exports, require('./lib/types'));
extend(exports, require('./lib/math'));


//Preprocessor directives
`
#
#define
#undef
#if
#ifdef
#ifndef
#else
#elif
#endif
#error
#pragma
#extension
#version
#line
defined
##
`;