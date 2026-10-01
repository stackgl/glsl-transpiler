# Implementation and test map

The compiler has three stages: preprocess source, parse with Subscript, and lower typed expressions and statements to JavaScript.

`lib/parse.js` configures Subscript's Pratt parser for GLSL precedence and adds statement/declaration parsing. It saves and restores the shared operator registry so other Subscript dialects can coexist. Comments are whitespace; preprocessor line continuations are joined before macro expansion. Parsing errors include a location in the preprocessed source.

`lib/index.js` owns compilation state, scopes, function signatures, bindings, and AST transforms. A new compilation clears symbols, cached descriptors, and collected helpers. Function signatures are registered before bodies so prototypes and forward calls have types. Captured lvalues evaluate once and use names containing `$`, which cannot collide with GLSL identifiers.

`lib/types.js` shares constructor implementations across vector types and matrix dimensions. `lib/operators.js` handles typed arithmetic and matrix multiplication. `lib/descriptor.js` carries component expressions, dimensions, and whether expansion is safe. Expressions with side effects cannot be duplicated by optimization.

`lib/stdlib.js`, `lib/stdlib300.js`, and `lib/texture.js` provide runtime helpers. Functions must be self-contained or declare `.include` dependencies, because the compiler serializes only the helpers a shader needs. Texture and derivative hooks establish the boundary with the host renderer.

| Area | Tests |
| --- | --- |
| GLSL syntax, precedence, comments, macro versions, errors, parser isolation | `test/parser.js`, `test/preprocessor.js` |
| Shader input/output metadata, layouts, uniform blocks, built-in inputs | `test/parser.js`, `test/builtins.js` |
| Source streams, chunk boundaries, failures, compile reuse | `test/parser.js`, `test/api.js` |
| Scalars, signed/unsigned conversions, bitwise operations, overflow | `test/primitives.js`, `test/webgl2.js` |
| Vector constructors, swizzles, comparisons, value copies | `test/vectors.js`, `test/webgl2.js` |
| All matrix shapes, indexing, column writes, products, conversion | `test/matrices.js`, `test/webgl2.js` |
| Structures, array fields, arrays of matrices, array lengths | `test/structs.js`, `test/webgl2.js` |
| Overloads, prototypes, value parameters, output lvalues | `test/functions.js`, `test/parser.js`, `test/webgl2.js` |
| Math, rounding, NaN/infinity, bit reinterpretation, packing | `test/math.js`, `test/webgl2.js` |
| Texture families, mip levels, integer samplers, cubes, shadows, host hooks | `test/textures.js` |
| Branches, loops, declaration conditions, switch, discard | `test/parser.js`, `test/webgl2.js`, `test/textures.js` |
| Single evaluation, safe generated names, scope and state isolation | `test/webgl2.js`, `test/parser.js` |
| Historical grammar stress fixture and executable sound shader | `test/index.js`, `test/fixture/` |

`npm run test:coverage` runs the full suite while counting each AST transform. This is a reachability check, not proof that every overload or every branch is correct. Numerical tests separately exercise emitted code. The grammar stress fixture deliberately includes semantically invalid GLSL and is tested for translation only; the sound shader is executed.

The v3 skipped examples were audited: valid cases now execute, stale output snapshots became behavior tests, and empty scaffolds or invalid validation assertions were removed. Strict GLSL semantic validation, shader linking, GPU precision matching, and WebGL rendering remain outside this library's contract. The sampler's nearest/clamp policy is a reference implementation, not an implementation of every WebGL texture state.
