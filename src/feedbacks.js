// What a button SHOWS.
//
// All of these read this.state, which is whatever the event stream last said.
// None of them make a request: a feedback runs whenever Companion redraws, and
// a rack of buttons that each hit the device on redraw is how a control surface
// becomes the reason a unit is slow.

const SLOTS = [0, 1, 2, 3].map((n) => ({ id: n, label: `Slot ${n + 1}` }))
const GREEN = 0x00a550
const RED = 0xcc0000

export default function updateFeedbacks(self) {
	self.setFeedbackDefinitions({
		source_is: {
			name: 'Source is selected',
			type: 'boolean',
			description: 'Lights when this NDI source is the one on screen.',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [
				{
					id: 'name',
					type: 'dropdown',
					label: 'NDI source',
					default: (self.state.sources || [])[0] ?? '',
					choices: (self.state.sources || []).map((n) => ({ id: n, label: n })),
					allowCustom: true,
				},
			],
			callback: (fb) => self.state.source?.name === fb.options.name,
		},
		source_index_is: {
			name: 'Source at this position is selected',
			type: 'boolean',
			description: 'Pairs with "select by position" so a fixed page follows the live source list.',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [{ id: 'index', type: 'number', label: 'Position', default: 1, min: 1, max: 8 }],
			callback: (fb) => {
				const name = (self.state.sources || [])[Number(fb.options.index) - 1]
				return !!name && self.state.source?.name === name
			},
		},
		source_live: {
			name: 'Source is live',
			type: 'boolean',
			description:
				'Lights while frames are actually arriving. Selected and live are different things — a source can be chosen and not sending, which is exactly the case worth seeing from across a room.',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [],
			callback: () => self.state.source?.live === true,
		},
		quad_enabled: {
			name: 'Quad is on',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [],
			callback: () => self.state.quad?.enabled === true,
		},
		quad_slot_is: {
			name: 'Quad slot holds a source',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [
				{ id: 'slot', type: 'dropdown', label: 'Slot', default: 0, choices: SLOTS },
				{
					id: 'name',
					type: 'dropdown',
					label: 'NDI source',
					default: (self.state.sources || [])[0] ?? '',
					choices: (self.state.sources || []).map((n) => ({ id: n, label: n })),
					allowCustom: true,
				},
			],
			callback: (fb) => self.state.quad?.slots?.[Number(fb.options.slot)]?.name === fb.options.name,
		},
		quad_audio_is: {
			name: 'Quad slot is the one heard',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [{ id: 'slot', type: 'dropdown', label: 'Slot', default: 0, choices: SLOTS }],
			callback: (fb) => self.state.quad?.audio_slot === Number(fb.options.slot),
		},
		media_playing: {
			name: 'Media is playing',
			type: 'boolean',
			description: 'Playing, not merely loaded — paused counts as not playing.',
			defaultStyle: { bgcolor: GREEN, color: 0xffffff },
			options: [],
			callback: () => self.state.media?.active === true && self.state.media?.paused !== true,
		},
		display_connected: {
			name: 'Display is connected',
			type: 'boolean',
			description:
				'A dark wall and a dead unit look identical from the other end of a building. This tells them apart.',
			defaultStyle: { bgcolor: RED, color: 0xffffff },
			options: [],
			callback: () => self.state.display?.connected === false,
		},
	})
}
