# Delivery & addressing slate (working doc)

> **Status: PARTIAL** — the addressing foundation + the realm's scheme
> shipped → [address.md](../../subsystems/address.md); carriage and the
> freight market → [logistics.md](../../subsystems/logistics.md); forums +
> the Subject layer → [forums.md](../../subsystems/forums.md). ⚠ Two
> utilities shipped **without** the provider substrate designed here: water
> as `Conduit` over a template-path extent with the six-word `SupplyState`
> ([watershed.md](../../subsystems/watershed.md)), and the "aether line" as
> **mana** — `ManaMain` + `ManaPoweredMixin`
> ([fasttravel.md](../../subsystems/fasttravel.md),
> [magic-items.md](../../subsystems/magic-items.md))
> **Left:** providers + coverage + metering as ONE substrate (⚠ reconcile
> with the two shipped shapes) · anchors + catchment-vs-delivery · per-service
> off-grid + service grades · the delivery overlay + trunking (Q5) · the
> network walk / lines on exits / the easement (⚠ `cut` shipped STORED) ·
> post — the `delivers` brain, the carrier round, mailboxes · the aether-line
> ↔ comms unification (⚠ contradicted: the line is mana; the aether is the
> internet) · aether-mail + the inbox · the broadcast / field carry + the
> zone-varying ambient field · per-parcel billing (the boundary) · Q2 · Q3 ·
> Q7's mail / broadcast half
> **Size:** a build

> **Forum factoring superseded by [forums-slate.md](../tails/forums-slate.md)
> (2026-06):** the § *Layer 2* "social forum is a chat facet" framing is
> replaced by a first-class forum primitive (`Board`/`Entry` Documents +
> Catalogue). Everything else this slate establishes for the forum — aether
> transport, `GroupRef` audience, `world.forum.*` Topic, per-surface override
> — is retained by that slate. Two specific § L2 calls are **reversed**
> there: "there is no 'Subject' entity" (a thin `Subject` Document is
> reinstated to link a subject's surfaces, since ephemeral subjects/bills
> share audiences) and chat-as-ring-only (an opt-in `logged` retention is
> added). The rest of this slate (mail, utilities, broadcast) is unaffected.

See also:

- [comms-slate.md](../tails/comms-slate.md) — the **shipped instance** of the
  line/field duality (acoustic = field, implant/aether = line); "async
  mail" is flagged there as adjacent-future — this slate is its home. The
  **aether line** unifies with the comms implant transport (same substance,
  two access modes).
- [chat-slate.md](../tails/chat-slate.md) / [docs/subsystems/chat.md](../../subsystems/chat.md)
  — the `Channel` is the **aether-forum seed** and owner of the
  conversation-primitive / facet model the Layer-2 comms section extends
  (membership ≠ subscription; projection + override).
- [docs/subsystems/grouping.md](../../subsystems/grouping.md) — the `GroupRef` +
  `GroupApi` facade every Layer-2 comms **surface** binds to (membership/roles
  read-only via the facade; a managed `Group` Document backs curated subjects,
  but a projected ref — guild/MQL/contacts — has no Document and still works).
- [wiki-slate.md](../tails/wiki-slate.md) — the **reference** half of Layer 2:
  out-of-fiction, **not** comms, **not** aether (own-not-external); the forum
  subject-tree borrows its `FolderZone` + `AccessApi` namespace pattern.
- [reactions-slate.md](../tails/reactions-slate.md) — **threading** + the gutter
  message-id the forum thread-tree rides.
- [docs/subsystems/streaming.md](../../subsystems/streaming.md) — the
  **binding pattern** (an in-game model mirrored from external reality) the
  gamification seam generalizes.
- [docs/subsystems/location.md](../../subsystems/location.md) — the **exit
  graph**, **zones**, the **Warren** coordinator precedent, and **TPA** as
  a sparse body-reachability overlay. This substrate is a sibling overlay.
- [docs/subsystems/zone.md](../../subsystems/zone.md) — the **two fused jobs**
  of zones (spatial integrity vs management taxonomy) this slate leans on
  the second of, never the first.
- [docs/subsystems/biome.md](../../subsystems/biome.md) — explicitly **not**
  the substrate here (different graph: built network, not containment), but
  shares the **model-honestly** principle (honest numbers → bindable +
  computable) and the **nearest-ancestor walk** shape.
