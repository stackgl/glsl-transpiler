var test = require('tape')
var tokenize = require('glsl-tokenizer/string')
var parse = require('glsl-parser/direct')
var GLSL = require('../')
var compile = GLSL.compile
var TokenStream = require('glsl-tokenizer/stream')
var ParseStream = require('glsl-parser/stream')
var CompileStream = require('../stream')
var test = require('tape')
var StringStream = require('stream-array')
var Sink = require('stream').Writable
var eval = require('./util/eval')
var clean = require('cln')
var glsl = require('glslify')


var compile = GLSL({})
