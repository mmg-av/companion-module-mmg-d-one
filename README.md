# MMG D:ONE for Bitfocus Companion

Drive an [MMG D:ONE](https://mmgaxis.io) from a Stream Deck or any
[Companion](https://bitfocus.io/companion) surface: source selection, the quad
multiview, media and playlist transport, output mode and volume.

13 actions · 8 feedbacks · 28 variables · 27 presets in 5 groups.

## Which version do you need?

Read the firmware off the unit — **Settings → Device** — and install the module
version that matches it. Companion pins a version per connection, so two units
on different firmware are two connections, each on its own version.

| your unit runs | install module version | credential |
|---|---|---|
| 0.4.3 — the earliest units | **0.4.3** | operator PIN, if one is set |
| 0.5.5 | **0.5.5** | operator API key |
| 0.8.1 or 0.8.2 | **0.8.1** | operator API key |

Install the wrong one and it will say so when it connects, and name the one to
use — but it cannot install it for you.

## Requirements

- Companion 5.0 or later (built and tested against 5.0.6)
- A D:ONE on the same network, running firmware **0.8.1 or later** (0.8.2 included)
- An **operator** API key, made on the unit

**This is the 0.8.1 build**, the newest. 0.8.1 and 0.8.2 are built from the same
application and share an API. Older units want an older build — see the table
above.

## Setting it up

Add the connection, then give it the unit's address and an operator API key
made on the unit itself (**Settings → API keys**).

Operator is the right level: it reaches everything this module does and cannot
reconfigure the network, install firmware or reset the device — so a surface
left in a rack is not also a way to take the unit off the air.

Full setup notes are in [`companion/HELP.md`](companion/HELP.md), which is also
what Companion shows on the connection's help page.

## Presets

Drag one on and it arrives wired up. A source button lights when that source is
the live one, the quad button reflects whether the multiview is on, and the HDMI
button turns red when the display is disconnected — worth a button on any rack,
because a dark wall and a dead unit look identical from the operating position.

## What the API does not do for you

**Selecting a source does not take the screen.** `POST /api/source` loads a
source; it does not leave the quad multiview or stop media playback. If the quad
is up, the unit keeps showing the quad and the new source is simply the selected
one behind it. Nothing in the response says so — it returns 200 and a payload
naming the source as current. Only `GET /api/snapshot`, which is a JPEG of the
real HDMI output, disagrees.

To actually cut to a single source, turn the quad off as a separate call:

```
POST /api/quad/enable   {"enabled": false}
POST /api/source        {"name": "CAM 1 (NDI)"}
```

This module does that sequencing for you, so its source buttons cut as you would
expect. Anything else driving the API has to do it itself.

**Individual quad tiles** are `POST /api/quad/slot` with `{"slot": 0, "name":
"CAM 1 (NDI)"}` — slots are 0-based on the wire and 1-based on a panel. `POST
/api/quad/slots` sets all four at once, and `POST /api/quad/promote` with
`{"slot": n}` makes one tile full screen.

## The device API

This module is one client. The API is documented as a Postman collection in
[`postman/`](postman/), for anyone building something else against a unit.

It is a subset — the essentials a control surface needs. The unit serves more
than is collected there, so if you need something that is not in it, ask:
[support@mmgaxis.io](mailto:support@mmgaxis.io).

## How it behaves

**Nothing polls.** The unit pushes its whole state on one event stream, and that
single connection drives every feedback and variable. A rack of buttons costs
the unit one connection rather than forty requests a second.

**Buttons report what happened, not what was asked.** An action posts an
instruction; the feedbacks follow what the device reports a moment later. So a
button showing a source is showing the source the unit *has* — which matters
exactly when those differ, because the source went away.

**It reconnects on its own.** If the unit reboots or the network drops, the
status returns to OK without anyone touching it.

**It adapts to the firmware in front of it.** Actions a unit cannot perform are
removed rather than offered and left to fail.

## Development

```sh
npm install
```

Then in Companion: **Settings → Developer modules path** → the directory
*containing* this one. Companion loads every module in subfolders of that path
and reloads on save.

`src/state.js` is a pure function from a state frame to display text, so it is
testable against a captured frame with no Companion and no device. The fiddly
part lives there: slot numbering is 0-based on the wire and 1-based on a panel,
`active` and `playing` are not the same thing, and a timer reading `0:00` looks
like a file that just ended rather than nothing playing.

`src/caps.js` is the only place the module cares which firmware it is talking
to. Capability is probed from the state frame; *behaviour* has to be versioned,
because a probe cannot tell whether `POST /api/source` takes the screen — it is
the same route returning the same 200 either way. An unknown version counts as
not-new, which is the safe direction.

## Support

[support@mmgaxis.io](mailto:support@mmgaxis.io) ·
[issues](https://github.com/mmg-av/companion-module-mmg-d-one/issues)

MIT licensed.
