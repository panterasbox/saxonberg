# Affordance resolution (S2) — requirements

The second server build of the client rebuild. S1 put *figures* on the
wire; S2 puts *verbs* on the wire — the live answer to "what can I do
with this, right now?" for a given object and a given viewer.

Today the client can render an identity tag (`<item stuff-id="s_42">`)
and it can issue a command, but it has no way to ask what commands that
object would accept. The radial menu the design handoff specifies is
therefore unbuildable, and every affordance in scrollback looks equally
live whether or not it still is.

Seeded by [client-slate § 4.2](../slates/builds/client-slate.md)
(Track B). Reads on [command-routing](../subsystems/command-routing.md),
[command-parsing](../subsystems/command-parsing.md),
[perception](../subsystems/perception.md) (the spoiler seam),
[topics](../subsystems/topics.md), and
[messaging](../subsystems/messaging.md).

## Goals

- **A viewer can obtain the verb menu for an object.** Given a
  `stuff-id`, the server answers with the verbs that object affords
  *that viewer* at *that moment*, each carrying an enabled flag and, when
  disabled, a player-facing reason.
- **The answer carries the object's active mixin composition**, so the
  client can label and group the menu without a second call.
- **Both surfaces respect the reveal model.** A verb, a reason, or a
  mixin the viewer is not entitled to know is absent from the response —
  not present-and-flagged.
- **The identity-tag vocabulary is collapsed.** `item` and `object`
  become one tag, `thing`; `name` is retired in favour of naming the
  referent's kind explicitly at each emitter.
- **Scrollback stops lying about liveness.** A sixth topic facet tells
  the client whether affordances in a frame of that topic stay valid.
- **The topic taxonomy is replaced, not renamed.** 89 keys organized by
  emitting subsystem become ~24 organized by subject matter, in player
  voice, with every facet authored.
- **The vocabulary is open to content packs, and its roots are closed** —
  so a subtree mute stays total.
- **A mistyped, renamed or undescribed topic fails loudly.** Today it
  resolves to a derived default and nobody notices — which is why 23 live
  topics have no descriptor.

## Non-goals

- **The radial menu itself**, its geometry, and the fixed category slots
  — client work, Wave 3/4 of the slate.
- **An alias map for old topic keys.** Cut deliberately — see *Surface
  decisions § 7*. There is no playerbase to protect and the database is
  scheduled for a wipe; an alias map would preserve names nobody holds.
- **A composition digest in MML.** Cut during requirements; see
  *Surface decisions § 1*.
- **Any change to how commands dispatch.** The resolver evaluates the
  existing validator chain; it does not become a new gate, and a verb
  that resolves `enabled` still faces the full chain on dispatch.
- **Subscription-based liveness.** The resolver is one-shot
  request/response. Keeping an open radial live as the world changes is
  possible on the S1 subscription substrate and is deliberately deferred
  until something needs it.

## Surface decisions

### 1. The `mx` digest is cut — composition rides the resolver

The slate's item 7 proposed emitting the composed-mixin list as an
attribute on every affordance tag. **Do not build it.** Three
independent reasons, any one sufficient:

- **The premise is false.** The slate justified the split with *"a mixin
  set is stable; its state is volatile."* It is not stable:
  `MixinApi.getActiveMixins` unions in augments, implants, species
  innates and on-shift conferral. Composition changes at runtime, so a
  digest sitting in scrollback goes stale exactly the way the slate
  refuses to let the verb list go stale. Its own three arguments against
  verbs-in-MML — bloat, staleness, viewer-dependence — apply verbatim to
  the digest.
- **It is redundant with the key beside it.** The frame already carries
  `stuff-id`. The resolver is a function of `(id, viewer, now)`, and
  composition is a function of the same triple.
- **It can drift, irreconcilably.** `ProseLogic` registers an `item`
  Liquid filter, wiki content is hand-authored, and `Mml.fromMarkup` is
  public — so hand-written `<thing mx="…">` is reachable, and no
  mechanism could ever reconcile it against the live object.

A bitvector encoding was considered and rejected: 149 registered mixins
means ~25 fixed base64 characters on every tagged noun, *longer* than the
sparse list it replaces for the common object, plus a version-locked
index registry shared with the client that must survive every mixin
addition.

