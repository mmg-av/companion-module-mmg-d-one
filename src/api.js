import http from 'node:http'

// Talking to a D:ONE.
//
// Two channels, and the split matters: ordinary requests for the things a
// button DOES, and one Server-Sent Events stream for everything the surface
// needs to KNOW. The unit pushes a full state frame whenever anything changes,
// which is what its own UI runs on, so feedbacks are never a poll behind and a
// show with forty buttons costs the device one connection rather than forty
// requests a second.
//
// No dependencies. fetch is in the runtime, and SSE is a line-oriented text
// format that does not need a library to read.

/** The Authorization header, when there is a credential to put in it. */
function auth(cfg) {
	return cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {}
}

/** A request. Returns parsed JSON, or throws with something worth showing. */
async function call(cfg, method, path, body) {
	const url = `http://${cfg.host}${path}`
	const res = await fetch(url, {
		method,
		headers: {
			// The unit also accepts a session cookie or X-Auth-Token; Bearer is
			// the one that suits a long-lived service key.
			//
			// Sent only when there is one. The earliest firmware has no service
			// keys, and with no PIN set it leaves every route open — an empty
			// Bearer there is not neutral, it is a credential the unit would be
			// entitled to reject.
			...auth(cfg),
			...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(8000),
	})
	if (res.status === 401)
		throw new Error(
			cfg.key
				? 'rejected: check the API key, and that it has operator scope'
				: 'this unit wants a credential: set its PIN as the API key, or use a unit with service keys'
		)
	if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}`)
	const text = await res.text()
	if (!text) return {}
	try {
		return JSON.parse(text)
	} catch {
		return {}
	}
}

/**
 * Hold the state stream open, calling onState with each frame.
 *
 * Returns a stop function. Reconnects on its own: a display is a thing people
 * walk past for months, and a surface that stops updating because the unit
 * rebooted at 3am is worse than one that never worked, because nobody notices.
 */
function watch(cfg, { onState, onUp, onDown }) {
	let stopped = false
	let req = null
	let timer = null
	let backoff = 1000

	const connect = () => {
		if (stopped) return
		req = http.request(
			{ host: cfg.host, path: '/api/events', method: 'GET', headers: auth(cfg) },
			(res) => {
				if (res.statusCode !== 200) {
					onDown(
						res.statusCode === 401
							? cfg.key
								? 'API key rejected'
								: 'this unit wants a credential — it is not one of the open early units'
							: `event stream: HTTP ${res.statusCode}`
					)
					res.resume()
					return retry()
				}
				backoff = 1000
				onUp()
				res.setEncoding('utf8')
				// Frames are separated by a blank line and can arrive split
				// across packets, so buffer until a separator is seen rather
				// than assuming one chunk is one frame.
				let buf = ''
				res.on('data', (chunk) => {
					buf += chunk
					let i
					while ((i = buf.indexOf('\n\n')) !== -1) {
						const frame = buf.slice(0, i)
						buf = buf.slice(i + 2)
						const data = frame
							.split('\n')
							.filter((l) => l.startsWith('data:'))
							.map((l) => l.slice(5).trim())
							.join('')
						if (!data) continue
						try {
							onState(JSON.parse(data))
						} catch {
							/* a malformed frame is not worth dropping the stream for */
						}
					}
				})
				res.on('end', retry)
				res.on('error', retry)
			}
		)
		req.on('error', (e) => {
			onDown(e.code === 'ECONNREFUSED' ? 'no answer — is the unit on?' : e.message)
			retry()
		})
		req.end()
	}

	const retry = () => {
		if (stopped || timer) return
		timer = setTimeout(() => {
			timer = null
			connect()
		}, backoff)
		// Backs off to 15s. Frequent enough that a unit coming back is picked up
		// within a cue, rare enough that a rack of units with a dead switch does
		// not become the traffic.
		backoff = Math.min(backoff * 2, 15000)
	}

	connect()
	return () => {
		stopped = true
		if (timer) clearTimeout(timer)
		if (req) req.destroy()
	}
}

export { call, watch }
