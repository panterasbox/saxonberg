# Slate-compaction ledger — batch: grouping

Insert-doc (may write): `docs/subsystems/grouping.md`
Slate: `docs/slates/builds/affiliation-slate.md`

## `docs/slates/builds/affiliation-slate.md` — 166 → 127 lines · Status PARTIAL → PARTIAL

Verified against code: `packages/server/src/mud/platform/idea/GroupRegistry.ts`,
`packages/server/src/mud/lib/party/{Party,PartyGroupProvider,PartyMember,PartyRecord}.ts`,
`packages/server/src/mud/lib/corpo/{Corpo,Brand,Branded}.ts`, and against
`docs/subsystems/{grouping,party,corpo,civics,governance,employment}.md`.
No `House`/`Guild` `GroupProvider` exists anywhere (grepped
`packages/server/src`, `packages/content` for `House`, `Guild`,
`HouseGroupProvider`, `GuildGroupProvider` — only unrelated hits:
`HouseController`/`HouseFreightController` are the *banking* `house`
verb, `HouseholdersKit` is residence furnishing).

### Graduated (SHIPPED · UNDOCUMENTED) — then noted
- `grouping.md`'s own "three v1 sources" / "three providers" framing was
  **stale**, proven false by code: `party.md` § *The governing decision: a
  party owns its own membership* states in as many words that the party
  build "registers a **fourth provider** (`party:<path>`)" — confirmed at
  `lib/party/PartyGroupProvider.ts`. This is not from the affiliation
  slate itself, but the affiliation slate's own canonical status line
  already correctly says "four providers (managed · MQL · contacts ·
  party)" and points at `grouping.md`, which had not caught up. Inserted:
  a short paragraph after the "three v1 sources" list naming the fourth
  `PartyGroupProvider`, a `### Party (source: 'party')` subsection beside
  the other three provider write-ups, and renamed the stale `## The three
  providers` heading to `## The four providers` (a statement the code
  proved false, corrected per the procedure's exception).

### Cut (SUPERSEDED — old pre-decision design)
- `## Guild — the class system (deferred)` § the two-structure bulleted
  design (class taxonomy tree + advancement ladder), the "earned, not
  chosen" bullet, "recruits on campus" bullet, and the `capability-magic`
  deferral bullet (≈14 lines) — the section's own blockquote already
  states this sketch "is superseded by" `guild-slate.md`'s full
  institution design (chartered domains, mysteries/calls/marks, vocation
  = discipline × livelihood, declared-focus mechanic). Verified
  `guild-slate.md` still exists and is `UNBUILT` (its own detailed `Left`
  list). Cut the superseded bullets; kept the header + the blockquote,
  which is itself the one-line-note pointer the procedure asks for.
- `## Corp — the competition overlay (deferred)` § the three bullets (the
  EVE-model orthogonal-allegiance description, the toxicity caveat, the
  open question about player-founded corps) — the section's own
  blockquote already states this framing ("joined branch") "is
  superseded" by `corpos-slate.md`'s settled model (conduct-driven
  standing, not membership) and Phase 2 design. Verified: `corpo.md`
  documents exactly this — "Deferred" section lists "the multipolar
  approval vector… competition/territory, sponsorship… player-founded
  corps deferred," matching the blockquote's claims exactly. Cut the
  superseded bullets; kept the header + blockquote.

### Kept (UNBUILT)
- `## The frame — one substrate, several axes` (table + framing) — the
  House/Guild/Corp/Religion axis comparison is still the operative
  design frame; no code implements House, Guild, or Corp as
  *affiliation* providers (Corp's mark/committee substrate is a
  different, narrower thing — see `corpo.md` — not the affiliation axis
  this table describes).
- `## Scope — campus-tier vs. world-tier` (full section) — doctrine
  about where each affiliation lives; nothing in code implements campus
  vs. world-tier zoning for affiliations.
- `## House — abstract belonging, vertical-sorted (near-term)` (full
  section, all bullets + the two open items) — confirmed no House
  provider, chapter space, or greeter-suggestion mechanic exists in
  `packages/server/src` or `packages/content`. This is now the slate's
  only substantial remaining original design.
- `## Substrate / connections` — all links still resolve to existing
  docs/slates (`grouping.md`, `social-graph-slate.md`, `chat-slate.md`,
  `alignment-religion-slate.md`, `char-gen.md`, `capability-magic-slate.md`,
  `eternal-university-slate.md` — all verified to exist).

### Uncertain
- The `## The frame` table's Corp row ("allegiance/competition overlay |
  world-given / joined") uses the pre-superseded "joined" framing that
  the Corp section below it explicitly retracts (conduct-driven standing,
  not membership). Left as-is per "don't rewrite a kept section, cut
  whole paragraphs only" — a single table cell inside an otherwise-live
  comparison table isn't a paragraph-granularity cut, and the correction
  immediately follows it in the same document. Flagging for the
  coordinator in case a targeted table-cell fix is wanted at cluster
  time.

### Handoff (belongs in a doc outside my list)
- None. `civics.md`, `governance.md`, and `employment.md` were read for
  context (per the batch brief) but the affiliation slate makes no claim
  that graduates into them — House/Guild/Corp as *this slate* designs
  them never shipped, so there is nothing of this slate's to hand off
  there. (`corpo.md`'s "chief-executive position" / `<key>-committee`
  group material is already fully documented in `corpo.md` itself — nothing
  further to move.)

### Status block
- Left: shrank. Old: *House as a provider plus its char-gen touch (the
  near-term axis) · Guild as the class system · Corp as the competition
  overlay — the last two deferred game design*. New: *House as a
  provider plus its char-gen touch (the only design still owned by this
  slate); Guild and Corp are now pointer-only, each naming the slate that
  owns its actual backlog (guild-slate.md; corpos-slate.md)*. The body no
  longer carries Guild/Corp design content of its own, so listing them as
  this slate's open work was inaccurate; per the two-slates pointer-stub
  convention, they're named as pointers instead.
- Size: **a build → a wave**. The only remaining original-to-this-slate
  work (House) is wave-sized; Guild and Corp's real backlogs live in
  their own build-sized slates.
- Status: unchanged — *PARTIAL*.

### Also touched: `docs/subsystems/grouping.md` (399 → 417 lines)
Two inserts, both graduating a fact proven by code that the doc was
missing (not slate content — the batch brief specifically flagged this
gap: "party.md says it is now the FOURTH provider"):
1. A paragraph after the "three v1 sources" list naming
   `PartyGroupProvider` as a fourth, shipped provider, pointing to
   `party.md`.
2. A `### Party (source: 'party')` subsection alongside Managed/MQL/
   Contacts, kept to one paragraph (the full shape stays in `party.md`,
   avoiding duplication).
Also renamed the now-false `## The three providers` heading to `## The
four providers` — a statement the code proved false, corrected per the
procedure's stated exception.

**Net effect:** the slate's House design (its only remaining original
content) is untouched; Guild and Corp collapsed to the pointers they
already functionally were (their governing blockquotes said so); the
separately-flagged `grouping.md` staleness was fixed in place.
