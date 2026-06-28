# Experience — the Registrar (the rolls; the records track)

> **Status:** staging design (experience carve — first pass, 2026-06-27). The
> third corner of the §14 evidence triangle (**the rolls**) and the home of the
> **records route** the morgue points at.
> **Kind:** a *place* + an investigative *track*, parallel to
> [the-morgue.md](./the-morgue.md).
> **Placement:** the civic **Registrar** is in **Terminus**, across Gus's gate —
> a *municipal* authority, **not a campus service** (you don't register to vote
> at a university). A light **campus enrollment/intake office** is the thread's
> on-ramp (Dunny's workplace).
> **Corrects the bible:** §4 and §14 mislocated "the Registrar" *on campus* — the
> same error as the morgue. The civic authority is the city's; the campus has
> only an enrollment intake.
> **Carves (spent):** [Bram](../npcs/enrollment-supervisor.md) (enrollment
> supervisor — the on-ramp) + [Pell](../npcs/records-official.md) (records official
> — the city's one carve). Per the three-tier room discipline, *every other space*
> is prose + a few objects + a **spawned** population; the enumerator (§13) is
> deferred to the census-form pass.
> **Retire when:** cemented as Terminus location + content seeds in YAML.

---

## The experience in one line

The third evidence-home — **the rolls** — and the place where **personhood is
administered as paperwork.** Where the count is cooked, and where Dunny's
discovery leads.

## The corrected geography

- The civic **Registrar** (rolls / census / enfranchisement / **the fraud**)
  lives in **Terminus**, across Gus's gate. This is §15.4's "**parent authority**"
  — there's no separate parent; that *was* the mislocation. The records route
  leads out to the city, same as the body did.
- The campus has a light **enrollment / intake office** — academic intake (who's
  enrolled; the population fed to the city census — *arriving = being counted*,
  §6). **Where Dunny's census-prep started and his discovery began.** The thread
  *starts* here and *leads* downtown; the office itself is clean-ish.
- So **two of the three evidence-homes — body + rolls — are in the city**; the
  scene and the social layer stay on campus. The rot runs outward (§9).

## What the rolls *are* (the §8 crux)

Because the aether **can't authenticate** (§8), "real person on the rolls" can't
be aether-verified — so personhood is anchored two ways, and the **gap between
them is the case**:

- **The official side — the filing.** Each counted person is anchored by a
  **physical certified document** (an arrival/identity certificate). The
  Registrar holds these. *Forge one → a phantom; destroy/refile one → an
  erasure.* The fraud is **document manipulation.**
- **The lived side — the exhaust.** A real person leaves a recognition shadow
  (the belief substrate). The *world* holds this — read **across the world via
  the recognition/belief substrate** (the social layer), not at any one place.

**Dunny's flag-the-unreal method is just cross-referencing those two**, and the
Registrar is the *official* side. Physical, certified, contestable — like keys
and bodies.

## The records track (the investigative function)

Read the filings and find the names whose paper says "real" but whose **exhaust
says otherwise** — phantoms (filed, no shadow) — and the person-shaped **holes**
(a shadow with no filing — the erased). Cross-check the rolls (what the paperwork
*claims*) against the **body** (the morgue) and **testimony** (the
recognition/belief substrate). The disagreements are the case. This is the home of the records route the morgue
already points at ("*who signed the certificate*" → it was filed **here**).

## The morgue–Registrar pair (the city's personhood machine)

The two civic bureaucracies are a matched set, both in Terminus, and **connected**:
the **morgue files your *death*; the Registrar files your *existence*.** The
corpse-laundering literally is *"the morgue files a death → the Registrar records
it to balance the books."* Two halves of one machine — where personhood becomes
paperwork, coming and going.

## The fraud

Cooked **downtown**, and banal: a **complicit official** rubber-stamping
reconciliations (thin — the Vance-pattern) over a **structural** process the
handler exploits (§11/§15.1 — no villain at the desk). The **campus intake is
clean-ish**; the real manipulation — the re-filings, the erased names re-anchored
— is the city Registrar's. The campus is where you *find the thread*; the city is
where it *lives*.

## Access (the records-route immsim — same as the morgue)

The records are access-controlled, so they have their own contested access —
and the over-determination (§17.G) is sharpest here: **the same ACCESS delta,
three doors, three different *things you actually do*.** The pathways differ by
*verb*, not just flavor — which is what makes each one's casting choice
deliberate:

| Door | Verb | Where | Cast |
|---|---|---|---|
| **Deputization** | *file* — beat the system | the proctors office | **cast-free** (flat indifference + paperwork) |
| **Insider** | *talk* — win a person | the records floor | **[Pell](../npcs/records-official.md)** (the crack) |
| **Break-in** | *sneak* — beat the lock | the archive / vault | **no one** |

The talk-door **earns** Pell; the other two earn **nobody** — the casting is
the point, not an oversight. (A fourth, lighter door: the **public service** —
request *a* record legitimately at the window — clean but limited, you get the
one filing, not the run of the place.) The §8 physical-anchor nature is what
makes records contestable at all; truth stays over-determined (rolls + body +
exhaust), so **no single door gates it.**

### The deputization door (the *file* pathway — its settled spine)

The cast-free door, worked out in full so it builds straight:

- **Effect:** a **STANDING** delta — you become a *deputized investigator* —
  that **cascades to ACCESS**, but **jurisdiction-gated**: a master key on
  *campus* (Zones owned by the school's group), only a *presented credential*
  in the *city* (the morgue / registrar are Terminus's — a campus writ is a doc
  a city official chooses to honor, §8).
- **Derived, not a flag.** Deputization is **not** a stored boolean. An
  append-only **authorization ledger** (proctor `authorize` / `revoke` events,
  scoped + expiring) → **`isDeputized(actor, scope)` derives on read** (latest
  non-revoked, non-expired) — the house derive-don't-track rule (renown /
  competence / authoring all do this). Access honors it via an **MQL-defined
  group** over that derived status (`Zone.accessGroups`, no hand-mutated roster,
  no new flag). **Renown *gates* the grant; it doesn't *become* it** — the grant
  stays a deliberate act, not an auto-threshold, so the puzzle survives.
- **The credential rides the wallet.** The writ is one record in the
  implant's credential-holder app — the wallet substrate is now **shipped** (see
  [credential.md](../../../subsystems/credential.md)); **deputization** itself is
  its deferred tenant (the issuer-authorization ledger + single `CredentialCard`,
  in [tails/credential-wallet-slate.md](../../../slates/tails/credential-wallet-slate.md)).
  The §8 physical card is the cross-jurisdiction *presentation*, not the source
  of truth.
- **Motive = incompetent, not evil.** The proctors are campus lost-and-found +
  noise complaints, not detectives. The writ is a **rubber-stamp** — the
  path-of-least-resistance "yes" that makes you leave — pushed across the
  counter by someone who never connects that it matters. The horror is the
  *darkly-easy*: getting authority to ask why a student died is easier than
  getting your bike out of impound. (It rhymes with §13 — a temp credential,
  never quite real, exactly Dunny's never-made-permanent assignment.)
- **Cost = leak, not watcher.** No one *watches* the writ — no one here is
  competent enough to. But the trail **exists**, in a system that leaks from
  every sloppy seam, and the same rot that cooked the rolls can read a roster.
  The danger arrives later, sideways, *through* the incompetence — not because a
  proctor sold you out.
- **The pathway itself is peopleless** (the *file* verb): take-a-number, the
  soft-cornered forms, the wrong window, the contradicting signs, the stamp (or
  a self-serve permit kiosk). You navigate **process**, never persuasion — the
  indifference is *expressed* by there being no real conversation to be had.
  The proctor at the glass is an affordance that only ever shrugs you back to
  the form.

## The census-form payload (§13 — its own pass)

The Registrar is also where **being counted** happens — the **census form**: the
arc's *thematic centerpiece*, now designed in its own focused pass at
**[census-form.md](./census-form.md)**. The axis landed on **counted by
contribution** (labor / play / fund — the three influence stocks reframed as the
*floor of personhood* instead of the *ladder of standing*: the legislature's own
engagement logic, one inversion from monstrous). The *miscounted / uncounted /
over-counted* are the victim failure-modes; the **roll-clock** is engagement
decay made perishable; the form doubles as the investigation's **literacy primer**
(read a clean filing → read the cooked ones). See that sheet for the full design.

## Rooms (the build spec — three tiers each)

Per the room-spec discipline — **prose & detail** (cheap, the bulk:
`longDescription` + `Detailed` sub-features, *not* objects), **realized Stuff**
(costly, few, each justified: real instantiated objects), **NPCs** (each a full
design session: spawned-population systems + *at most one* deliberate carve per
location).

### Room 1 — the campus enrollment office (the on-ramp; *campus*)

A small, sleepy, paper-heavy intake office near the Quad — where *you* enrolled
(you already know the room), and where Dunny did census-prep. The thread **starts**
here and points downtown.

- **Prose & detail:** the cramped office, the counter and stale NOW-SERVING sign,
  cracked chairs, filing-and-toner air, faded grandeur; the **three-views-of-the-
  count** on the walls (filing cabinets · rolls terminal · residency map); **Dunny's
  cleared desk** — a dust-rectangle where the nameplate sat — and the surviving
  counting-tic remnant (a tally scratched under the drawer).
- **Realized Stuff:** the **residency map** (evidence — see below), a **rolls
  terminal** (scoped query), the **enrollment form** (takeable; §13 hook), the
  **HELP WANTED sign** (the access hook), a **slice of the campus filings** (§8
  anchors, low-security).
- **NPCs:** **one carve — [Bram](../npcs/enrollment-supervisor.md)**, the supervisor
  (the fourth banality facet — *wisdom*). The rest **spawned**: the queue of
  enrollees (incl. the §13 edge-cases, the §17.H mix).

> **The Spartan detail — the residency map.** Pins = who lives where; and because
> records are physical (§8), **erasure leaves a hole**: a *pinhole with no pin* = an
> **erasure**; a *pin moved beside its hole* = a relocation (Wren); a *fresh pin in
> an old hole* = a **phantom re-filling an erased slot** (the laundering, literal).
> The whole fraud on a corkboard for the careful eye. General rule: *in a world of
> physical records, every erasure leaves a trace, and the investigation is reading
> the holes* (the pinhole, the dust-rectangle, a gap in a sequence).
>
> **The assignment (the access mechanic).** You can't *take the job* (multiplayer —
> a singular consumed seat); you take **the assignment** — a temp, **scoped,
> repeatable** census-prep batch granting limited access to *exactly that* (the
> method + a *piece* of the discrepancy, not the run of the place). *"Do well and
> we'll hire you" — and it never happens* (the Gus-deferred-carrot; Dunny was an
> assigned temp too, never made permanent). The precarity rhymes with who-counts:
> a temp, never quite *counted* as an employee, living his last weeks.

