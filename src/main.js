import { InstanceBase, InstanceStatus, Regex } from '@companion-module/base'
import { call, watch } from './api.js'
import { variablesFrom } from './state.js'
import { fromState, probe, atLeast, BEHAVIOUR } from './caps.js'
import { RELEASE, isVersion } from './release.js'
import updateActions from './actions.js'
import updateFeedbacks from './feedbacks.js'
import updateVariableDefinitions from './variables.js'
import updatePresets from './presets.js'

// MMG D:ONE.
//
// The device pushes its whole state on one Server-Sent Events stream, so this
// module polls nothing. Buttons post; the stream reports. That ordering is the
// design: a surface that updated itself optimistically would show the source it
// asked for rather than the source the unit has, and those differ exactly when
// it matters — when the source has gone away.
//
// Module API 2.x: Companion imports this file and expects a DEFAULT-EXPORTED
// class. There is no runEntrypoint() — that is the 1.x contract, which the
// public JS template still uses, and building against it produces a module
// Companion loads and then fails to register with "runEntrypoint is not a
// function".

const FEEDBACKS = [
	'source_is',
	'source_index_is',
	'source_live',
	'quad_enabled',
	'quad_slot_is',
	'quad_audio_is',
	'media_playing',
	'display_connected',
]

export default class DOneInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.state = {}
		this.stop = null
		// The source list drives every dropdown. Kept so definitions are rebuilt
		// when it CHANGES rather than on every frame — re-registering actions at
		// 1 Hz makes the config UI unusable while someone is editing a button.
		this.sourcesKey = ''
		// What this unit can do, and what firmware it runs. Capabilities decide
		// which buttons exist; the version decides how existing ones behave.
		this.caps = {}
		this.firmware = ''
	}

	async init(config) {
		this.config = config
		updateVariableDefinitions(this)
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.connect()
	}

	async destroy() {
		if (this.stop) this.stop()
		this.stop = null
	}

	async configUpdated(config) {
		this.config = config
		if (this.stop) this.stop()
		this.connect()
	}

	connect() {
		if (!this.config?.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the address')
			return
		}
		if (RELEASE.keyRequired && !this.config?.key) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the address and an API key')
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.detect()
		this.stop = watch(this.config, {
			onUp: () => this.updateStatus(InstanceStatus.Ok),
			onDown: (why) => this.updateStatus(InstanceStatus.ConnectionFailure, why),
			onState: (s) => this.onState(s),
		})
	}

	/**
	 * Ask the unit what it is and what it has, once, at connect.
	 *
	 * Failures do not clear caps: a unit answering the event stream but not
	 * this is still a unit, and removing every button because one probe timed
	 * out is worse than the gap it would fix.
	 */
	async detect() {
		try {
			const info = await this.api('GET', '/api/info')
			this.firmware = info?.release?.image_version || ''
			this.caps = { ...this.caps, ...(await probe((m, p) => this.api(m, p))) }
			this.log(
				'info',
				`firmware ${this.firmware || 'unknown'}; ` +
					(this.caps.serviceKeys ? 'service keys' : 'PIN auth only (pre-service-key firmware)')
			)
			this.checkFirmwareSupported()
			this.updateActions()
			this.updateFeedbacks()
			this.updatePresets()
		} catch (e) {
			this.log('warn', `could not read what this unit supports: ${e.message}`)
		}
	}

	/**
	 * Say so when the unit is older than this build supports.
	 *
	 * Companion pins a module version per connection and will happily run this
	 * one against a unit it was never meant for — the customer picks a number
	 * from a list with nothing to tell them which fits, and an auto-update can
	 * move them off the one that did. The device knows its own firmware, so the
	 * module can answer the question instead of leaving a failure to be
	 * interpreted.
	 *
	 * A warning, not a failure: much of the API is the same across these
	 * versions and a rack that half works beats a rack that refuses. An
	 * unreadable version says nothing at all — the earliest unit reports a bare
	 * commit, and guessing from that is how you tell somebody their working
	 * setup is wrong.
	 */
	checkFirmwareSupported() {
		// The absence of /api/tokens is the firm answer, and the one that covers
		// the earliest unit: it reports a bare commit rather than a version, so
		// there is nothing to compare, but a unit that cannot issue a service key
		// certainly cannot satisfy a build that requires one.
		const noKeys = RELEASE.keyRequired && this.caps.serviceKeys === false
		const tooOld = isVersion(this.firmware) && !atLeast(this.firmware, RELEASE.minFirmware)
		if (!noKeys && !tooOld) return
		const runs = isVersion(this.firmware) ? `runs ${this.firmware}` : 'predates service keys'
		const msg = `Unit ${runs}; this module version is for ${RELEASE.minFirmware} and later. Install the module version matching your unit.`
		this.log('warn', msg)
		this.updateStatus(InstanceStatus.UnknownWarning, msg)
	}

	/** Does this unit's firmware have a given BEHAVIOUR (not merely a route)? */
	behaviour(name) {
		return atLeast(this.firmware, BEHAVIOUR[name])
	}

	/** One request, with the configured credential. Used by actions. */
	api(method, path, body) {
		return call(this.config, method, path, body)
	}

	onState(s) {
		this.state = s

		// NUL, not a space: NDI names contain spaces, so ["A B","C"] and
		// ["A","B C"] would key identically and the dropdowns would not refresh.
		// Subsystem capabilities come free with the frame: the unit publishes a
		// key per subsystem, so a missing one means the subsystem is not there.
		const caps = { ...this.caps, ...fromState(s) }
		const capsChanged = JSON.stringify(caps) !== JSON.stringify(this.caps)
		this.caps = caps

		const key = (s.sources || []).join('\u0000')
		if (key !== this.sourcesKey || capsChanged) {
			this.sourcesKey = key
			this.updateActions()
			this.updateFeedbacks()
			this.updatePresets()
		}

		this.setVariableValues(variablesFrom(s))

		// 2.x wants the ids: checkFeedbacks() with no argument checks nothing.
		this.checkFeedbacks(...FEEDBACKS)
	}

	updateActions() {
		updateActions(this)
	}
	updateFeedbacks() {
		updateFeedbacks(this)
	}
	updatePresets() {
		updatePresets(this)
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Address',
				width: 8,
				regex: Regex.HOSTNAME,
				tooltip: 'The unit IP or hostname, e.g. 192.168.1.23 or mmg-d1-xxxxxxxx.local',
			},
			{
				type: 'textinput',
				id: 'key',
				label: RELEASE.keyRequired ? 'API key' : 'API key or PIN (optional)',
				width: 12,
				tooltip: RELEASE.keyRequired
					? 'Make one on the unit: Settings > API keys, with OPERATOR scope. Operator reaches everything this module does and cannot reconfigure the network or reset the device. A key lasts until you revoke it; the PIN and password sign-ins expire and are not suitable for a control surface.'
					: 'Leave empty if the unit has no PIN set — that firmware leaves every route open and the address is all it needs. If a PIN is set, put it here.',
			},
		]
	}
}
