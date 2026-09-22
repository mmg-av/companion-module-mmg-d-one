# D:ONE API collections

The Postman collection for the device API, covering firmware 0.4.3 — the earliest units.

This is the **0.4.3** collection, because it sits in the 0.4.3 branch of the module.
The collections for 0.5.5 and 0.8.1 are attached to their own releases. Read the
version off the unit — Settings → Device — and use the one that matches:
handing somebody the newest collection is how an integrator spends a day on an
endpoint their unit does not have.

## Before you run anything

`baseUrl` ships **empty**. Set it to the unit, with a scheme and no trailing
slash — `http://192.168.1.23`, or `http://MMG-D1-XXXXXXXX.local` using the
serial printed on the box. Both work; Settings → Device on the unit shows both.

If an operator PIN is set on the unit, sign in with the full device API
collection first — this subset carries no sign-in of its own.

## Two things the API will not do for you

**Selecting a source does not take the screen.** `POST /api/source` loads a
source; it does not leave the quad or stop media. If the quad is up, the unit
goes on showing the quad. The response says 200 and names the source as
current either way — only `GET /api/snapshot`, a JPEG of the real HDMI output,
disagrees. Turn the quad off as a separate call:

```
POST /api/quad/enable   {"enabled": false}
POST /api/source        {"name": "CAM 1 (NDI)"}
```

**Quad tiles are set one at a time or all at once.** `POST /api/quad/slot` with
`{"slot": 0, "name": "CAM 1 (NDI)"}` sets one — slots are 0-based on the wire
and 1-based on a panel. `POST /api/quad/slots` sets all four, and `POST
/api/quad/promote` with `{"slot": n}` makes one full screen.

## What is in them

The integration subset: source selection, quad multiview, media and playlist
playback, output modes and device state. Network configuration, firmware
updates, credential management and fleet features are left out — they are not
things a control surface should be doing, and a collection that offers them
invites it.

## Using one

Set `baseUrl` to the unit, then run **0 · Sign in** first.

Sign in with an **operator** service key made on the unit (Settings → API keys).
The PIN and password sign-ins hand out short-lived sessions that expire; a key
lasts until you revoke it.

⚠️ **0.4.3 is different.** That firmware predates API keys, so it signs in with
the operator PIN and nothing else. Everything below the sign-in works the same.

## This is a subset

The unit serves more than is collected here — what is left out is what a control
surface has no business doing: network configuration, firmware updates,
credential management and fleet features.

If you need something that is not in this collection, ask us:
[support@mmgaxis.io](mailto:support@mmgaxis.io). The endpoint may well already
exist.

## Where they come from

Generated from the device source at the commit each firmware was built from, so
routes, request fields and auth tiers come from the handlers rather than from
somebody's memory of them. They are not hand-written and not hand-edited.
