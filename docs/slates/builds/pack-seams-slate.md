# Pack seams slate — how content packs connect

**Captured 2026-08-01**, out of the Saxonberg session's shipping
question: Terminus and Eternal University will be content packs, EU
sits physically inside (at the base of) Terminus, and the user wants
them shipped separately — which forces the general design for how any
two packs articulate a connection. Grounded in the shipped pack
substrate ([content-packs.md](../../subsystems/content-packs.md):
manifest, reconcile-by-stamp installer, `sourcePack`, path-as-
namespace) and [boundary.md](../../subsystems/boundary.md)'s
`DeferredDestinationExit`.

## The directional rule (the whole design in one sentence)

**The annex knows the host; the host never knows the annex.** EU
declares a dependency on Terminus in its manifest; Terminus contains
zero references to EU. Knowledge direction = dependency direction,
and a pack may reference template paths only in packs it depends on.
Consequences:

- **The host is complete without any annex** — never-half-grown
  holds because absence is an authored state, not a hole.
- **"How does the host connect to the annex?" dissolves** — it
  doesn't; the annex does all the knowing.
- Install order and presence guarantees come free from ordinary
  dependency resolution at reconcile time.

## Sockets — the host's named attachment points

A **socket** is a named, stable attachment point a pack declares for
others to fill. Two kinds:

- **Boundary sockets** — a `DeferredDestinationExit` at a declared
  path with an **authored closed state** (a shut gate, a wall, a
  hoarding — real prose, a complete room). Unfilled = closed;
  filled = the exit resolves into the filler's content.
- **Graft points** — declared containers an annex may place content
  into (the university's signpost in a Terminus plaza ships in
  *EU's* pack with `container:` pointing at the graft point;
  hydration self-placement does the rest). Declared rather than
  implicit, so the host controls where dependents may put things.
  (The deeper justification is the property bridge — placing
  content on land is authorship the landowner consents to; a
  declared graft point IS that consent, given at pack-authoring
  time.)

