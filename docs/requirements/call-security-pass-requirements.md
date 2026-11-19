# The call-security pass — the actor claim and the compulsion gate — requirements

**Kind:** refactor/sweep with a security edge
**Leads from:** kernel. First consumers: the ~30 protective gates
controller-liquidity moved onto their models (naming, locks, letting, the
plat book, hiring, the blood bank, tips, consigned goods, herds, harbors,
carts, screens, chat, forums, the wiki, documents), and the Realtor's
`realty-buy`, the one place today where one body's code drives another's.

Seeded by [call-security-pass-slate](../slates/tech-debt/call-security-pass-slate.md)
§ *The actor claim* (owner priority, 2026-11-10) and the compulsion gate the
owner asked for as its own security build. **This build is the slate's first
part only**; the rest of the pass stays on the slate (§ Non-goals).

Since controller-liquidity, every gate that protects someone else lives on
the thing it protects and is told who is acting: *may this person rename
this pet, unlock this door, read this hidden revision?* Nothing can skip
those gates, but the answer to *who is acting* is believed, not checked. A
player-adopted replacement controller, an NPC brain, a pack or a wizard's
`eval` can name somebody else and be believed. Separately, any code that
holds a body can make that body run any command. This build makes the
engine, not the caller, say who is acting, and makes driving another
person's body something that body must agree to.

## What already exists

- **About 30 protective gates** that take the acting person and trust it
  (the survey's table: naming a made thing or an animal, `lock`/`unlock`,
  a padlocked gate, `lease`/`provision`/`stall rent`, `title buy`,
  `job apply`, the blood bank's `issue`, a tip jar's `collect`,
  `shelf consign`/`reclaim`, `store withdraw`, `unhitch`, a herd's `move`/
  `draft`/`slaughter`, `berth`, `spud`, `arm`, taking down a fixture,
  searching a conscious body, a business's screen, chat governance and
  history, forum posting and voting, the wiki's hidden revisions and reader
  ceiling, document and CMS writes).
- **Three gates already ask the engine** who is acting instead of trusting
  an argument: Tier C `config set`, `errors raw`, and wiki edits. They are
  the pattern this build makes universal.
