# Wizard-axis cleanup — requirements

**Kind:** refactor/sweep, with one feature wave (W3's governance route)
**Leads from:** kernel — the first consumers already exist and are
shipped content: the dorms-agent seat at Duncan Hall (Katie) and the
letting seat on Mayfield Row (Walter), both of which work today and are
currently bypassed rather than exercised.

**Wizardness is TypeScript access. That is all it is** — writing TS into
the source tree, executing TS, and file operations on it. Everything
else is authority, and authority comes from a **seat**. The axis has
been leaking for a long time, most recently in the cooking build's live
drive, and **nothing in the build gates catches it**. This build strips
the leaks, folds the doors that really are TypeScript, routes the
world's political dials to an office, and — the part that makes it
stick — adds the gate that fails CI when a new leak appears.

Seeded by
[wizard-axis-cleanup-slate](../slates/builds/wizard-axis-cleanup-slate.md),
which carries the complete site inventory.

## What already exists

- **The seats are already built.** The lease/provision acts have a
  working authority (agent of the owner group); the `isWizard` bypass
  sits *above* the working check. Deleting the bypass exercises what is
  already there — it does not require new authority.
- **The office substrate is shipped** — five seats, `holdsOffice`, and
  a governance surface that already records decisions. Central-bank
  reserve verbs already gate on `requiresGovernor`, so the pattern
  W3 needs has a working precedent in the same subsystem.
- **The tier model is already written.** `measurement.md` defines Tier B
  (editorial, amendable by whoever ships the code) and Tier C (policy,
  amendable by the polity), and names taxes and monetary policy as C.
  This build applies an existing doctrine; it invents no new one.
- **The lint family is derived** — a new gate is picked up by CI, the
  pre-merge sweep and local runs with no list to edit.
- **The settings vocabulary is one file** and is already the single
  source of truth for the keyspace, so a per-key tier tag has an obvious
  home and a totality check has an obvious shape.

⚠ Two claims in the slate did not survive the survey, and the build
should not chase them: the haulage warehouseman is not a leak (its file
documents that the axis appears nowhere in that build), and banking's
"operator-gated at the verb layer" comment is stale — that verb gates on
an office already.

**Therefore what is genuinely new here is** the gate, the tier tags on
the keyspace, and one governance route for eight keys. Everything else
is deletion.

## Goals

- **A leak cannot be added without a conversation.** A new site taking
  the wizard axis fails CI; the permitted sites are a short, readable,
  reviewable list.
- **The lease/provision seats are exercised, not bypassed.** A person
  who holds the seat can act; a wizard who does not hold it cannot.
- **Every door that reaches TypeScript is gated as TypeScript** — and
  where a door also touches a specific resource, both halves survive:
  *may you touch code at all* and *may you touch THIS*.
- **The world's political dials leave the operator's hands.** The eight
  policy keys become a thing the polity decides and the record shows.
- **The keyspace is total** — every key carries a tier, and a new key
  without one fails.

## Non-goals

- **The reads and reveals** — the `errors raw` tier and the client's
  `isWizard` response flag. *(Destination: a follow-on tail; the slate's
  W4 stays open for them.)* The wiki spoiler reveal IS in scope, having
  been decided.
- **Re-deciding what conferral means.** `requiresArchwizard` on the
  conferral verb is the one place the axis is the subject rather than
  the gate. *(Destination: nowhere — deliberately untouched.)*
- **Renown's weights.** They decide what counts as standing and are
  arguably more political than the sales tax, but routing them needs the
  published-weights machinery. *(Destination:
  [standing-mint-slate](../slates/builds/standing-mint-slate.md), which
  owns that question.)*
- **The amendment library.** Tier C keys land with an office; making
  them amendable *through the Compact* is the natural next consumer.
  *(Destination:
  [amendment-library-slate](../slates/builds/amendment-library-slate.md).)*
- **A settings permission axis.** Minting one would be the author-tier
  category error again. *(Destination: nowhere, deliberately.)*

## Placement

Kernel, with content edits in two packs (the university's dorm verbs and
Terminus's letting verbs). The gate joins the existing lint family. The
tier tags live with the settings vocabulary they describe. The Tier C
route uses the shipped office surface rather than a new one.

⭐ **Does a second instance need code?** No — that is the test this
build is really about. A third venue that lets rooms should get its
authority from its own seat with no new gate and no new code, which is
exactly what the bypasses were hiding.

## Collisions

- **Duncan Hall** — Katie's move-in flow dispatches the provisioning
  verbs. She is deliberately not a wizard, so she is the proof the seat
  works; if the drive shows her flow breaking, the seat is wrong, not
  the deletion.
- **Mayfield Row** — Walter and the letting flow, same shape.
- **The magic content** — deleting a spell removes a shipped verb from
  the catalogue; any content that names it must go with it.
- **The wiki** — pages carrying spoiler-tagged material change what a
  wizard sees.
- **Anything driving with a wizard session as a shortcut.** Existing
  drives that reached for a wizard to do a content act will now fail,
  and that is the point: each one is a finding.

## Surface decisions

### The code-doors fold into the TypeScript gate
`reload` executes modules; `git publish`/`revert` write the tree; CMS
and Studio write source files; the template fields that name a class,
hydrator or brain are content naming code; the command-view gate is the
same. Every one reaches TypeScript by another route, so each is the axis
rather than an exception to it. ⭐ Where a door already checks
`isWizard` **and** a per-resource authority, **both halves survive** —
the first asks whether you may touch code at all, the second whether you
may touch this particular thing.

### The command-running spell is deleted
A spell that executes arbitrary commands is a console in a costume. Its
own comment called it the one non-diegetic gate. It teaches nothing and
breaks the fiction it sits inside; if something genuinely needs it, that
need gets named and met on its own terms.

### The transcript-fabricating verb ships nowhere
Writing fabricated deeds contradicts the measurement doctrine that the
Transcript is *what happened*. It stays a development harness that no
production pack installs — a placement fix, not a gate fix.

### A wizard does not see wiki spoilers
Source access is an out-of-game capability. A wizard playing a character
should not have their character's screen spoiled; the in-game reveal
keys on the wiki's own two axes.

### Tier C is eight keys, and everything else defaults to B
The keyspace is 389 keys and overwhelmingly physics. The political set
is the taxes, levies, grants and capital controls: the sales tax, the
corpo royalty, the consignment commission, the onboarding stipend, the
two withdrawal caps, and the opening capital and float. Tier B is the
default and changes nothing, so the build is safe; the **totality check
is what makes the default honest**, by forcing every new key to be
classified deliberately rather than by silence.

## Lens pass

1. **Pedagogy** — ⭐ stronger than a cleanup deserves. Tier C makes the
   sales tax *a thing the polity argues about* instead of a config key
   nobody can see. That is the civics claim made operable, and the
   Disciplines it exercises are the governance ones.
2. **Creative expression** — the gate is the affordance. An author
   adding a venue that lets rooms gets a seat, not a stand-in, and the
   allowlist tells them so at CI time rather than in review.
3. **Immersion** — ⭐ deleting the command-running spell is a real gain:
   the one object in the magic system that was not magic goes away.
4. **Values** — ⭐⭐ the strongest lens. *Who may set the tax rate* is
   the question, and the current answer — anyone who can write
   TypeScript, silently, with no record — is the wrong one in a game
   whose thesis is that authority lives in seats.
5. **Epochs** — n/a. The axis is about code trust, which has no epoch.

## The drive

A refactor's drive proves the old paths still work and the new gate
bites. Run against a fresh world.

1. **The seat works.** As the dorms agent — not a wizard — run the
   move-in provisioning flow at Duncan Hall. It completes.
2. **The bypass is gone.** As a wizard holding no seat, attempt the same
   provisioning act. Refused, with a legible reason naming the seat.
3. Repeat 1–2 for the letting flow on Mayfield Row.
4. **A code door still opens for a wizard, and only for a wizard.**
   Write to the source tree, then reload. Both work. As a non-wizard,
   both refuse.
5. **A code door still respects the resource half.** As a wizard, write
   to a path you hold no title over. Refused.
6. **Tier B is unchanged.** Read and set an ordinary physics setting.
   Works exactly as before.
7. **Tier C is unreachable from the operator verb.** Attempt to set the
   sales tax there. Refused, pointing at the office that holds it.
8. **Tier C works through the seat.** As the office holder, set the
   sales tax through the governance surface. It takes effect, and the
   decision appears in the record.
9. **The spell is gone.** Attempt to cast it. No such spell; nothing in
   the catalogue names it.
10. **Spoilers stay hidden.** As a wizard, read a wiki page with
    spoiler-tagged material. Not revealed.

## Acceptance criteria

- A person holding the dorms/letting seat can do the act; a wizard
  without the seat cannot.
- Setting the sales tax from the operator verb is refused and says where
  it belongs; setting it from the office works and lands in the record.
- Every physics setting behaves exactly as it did before.
- The command-running spell does not appear in any spell listing.
- The transcript-fabricating verb is absent from a production world.
- A wizard reading a spoiler-tagged wiki page sees what a non-wizard
  sees.
- Adding a new wizard-axis site anywhere fails the build until it is
  added to a reviewed list.
- Adding a settings key without a tier fails the build.

## Cross-references

- [wizard-axis-cleanup-slate](../slates/builds/wizard-axis-cleanup-slate.md)
  — the complete site inventory
- [access.md](../subsystems/access.md) — the wizard/protowizard split and
  *a missing authority is not a grant*
- [measurement.md](../measurement.md) — the B/C tier model this applies
- [governance.md](../subsystems/governance.md) ·
  [civics.md](../subsystems/civics.md) — the seat Tier C routes to
- [lint-family.md](../lint-family.md) — where the new gate joins
- [call-security.md](../subsystems/call-security.md) — participant
  contracts, the alternative to a gate that says nothing about who
