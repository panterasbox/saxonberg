/**
 * StudyController — `study <book>`.
 *
 * Takes a working on board from a spellbook, or sharpens one already
 * held. The whole result lands at the {@link StudyActivity}'s
 * *completion*; an interrupted study learns nothing (the `CastActivity`
 * contract).
 *
 * Three decisions are visible here, and each is load-bearing:
 *
 * - **The claim is minted, the deed never is** (D13). Reading writes a
 *   chronicle claim and NO Transcript entry, so competence is untouched.
 *   Knowing a spell you cannot cast is the ordinary outcome.
 * - **Below the comprehension floor you get a DEFECTIVE copy, not a
 *   refusal** (D14). It costs far more on every cast, and the holder
 *   does not know. Recoverable by re-studying once competent.
 * - **Duration follows the savings curve** (D16): nearly-sharp refreshes
 *   fast, badly decayed takes far longer — which is what rewards regular
 *   light maintenance over cramming. Book **quality** scales that speed
 *   and NOTHING else; it has no say in how fast the copy then fades.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MagicApi } from '@saxonberg/server/mud/api/magic';
import { AdvancementApi } from '@saxonberg/server/mud/api/advancement';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StudyActivity } from '@saxonberg/server/mud/lib/magic/StudyActivity';
import { SpellKnowledge } from '@saxonberg/server/mud/lib/magic/SpellKnowledge';
import { Fade } from '@saxonberg/server/mud/lib/magic/Fade';
import { MagicGrid } from '@saxonberg/server/mud/lib/magic/Grid';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type Spellbook from '../../../thing/Spellbook';

const TOPIC = 'act.deed';

/** Game-ms a full study from nothing takes, at ordinary book quality. */
const FULL_STUDY_MS = 20 * 60 * 1000;
/** Floor so a trivial top-up still takes a beat rather than zero time. */
const MIN_STUDY_MS = 30 * 1000;
/** How much a grade band above `poor` speeds a refresh. */
const QUALITY_SPEEDUP_PER_BAND = 0.12;

interface StudyModel extends CommandModel {
  target: MqlOneResult;
}

export default class StudyController extends CommandController<StudyModel> {
  async execute(model: StudyModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const book = (model.target?.stuff ?? null) as Spellbook | null;

    if (!book) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' to study.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    const spellPath = book.getTeachesSpellPath?.() ?? '';
    if (!spellPath) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There is no working set out in ${Mml.thing(book)} to take on board.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'teaches-nothing',
        detail: 'not a spellbook',
      });
      return;
    }

    const spell = MagicApi.spellAt(spellPath);
    if (!spell) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The pages set out a working the world no longer answers to.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-spell',
        detail: spellPath,
      });
      return;
    }

    if (!MixinApi.isMemorized(actor) || !MixinApi.isEngaged(actor)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no mind to hold a working in.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'MemorizedMixin' });
      return;
    }

    // ── The comprehension floor (D14) ──
    //
    // Set BELOW the casting floor, so the gap is a read-ahead window: a
    // band where you can take a working on board and not yet execute it,
    // which gives practice a visible target.
    const [verbBand, nounBand] = await Promise.all([
      AdvancementApi.bandFor(actor, MagicGrid.verbDisciplineKey(spell.verb)),
      AdvancementApi.bandFor(actor, MagicGrid.nounDisciplineKey(spell.noun)),
    ]);
    const limiting =
      CompetenceBand.rank(verbBand) <= CompetenceBand.rank(nounBand)
        ? verbBand
        : nounBand;
    const authoredFloor = book.getComprehensionBand?.() ?? '';
    const floor = CompetenceBand.isBand(authoredFloor)
      ? authoredFloor
      : spell.castingProfile.requiredBand;
    // ⚠ Reading above the floor does NOT refuse. It produces a copy the
    // reader believes is correct — honest, legible, and recoverable.
    const defective = !CompetenceBand.atOrAbove(limiting, floor);

    const held = actor.getMemorizedSpell(spellPath);
    const sharpness = held?.sharpness ?? 0;
    // The savings curve: a nearly-sharp working comes back quickly.
    const quality = MixinApi.isGraded(book) ? book.getGrade().getOrdinal() : 1;
    const speed = 1 + QUALITY_SPEEDUP_PER_BAND * quality;
    const durationMs = Math.max(
      MIN_STUDY_MS,
      (FULL_STUDY_MS * Fade.refreshFraction(sharpness)) / speed,
    );

    const complexity = Fade.complexityOf(
      spell.effects.length,
      CompetenceBand.rank(spell.castingProfile.requiredBand),
    );

    const activity = new StudyActivity({
      actor,
      spellPath,
      durationMs,
      onComplete: (): void => {
        actor.memorize({
          spellPath,
          defective,
          verb: spell.verb,
          noun: spell.noun,
          complexity,
        });
        // The CLAIM, never a deed — competence is untouched, and a
        // Transcript entry here would be evidence of practice that did
        // not happen.
        void SpellKnowledge.noteKnown(actor, spellPath, spell.name).catch(
          () => {},
        );
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(
            defective
              ? // Deliberately confident prose: the reader does NOT know
                // the copy is bad. That is the whole point of D14 —
                // half-understanding is worse than none precisely
                // because you don't know you're wrong. The efficiency
                // will tell them, on every cast, which is the legible
                // signal.
                Mml.compose`You close the book with ${spell.name} fixed in your head.`
              : Mml.compose`${spell.name} settles into place, clear and whole.`,
          )
          .send();
      },
      onAbort: (): void => {
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`You lose the thread and the page with it.`)
          .send();
      },
    });

    const started = SchedulerApi.start(activity);
    if (!started.ok) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You are too busy to sit and read.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'engaged',
        detail: 'hands or attention already committed',
      });
      return;
    }

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open ${Mml.thing(book)} and begin to read.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} settles down with a book.`)
      .send();
  }
}
