## MMG D:ONE

NDI to HDMI display. This module drives one unit: source selection, the quad
multiview, media and playlist playback, output mode and volume.

**This build is for units running firmware 0.8.1 or later**, 0.8.2 included.
Older units want an older module version: 0.5.5, or 0.4.3 for the earliest.

### Setting it up

**Address** — the unit's IP or hostname, e.g. `192.168.1.23` or
`mmg-d1-xxxxxxxx.local`.

**API key** — make one on the unit itself: **Settings → API keys**, with
**operator** scope.

Operator is the right level. It reaches everything this module does and cannot
reconfigure the network, install firmware or reset the device, so a control
surface left in a rack is not also a way to take the unit off the network. A key
lasts until you revoke it, which is what an always-on surface needs — the PIN
and password sign-ins hand out short-lived sessions that will expire mid-show.

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