- [npc-behavior-slate.md](./npc-behavior-slate.md) /
  [docs/subsystems/activity.md](../../subsystems/activity.md) — the **carrier's
  brain** is consumed wholesale from here (one new `delivers` brain on the
  existing ladder); the round rides the scheduler + engagement slots.
- [docs/subsystems/access.md](../../subsystems/access.md) — provider ownership
  / authoring is normal zone/access; coverage is a separate concern.
- [economy-slate.md](./economy-slate.md) — postage, utility billing, and
  finite local stores (a charged crystal vs a metered feed).

---

## Principle

1. **Delivery-to-a-locality is one substrate.** Mail, parcels, power,
   cable, phone, aether — all ask "how does *something* reach a *place* (or
   a person at a place), and what happens once it arrives?"
2. **Two topologies, honestly distinct** — the **line** (a connection from
   a provider to one *addressed* subscriber; point-to-point, billable,
   cuttable) and the **field** (radiated from a transmitter, received by
   anything *in range* with a receiver; no address). The comms
   acoustic/implant split is this, already shipped, for the special case of
   speech.
3. **Two layers** — **Layer 1: substance to a place** (power, water,
   aether-feed, the cable/phone *bearer*) and **Layer 2: payload to a
   recipient** (a call, a show, an email, a forum post). Don't conflate the
   pipe with what flows through it.
4. **Overlays forget geometry.** The exit graph is the geometric ground
   truth; delivery routes in its own simplified space and touches the exit
   graph only at **anchor objects**. Shedding spatial-integrity invariants
   is *why* the overlay is simple.
5. **Service follows infrastructure.** Coverage is something someone built;
   **off-grid is the absence of a provider, not a flag**. The edge of
   coverage *is* the frontier, drawn by infrastructure, not terrain.
6. **Model honestly → bindable to reality.** Honest, stateful, metered
   service points let a vertical mirror real utilities (the binding
   pattern) and let a game layer key on the state — the platform thesis as
   an engineering constraint, not a feature.

---

## Graphs over one node set

Multiple graphs ride the same Locations, with different edge semantics:

| Graph | Edge means | Character |
|---|---|---|
| **Exit** (Exitable) | "walk A→B in one step" | dense, contiguous, costly, hard invariants |
| **Zone** | containment / taxonomy | coarse tree-of-graphs |
| **TPA** | "jump a *body* here" | sparse, gated, geometry-ignoring |
| **Delivery** (this) | "a *thing/signal* reaches here" | hub-and-spoke, addressed |

Overlays sort into two flavors:

- **Geometric overlays** care *where things physically are* — TPA,
  broadcast range, acoustic reach.
- **Logical overlays** care *what set you belong to* — permissions, comms
  membership, and **the delivery network**.

Zones are the one object that fused a **geometric job** (coordinate-frame
integrity — a constraint *on* the exit graph) with a **logical job**
(management/permission taxonomy). The delivery graph is a **logical
overlay, a sibling of permissions** — it borrows the *taxonomy* sense of
locality and must **not** inherit the *spatial-integrity* sense.

The crossover is localized to **anchors**: an object (mailbox, meter,
service entrance) that carries *two identities* — an **exit-graph identity**
(it sits at a Location) and an **overlay identity** (an address). The
overlay does long-haul routing; the anchor does the **last-foot
translation** back into physical space. This is why address↔location is
many-to-many: they are nodes in different graphs, bridged by an anchor.

---

## Layer 1 — substance to a place

### Addressing (the namespace)

