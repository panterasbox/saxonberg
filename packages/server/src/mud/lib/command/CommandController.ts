/**
 * CommandController — abstract base class for command execution logic.
 *
 * The Controller in MVC: executes business logic with a fully-bound
 * CommandModel. Controllers are ephemeral (new instance per execution
 * via `StuffApi.clone`), so they can hold per-execution state safely.
 *
 * Pipeline: CommandView (YAML) → CommandModel (data) → Controller
 * (execution)
 *
 * Messaging is the controller's responsibility — fire all prose via
 * `MessageApi.scene(...)`. The outcome flows through the dispatch
 * context: `context.note(...)` for structured failure signals,
 * `context.setStatus(...)` for explicit status pinning. The
 * dispatcher assembles the dispatch-response envelope from the
 * context's accumulator state.
 *
 * Subclasses may narrow the model type by passing a more specific
 * `T extends CommandModel` parameter — e.g.
 * `class DropController extends CommandController<DropModel>`. The
 * dispatcher works with the default `CommandController` (== `T =
 * CommandModel`) and never sees the narrower type.
 */

import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../api/command';
import { Idea } from '../stuff/Idea';
import { MixinApi } from '../../api/mixin';
import { CombatApi } from '../../api/combat';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { PerceptionApi } from '../../api/perception';
import { MqlApi } from '../../api/mql';
import { StuffApi } from '../../api/stuff';
import type { Display } from '../display/Display';
import type { Stuff } from '../stuff/Stuff';
import type { CommandGiver } from '../command/CommandGiver';
import { SchedulerApi } from '../../api/scheduler';
import { GrammarApi } from '../../api/grammar';
import type { CarryRefusal } from '../slot/Carrying';
import type { ArrivalRefusal } from '../spatial/Container';
import { ManualBuildStep } from '../craft/ManualBuildStep';
import type { ActDone, ActPlan, AnyActRefusal } from '../craft/ActPlan';
import type { ActWords } from './EngagedActController';
import type { PartChoices, PartRefusal } from '../husbandry/Soil';
import { Refusal, type RefusalFacts } from '../errors';

type Composed = ReturnType<typeof Mml.compose>;

/** The topic an engaged plan narrates on — `EngagedActController`'s `ACT_TOPIC`. */
const PLAN_TOPIC = 'act.deed';

/**
 * Abstract base class for command controllers.
 *
 * Extends `Idea` so controllers are Stuff-shaped and cloneable from a
 * Template — `StuffApi.clone` instantiates one per command execution.
 * Reloaded class blueprints are picked up via `HotReloadApi`.
 */
export abstract class CommandController<
  T extends CommandModel = CommandModel,
