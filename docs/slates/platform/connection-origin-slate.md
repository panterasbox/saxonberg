# Connection-origin slate (working doc)

> **Status: PARTIAL** — country v1 shipped in the social-graph build
> → [social-graph.md](../../subsystems/social-graph.md)
> **Left:** the developer-gated IP read · the `whois`/`locate` lookup
> verb · city / region resolution · a persisted last-seen country ·
> multi-hop `X-Forwarded-For` trust (single-hop only today)
> **Size:** a tail

> **Partially shipped (country v1) in the social-graph build.** The
> capture seam (`WebSocketService` → `backend/Application.ts` → threaded
> to `Interactive.recordOrigin`, not `ConnectionApi` — the backend layer
> owns the raw request and the `geoip-lite` import), the offline
> `geoip-lite` country lookup,
> the transient in-memory `{ip, country}` on the `Interactive` (PII
> posture: IP never persisted), and `ConnectionApi.originOf(playerId)`
> returning **country only** all landed there — consumed by the presence
> relay's "from `<country>`" arrival line (see
> [social-graph.md](../../subsystems/social-graph.md) § Country of
> origin). Still deferred per this slate: the **developer-gated IP read**,
> the `whois`/`locate` **lookup verb**, **city/region**, and any persisted
> "last-seen country". The rest of this doc is the original full design.

Working slate for **connection origin** — knowing, when someone
connects, roughly where in the world they're connecting from. Two
audiences: the player base sees **country** (in a connect notification
or via a lookup verb); operators see the **full IP** for moderation /
abuse investigation. Born from the social-graph build (the connect
banner is the first consumer) but a substrate of its own.

See also:

- [docs/subsystems/connection.md](../../subsystems/connection.md) — the
  login/logout + WebSocket-upgrade lifecycle this hooks into.
- [docs/subsystems/social-graph.md](../../subsystems/social-graph.md)
  — the first consumer; reserves an optional `country?` on the
  presence-notification payload.
- [docs/subsystems/access.md](../../subsystems/access.md) —
  `AccessApi.isWizard`, the gate for the privileged IP read.
- [docs/deployment.md](../../deployment.md) — the Caddy/Let's-Encrypt
  reverse-proxy topology that makes `X-Forwarded-For` (not
  `socket.remoteAddress`) the real client IP in production.

---

## Principle

Capture and derive shipped as designed (see
[social-graph.md](../../subsystems/social-graph.md) § Country of
origin). Still open, layered by sensitivity:

- **Expose, split by privilege** — **country** is broadly readable
   (the connect notification, a lookup verb); the **full IP** is
   wizard-only (`AccessApi.isWizard`).

> **PII posture is load-bearing.** The raw IP is **in-memory on the
> live connection only — never written to Mongo.** Country may be
> surfaced and, if ever stored, is the *only* origin datum that
> persists. This keeps the IP's lifetime bounded to the session and out
> of the durable record, which is the right default for a personal
> identifier you're keeping mostly for abuse investigation.

---

## What it is — and isn't

| This slate | Not this slate |
|---|---|
| Country/region from a connection's IP, behind a gated read | A full IP-geolocation product (city, ISP, lat/long, VPN detection) |
| In-memory IP on the live connection, developer-gated read | Persisting IPs / building an IP history (explicitly avoided) |
| The `whois`-style lookup verb + the connect-notification feed | The connect *notification* itself (that's the social-graph build) |
| `geoip-lite` (offline, bundled dataset) | A MaxMind-account / paid-API integration (deferred unless accuracy demands) |

---

## Capture — the WS-upgrade seam

Shipped as designed — `WebSocketService` extracts the client IP (first
hop of `X-Forwarded-For`, else `socket.remoteAddress`), threaded to
`Interactive.recordOrigin` as transient, non-persistent state (see
[social-graph.md](../../subsystems/social-graph.md) § Country of
origin). IPv6 `::ffff:`-mapped-v4 normalization also shipped (stripped
before the geo lookup, in `Application.ts`'s `geolocateCountry`).

Still open: multiple-proxy-hop `X-Forwarded-For` — we trust one hop
today; a deployment behind more than one proxy would need the chain
walked, not just the first entry.

---

## Derive — the geo lookup

Shipped, in a different shape than sketched: `geoip-lite` v1 lookup as
planned, but the pure IP→country function (`geolocateCountry`) lives in
`Application.ts` (the backend layer), not a mudlib Api static — the
mudlib's import-boundary rule (only `api/**` may reach outside
`src/mud/`) puts the `geoip-lite` import and the raw request on the
backend side, and the backend is the sole caller. Display-name
rendering shipped via `Intl.DisplayNames`, not an authored ISO→name
vocabulary. City/region and ISP remain deferred, as does the accuracy
ceiling's escape hatch (the privileged IP read, below).

---

## Expose — `ConnectionApi.originOf`, privilege-split

Country exposure shipped as designed (see
[social-graph.md](../../subsystems/social-graph.md) § Country of
origin) — `ConnectionApi.originOf(playerId)` returns `{ country? }` to
any caller. Still unbuilt, exactly as sketched:

```ts
interface ConnectionOrigin {
  country?: string;   // display name; broadly readable — SHIPPED
  ip?: string;        // present ONLY when the caller passes the developer gate — NOT YET BUILT
}
```

- **IP** — populated only when the acting principal satisfies
  `AccessApi.isWizard` (the orthogonal TS-escape / operator axis,
  per [access.md](../../subsystems/access.md)); omitted otherwise. The
  gate is derived from execution context, never a caller-supplied flag.
- **A lookup verb** — `whois <player>` / `locate <player>` (name TBD):
  shows country to the caller, and the IP **only** if the caller is a
  developer (one verb, the IP line gated at render, the `feel`/disguise
  precedent of withholding a field by viewer privilege). Confirmed
  absent: no such verb exists (`locate.yaml` is the unrelated
  containment-chain verb, perceiver.md's territory).

---

## Open questions

1. **Verb name + scope** — `whois` (operator-flavored) vs `locate`
   (in-world-flavored); does country require *any* relationship to the
   target (e.g. you've policied them), or is country freely lookup-able
   for any online player? Lean: country freely lookup-able for online
   players; IP developer-only.

Q2 (connect-notification default), Q3 (display-name rendering), Q4
(GeoIP accuracy tier), and Q5 (no persistence of country in v1) are
resolved as leaned — see
[social-graph.md](../../subsystems/social-graph.md) § Country of
origin. Q5's forward half (a durable "last-seen country") stays open —
see the status block's `Left`. Q6 (module home) resolved, but
differently than leaned: `ConnectionApi` does own `originOf`, but the
pure IP→country function ended up in the backend (`Application.ts`),
not a mudlib Api static at all — see "Derive" above.

---

## Build order (small, ~one cycle)

Capture, Geo, and "light up the reserved seam" all shipped (see
"Principle"/"Capture"/"Derive" above). Docs landed in
[social-graph.md](../../subsystems/social-graph.md) § Country of
origin rather than `connection.md`. Still open, from "Expose" above:
the developer-gated IP field on `ConnectionApi.originOf` and the
`whois`/`locate` verb.

## What this slate does NOT cover

- The connect-notification mechanism itself — social-graph build.
- Persisting IPs / IP history / an audit trail — deliberately avoided
  (PII posture).
- City / ISP / lat-long / VPN-or-proxy detection — deferred.
- Rate-limiting / ban-by-IP / abuse tooling — a separate moderation
  concern that *could* consume the privileged IP read later.
- Account-level "usual locations" / impossible-travel alerting —
  far-future, security-flavored.
