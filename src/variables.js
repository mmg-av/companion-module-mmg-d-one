// Text a button can show, and that other Companion actions can read.
//
// Keyed by id, which is the 2.x shape: the 1.x array of {variableId, name} is
// silently accepted as an object with numeric keys and produces variables
// nobody can reference.

export default function updateVariableDefinitions(self) {
	self.setVariableDefinitions({
		device_name: { name: 'Device name' },
		device_title: { name: 'Device label' },
		firmware: { name: 'Firmware version' },
		source_name: { name: 'Selected source' },
		source_live: { name: 'Selected source is live (yes/no)' },
		source_count: { name: 'NDI sources discovered' },
		source_1: { name: 'Source 1 (by position in the list)' },
		source_2: { name: 'Source 2 (by position in the list)' },
		source_3: { name: 'Source 3 (by position in the list)' },
		source_4: { name: 'Source 4 (by position in the list)' },
		source_5: { name: 'Source 5 (by position in the list)' },
		source_6: { name: 'Source 6 (by position in the list)' },
		source_7: { name: 'Source 7 (by position in the list)' },
		source_8: { name: 'Source 8 (by position in the list)' },
		quad_enabled: { name: 'Quad on (yes/no)' },
		quad_audio_slot: { name: 'Quad slot being heard (1-4, or none)' },
		quad_slot_1: { name: 'Quad slot 1 source' },
		quad_slot_2: { name: 'Quad slot 2 source' },
		quad_slot_3: { name: 'Quad slot 3 source' },
		quad_slot_4: { name: 'Quad slot 4 source' },
		media_state: { name: 'Media state (playing/paused/stopped)' },
		media_path: { name: 'Media file playing' },
		media_remaining: { name: 'Media time remaining (m:ss)' },
		playlist_state: { name: 'Playlist state' },
		display_mode: { name: 'Output mode' },
		display_connected: { name: 'Display connected (yes/no)' },
		volume: { name: 'Volume' },
		visual_mode: { name: 'Visual mode' },
	})
}
