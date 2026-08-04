# StudyAI — what it is, what to reuse, and why its numbers are the pitch

> **Status: verified findings + pitch framing.** StudyAI facts were read
> on 2026-08-03 from Study.com's real source (`prediction-services`,
> `sites-study-com`), the `Bot_Prompt` table, and the product docs in
> Notion. This doc captures (a) what StudyAI actually is, (b) what's
> leverageable for Saxonberg's classroom, and (c) **the pitch argument its
> own usage numbers hand us** — the last is what this doc exists to make
> sure we don't lose before the Study-facing deck gets built.
>
> **Confidentiality:** the figures and internal-state notes below are
> **Study's internal data**. They're fair to show **Study** in a
> Study-facing pitch (it's their own data, reflected back), but keep them
> out of any **public** marketing or external artifact.

---

## 1. What StudyAI actually is

The **"Student AI Assistant"** (CX + Test Prep), built by the
Conversational AI team ("Alpacas"); a teacher **Lesson-Plan Generator** is
a sibling.

- **Brain:** a **topic-aware, function-calling agent in
  `prediction-services`** (`…agent.invokable_agents.study_assistant`) — a
  routing step picks a specialist "topic," which exposes a set of
  function-calling **tools** gated by page (`isAllowedOnPage`). Fronted by
  a `sites-study-com` chat controller
  (`StudentAssistantChatConversationController`); conversations persist in
  `raptor` (`Bot_Conversation_Message`, `Async_ChatGPT_Result`).
- **Model:** pluggable — **OpenAI + Gemini** confirmed; no Claude path.
- **Prompts are data:** specialist prompts live in the **`Bot_Prompt`**
  table (versioned, `${var}`-templated, CRUD-served, 24h-cached) — editable
  rows, not code.
- **RAG is real but shallow:** vector search via **Milvus** hosted in a
  separate Search Service (prediction-services is a REST client). **Only
  lesson *titles/descriptions* and *skill nodes/practice sets* are
  embedded — not transcripts, questions, or taxonomy.** In the chat path,
  hits are usually returned as **HTML link lists**, not re-injected as
  prompt context; the one genuinely grounded prompt is the **credit-
  eligible course catalog** block.

## 2. The gold: StudyAI is already a command-bus agent

The reusable asset isn't the chat — it's a **function-calling tool layer
with real backend side-effects** over Study's own systems. It is exactly
the "acts, doesn't just speak" pattern from
[study-com-classroom-model.md](./study-com-classroom-model.md) §7.8:

| Tool (by segment) | Effect |
|---|---|
| **CX:** enroll in course · schedule study time · set long-term goal · SMS opt-out | enroll (real); writes member profile / transfer-school / major / bio |
| **TP:** enroll · **create `StudyPlan`** · set goal (test name/date) · get priority/next lesson | enroll + StudyPlan writes (real); lesson lookup (RAG-backed) |
| **Teacher:** **create classroom** · generate lesson plan · search lessons/practice · recommend next lesson · assign lesson · navigate | create classroom (real); lesson-plan generate (RAG); recommend (+ analytics); search/navigate (links) |

They have already built and tuned a **validated LLM-driven action surface
over Study's systems** — and its writes land in the *same* tables our
integration reads/writes (Member profile, `Study_Plan`, enrollment).

## 3. Leverage readout (what to reuse, honestly)

1. **Reuse the tool layer as commands.** Their functions are our verbs:
   `enroll`→enrollment-contract, `create StudyPlan`→our pacing model,
   `recommend next lesson`→the weakness-first queue, `set goal`→the
   countdown, `create classroom`→the cohort. We trigger *their* write paths
   from a world instead of inventing new ones.
2. **Service-shaped, so plausibly callable.** The brain is a Remilon
   `prediction-service` agent (not UI-bound logic); the site chat
   controller calls into it. Our classroom could call the same
   assistant/tools. *(Exact external RPC endpoint is a `[confirm]`.)*
3. **Prompts are portable data** (`Bot_Prompt`) — the tutoring / goal /
   answer-explanation prompts are readable, reusable rows.
4. **Model-agnostic** (OpenAI+Gemini pluggable) — slotting a different
   model is precedented.
5. **We extend the grounding, not inherit it.** Their RAG is titles +
   skill-nodes and mostly emits links; the transcript-grounded lecture
   agent we designed is net-new on our side.

## 4. Why the numbers are the pitch (the part not to lose)

StudyAI's own usage is the argument for Saxonberg. The figures
([Student AI Assistant Roadmap], [Conversational AI Segment Overview]):

- **94% of Test Prep and 74% of CX users only ever click the canned
  "pills"** — almost nobody free-types.
- **~1.5k users**; the team's own note: it **"currently isn't working as
  expected."**
- The core bug is **topic "stickiness"** — the router can't reliably tell
  what the user is trying to do.
- Their stated direction: pivot **toward "invisible AI" — focused,
  single-use features embedded in the activity** (tutoring sessions, answer
  explanations, recaps) and **away from the generalized chatbot.**

Read correctly, every one of those is a **container failure, not an AI
failure** — and the container is a web page:

| StudyAI symptom (on a page) | Why the page causes it | What a world does |
|---|---|---|
| 94% / 74% only use pills | you don't *converse* with a webpage; text isn't the medium there | in a text world conversation **is** the medium; free interaction is native |
| topic-routing "stickiness" | a page has no situational context, so a router must *guess* intent | the **room + the command** set the topic — location is intent |
| ~1.5k users, low engagement | a bolt-on chat panel competes with the content for attention | *doing* is the point; the agent is in the activity, not beside it |
| pivot to "invisible, focused, in-activity AI" | the generalized chatbot doesn't fit the surface | that pivot **is** the classroom — agents embedded in the lecture/lab |

**The pitch narrative, in one move:** *"You already built the
intelligence — a tuned, function-calling assistant over your own systems —
and you believe in it enough to staff a team. It's underperforming because
a website can't host it: nobody converses on a page (pills), it can't tell
what the user is doing (routing), and almost nobody uses it (1.5k). Put the
same tools in a world where doing is the point and context is ambient, and
pills become actions, routing becomes location, and engagement becomes the
game. Your own roadmap already points here — 'invisible AI, in the
activity' is a classroom. We're the container that makes StudyAI work."*

Three things this gives the deck:
- **The concept is pre-sold internally** — Study built and staffed it, so
  "AI-assisted learning" isn't a foreign idea and there are internal
  validators (the Alpacas team).
- **A concrete before/after** — their real numbers vs. what a world does to
  each failure mode (the table above). Numbers, not vibes.
- **Roadmap alignment** — we're the destination their own "invisible,
  focused, in-activity AI" pivot is walking toward, not a detour.

## 5. Honest caveats / open items

- StudyAI today is **lightly used and buggy** — we reuse *tuned
  components* (tools, prompts, the service pattern), not a polished product.
- **RAG is shallow** (no transcript grounding); the lecture-agent grounding
  is ours to build.
- `[confirm]` **the exact external-callability endpoint** for the
  prediction-service assistant (decides "call their agent" vs "reuse the
  tool definitions").
- `[confirm]` **no Claude path** today (OpenAI/Gemini) — irrelevant to
  leverage, noted for completeness.

---

*Feeds [study-com-strategy.md](./study-com-strategy.md) (the pitch/deal
doc) and plugs into [study-com-classroom-model.md](./study-com-classroom-model.md)
§7.8 (the command bus). Verified 2026-08-03; re-verify before it lands in a
deck.*