### Room 2 — the public hall (*city*)

The civic front: worn-grand, cold — the matched half of the morgue (files your
existence / files your death). The **threshold and the wall.**

- **Prose & detail:** the civic hum, the shapeless brass seal, the bank of
  scratched windows (speak-holes, CLOSED cards), the flip-board, bolted benches,
  the crossed-out directory, curling notices + "Your Rights as a Counted Person"
  pamphlets, the stopped clock, the worn floor-tracks. ~90% of the room, free.
- **Realized Stuff:** the **STAFF ONLY door** (`Boundary` — the access wall), the
  **census form** (takeable; §13), the **requested record / the morgue's
  certificate** (a real evidence item you obtain and carry — points *deeper*).
- **NPCs:** **zero carved.** The **queue** = spawned (`Populates`) — the census
  processing a city of the living, *spawning the victim category at the counter*
  (the uncountable, §15.2, administered in/out of existence — the arc's most loaded
  *sight*). The windows are **affordances**, not characters; the city makes you
  *earn* the deeper access.

### Room 3 — the records floor (*city*)

Behind the glass — where the count is *made* and the cooking hides in the routine.

- **Prose & detail:** the low working floor, rows of reconciliation desks, wire
  trays of certificates, pneumatic tubes toward the archive, the glassed-in office
  over the floor, the **SPECIAL-HANDLING tray** (the laundering as a category),
  hard light.
