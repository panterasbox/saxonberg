/**
 * InstructController — `instruct keep <line>` / `instruct none` /
 * `instruct` (list). ⭐⭐⭐ **Standing instructions, and the bound that
 * makes them defensible.**
 *
 * The taps build's relief. A dairy cow wants taking twice a GAME day
 * and a game day is two real hours, so attendance is the whole of what
 * milk costs — and the feedback law says there is nothing to decide at
 * the act, which means the honest fix is not a finer mechanic but a way
 * to keep the round while you are not there.
 *
 * ## ⛔ A take may be kept; a SALE may never be
 *
 * The one rule, enforced by a DECLARATION rather than a list: the
 * named line's verb must resolve in the catalogue AND its view must
 * declare `standing: true`. Only the takes do (`milk`, `gather`, `rob`,
 * `tap`). So `instruct keep sell the milk` is refused, and so is every
 * other way of asking the game to earn on your behalf.
 *
 * ⚠ A list in this file would be the thing somebody forgets to edit; a
 * view key is a fact the verb's own author states where the verb lives.
 *
 * ## What it writes
 *
 * One `BehaviorSpec` on the giver's own `behaviors` field — the
 * `keeps` brain, a cadence trigger, and the rounds as config. ⭐ The
 * field is persistent and composed INSIDE `PersistableMixin`, so the
 * round rides the Avatar snapshot across a disconnect and
 * `BehavedMixin.postRegister` re-wires it at reconnect. That is the
 * whole of "and go away".
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CommandApi } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Behaved } from '../../../../lib/behavior/Behaved';
import type { BehaviorSpec } from '../../../../lib/behavior/brain';

/** The brain a round runs on. */
const KEEPS_BRAIN = '/lib/behavior/keeps';

/**
 * How often a kept round comes round, in real seconds.
 *
 * ⭐ Ten real minutes is five game hours at the shipped 12× scale —
 * comfortably inside a dairy cow's window (0.6 game days ≈ 1.2 real
 * hours) and nowhere near often enough to look like a faucet. Grain.
 */
const CADENCE = 'cadence:600s';

/** The topic the verb narrates on. */
const INSTRUCT_TOPIC = 'self.body';

interface InstructModel extends CommandModel {
  line?: string;
}

interface Round {
  line: string;
  target: string;
}

export default class InstructController extends CommandController<InstructModel> {
  async execute(model: InstructModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isBehaved(giver)) {
      // ⚠ Not an error a player should see as a defect: a body that
      // cannot carry instructions genuinely cannot, and saying so is
      // the honest answer.
      this.decline(
        context,
        Mml.compose`You are not in a position to keep anything going.`,
        'not-behaved',
      );
      return;
    }
    const host = giver as Stuff & Behaved;

