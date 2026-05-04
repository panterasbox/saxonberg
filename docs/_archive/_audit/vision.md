# Audit: Saxonberg.md (product vision)

**Verdict: light rewrite of two sections only.** Body of the doc (vision,
UX, gamification, narrative, AI, content strategy) is fine as-is. Only the
**Technology Stack & Architecture** section and the **High-Level Roadmap &
Milestones** Phase 1 deliverables need correction.

## 1. Tech stack accuracy — Mostly accurate, a few items to flag

Verified against root `package.json`, `packages/server/package.json`,
`packages/client/package.json`, and `packages/server/src/`:

| Claim in doc | Reality | Verdict |
|---|---|---|
| Node.js + TypeScript, pnpm monorepo | confirmed | OK |
| Express server | `express ^4.19.0` present | OK |
| React (client) | `react ^18.3.0` | OK |
| `ws` for WebSockets | `ws ^8.16.0` | OK |
| Zustand state mgmt | `zustand ^4.5.0` | OK |
| CSS-in-JS "(e.g., Styled Components/Emotion)" | `styled-components ^6.1.0` (no Emotion) | OK but could pin to "styled-components" since that's the actual choice |
| MongoDB | `mongodb ^6.3.0` | OK |
| Google OAuth2 | `passport-google-oauth20` present | OK |
| **`isolated-vm` sandbox — "the entire game state and logic run within"** | **NOT a dependency anywhere; zero code references** | **Aspirational, currently described as built** |
| **Call Security Framework (proxy/decorator-based, intercepts calls)** | A `mud/lib/security/` folder exists and `api/security.ts`, `api/proxy.ts`, `api/shadow.ts` are present, so scaffolding is real — and per the user, this IS built | **Note: this is built; the "intercepts calls" claim is real** |
| Decorator-based persistence ("using decorators to define persistable properties") | Persistence is via `Hydrator` reflecting into mixin-contributed `persistentFields` sets, not decorators | **Wrong mechanism described** |

## 2. Roadmap accuracy — Doc's phases don't line up with code's phases

The doc defines its OWN 4 phases (Foundation / MVP / Enrichment /
Extensibility), which do NOT correspond 1:1 to CLAUDE.md's Phases 0–7.
That's fine as a product-side roadmap, but specific deliverable claims
drift:

- **Doc Phase 1** lists `isolated-vm sandbox` as a Phase-1 deliverable —
  not done.
- **Doc Phase 1** lists "core command parser and messaging protocol
  (including basic markup)" — actually delivered in CLAUDE.md's Phases
  3–4 (CommandLineApi/CommandApi, MML). Fine in spirit.
- **Doc Phase 1** lists "basic player/avatar creation, login, movement,
  and interaction within a test environment" — movement landed in Phase 3
  + Phase 7 (Exits, Doors, Zones, `go`/`open`/`close`). Doc's Phase 1
  understates what's actually built.
- **Doc Phase 2 (MVP)** items (Guilds, skills, NPCs, quests,
  attributes/leveling, inventory/equipment, dorms) — none of this exists.
  Inventory primitives (`get`/`drop`) exist via ContainerMixin, but no
  Guilds, skills, attributes, leveling, NPCs, quests, or dorms.
- **Doc Phases 3–4** are entirely forward-looking, which matches reality.

Net: the doc's Phase 1 is roughly delivered (with `isolated-vm` missing);
Phase 2+ is unstarted as far as gameplay-mechanics deliverables go.

## 3. Aspirational content — keep, just flag

These are vision claims not to validate against code: AI NPCs (faculty/
staff/students), LLM dialogue articulation, generative quest/curriculum
gen, dynamic weather/world models, learning-platform integration (REST),
CMS for users, modding framework, content packaging, governance tools,
dorm customization, party system, emote system, multi-channel chat beyond
basics, Academic Guilds/Houses/Organizations, attribute & leveling system,
equipment, NLP command layer, Zsh-style completion/scripting. All clearly
future-tense in the doc — fine as aspirational vision.

## 4. Section-by-section edits needed

**"Technology Stack & Architecture" → "Key Architectural Pillars" bullets:**

- **`isolated-vm` bullet**: rewrite from present-tense ("the entire game
  state and logic run within") to future-tense ("planned: …") OR drop. It
  is not in `package.json` and has no code references.
- **"Call Security Framework" bullet**: this is built; current language is
  fine but verify wording matches reality.
- **Persistence Layer bullet**: replace "using decorators to define
  persistable properties" with something accurate, e.g., "mixins contribute
  persistent field sets that a Hydrator reflects into during template
  instantiation."
- **CSS-in-JS bullet**: drop the Emotion alternative; pin to
  styled-components (the actual dep).

**"High-Level Roadmap & Milestones" → Phase 1 deliverables:**

- Drop `isolated-vm` from Phase 1 (move to a later phase as a planned
  hardening item).
- Optionally note that command framework, location/exit/door system, and
  basic locomotion (CLAUDE.md Phases 3, 4, 7) are also part of the
  realized foundation — the doc's Phase 1 understates the current state.

**Phase 2/3/4 of the doc**: leave as written — they're forward-looking and
matching nothing in code is expected.

## 5. Relevant files

- `Saxonberg.md` (audit target — not modified)
- `package.json`, `packages/server/package.json`, `packages/client/package.json`
- `packages/server/src/mud/` (subsystem layout cross-check)
- `CLAUDE.md` (implementation status reference)