**Decided:** *(the namespace, the path shape and the PathTrie index
shipped → [address.md § Three independent namespaces](../../subsystems/address.md),
§ The coverage index; the one-address-per-place decision graduated to
§ The realm's scheme, as shipped)*

- **Routing is longest-prefix-match** over provider-claimed subtrees: local
  delivery within your subtree; cross-locality climbs to a common ancestor
  and trunks. Overlap → the more-specific provider wins; gaps → off-grid.
- **Catchment vs delivery are different relations.** *Catchment* (which
  Locations belong to an address) is genuinely many-to-many and stays fuzzy.
  *Delivery* stays a **clean function**: Address → one **anchor** → one
  Location. A PO-box wall is 200 anchors in one room; a campus is 30
  Locations behind one anchor. The anchor keeps routing unambiguous while
  catchment stays honest.

*The proposed tier roles shipped as ONE `Locality` concept at variable
depth (no `Region` / `Block` / `Spot` classes) and the scheme shipped as
content under `terminus/` → [address.md § The Locality
node](../../subsystems/address.md), § The realm's scheme, as shipped.*

**Off-grid (decided — "I like modeling real-life wrinkles that engage").**
A place no provider covers is **unaddressable / unserved by default** — not
a flag, just the absence of coverage. Engaging consequences fall out: a new
settlement has no mail until someone stands up a post office (general
delivery in the meantime); off the **aether line**, standing enchantments
don't hold (the wilderness is *materially* wild, not just scenically). Off-
grid is **per-service** — a half-settled place can have the post rider but
no aether feed. Service has *grades* too (a locality on a long thin trunk
gets slow mail before good mail). Wiring up a locality is **civilization
visibly spreading** — content (or, later, players) build toward it.

### Providers & coverage

A **provider** is the keystone object — what claims coverage, what off-grid
is the absence of, what the carrier belongs to, what a team stands up to
bring a place onto the grid.

**Proposed shape:**

- An **incorporeal coordinator** (same base as the Warren — identity +
  state, no body), but its **own class** (it coordinates by *prefix
  coverage*, not a live-member set). Common core: a **service tag**
  (`post` / `aether` / `power` …), a **coverage prefix** (the address
  subtree — claiming it *defines* a Locality), a **status** (up / down /
  degraded), and an optional ref to a **located building** (the post office
  you can walk into — separate object, like `Lounge` room vs `LoungeWarren`;
  not every provider has a door).
- **Per-service, independent coverage.** A provider serves one service over
  its own prefix; the shared *address* doesn't mean shared *coverage*, so
  partial development is first-class.
- **Two operational facets by service kind:**
  - **Conveyance** (post, parcel) — owns a **carrier** + a **physical
    territory** (a zone, ideally grid) + **trunk peers**. Discrete payloads
    physically travel.
  - **Source** (power, aether, water) — a **local supply**; covered points
    are served because a provider covers them and is *up*; consumption is
    **metered** at the point. No carrier, no walk, no trunk (substance
    doesn't relocate between localities). Phone/cable are source providers
    for the *line*; the call/show is Layer-2 traffic over it.
- **The unifying mechanic — one upward walk.** The address tree carries two
  kinds of mark: **anchors** (where delivery lands) and **provider
  coverage** (who serves a subtree). Every query is the *same
  nearest-ancestor walk* the engine already does (zone resolve, biome,
  `lookupField`): "who delivers here?" walks up for the nearest post
  provider; "is there aether here?" walks up for the nearest aether
  provider; "where does the letter land?" walks up for the nearest anchor.
  **Off-grid = the walk hit the root without a match.**
- **Two-level presence override:** *present* = nearest provider exists
  **and** up **and** the point isn't cut (a per-anchor flag: unpaid bill,
  severed line).
- **Authoring stays clean.** A provider is **seeded content** in the
  authorship tree (editing it = normal zone/access). Coverage is **inherited
  by prefix**: drop a shop addressed under `Terminus/Oldtown/…` and
  Terminus's post office serves it for free. The authorship grain (a team's
  published unit, any size) and the delivery grain (a Locality) **slide
  independently** — which is *why* divergence was the right call.
- **Trunk** is a conveyance concept (only carried things relocate): resolve
  the destination provider by prefix-match, abstract scheduled hop, their
  carrier finishes. **Flat in v1**; regional sorting hubs are a later
  refinement.

> **⭐ Why mail is hub-and-spoke and freight is not (2026-07-31).** The
> trunk design above *is* hub-and-spoke, and correctly so — see
> [freight-slate § Topology](./freight-slate.md). Hub-and-spoke is an
> **economic** result, not a topological one: **N origins and N
> destinations need N² direct routes or 2N through a hub**, and the hub
> costs a detour to buy **load factor**. **The switch is CAPACITY** —
> the same line that separates mail from freight for the TPA. **Mail is
> small and fragmented, so it always consolidates**; a full wagonload
> goes direct. Which also makes the world's three networks genuinely
> distinct objects: a **utility** is a tree rooted at a source with
> intrinsic direction, **freight** is a sourceless bidirectional O-D
> matrix, and the **TPA** is an authored directed graph where distance
> costs nothing.

