# Privacy slate — the surveillance risk, answered; the four secrets; masquerade; scrying

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner. It answers the
> risk [measurement.md](../../measurement.md) names and leaves open — *"⚠ **Surveillance**,
> the second risk in `standard-model.md`'s honest edge … it deserves its own peer doc."*
> Two planes: **real people** (plane 1) and **the fiction** (plane 2). The detection side
> — suspicion, clues, the detective — is the
> [deception-and-detection slate](./deception-and-detection-slate.md).
> **Left:** the privacy surface and its flagging lint · spoiler privilege earned by
> publication · the install-and-eval trail · the operator residual · the four quadrants
> (hiding, anonymity, disguise, privacy) · ⭐ PII (§ 5a) · ⭐ anonymity as the default and
> disclosure per property, attested against said (§ 8a) · noise masking, tamper-evidence ·
> masquerade's
> mechanics (belief v2: the persona as a referent, remembered features, the deterministic
> check) · scrying under the general pattern · the dials
> **Size:** a build (plane 1 is small kernel work; plane 2 is belief v2 and its readers)

# Plane 1 — real people

## 1. ⭐⭐ The honest premise **[DECIDED — the owner]**

*"Any wizard can write a shadow that snoops on someone's entire session and place it on a
player unbeknown to them. There's not much getting around that so enforcement needs to be
manual."* A shadow can intercept any method on any avatar ([call-security.md](../../subsystems/call-security.md));
a code-trusted wizard can run anything. **Prevention is impossible; the platform makes
snooping detectable, attributable and costly.**

## 2. ⭐⭐ The privacy surface — the kernel's, never the author's **[DECIDED]**

- **The kernel marks a closed set of methods as the privacy surface** — those that carry a
  person's private content: receiving a tell or DM, a channel message to a member, the
  player's command input, their record and frame store
  ([record-layer.md](../../subsystems/record-layer.md)). Kernel-owned and kernel-listed,
  like `@hook`.
- **Any shadow class that intercepts a privacy-surface method is flagged automatically** —
  derived from its method set (*"shadows know what methods they shadow"* — the owner),
  never from its tags. A lint lists every such class (census-then-ratchet,
  [lint-family.md](../../lint-family.md)); each needs explicit review sign-off to merge.
- Not every flagged shadow is bad — a deafness curse legitimately intercepts what you hear.
  Every one is *looked at*.

## 3. ⭐⭐⭐ Spoiler privilege is earned by publication **[DECIDED]**

The owner: *"maybe the shadow just sets a spoiler tag but the malicious wizard just uses
that to hide themselves still."* So the tag alone earns nothing:

- **A shadow from a published shadow kind** — a class committed to the codebase, public
  under the AGPL, reviewed if it touches the privacy surface — **may honor a spoiler tag**:
  the curse stays a mystery in play, and any abuse sits in public code.
- **A shadow not from a published kind** — installed by a runtime eval, from uncommitted
  code — **is always disclosed to the person it is attached to**: that it exists, who
  installed it, when, and which privacy-surface methods it touches. The engine knows the
  shadow stack (engine state), so this needs nobody's honesty.
- **Both routes expose a snoop** — commit it (public, flagged, reviewed) or install it
  unpublished (the victim is told, the install logged). Rewriting the kernel's disclosure
  is itself public code.
- ⭐ **The AGPL is a structural privacy check** — code running on a public server is
  published; the in-runtime VCS ([git-workflow.md](../../subsystems/git-workflow.md))
  snapshots and pushes it. The gap it leaves is runtime evals, closed by § 4.

## 4. The trail and manual enforcement **[DECIDED]**

