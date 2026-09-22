// What this unit can actually do.
//
// ── Why not a table of versions ──────────────────────────────────────────────
//
// The obvious design is a map from firmware version to feature set. It is also
// a second source of truth: it has to be edited every release, it is edited by
// somebody who is not looking at the device, and when it is wrong the module
// offers a button that 404s or hides one that works. The device already knows
// the answer.
//
// So: two free signals and one cheap one.
//
//   the state frame  — the unit publishes a key per subsystem, so a missing
//                      `bridge` key means no bridge. Costs nothing; it arrives
//                      anyway.
//   a probe          — for things with no state, one HEAD-ish GET at connect.
//                      404 is the device saying no.
//
// Version is still read and published as a variable, because a human debugging
// a rack wants to see it. It is not used to decide anything.

const PROBES = [
	// Service keys. Their absence is what distinguishes the earliest shipped
	// units, which authenticate with a UI PIN and nothing else — the module
	// cannot offer "make a key" advice to a unit that has no such concept.
	['serviceKeys', '/api/tokens'],
	// A JPEG of the real output. Worth having: it is the only endpoint that
	// reports what is ON THE SCREEN rather than what was set.
	['snapshot', '/api/snapshot'],
]

/** Derived from a state frame. Free — the frame arrives regardless. */
function fromState(state) {
	return {
		bridge: 'bridge' in state,
		playlist: 'playlist' in state,
		media: 'media' in state,
		quad: 'quad' in state,
		wifi: 'wifi' in state,
		transcode: 'transcode' in state,
	}
}

/** One request each, at connect. `call` is the module's api helper. */
async function probe(call) {
	const out = {}
	for (const [name, path] of PROBES) {
		try {
			await call('GET', path)
			out[name] = true
		} catch (e) {
			// A 404 is an answer; anything else is a network problem and should
			// not be recorded as "the unit cannot do this" — assuming absence on
			// a timeout would quietly remove working buttons from a live rack.
			out[name] = /404/.test(e.message) ? false : true
		}
	}
	return out
}

// ── Behaviour, which cannot be probed ────────────────────────────────────────
//
// A probe answers "does this route exist". It cannot answer "does this route
// still mean what it meant", and that is the change that hurts: POST
// /api/source returns 200 whether or not it takes the screen. Same URL, same
// status, different device.
//
// So existence is detected and BEHAVIOUR is versioned. This table is the only
// place the module cares what firmware it is talking to, and every entry needs
// a reason, because a version gate with no explanation is impossible to retire.

const BEHAVIOUR = {
	// POST /api/source leaves the quad and stops media on its own, instead of
	// selecting a source that the quad then covers.
	//
	// null = not in any released firmware yet. Until this is a version, the
	// module keeps doing the sequencing itself (takeScreen in actions.js).
	//
	// ⚠️ When the device change ships, put its version here AND delete
	// takeScreen. Leaving both would issue three needless requests and turn a
	// deliberate load-without-switching into an unwanted cut.
	sourceTakesScreen: null,
}

/**
 * Is `have` at least `want`? False when either is unknown.
 *
 * Unknown means NO deliberately: an unreadable version must not be treated as
 * new. Getting that backwards would disable a workaround on a unit that still
 * needs it, and the symptom would be a source that silently does not appear.
 */
function atLeast(have, want) {
	if (!have || !want) return false
	const a = String(have).split('.').map((n) => parseInt(n, 10) || 0)
	const b = String(want).split('.').map((n) => parseInt(n, 10) || 0)
	for (let i = 0; i < 3; i++) {
		if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0)
	}
	return true
}

export { fromState, probe, atLeast, BEHAVIOUR }