### Distribution — coverage is legal, connection is physical (2026-07-31)

**(Out of the freight/transport session: *"most of that flows under the
same road network that transport would use, I presume."*)** Correct —
and the section above left the hole in exactly the right shape.

Coverage as designed is deliberately **non-spatial** (a prefix claim +
the nearest-ancestor walk). Real distribution is intensely spatial, and
it follows roads for one reason: **rights-of-way.** The road corridor is
continuous, publicly-controlled land — the only kind you can run a main
along without negotiating with a hundred owners.

The two are **not** in conflict; they answer different questions, and
real utilities have exactly this split:

| Question | Mechanism |
|---|---|
| *Am I entitled to service here?* | **prefix coverage** — the **franchise area**, a legal fact. **Unchanged from the design above.** |
| *Is service actually reaching me right now?* | **the network walk** — a physical fact |

That is **service available vs. service connected** (which is why
connection fees exist). And the design already anticipated it: presence
is *"provider exists **and** up **and** the point isn't cut."*

> **The `cut` flag becomes DERIVED rather than stamped** — *is there an
> intact path from a source to here?*

#### ⭐⭐ Lines are edge attributes on exits

Same trick as [freight-slate](./freight-slate.md)'s emergent road
network: **you do not author a pipe network.** Mark **which exits carry
which service**, and connectivity derives from the walk. **Zero new
topology.**

And it buys what prefix coverage never can — **a line is a thing at a
place**: diggable, cuttable, tappable, repairable, with an actual
location.

> **Prefix coverage can only fail wholesale; a network fails locally
> and directionally.**

Either Terminus has power, or **the line to Wharfside is cut and only
Wharfside is dark.** The difference between an *announcement* and an
*event* — and it gives the storm contract's work orders somewhere to
**be**, and the linemen somewhere to **go**.

#### ⭐ The easement is where it turns political

The **road owner controls the corridor.** A turnpike trust owns the
road; the water company needs a main under it. So either a **negotiated
easement**, or a **statutory right-of-way** — which is what real law
grants, precisely because negotiating with every landowner is
impossible.

> **⭐⭐ The honest argument for compulsory easements is the HOLDOUT
> PROBLEM — which is LULU inverted.** LULU: *nobody* wants the abattoir.
> Holdout: **everybody wants the water, and one landowner can block a
> whole district.** Two collective-action failures with opposite signs,
> both resolving upward, both with **compensation** as the honest
> mechanism. (Module in
> [amendment-library-slate](./amendment-library-slate.md); the LULU half
> is in [zoning-slate](./zoning-slate.md).)

**And "digging up the road" is a real conflict between two businesses** —
**measurable**, because road quality is a number (exit `speed`). *"The
utility trashed my turnpike"* is a **provable claim**, not a grievance.

#### ⭐ Topology differs by service, and the differences are legible

| Service | Topology |
|---|---|
| water · sewer · power · gas · line | **follows the road** |
| **the aether** | **radiates from towers** — a different topology entirely |
| **sewage** | **flows downhill** — directional |

So **you can be on the aether and off the water main**: frontier towns
with information and no plumbing, which is exactly the modern rural
pattern. And sewage is a **third consumer of the "downstream of"
relation** (with effluent nuisance and the water channel in
[zoning-slate](./zoning-slate.md)) — **build it once.** The outfall,
incidentally, is a LULU.

#### ⭐⭐ The unifying concept: natural monopoly

*Homed 2026-09-22 → [settlement-model.md § 8 · Absorbed from delivery-slate — natural monopoly](../../settlement-model.md).*

⚠ **Boundary:** **metering and per-parcel billing belong to the
property/residences build** (service to titled property, the
invoice-the-owners loop). **Design the network; let them own the
invoice.**

### The carrier (post) — almost all delegation

The maximally-simulated corner turns out to be the **cheapest**, because
it's where the NPC substrate was already aimed. A carrier is a
`Character` + `Behaved` behavior-data:

- **Consumed from the automation substrate:** the round (`patrols`/
  locomotion/scheduler, jittered cadence), talking to the postman
  (`tree-dialogue`), reacting to being waylaid (`reacts`/`defends`), idle
  business (`idles`), and all contention (engagement slots).
- **The one new atom:** a **`delivers` brain** (a single marked, path-
  resolved module — no registry). It walks a circuit of its territory's
  anchors (derivable in a grid zone) and at each stop **drops** pending
  inbound payloads (`ContainmentApi.move` into the mailbox) and **collects**
  outbound from the local postbox. The carrier physically carries the mail
  between stops.
- **Free wins from the substrate:** a *predictable daily round*
  (interceptable — wait for / waylay the post); *address the postman → his
  round pauses* (engagement slots, the slate's own worked example); *rob the
  carrier → get the letters* (it's just robbing an NPC carrying addressed
  Things — no postal-specific interception system). Personality (Gus) is
  authored behavior-data, not engine.

> **Scope note:** the carrier is where this slate's conversation
> over-drilled. The systems-level takeaway is the boundary: **delivery
> contributes one brain and a queue convention; the rest is substrate.**

### The aether line — unifying utilities with comms

The strongest unification. The comms baseline implant is universal and
always-on because there's an **ambient aether field** (broadcast / Layer-1
*field*, weak, everywhere) — your implant is its receiver. The **aether
line** is the *same substance delivered instead of broadcast*: a municipal
feed (Layer-1 *line*, strong, addressed) piped to a building. A building on
the line can hold **standing enchantments / wards / autonomous magical
fixtures drawing on piped aether, with no caster present** — the feed is the
agent-substitute. This is the diegetic answer to "local magic without an
attuned agent," and it makes aether the *same substance* across the comms
and utility substrates (fractal line/field). Off-grid → no piped aether →
magic doesn't hold out there. (Cross-ref [comms-slate.md](../tails/comms-slate.md):
substance-delivery is Layer 1; message-routing — DM/chat membership — is
Layer 2 over it.)

