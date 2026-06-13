/**
 * requiresConscious — verb-level precondition. Rejects the command when
 * the giver can't currently take a volitional / exertion action because
 * it is unconscious (the vitals consciousness surface) OR collapsed from
 * exhaustion (the metabolism `collapse` affliction).
 *
 * Sibling of `requiresAnimate`: animacy is "is this a living/active
 * organism at all"; consciousness is the recoverable below-death state
 * an *animate* body can drop into (blood loss, low SpO₂, head trauma) or
 * the acute, reversible incapacitation metabolism's coupled-recovery
 * cascade spawns when endurance bottoms out. Tagged on exertion / intake
 * verbs (eat, drink, sip, vomit, get, the locomotion verbs) — NOT on
 * passive perception or meta verbs.
 *
 * Reuses the existing `getConsciousness()` readout rather than inventing
 * a new agency axis; collapse layers onto it as a condition the
 * validator also checks. A non-vitals giver (no body) passes — animacy/
 * other validators own those cases.
 */

import type { CommandValidator } from "../../../api/command";
import { MixinApi } from "../../../api/mixin";
import { COLLAPSE_CONDITION_PATH } from "../../metabolism/Metabolic";

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (!MixinApi.isVitals(giver)) return undefined;

  const collapsed = giver.hasCondition(
    (c) => c.kind === "affliction" && c.templatePath === COLLAPSE_CONDITION_PATH,
  );
  if (giver.getConsciousness() === "conscious" && !collapsed) return undefined;

  const name = giver.getPresentation();
  if (collapsed) {
    return `${name} has collapsed from exhaustion and can't do that.`;
  }
  return `${name} is not conscious enough to do that.`;
};

export default validator;
