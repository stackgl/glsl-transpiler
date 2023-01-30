/**
 * A collection of builtins with types
 */

const builtins = {
gl_NumWorkGroups: 'uvec3',
gl_WorkGroupSize: 'uvec3',
gl_WorkGroupID: 'uvec3',
gl_LocalInvocationID: 'uvec3',
gl_GlobalInvocationID: 'uvec3',
gl_LocalInvocationIndex: 'uint',
gl_VertexID: 'int',
gl_InstanceID: 'int',
gl_Position: 'vec4',
gl_PointSize: 'float',
gl_ClipDistance: 'float',
gl_FragCoord: 'vec4',
gl_FragColor: 'vec4',
gl_FrontFacing: 'bool',
gl_PointCoord: 'vec2',
gl_PrimitiveID: 'int',
gl_SampleID: 'int',
gl_SamplePosition: 'vec2',
gl_SampleMaskIn: 'int',
gl_Layer: 'int',
gl_ViewportIndex: 'int',
gl_FragDepth: 'float',
gl_SampleMask: 'int',
}

export default builtins