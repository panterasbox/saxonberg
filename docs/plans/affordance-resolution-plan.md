# Affordance resolution (S2) — plan

Implements
[affordance-resolution-requirements.md](../requirements/affordance-resolution-requirements.md).

Seven waves in two shippable halves. **Land as two MRs off one branch** —
the diff is an ~89-file seed deletion plus a resolver plus ~90 mechanical
emitter edits, which is not one reviewable change.

| MR | Waves | What |
|---|---|---|
| **A — taxonomy** | 1–4 | The topic corpus, the two-part gate, the client strings |
| **B — resolver** | 5–7 | The tag collapse, the resolver, docs |

MR A is self-contained and has no dependency on MR B. MR B depends on
nothing in A except that both touch `messaging.md`.

---

## Wave 1 — the inventory tool (build this first)

**Nothing else can start until the true emitted set is known**, and it is
not knowable by eye. A literal scan finds 62 keys; constants hide more,
and one of them (`residence.*`) is a whole undeclared root.

`scripts/check-topic-keys.ts`, which is both the inventory tool now and
the CI gate later.

It must resolve three call shapes:

| Shape | Example | Handling |
|---|---|---|
| Literal | `.topic('world.speech.say')` | Direct |
| Named constant | `.topic(COMBAT_EXCHANGE_TOPIC)` | Resolve the declaration — same technique `lint:gates` uses for `*_MODULE_ID` |
| Genuinely dynamic | `.topic(opts.topic)`, `.topic(this.sceneTopic)` | **Cannot** be statically resolved |

The dynamic sites are the interesting problem. There are three
(`opts.topic`, `this.sceneTopic`, a bare `topic` parameter), and they are
forwarding seams rather than emitters — the key originates at a call site
further up. **Trace each to its origins and add those to the set; if a
site cannot be traced, the lint reports it as unresolvable rather than
passing silently.** An unresolvable emitter is a hole in the gate and
must be visible as one.

Modes: `--report` (the inventory, grouped by root), `--lint` (CI gate).

**Deliverable: the true emitted set.** Everything downstream is sized by
it. Expect it to exceed 62.

### Gate rules (used from Wave 4 on)

1. **Error** — an emitted key with no authored descriptor.
2. **Error** — a key whose root is not one of the seven.
3. **Error** — an unresolvable dynamic emitter.
4. **Warn** — a seeded key that nothing emits, roots excluded. This is
   the direction that produced ~50 dead seeds; it cannot be an error
   (packs and parents legitimately have no emitter in core) but it must
   not be silent either.

---

## Wave 2 — the corpus

Delete all 89 seeds under `seeds/obj/Topic/`. Author the replacement:
**7 roots + 28 leaves = 35 rows**, every one carrying all six facets,
labels and descriptions in player voice.

Roots are seeded as rows in their own right so a subtree mute has a
descriptor to show.

### The mapping — the requirements' first deliverable

**`system.*` → `shell` / `session` / `publication`**

| Old | New |
|---|---|
| `system.command.error`, `system.access`, `system.script.aborted` | `shell.error` |
| `system.shell.{author,chat,contacts,focus,forum,fs,group,help,movement,notify,subject}` | `shell.result` |
| `system.shell.{alias,settings,var}`, `system.app.config` | `shell.config` |
| `system.{affordances,layout,mode,style,terminal.clear}` | `shell.control` |
| `system.stream` | `shell.result` |
| `system.connection.established` | `session.link` |
| `system.charactergen.{roster,state,welcome}` | `session.identity` |
| `system.broadcast` | `session.notice` |
| `system.press` | `publication.press` |
| `system.shell` (bare parent) | retired |

**`world.*` → `speech` / `act` / `sense` / `self`**

| Old | New |
|---|---|
| `world.speech.{say,shout,whisper}` | `speech.vocal` — shout/whisper are the `address` facet, not separate subjects |
| `world.speech.{dm,tell}` | `speech.comms` |
| `world.chat.message` | `speech.channel` |
| `world.{twitch,youtube,kick}.message` | `speech.relay` — platform is a transport attribute |
| `world.narration.action`, `world.hazard.{spring,disarm}`, `world.lounge.{bud,merge}` | `act.deed` |
| `world.narration.{movement,teleport}` | `act.move` |
| `world.expression.emote`, `world.emote` | `act.emote` |
| `world.combat.exchange` | `act.combat` |
| 11 × `world.perception.measurement.*` | `sense.reading` — the channel is already a `<quantity>` attribute |
| `world.perception.{inventory,search.find,search.locate,sense.look,sense.scry,sense.sense}` | `sense.survey` |
| `world.perception.ambient.*` | `sense.ambient` |
| `world.sensation.interoception` | `self.body` |
| `world.prompt` | `shell.prompt` |
| `world.wiki.page` | `publication.wiki` |
| `world.press.feed` | `publication.press` |

**The four judgment calls, decided:**

| Old | New | Why |
|---|---|---|
| `world.social.presence` | `session.presence` | It is another person's *connection* state, not fiction. `session` is "the connection itself"; this is someone else's. |
| `world.party.formation`, `world.social.roster` | `self.group` | Your affiliations are part of your own person, alongside body/standing/holding. |
| `system.access` | `shell.error` | A refused permission is a command that could not run. |
| `residence.{provision,unprovision,remodel}` | `act.deed` | See below — this one sets the convention. |

### ⭐ The convention the content case sets

`residence.*` was minted by Duncan Hall's domain-local commands: content
invented a **root**, which is exactly what the requirements now forbid.
Provisioning a room is a person doing something observable — `act.deed`,
with the `actor` facet distinguishing it. Nothing was lost by not having
its own root.