**Multi-socket hosts (the EU case — it sits at the base of the city
with several ways in):** sockets are **individual and independent**;
the annex's manifest declares which it fills (`fills:`); filling is
**atomic per pack** (pack installation already is — EU's five gates
arrive together or not at all, no grouping machinery needed); and
the installer enforces **at most one filler per socket** (two packs
claiming the same gate = a reconcile-time conflict, refused).
Host-declared socket *groups* ("these three only make sense
together") are noted as a future option and deliberately not built —
per-pack atomicity covers the known cases.

**Socket paths are API.** A named socket is a published contract;
renaming or removing one is a breaking change with semver
discipline. Sockets are the one place pack authors owe the ecosystem
stability.

## The two socket policies

| Policy | Absence means | Example |
|---|---|---|
| **optional-with-closed-state** | the authored closed state renders; the world is complete | the EU gates in Terminus |
| **required-with-default** | impossible — the platform ships a default filler; packs may *replace* it | **the Lounge** |

The Lounge is the canonical required slot: every deployment needs *a*
lounge (kernel); ours ships as the default filler; an operator's own
lounge pack can satisfy the same slot instead. `LoungeMixin` is the
type-check layer of that slot's contract — see the capability
vocabulary below for the full contract stack.

## The provides/needs vocabulary — capabilities above the mixin roster

**(User, 2026-08-01: slot fulfillment is higher-order than the mixin
roster.)** Fulfillment runs on a **capability vocabulary** — the
virtual-package move: named roles that packs *and the platform tier*
declare they `provides:` and `needs:` in the manifest, resolved at
reconcile. The contract stack, top to bottom:

1. **Capability** — the vocabulary word (semantic): `lounge`,
   `city`, `capital`, `market`, … what role a package fills in a
   world.
2. **Anchors** — the interface surface: well-known paths a provider
   must export for the capability (the lounge's landing room; a
   city's TPA node and boundary sockets). Sockets are one anchor
   kind — the seam design plugs in underneath this layer.
3. **Mixin requirements** — the type check: the reconciler verifies
   anchors structurally (the `lounge` landing anchor must carry
   `LoungeMixin`). **The roster serves the contract; it is not the
   contract.**
4. **Invariants** — the prose contract, validator-checkable where
   possible ("reachable at spawn"; "operates a market with posted
   offers").

Rules:

- **Needs may target capabilities, not just pack names.** EU still
  depends on `terminus` concretely (the coupling is genuinely
  geographic); a traveling-fair pack needs `city` and installs into
  any world that has one. Loose coupling becomes expressible; tight
  coupling stays legal.
- **Cardinality is declared per capability, and it unifies the
  socket policies**: `lounge` is *exactly-one* — which IS
  required-with-default (the platform's own needs list demands it,
  the shipped default satisfies it, a replacement swaps it);
  `city` is *one-or-more* (Terminus and Saxonberg both provide it —
  the platform tier is a legitimate provider without being a pack).
  Unmet hard need = install refused; the optional/graceful case is
  the socket mechanism's closed states, not a soft need. (A
  `wants:` tier — "if a bank exists, my shop uses it" — is noted
  and deferred.)
- **The kernel capability vocabulary is a curated CLOSED set** —
  the module-categories / land-use house pattern: coining a
  capability is coining a mechanic. Third-party coinage under a
  namespace prefix is an open question, deferred.

## Add-only — annexes never modify host content

Grafts **place new objects into declared graft points; they never
edit host rows.** Overlay/patch semantics is where package
ecosystems go to die. If an annex needs host prose to acknowledge it
(the plaza mentioning the university), that is a host-side socket
(an authored detail slot) or it doesn't happen.

## Reconcile symmetry

Install and uninstall are the same machinery: every annex row
carries its `sourcePack` stamp, so removing EU reconciles away the
grafted signpost, and the deferred exits revert to their authored
closed states. Absence is always a well-defined, previously-authored
condition.

## The shipping tiers (decided at capture)

| Tier | Contents | Rationale |
|---|---|---|
| **Platform** (not a pack, not a slot) | **the City of Saxonberg** (+ its premises) | philosophically platform-level — it represents the Compact; not swappable within the platform (a fork may do as it pleases) |
| **Kernel slot + shipped default** | **the Lounge** (Dave's Bar presumptively ships alongside; placement open) | every game needs one; the mixin is kernel, the instance is replaceable |
| **Content packs** | **Terminus** (the dogfood host), **Eternal University** (the dogfood annex) | the migration that proves the machinery: the first real sockets, the first real fills |

## The worked example — Terminus ⊂ hosts ⊃ EU

- EU's manifest: `dependencies: [terminus]`, `fills:` the N boundary
  sockets Terminus declares for the university quarter (it sits at
  the base of the city — several ways in, each with its own closed
  state) + placements into Terminus's declared graft points.
- Terminus ships zero EU references and reads as a whole city with a
  closed old quarter when EU is absent.
- Whether EU's land is a **subdivision** of Terminus's parcel tree
  (honest to the geography; title answers to Terminus's tree; the
  cross-pack title dependency is fine since the pack dependency
  already points that way) or a **sibling parcel under the realm**
  (independent title trees; the seam purely geographic) is **open**
  — the user has said it doesn't matter much; requirements should
  pick one and say why.

## Open questions (for requirements)

1. **Subdivision vs. sibling** for EU's parcel roots (above).
2. **Graft-point declaration shape** — manifest-level list, or
   markers on the container templates themselves? And should graft
   consent eventually route through the live property bridge
   (committee-signed) rather than authoring-time declaration?
3. **Dave's Bar's tier** — platform-shipped beside the Lounge
   default, part of the default lounge filler, or its own pack.
4. **Version constraints on fills** — does a filler pin the host
   version (`terminus >= 2`), and what happens to a filled socket
   across a host upgrade that changes the socket's surroundings?
5. **Socket discovery** — how a pack author finds a host's declared
   sockets and capabilities (manifest introspection via the CMS; the
   help/api surface could render a pack's "socket sheet" and the
   world's provides ledger).
6. **The initial kernel capability list** — `lounge` is the first
   confirmed entry; candidates: `city`, `capital`, `market`,
   `newbie-area`. Curate small; every entry is API.
7. **Third-party capability coinage** — namespace-prefixed free
   coinage vs. curation-only; deferred until a third party exists.
