// Which units this build of the module is for.
//
// Companion installs several versions of a module side by side and pins one
// PER CONNECTION, so a customer with two D:ONEs on different firmware runs two
// connections, each on the version that suits its unit. What Companion does NOT
// have is any way to say which version suits which unit: the manifest has
// `products` and `keywords` and nothing about what the module talks to, so the
// customer picks from a list of numbers with no guidance. Every other module in
// the store has the same gap.
//
// So the numbers ARE the guidance — a module version is named after the oldest
// firmware it supports — and this file is the one place a build says which one
// it is. Everything that differs between releases reads from here, so cutting a
// release is editing this file, not hunting for the places that care.
export const RELEASE = {
	// The oldest firmware this build supports. Newer units are fine; older ones
	// want an earlier module version, which the module says so at connect
	// rather than leaving somebody to work it out from a failure.
	minFirmware: '0.4.3',

	// Whether an API key is required.
	//
	// It is, from 0.5.5: that is when the unit gained /api/tokens, and a service
	// key is the only credential that outlives a show. Before it, a unit had no
	// such concept — with no PIN set every route is open, and with one set the
	// PIN buys a 12-hour session held in memory that a reboot ends. A control
	// surface cannot live on that, which is why the earliest build is the only
	// one where this is false.
	keyRequired: false,
}

/** Is `v` a version we can compare at all, rather than a bare commit? */
export function isVersion(v) {
	return /^\d+\.\d+/.test(String(v ?? ''))
}