**Instead:** the resolver returns composition alongside verbs, and the
client caches it per `stuff-id`. A cold radial — an object the client has
not resolved before — waits for the round-trip. It is a local WebSocket
round-trip on the connection the frame arrived on; warm opens are
instant from cache. No etag, no invalidation protocol, no MML change.
Revisit only on measurement.

### 2. Transport: a one-shot message pair, not an endpoint

The slate says "new endpoint". It should not be REST. The wire already
carries two request/response pairs of exactly this shape —
`mql-query`/`mql-query-result`/`mql-query-error` and
`reaction-expand`/`reaction-expand-result`. S2 adds
`affordance-resolve` / `affordance-resolve-result` /
`affordance-resolve-error` in `@saxonberg/types`, modelled on
`reaction-expand`.

It is **not** an MQL subscription. The per-`Interactive` registry and its
dependency index are built for durable panes; a radial is transient and
usually closes within seconds. Subscribing per open would churn the
index for no benefit.

### 3. `enabled` + `reason` come from the existing validators

A `CommandValidator` is `(context) => string | undefined` — `undefined`
on pass, a player-facing reason on failure. That is already the
resolver's return contract, authored 51 times, in prose written for
players (`"there is no terminal here"`). The resolver builds a context
and runs the verb's declared validators without dispatching.

**Constraint that falls out:** a radial knows exactly one object, so only
validators reading the actor, `commandSource`, and that single target can
be evaluated. A verb taking a second operand (`put X in Y`) has its
actor/source/target validators evaluated and its operand validators
skipped; it resolves as **enabled-pending-operand**, a third state the
client renders as a verb that opens a follow-up prompt rather than acting
immediately. Reporting such a verb as plainly `enabled` would be a lie
the client discovers only on failure.

**This makes validator purity load-bearing.** Validators are already
invoked on a path that may abort before dispatch, so they are expected to
be side-effect-free; S2 makes that an explicit contract rather than an
accident.

### 4. Candidate verbs come from `commandContributions`, not a new static

The spec's proposed `static affords` is not built — `build/affordance-scope`
already made `static commandContributions` directional and recursive
(`self` / `inventory` / `environment` / `peers`), authored across the
whole tree, with reach semantics `affords` does not have. Adding
`affords` beside it would be a second taxonomy describing what the first
already knows.

The resolver's candidate set is the verbs the target contributes toward
the viewer, plus the viewer's own verbs that could take the target as an
argument.

### 5. Both new surfaces are gated on `fieldMeta.spoiler`

A creature's `Combustible` is a weakness, and a reason string like
*"needs a flame"* leaks the same fact by another route. The reveal model
already runs on values; S2 extends it to the mixin list and to reason
strings.

**Gated means absent, not flagged.** A spoiler-gated verb does not appear
in the response at all, and a gated mixin is not listed. A response that
said "there is a verb here you may not know about" would leak the fact it
exists — the honest-fog rule from
[concealment](../subsystems/concealment.md).

### 6. `item` + `object` → `thing`; `name` is retired

Portability is *state*, not kind, and the resolver answers state — so the
`item`/`object` split has nothing left to carry. Both collapse to
`thing`.

`Mml.name()` is **retired outright** rather than kept as an
auto-selecting helper. Each of its ~90 call sites names the referent's
kind explicitly (`Mml.player` / `Mml.npc` / `Mml.thing`). An author who
writes `npc` means npc; framework guessing would produce a tag nobody
chose, and would be wrong for exactly the interesting cases (a disguised
player, a possessed corpse).

Both emitters route through `Mml.ref(kind, stuff)`, so the tag change
itself is two lines; the fan-out is entirely in the `name` retirement.

`KNOWN_TAGS` gains `thing` and loses `item` / `object` / `name`, with
matching `flatten` entries (the pairing is already test-asserted). All
three are **identity claims** and stay out of every passthrough policy,
exactly as `item` and `name` are today.

### 7. The topic corpus is replaced wholesale, not renamed

The slate scheduled the topic work as S3 — renames behind an alias map
for one release. **Both halves of that are cut.** The corpus is deleted
and rebuilt, in this build, with no alias map.

**Why replace rather than rename.** Measured against the tree
(tests excluded):

