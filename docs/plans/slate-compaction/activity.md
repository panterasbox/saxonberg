# Slate-compaction pass — activity batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `docs/subsystems/activity.md`.
Line numbers below are the ORIGINAL file's (398 lines) unless noted.

Two prior batches (`mql-subscription.md`, `locomotion.md`) already found
and fixed stale wording in `activity.md` outside their own write lists,
as a courtesy: the "state-sync channel" language (now "MQL subscription
re-projections", `activity.md:495,547-548`) and the locomotion
forward-reference's duration-model fields (now corrected at
`activity.md:667-673`, pointing at `locomotion.md § Duration lives in
the Journey`). **Both are already applied in the tree — re-verified
here, nothing left to do.** `behavior.md`'s ledger inserted the "Slot
contention" section into `behavior.md`, not `activity.md` — no action
needed on my file from it. `ranged.md`'s "combat round is a sustained
engagement" finding refers to a line in `ranged.md`'s own slate citing
`activity.md` as a *See also* target, not a statement inside
`activity.md` itself — checked, no such text exists there, nothing to
fix.

---

## docs/slates/tails/host-slot-activities-slate.md — 398 → 410 · Status PARTIAL → PARTIAL

This slate already carries its own **⚠ AUDIT 2026-08-08** correction
block (added when GitLab #9 was closed against it), which had already
done most of the SHIPPED-vs-UNBUILT triage a compaction pass would do:
it struck `Readable`/`read` from scope (shipped as `MarkedMixin`) and
corrected "the framework is inert" to "live consumers exist." Re-verified
every claim in that block against the tree today (six weeks later) —
**all still accurate, nothing has shipped since**:
`grep -rn "claimPending|commitClaim|releaseClaim|isPendingClaimedBy"` and
`grep -rn "class (Mount|Dismount|Sit|Lie|Drive|Read)Activity"` under
`packages/server/src/mud` and `packages/content` both return nothing;
`docs/subsystems/slot.md` has no pending-claim state; no requirements or
plan doc exists for this slate (`find docs/requirements docs/plans
-iname "*host-slot*"` empty). So the whole design body remains UNBUILT
and is kept — this pass's job was verification + two corrections + one
real graduation, not bulk cutting.

### Cut (SHIPPED · DOCUMENTED)
- the second (pre-audit) status blockquote, *"Status: deferred. v1 keeps
  these verbs synchronous and instant…"* (50–56, 7 lines) — history:
  fully subsumed by the canonical status block above it and by
  `## When this earns its slot` immediately below, which covers the same
  JS-tick-atomicity argument in more detail and is KEPT. Removed with no
  pointer needed (nothing new was in it)

### Graduated (SHIPPED · UNDOCUMENTED) — cross-referenced, not cut
- The AUDIT block's consumer list (`AttendanceEngagement.ts`,
  `DialogueConversation.ts`) — code confirmed both are genuine
  `SustainedEngagement`s on the `attention`/`voice` slots
  (`lib/attendant/AttendanceEngagement.ts`,
  `lib/npc/DialogueConversation.ts`); `activity.md`'s own "first
  consumer" narrative (lines 21–44) named respiration, NPC behavior, and
  the cocktail-build verbs but **omitted these two** — the exact
  `attention`-slot consumers most relevant to this slate's still-unbuilt
  `ReadActivity` proof-of-concept. Inserted a new paragraph after the
  crafting-consumer paragraph in `activity.md` (9 lines) naming both,
  with a forward pointer to this slate. **Not cut from the slate** — the
  audit block's own reasoning (host-slot verbs specifically have NO
  consumer yet) is still the load-bearing half of that paragraph and
  isn't restated in `activity.md`; a one-line addendum was added instead
  noting the cross-reference and re-confirming the negative finding

