# The bar fight — requirements

Dave's Bar is the anti-lounge: no mechanical protection, safe-ish by
norms instead of decree. This build makes the bar fight *possible*
(humanoids currently cannot throw a punch), *survivable* (a nonlethal
incapacitate band exists between "harmless" and "lethal"), and
*governed* (a house weapons rule Dave enforces himself, on an
escalation ladder, with only what he saw). The lounge proper gets the
opposite treatment — the one legitimate hard ban, because it is the
social commons and it is special.

Seeded by design conversation (2026-09-01) rather than a single slate,
drawing on:
[deferred-rpg/combat-slate](../slates/deferred-rpg/combat-slate.md)
(innate instruments — "fist = blunt, bulk = leverage/shove"; consent
case 2 names "a bar brawl" verbatim; de-escalation is a combat skill;
sanctuary as a chase terminus),
[builds/electricity-slate](../slates/builds/electricity-slate.md)
(the perception → tetany → fibrillation ladder; being-shocked
reconciles current × time),
[tails/ranged-slate](../slates/tails/ranged-slate.md) ("less-lethal,
never non-lethal" — honest leakage; the stun baton as the melee
cousin), and
[builds/daves-bar-slate](../slates/builds/daves-bar-slate.md) (86'd as
a reputation-priced institutional state; venue records vs personal
recognition). Load-bearing subsystem docs:
[combat.md](../subsystems/combat.md),
[electricity.md](../subsystems/electricity.md),
[accountability.md](../subsystems/accountability.md),
[belief.md](../subsystems/belief.md),
[chattel.md](../subsystems/chattel.md),
[retail.md](../subsystems/retail.md) (consignment custody),
[behavior.md](../subsystems/behavior.md).

## Goals

- **Fisticuffs.** Humanoids brawl unarmed: fists as an innate blunt
  instrument (and bulk as leverage/shove), declared as species data on
  the existing `naturalAttacks` surface — the combat-slate's
  innate-instruments design at minimal grammar. Damage is honest:
  real-but-modest blunt trauma through materials-response, scaled by
  body mass (mass is the strength floor the slate already names). A
  lucky head blow can genuinely KO through the existing consciousness
  ladder; a fractured grip still costs you the gambits it should.
  This is a **world-wide change** by design — every humanoid
  everywhere can punch after this, not just bar patrons. An
  **`unarmed` Discipline** ships beside `blades` (the same
  specializes-`melee-combat` pattern, credited additionally when the
  exchange's instrument is innate) — the brawler and the swordsman
  stop being the same transcript, and Dave's hands-first ladder is
  its first consumer.
- **The nonlethal shock band.** The stun baton's documented tetany
  effect actually fires: a tetanized agent cannot act, move, or
  release what they hold (the volition gate electricity.md already
  calls "a light follow-up"), a being-shocked state integrates
  current × time on read, and the ladder stays honest at both ends —
  a discrete pulse incapacitates briefly; sustained or unlucky
  exposure can still reach the real fibrillation band. Less-lethal,
  never non-lethal.
- **The sanctuary gate.** Combat sessions cannot *open* in the lounge
  proper — a venue consultation at session-open (net-new seam; no
  such gate exists anywhere today), with the lounge warren as its
  first consumer and a player-facing prose refusal. The bar and the
  office are explicitly **not** covered.
- **The weapons check.** A check fixture **in the lounge, directly
  adjacent to the bar's entrance** (the lounge side of the doorway —
  you check *before* you enter) takes custody of a patron's arms
  against a claim ticket. Custody, never title —
  the owner-stamp stays on the item, the held goods survive relog,
  reclaim returns them. Detection of "is this a weapon" uses the
  existing construction-domain predicate (shields excluded).
- **The warning, then the 86.** Walking in visibly armed draws a
  warning first, not aggression: Dave calls it out and you get a
  grace window to back out and check the weapon (or just leave) —
  comply and you're welcome back, no record, no hard feelings. The
  86 attaches on refusal: linger armed past the warning (or order
  while armed) and you're 86'd — the bar records it institutionally
  (a record that outlives Dave's memory and transfers to whoever
  tends bar), Dave orders you out, and if you don't leave voluntarily
  he removes you. That may mean a fight — the rule's teeth are Dave,
  not a door flag. One exception: **drawing** a weapon gets no grace;
  brandishing is not an accident.