    switch (model.subcommand ?? 'list') {
      case 'keep':
        return this.keep(host, model.line, context);
      case 'none':
        return this.clear(host, context);
      default:
        return this.list(host, context);
    }
  }

  /** ⭐ Record a round — after proving the line may be kept. */
  private async keep(
    host: Stuff & Behaved,
    line: string | undefined,
    context: CommandContext,
  ): Promise<void> {
    const text = (line ?? '').trim();
    if (text === '') {
      this.decline(
        context,
        Mml.compose`Keep what? Name the command exactly as you would type it.`,
        'no-line',
      );
      return;
    }

    // ── the verb must exist ──
    // ⚠ A plain split, not the pipeline parser: the line is stored and
    // re-issued VERBATIM through `forceCommand`, so the real tokenizer
    // runs at dispatch where it belongs. All this needs is the first
    // word and a target word.
    const tokens = text.split(/\s+/).filter((t) => t !== '');
    const verb = (tokens[0] ?? '').toLowerCase();
    if (verb === '') {
      this.decline(context, Mml.compose`That is not a command.`, 'no-verb');
      return;
    }
    // ⭐ Ask the OWNER the question, rather than filtering its table —
    // `lint:whole-table`'s rule, and the right one: this is where a verb
    // index can later go without this caller moving.
    const def = CommandApi.definitionForVerb(verb);
    if (!def) {
      this.decline(
        context,
        Mml.compose`There is no such command as '${verb}'.`,
        'unknown-verb',
      );
      return;
    }

    // ── ⛔ and it must be KEEPABLE ──
    if (!def.standing) {
      // ⭐ The refusal says the RULE, because the rule is the design: a
      // player who tried to keep a sale should come away understanding
      // why they cannot, not thinking the parser is fussy.
      this.decline(
        context,
        Mml.compose`You can keep a round of work going, but not '${verb}'. Only the taking — milking, gathering, robbing a hive, tapping a tree — carries on without you. Anything that spends or sells is yours to do yourself.`,
        'not-standing',
      );
      return;
    }

    // ── the line must name a target, because the round looks for it ──
    const target = targetWordOf(tokens);
    if (target === null) {
      this.decline(
        context,
        Mml.compose`Name what you are ${verb}ing. The round has to look for it each time it comes round.`,
        'no-target',
      );
      return;
    }

    const rounds = roundsOf(host);
    if (rounds.some((r) => r.line.toLowerCase() === text.toLowerCase())) {
      this.decline(
        context,
        Mml.compose`You are already keeping that one.`,
        'already-kept',
      );
      return;
    }

    const next: Round[] = [...rounds, { line: text, target }];
    host.removeBehaviors(KEEPS_BRAIN);
    await host.addBehavior(specFor(next));

    MessageApi.scene(host)
      .topic(INSTRUCT_TOPIC)
      .toSelf(
        Mml.compose`You settle it in your mind: ${text}, and keep at it. ⚠ It will look for the ${target} wherever you are standing when you go — and nowhere else.`,
      )
      .send();
  }

  /** Stop all of it. */
  private clear(host: Stuff & Behaved, context: CommandContext): void {
    const gone = host.removeBehaviors(KEEPS_BRAIN);
    if (gone === 0) {
      this.decline(
        context,
        Mml.compose`You are not keeping anything going.`,
        'nothing-kept',
      );
      return;
    }
    MessageApi.scene(host)
      .topic(INSTRUCT_TOPIC)
      .toSelf(Mml.compose`You let it all go.`)
      .send();
  }

  /** What is standing. */
  private list(host: Stuff & Behaved, context: CommandContext): void {
    const rounds = roundsOf(host);
    if (rounds.length === 0) {
      this.decline(
        context,
        Mml.compose`You are not keeping anything going. ⭐ \`instruct keep milk the cow into the pail\` is the shape of it.`,
        'nothing-kept',
      );
      return;
    }
    const lines = rounds.map((r, i) => `  ${i + 1}. ${r.line}`).join('\n');
    MessageApi.scene(host)
      .topic(INSTRUCT_TOPIC)
      .toSelf(
        Mml.compose`You are keeping this going:\n${lines}\n\n⚠ Each one looks for its target in the room you are standing in, and lapses quietly if it is not there.`,
      )
      .send();
  }

  /** Decline diegetically, and file the structured reason. */
  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(INSTRUCT_TOPIC)
      .toSelf(prose)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** The rounds already standing on this host, read off its one spec. */
function roundsOf(host: Stuff & Behaved): Round[] {
  const spec = host.getBehaviors().find((s) => s.brain === KEEPS_BRAIN);
  if (!spec) return [];
  const raw = (spec.config as { rounds?: unknown } | undefined)?.rounds;
  if (!Array.isArray(raw)) return [];
  const out: Round[] = [];
  for (const e of raw as Array<{ line?: unknown; target?: unknown }>) {
    if (typeof e?.line === 'string' && typeof e?.target === 'string') {
      out.push({ line: e.line, target: e.target });
    }
  }
  return out;
}

/** One spec carrying every round — the brain loops them itself. */
function specFor(rounds: Round[]): BehaviorSpec {
  return {
    brain: KEEPS_BRAIN,
    trigger: CADENCE,
    config: { rounds },
  } as BehaviorSpec;
}

/**
 * The word the line names as its subject.
 *
 * ⚠ Deliberately crude: the first token after the verb that is not an
 * article or a preposition. The round does not need to RESOLVE the
 * target here — the verb will do that properly each time it runs, with
 * the real binder — it only needs a keyword to check the thing is still
 * in the room before spending a beat on it.
 */
function targetWordOf(tokens: string[]): string | null {
  const SKIP = new Set([
    'the', 'a', 'an', 'my', 'into', 'in', 'from', 'with', 'using', 'at', 'to',
  ]);
  for (const raw of tokens.slice(1)) {
    const t = raw.toLowerCase();
    if (t.startsWith('-')) continue;
    if (SKIP.has(t)) continue;
    return t;
  }
  return null;
}
