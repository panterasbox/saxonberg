# Client shell — frame, start screen, guest & connection-loss

> **This documents a *client* subsystem.** Most of `docs/subsystems/`
> describes the server engine; this one covers the React client's
> top-level shell — the frame primitives, the plain-UI start screen, the
> anonymous-guest path, the portrait, and the connection-loss state
> machine. Its server-side touchpoints (the guest principal, the portrait
> resolver, the don't-flush seam) are noted where they cross the wire.
> Seeded by [client-shell-slate.md](../slates/tails/client-shell-slate.md);
> built per `docs/requirements/client-shell-frame-requirements.md`.

## The frame (in-world top bar)

`components/frame/Frame.tsx` is a thin composition of **shared
primitives**, not a wrapper modes subclass — it replaced the debug
`ConnectionStatus` block:

- **`ConnectionIndicator`** — the one genuinely-unified status: bus
  health. Driven by the three-state `connection.link`
  (`connected` / `reconnecting` / `dropped`) in the store. **Silent when
  connected** (renders `null`); amber on reconnecting, red on dropped.
- **`AccountMenu`** — a dropdown off the identity label (portrait +
  name), state-polymorphic over the connected identity: a real character
  gets *Switch character* (a reconnect → roster, account stays signed
  in) + *Sign out*; a guest gets *Sign in to save* + *Sign out*. The two
  exits are distinct — leaving the world ≠ ending the account.
- **`Portrait`** — the small avatar image; renders `player.portraitUrl`
  with an initials fallback when the URL is empty (the server's "no
  image" sentinel) or fails to load. No broken-image icon ever shows.

Reserved seams (named in the layout, rendered as nothing until their own
cycles, never faked): a mode-status region (game vitals — substrate-only,
no widget yet), a mode indicator (no ≥2 modes), and search.

**Shared primitives, not a shared `Frame` across surfaces** — the start
screen composes the same primitives into its own full-screen layout; a
single cross-surface `Frame` wrapper is deferred until a third surface
(CMS, public) makes the real commonality visible.

## The start screen (pre-world, plain UI)

`components/StartScreen.tsx` renders the `unauthenticated` phase — no
diegetic metaphor (the lounge is the first room; this is just the app's
start screen). It offers a **data-shaped provider list** (Google live; a
rendered-but-inert Twitch slot — the auth-providers slate wires it
later), a co-equal **Play as guest** button, and a **dev-only** no-OAuth
login (`import.meta.env.DEV`). Logout returns here (a real logged-out
state, never a reload to a dead page).

## Anonymous guest

A guest is **anonymous** (button on the logged-out screen) and **wholly
ephemeral**. Two orthogonal axes, deliberately not conflated:

- **Authentication (session/account axis)** — `POST /auth/guest`
  (`services/auth/GuestAuthRoutes.ts`) establishes an *anonymous*
  principal `anon:<nanoid>` (`User.ANONYMOUS_PREFIX`) via `req.login`.
  The WS upgrade gate is **unchanged** — it sees a valid
  `passport.user.id`. `Application.handleUserConnect` recognizes the
  prefix and builds an ephemeral, never-saved `User` (`user.anonymous =
  true`) instead of a Mongo lookup. The single admission gate is
  `GuestAuthRoutes.mayMintGuest` — flip it to demote guests to
  post-sign-in if abused.
- **Guest-ness (character axis)** — `Avatar.isGuest`. `Login.enter` is
  the **one** place the policy "anonymous session → mint a guest avatar"
  lives; the build itself is `Login.mintRandomGuestAvatar` (private),
  which reads the char-gen rosters + sex-set rule from `EnrollController`
  (`loadConfig` / `validSexSet`) so the guest and char-gen paths agree.
  Every pick is **randomized** — a random species, a random
  **non-intersex** sex, a random aspiration (→ bio + themed outfit) —
  pronouns are always **they/them**, the name is the reserved-word guest
  name, and the avatar spawns in the lounge (the seed's `startLocation`).
  Every guest *behavior* keys off the avatar's `isGuest`, never the
  session.

Guest lifecycle:

- **Minted on Enter** (not page-load). The build forks a **unique
  per-guest transient template** (`/obj/Avatar/guest-<nanoid>`) from the
  seed, overlaying the random picks, clones it, then **deletes the
  template** immediately — guests persist nothing, and the live avatar is
  independent of it. The unique path also means no two guests ever clone
  the same path, so there's no seed-clone concurrency hazard (no
  serialization needed).
- **Recognizable, non-impersonable.** The name is the reserved word
  (`Login.GUEST_RESERVED_WORD = 'Guest'`) + a NameBank-drawn
  distinguisher ("Guest Mallow") drawn only from the real `common`
  `NameBank` (an unseeded bank degrades to a bare "Guest", never a
  fabricated surname) — so guest-ness rides every attributed line
  (speech/emote/look), where a UI badge can't reach. The reserved word is
  on the char-gen `enroll` name denylist
  (`EnrollController.isReservedName`, which imports it from `Login`) so a
  real player can't impersonate a guest. Exact-word only; fuzzy/homoglyph
  is out of scope.
- **Persists nothing.** `Avatar.save()` short-circuits for guests (the
  single guard covering autosave, onDestruct, and the client-state
  don't-flush seam in `backend/inbound/clientState.ts`); autosave never
  starts.
- **Reaped on disconnect.** `Avatar.onLinkdead` destructs a guest
  immediately (no reconnect window — there's nothing to resume). The
  client routes a dropped guest to the start screen.

## Portrait — one method on the connection layer

Portrait resolution lives on **`HasInteractiveMixin.getPortraitUrl()`** —
the connection layer, present on both pre-world `Login` and in-world
`Avatar` — so the account photo is available from the moment of
connection. It is **one method**, not an Api (no `DescribeApi`
addition — that Api is being end-of-lifed; presentation resolves on the
host):

1. the `identity.portrait` **setting** (declared on `PersonaMixin`;
   `resolveSetting` returns `''` on an Avatar with it unset, `undefined`
   on a Login — both fall through), else
2. the connected account's Google photo (`Interactive.getUser()` →
   `googleProfileId` → `GoogleProfile.photoUrl`), else
3. `''` — the empty sentinel; the client renders a generated initials
   placeholder.

The account photo is **never written into the setting** (that would
freeze it stale); resolution is read-time only. The resolved URL rides
`ConnectionEstablishedPayload.player.portraitUrl`.

## Connection loss (linkdead) on the client

The spine: the server does **not** reap a real avatar on linkdead
(`Avatar.onLinkdead` just emits an event), so a real user can reconnect
any time and resume — be generous, preserve context. A guest is reaped,
so it has nothing to resume.

- **Three link states** on `connection.link`. `setConnected` →
  `connected`; a drop → `reconnecting`; give-up → `dropped`.
- **Exponential backoff over ~60s** (`services/websocket.ts`:
  `1·2·4·8·16·30·30s`, replacing the fixed 5×2s) so users ride straight
  through a server restart without acting.
- **Command send is disabled while down, never queued** (`CommandBar`
  reads `connection.link`; a buffered command replayed into a resumed
  world is a foot-gun).
- **On give-up (real user):** `ReconnectBanner` shows over the preserved
  cockpit; its button (`websocketClient.reconnectNow()`) resets the
  backoff and resumes. Never a silent bounce to a dead page.
- **Routing to the start screen** — the two cases with nothing to
  resume: an unauthenticated session (re-auth needed) and a **dropped
  guest** (avatar reaped; the store also clears identity).
- A **successful reconnect is seamless** — subscriptions already
  re-issue on `connection-established` and welcome-scene-on-reconnect is
  already suppressed; the client re-enables input and clears the banner.
- **Intentional teardown** (logout / leave-world) sets
  `intentionalDisconnect` so `onclose` skips auto-reconnect — the caller
  drives the phase itself.

## The honest-state primitives

`components/ui/Figure.tsx` + `UnbuiltGround.tsx` — the shared primitives
for the one convention that cuts across every surface that shows a
number (`docs/design_handoff/CONVENTIONS.md` #1):

> **Never render a figure the server did not send**, including "just for
> now."

The demo wipes nightly, which buys latitude on *persistence* and none on
*figures*: a plausible fake is indistinguishable from a bug, and this
product's central claim is that its numbers are real. Three states must
look nothing alike:

| State | Rendering | Reason shown |
|---|---|---|
| `live` | a number. no decoration. the only state that shows one | none — a live figure has nothing to explain |
| `empty` | `—` in the muted foreground | **yes** — a real zero deserves a reason |
| `unwired` | hatched ground, dashed border, `╌╌` where the value goes | **yes** |

⭐ **The union is the deliverable.** One component with a *required*
discriminated `figure` prop, not three components and not an optional
`value`:

```ts
export type FigureState =
  | { readonly state: "live";    readonly value: string }
  | { readonly state: "empty";   readonly reason: string }
  | { readonly state: "unwired"; readonly reason: string };
```

You cannot render a figure without naming its state; `empty` and
`unwired` cannot omit their reason; and **`unwired` has no `value` field
at all**, so the convention is enforced by the type checker rather than
by vigilance at every call site. Three separate components would leave
`<span>{n}</span>` as the path of least resistance — and the fourth
state the convention warns about, a plausible fake, is exactly what the
path of least resistance produces. `Figure.test.tsx` asserts the
compiler's refusal with `@ts-expect-error`; CI enforces it through the
client's `build:types` job.

Tokens: `hatch` / `hatchStrong` for the 135° stripe, `info` for the
`╌╌`, `fgMuted` for the `—` and the reason, `accent` for a live value.

Two decisions worth keeping:

- ⚠ **No stamp.** The reference art's `live` / `empty` / `not wired`
  chips are documentation labels for its three example cards; the
  convention's own wording is "a reason, **not a stamp**". The hatch is
  the stamp and the reason is the words.
- ⚠ **No `color-mix(in oklab, …)`**, which the reference art uses
  throughout. `hatch` / `hatchStrong` are precomputed per ground —
  a marble hatch is not an ink hatch lightened, mixing against a
  transparent stop composites over whatever is behind, and precomputing
  makes each theme state what its hatch actually looks like. It is also
  readable in jsdom, so the hatch is testable rather than intended.

Accessibility carries the honesty to a screen reader, to which a dashed
border is invisible and `╌╌` is noise: `role="group"` plus an
`aria-label` that says "not wired" / "none" in words, with the reason.

**Two carve-outs, neither belonging to these components.** *Prose never
hedges* — a room description carries no engineering stamp, because
breaking the fiction to report an engineering fact is the wrong trade in
the one place the game is supposed to be a world; if a thing cannot be
described yet, it is not in the room yet. And *commands refuse honestly*
in the machine voice (`cockpit style theme default` naming the three it
does know), not through a hatched widget.

⚠ **They ship with no consumer.** Applying the honest states to a
surface was explicitly out of scope for the civic-ground build; Build B's
widget shelf, whose catalogue is mostly not-wired, is the first real
consumer. That a primitive with no consumer can drift is the accepted
risk in the Wave 1 cut, and the mitigation is that B follows
immediately.

## What this build does NOT add

- **No client-side persistence / localStorage.** Everything that matters
  is server-authoritative behind the session cookie; nothing in scope
  needs persistence the cookie doesn't provide. The pre-auth /
  device-local tier is a real future concept (per-device perf toggles, a
  pre-auth theme cache) **deferred to the slate** with no v1 content.
- Search, mode switcher, the public read-only surface, the declarative
  mode/manifest model, author mode / CMS — all later cycles (see the
  client-shell slate).

## History

- **Guest build homed on `Login`** (MR !54 review): the randomized
  guest-avatar build started life as `EnrollController.mintRandomGuestAvatar`
  (next to the char-gen `commit` it mirrors) but moved onto `Login` — the
  guest-mint site — reading the rosters + `validSexSet` back from
  `EnrollController` via a lazy import. In the same pass the
  `GUEST_RESERVED_WORD` + guest-name generation moved from `Avatar` to
  `Login`, the hardcoded guest-surname fallback list was deleted (real
  `common` NameBank only), and `PRONOUN_LABELS` was colocated with the
  `Pronouns` enum in `@saxonberg/types`.