### The vertical seam (gamification — validation lens, not a build)

"Model your real home, put a game over it" is the **binding pattern** the
[stream relay](../../subsystems/streaming.md) already proved one
layer up (an external channel mirrored into the game). A service point with an
`externalBinding` to a real smart meter mirrors real consumption as in-game
state; the game layer (penalty for lights left on) sits on the mirror. It
demands exactly what the diegetic design already wants — a **first-class,
honestly-metered, consuming service point** — so the fictional-aether and
real-electricity verticals **converge on one engine requirement** (the
validation that the substrate has the right bones). Gradient: *read-only
mirror* (observe + score) → *write-back actuation* (finish a quest, your
real bulb turns off — much bigger commitment). For Saxonberg this is a lens,
not a slated build.

---

## Layer 2 — payloads over the aether (comms)

The line/field duality recurs at the payload layer, but the substantive
design here is the **comms** family — chat, DM, email, forums. The owning
detail lives in [comms-slate.md](../tails/comms-slate.md) /
[chat-slate.md](../tails/chat-slate.md) / [reactions-slate.md](../tails/reactions-slate.md);
this section is the **systems framing** of how Layer-2 payloads ride the
substrate, and where forums/email land relative to chat.

### Two animals — comms vs reference

*Shipped as decided — forums and chat ride the aether implant
([forums.md](../../subsystems/forums.md) l.3, [chat.md](../../subsystems/chat.md)),
the wiki is ours and out-of-fiction ([wiki.md](../../subsystems/wiki.md)).
⚠ No subsystem doc states the WHY (talk in-world, look things up
out-of-world); the cut text is verbatim in the compaction ledger's Handoff →
`docs/plans/slate-compaction/address.md`.*

### Build-vs-integrate — own it, top to bottom

*Shipped as decided — own forums, own wiki; an external service attaches
only as a mirror ([streaming.md](../../subsystems/streaming.md),
[twitch-relay.md](../../subsystems/twitch-relay.md)). ⚠ The four reasons
(diegesis · bus primacy · the in-client integration is the value · cheap on
our substrate) are in no subsystem doc; verbatim in the ledger's Handoff.*

### Email and forums are facets, not new subsystems

*Superseded by the code: the forum half shipped as `Subject → Board →
Thread → Post` with `grain` / `parentSubject` organizers, not a `FolderZone`
namespace ([forums.md](../../subsystems/forums.md)); the genre is the closed
root `publication.forum`, there is no `world.forum.*` / `world.mail.*`
([topics.md](../../subsystems/topics.md)); L1 is `Subject.groupRef`. The
email / inbox half is UNBUILT — carried by § The three products below.*