- **Every eval and every shadow install is logged** to an append-only record, attributed
  (A2; the card-sizes slate's *"a mod with no attributable author should not exist"*;
  [shell-author.md](../../subsystems/shell-author.md)'s eval).
- **The guarantee** — your private communications and session are not read or recorded by
  anyone not party to them, without consent. **Criterion:** reading or recording another's
  private content without consent. **Evidence:** the logs and the public code. **Appeal:**
  the Compact's process. **Sanction:** revoking wizard trust (archwizards confer it), and
  exclusion. ⚠ **Never costumed in the fiction** (the prison slate's rule).

## 5. ⚠ The operator residual **[DECIDED]**

Whoever runs the server has the database; no code-level rule reaches a direct read. That
trust is the operator's — what the [distribution slate](./distribution-and-hosting-slate.md)'s
managed hosting sells, under a published privacy policy (data kept, how long, who reads
it). Players' freedom to leave for another host is what keeps an operator honest.

## 5a. ⭐⭐⭐ PII — the human, not the character **[DECIDED 2026-10-20]**

The owner: *"you need to also think of another type of anonymity which is any and all PII
we keep, which is separate from the information we generate ourselves."* What the
**platform** holds that identifies the **human** — the Google account (email, name, photo),
IP addresses and session logs, linked streaming accounts (Twitch, YouTube, Kick),
donations and anything payment-adjacent — as distinct from everything the game generates.

1. ⭐ **No path from the fiction to PII, ever** — no command, instrument or shadow on an
   avatar reaches it. **PII stores join the privacy surface** (§ 2), so code touching them is
   flagged and reviewed — the evidence firewall's twin: *the game knows your character,
   never your person.*
2. **Minimization** — keep only what running the account needs.
3. ⭐ **You can see what is held about you, and export it** — B3 (*any measurement of you is
   one you can read*) extended to identifying data.
4. **Deletion separates the two kinds** — deleting an account removes the **PII**; what you
   made in the game (deeds, authored content, credited work) is game-generated, and its fate
   is a separate decision — pseudonymized, kept under the estate rules, or removed — because
   *players are the game's developers* and their content is shared work.
5. **Linking is disclosure** — a streamer who links a platform identity chooses to connect
   person and character: opt-in, per platform, revocable.
6. **The operator's published policy** governs it all (§ 5).

# Plane 2 — the fiction

## 6. ⭐⭐⭐ Four different secrets **[DECIDED — lens 1]**

| what you keep from others | name | in our models | ships? |
|---|---|---|---|
| that you are here | **hiding** | [concealment](../../subsystems/concealment.md) and [stealth](../../subsystems/stealth.md) | ✅ |
| who you are, while seen | **anonymity** | [presentation](../../subsystems/presentation.md)'s `handle` — *"a declared stance about a message"* | ✅ |
| who you are, falsely | **disguise, masquerade** | [belief](../../subsystems/belief.md)'s disguise — *"a visual fact, defeated by perception"* | ✅ v1 |
| what you are doing or saying | **privacy** | perception's occlusion, `whisper`'s redaction, the private channel | ⚠ partly |

**Hiding is not lying; disguise is deception; anonymity is a protection; privacy is a
right** — and they combine (a masked figure whispering in a crowded tavern is disguised
and private; a spy behind the arras is hidden, watching someone else's privacy).

## 7. ⭐⭐ Privacy in a place **[DECIDED]**

- **Walls, doors and distance** — a closed door muffles sound and blocks sight (shipped
  propagation); screens and curtains block sight, not sound.
- ⭐ **Noise masks** — a crowded tavern gives a conversation privacy because it is loud,
  derived from the ambient sound level; the library is the worst place for a secret.
- **The channel** — `say` (the room), `whisper` (ships: the act visible, the content
  redacted), `tell` (private at any distance), **the sealed letter**.
- **Darkness** hides sight, not sound.
- ⭐ **Privacy reveals violation rather than preventing it** — **the broken seal** (the
  signet's wax, [gems](./gems-and-precious-metals-slate.md) § 5) shows a letter was opened;
  the creaking floorboard; **hearing works both ways** — what lets you overhear lets you be
  overheard.
- **Norms** — a polity decides what is indecent; sanitation's *"at the limit you go where
  you are"* is **a social cost if you are seen**, never a humiliating message
  ([sanitation-and-pollution](./sanitation-and-pollution-slate.md)).

**Narrative uses** — the secret meeting, the private negotiation, the confession, the
affair, the surprise; ⭐ the eavesdropper behind the arras; ⭐ **blackmail and gossip** (a
secret is leverage; information spreads by witness); the masquerade ball (the
[festival](./festival-slate.md)'s event-scoped anonymity); the diary and the sealed letter;
the informer.

**Governance** — ⭐ **the warrant** (privacy is what makes it meaningful); mail tampering;
peeping; **in camera** sessions; ⭐ sanctuary ([diplomacy](./diplomacy-slate.md)'s
inviolable embassy is privacy at a polity's scale). **A15 holds** — only what someone
perceived is evidence.

**Continuity** — the closed door, the whisper, the seal are the same acts; the envelope,
encryption (the aether's tell), then **the recording** — the camera epoch tips the balance,
because perception gains a memory. **Economy** — the private room's premium (the inn's
parlor), discretion as a service (the discreet servant, the lawyer's privilege, the
confessional's seal), the secret's price, the locksmith and the screen-maker.

## 8. ⭐⭐⭐ Masquerade — the mechanics (belief v2) **[DECIDED]**

The owner's split: *"masking as someone else so how close you get to them is the fidelity
measure, or masking just as a character of your own design … it's extras vs cast."*

| | **impersonation** | **persona** |
|---|---|---|
| claiming to be | a specific real person (a **Cast** member, or a player) | nobody real — judged like an **Extra**, a believable role |
| measured against | the target — fidelity | the setting — consistency |
| fails when | someone who knows the target compares you with their memory | you contradict yourself or the setting |
| the craft | study, mimicry | improvisation, cover |

Both rest on **the physical disguise** (costume, makeup, voice) — different Disciplines on
a shared foundation. What ships ([belief.md](../../subsystems/belief.md)): per-viewer
`knownAs` (*"faking/nicknames are planned"*), `introduce`, the targeting gate that refuses a
name you never learned, and the v1 disguise (`masksIdentity`; *"per-channel partial
recognition is v2"*). This is **belief v2**:

1. ⭐⭐ **The persona as a referent** — the card-sizes slate's warning: *keyed on the truth,
   two disguised appearances of one person would touch the same card, which leaks that they
   are one.* A persona is **its own referent** in others' memories — "Tom the tinker" and
   "Bob" are two people to a witness until **unmasking merges** them. A persona is worn —
   name, outfit, claimed facts — like the wardrobe's `equip set`; **while it is on,
   `introduce` and auto-introduce use its name.**
2. ⭐⭐ **What a witness remembers** — beyond a name: species, stature, build (the
   [size slate](./size-slate.md)'s envelope), face if seen, ⭐ **voice** (a gap — voice
   identity is not modeled, and voice is how people see through hoods), and **familiarity**
   (how often and how recently).
3. ⭐⭐⭐ **The check — deterministic, never rolled** — **mismatch** (what you present against
   what they remember) against **discernment** (familiarity × conditions — light, distance —
   × awareness competence). Mismatch wins: busted. Short of it, the nearer it comes, the more
   **suspicion** — shown, never numbered (the detection slate).
4. ⭐ **Exposure is a social act** — expose (belief corrects by witness) or keep quiet
   (blackmail).
5. ⭐⭐⭐ **Regard, not renown** — deeds stay the true actor's on the record (A7); opinions
   attach to whoever they believe you are, so **an impostor harms the real person's regard,
   never their renown.**

**Threat models** — impersonation's is people who know the target, and ⭐ **the aether
gives you away** (a `tell` comes from your true identity — impersonation is a face-to-face
craft). The persona's is **inconsistency** — competence, knowledge, dress and station; it is
safest as a role, riskiest as a named person with a history. **Governance** — a false name is
not a crime, fraud is; impersonating an officer; ⭐ **papers** (the registry, printing, the
seal) made identity checkable, and forging them is a trade.

## 8a. ⭐⭐⭐ Anonymity — the default, and disclosure as an act **[DECIDED 2026-10-20]**

### Anonymity is the default, guaranteed by physics — not a permission

The owner: *"a certain amount of anonymity is guaranteed just by the physics and the engine —
not everything is queryable whenever you want; there's specific commands that query specific
props and report them conditionally. Most of the state on your body is anonymous, even to
the player themselves."* In the fiction **anonymity is the absence of a channel**, never
access control: `look` shows the outermost layer, `assess` reads condition at a medic's
competence, instruments report bands — and nothing reads what nothing reads. Hiding,
disguise and privacy modulate channels that exist; anonymity is mostly the channels that do
not.

### ⭐⭐⭐ Disclosure is the player's act, one property at a time

The owner: *"it's the 'introduce' system just generalized to more than names. In the modern
age everyone can broadcast whatever they want about themselves so each property they reveal
is its own decision vector."*

- **`introduce` already discloses one property** — your name. Generalized: your trade, your
  guild, your faith (already *declared*, in the [faith slate](./faith-slate.md)), your home,
  your competence in a Discipline, your standing, your status line — **each its own
  decision**.
- ⭐ **`score` is the source** — slated as *self only*; it stays private by default, and **you
  choose which sections others may see, and who** (a named person, a group, everyone):
  [measurement.md](../../measurement.md)'s middle layer, *the subject decides*.
- **The modern broadcast** — a public profile on the aether, each property a toggle, the
  default private.
- ⭐⭐ **Attested against said** — anything you type is **said**, a claim that may be false; a
  shared `score` section shows **the engine's real number** — **attested**, a proof. You can
  show a guild your brewing band and it cannot be faked — the hallmark's, the proof house's
  and the [diplomacy slate](./diplomacy-slate.md)'s signed records' pattern: **a verifiable
  credential, disclosed selectively** — perhaps *"competent or better"* without the exact band.
- **Once seen, known** — you may stop sharing, but what someone saw stays in their memory
  ([belief](../../subsystems/belief.md)). Disclosure is easy to give and impossible to take
  back.

### The declared and the structural forms

- **Chat anonymity** (ships, [chat.md](../../subsystems/chat.md)) — a channel's owner permits
  or forbids it; an anonymous post carries a handle.
- **Pseudonymity** — the persona worn openly (*Publius*, Elena Ferrante): regard attaches to the
  pseudonym's referent (§ 8). ⭐ **Renown must not leak the link** — the record keeps the true
  actor (A7), but if *public* renown rose on the true person, timing would unmask the pen name.
  So a pseudonym's public renown shows on the pseudonym; only the person's own `score` shows
  both.
- ⭐ **Cash against the ledger — anonymity by physics.** A coin is a fungible, physical stack;
  a hand-to-hand handover *"changes location, not total supply"*
  ([banking.md](../../subsystems/banking.md)) and **a coin does not say who spent it** — at the
  price of mass and theft. The ledger is weightless and safe and **names both sides**. Bribes,
  the black market and the anonymous gift move in cash. ⚠ **Open (lens 7):** who may read the
  ledger — you and the bank today; an auditor or a court's subpoena would be **financial
  privacy** as a polity's choice (bank secrecy at the extreme).
- ⭐⭐ **The secret ballot** (the ballot is deferred, [influence.md](../../subsystems/influence.md))
  — **citizens' votes secret, representatives' votes public** (the voter protected, the
  legislator's roll call accountable). Secrecy stops vote-buying and intimidation because a
  bought vote cannot be verified (Victoria, 1856). ⚠ A voter can screenshot their own ballot
  and prove it — so ⭐ **re-voting until the close, the last vote counting** (as Estonia's
  e-voting does): a buyer cannot verify a vote you may change. **Receipt-freeness**, taught.
- **The anonymous tip** — protects the tipster (policing) and the press's source; ⭐ **an
  anonymous claim is a lead, never proof** — nobody stands behind it, so it can open an
  investigation and convict no one uncorroborated (A15; the court judges evidence presented).
- **The anonymous gift** — the ledger names both parties, so it travels by cash or through an
  intermediary's discretion (a bank or charity that knows and will not say).

**Lenses 4 and 7** — anonymity protects the whistleblower, the dissenter and the voter, and
shields the harasser and the fraudster; the world shows both and ranks neither. Who may be
anonymous where is each forum's call (chat's per-channel setting) and a polity's for its own
institutions.

## 9. ⭐⭐ Scrying — and the general pattern for acts aimed at a real player **[DECIDED]**

What exists: `scry`, gated by the instrument (`ScryableMixin.canScryFor`,
[perceiver.md](../../subsystems/perceiver.md)); ⭐ [arcane-science.md](../../arcane-science.md)'s
*"scrying is detectable: a probe is a signal"*, with the probe detector's base-rate lesson
(tuned to catch nearly everything, 94 % of alarms are false); wards.

**The pattern** — for scrying, impersonation, and every future act aimed at a real player
(tracking, a curse, a spy network):

1. ⭐⭐ **The hard line is plane 1's privacy surface, and the fiction never crosses it.**
   Scrying is remote *vision* — what is perceivable at the target's place — never their
   tells, DMs or session; impersonation fools perception, never the aether.
2. **Inside the fiction — cost, a link, detection, counter, law.** Cost (mana, the price
   list); ⭐ **a link** — you can scry only **someone you know** (the target resolves through
   your own memory — the same rule that bounds impersonation), or through sympathy (a
   possession, a lock of hair); detection (the probe); the counter (**wards** — privacy you
   can buy); law (a polity may outlaw private scrying, require a **warrant** for official
   scrying — and ⭐ scried perception *is* perception, so A15 admits it as evidence, which
   raises a real choice: does a court **exclude what an unwarranted scry saw?**).
3. ⭐ **Dials for real-player targets, tuned later** — a meta notice to the target, consent
   opt-ins for players who want the spy game; each a setting the operator or the polity
   owns.

## 10. The lens pass

1. **Pedagogy** — the four secrets; noise masking; tamper-evidence; recognition by face
   and voice; the base rate.
2. **Expression** — personas, masquerades, sealed letters, warded rooms as authored and
   player-made content.
3. **Immersion** — the whisper in the tavern, the seal, the probe that prickles.
   **Participation** — the spy, the informer, the blackmailer, the forger, the warder.
4. **Values** — privacy against transparency; the right to a secret against the right to
   know; masquerade as freedom against impersonation as fraud.
5. **Continuity** — seal → envelope → encryption → recording; costume → papers → biometrics.
6. **Economy** — the private room, discretion, wards, the forger's trade.
7. **Governance** — plane 1's guarantee and its trail; the warrant; mail tampering; in
   camera; excluded evidence.

## 11. Open

1. **The privacy-surface list** — which methods, kernel-maintained.
2. **Persona referents** — how a worn persona keys witnesses' memories, and merging.
3. **Voice identity** — the gap the check most needs.
4. **The dials** — defaults, and who owns each (operator or polity).
5. **Wards** — a place property, a worn thing, or both.
