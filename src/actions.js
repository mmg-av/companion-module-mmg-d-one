// What a button DOES.
//
// Every action posts and returns. It deliberately does not update local state:
// the unit answers on the event stream a moment later, and having one source of
// truth means a button cannot show "source B" because we asked for it while the
// device is actually still on A because the source went away.

const SLOTS = [0, 1, 2, 3].map((n) => ({ id: n, label: `Slot ${n + 1}` }))

export default function updateActions(self) {
	// Built from the live source list, so the dropdown holds what the unit can
	// actually see. allowCustom because a show is built before the cameras are
	// on: an operator needs to name a source that is not discovered yet, and
	// Companion variables are legitimate here too.
	const sourceChoices = (self.state.sources || []).map((n) => ({ id: n, label: n }))

	// ── taking the screen ───────────────────────────────────────────────────
	//
	// POST /api/source selects a source but does NOT take the screen: if the
	// quad is up, or a file or playlist is running, the device reports the
	// source as selected and live while the screen carries on showing what it
	// was. Verified against a unit with /api/snapshot — the API says yes and
	// the glass disagrees.
	//
	// The device's own web UI does the sequencing instead (applySingleSource in
	// SourceCard.vue): drop the quad, stop media or playlist, then select. This
	// repeats it, which is a SECOND IMPLEMENTATION of something that belongs in
	// the device — and is therefore temporary.
	//
	// ⚠️ DELETE THIS when POST /api/source takes the screen itself. Leaving it
	// in after that would issue three needless requests and, worse, turn a
	// deliberate "load without switching" into an unwanted cut.
	//
	// We can do it cheaply where the browser cannot: the event stream already
	// told us what is on screen, so nothing here has to ask first.
	const takeScreen = async () => {
		// Firmware that does this itself needs none of it — and running it there
		// would be worse than redundant, because it would turn a deliberate
		// "load without switching" into a cut. Version, not probe: the route
		// exists either way and answers 200 either way.
		if (self.behaviour && self.behaviour('sourceTakesScreen')) return
		const s = self.state
		if (s.quad?.enabled) await self.api('POST', '/api/quad/enable', { enabled: false })
		if (s.playlist?.state === 'playing') await self.api('POST', '/api/playlist/stop', {})
		else if (s.media?.active) await self.api('POST', '/api/media/stop', {})
	}

	const post = (path, body) => async (event) => {
		try {
			await self.api('POST', path, typeof body === 'function' ? body(event) : body)
		} catch (e) {
			self.log('error', `${path}: ${e.message}`)
		}
	}

	const defs = {
		// ── the main one ────────────────────────────────────────────────────
		select_source: {
			name: 'Source: select',
			options: [
				{
					id: 'name',
					type: 'dropdown',
					label: 'NDI source',
					default: sourceChoices[0]?.id ?? '',
					choices: sourceChoices,
					allowCustom: true,
					tooltip: 'The list is what the unit can currently see. Type a name to use one that is not on yet.',
				},
			],
			callback: async (event) => {
				try {
					await takeScreen()
					await self.api('POST', '/api/source', { name: event.options.name })
				} catch (e) {
					self.log('error', `select source: ${e.message}`)
				}
			},
		},
		// Pick by POSITION, not by name.
		//
		// A module cannot create buttons — Companion reserves page layout for
		// the operator, and rightly, since a module that could rewrite a page
		// could wreck a show. This is the way to the same end: a fixed page of
		// eight buttons where button 3 means "whatever source 3 is now". Pair
		// it with the source_3 variable for the label and the page follows the
		// network without anybody editing it.
		//
		// Resolved at press time against the live list, so a source appearing
		// or going away re-numbers the buttons rather than stranding them.
		select_source_index: {
			name: 'Source: select by position (1-8)',
			options: [{ id: 'index', type: 'number', label: 'Position in the source list', default: 1, min: 1, max: 8 }],
			callback: async (event) => {
				const list = self.state.sources || []
				const name = list[Number(event.options.index) - 1]
				if (!name) {
					self.log('warn', `no source at position ${event.options.index} (${list.length} discovered)`)
					return
				}
				try {
					await takeScreen()
					await self.api('POST', '/api/source', { name })
				} catch (e) {
					self.log('error', `select by position: ${e.message}`)
				}
			},
		},
		source_flip: {
			name: 'Source: flip',
			options: [
				{
					id: 'flip',
					type: 'dropdown',
					label: 'Orientation',
					default: 'none',
					choices: ['none', 'rotate_180', 'mirror_h', 'mirror_v'].map((f) => ({ id: f, label: f })),
				},
			],
			callback: post('/api/source/flip', (e) => ({ flip: e.options.flip })),
		},

		// ── quad multiview ──────────────────────────────────────────────────
		quad_enable: {
			name: 'Quad: on / off / toggle',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Set',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: post('/api/quad/enable', (e) => ({
				enabled: e.options.mode === 'toggle' ? !self.state.quad?.enabled : e.options.mode === 'on',
			})),
		},
		quad_slot: {
			name: 'Quad: put a source in a slot',
			options: [
				{ id: 'slot', type: 'dropdown', label: 'Slot', default: 0, choices: SLOTS },
				{
					id: 'name',
					type: 'dropdown',
					label: 'NDI source',
					default: sourceChoices[0]?.id ?? '',
					choices: sourceChoices,
					allowCustom: true,
				},
			],
			callback: post('/api/quad/slot', (e) => ({ slot: Number(e.options.slot), name: e.options.name })),
		},
		quad_clear_slot: {
			name: 'Quad: clear a slot',
			options: [{ id: 'slot', type: 'dropdown', label: 'Slot', default: 0, choices: SLOTS }],
			callback: post('/api/quad/slot', (e) => ({ slot: Number(e.options.slot), name: '' })),
		},
		quad_audio: {
			name: 'Quad: which slot is heard',
			options: [{ id: 'slot', type: 'dropdown', label: 'Slot', default: 0, choices: SLOTS }],
			callback: post('/api/quad/audio', (e) => ({ slot: Number(e.options.slot) })),
		},
		quad_promote: {
			name: 'Quad: take a slot full screen',
			options: [{ id: 'slot', type: 'dropdown', label: 'Slot', default: 0, choices: SLOTS }],
			callback: post('/api/quad/promote', (e) => ({ slot: Number(e.options.slot) })),
		},

		// ── media and playlist ──────────────────────────────────────────────
		media_play: {
			name: 'Media: play a file',
			options: [{ id: 'path', type: 'textinput', label: 'Path on the unit', default: '', useVariables: true }],
			callback: async (event) => {
				const path = await self.parseVariablesInString(event.options.path)
				try {
					await self.api('POST', '/api/media/play', { path })
				} catch (e) {
					self.log('error', `media/play: ${e.message}`)
				}
			},
		},
		media_transport: {
			name: 'Media: pause / resume / stop',
			options: [
				{
					id: 'what',
					type: 'dropdown',
					label: 'Do',
					default: 'pause',
					choices: ['pause', 'resume', 'stop'].map((w) => ({ id: w, label: w })),
				},
			],
			callback: async (event) => {
				try {
					await self.api('POST', `/api/media/${event.options.what}`, {})
				} catch (e) {
					self.log('error', `media: ${e.message}`)
				}
			},
		},
		playlist_transport: {
			name: 'Playlist: play / stop / next / previous',
			options: [
				{
					id: 'what',
					type: 'dropdown',
					label: 'Do',
					default: 'play',
					choices: ['play', 'stop', 'next', 'prev'].map((w) => ({ id: w, label: w })),
				},
			],
			callback: async (event) => {
				try {
					await self.api('POST', `/api/playlist/${event.options.what}`, {})
				} catch (e) {
					self.log('error', `playlist: ${e.message}`)
				}
			},
		},

		// ── output ──────────────────────────────────────────────────────────
		display_mode: {
			name: 'Display: set output mode',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: self.state.display?.active_mode ?? '',
					choices: (self.state.display?.available_modes || []).map((m) => ({ id: m, label: m })),
					allowCustom: true,
				},
			],
			callback: post('/api/display/set-mode', (e) => ({ mode: e.options.mode })),
		},
		volume: {
			name: 'Audio: set volume',
			options: [{ id: 'volume', type: 'number', label: 'Volume', default: 75, min: 0, max: 100 }],
			callback: post('/api/audio', (e) => ({ volume: Number(e.options.volume) })),
		},
	}

	// Hide what this unit cannot do, rather than offer a button that 404s.
	// Capabilities come from the state frame, so an older unit with no playlist
	// subsystem simply has no playlist actions — which is the honest answer and
	// costs nothing to be wrong about, because an absent key means absent.
	const needs = {
		quad_enable: 'quad',
		quad_slot: 'quad',
		quad_clear_slot: 'quad',
		quad_audio: 'quad',
		quad_promote: 'quad',
		media_play: 'media',
		media_transport: 'media',
		playlist_transport: 'playlist',
	}
	for (const [id, cap] of Object.entries(needs)) {
		if (self.caps && Object.prototype.hasOwnProperty.call(self.caps, cap) && !self.caps[cap]) delete defs[id]
	}

	self.setActionDefinitions(defs)
}
