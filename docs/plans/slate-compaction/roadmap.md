# Ledger — `docs/roadmap.md` § Active design slates

Part of the index sweep on `design/slate-index`. The generated
[slates/README.md](../../slates/README.md) (`./tools/slate-index`,
231 slates, four tables, each row carrying the slate's own `Left`)
replaced this section's hand-maintained catalogue.

Rule applied: **a doc carries only what it alone carries.** Cuts only,
paragraph granularity, when in doubt KEEP.

- Section: **285 lines → 58 lines**
- File: **1085 → 859 lines** (whole-file delta is this section only)
- Outcomes: **37 CUT · 7 KEPT · 0 GRADUATE** (entries; four subsection
  headings — *Substrate slates*, *Social / perception slates*,
  *New-player & world slates*, *Client* — emptied and went with them)

Every entry named a slate that the generated index lists with a `Left`
summary, or a subsystem doc that carries the shipped fact — verified
against `packages/server/src/**`, `packages/content/**` and the named
doc before cutting. No entry stated a shipped fact its subsystem doc
lacked, so there is **nothing in Handoff**.

## Kept

| entry | what it alone carries |
|---|---|
| `## Active design slates` framing paragraph ("the **catalogue** the two tracks above draw from") | the roadmap-level judgment that this is the menu Track A / Track B draw from; the inbound pointer at line 184 depends on it |
| `### Top-level guidance` → `design-philosophy.md` | a non-slate reference doc; no index row exists for it |
| `### Top-level guidance` → `runtime-model.md` | same — non-slate reference doc consumed by slates that schedule work |
| **The comms / social / expression cluster** (senses · emotes · comms · chat · reactions · npc-dialogue · access · spoiler) | a cross-slate grouping claim — *designed as one connected pass, built in waves*. Stated in no slate (grepped: no slate says "connected pass" / names the cluster). ⚠ Re-shaped: the eight member names are now inline links because the bullet list that carried them was cut. This is the one place the pass did not stay strictly cut-only. |
| **The connected new-player flow** (char-gen → lounge → fast-travel → onboarding → dorm + authoring) | a cross-slate sequencing claim stated in no slate. Same re-shaping (members inlined). |
| **Assessment integrity** — owned by the education-vertical / assessment system, *not* the spoiler slate | a scope boundary between two slates. `spoiler-slate.md` contains no occurrence of "assessment"; `college-slate.md` owns assessment but does not disclaim spoiler. Kept verbatim. |
| `docs/adjoining-systems.md` pointer | a non-slate catalogue doc (Tier 2/3 unexplored subsystems); the index does not list it |

## Cut — duplicated by the generated index

Each of these was a slate pointer whose prose restated the slate's
`Left` (now the README row). README row line numbers are from
`docs/slates/README.md` at the time of the sweep.

| entry | duplicates |
|---|---|
| `augmentation-slate` | README `tails/augmentation-slate.md` (L193) |
| `collision-slate` (incl. the 2026-06-10 "decomposed, not a standalone build" note) | README `tails/collision-slate.md` (L255) — the row carries the `guards`-brain decomposition |
| `recognition-slate` | README `tails/recognition-slate.md` (L228) |
| `social-graph-slate` | README `tails/social-graph-slate.md` (L283) |
| `identification-slate` | README `builds/identification-slate.md` (L140) |
| `senses-slate` (incl. "absorbs the retired sound slate") | README `builds/senses-slate.md` (L175); the absorption is stated in `senses-slate.md` L124 *"Hearing (sound) — absorbs the sound slate"* |
| `emotes-slate` | README `builds/emotes-slate.md` (L129) |
| `comms-slate` | README `tails/comms-slate.md` (L199) |
| `chat-slate` | README `tails/chat-slate.md` (L195) |
| `reactions-slate` | README `tails/reactions-slate.md` (L278) |
| `npc-dialogue-slate` | README `tails/npc-dialogue-slate.md` (L223) |
| `access-slate` | README `tails/access-slate.md` (L249) |
| `spoiler-slate` | README `tails/spoiler-slate.md` (L235) |
| `onboarding-slate` | README `builds/onboarding-slate.md` (L158) |
| `fast-travel-slate` | README `tails/fast-travel-slate.md` (L209) |
| `scoped-authoring-slate` | README `tails/scoped-authoring-slate.md` (L231) |
| `mixin-slate` | README `tails/mixin-slate.md` (L274) |
| `bulkable-slate` (the "deferred tails" half of the Bulk entry) | README `tails/bulkable-slate.md` (L194) |
| `client-cockpit-slate` | README `tails/client-cockpit-slate.md` (L197) |
| `console-filtering-slate` | README `tails/console-filtering-slate.md` (L201) |
| `message-rendering-slate` + `prompt-stack-slate` (the "stays open for Wave 2/3 / Tier 2/3" half) | README L272 and L277 |
| `mql-subscription-slate` (the "sister to" pointer) | README `tails/mql-subscription-slate.md` (L221) |
| `locomotion-as-activity-slate` + `host-slot-activities-slate` (the activity entry's deferred pointers) | README L218 and L268 |

## Cut — duplicated by a subsystem doc (shipped, verified in code/doc)

| entry | verified against |
|---|---|
| **Embodiment subsystem (shipped)** | `subsystems/slot.md`, `embodiment.md`, `posture.md` § Floor adornments (L69) + the ground-targeting path (L144), `conveyance.md` § Conveyance ripple (L78) |
| **Locomotion subsystem (shipped)** (incl. "the original locomotion slate was retired"; trap/detection/run-as-mode now shipped; pathfinder the open note) | `subsystems/locomotion.md` § Mode-gate cascade (L137) + **Pathfinder** as its own slate (L341–348); `concealment.md`; `hazard.md` |
| `subsystems/activity.md` Wave-1 shipped list | `subsystems/activity.md` (748 lines) |
| **Time subsystem (shipped 2026-06)** | `subsystems/time.md` — incl. the *no celestial→light wiring* deferral at L11 and § Future work (L534) |
| **Sound** — "absorbed into senses-slate; the standalone slate retired" | `senses-slate.md` § Hearing (sound) — absorbs the sound slate (L124) + § Deep acoustic spec |
| `subsystems/grouping.md` — the `GroupApi` facade entry | `subsystems/grouping.md`. ⚠ The roadmap text said *four shipped providers (managed, MQL, contacts, channel)*; `grouping.md` L19 records `PartyGroupProvider` as the fourth shipped with the party build — the roadmap line was stale, another reason it is a cut |
| `subsystems/char-gen.md` — Wave 1 SHIPPED + the deferred list | `subsystems/char-gen.md` L594–596 carries the same deferred list verbatim (the `records` verb, vitals/language, the lounge+onboarding flow, the name sanitizer) |
| **Affordance attribution (shipped)** | `subsystems/command-routing.md` § Affordance attribution — source, not category (L534); `getAffordances` (L560), `CommandContext.commandSource` (L184, L579) |
| **Bulk substrate (shipped — thermos slice)** | `subsystems/bulk.md` |
| **Wire substrate (shipped)** | duplicates roadmap's own **Foundation** section + `response-envelope.md` / `mql-subscription.md` |
| **Message rendering + prompt stack + inspection pane (shipped)** | `subsystems/message-rendering.md`, `prompt.md`, `card-surface.md` + the Foundation section |

## Cut — retired slates (no pointer; the file is gone and the index will not list it)

| entry | note |
|---|---|
| `> **Resolved:** communication-policy-slate … retired` blockquote | the retirement is history; its live kernel is in `comms-slate.md` § Moderation (L166), which the index row covers |
| the **sound-slate** retirement prose (inside the Sound entry) | same — retired into `senses-slate.md` |
| the **grouping-slate** retirement prose (inside the grouping entry) | same — replaced by `subsystems/grouping.md` |
| the **verb-provisioning slate** retirement prose (inside Affordance attribution) | same — shipped, `command-routing.md` |
| the **locomotion slate** retirement prose | same — shipped, `locomotion.md` |

## Cut — the *Surfaced-but-deferred subsystems* blockquote

Bullet by bullet. The framing sentence went with the bullets.

| bullet | outcome |
|---|---|
| **Economy / currency** | CUT — banking/retail/employment shipped (`subsystems/banking.md`, `retail.md`, `employment.md`); the fast-travel-fare parenthetical duplicates `fasttravel.md` (fare at L187/L275) |
| **Object condition / maintenance** | CUT — the mana half duplicates `fasttravel.md` (`dry`/`cut`/`overdrawn` at L418); the deferred half duplicates the README's fast-travel row (*terminals that WEAR · the maintenance round the self-governing Authority now owes*) |
| **Crafting** | CUT — the shipped half duplicates `subsystems/crafting.md`; the deferred *player-set functional stats* half duplicates `scoped-authoring-slate.md` L294 |
| **Assessment integrity** | **KEPT** (above) |
| **Campus / city-services pattern** | CUT — `eternal-university-slate.md` owns it explicitly (L308–316, L445–451, L497–499: *the campus-services pattern … as content*) |
| **Wayfinding / signs** | CUT — `onboarding-slate.md` `Left` names *the wayfinding signs* (L19) and designs them at L81/L314 |

## Handoff

**None.** No cut entry carried a fact about shipped code that its
subsystem doc lacked. (`grouping.md` already corrects the stale
provider count; nothing else needed graduating.)

## For the coordinator

1. **The two cross-slate notes were re-shaped, not purely cut** — the
   cluster line and the new-player-flow line kept their claim verbatim
   but now carry their member slates as inline links, because the
   bullet list that named them was cut. If the sweep would rather these
   lived in `slates/README.md` § *Keeping this honest* (which already
   records the medicine cluster's boundaries), they move cleanly and
   this section loses its `### Cross-slate notes` subsection entirely.
2. **`docs/roadmap.md` L184** still points forward to *"Active design
   slates"* as "the full slate catalogue (the menu these are drawn
   from)". That still reads true — the section now routes to the
   generated index — but a sweep that wants one hop fewer would point
   L184 straight at `./slates/README.md`.
3. Other roadmap sections (Foundation, the two tracks, v1 punch list,
   Substrate buildout, Suggested order, What got skipped or absorbed)
   were **not** touched and still contain slate links; several name
   slates by path. They were out of scope here and are a candidate for
   the same reconciliation.