> extends Idea {
  /**
   * Execute the command with a resolved CommandModel.
   *
   * Controllers should:
   *   1. Fire any prose via `MessageApi.scene(...)` or mixin sugar.
   *   2. On failure, emit a structured `context.note(...)` so the
   *      dispatch-response envelope carries the failure signal.
   *      Auto-escalation handles the status; controllers may call
   *      `context.setStatus(...)` explicitly when needed.
   *   3. Return — there is no return value. The outcome of the
   *      command is what the dispatcher sees on the context's
   *      accumulator at the end of execute().
   */
  abstract execute(
    model: T,
    context: CommandContext
  ): void | Promise<void>;

  /**
   * ⭐ The IMPLICIT screen — the one `actor` drives when the command did
   * not name one. A command that *does* name a screen resolves it through
   * the ordinary arg machinery (`watch … on <screen>`: `peers` scope,
   * `requires: DisplayMixin`); this is only the fallback, and it lives
   * here so the several verbs that show something on a screen share one
   * ladder instead of each inventing it.
   *
   * The ladder is ordered by REACH, and so is its cost:
   *
   *  1. **Held** — a screen in your hand is yours to drive whatever its
   *     pairing. The thief with the house tablet READS the sheet; the
   *     seat is what they lack, and the seat is checked where money
   *     moves, never here.
   *  2. **In reach and drivable** — a screen you share a room with whose
   *     `pairing` admits you.
   *  3. **Anywhere, by mind** — the modem is the driver's own attunement.
   *     ⚠ The ONE global read, gated on the attunement *before* it
   *     enumerates so an ordinary actor never pays for it, and expressed
   *     as an MQL system sweep rather than a bespoke world scan.
   *
   * `mode` says which: a driver by mind sees nothing of what they show.
   */
  protected async resolveScreen(
    actor: Stuff & CommandGiver,
  ): Promise<{ display: Stuff & Display; mode: 'hand' | 'mind' } | null> {
    // ⭐ A screen you do not perceive is not one you drive (D23).
    const reachable = PerceptionApi.perceived(
      actor,
      MqlApi.resolveMany('reachable:[mixin.DisplayMixin]', {
        commandGiver: actor,
        scope: 'reachable',
      }).stuff,
    ).filter((s): s is Stuff & Display => MixinApi.isDisplay(s));

    for (const d of reachable) {
      if (d.isCarriedBy(actor)) return { display: d, mode: 'hand' };
    }
    for (const d of reachable) {
      if (await d.mayDrive(actor)) return { display: d, mode: 'hand' };
    }
    if (MixinApi.isActive(actor, 'AetherMixin')) {
      const all = StuffApi.findByMixin('DisplayMixin').filter((s): s is Stuff & Display => MixinApi.isDisplay(s));
      for (const d of all) {
        if (d.getPairing() === 'open') continue;
        if (await d.mayDrive(actor)) return { display: d, mode: 'mind' };
      }
    }
    return null;
  }

  /**
   * **Ask for an object the player didn't name**, from a reachable
   * candidate set. Returns `null` when there is nobody to ask, nothing
   * to offer, or the player cancels — every one of which means "do not
   * proceed", so a caller can treat `null` as a quiet abort.
   *
   * ⚠ This is the answer to "the working needs a target and none was
   * given", and reaching past it is how `read` grew an `at` clause:
   * a preposition on a verb where aiming means nothing, invented
   * because the prompt substrate went unused. `zap wand at troll` is
   * fine — pointing a wand IS directional. `recite scroll at flask` was
   * not, and the difference is whether the ACT is aimed.
   */
  protected async promptForObject(
    context: CommandContext,
    label: string,
    candidates: Stuff[],
  ): Promise<Stuff | null> {
    if (candidates.length === 0) return null;
    // ⭐ Fail closed (D23): with nobody to ask, `needs-input` is noted
    // and the caller gets its quiet abort.
    const interactive = context.requireInteractive(`an object (${label})`);
    if (!interactive) return null;
    try {
      return await interactive.promptMqlObject(label, candidates);
    } catch {
      // Cancelled, timed out, or the host dropped — all "no target".
      return null;
    }
  }

  /**
   * ⭐⭐ **Engage a plan an object handed back** (`ActPlan` — `knead`,
   * `shape`, `carve`, `cut`, `dip`, `harvest`, a tap): the ONE
   * engage-a-plan routine, so every controller runs an act protocol the
   * same way. The object answered facts; `words` is this controller's
   * wording of them (controllers-are-io D4) — begin, a late refusal, and
   * the landing.
   *
   * ⭐ Hoisted here by controller-liquidity W4 (D8) from
   * `ManualBuildController` (and folded with `EngagedActController`'s plan
   * overload, the same routine twice): those two bases share no ancestor
   * below this one, so this is the only place both — and every controller
   * that is neither — can reach it.
   *
   *  - A zero-length plan runs NOW, inside the command frame: an act that
   *    is a craft resolved from the actor's reach (the chandler's candle)
   *    needs the acting author the engaged completion would lose; a
   *    refusal it returns declines the command. Await it: that frame is
   *    the promise.
   *  - Otherwise the body is checked for the work (`canExert`), and the
   *    step runs as an engaged activity on the giver's `hands` slot; a
   *    refusal its completion returns (the world changed under the step)
   *    is told to the actor when it lands.
   *
   * ⚠ The word functions run at COMPLETION, after the dispatcher has
   * destructed this controller — so they must not call its instance
   * methods (`lint:completion-this`); `protected static` words are the
   * pattern.
   */
  protected async engagePlan<B, F, X extends AnyActRefusal>(
    context: CommandContext,
    plan: ActPlan<B, F, X>,
    words: Omit<ActWords<B, F, X>, 'onRefused'> & Partial<Pick<ActWords<B, F, X>, 'onRefused'>>,
  ): Promise<void> {
    const giver = context.commandGiver;
    const turnDown = (prose: Composed, reason: string, detail = reason): void => {
      MessageApi.scene(giver).topic(PLAN_TOPIC).toSelf(prose).send();
      context.note({ kind: 'controller-rejected', reason, detail });
    };
    const say = async (out: ActDone<F, X>): Promise<void> => {
      if (giver.isDestroyed()) return;
      if (!out.ok) {
        // ⭐ No words of its own: the refusal's row words it, late — the
        // command's envelope went when the step began.
        if (!words.onRefused) {
          const refusal = new Refusal(out.reason, (out.facts ?? {}) as RefusalFacts);
          // On the context too, for a script awaiting the step to meet it.
          context.refuse(refusal);
          await CommandApi.reportFailure(refusal);
          return;
        }
        MessageApi.scene(giver).topic(PLAN_TOPIC).toSelf(words.onRefused(out)).send();
        return;
      }
      const done = words.onDone?.(out.facts) ?? null;
      if (done === null || (!done.self && !done.peers)) return;
      const scene = MessageApi.scene(giver).topic(PLAN_TOPIC);
      if (done.self) scene.toSelf(done.self);
      if (done.peers) scene.toPeers(done.peers);
      scene.send();
    };
    // The claim an object holds while its act runs (`ActPlan.onBegin`).
    const begin = plan.onBegin ?? ((): void => undefined);
    if (plan.durationMs <= 0) {
      begin();
      const out = await plan.onComplete();
      if (!out.ok) {
        if (words.onRefused) turnDown(words.onRefused(out), out.reason);
        else context.refuse(out);
        return;
      }
      await say(out);
      return;
    }
    const durationS = plan.durationMs / 1000;
    if (MixinApi.isExerting(giver) && !giver.canExert(plan.effortW, durationS)) {
      turnDown(Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired');
      return;
    }
    const land = (): void => {
      // ⚠ The scheduler's completion is synchronous, so an async plan's
      // throw would land after its root returned — an unhandled rejection
      // nobody sees. Caught and said here, as the scheduler says a sync one.
      Promise.resolve()
        .then(() => plan.onComplete())
        .then(say)
        .catch((err: unknown) => {
          console.error('CommandController: a planned act failed at completion', err);
        });
    };
    if (!MixinApi.isEngaged(giver)) {
      begin();
      land();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: plan.slots ? [...plan.slots] : ['hands'],
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      onComplete: land,
      onAbort: plan.onAbort,
      host: plan.host,
    });
    // ⚠ Begun BEFORE the start: a step that completes synchronously runs
    // its completion inside `start`, and the claim must already be held
    // for the completion to release it. A refused start aborts nothing,
    // so the claim is handed back below.
    begin();
    const result = SchedulerApi.start(step);
    if (!result.ok && plan.onAbort) plan.onAbort('cancelled');
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      const scene = MessageApi.scene(giver).topic(PLAN_TOPIC).toSelf(words.beginSelf(plan.facts));
      const peers = words.beginPeers?.(plan.facts) ?? null;
      if (peers) scene.toPeers(peers);
      scene.send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    if (!result.ok && result.reason === 'engagement-conflict') {
      turnDown(Mml.compose`Your hands are busy with something else.`, 'engagement-conflict', 'busy');
      return;
    }
    turnDown(
      Mml.compose`You can't manage that just now.`,
      'start-rejected',
      !result.ok && result.reason === 'start-rejected' ? result.error.message : '',
    );
  }

  /**
   * ⭐ **Ask the player which** — the asking answer to an object's
   * `ActChoices` (controller-liquidity D8). Prompts with the choices when
   * the giver can be asked; returns the pick, or `null` when there is
   * nobody to ask (`needs-input` is noted — script-interaction's
   * fail-closed rule), nothing to offer, or the player cancels. The caller
   * words its own refusal on `null`; a pick outside the set is `null` too.
   */
  protected async chooseAmong<C extends Stuff>(
    context: CommandContext,
    choices: readonly C[],
    label: string,
  ): Promise<C | null> {
    const picked = await this.promptForObject(context, label, [...choices]);
    return picked ? (choices.find((c) => c === picked) ?? null) : null;
  }

  /**
   * ⭐ **Which of an object's choices the player's own words name** — the
   * picking answer to `ActChoices`, scored by the binder's tiers over the
   * choices alone (`admits`): the choice the words name best wins, and a
   * tie (or no hit) goes to `preferred`. It replaces a planner reading the
   * typed text itself (`Growing.harvestPlanFor`'s substring match on a
   * label, controller-liquidity D8): what a thing answers to is its keyword
   * face, and MQL is what reads it.
   */
  protected pickByWords<C extends Stuff>(
    giver: Stuff & CommandGiver,
    words: string,
    choices: readonly C[],
    preferred: C,
  ): C {
    const text = words.trim();
    if (text === '') return preferred;
    let scored: { stuff: Stuff[]; tiers?: number[] };
    try {
      scored = MqlApi.resolveMany(text, {
        commandGiver: giver,
        scope: 'reachable',
        admits: (s) => choices.includes(s as C),
      });
    } catch {
      return preferred;
    }
    const tiers = scored.tiers ?? [];
    let best: C | null = null;
    let bestTier = -1;
    let tied = false;
    // ⭐ Only a choice the giver perceives can be what its words meant (D23).
    const seen = new Set(PerceptionApi.perceived(giver, scored.stuff));
    for (let i = 0; i < scored.stuff.length; i += 1) {
      const c = choices.find((x) => x === scored.stuff[i]);
      if (!c || !seen.has(c)) continue;
      const tier = tiers[i] ?? 0;
      if (tier > bestTier) {
        best = c;
        bestTier = tier;
        tied = false;
      } else if (tier === bestTier) {
        tied = true;
      }
    }
    return best === null || tied ? preferred : best;
  }

  /**
   * ⭐ The default words for a choice nobody asked about: *"Which field?
   * Name one: the top end or the lane end."* — the list, in the order the
   * object gave it. `noun` is the object's word for one of them.
   */
  protected choiceLine(choices: readonly Stuff[], noun: string): string {
    const names = choices.map((p) => p.presentationPhrase().definite());
    const last = names.pop() ?? '';
    const list = names.length > 0 ? `${names.join(', ')} or ${last}` : last;
    return `Which ${noun}? Name one: ${list}.`;
  }

  /**
   * ⭐ The words for ground that would not take the part named, or wants
   * one named (`Soil.resolvePartFor`) — the sentence the ground used to
   * write itself. A controller that would rather ask calls
   * {@link chooseAmong} with the choices instead.
   */
  protected partLine(r: PartChoices | PartRefusal): string {
    if (r.ok === 'choose') return this.choiceLine(r.choices, r.facts.noun);
    const what = r.facts.part.presentationPhrase().definite();
    return `${what.charAt(0).toUpperCase()}${what.slice(1)} is not a part of ${r.facts.ground.presentationPhrase().definite()}.`;
  }

  /**
   * ⭐ **Say no, diegetically, and record why** — the two halves of a
   * refusal in one call.
   *
   * Every controller that declines does the same two things: puts a
   * sentence in front of the actor, and drops a `controller-rejected`
   * note so the envelope carries a machine-readable reason. The prose is
   * what the player gets; the note is what a test and the client get.
   *
   * ⚠ It lives here because **164 controllers do this pair by hand**,
   * and at least three had minted a private helper for it —
   * ranching's `HandleController`, and two in the pets build before this
   * replaced them. A pattern that common with no shared home is how
   * every new controller ends up inventing its own slightly-different
   * version. The tree-wide migration is a census-and-ratchet job and is
   * NOT done here; this is the home it migrates to.
   */
  protected refuse(context: CommandContext, refusal: AnyActRefusal | Refusal): void;
  protected refuse(
    context: CommandContext,
    topic: string,
    line: string,
    reason: string,
    detail?: string,
  ): void;
  /**
   * ⭐⭐ The wordless form (failure-model D11) — pass the object's answer
   * on: `if (!answer.ok) return this.refuse(context, answer);`. The
   * reason's row words it at emit; this controller says nothing. The worded
   * five-argument form is the legacy one `lint:reason-rows` counts down.
   */
  protected refuse(
    context: CommandContext,
    topicOrRefusal: string | AnyActRefusal | Refusal,
    line = '',
    reason = '',
    detail = '',
  ): void {
    if (typeof topicOrRefusal !== 'string') {
      context.refuse(topicOrRefusal);
      return;
    }
    MessageApi.scene(context.commandGiver)
      .topic(topicOrRefusal)
      .toSelf(Mml.compose`${line}`)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  /**
   * ⭐⭐ **Everything the actor could plausibly aim something at** — what
   * they carry, plus what shares their environment, minus themselves,
   * **held kit first**. The candidate pool for {@link promptForObject};
   * the caller's own rules still judge whatever comes back.
   *
   * ⚠⚠ **This is the two-leg reach, and it is the only copy.** Ten
   * controllers and helpers had hand-rolled the identical walk — often
   * under a name that described the predicate rather than the reach
   * (`reachOf`, `findBath`, `findWater`, `castInReach`) — while this
   * method had three callers. A helper nobody calls sitting beside ten
   * re-implementations is a seam that is wrong, not ten careless
   * authors: it took a `CommandContext` where every one of them had a
   * `Stuff`, so the cheapest correct thing to do was write the walk
   * again. Taking the giver directly is what made the sweep possible.
   *
   * ⭐ The ordering is load-bearing and is why callers must not rebuild
   * it: **carried before floor**, so a first-match consumer prefers your
   * own gear over what happens to be lying about. That is the same
   * on-person-first contract MQL's `reachable` seed keeps
   * (`api/mql/scope-walk.ts`), which is the other home of this walk —
   * use that one from anything that is not a controller.
   *
   * ⚠ It stops at what you CARRY: slot occupants (what you wear, what
   * you wield) are not in a targeting pool. A caller that needs those
   * wants `ContainmentApi.reachableFrom(actor)`.
   *
   * ⚠ And it EXCLUDES the actor. Several of the hand-rolled copies did
   * not, which let an actor match their own predicate (a Bulkable
   * creature reading as "water to wash with"); none relied on it.
   */
  protected reachableMarks(giver: Stuff): Stuff[] {
    const out: Stuff[] = [];
    // ⭐ What the giver carries WHERE IT SITS (D-W10-1; W9: a pocket's thing
    // is its coat's contents, a bag's the bag's) — held, worn, in an open
    // pocket or satchel on them; never behind a shut lid or packed.
    out.push(...PerceptionApi.reachableAmong(giver, PerceptionApi.reach(giver, { pools: ['inventory'] }).map((r) => r.stuff)));
    if (MixinApi.isContainable(giver)) {
      const env = giver.getContainer();
      if (env && MixinApi.isContainer(env)) {
        for (const c of env.getContents()) {
          if (c.stuffId !== giver.stuffId) out.push(c);
        }
      }
    }
    // ⭐ A mark the giver does not perceive is no mark of theirs (D23).
    return PerceptionApi.perceived(giver, out);
  }

  /**
   * ⭐ **The object that afforded this command, when it was not the
   * actor themselves** — the thermometer that lit up `measure
   * temperature`, the barometer behind `measure pressure`. Returns
   * `undefined` for an innate verb, where `commandSource` falls back
   * to the giver and naming it would claim the *person* was the
   * instrument.
   *
   * This is the provenance seam: a reading is only honest if you can
   * say how it was taken, and the affordance layer already knows —
   * `commandSource` is populated from the claiming match's affordance
   * record. Derived rather than asserted per call site, so a new
   * instrument gets provenance the moment it confers a verb.
   */
  protected affordingSource(context: CommandContext): string | undefined {
    const source = context.commandSource;
    if (!source || source.stuffId === context.commandGiver.stuffId) {
      return undefined;
    }
    return source.getPresentation();
  }

  /** Guarded landings still to come on combat's beat — each keeps this clone alive past dispatch. */
  private landingsPending = new Set<object>();
  /** The dispatcher is done with this clone; the last landing releases it. */
  private released = false;

  /**
   * The dispatcher's one call when `execute` returns: destruct this
   * per-dispatch clone now — or, while a guarded hand act's landing is
   * still to come on combat's beat, as soon as it lands (size and carrying
   * D-W10-5; finalize drive run 15).
   */
  public releaseAfterDispatch(): void {
    this.released = true;
    if (this.landingsPending.size === 0 && !this.isDestroyed()) StuffApi.destruct(this as unknown as Stuff);
  }

  /** One landing done (run or abandoned): the last one after release lets the clone go. */
  private landed(landing: object): void {
    this.landingsPending.delete(landing);
    if (this.released) this.releaseAfterDispatch();
  }

  /**
   * ⭐ **A hand act in a fight is the switch's guarded beat** (size and
   * carrying D-W10-5; D-W10-13 — combat only, never a lag): in a live
   * session the act starts a beat of `seconds` with `act` as its landing,
   * says *"— your guard drops"* (after `reach`, the verb's own words for
   * where the hand goes, when it has them), and returns `true`; with a beat already
   * live it says so and returns `true` (nothing ran). Outside a session it
   * runs (and awaits) `act()` now and returns `false`. The one session check for every
   * hand verb; `drop` never asks.
   */
  protected async guarded(giver: Stuff, seconds: number, act: () => unknown, reach?: Mml): Promise<boolean> {
    if (!MixinApi.isCombatant(giver) || !CombatApi.sessionFor(giver)) {
      await act();
      return false;
    }
    // ⚠ The landing runs on combat's beat, after this controller has
    // returned: a throw in it has no caller to reach (finalize A6, P3), so
    // it is recorded as the runtime throw it is — never an unhandled
    // rejection, never swallowed.
    // ⚠⚠ …and `act` closes over THIS controller, a per-dispatch clone the
    // dispatcher destructs when `execute` returns: the landing then called
    // an inert, destroyed Stuff and did nothing, in silence (finalize drive
    // run 15 — `[inert] pickUpNow()` / `openChamber()`). The pending landing
    // keeps the clone alive; `releaseAfterDispatch` lets it go once it lands
    // (or is abandoned — a body that went down never finishes it).
    const path = giver.getTemplatePath() ?? giver.stuffId;
    const landing = {};
    this.landingsPending.add(landing);
    const begun = giver.beginHandAct(seconds, (abandoned?: boolean) => {
      void Promise.resolve()
        .then(() => (abandoned === true ? undefined : act()))
        .catch(async (err: unknown) => {
          const { DiagnosticApi } = await import('../../api/diagnostics');
          await DiagnosticApi.record({
            path,
            severity: 'error',
            message: `a hand act's landing threw — ${err instanceof Error ? err.message : String(err)}`,
            stack: err instanceof Error ? (err.stack ?? null) : null,
          });
        })
        .finally(() => this.landed(landing));
    });
    if (!begun.ok) this.landingsPending.delete(landing);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(
        begun.ok
          ? (reach !== undefined ? Mml.compose`${reach} — your guard drops.` : Mml.compose`You reach — your guard drops.`)
          : Mml.compose`You're already reaching for something.`,
      )
      .send();
    return true;
  }

  // ── carrying words (size and carrying W8: the body decides, the controller words) ──

  /**
   * ⭐ The words for a carrying refusal — in the second person, each naming
   * what works. The body returns facts (`wouldSetDown`, `ready`,
   * `wieldPlanFor`); this is where they become a sentence, in one place,
   * for every verb that takes or hands. Exhaustive: a new reason does not
   * compile until it is worded.
   */
  public carryRefusalWords(giver: Stuff, r: CarryRefusal | ArrivalRefusal): string {
    const a = (s: Stuff): string => s.presentationPhrase().definite();
    const kw = (x: Stuff): string =>
      (MixinApi.isPerceptible(x) ? x.getPrimaryKeyword() : undefined) ?? x.presentationPhrase().bare();
    switch (r.reason) {
      case 'too-big-for-mouth':
      case 'too-big-inside':
      case 'no-room':
      case 'not-shaped-for':
        return `${this.capFirst(a(r.facts.item))} won't fit.`;
      case 'refused-by-container':
        return `That won't go — ${r.facts.said}.`;
      case 'too-heavy':
        return "That's more than you can lift.";
      case 'cannot-grip':
        return `You can't hold it — ${r.facts.why}.`;
      case 'hands-on-cart':
        return `Your hands are on ${a(r.facts.cart)} — \`unhitch\` it first.`;
      case 'nowhere-to-carry': {
        if (!MixinApi.isAttired(giver) || giver.handSlots().length === 0) return 'You have nowhere to carry that.';
        return this.nowhereWords(r.facts);
      }
      case 'packed':
        return `It's packed in ${a(r.facts.by)} — take it off first (\`remove ${r.facts.by.presentationPhrase().bare()}\`).`;
      case 'hands-needed': {
        // ⭐ Nothing frees a hand for you (D-W10-3): what holds them is named,
        // and the next commands are the whole hand economy — `drop` (free in
        // a fight), or put one away (`unwield`, `put … in …`).
        const list = r.facts.held;
        const need = r.facts.hands === 1 ? 'a free hand' : 'both hands';
        if (list.length === 0) return `That takes ${need}.`;
        const last = list.at(-1)!;
        const away = r.facts.away ?? null;
        const put = away === null
          ? null
          : away.region !== undefined && MixinApi.isPlacing(away.host) && away.host.namedRegions().includes(away.region)
            ? `put ${kw(away.held)} in ${away.region.includes(' ') ? `"${away.region}"` : away.region}`
            : `put ${kw(away.held)} in ${kw(away.host)}`;
        const aways = [`unwield ${kw(last)}`, ...(put !== null ? [put] : [])].map((c) => `\`${c}\``).join(', ');
        // ⭐ Each thing held is offered to drop (requirements step 7: with a
        // lantern and a shield it is the lantern you set down — the room
        // stays lit — though the shield was named last).
        const drops = list.map((h) => `\`drop ${kw(h)}\``).join(' or ');
        return `That takes ${need} — you're holding ${this.heldList(list)}. ${drops} (free in a fight), or put one away first (${aways}).`;
      }
      case 'not-on-you':
        return "That isn't yours to use.";
      case 'already-switching':
        return "You're already reaching for something.";
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /**
   * ⭐ The hands-full refusal is the tutorial (requirements § Collisions):
   * what is in the hands, what did not fit and where it was tried, and the
   * next command in this body's OWN names — *"Your hands are full — the cup
   * and the lantern — and the map won't fit in your pockets. Put something
   * away (`put cup in left pocket`) or set it down (`drop lantern`)."*
   */
  private nowhereWords(f: Extract<ArrivalRefusal, { reason: 'nowhere-to-carry' }>['facts']): string {
    const def = (x: Stuff): string => x.presentationPhrase().definite();
    const kw = (x: Stuff): string =>
      (MixinApi.isPerceptible(x) ? x.getPrimaryKeyword() : undefined) ?? x.presentationPhrase().bare();
    const { item, held, tried } = f;
    // ⭐ Things alike are counted, and the refused one is ANOTHER of them
    // (the browser walk: three mugs read "the mug and the mug").
    const alike = held.some((h) => def(h) === def(item));
    const it = alike ? `another ${item.presentationPhrase().bare()}` : def(item);
    const where = [
      ...new Set(
        tried.map((h) =>
          MixinApi.isPlacing(h) && h.namedRegions().length > 0 ? 'your pockets' : `your ${h.presentationPhrase().bare()}`,
        ),
      ),
    ];
    const fit = where.length > 0 ? ` won't fit in ${GrammarApi.joinList(where)}` : ' has nowhere to go';
    if (held.length === 0) return `${this.capFirst(it)}${fit}, and your hands can't take it.`;
    // ⭐ A thing that takes both hands while one is still free (drive step
    // 8's pole beside a lantern) says so — "your hands are full" was untrue.
    const both = f.needsBoth === true;
    const hands = both
      ? `${this.capFirst(it)} takes both hands — you're holding ${this.heldList(held)} —`
      : `Your hands are full — ${this.heldList(held)} —`;
    const away = f.away ?? null;
    const awayCmd = away === null
      ? null
      : away.region !== undefined && MixinApi.isPlacing(away.host) && away.host.namedRegions().includes(away.region)
        ? `put ${kw(away.held)} in ${away.region}`
        : `put ${kw(away.held)} in ${kw(away.host)}`;
    const drop = `drop ${kw(held.at(-1)!)}`;
    const next = awayCmd !== null
      ? `Put something away (\`${awayCmd}\`) or set it down (\`${drop}\`).`
      : `Set something down (\`${drop}\`).`;
    return `${hands} and ${both ? 'it' : it}${fit}. ${next}`;
  }

  /** What the hands hold, in words — two alike are "both mugs". */
  private heldList(held: readonly Stuff[]): string {
    const def = (x: Stuff): string => x.presentationPhrase().definite();
    const first = held[0];
    if (held.length === 2 && first !== undefined && held.every((h) => def(h) === def(first))) {
      return `both ${GrammarApi.pluralize(first, first.presentationPhrase().bare())}`;
    }
    return GrammarApi.joinList(held.map(def));
  }

  /** `the cup` → `The cup`. */
  private capFirst(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