- **The bum's rush.** Winning a control grapple lets the winner move
  the loser through an exit — the forced-relocation outcome both the
  ejection and the fight-breakup ladder end with. No such primitive
  exists today.
- **Dave's escalation ladder.** Dave breaks up fights himself: assess
  → hands first (subdue — fittingly, the one gambit that needs no
  instrument) → taser only under real threat (his own poise/vitals
  degrading, a weapon out, a third party piling in). The taser lives
  in the office: fetching it means leaving the fight unattended, so
  escalation costs time by construction.
- **The summons.** Dave spends most of his time in the back office —
  so the on-shift bartender is the house's tripwire: they spot the
  visible weapon or the breaking fight (perception vs concealment,
  same rules), voice the house warning, and **call for Dave** when
  it's ignored or when fists fly. Dave emerges and runs the ladder.
  When no bartender is rostered, Dave covers the floor himself (the
  shipped covers behavior) and is his own alerter — coverage by
  construction. A consequence worth wanting: Dave usually arrives
  mid-scene, so the read-the-room aggressor inference is the
  *common* case, not the edge.
- **The witnessed aggressor call.** Dave's decision about who
  started it runs on what he saw — witness triggers into his own
  belief, never a read of the accountability ledger (that is the
  court's view). If he was in the back when it kicked off, his call
  can be wrong, and tasing the wrong patron is a legitimate,
  blameworthy act: **no staff exemption** in the accountability
  model. The brawlers consented to each other, not to Dave.

The deterrence thesis, stated once: the bar has no combat ban. What
keeps it peaceful is an enforcer with imperfect information and a
weapon he doesn't want to use — so de-escalating before Dave steps in
is strictly dominant. Bar norms from mechanism, not decree.

## Non-goals

- **No bouncer.** Neighborhood bars don't have them. Dave enforces.
- **No frisk/pat-down verb.** The doorman scan is perception vs
  concealment; a hidden blade that beats Dave's alertness got in,
  legitimately. `search` is the counterplay, and the awareness
  discipline is where a sharper eye comes from.
- **No player-facing less-lethal weapons.** The office taser is a
  venue prop. The less-lethal *family* (tethered-dart taser, beanbag,
  irritants) is the ranged tail's W3.
- **No weapon rules in the lounge proper.** Combat-free makes
  carrying harmless there; the check applies at the bar.
- **No shift-bartender *enforcement*.** The 86 call, the ejection,
  and the taser are Dave's alone, v1. Bartenders are not out of the
  build, though: the on-shift bartender is the house's eyes — they
  spot, warn, and summon (see the summons decision) precisely
  *because* enforcement is not theirs.
- **No courts/grievance consumer.** The wrong-guy tase writes honest
  accountability rows; what reads them later (grievance, standing,
  courts) is other builds' work.
- **No full capability-vocabulary combat grammar.** The
  combat-slate's `{capability + skill-band}` gambit model stays
  deferred; fisticuffs rides `naturalAttacks` as data.
- **No general venue-policy substrate.** One sanctuary consultation
  and one house rule as content — not a "house rules" framework.

## Surface decisions

### The lounge/bar split (the anti-lounge)

Lounge proper: combat-free **by mechanism** — the one place a hard
ban is legitimate, because it is the platform's social commons
("it's special"). The bar: fair game for anything and everything —
no mechanical protection whatsoever, peace maintained by norms and
Dave. The two postures ship side by side deliberately: decree and
norms, taught by contrast. The gate covers the lounge warren's member
rooms and not the bar or office.

### The gate acts at session-open, not at movement

The sanctuary consultation happens where combat begins
(session-open), not at doors. Movement-layer enforcement was
considered and rejected: patrons arrive at the lounge by TPA (which
bypasses traversal), the containment layer is doctrinally reserved
for class invariants rather than "a person may not do this"
(spatial.md ⚠⚠), and the thing being forbidden is the *fight*, not
the *entry*. A refusal must reach the player as prose through the
normal rejection path, never as a thrown containment error.

### The house rule is content; the Bar stays a plain room

`Bar.ts` documents "no venue mixin — the bar is emergent from the
matter and the maker in it," and this build honors that stance: the
check is a fixture Thing **on the lounge side of the doorway** — in
whichever lounge room carries the north exit to the bar (a Location's
own `commandContributions` can't reach occupants anyway —
attendant.md). Placing the rack in the lounge proper also parks the
checked arsenal inside the combat-free room: nobody can fight over
the rack,
the enforcement is Dave's brain, the 86 list is a venue record. The
only kernel touches are the ones that must be kernel: fisticuffs
data-plumbing, the tetany gate, the sanctuary seam, the bum's rush.

### The warning, the grace window, then the 86

An accidental carry-in gets an off-ramp before any aggression
starts. The chain is: spot (perception vs concealment) → **warning**
(Dave names the rule and the rack) → **grace window** (back out,
check the weapon, return welcome — no record) → refusal (still armed
past the warning, or ordering while armed) → **86 recorded + ordered
out** → still won't leave → Dave ejects you by grapple → which can
become a real fight → the escalation ladder applies. Brandishing
skips the grace — drawing a weapon is aggression, not an accident,
and jumps straight to the ordered-out rung (and, plausibly, the
ladder). There is no service-refusal *mechanic* on top: the warning,
the 86, and physical removal **are** the sanction, in that order.

### Dave only knows what he saw

The aggressor call is a belief derived from witnessed events (who
threw first *while Dave watched*, who was winning when he walked in,
who is holding the chair leg), never the ledger's ground truth. The
gap between the two is content: Dave can be wrong, the wronged patron
has a legitimate grievance, and the ledger can vindicate them later.
This is enforcement-on-imperfect-information at fist scale — the same
lesson the polity layer teaches.

### The bartender is the tripwire; Dave is the response

The floor is watched by whoever tends it: the on-shift bartender
spots and summons — an acoustic call for Dave (if sound does not
cross the office doorway today, the bartender steps to the door and
calls through it, paying the floor absence honestly) — and may voice
the warning, because warning is speech, not enforcement. The sanction
chain (the 86, the ejection, the taser) remains Dave's. His brain
answers the summons as witnessed speech and comes out front; the
alert costs real beats, so a fast brawl can outrun it — also honest.

### Honest damage, honest taser

Fists do real blunt harm (modest, mass-scaled); a brawl can bloody
someone and a head shot can knock someone out. The taser rides the
real shock ladder: tetany is the intended band, fibrillation remains
reachable — Dave's reluctance to use it is mechanically justified,
not just characterization. No safe-button anywhere.

### Custody, never title

The check rack takes custody; ownership never moves. This rides the
shipped consignment/chattel semantics (owner-stamp stays; a
persistable shelf so checked arms survive relog; taking someone
else's checked weapon is theft — custody without title). The claim
ticket is a carried Thing, the shipped `Ticket` shape.

## Constraints

- **Verbs**: prefer existing verbs for the check exchange (the
  consign/reclaim custody pair, `give`, or dialogue-dispatched
  exchange) before minting any new one; if a new verb is genuinely
  needed it is afforded by the lounge pack's content, not a core
  mixin. Any brain action on Dave uses literal player verbs
  (`forceCommand`, the cellars precedent) — no god-mode shortcuts.
- **The sanctuary seam stays small and witness hooks stay witnesses.**
  One consultation on the session-open path; `CombatVenue`'s
  `onCombatOpened`/`onBloodDrawn`/`onCombatResolved` remain reactive
  and gain no veto power.
- **The tetany gate is a validator-shaped cut**, not per-verb edits
  scattered across controllers (the `requiresConscious` precedent).
- **Accountability stays producers-not-chokepoint** (accountability.md
  rejected the inflict chokepoint once already): the tase and the
  ejection produce rows through the existing combat/harm producers;
  no venue-shaped producer, no staff carve-out.
- **Brains are stateless config-driven modules** (behavior.md); Dave's
  witnessed evidence lives in the substrate the belief/witness
  machinery provides, not in module state.
- **Species data changes are content**; the fisticuffs floor ships as
  authored rows on humanoid species, not hardcoded in combat logic.
  Pedagogy rule applies: the richest honest model within the minimal
  grammar (blunt channel, mass scaling) — no bespoke "brawl damage"
  path parallel to materials-response.
- **No migrations, nothing legacy** — as always.
- Standard gates: the lint family, `pnpm test` once at finalize,
  participant contracts over `ApiOnly` for any new gated mutator.

## Acceptance criteria

- **Fisticuffs**: two unarmed humans open a session and can
  `strike`/`shove`/`subdue`; blows land honest blunt trauma; damage
  scales with attacker mass; a head-window strike at sufficient
  severity knocks the target out through the existing consciousness
  ladder; a natural-weapon beast's behavior is unchanged. An unarmed
  exchange credits `unarmed` in addition to `melee-combat` (the
  `blades` crediting pattern mirrored); an armed one does not. Tests
  colocated with combat's.
- **Tetany**: a switched-on stun baton hit produces a tetanized
  window during which the target's volitional verbs are refused with
  prose and holds cannot be released; the state reconciles on read
  and expires; a sustained-contact scenario still reaches
  fibrillation in test. `isTetanized()` has real call sites.
- **Sanctuary**: `attack` between two engaged players in a lounge
  warren room is refused with player-readable prose and no session
  opens; the identical pair one room north (the bar) opens a session
  normally; the office is likewise ungated.
- **The check**: the rack stands in the lounge room adjacent to the
  bar entrance, not in the bar; checking a weapon there yields a
  claim ticket;
  the rack's holdings survive a relog; reclaim returns the weapon;
  `ownerOf` answers the patron throughout; a shield is not treated as
  a weapon by the spotting predicate.
- **The warning and the 86**: entering the bar visibly armed while
  Dave is present produces a warning with prose naming the rack — and
  **no record**; stepping out, checking, and returning unarmed leads
  to normal service with no sanction anywhere. Lingering armed past
  the grace window produces the 86 record and an order to leave; the
  record is readable by the venue (institutionally, not via Dave's
  personal belief store) and persists. Drawing a weapon in the bar
  skips the warning entirely.
- **The bum's rush**: on refusing to leave, Dave initiates a grapple;
  a control win relocates the patron through the bar's exit into the
  lounge host room. The primitive is general (any control winner, any
  exit), not Dave-specific.
- **The summons**: with Dave in the office and a bartender on shift,
  an armed patron (or a breaking fight) draws the bartender's warning
  and a call for Dave; Dave emerges and runs the ladder from the
  floor. With nobody rostered, Dave's own floor coverage spots it
  directly.
- **The ladder**: in a staged brawl, Dave joins hands-first
  (subdue); when the threat threshold trips he travels to the office,
  retrieves the taser, returns, and tases the patron *he believes* is
  the aggressor; the fight runs unattended during the fetch.
- **The wrong guy**: a fight begun while Dave is in the office ends
  with Dave tasing a party the ledger does not name as first-mover —
  and the accountability rows attach the tase to Dave honestly, with
  no staff exemption. (The test that proves belief-not-ledger.)
- **Docs**: combat.md (fisticuffs, sanctuary, the bum's rush),
  electricity.md (the wired tetany gate), and the lounge's social-only
  /sanctuary posture stated in a doc for the first time (no doc says
  it today); accountability.md untouched or lightly cross-referenced.
- Lint family + full suite green once at finalize.

## Cross-references

- Seeding slates:
  [deferred-rpg/combat-slate](../slates/deferred-rpg/combat-slate.md) ·
  [builds/electricity-slate](../slates/builds/electricity-slate.md) ·
  [tails/ranged-slate](../slates/tails/ranged-slate.md) ·
  [builds/daves-bar-slate](../slates/builds/daves-bar-slate.md)
- Subsystem docs: combat.md · combat-hooks.md · electricity.md ·
  vitals.md · harm.md · accountability.md · belief.md · chattel.md ·
  retail.md · behavior.md · concealment.md · attendant.md ·
  boundary.md · spatial.md
- Related in-flight: none (the OO calling-conventions and
  api-boot-retirement sweeps are deliberately separate).
