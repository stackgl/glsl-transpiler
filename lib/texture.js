/** Deterministic nearest/clamp texture sampling, with per-sampler host overrides. */
export default function textureLookup(sampler, method, type, args) {
	if (!sampler) throw new TypeError(`${method} requires a sampler`)
	if (typeof sampler[method] === 'function') return sampler[method](...args)
	const array = /Array/.test(type), cube = /Cube/.test(type), volume = /3D/.test(type), shadow = /Shadow/.test(type)
	const dimension = volume ? 3 : 2
	const size = s => s.shape ? Array.from(s.shape).slice(0, volume || array ? 3 : 2) : [s.width, s.height, ...(volume || array ? [s.depth ?? s.layers] : [])]
	const level = lod => {
		lod = Math.max(0, Math.round(lod || 0))
		if (sampler.levels) {
			if (!sampler.levels[lod]) throw new RangeError(`Missing texture mip level ${lod}`)
			return sampler.levels[lod]
		}
		if (lod) throw new RangeError(`Missing texture mip level ${lod}`)
		return sampler
	}
	if (method === 'textureSize') { const s = level(args[0]); return size(cube ? s.faces?.[0] || s : s) }
	let coord = Array.from(args[0]), lod = 0, offset, dx, dy
	const fetch = method.startsWith('texelFetch'), project = method.includes('Proj'), grad = method.includes('Grad')
	if (fetch || method.includes('Lod')) { lod = args[1]; offset = args[2] }
	else if (grad) { dx = args[1]; dy = args[2]; offset = args[3] }
	else if (method.includes('Offset')) { offset = args[1]; lod = args[2] || 0 }
	else lod = args[1] || 0
	if (project) { const w = coord.pop(); coord = coord.map(x => x / w) }
	if (grad) {
		const base = sampler.levels?.[0] || sampler
		const dimensions = size(cube ? base.faces?.[0] || base : base)
		const length = d => Math.hypot(...Array.from(d, (v, i) => v * (dimensions[i] || dimensions[0])))
		lod = Math.max(0, Math.log2(Math.max(length(dx), length(dy))))
	}
	let source = level(lod), reference = shadow ? coord.at(-1) : null
	if (cube) {
		const [x,y,z] = coord, ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z)
		let face, u, v, major
		if (ax >= ay && ax >= az) { face = x >= 0 ? 0 : 1; u = x >= 0 ? -z : z; v = -y; major = ax }
		else if (ay >= az) { face = y >= 0 ? 2 : 3; u = x; v = y >= 0 ? z : -z; major = ay }
		else { face = z >= 0 ? 4 : 5; u = z >= 0 ? x : -x; v = -y; major = az }
		if (!source.faces?.[face]) throw new TypeError('Cube samplers require six faces')
		source = source.faces[face]; coord = [(u / major + 1) / 2, (v / major + 1) / 2]
	}
	const dimensions = size(source)
	if (!dimensions.every(n => Number.isInteger(n) && n > 0)) throw new TypeError('Sampler dimensions must be positive integers')
	const position = coord.slice(0, dimension).map((v, i) => fetch ? Math.trunc(v) : Math.floor(v * dimensions[i]))
	if (array) position.push(fetch ? Math.trunc(coord[2]) : Math.floor(coord[2] + 0.5))
	if (offset) for (let i = 0; i < dimension; i++) position[i] += offset[i]
	const channels = source.channels || 4
	if (fetch && position.some((v,i) => v < 0 || v >= dimensions[i])) return [0,0,0,0]
	for (let i = 0; i < position.length; i++) position[i] = Math.min(dimensions[i] - 1, Math.max(0, position[i]))
	const data = source.data || source
	let index = (position[0] + dimensions[0] * (position[1] + (dimensions[1] * (position[2] || 0)))) * channels
	const color = [0,0,0,1]
	for (let c = 0; c < Math.min(4,channels); c++) {
		if (source.stride) {
			index = (source.offset || 0) + position.reduce((n,p,i) => n + p * source.stride[i], 0)
			color[c] = data[index + c * source.stride[position.length]]
		} else color[c] = data[index + c]
	}
	if (shadow) return typeof sampler.compare === 'function' ? +sampler.compare(reference, color[0]) : +(reference <= color[0])
	return color
}
