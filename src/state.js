// Turning a device state frame into the text a button shows.
//
// A pure function, deliberately: this is the part with the fiddly bits — the
// off-by-one on slot numbering, "playing" versus "loaded but paused", a
// duration that is missing rather than zero — and a pure function can be
// tested against a real frame without Companion running at all.

const yn = (v) => (v ? 'yes' : 'no')

function mmss(ms) {
	const t = Math.max(0, ms | 0)
	return `${Math.floor(t / 60000)}:${String(Math.floor((t % 60000) / 1000)).padStart(2, '0')}`
}

function variablesFrom(s) {
	const slot = (n) => s.quad?.slots?.[n]?.name || ''
	const playing = s.media?.active === true && s.media?.paused !== true
	const left = s.media?.active ? (s.media.duration_ms || 0) - (s.media.elapsed_ms || 0) : 0

	return {
		device_name: s.info?.name || '',
		device_title: s.info?.title || '',
		firmware: s.info?.release?.image_version || '',
		source_name: s.source?.name || '',
		source_live: yn(s.source?.live),
		source_count: (s.sources || []).length,
		// Positional names, so a fixed page of buttons can mean "whatever
		// source 3 is right now". The alternative — a module writing buttons
		// itself — Companion does not allow, and should not: a page layout is
		// the operator's, not ours.
		...Object.fromEntries(
			Array.from({ length: 8 }, (_, i) => [`source_${i + 1}`, (s.sources || [])[i] || ''])
		),
		quad_enabled: yn(s.quad?.enabled),
		// 1-based for a human: the API counts slots from 0, the panel in front
		// of somebody does not. -1 means nothing is being heard, which is a
		// state rather than a slot.
		quad_audio_slot: typeof s.quad?.audio_slot === 'number' && s.quad.audio_slot >= 0 ? s.quad.audio_slot + 1 : 'none',
		quad_slot_1: slot(0),
		quad_slot_2: slot(1),
		quad_slot_3: slot(2),
		quad_slot_4: slot(3),
		media_state: s.media?.active ? (s.media.paused ? 'paused' : 'playing') : 'stopped',
		media_path: s.media?.path || '',
		// Empty rather than 0:00 when nothing is playing: a timer that reads
		// zero looks like a file that just ended.
		media_remaining: playing || s.media?.active ? mmss(left) : '',
		playlist_state: s.playlist?.state || '',
		display_mode: s.display?.active_mode || '',
		display_connected: yn(s.display?.connected),
		volume: s.audio?.volume ?? '',
		visual_mode: s.visualMode || '',
	}
}

export { variablesFrom, mmss }
