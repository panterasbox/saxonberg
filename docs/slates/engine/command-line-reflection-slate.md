# Command-line reflection — the shell answers questions about itself

> **Status: UNBUILT** — opened 2026-11-23 (owner, in naming-overhaul
> review, over the `lists: relations` view key: *"this is the command
> line interface interrogating itself on the player's behalf"*).
> **Left:** all of it — the four models, the verbs that present them
> (words unchosen), the card, and what retires.
> **Size:** a conversation, then a build.

## Why this exists

A player meets the game through a command line, and nothing in it answers
questions about itself. Which verbs do I have right now? Why that one —
because of my body, the rod in my hand, this room? What does this verb
take? What can I say to this thing? Why did `buy loaves` pick that loaf?
The engine knows every answer — it works most of them out on every
command — and shows a player none of them. Any OS shell has this layer
(`type`, `which`, `compgen`, `--help`, a dry run); ours has it only for
authors (`ls`, `cat`, `errors`, `typecheck`).

## What this is — and is not (owner, 2026-11-23)

- ⛔ **Not help.** `help` is documentation — sometimes derived, basically
  static. This is **interrogating the engine to see what it does**: closer
  to `analyze` and `measure`, an instrument reading the machine, than to a
  rulebook.
- ⛔ **Not typeahead.** Typeahead is implicit and client-side; this must
  work **deliberately**. Every answer is a **server model** first, a
  player asks for it with a command, and a card shows it. Typeahead is a
  later consumer that READS those models (pushed over the subscription
  wire, so the client holds "your commands right now" and never runs a
  command per keystroke) — a different thing, built on this one.
- **Think like a person at the line.** The first question is *what verbs
  do I have* — what typeahead answers implicitly — and everything else
  is a refinement of the answer: this verb's shape, what goes in this
  slot, what this thing offers.
- **The model is the author commands'**, turned to the player's side: the
  author tools inspect the content tree; these inspect the command line.

## The four questions, each a model

1. **What can I do right now, and why?** Every verb available to the
   asker at this moment, each with its SOURCE — your own body, a thing
   you hold or wear, a peer, the room, a fixture here. The source is
   already recorded per binding (`RecencyEntry.source`, command-routing
   § *Affordance attribution — source, not category*); a verb disabled
   here says the validator's verbatim reason, as the radial already does.
2. **How do I use this verb?** Its shape, derived from the view: its
   subcommands, its slots in order, what each slot accepts (`requires:`,
   a duration's `min`/`granularity`, an enum's values), where each slot
   searches and in what order (`scope:`), its options. Derived from the
   definition, never hand-written — so it cannot drift from what the
   binder does.
3. **What does this thing offer me?** For any object you can name: the
   verbs it affords (`thing::verb`, naming-overhaul B0), the sets it
   keeps with their meanings (`thing:~name`, B1 — `RelatingMixin`), and
   the names it answers to (its keywords). Asked of yourself it lists your
   relations — the built-ins that apply (`~here`, `~contacts`, …), your
   lists, your groups, your party.
4. **What would this line do?** A dry run: bind the line without acting
   and report each slot — what it bound, at which keyword tier, through
   which relation (`via.relation`), whether it took its default
   (`defaulted`), or the refusal it would give (`BindErr.refusal`, the
   reason row's words). The binder's own trace made visible; the only
   honest answer to *why did it pick that one*.

## Rules every answer obeys

- **Perception.** No answer names what the asker cannot perceive — a
  hidden thing does not appear in a slot's candidates, a concealed
  fixture's verbs do not appear in question 1. Otherwise the shell is a
  detector (concealment.md; the binder's `PerceptionApi.perceived` gate).
- **Honest by construction.** Each model reads the real definitions and
  the real binder, never a description of them; an answer that could
  disagree with what the command then does is a defect.
- **Non-diegetic, bounded.** The shell layer (like the `client-*`
  verbs): it reports what you can do and why, never a fact you could
  not otherwise learn — no paths behind the spoiler rule
  (*paths are spoilers*), no other player's private relations.

## What already exists

| piece | where | what it does not do |
|---|---|---|
| per-object verb menu + disabled reasons | `CommandApi.resolveAffordances` → `AffordanceEntry` (the radial) | answers one object; nothing lists *all* your verbs, or their sources, as a command |
| source per binding | `RecencyEntry.source` | never shown to a player |
| relation listing | `query thing:~` behind the view key `lists: relations` (naming-overhaul D-B4); the `names-relations` refusal elsewhere | a listing is not runtime Stuff — MQL should not return it (*MQL finds runtime Stuff only*) |
| binder trace pieces | `MqlMany.tiers`, `via.relation`, `MqlOneResult.defaulted`, `BindErr.refusal` | consumed internally; no dry run |
| typeahead | the phone's suggestion strip (`CommandBar` `suggest`), `HelpCatalogue.typeaheadMatch` | help topics only, client-side |
| the push wire | subscription sources (subscription.md) | no "your commands" source |
| a channel-shaped verb | `analyze` / `measure` over `Reading` rows (instrumentation.md) | the precedent for one verb over several channels |

## What retires

- The **`lists: relations`** view key, the `relations` field on a bound
  set, and the **`names-relations`** reason row — question 3 answers
  `thing:~`, and MQL returns only Stuff. `thing:~` then becomes a parse
  error whose hint names the reflection command.
- `query me:~` (naming-overhaul's requirements step 10) moves to question
  3's command. ⚠ Not before question 3 ships: retiring the key first
  leaves players no way to discover their relations.

## Open questions

- **The words.** One verb over four channels (the `analyze` shape) or
  four verbs? Which words — the owner vets every new command word and
  MQL reserved word. Under *verb subcommand target*, never nested.
- **The card.** One card laid out by question, or the inspection card
  growing a section? How it links: a verb in question 1 opens question 2;
  a slot in question 2 shows its candidates; a candidate opens question 3.
- **The dry run's spelling** — a prefix verb taking a whole line, an
  option on every verb, or something else? It must never act, and must
  run every gate the real command runs before acting (validators
  included), so its refusals are the real ones.
- **Scripts.** Should a script be able to ask (*does `fish` exist here*)
  and branch on it — the shell's `type -t`?
- **Cost.** Question 1 for a person in a crowded room walks every source's
  contributions; is it computed on ask, or kept as the subscription
  source's state (memory-or-mongo-slate's question, again)?
- **Typeahead's contract** — which models it reads, and how it stays
  current, is the follow-on build's; this slate only promises the models
  are shaped for it.

## Lens pass (first cut)

- **1 pedagogy** — a shell that explains itself is the syllabus of the
  interface: the player learns *why* a verb is there (the rod gives you
  `fish`), which is the world's causality made legible.
- **2 creative expression** — an author's new verb, relation or holder
  is discoverable with no extra authoring: the models read the views
  and the protocols.
- **3a immersion** — the shell layer is non-diegetic by design; the rule
  that it never reveals the unperceivable is what keeps it from
  betraying the fiction.
- **5 continuity** — the answers follow the objects, so a new epoch's
  tool is discoverable the day it ships.
- **4 · 6 · 7** — nothing found yet.

## Cross-references

- [command-routing.md](../../subsystems/command-routing.md) — affordances, attribution, resolution
- [mql.md](../../subsystems/mql.md) — relations, `via`, tiers
- [instrumentation.md](../../subsystems/instrumentation.md) — the `analyze`/`measure` channel shape
- [subscription.md](../../subsystems/subscription.md) — the push wire typeahead would read
- [shell-workspace.md](../../subsystems/shell-workspace.md) · [shell-author.md](../../subsystems/shell-author.md) — the author tools this mirrors
- [memory-or-mongo-slate](../tech-debt/memory-or-mongo-slate.md) — computed vs kept
- Memory: *MQL finds runtime Stuff only*; *the command def predicts everything*; *paths are spoilers*