**The rule this establishes, and which `topics.md` must state:**

> Content maps onto an existing leaf and distinguishes itself with
> **facets** first. It mints a new leaf only when the *subject* genuinely
> differs from every existing one — and never a root.

Three content-local topic families (`residence.*`, `world.lounge.*`,
`world.hazard.*`) all collapse onto existing leaves under this rule,
which is the evidence it is the right one.

### Facet authoring

All six authored, none derived. `derive-topic-facets.ts` is deleted with
the corpus it served — S1's rule (two derivations of one facet drifted
within an hour) means a rewritten corpus should be authored outright.

Floors, applied only where a value is genuinely absent:
`affordance: decays`, `address: ambient`, `actor: system`,
`weight: diagnostic`, `audience: all`, `durable: false`.

---

## Wave 3 — rewire

Every emitter from Wave 1's set moves to its new key. Mostly constants
(`STEP_TOPIC`, `SCENE_TOPIC`, …) — change the declaration, not the call
sites.

Then `packages/client`: ~25 hardcoded topic strings. This is the wave
that makes the change breaking across packages, and it is why the corpus
had to be replaced in one build rather than migrated.

**Order matters:** Wave 2 lands the new descriptors, Wave 3 moves the
emitters. Between them the gate fails by design — do not run Wave 4's CI
gate until 3 is complete.

---

## Wave 4 — the gate's other two halves

1. **Runtime: tier 3 stops being silent.** `TopicCatalogue`'s
   derived-default tier files a diagnostic through `DiagnosticApi`.
   Resolution behaviour is unchanged — the frame renders, nothing throws.
   This is what would have surfaced all 23 undescribed topics.
   ⚠ Fire **once per key**, not once per frame; a chatty topic would
   otherwise flood the store.
2. **Install-time:** pack reconcile rejects a topic whose root is not one
   of the seven, and rejects a key already claimed by another
   `sourcePack` rather than overwriting it.
3. Wire `lint:topics` into the lint family + CI.

---

## Wave 5 — the tag collapse

- `KNOWN_TAGS`: add `thing`, remove `item` / `object` / `name`. Matching
  `flatten` entries (the pairing is test-asserted).
- `Mml.item` / `Mml.object` → emit `thing` via `Mml.ref`. **Two lines** —
  the chokepoint precedent `<quantity>` set in S1.
- Retire `Mml.name`: ~90 call sites each choose `Mml.player` /
  `Mml.npc` / `Mml.thing` explicitly. No framework guessing — it would be
  wrong for disguise and possessed corpses, the interesting cases.
- Assert `thing` / `player` / `npc` are absent from every passthrough
  policy. They are identity claims, exactly like `speech`.
- Source scan asserting no `Mml.name` call sites remain.

---

## Wave 6 — the resolver

**Surface.** `CommandApi.resolveAffordances(target, viewer)` forwarding
to its logic singleton. No new Api class — affordance resolution is
command-surface work, and Apis are per-subsystem.

**Wire.** `affordance-resolve` / `-result` / `-error` in
`@saxonberg/types`, modelled on `reaction-expand`. Not REST, not a
subscription.

**Candidates.** The verbs the target contributes toward the viewer via
`commandContributions`, plus the viewer's own verbs that could take the
target as an argument. No `static affords`.

**Per-verb resolution.** Build a `CommandContext` via
`CommandApi.createCommandContext` and run the verb's declared validators
without dispatching. A validator is `(context) => string | undefined`, so
the reason string already exists in player-facing prose.

Three states:

| State | When |
|---|---|
| `enabled` | Every evaluable validator passed |
| `disabled` | One failed — carry its reason verbatim |
| `pending-operand` | Passed, but the verb needs a second argument a radial cannot know |

`pending-operand` is why `put` cannot be reported plainly `enabled`; the
client renders it as a verb that opens a prompt.

**Spoiler gate.** Both the verb list and the composition list are
filtered through the existing perception/spoiler seam. **Gated means
absent** — a response admitting a hidden verb exists leaks the fact it
exists (the honest-fog rule).

**Purity.** Validators are expected side-effect-free; this build makes it
explicit. Test: resolve a target repeatedly, assert no ledger row, no
engagement, no scheduled callback.

---

## Wave 7 — docs

- `topics.md` — **rewritten**: the taxonomy, the open-vocabulary rule,
  roots-are-closed, the content convention, the two-part gate.
- `command-routing.md` — the resolver.
- `messaging.md` — the tag collapse.
- `content-packs.md` — pack-declared topics and reconcile validation.
- `CLAUDE.md` — one line for `lint:topics` in the lint family. **One
  line**; the doc owns the detail.

---

## Risks

| Risk | Handling |
|---|---|
| **The dynamic emitters can't be traced.** Three forwarding seams; if their origins can't be enumerated, the gate has a hole. | Wave 1 reports unresolvable sites as errors. If a seam is genuinely untraceable, that is a design finding to surface, not a lint exemption to add. |
| **The mapping table is wrong somewhere.** 62+ keys mapped by judgment. | The mapping is in this plan, reviewable before any seed is written. Wave 1's `--report` reconciles it against reality. |
| **Player-voice rewrite is not machine-checkable.** | Accepted; review-only (criterion 12). |
| **`self.standing` / `act.combat` may have no emitter yet.** | Gate rule 4 warns rather than errors, so a topic may lead its emitter — but it will be *visible* that it does. |
| **Scope.** This is a large build. | Two MRs, and MR A ships alone if B slips. |

## Out of scope

The radial menu and its geometry; subscription-based liveness for an open
radial; any change to dispatch; Track D.
