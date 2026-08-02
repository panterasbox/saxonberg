# Prison slate — confinement, the three enforcement tiers, and the guardrail

**Captured 2026-08-01**, out of the Saxonberg city design session
([saxonberg-city-slate.md](./saxonberg-city-slate.md) reserves the
federal facility's site). Prisons have never been designed in the
abstract; this slate is that design. Moderation is a day-one concern;
the facility is not — the split is the point of the timing section.

Related: [civics.md](../../subsystems/civics.md) (enforcement is
content on existing substrates; the six landowner powers),
[access.md](../../subsystems/access.md) /
[parcel.md](../../subsystems/parcel.md) (the exclusion machinery
confinement inverts), [accountability.md](../../subsystems/accountability.md)
(the harm-consent ledger custody rides),
[banking.md](../../subsystems/banking.md) (fines),
[time.md](../../subsystems/time.md) (terms), the courts/venire
primitive (the appeal path).

## The three enforcement tiers — and the guardrail above all of them

| Tier | Offense class | Handled by | Face |
|---|---|---|---|
| **Meta moderation** | real-world conduct: harassment, hate, abuse | account machinery — mutes, bans, staff power | **none. ever.** |
| **Locality law** | in-fiction crime under a locality's rules | that locality's government + its gaol | the local skin |
| **Compact crimes** | offenses against the machine itself: record-tampering attempts, code-trust abuse, conservation fraud | the Compact's process | **the federal facility** |

**The guardrail (load-bearing, non-negotiable): real-conduct
moderation never gets a diegetic costume.** A harasser does not go to
a fictional gaol — theatricalizing real abuse both trivializes the
offense and forces its targets to keep sharing a world with the
abuser. Meta offenses are handled as what they are, at the account
layer, honestly labeled. The prison tier exists for **in-fiction
crime only**: harm done *as a character, to characters, through game
mechanics* — griefing, theft, ledger fraud, sabotage. This is the
meta/fiction jargon rule applied to enforcement, and it is the first
sentence of any future criminal-code conversation.

## PrisonMixin — a locality you cannot leave

**The abstraction (user, 2026-08-01): maximally abstract — the same
mixin models ANY prison, no matter the skin.** The definition that
achieves it: **a prison is a locality you cannot leave.** The mixin
owns exactly two invariants, and nothing about architecture:

- **The boundary** — inverted banishment over an *extent*, where the
  extent is any scope: one cell, a warren of cells, a building, an
  island, an entire Locality with its own address chain. The
  property machinery already knows how to exclude someone *from* a
  parcel; a prison is exclusion from everywhere *but* the extent.
  Same access substrate, flipped.
- **The custody book** — who is held, under what authority, and the
  sentence state: term (game-time), fine (banking — fine legs move
  only through the real chokepoints), conditions (parole-shaped
  predicates). Intake is a custody transfer with an accountability
  ledger entry (who committed whom, under what authority, when).
  Derive-on-read: release eligibility is a read, not a cron job.

Everything else is **content and interior law, never mixin
configuration**:

- **Cells are provisioned shelters on the residence spine** — the
  dorm's dark twin: assigned rather than chosen, keyed to custody
  rather than lease. An island's cells are scattered huts; a
  warren's are stone boxes; the substrate doesn't care.
- **Interior character is the prison's own local law.** A prison IS
  a jurisdiction — its extent can carry a regime the way any
  locality carries rules (civics/access machinery, nothing new).
  Maximum security (confined to quarters, scheduled movement) vs.
  open work-colony (roam the whole extent) is a difference in
  interior law, not a `securityLevel` field. The mixin never grows
  one.
- **The panopticon is a perception skin** — surveillance is the
  perception/concealment substrate configured aggressively
  (sightlines, no concealment bands, a scrying fixture), not prison
  mechanics.
- **Visitation and appeal are function, not amenity** — confinement
  that severs all social contact is a ban with extra steps;
  visitors and letters ride existing substrates, and the exit path
  points at the courts (the venire primitive): commitment
  appealable, parole petitionable, the visible process being what
  makes this civics rather than punishment theater.

Skin checklist — island colony, cell warren, maximum security,
panopticon, open colony — each reduces to: pick an extent, write its
interior law, author its content, attach the two invariants.

**The experience rule: a sentence must remain a *place*.** Visitors,
letters, plausibly labor-for-time. The alternative — confinement as
pure fun-removal — should just be honest and be a ban. (Kernel-floor
note: the tenure resolution's protected holder bundle "binds even
the executive by due process" — a prisoner keeps the floor; due
process is not suspended by conviction.)

## The federal facility — Saxonberg's, of its own design

Locality gaols are skins on the mixin; the federal facility is the
Compact's own design, for the different criminality. Sited on the
**reserved off-axis edge parcel** in the City of Saxonberg — the
civic axis says "this is how we govern," and the prison is
deliberately not part of that sentence. Plausibly reachable only in
custody (the TPA substrate makes an enclave trivial — an
Alcatraz-shaped answer the requirements pass can take or leave).

## Timing — the split

- **Now:** this slate (the abstract design), and the reserved site
  in Saxonberg. Day-one moderation stays what it already is — meta,
  staff-held, honest about being meta. No facility, no theater.
- **At the first real enforcement consumer:** the substrate + the
  federal facility, built alongside the first criminal-code act or
  the first serious griefing incident, whichever arrives first (it
  will be the griefing). Locality gaols follow as localities write
  law that needs them.

## Open questions (for requirements)

1. **Are Compact crimes diegetically prosecuted at all?** The
   alternative reading: offenses against meta machinery are handled
   meta (like moderation), and the federal facility is their
   *honest, visible face* — a place the consequence is legible —
   rather than a role-play destination with trials. Unresolved;
   raised at capture and deliberately left open.
2. **What does confinement restrict beyond movement?** Comms
   especially — implant/aether reach from a cell (the aether is the
   internet; does the prison have wifi?), market access, forum
   access. Instinct: restrict little beyond movement and see what
   the fiction needs; every added restriction is a step toward
   fun-removal.
3. **Interim committal authority** — before criminal code exists,
   who can commit (staff? the Saxonberg committee? nobody — the
   facility simply doesn't operate until law does)? Instinct: the
   last one; an empty prison is a better statement than an
   arbitrary one.
4. **Escape.** An honest world implies escape attempts are *real*
   (the walls are real walls, the access rules are real rules).
   Escape-as-content is extremely cool and extremely
   grief-adjacent; needs its own careful pass.
5. **Fines vs. terms economics** — conversion rates, indigence,
   whether wealth buys shorter confinement (it shouldn't, and the
   two-tier money design gives us the tools to say so precisely).
6. **Mixin placement** — `lib/civics/` seems right (confinement is
   civic machinery), pending the module-category check at build
   time.
