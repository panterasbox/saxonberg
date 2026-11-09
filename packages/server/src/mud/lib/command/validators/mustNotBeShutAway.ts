/**
 * mustNotBeShutAway — no bound Stuff may be behind a shut lid between it
 * and the actor: the apple in the shut box, the steak in the shut cold
 * compartment. The refusal says which lid (*"The box is shut."*).
 *
 * **Why a validator, and why only on the taking and using verbs.** MQL
 * ADDRESSES things wherever they are (controller-liquidity D6) — `look
 * me:I:apple` finds the apple in the shut box and describes it — so the
 * question *can a hand get at it?* belongs to the verb, not the query. A
 * bare name never binds a shut-away thing (the binder's rung walk stops
 * at lids and says the same words); this is the gate for an explicit
 * chain (`eat me:I:apple`) on a verb that puts a hand on what it names.
 *
 * The rule is the object's: `Containable.reachRefusal(actor)`.
 *
 * Empty MQL results pass through — the controller owns the
 * nothing-matched prose.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';
import { GrammarApi } from '../../../api/grammar';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  const giver = context.commandGiver as Stuff;
  for (const stuff of stuffs) {
    if (!MixinApi.isContainable(stuff)) continue;
    const refusal = stuff.reachRefusal(giver);
    if (refusal === null) continue;
    const by = refusal.facts.by.describeFor(giver);
    return `${GrammarApi.cap(by)} is shut.`;
  }
  return undefined;
};

export default validator;
