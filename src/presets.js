// Ready-made buttons, so a new user gets something working before reading
// anything. Presets are where a module stops being an API and starts being a
// product: drag one on, and the source it selects also lights up when it is
// live, without anyone wiring a feedback by hand.
//
// The 2.x shape is two things, not one. `setPresetDefinitions(structure,
// presets)` takes the SECTIONS — what the user browses — separately from the
// definitions they point at. The 1.x `category` field on each preset is gone;
// grouping lives in the structure now.

const GREEN = 0x00a550
const RED = 0xcc0000
const BLACK = 0x000000

const style = (text, size = '14') => ({ text, size, color: 0xffffff, bgcolor: BLACK })

// NDI names are "HOST (Source)" and a button is 72 pixels wide. The part in
// brackets is what distinguishes two feeds from the same machine, so that is
// the half worth keeping.
//
// NOT truncated. An earlier version cut it to 14 characters and the Bolin's
// two feeds — CAM_192.168.1.138_HB and _HX — both became "CAM_192.168.1.",
// which is worse than long: NDI names disambiguate at the END. Companion
// shrinks text to fit, so let it.
const short = (name) => {
	const m = name.match(/\(([^)]+)\)/)
	return m ? m[1] : name
}

export default function updatePresets(self) {
	const presets = {}
	const sources = []
	const quad = []
	const media = []
	const status = []

	for (const name of self.state.sources || []) {
		const id = `source_${name}`
		presets[id] = {
			type: 'simple',
			name,
			// NDI names are "HOST (Source)". Breaking before the bracket puts
			// the machine on one line and the source on the next, which is what
			// someone reads at a glance from the operating position.
			style: style(name.replace(/\s*\(/, '\\n(')),
			steps: [{ down: [{ actionId: 'select_source', options: { name } }], up: [] }],
			feedbacks: [{ feedbackId: 'source_is', options: { name }, style: { bgcolor: GREEN } }],
		}
		sources.push(id)
	}

	// ── a page that follows the network ─────────────────────────────────────
	//
	// Eight identical buttons, each bound to a POSITION rather than a name. The
	// label is the source_N variable, so a button reads whatever is third on
	// the network right now and selects that when pressed. Drop all eight on a
	// page once and it never needs editing again — which is the closest thing
	// to "populate a page from the device" that Companion permits, and better,
	// because the layout stays the operator's.
	//
	// A position with nothing in it shows blank and does nothing.
	const byIndex = []
	for (let i = 1; i <= 8; i++) {
		const id = `source_pos_${i}`
		presets[id] = {
			type: 'simple',
			name: `Source ${i} (by position)`,
			style: style(`$(D_ONE:source_${i})`, '7'),
			steps: [{ down: [{ actionId: 'select_source_index', options: { index: i } }], up: [] }],
			feedbacks: [{ feedbackId: 'source_index_is', options: { index: i }, style: { bgcolor: GREEN } }],
		}
		byIndex.push(id)
	}

	presets.quad_toggle = {
		type: 'simple',
		name: 'Quad on/off',
		style: style('QUAD'),
		steps: [{ down: [{ actionId: 'quad_enable', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'quad_enabled', options: {}, style: { bgcolor: GREEN } }],
	}
	quad.push('quad_toggle')

	for (const n of [0, 1, 2, 3]) {
		presets[`quad_audio_${n}`] = {
			type: 'simple',
			name: `Listen to slot ${n + 1}`,
			style: style(`AUDIO\\n${n + 1}`),
			steps: [{ down: [{ actionId: 'quad_audio', options: { slot: n } }], up: [] }],
			feedbacks: [{ feedbackId: 'quad_audio_is', options: { slot: n }, style: { bgcolor: GREEN } }],
		}
		presets[`quad_promote_${n}`] = {
			type: 'simple',
			name: `Slot ${n + 1} full screen`,
			style: style(`FULL\\n${n + 1}`),
			steps: [{ down: [{ actionId: 'quad_promote', options: { slot: n } }], up: [] }],
			feedbacks: [],
		}
		quad.push(`quad_audio_${n}`, `quad_promote_${n}`)
	}

	// ── filling the quad ────────────────────────────────────────────────────
	//
	// The reason these are generated rather than offered as one preset: a
	// preset bakes its options in, and "put a source in a slot" is two choices,
	// not one. So there is a button per combination, which is what a show
	// actually wants — an operator presses "slot 2 = Bolin", not a dialog.
	//
	// Bounded, because sources x 4 grows quickly and a preset list nobody can
	// scroll is worse than no presets. Past the limit the `quad_slot` action is
	// still there and takes both choices as fields.
	const srcs = self.state.sources || []
	const slots = []
	if (srcs.length && srcs.length * 4 <= 40) {
		for (const n of [0, 1, 2, 3]) {
			for (const name of srcs) {
				const id = `quad_put_${n}_${name}`
				presets[id] = {
					type: 'simple',
					name: `Slot ${n + 1} = ${name}`,
					style: style(`${n + 1}\\n${short(name)}`, '7'),
					steps: [{ down: [{ actionId: 'quad_slot', options: { slot: n, name } }], up: [] }],
					feedbacks: [{ feedbackId: 'quad_slot_is', options: { slot: n, name }, style: { bgcolor: GREEN } }],
				}
				slots.push(id)
			}
		}
	}
	for (const n of [0, 1, 2, 3]) {
		const id = `quad_clear_${n}`
		presets[id] = {
			type: 'simple',
			name: `Clear slot ${n + 1}`,
			style: style(`CLR\\n${n + 1}`),
			steps: [{ down: [{ actionId: 'quad_clear_slot', options: { slot: n } }], up: [] }],
			feedbacks: [],
		}
		slots.push(id)
	}

	presets.media_pause = {
		type: 'simple',
		name: 'Pause / resume',
		style: style('PAUSE'),
		steps: [{ down: [{ actionId: 'media_transport', options: { what: 'pause' } }], up: [] }],
		feedbacks: [{ feedbackId: 'media_playing', options: {}, style: { bgcolor: GREEN } }],
	}
	presets.media_stop = {
		type: 'simple',
		name: 'Stop',
		style: style('STOP'),
		steps: [{ down: [{ actionId: 'media_transport', options: { what: 'stop' } }], up: [] }],
		feedbacks: [],
	}
	media.push('media_pause', 'media_stop')
	for (const what of ['next', 'prev']) {
		presets[`playlist_${what}`] = {
			type: 'simple',
			name: `Playlist ${what}`,
			style: style(what.toUpperCase()),
			steps: [{ down: [{ actionId: 'playlist_transport', options: { what } }], up: [] }],
			feedbacks: [],
		}
		media.push(`playlist_${what}`)
	}

	// Status, not control. Worth a button because "the wall is dark" and "the
	// unit is dead" look identical from the operating position.
	presets.status = {
		type: 'simple',
		name: 'Source and state',
		style: style('$(D_ONE:source_name)\\n$(D_ONE:source_live)', '7'),
		steps: [{ down: [], up: [] }],
		feedbacks: [{ feedbackId: 'source_live', options: {}, style: { bgcolor: GREEN } }],
	}
	presets.no_display = {
		type: 'simple',
		name: 'Display disconnected warning',
		style: style('HDMI'),
		steps: [{ down: [], up: [] }],
		feedbacks: [{ feedbackId: 'display_connected', options: {}, style: { bgcolor: RED } }],
	}
	status.push('status', 'no_display')

	const structure = [
		{ id: 'sources', name: 'Sources', description: 'One per NDI source the unit can see.', definitions: sources },
		{
			id: 'sources-by-position',
			name: 'Sources by position',
			description:
				'A fixed page that follows the network: button 3 is whatever source 3 is now. Drop all eight once and never edit them again.',
			definitions: byIndex,
		},
		{ id: 'quad', name: 'Quad', description: 'Turn the multiview on, choose what is heard, take one full screen.', definitions: quad },
		{ id: 'quad-slots', name: 'Quad slots', description: 'Fill and clear the four panes.', definitions: slots },
		{ id: 'media', name: 'Media', definitions: media },
		{ id: 'status', name: 'Status', definitions: status },
	].filter((s) => s.definitions.length)

	self.setPresetDefinitions(structure, presets)
}