- 89 topics seeded, **62 emitted**.
- **23 emitted topics have no seed at all** — including
  `world.speech.tell`, `world.social.presence`, `world.hazard.spring`,
  `system.charactergen.*`, `system.press`, `world.prompt`. A third of
  what reaches a player has no authored descriptor; tier 3 silently
  invents one.
- **~50 seeded topics are never emitted.** Some are legitimate subtree
  parents; the rest is dead (`system.commands.added|removed|reset`,
  `system.auth.*`, `world.identity.change`, five
  `world.perception.ambient.*` modalities).

So ~39 of 89 seeds are load-bearing, and the live and authored
vocabularies have drifted apart in *both* directions. Renaming a corpus
in that state preserves the drift.

**Why it collapses so far.** The tree is five facets flattened into a
string — it predates facets, so every cross-cutting axis became tree
depth: `system.*` vs `world.*` is the `actor` facet; `say`/`whisper`/
`shout` is `address`; the 13 `system.shell.*` leaves are `actor: system`
+ `address: direct`; `*.error` and `system.log.*` are
`weight: diagnostic`. S1 put those five facets on the wire, so the
tree's only remaining job is **subject matter**.

Two collapses fall directly out of S1: the 15
`world.perception.measurement.*` leaves become **one** topic, because
`<quantity channel="thermal">` already carries the channel in the
markup; and `twitch`/`youtube`/`kick` become one, because the platform
is a transport attribute, not a subject.

**The replacement — 7 roots, ~24 keys, two levels:**

| Root | Leaves | Meaning |
|---|---|---|
| `speech` | `.vocal` `.comms` `.channel` `.relay` | Words from a person. Split by **medium** — overhearable vs point-to-point is a privacy fact, not a presentation one. |
| `act` | `.deed` `.move` `.emote` `.combat` | Something was done. World events ride this; `actor: world` distinguishes them. |
| `sense` | `.ambient` `.weather` `.survey` `.reading` | The world reaching you. `.survey` answers looking; `.reading` is all instruments. |
| `self` | `.body` `.standing` `.holding` | Your own person — vitals, measured position, property. |
| `publication` | `.press` `.wiki` `.forum` | Authored durable content. |
| `shell` | `.result` `.error` `.prompt` `.config` `.control` | The client↔server relationship. `.control` is the server changing client state (mode, layout, clear). |
| `session` | `.link` `.identity` | The connection itself; auth and character select. |

Labels and descriptions are authored **in player voice** (Track A step 5,
folded in — writing them twice would be the waste this decision exists to
avoid).

### 8. The vocabulary is open; roots are closed

Content packs may add topics. This is already physically supported:
`TopicCatalogue` loads via `Template.findDescendants('/obj/Topic/')` from
the `domain` collection, and packs install `domain` rows carrying
`sourcePack`. No new mechanism.

**But a pack may add leaves only, never a root.** If a pack can mint a
top-level subject, a player's mute of `sense` stops catching everything
sense-shaped, and the client's filter surface becomes unbounded at the
top. Subtree-mute integrity is the entire reason this is a tree rather
than flat tags.

Collision is an install error, not a silent overwrite — two packs
claiming one key must fail reconcile, with `sourcePack` naming the
incumbent.

### 9. The totality gate is two-part

A build-time lint cannot see a third-party pack, so the gate has a
runtime half.

- **Build-time** — `lint:topics` (`scripts/check-topic-keys.ts`,
  CI-gating): every topic key emitted in server source resolves to a
  core seed or a shipped-pack row, and every key's root is one of the
  seven. Catches typos and renames. Same shape as S1's `MeasureChannel`
  totality test, which caught two real defects on its first run.
- **Runtime** — **tier 3 stops being silent.** A topic that resolves by
  *derivation* rather than authorship files a diagnostic through
  `DiagnosticApi`. Resolution behaviour is unchanged — the frame still
  renders, nothing throws — but the failure becomes author-visible. This
  is what would have surfaced all 23 undescribed topics.
- **Install-time** — pack reconcile validates root and collision (§ 8).

### 10. Sixth facet: `affordance`

`live` / `decays` / `permanent`, joining S1's five on the same schema and
the same `TopicDescriptor`. It tells the client whether affordances in a
frame of that topic stay valid as the frame ages, so a long scrollback
can grey dead links without resolving every one.

