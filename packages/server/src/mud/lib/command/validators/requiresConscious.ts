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
import { TemplatePaths } from "../../paths";

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (!MixinApi.isVitals(giver)) return undefined;

  const collapsed = giver.hasCondition(
    (c) =>
      c.kind === "affliction" &&
      c.templatePath === TemplatePaths.metabolismCollapse,
  );
  // Torpor — the ectotherm cold-consequence: alive but immobile. Read it
  // here the same way `collapse` is read, so a torpid reptile can't run
  // exertion verbs until it rewarms.
  const torpid = giver.hasCondition(
    (c) =>
      c.kind === "affliction" &&
      c.templatePath === TemplatePaths.thermalTorpor,
  );
  if (giver.getConsciousness() === "conscious" && !collapsed && !torpid) {
    return undefined;
  }

  const name = giver.getPresentation();
  if (collapsed) {
    return `${name} has collapsed from exhaustion and can't do that.`;
  }
  if (torpid) {
    return `${name} is too cold and torpid to do that.`;
  }
  return `${name} is not conscious enough to do that.`;
};

export default validator;