### Superseded — cut (in place, not removed)
- `## \`ReadActivity\``'s concrete `Readable` interface
  (`getReadText`/`getReadDuration`) — by `MarkedMixin` +
  `ReadController`'s perceive/decode split
  (`lib/description/Marked.ts`, `.../cmd/perception/ReadController.ts`):
  there is no `Readable` mixin, `Marked` owns the surface, and decode is
  a no-op v1 pass. This is the AUDIT block's point 2 playing out at the
  section that still describes the old shape. Added a warning paragraph
  in place rather than deleting the class sketch — the *shape of the
  still-open question* (should reading become durative, and is
  "durative" about the decode half specifically) is unchanged and the
  sketch is the best available illustration of it, just not of today's
  mixin

### Kept (UNBUILT)
- the status block (unchanged — already accurate) · the AUDIT block
  (kept whole; re-verified, still accurate; addendum added, not cut —
  see Graduated) · the intro paragraphs · `See also` (all six targets
  exist)
- `## When this earns its slot` (all four numbered triggers — none is
  v1 content yet)
- `## \`SlotApi\` pending-claim extension` (the `claimPending`/
  `commitClaim`/`releaseClaim`/`isPendingClaimedBy` design; no such
  methods exist)
- `## \`MountActivity\` / \`DismountActivity\`` (incl. the race
  resolution and host-destruction-mid-mount design)
- `## \`SitActivity\` / \`LieActivity\``
- `## \`DriveActivity\`` (both scope options; still blocked on
  `locomotion-as-activity-slate.md`, itself confirmed still UNBUILT by
  the `locomotion` batch's ledger)
- `## \`ReadActivity\`` (flagged, not cut — see Superseded)
- `## What this slate doesn't cover` (all five bullets still accurate;
  the "Real book content" bullet's bookmark-on-abort deferral matches
  `activity.md`'s own still-accurate "Bookmark-on-abort for `read`"
  future-work entry)
- `## Open questions` Q1–Q4 (all four still open; Q4's dependency on
  locomotion-as-activity landing first is still live)
- `## Once shaped into formal requirements` (not yet done — no
  requirements/plan doc exists)

### Doctrine — kept, labelled
- none — this slate is pure backlog design, no separable thesis section

### Uncertain — kept
- none new — the one genuine ambiguity (whether `Readable`'s "durative"
  question now attaches to `Marked`'s decode half specifically) is
  already stated as the open question by the AUDIT block itself
  ("`read` now has a perceive/decode split that may make 'durative' mean
  something specific to the decode half only") and is not contradicted
  by anything found; restated as a flag on `## ReadActivity`, not listed
  separately here to avoid duplication
- Overlaps for the cluster pass: `DriveActivity` ↔
  `locomotion-as-activity-slate.md` (both confirmed still UNBUILT this
  round — no sequencing has happened); the `attention`/`voice` slot
  vocabulary ↔ `attendant.md`, `npc-dialogue.md` (now cross-referenced
  from `activity.md`, not duplicated here)

### Handoff (belongs in a doc outside my list)
- none — the two pending handoffs from earlier batches
  (`mql-subscription`'s state-sync wording, `locomotion`'s duration-model
  forward reference) target `activity.md`, which IS my write list, and
  both are already applied (see the batch header above)

### Status block
- Status: PARTIAL → PARTIAL (unchanged — still correct)
- Left: *sit/lie/mount/drive as interruptible durative engagements ·
  `SlotApi.claimPending` · the decode half of `read` as a duration* → no
  change; re-verified accurate and complete against the body (every
  UNBUILT section above folds into one of these three items — the
  `SlotApi` extension, the four activity classes, and the `read`
  duration question)
- Size: a tail → a tail (unchanged)

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `tails/host-slot-activities-slate.md` | 398 → 410 | PARTIAL → PARTIAL | 3 → 3 (unchanged, re-verified) | a tail → a tail |

`docs/subsystems/activity.md`: +13 lines (1 graduated insert — the
`AttendanceEngagement`/`DialogueConversation` consumer paragraph — after
the crafting-consumer paragraph in the intro). No other file touched.
This slate grew slightly (398 → 410) rather than shrank: it was already
a tight, well-audited tail with almost nothing shipped since its last
correction pass, so this round's value was verification + two accuracy
fixes + one cross-subsystem graduation, not bulk removal.
