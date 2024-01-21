import al from 'almost-equal'

export default function almost(a, b) {
	if (a.length) {
		for (let i = 0; i < a.length; i++) {
			if (!almost(a[i], b[i])) {
				return false
			}
		}
		return true
	}

	return al(a, b, 1e-6)
}