Authored, with **no runtime derivation** — S1's rule, established after
two derivations of one facet drifted within an hour. Floor is `decays`,
the conservative answer: a wrongly-`permanent` affordance is a dead link
presented as live.

Because the corpus is being rewritten anyway, all six facets are authored
fresh rather than derived by script. `derive-topic-facets.ts` retires
with the corpus it served.

## Constraints

- **No new Api class.** Affordance resolution is command-surface work and
  belongs on the existing `CommandApi`, forwarding to its logic
  singleton. Apis are per-subsystem, never per-feature.
- **The client owns zero command semantics.** The resolver reports what
  the server would accept; it never becomes the authority on what runs.
  A resolved-`enabled` verb still faces the full dispatch chain.
- **Resolution is a read.** No mutation, no engagement, no scheduling. A
  radial opened a hundred times must leave no trace.
- **The reveal model is not re-implemented.** S2 calls the existing
  perception/spoiler seam; it does not grow a parallel notion of what a
  viewer may know.
- **Validators must be side-effect-free**, and this becomes explicit.
- **Wire additions are additive.** The three new message types are
  ignored by a client that does not send them. The tag collapse is *not*
  additive and is coordinated with the client in the same cycle.
- **Topic facets are authored, never derived at runtime** (S1 rule).

## Acceptance criteria

1. `affordance-resolve` returns, for `(stuff-id, viewer)`: a verb list
   with `enabled` ∈ {enabled, disabled, pending-operand}, a reason on
   `disabled`, and the target's active mixin composition.
2. Reasons are the strings the existing validators already return —
   tested by asserting a known disabled verb reports its validator's own
   text.
3. A verb requiring a second operand resolves `pending-operand`, never
   plain `enabled`. Test covers `put`.
4. A spoiler-gated mixin is **absent** from the composition list, and a
   verb gated behind it is **absent** from the verb list, for a viewer
   without the knowledge — and present for one with it. Both directions
   tested.
5. Resolution mutates nothing: a test resolves a target repeatedly and
   asserts no ledger row, no engagement, and no scheduled callback.
6. `KNOWN_TAGS` contains `thing` and not `item` / `object` / `name`;
   every emitter compiles; `flatten` pairing test passes.
7. No `Mml.name` call sites remain, asserted by a source scan (the
   `MeasureChannel.totality` pattern).
8. `thing` / `player` / `npc` are absent from every passthrough policy —
   asserted, since these are identity claims.
9. The old topic corpus is gone — no seed under `/obj/Topic/` uses a key
   outside the seven roots, and no emitter references a retired key
   (source scan).
10. Every emitted topic key resolves to an **authored** descriptor. This
    is the criterion that fails today for 23 keys.
11. All six facets are authored on every seed; none is derived at
    runtime. `derive-topic-facets.ts` is deleted.
12. Labels and descriptions are in player voice — spot-checked in review,
    not machine-checkable.
13. `pnpm lint:topics` passes, and fails on (a) a mistyped key, (b) a key
    whose root is not one of the seven.
14. A topic resolving by derivation files a diagnostic, and rendering is
    unaffected — both asserted.
15. A pack declaring a new root fails reconcile; a pack declaring a leaf
    under a core root installs and resolves. Both tested.
16. `packages/client`'s hardcoded topic strings are updated; no client
    reference to a retired key remains.
17. `docs/subsystems/command-routing.md` documents the resolver;
    `messaging.md` the tag collapse; `topics.md` is **rewritten** for the
    new taxonomy, the open-vocabulary rule, and the two-part gate.
18. Full suite green, both packages type-clean, lint family green.

## Cross-references

- Seeding slate: [client-slate § 4.2](../slates/builds/client-slate.md)
- Prior build: S1 — merged, `0ed75f72`. Established the
  authored-not-derived facet rule, the totality-gate pattern, and the
  `<quantity>` chokepoint precedent this build's tag collapse follows.
- **S3 is dissolved.** Track A steps 3–5 were scheduled as a separate
  build; they are absorbed here, because deriving a sixth facet into 89
  seeds that are about to be deleted is waste, and the player-voice
  rewrite would otherwise be done twice.
- [command-routing](../subsystems/command-routing.md) ·
  [perception](../subsystems/perception.md) ·
  [concealment](../subsystems/concealment.md) ·
  [topics](../subsystems/topics.md) ·
  [messaging](../subsystems/messaging.md)