- **Realized Stuff:** the **archive door** (`Boundary`, deeper), a **reconciliation
  terminal** (live rolls; scoped), the **cooked ledger / flagged certificate** (the
  fraud's proof, *in a hand*), the **disposal chute** (the registrar's
  erasure-instrument — *a filing can be burned too*; a half-shredded filing in the
  bin = a caught erasure; the §14 disposal clock).
- **NPCs:** **the one city carve — [Pell](../npcs/records-official.md)**, the records
  official (the **escalation** — the first *knowing* accomplice; the pawn's
  white-collar twin; the kill-chain seam who passed Dunny's name up). The clerks =
  spawned/flat.

### Room 4 — the archive / vault (*city*)

The deepest, coldest — where the certified anchor-documents (personhood itself)
are kept. Bedrock of the records track.

- **Prose & detail:** the climate-held vault, steel shelving into low light, coded
  filing boxes, the preservation hum, a single reading desk, the heaviest door; the
  Spartan-details (a gap in a numbered sequence, a broken-and-resealed band, dust
  shadows of recent handling).
- **Realized Stuff:** the **vault door** (`Boundary` — the heaviest gate), the
  **foundational filings** (a forged anchor cert · a missing/destroyed one — the
  §10 hole at the root · the victim-category sector and its gaps — the *deepest*
  proof), the **retrieval log** (who pulled what, when — the trail that names the
  tamperer).
- **NPCs:** **zero — deliberately.** The vault is **unstaffed**: you're *alone with
  the records.* The isolation is the drama (the deepest evidence + the worst place
  to be caught — §11's spectral-evidence panic). Beyond it is only the **faceless
  upstream/handler**, never in a room you can enter (§11 — the unarrestable). The
  records track ends here; the haze begins.

## Cross-references

- Bible: [§4](../../../slates/builds/eternal-university-narrative-slate.md) (the
  campus organs — now the enrollment office), §6 (the census spine), §10 (Dunny's
  census-prep), §13 (the census form), §14 (the rolls track), §15.4 (the city
  thread).
- Experiences: [the-morgue.md](./the-morgue.md) (the matched city bureau; the
  records route originates there), [sealed-room.md](./sealed-room.md) +
  [first-forensic-win.md](./first-forensic-win.md) (the scene corner).
- Carves: [victim.md](../npcs/victim.md) (Dunny — his work started at the campus
  intake), [property-manager.md](../npcs/property-manager.md) (Katie's manifest =
  the dorm-level shadow of enrollment-as-census).
- Place: [duncan-hall.md](../duncan-hall.md) (the campus; enrollment ties to
  onboarding).

## Open questions / dials

1. **The rolls' nature** — the official-filing + lived-exhaust split (leaned;
   §8-consistent, makes records physical/contestable). Confirm.
2. **The fraud's local shape** — thin campus-intake complicity vs. a fully clean
   campus office (the rot purely downtown). Lean: clean campus, fraud city.
3. **The census form** — design it as its own focused pass (lean) vs. fold a
   sketch in here.
4. **Characters & when** — the records clerk and Dunny's supervisor fall out of
   the routes; carve JIT.
5. **The real kill-site thread** — whether "somewhere cold" connects to the
   city's bureaucratic apparatus (a Registrar/morgue cold-store) or stays haze
   (still the §14 open fork).
