# The bar fight — plan

**Input:** [bar-fight-requirements.md](../requirements/bar-fight-requirements.md)
(locked). One branch, eight waves, one MR. The lane: humanoids learn to
punch (world-wide, honest blunt trauma) → the stun baton's tetany band
goes live → the lounge becomes the one mechanical sanctuary → the bum's
rush ships as a general control outcome → the weapons check stands in
the lounge → the 86 becomes an institutional record → Dave enforces his
own house, hands-first, on what he saw — and can be wrong.

Every wave is independently committable with colocated tests. Read
[combat.md](../subsystems/combat.md),
[combat-hooks.md](../subsystems/combat-hooks.md),
[electricity.md](../subsystems/electricity.md),
[behavior.md](../subsystems/behavior.md),
[retail.md](../subsystems/retail.md), and
[location.md](../subsystems/location.md) before starting.

## Plan-level decisions

### P1 — Fisticuffs is species data + one energy-side seam; beasts stay byte-identical by construction

The gambit engine already treats a species innate as a full instrument:
`resolveInstrument` (CombatLogic.ts:3320) falls back to
`naturalAttacksFor(actor)[0]`, satisfying every `needsInstrument` gambit
(`strike`/`shove`; `subdue` never needed one), and a fractured grip or
disarm already drops to it. So the *affordance* half of fisticuffs is
pure content: every `homo` species row
(`packages/content/species-and-names/content/stuff/idea/species/.../homo/*.yaml`,
17 rows) gains `naturalAttacks: [{ key: fist, channel: blunt, massScaled: true }]`.

The *damage* half needs one seam. Innate strikes currently ride
`instrumentDeliveryScale` at neutral 1 (CombatLogic.ts:2021-2025), so a
gnome and an ogre punch identically. `NaturalAttackSpec`
(lib/combat/NaturalAttack.ts) grows an optional `massScaled?: boolean`;
in `commitInflict`'s innate branch (CombatLogic.ts:2085-2089, after the
rotation pick), a `massScaled` attack multiplies energy by
`clamp(BodyPlan.baseMass / combat.natural.energyRefMassKg, min, max)`
(dials seeded 70 / 0.5 / 2.5 — sapiens at biped `baseMass: 70` is
*exactly* neutral). **Why the flag instead of scaling every innate:**
the acceptance criterion "a natural-weapon beast's behavior is
unchanged" and the gym's standing PINS table both demand byte-parity for
every existing innate (the wolf's legacy `naturalAttackChannel` fallback
included). A flag no shipped beast row carries makes parity true by
construction, and it is species-authored data per the constraint —
no bespoke brawl-damage path, the same materials-response fold, the same
`energyFor(band)` curve. The KO falls out free: a called head shot on an
open window (`siteFor(target, open)`) landing a ≥0.5-severity head
contusion reads `unconscious` through the existing consciousness ladder
(Vitals.ts:690, head-trauma clause) → `checkVitalsResolution` downs.

### P2 — The `unarmed` Discipline mirrors `blades` exactly

One new pure-data row,
`packages/content/platform/content/platform/idea/Discipline/unarmed.yaml`
(`key: unarmed`, `channel: skill`, `iscedf: "1014"`,
`specializes: [melee-combat]`, no `conferrals` — the blades shape
verbatim; DisciplineCatalogue harvests it, zero code). Crediting: in
`mintExchangeSignature` (CombatLogic.ts:4483), beside the existing
edge/point → `blades` push, add: `instr && !instr.weapon` →
push `{ discipline: UNARMED_DISCIPLINE }`. An armed exchange never
credits it; the brawler's and swordsman's transcripts diverge.

### P3 — The tetany gate folds into `requiresConscious`, not a new validator

`requiresConscious` (lib/command/validators/requiresConscious.ts)
already models exactly this axis — "can't currently take a volitional
action" — and already folds two non-consciousness incapacitations
(metabolism `collapse`, thermal torpor) with per-cause prose. Tetany
joins as a third clause: `MixinApi.isVitals(giver) &&
giver.isTetanized()` → *"…is seized rigid by the current and can't let
go."* This gives `isTetanized()` (Vitals.ts:1275) real call sites with
**zero YAML churn** on the verbs already tagged (eat/drink/get/
locomotion). The wave also audits the release-family YAMLs
(`drop`/`put`/`give`/`unwield`/`remove`/`wield` in the platform pack's
`cmd/` views) and adds the validator where missing — that's the "holds
cannot be released" half. Engine side (validators don't run inside
`fight` subcommand dispatch): `eligibilityImpl` gains a
`tetanized` refusal (reads `isTetanized()` via the allowlisted
`isVitals` narrow — no `check-combat-dynamics` growth).