### Surfaces bind a `GroupRef` + an override layer

*Shipped as the Subject layer — `curated` / `bound` / `open` audiences,
à-la-carte surfaces under one `groupRef`, group-level changes cascading;
the "there is no Subject entity" call was REVERSED (a thin `Subject`
Document, `forum_subjects`) → [forums.md § The Subject layer — the linking
spine](../../subsystems/forums.md).*

### The three products (all over the aether; distinct artifacts)

- ~~**Chat**~~ — shipped → [chat.md](../../subsystems/chat.md).
- **Email / aether-mail** — the DM/ad-hoc primitive + a **persistent inbox**
  Document, **addressed to a person**, async. (Physical **postal** mail —
  carrying *objects* to a mailbox — is the Layer-1 *conveyance* sibling above;
  aether-mail is message-only.)
- ~~**Forum**~~ — shipped → [forums.md](../../subsystems/forums.md) (⚠ the
  organizer is `open` / `ordered`, not wiki-namespace-shaped).

What's genuinely *new* to build is small: a **persistent thread-tree board
Document** + an **inbox Document** (each in its own collection), the
**async-browse views**, the `world.mail.*` / `world.forum.*` engine `Topic`
genres, and **generalizing the per-surface override beyond chat**. Transport,
audience, addressing, and threading already exist or are slated.

### Broadcast / field (Layer-1 carry, payload-agnostic)

Transmitter + receiver reusing the acoustic-reach machinery (a source
radiating over rooms, range-parameterized); reception = in-range +
has-receiver, no address. Open: the **ambient aether field** uniform vs
**zone-varying** (lean zone-varying — dead zones and high-aether sanctums make
"magic is reliable *here*" diegetic).

---

## Open questions

1. ~~**The Saxonberg address scheme**~~ — resolved: fourteen Localities under
   `terminus/` → [address.md § The realm's scheme, as
   shipped](../../subsystems/address.md); the typable form + disambiguation
   is `resolvePlace` (§ The resolve chain).
2. **Provider class shape** — one `Provider` with a kind discriminator +
   facet fields/mixins, vs separate conveyance/source classes. *Lean: one
   concept, facet composed where real (don't pre-split).*
3. **Metering details** — instantaneous draw (lazy, on read) vs integrated
   billing (scheduler); metered-infinite grid vs finite local store
   (battery / charged crystal); service-absent **gates fixtures off**
   (augmentation-style active-gating). *Leans noted; unbuilt.*
4. ~~**Subsystem name + home**~~ — resolved: `lib/address/`, `AddressApi`
   ([address.md](../../subsystems/address.md)).
5. **Trunk hierarchy** — flat v1 vs regional sorting hubs.
6. ~~**Address node reification**~~ — resolved: only the `Locality` tier is
   reified ([address.md § The Locality node](../../subsystems/address.md)).
7. **Layer-2 designs** (mail / forums / broadcast) — their own slates/waves.

---

## Separable build units (sequencing deferred by decision)

Not an ordering — the natural seams, to be sequenced when build strategy is
discussed:

- ~~**Addressing foundation**~~ — shipped → [address.md](../../subsystems/address.md);
  anchors + provider-grade off-grid stay with providers, below.
- **Providers + coverage + one *source* service end-to-end** (power or
  aether) — metering, presence-gating, the two-level override.
- **The aether-line ↔ comms unification** (ambient field + municipal feed).
- **Post (the conveyance facet)** — carrier territory, the `delivers` brain,
  queues, flat trunk.
- **Layer 2** — mail (postal + aether), forums, broadcast/field.
- **The vertical binding seam** — validation only; likely never for
  Saxonberg.

---

## What this slate does NOT cover

- **The NPC brain engine / dialogue / combat** → npc-behavior, npc-dialogue;
  consumed (the carrier is one brain + queues).
- **The comms transports themselves** (acoustic/implant verbs) → comms; this
  extends them with the aether *line* and is their async-mail home.
- **Economy balance** (pricing, conservation tuning) → economy; this
  supplies the metered/conveyed events it consumes.
- **The CMS publishing pipeline** → cms; addresses/coverage go live on
  publish, but the pipeline is not redesigned here.
- **General pathfinding** — sidestepped by aligning carrier territory to
  grid zones (greedy coordinate descent, no A*).
```
