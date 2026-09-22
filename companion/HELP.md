## MMG D:ONE

NDI to HDMI display. This module drives one unit: source selection, the quad
multiview, media and playlist playback, output mode and volume.

**This build is for units running firmware 0.4.3** — the earliest ones. If
your unit is on 0.5.5 or later, install the module version matching it.

### Setting it up

**Address** — the unit's IP or hostname, e.g. `192.168.1.23` or
`mmg-d1-xxxxxxxx.local`.

**API key or PIN** — the unit's operator PIN, if one is set on it. Leave it
empty otherwise.

A PIN sign-in gives a session that expires, and the module signs in again when
it does. Units on later firmware use a service key instead, which lasts until
you revoke it — that is what an always-on surface wants, and why the later
builds of this module require one.

### How it keeps up

The unit pushes its whole state on one event stream, so nothing here polls.
Buttons post an instruction; the device reports what actually happened a moment
later, and the feedbacks follow that rather than the instruction. So a button
showing a source is showing the source the unit *has*, not the one it was asked
for — which matters exactly when those differ, because the source went away.

If the unit reboots or the network drops, the module reconnects on its own and
the status goes back to OK without anyone touching it.

### Sources

The dropdowns list what the unit can currently see on the network. You can also
type a name that is not discovered yet — useful when a show is built before the
cameras are switched on — and Companion variables work in those fields too.

### Presets

Drag one on and it arrives wired up: a source button also lights when that
source is the live one, the quad button reflects whether the multiview is on,
and the HDMI button turns red when the display is disconnected. That last one is
worth a button on any rack: a dark wall and a dead unit look identical from the
operating position.
