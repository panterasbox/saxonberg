# Connection-origin slate (working doc)

> **Partially shipped (country v1) in the social-graph build.** The
> capture seam (`WebSocketService.handleUpgrade` → threaded to
> `ConnectionApi.recordOrigin`), the offline `geoip-lite` country lookup,
> the transient in-memory `{ip, country}` on the `Interactive` (PII
> posture: IP never persisted), and `ConnectionApi.originOf(playerId)`
> returning **country only** all landed there — consumed by the presence
> relay's "from `<country>`" arrival line (see
> [social-graph.md](../../subsystems/social-graph.md) § Country of
> origin). Still deferred per this slate: the **developer-gated IP read**,
> the `whois`/`locate` **lookup verb**, **city/region**, and any persisted
> "last-seen country". The rest of this doc is the original full design.

> **Status: scoped, buildable, small.** A self-contained substrate that
> captures *where a connection comes from* — geographic origin (country
> always; full IP privileged) — at the WebSocket handshake, and exposes
> it through a gated `ConnectionApi.originOf`. The geo lookup is easy
> (offline `geoip-lite`); the real care is the **PII posture** (IP is
> in-memory-only, never persisted) and the **privilege split**
> (country broadly visible, IP developer-only). Decoupled from the
> social-graph build, which only *reserves the seam* to surface country
> in connect notifications.

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

Three things, layered by sensitivity:

1. **Capture** — at the WS upgrade, record the connecting IP on the
   live connection. Proxy-aware: trust the first hop (Caddy already has
   `trust proxy` set in `Server.ts`), read `X-Forwarded-For`, fall back
   to `socket.remoteAddress` in dev.
2. **Derive** — resolve IP → country once, at connect, via an offline
   GeoIP dataset. No per-connect network call.
3. **Expose, split by privilege** — **country** is broadly readable
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

The one capture site is `WebSocketService.handleUpgrade`
(`packages/server/src/services/websocket/WebSocketService.ts`), where
the `request` (with headers) is in hand before the session is
established. Extract the client IP:

```
const xff = request.headers['x-forwarded-for'];
const ip  = (typeof xff === 'string' ? xff.split(',')[0]!.trim() : undefined)
          ?? request.socket.remoteAddress;
```

Stash `{ ip, country }` (country derived immediately, below) on the
**live connection / Interactive record** — the same per-connection
object the session already carries — as transient, non-persistent
state. On disconnect it evaporates with the connection.

Open: IPv6 / `::ffff:`-mapped-v4 normalization; multiple-proxy-hop
XFF (we trust one hop today). Both are small.

---

## Derive — the geo lookup

`geoip-lite` is the v1 choice: a pure npm dependency that **bundles its
own dataset**, needs no account, and resolves offline in-process —
`geoip.lookup(ip)` → `{ country, region, city, ll, … }`. v1 reads
**`country`** (ISO-3166 alpha-2, rendered to a display name) and
nothing finer. The dataset is refreshed by bumping the dependency; a
periodic-update job is deferred.

Module shape: a small Api static (a `ConnectionApi.geolocate(ip)` or a
dedicated `GeoApi` — naming TBD against the connection subsystem), pure
over an IP. The dataset file ships vendored with the dependency.

Open: accuracy ceiling (VPNs/proxies read as the exit country — fine
for "roughly where," wrong for forensics; the privileged IP read is the
escape hatch). City/region and ISP are deferred.

---

## Expose — `ConnectionApi.originOf`, privilege-split

```ts
interface ConnectionOrigin {
  country?: string;   // display name; broadly readable
  ip?: string;        // present ONLY when the caller passes the developer gate
}
ConnectionApi.originOf(playerId: string): ConnectionOrigin
```

- **Country** — returned to any caller (subject to the consumer's own
  visibility rules; e.g. the connect notification only fires for groups
  the viewer policied).
- **IP** — populated only when the acting principal satisfies
  `AccessApi.isWizard` (the orthogonal TS-escape / operator axis,
  per [access.md](../../subsystems/access.md)); omitted otherwise. The
  gate is derived from execution context, never a caller-supplied flag.

Consumers:

1. **The connect notification** (social-graph build) — `relayPresence`
   reads `originOf(actor).country` and the banner renders
   "Greg connected from Germany." The payload's `country?` field is
   already reserved there; this substrate just populates it.
2. **A lookup verb** — `whois <player>` / `locate <player>` (name TBD):
   shows country to the caller, and the IP **only** if the caller is a
   developer (one verb, the IP line gated at render, the `feel`/disguise
   precedent of withholding a field by viewer privilege).

---

## Open questions

1. **Verb name + scope** — `whois` (operator-flavored) vs `locate`
   (in-world-flavored); does country require *any* relationship to the
   target (e.g. you've policied them), or is country freely lookup-able
   for any online player? Lean: country freely lookup-able for online
   players; IP developer-only.
2. **Connect-notification default** — does "from <country>" show by
   default in the banner, or is it opt-in per `notify` rule? Lean:
   show when known; it's low-noise and useful.
3. **Display-name rendering** — ISO code → country name table; a small
   value-object/vocabulary, or a tiny dependency. Lean: a static map
   value-object (the vocabulary pattern), no new dependency.
4. **GeoIP accuracy tier** — `geoip-lite` (free, country-solid) vs a
   MaxMind GeoLite2 `.mmdb` (account, more accurate, city-capable).
   Lean: `geoip-lite` for v1; revisit only if accuracy bites.
5. **Any persistence of country?** — strictly none in v1 (derive on
   read from the live connection). A durable "last-seen country" is a
   later call, weighed against the PII posture.
6. **Module home** — fold the geo lookup + `originOf` into
   `ConnectionApi`, or a sibling `GeoApi`. Lean: `ConnectionApi` owns
   `originOf` (it's connection state); the pure IP→country function is
   an Api static beneath it.

---

## Build order (small, ~one cycle)

1. **Capture** — XFF/remoteAddress extraction at `handleUpgrade`,
   transient `{ ip, country }` on the live connection. IPv6
   normalization.
2. **Geo** — add `geoip-lite`; the IP→country Api static; the ISO→name
   value-object.
3. **Expose** — `ConnectionApi.originOf` with the developer-gated IP
   field; the `whois`/`locate` verb (country open, IP gated at render).
4. **Light up the reserved seam** — populate the social-graph presence
   payload's `country?` from `originOf`; the banner renders "from
   <country>." (Only if the social-graph build has shipped; otherwise
   the field stays reserved.)
5. **Docs** — fold into `connection.md` (or a short new subsystem doc),
   stating the PII posture (IP in-memory-only) prominently.

## What this slate does NOT cover

- The connect-notification mechanism itself — social-graph build.
- Persisting IPs / IP history / an audit trail — deliberately avoided
  (PII posture).
- City / ISP / lat-long / VPN-or-proxy detection — deferred.
- Rate-limiting / ban-by-IP / abuse tooling — a separate moderation
  concern that *could* consume the privileged IP read later.
- Account-level "usual locations" / impossible-travel alerting —
  far-future, security-flavored.