### P4 — A discrete pulse mints a *windowed* tetany; the sustained circuit stays honest

Today `shockContactImpl` (ElectricityLogic.ts:471) mints/upserts a
`SustainedShock` at/above let-go and latches `tetany` at/above the
tetanic band — but a baton *hit* is a broken circuit by the next read,
and the reconcile arm's circuit re-verify relieves it (verify the exact
relieve behavior at build time; electricity.md § temporal model). The
change: `SustainedShock` gains an optional `tetanyUntil` (game-time
stamp); `maybeSustain` sets it to `now + electricity.tetanyPulseSeconds`
(new dial, seed ~6). The reconcile arm relieves a broken-circuit record
only once `tetanyUntil` has elapsed; a still-closed circuit keeps
accruing current × time exactly as now, so sustained/unlucky exposure
still reaches fibrillation (the existing `heartRate` arrest drive) —
less-lethal, never non-lethal. The state stays reconcile-on-read; the
window expires without a tick.

### P5 — The sanctuary seam is a sibling of `CombatVenue`, never a member of it

`CombatVenue` stays witness-only per requirements. A **separate**
optional venue method — `combatSanctuaryRefusal?(initiator, defender):
string | null` — declared as its own `CombatSanctuary` interface beside
`CombatVenue` in `lib/combat/CombatHookContext.ts`, presence-dispatched
(the `callVenueHook` shape: present → called, absent → skipped) at the
**top of `openSessionImpl`** (CombatLogic.ts:946), before any state is
built, anchored on `venueOf(initiator)`. A non-null return yields
`{ ok: false, reason: "sanctuary", refusal }`; `OpenSessionResult` and
`InitiateResult` (api/combat.ts:48/28) grow the optional `refusal`
string; `AttackController` renders it as the rejection prose (its
existing reason-mapped `fail` path). Because *every* fight-starter
funnels through `initiate → openSessionImpl` (the attack verb, the
`wary` brain, ambush, Dave's `forceCommand`), one consultation covers
all. `join`/`merge` need no gate — no session can exist in a gated room
to join, and combat sessions never relocate. First implementer:
`LoungeMixin` (world/lounge/LoungeMixin.ts) returns the house prose
(*"Not in here. The lounge is for talk — take it next door."*), which
covers the host **and every satellite** (all clones of the one Lounge
template); Bar and office are different classes and stay fair game.

### P6 — The bum's rush is `fight rush <direction>`: a control *outcome*, not a Dave feature

New `CombatApi.bumRush(actor, direction)` → `bumRushImpl`: requires a
live session, an actor→target threat edge whose target carries the
`grappled` flag (subdue's `flagOnLand`), and a resolvable exit in
`direction` from the actor's room. Effect: remove the target
participant from the session (the cycle-2 departure machinery — the
session dissolves normally if a side empties), then relocate through
**`ContainmentApi.move` (teleport-style), not `Mobile.traverse`** — the
loser isn't *acting*, and traverse's veto/announce chain belongs to the
mover; containment witness hooks (`onContainableAdded` etc.) still fire,
so nothing structural is bypassed, and movement-layer enforcement stays
rejected. Two scenes narrate it (source room: thrown out through the
door; destination: arrives sprawling), and the loser lands `prone`
posture. Rushing spends the actor's beat (clear queued gambit). Surface:
a `rush` case in `FightController`'s subcommand dispatch — a `fight`
subcommand, not a new verb. Any control winner, any exit: the test
proves it with two synthetic combatants, no Dave.

### P7 — The check rack rides the consignment substrate with a `heldOnly` listing

`platform/thing/CheckRack.ts` — a sibling of the shipped
`ConsignmentShelf` (platform/thing/ConsignmentShelf.ts): `PersistableMixin(
ConsignmentShelfMixin(PostRegistration(Detailed(Vessel))))`, so custody,
`_chattelId` survival across relog, and listing bookkeeping are all
inherited. `ConsignmentListing` grows an optional `heldOnly: true` flag;
`BuyController` refuses a `heldOnly` listing (*"that's checked, not for
sale"*) — the one retail-kernel edit. Then:

- **`check <weapon>`** — ONE new verb, category retail
  (`platform/.../cmd/retail/check.yaml` + `CheckController`), afforded
  **only by the CheckRack fixture's `commandContributions`** (verbs-on-
  objects; no core mixin — the verb exists only where a rack stands,
  honoring the constraint's spirit). Gates: the item passes the weapon
  predicate (P10; shields excluded by `Construction.isWeapon()`), you
  hold it; establish-on-check stamps an unstamped good to you (the
  consign precedent). **No bank-account gate, no ask** — this is
  custody, not sale (`askMinor: 0`, `heldOnly: true`). It moves custody
  to the rack and mints a **`Ticket`** (platform/thing/Ticket.ts —
  `pointPath` = the rack, `number` = a rack counter) into your hands.
- **`reclaim <weapon>`** — reused **verbatim**: `ReclaimController`
  already resolves any `ConsignmentShelfMixin` fixture via
  `ConsignmentShelf.resolveIn` and authorizes on `ChattelApi.ownerOf`,
  not the listing. Zero edits. The ticket is the diegetic claim object;
  the *authority* is the owner-stamp (which is what makes taking someone
  else's checked piece theft — custody without title).

### P8 — The rack is a host-only Warren fixture

The rack must stand in "whichever lounge room carries the north exit to
the bar" — and that is a *runtime role* (`LoungeWarren` wires the bar
exit onto the current host and migrates it). So the rack row
(`/world/lounge/thing/check-rack`, saxonberg-lounge pack, singleton) is
placed by `LoungeWarren.wireHostFixtures` (LoungeWarren.ts — the same
seam that wires the bar exit) via `StuffApi.singleton` +
`ContainmentApi.move` into the host, and moved by host migration
(`unwireHostFixtures` leaves it to be re-wired). Being a Persistable
singleton keyed on its own templatePath, its holdings survive relog and
reboot regardless of which clone it stands in. Bonus the requirements
call out: the checked arsenal sits inside the combat-free room — nobody
can fight over the rack.

### P9 — The 86 is a document in the bar's slice of the document tree

**No new Mongo collection** (user ruling 2026-09-01: collection-minting
is essentially done — the systems that need collections are built, and
the path-addressed document tree is the *default* mechanism for exactly
this kind of persistence). Rejected homes: a new `venue_records`
collection (the ruling above — a global engine ledger for what is venue
content); a runtime field on the Business Idea (BusinessEntity is a
seeded singleton, not Persistable — the record would die at reboot);
Dave's BeliefStore (personal, non-transferable — the requirement is
*institutional*, outliving Dave's memory); the accountability ledger
(the court's view, explicitly off-limits); a per-instance domain row
(the ref-shapes identity anti-pattern).

Chosen: the 86 list is a Dave's Bar concern, local to the bar's parcel
— so it lives as a **house-records `StoredDocument`** at a path under
the venue in the document tree
([document-store.md](../subsystems/document-store.md); exact path and
`DocumentKinds` kind decided at build — the vocabulary is closed, so
reuse a fitting kind or make the one-kind vocabulary edit
deliberately). Read/written through **`DocumentApi`** — no new Api
pair, no new Logic singleton, no schema ceremony. Authority is the
**parcel-title gate (`canAtPath`)** that already guards every document
write: whoever holds writes over the bar's path holds the house book,
and it transfers with the title — which IS the "institutional,
outlives Dave's memory" semantics, inherited rather than built. Verify
early that Dave (the brain's principal) holds write standing over the
venue's path (lounge-group membership / the business arrangement); if
NPC standing is awkward, resolve it as content, not as a gate bypass.
"Is X 86'd here" is a derive-on-read of the document. The warning, by
design, writes **nothing** — the grace window is transient brain
scratch (`ctx.state`), which is exactly the "no record, no hard
feelings" semantics.

### P10 — The weapon-spotting surface: `CombatApi.isWeapon` + `CombatApi.visibleArms`

The predicate (`isWeaponItem`, CombatLogic.ts:3395) and the
hands→sidearm→inventory walk (`findBackupWeapon`, :3470) are
module-private. Expose two Api-shaped reads (cross-cutting: combat
vocabulary × perception — legitimately Api-tier): `CombatApi.isWeapon(item)`
(delegates the predicate — the check rack's gate, shields excluded) and
`CombatApi.visibleArms(viewer, subject, attention?)` → the subject's
weapons a viewer *perceives*: wielded weapons always (drawn steel is
obvious), sheathed/carried ones filtered through
`PerceptionApi.perceives(viewer, item, attention)` — so a hidden blade
that beats Dave's alertness got in, legitimately, and `search` remains
the counterplay. No frisk verb, per non-goals.

### P11 — Dave's evidence: a `combat` witness alias + a `WITNESS` belief realm

Behaved's witness table (lib/behavior/brain.ts:170 `WITNESS_TOPIC`)
gains a fifth alias — `combat: 'act.combat'` — dispatched exactly like
`emote`/`speech` (subject recovered via `ReactionApi.actInfo`; combat
narration registers only dramatic beats as reactable, so Dave witnesses
first-blood/roar moments, not every tick — good enough for "who threw
first while Dave watched"). The evidence lives in the substrate, not
module state: `BeliefStore` gains a fifth realm const `WITNESS`
(realms are string conventions; one exported const + a
`payload.aggressor` flag). Dave's brain writes
`host.know(WITNESS, aggressorPath, { aggressor: true })` on the first
witnessed combat frame of a fight, and — when he walked in blind — falls
back to a read-the-room heuristic (the fighter whose opponent reads the
worse condition band is *believed* the aggressor: "who was winning when
he walked in"). The accountability ledger is never read; the gap between
Dave's belief and the ledger IS the wrong-guy test.

### P12 — Dave's brain is a kernel commons brain: `lib/behavior/enforces.ts`

The class rule ("a brain lives in the pack whose content is the only
thing that names it"): nothing in the enforcement ladder names lounge
content — the rack, the office, the taser keyword, the eject direction,
the business, the grace window are all `config`. Any barkeep or
innkeeper venue reuses it, so it is kernel commons (the
`cellars`/`wary` precedent), which also avoids standing up the
capability rung for saxonberg-lounge (the pack ships no `src/` today —
adding the class-source table/deployment-manifest machinery for one
brain is the heavier change; revisit if the pack ever earns `src/`).
Shape: stateless, config-driven, `static ambient = false` (a functional
poller), phase machine in `ctx.state`
(`idle → warned(subject, deadline) → ordered → ejecting`), **every act a
literal player verb via `CommandApi.forceCommand`** (`say`, `attack`,
`fight subdue`, `fight rush south`, `go north`, `get taser`,
`switch on taser`, `wield taser`, `fight strike`) — no god-mode. The one
Api write it performs is the `DocumentApi` house-records write (the 86,
per P9) and a one-time idempotent `PerceptionApi.recordDiscovery` of
his own office door (Dave knows his own back room). Wired on dave.yaml as two specs: the cadence
scan/ladder driver and the `combat` witness trigger.

### P13 — The office taser is a second stun-baton row; escalation costs time by construction

`/world/lounge/thing/office-taser` — a `StunBaton` row (the
`stun-baton.yaml` precedent: `hafted`, `voltage: 5000`, `on: false`,
one-handed) `props:`-placed in office.yaml. A venue prop by *placement*
(behind the concealed door, in the sanctum), not by mechanism — no
player-facing less-lethal family ships (non-goal; the ranged tail owns
it). Fetching it is a real round trip (`go north` … `go south`) while
the fight runs unattended — the escalation cost is geometry, not a
timer.

## Waves

### W0 — Fisticuffs (world-wide) + the `unarmed` Discipline
**Changes:** `NaturalAttackSpec.massScaled` + marshalling
(lib/combat/NaturalAttack.ts); the energy mass-scale in
`commitInflict`'s innate branch + 3 `combat.natural.*` dials
(platform pack settings/combat.yaml, merge-missing); `unarmed.yaml`
Discipline row; the `UNARMED_DISCIPLINE` push in
`mintExchangeSignature`; `naturalAttacks` fist rows on the 17 `homo`
species yamls (+ any other humanoid rows found —
`grep -rl "_bodyPlanPath.*biped"` cross-checked against sentient
species).
**Tests (colocated with combat's — lib/combat/__tests__ +
platform/idea/api/__tests__):** two unarmed synthetic humans open a
session and strike/shove/subdue to resolution; blunt trauma lands
through materials-response; energy scales with `baseMass` across two
synthetic species (light vs heavy, both flagged); an open-window head
strike KOs through `getConsciousness`; an unflagged innate (synthetic
wolf) is byte-identical pre/post; unarmed exchange credits
`unarmed`+`melee-combat`, armed credits no `unarmed`. A content test
asserts every sentient biped species row carries the fist.
**Tripwires:** the gym PINS table (kernel-synthetic fixtures carry no
`massScaled` flag → parity by construction — run `pnpm test:gym`
locally once); DisciplineCatalogue/pack count assertions (one new
platform row — grep for discipline-count pins and bump);
`lint:instanceable` on the edited yamls.

### W1 — The tetany window + the volition gate
**Changes:** `SustainedShock.tetanyUntil` (lib/vitals/Condition.ts);
`maybeSustain` stamps it (ElectricityLogic.ts); the reconcile shock arm
holds tetany until expiry on a broken circuit (Vitals.ts — verify the
current relieve path first); `electricity.tetanyPulseSeconds` dial;
tetany clause + prose in `requiresConscious`; validator audit/additions
on the release-family command YAMLs; `tetanized` refusal in
`eligibilityImpl`.
**Tests:** a switched-on baton hit tetanizes for the window — during it
`drop`/`go`/`fight strike` refuse with prose and after it they work
again (reconcile-on-read, no tick); a switched-off baton does nothing;
a sustained closed circuit still integrates to fibrillation/arrest
(existing test extended); `isTetanized()` has real call sites (the
validator test IS the proof).
**Tripwires:** existing electricity/vitals reconcile suites (the arm's
relieve semantics change for broken-circuit records — pin the sustained
case first); any command YAML snapshot tests for the edited verbs.

### W2 — The sanctuary gate
**Changes:** `CombatSanctuary` interface beside `CombatVenue`
(CombatHookContext.ts); the presence-dispatch at the top of
`openSessionImpl`; `reason: "sanctuary"` + `refusal` threaded through
`OpenSessionResult`/`InitiateResult` (api/combat.ts) into
`AttackController.fail`; `LoungeMixin.combatSanctuaryRefusal` with the
house prose.
**Tests:** kernel — a synthetic room implementing the method refuses
`openSession` with the prose and no session/holds/ledger rows exist; a
hook-less room is untouched (byte-parity); the venue witness hooks gain
no veto (existing hooks suite unchanged). Content
(world/lounge/__tests__): `attack` between two engaged players in a
lounge (host *and* a satellite) is refused with player-readable prose;
the identical pair in the bar opens normally; the office likewise.
**Tripwires:** the gym (hook-less rooms — parity holds); wary-brain
tests (initiate result shape widened — additive optional field).
**User checkpoint:** the refusal prose — read it in a live lounge before
moving on.

### W3 — The bum's rush
**Changes:** `bumRushImpl` + `CombatApi.bumRush`; the `rush` case in
`FightController`; the two-room narration; prone landing; the fight.yaml
view gains the subcommand token if the view enumerates them.
**Tests:** control winner (synthetic A subdues B → `grappled`) rushes B
through an authored exit — B lands in the destination, prone, out of the
session; session resolves when the side empties; refusals: no grapple
(`no-hold`), bad direction (`no-exit`), not-in-combat; the primitive
works for any combatant (no Dave anywhere).
**Tripwires:** FightController subcommand tests; combat narration
snapshot tests if any pin the fight verb surface.

### W4 — The check rack + ticket
**Changes:** `ConsignmentListing.heldOnly` + the BuyController refusal;
`CheckRack` (platform/thing); `check.yaml` + `CheckController`
(cmd/retail); `CombatApi.isWeapon` exposure; the rack row
`/world/lounge/thing/check-rack` + `wireHostFixtures`/
`unwireHostFixtures` placement in LoungeWarren; rack prose points at the
bar door.
**Tests:** retail kernel — a `heldOnly` listing refuses `buy`; check
custody: check a weapon → ticket in hand, custody on rack, `ownerOf`
still the patron; persistable round-trip (the ConsignmentShelf relog
test shape) → reclaim returns it; a shield refuses `check`
(not-a-weapon); a non-owner's reclaim refuses (theft stays theft).
Lounge — the rack stands in the host room (not the bar), and survives a
host migration (the wireHostFixtures test extended).
**Tripwires:** LoungeWarren.test.ts host-fixture assertions;
landing.integration exit/content counts (the rack adds a fixture to the
host room — any room-content count pins); retail suite (listing shape
widened — additive optional).

### W5 — The 86 record + the warning flow
**Changes:** the house-records document (kind + path under the venue's
parcel per P9; `DocumentApi` read/write; `canAtPath` authority — no new
collection, no new Api pair); `CombatApi.visibleArms`; the
`enforces` brain's house-rule half (scan → warn naming the rack → grace
→ 86 + ordered out → eject via W3's rush); dave.yaml gains the
`enforces` cadence spec with config (business, rack path, grace, eject
direction `south`); brandishing (a newly-wielded weapon) skips the
grace; an already-86'd arrival goes straight to ordered-out.
**Tests:** house-records document round-trip (the 86 write lands in the
document, survives a simulated reboot, and derives back as "86'd
here"; a write by an actor without title standing over the venue's
path is refused by `canAtPath`). Brain
fixture-world (the wary/cellars test shape): armed patron enters with
Dave present → warning prose names the rack, **no record**; patron
steps out, checks, returns → welcome, no sanction anywhere; patron
lingers past grace → the 86 entry exists in the house-records document
(venue-scoped, not in Dave's BeliefStore), ordered out; still present →
Dave attacks, subdues, rushes south; drawing a weapon skips the grace
entirely; a *concealed* blade above Dave's alertness draws nothing.
**Tripwires:** document-store suite (a new document kind, if minted,
rides the kind-vocabulary totality checks); cast-content.test.ts (dave.yaml behaviors list assertions); the
codeNamingDriftGuard is untouched (`behaviors[].brain` is already a
classified field and Behaved is the existing resolve site — assert no
new module-resolving call site appears in the brain).
**User checkpoint:** the warning/86 prose and the grace-window feel.

### W6 — The escalation ladder + the office taser + the wrong guy
**Changes:** the `combat` witness alias (brain.ts `WITNESS_TOPIC` +
`WitnessKind` + the Behaved dispatch case); the `WITNESS` belief realm
const; the `enforces` brain's fight-breakup half (join hands-first with
`attack`/`fight subdue`; threat threshold = own condition band
degrading ∨ a weapon out among participants (`visibleArms`) ∨ a third
party piling in; on trip: office round-trip via literal verbs, tase the
*believed* aggressor); the office-door discovery seed; office.yaml gains
`props: [/world/lounge/thing/office-taser]` + the taser row; dave.yaml
gains the `combat` witness spec.
**Tests:** staged brawl with Dave present → he joins hands-first
(subdue), never opens with the taser; threshold trip → he leaves,
fetches, returns armed+switched-on, tases — and the fight ran beats
unattended during the fetch; the tase writes honest accountability rows
attributed to Dave (`consented: false` imposed terms — **no staff
exemption**: assert `blameFor`/rows treat him as any actor). **The
wrong-guy test:** fight begins while Dave is in the office; the true
initiator (per the ledger's `opened` row) is arranged to be *losing*
when Dave walks in; Dave's fallback belief names the winner; he tases
the party the ledger does not name — belief-not-ledger, proven.
**Tripwires:** behavior suite (`_parseTrigger` alias table pins);
bar-office-reveal.integration.test.ts (office row grows props — check
its content assertions); Behaved witness-dispatch tests.

### W7 — Docs + the drive
**Docs:** combat.md (fisticuffs § replacing the "fisticuffs deferred"
L168-202 stance; the sanctuary seam; the bum's rush; the `unarmed`
Discipline in the build history), combat-hooks.md (the `CombatSanctuary`
sibling — explicitly *not* a `CombatVenue` member; witness hooks
unchanged), electricity.md (the tetany volition gate wired — retire the
"light follow-up" line; the pulse window), behavior.md (the `combat`
witness alias + the `enforces` brain row in the canned-brains table),
belief.md (the `WITNESS` realm), retail.md (`heldOnly` + CheckRack),
location.md (**the lounge's social-commons/sanctuary posture stated for
the first time**, + the rack as a host fixture), advancement.md (the
`unarmed` seed, one line), accountability.md untouched (cross-reference
at most). Update the CLAUDE.md verb-category line for `check` only if
the sweep demands it (index files get swept, not raced).
**The live drive (the user checkpoint):** on a live server — (1) two
characters trade punches in the bar; one KO by head shot; (2) `attack`
in the lounge → the refusal prose; (3) check a dagger at the rack,
relog, reclaim; (4) walk into the bar armed → Dave's warning → step out,
check it, return → normal service; (5) return armed and linger → 86 +
ordered out → refuse → grappled and bum-rushed south into the lounge;
(6) stage a brawl → Dave wades in hands-first; draw a blade → he fetches
the taser and the tetany window lands (can't act, can't drop); (7)
`pnpm lint` family + ONE full `pnpm test`.

## Dials (all merge-missing in the platform pack's settings yamls)

| Key | Seed | Meaning |
|---|---|---|
| `combat.natural.energyRefMassKg` | 70 | Neutral body mass for a massScaled innate's energy |
| `combat.natural.energyScaleMin` / `Max` | 0.5 / 2.5 | Clamp on the mass-energy scale |
| `electricity.tetanyPulseSeconds` | 6 | The discrete-pulse tetany window |

(Grace-window / alertness / thresholds are `enforces` brain *config* on
dave.yaml, not world dials — per-venue personality.)

## Risks

- **The reconcile shock arm's relieve semantics** (W1) — the exact
  broken-circuit path is the one place this plan alters shipped
  reconcile behavior; pin the sustained-circuit case *before* editing.
- **Gym byte-parity** (W0) — the massScaled flag makes parity
  structural, but run `pnpm test:gym` once after W0 anyway (it is not in
  `pnpm test`).
- **Host migration × rack custody** (W4) — the rack is a Persistable
  singleton so holdings are safe, but the wire/unwire ordering during a
  forced host destruction needs the existing migration test extended,
  not assumed.
- **Witness-subject recovery** (W6) — `actInfo` resolves only dramatic
  beats; if a staged test fight never roars before Dave must decide, the
  fallback heuristic carries the test — write it that way.
- **Document-kind + write standing** (W5) — `DocumentKinds` is a
  closed vocabulary (choosing vs minting a kind is a deliberate edit
  with its own totality gates), and Dave's write authority over the
  venue's path (`canAtPath`) needs verifying as content before the
  brain can record an 86 — resolve both at the top of the wave.

## Acceptance criteria → waves

| Criterion | Wave |
|---|---|
| Fisticuffs (session, honest blunt, mass scaling, KO, beast unchanged, `unarmed` credit) | W0 |
| Tetany (window, verb refusals with prose, expiry, fibrillation reachable, `isTetanized` call sites) | W1 |
| Sanctuary (lounge refuses with prose; bar + office open normally) | W2 |
| Bum's rush (general control-win relocation through an exit) | W3 |
| The check (lounge-side rack, ticket, relog survival, reclaim, `ownerOf` throughout, shield excluded) | W4 |
| Warning then 86 (no-record grace, comply-and-return clean, institutional persistent record, brandishing skips grace) | W5 |
| The ladder (hands-first, threshold, office fetch, unattended fight) + the wrong guy (belief-not-ledger, no staff exemption) | W6 |
| Docs + lint family + one full suite | W7 |

## Critical files

- `packages/server/src/mud/platform/idea/api/CombatLogic.ts`
  (openSessionImpl :946, commitInflict :2066, resolveInstrument :3320,
  isWeaponItem :3395, mintExchangeSignature :4483)
- `packages/server/src/mud/platform/idea/api/ElectricityLogic.ts`
  (shockContactImpl/maybeSustain :471) +
  `packages/server/src/mud/lib/vitals/Vitals.ts`
  (getConsciousness :690, isTetanized :1275)
- `packages/server/src/mud/lib/combat/CombatHookContext.ts`
  (CombatVenue :105; the CombatSanctuary sibling lands here)
- `packages/server/src/mud/world/lounge/idea/LoungeWarren.ts`
  (wireHostFixtures; BAR_DIRECTION :50) +
  `packages/content/saxonberg-lounge/content/world/lounge/agent/dave.yaml`
- `packages/server/src/mud/platform/thing/ConsignmentShelf.ts`
  (+ `lib/behavior/brain.ts` WITNESS_TOPIC :170 for the combat witness
  alias)