- **The engine already knows whose act it is** (the acting author: one
  consistent giver for a command, the session's player for a REST call).
  It has two gaps this build must close: a command an NPC forces on
  *itself* reads as nobody's, and a timed step's completion does not carry
  its actor.
- **One gate fails open:** the blood bank's `issue` with no issuer named
  lets the stock out.
- **Driving another body:** any code holding a body can make it run any
  command, `eval` included. In shipped content only one place drives a
  player's body: the Realtor runs `title buy` as the buyer after an
  informal confirm. Everything else drives only itself (every brain), or
  acts as the NPC on the player (dialogue `dispatch`: Dave's `house
  appoint`, Katie's `provision` — the NPC's own act, bounded by its own
  verbs).
- **The failure model** words a refusal from a reason row and routes a
  defect's diagnostic to whoever holds title over the row
  ([response-envelope.md § `refused`](../subsystems/response-envelope.md),
  [diagnostics.md](../subsystems/diagnostics.md)).
- **Consent elsewhere:** the splash consent gate and the combat terms
  handshake ship ([ranged.md](../subsystems/ranged.md)); the accountability
  ledger records consent after the fact ([accountability.md](../subsystems/accountability.md)).
  Neither covers making a body act.

**Therefore what is genuinely new here:** the check that the claimed actor
is the real one; a named system actor for work with no person behind it;
a rule, per verb, for whether another body may make you run it, with your
own consent as the gate; and a count of unchecked protective gates that can
only fall. Everything underneath exists. The reuse ledger is the slate's
(§ *Reuse ledger for the plan*).

## Goals

- A protective gate can no longer be lied to: the actor it decides about is
  the one the engine says is acting, whoever called it.
- A player can still do everything they could; an NPC still does its job;
  a timed step still completes as the person who started it; a sweep or a
  boot step still runs, as the named system actor.
- No code can make another person's body run a command unless that verb
  allows it and the person agrees, when asked, at the moment it happens.
- A lie is refused out loud, worded from a reason row, and whoever keeps the
  lying code is told.
- The blood bank refuses an issue with no issuer.
- Every protective gate is counted, and the count of unchecked ones is zero
  and can only stay there.

## Non-goals

- **The audit rail** (`@Audited`, a sampled permit log, and the new
  collection it needs) → call-security-pass-slate § The audit rail; it can
  sample this build's refusals as its first producer.
- **Re-gating the ~35 sealed-but-ungated mutators**, the `FromMixin`-marker
  question, `FromIdentity`, pack-contributed gate participants,
  interface-based admission → call-security-pass-slate.
- **Acting ON another body** — shove, pin, a bum-rush, drawing blood: a
  consent gate before an act on someone, distinct from making them act →
  call-security-pass-slate § The consent gate (bleed is its first case).
- **Acting FOR another person by grant** (an agent, a steward, `su`) →
  agency-slate, wizard-duty-slate. This build only checks that the claimed
  actor is the real one; a grant to act for someone is a later model.
- **Charm, fear and compel magic** → spellbook-slate § 8 (none exists in
  code; when it does, it meets this gate).
- **Coercing a held body** (custody, frisking a conscious body, biometric
  keys on a sleeper) → carrying-a-person-slate, policing-slate, lock-slate.

## Placement

Kernel: the actor check, the system actor and the compellability rule live
in the engine, because every pack's gates and verbs meet them. A pack
declares nothing new to be protected: its gates already take the actor, and
the check is the kernel's. A verb's compellability is declared on the verb
(its view), so a pack's verb states its own. A second content instance needs
no code.

## Collisions

- **The Realtor** (Terminus): its `realty-buy` becomes the first consumer of
  *compellable with consent*; its informal confirm becomes the gate's own
  question.
- **Dialogue `dispatch`** (Dave at the bar, Katie at Duncan Hall, the
  bank counter): unaffected. It runs as the NPC, on the NPC's own verbs.
- **Every brain**: unaffected in behavior; each forces only itself, and must
  still count as itself.
- **Timed steps that check permission at completion** (a felling on titled
  ground, a bore): must complete as their starter.
- **Wizards' `eval`**: can still act as the wizard; can no longer act as, or
  drive, anyone else.
- **The blood bank** (the infirmary's): its `issue` becomes fail-closed.

## Surface decisions

### Who is acting

The engine's answer, never an argument: a player's command, the player; an
NPC's own act (its brain, its dialogue), the NPC; a timed step's completion,
whoever started it; a REST or CMS operation, the session's player; a wizard's
`eval`, the wizard. Work with no person behind it (a sweep, a boot step, the
residency tick, the world's own schedules) runs as **the system**, named
explicitly. Nothing is a silent pass.

### Which gates check it

Only the gates that protect **someone else** — their things, their
privacy, their standing, or the polity's settings. A gate whose actor only
sets the caller's own effort, wording or competence (how hard *you* swing an
axe) is left alone: a lie there fools only the liar. The test is the
existing one: *does the subject bound the spoof?*

### What a lie looks like

The act is refused, worded from a row (*"You can't act for Ryn."*), and the
lying code's keeper — whoever holds title over the controller, script or
pack — gets a diagnostic in `errors`. Nothing else changes in the world.

### Compulsion — making another body run a command

- Compulsion is code running as one body making a **different** body run a
  command. Doing something *to* a body is not compulsion (see Non-goals).
- Each verb is **never** compellable unless it says otherwise. A verb may
  declare itself **compellable with consent**. Nothing is compellable
  without consent in this build (fleeing is the body's own act today).
- **Never**, by rule, whatever a verb says: speech, conferral, group or
  committee membership, and **giving away** — title transferred out, money
  paid or tipped away. (Owner ruling, 2026-11-18: a purchase at a counter,
  which spends money and gains title, may ask consent; giving title or
  money away never can.)
- **Consent is asked of the compelled body's own player**, at the moment,
  naming who asks and the command that would run (*"The realtor would have
  you run `title buy lot 4`. Let them?"*) — the engine's words, never the
  asker's, which could lie about what runs; the asker states the price in
  the fiction first.
- The gate covers the **command path**: a body made to run a command. Code
  that holds a body and calls its methods directly is the slate's
  *possession is capability*, a non-goal here. Yes runs it as them, through their own verbs and
  gates; no refuses it. A body nobody can ask — an offline player, an NPC —
  cannot consent, so it is refused. A player's code therefore can never make
  an NPC act.

### Wizards

A wizard's `eval` acts as the wizard and no one else; it can neither claim
another person nor drive another body. The wizard axis stays authoring code,
never authority over people.

## Lens pass

- **1 Pedagogy.** No Discipline. The lesson is civic and quiet: an
  institution acts only through the people entitled to act for it, and the
  engine shows it — a refused claim is said, not swallowed.
- **2 Creative expression.** The ordinary case needs nothing: an author's
  controller passes the giver and works. The bespoke case (a controller that
  acts for someone else) is exactly what is refused; the honest way to it is
  a grant, which is agency-slate's. Lens 2 does not lose anything a
  well-meant author can do today.
- **3a Immersion.** Your character never does or says something you did not
  choose; the one exception asks you first, in the fiction's words.
  **3b Participation.** Players can still build institutions that act — they
  act through their own officers, who are present and asked.
- **4 Values.** No undecidable choice; *never compel speech* is decided
  here, by the owner, as an invariant.
- **5 Continuity.** Epoch-free: who acts and who may be made to act holds
  in every epoch.
- **6 Economy.** Nothing produced or consumed; it protects every economic
  gate (title, stock, tips, letting) from a forged buyer or keeper.
- **7 Governance.** It judges code, not a person: the criterion is "the
  claimed actor is not the acting one"; the appeal is the diagnostic to the
  code's keeper; entrenchment tier A (the platform's own integrity).

## The drive

All steps `instant` or `staged`. A **lying controller** is staged as a
replacement controller (the CMS alternate) that passes another person as the
actor; it lives under its author's home, so its keeper is its author.

### Blocking drive

1. **(player)** Ryn names her own pet `name kitten Bramble` → *"Bramble."* —
   the honest path still works.
2. **(staged)** Sol, given title over the `name` view for this step, points
   it at a replacement controller (kept under Sol's home) that passes Ryn as
   the actor, and types `name kitten Biscuit` → refused, *"You can't act for
   Ryn."*; the kitten is still Bramble; Sol's `errors` names the controller.
3. **(staged)** A wizard's `eval` calls the pump-house door's unlock naming
   another player as the actor → refused the same way; the door stays
   locked. The wizard unlocking a door they hold the key to through `eval`
   works.
4. **(player)** The honest protective gates still answer: `unlock` with the
   key; `chat history` on a channel you are in; `wiki history` as an
   ordinary reader (hidden revisions withheld, no error).
5. **(staged)** An NPC still does its job: a shopkeeper's restock and the
   bar's `house appoint $player` through Dave's dialogue run as the NPC.
6. **(staged)** A timed step that checks title at completion (a bore on
   titled ground) completes for the player who started it.
7. **(player)** At the Realtor, ask to buy a plot → the realtor names the
   price, then the gate's own question, *"The realtor would have you run
   `title buy …`. Let them?"*; yes → the plot is bought, by you, through your
   own `title buy`.
8. **(player)** The same, answered no → nothing is bought; the realtor is
   told you declined.
9. **(staged)** Sol's code makes Dave run `house appoint Sol` → refused;
   Dave does nothing. Sol's code makes Ryn `say hello` → refused (speech is
   never compellable), whether Ryn is online or not.
10. **(staged)** The blood bank's issue with no issuer → refused; the stock
    stays.
11. **(staged)** A sweep (the residency tick, a schedule) still runs as the
    system across the protective gates it touches.

There is no restart step: nothing this build adds persists except
diagnostics, which already survive one. No new place, so no light step.

### Soak drive

None.

## Acceptance criteria

- Every protective gate decides on the engine's actor; a forged actor is
  refused, worded, and the forging code's keeper sees a diagnostic.
- No player-visible behavior changes for an honest player, an NPC, a timed
  step or a sweep.
- No body runs a command because another body's code asked, unless the verb
  is compellable with consent and its own player said yes at the moment.
- Speech, conferral, membership, and giving title or money away are never
  compellable as commands.
- A wizard's `eval` can act only as the wizard.
- The blood bank refuses an issue with no issuer.
- The count of protective gates that do not check the actor is published
  and is zero.

## Cross-references

- [call-security-pass-slate](../slates/tech-debt/call-security-pass-slate.md)
  (§ The actor claim; the rest of the pass)
- [call-security.md](../subsystems/call-security.md) (§ The method asks who,
  § Does the subject bound the spoof)
- [response-envelope.md](../subsystems/response-envelope.md),
  [diagnostics.md](../subsystems/diagnostics.md) (the failure model)
- [npc-dialogue.md](../subsystems/npc-dialogue.md) (dialogue `dispatch`),
  [behavior.md](../subsystems/behavior.md) (brains)
- agency-slate, wizard-duty-slate, carrying-a-person-slate, spellbook-slate
  § 8 (the non-goals' destinations)
