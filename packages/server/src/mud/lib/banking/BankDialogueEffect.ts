/**
 * The `bank-circle` dialogue effect — banking's registration into the generic
 * dialogue-effect registry. Registered HERE (in banking's own lib) rather than
 * baked into `lib/npc/tree.ts`, so the dependency runs the right way (banking →
 * the dialogue substrate, consumer → substrate) and the generic dialogue format
 * stays free of banking vocabulary.
 *
 * It enrols the interlocutor into a bank's Circle — the Goodkin enrollment beat
 * (the officer's tree reaches its `circle` node). A no-op (the officer's
 * dialogue nudges instead) if the player hasn't yet opened an account at that
 * corpo's bank; the write is idempotent. Registered by
 * `BankCounter.postRegister` — a live bank fixture is the object lifecycle
 * that makes the verb real (no module-scope registration, no boot import).
 */

import type { DialogueEffectHandler } from "../npc/DialogueEffects";
import { BankingApi } from "../../api/banking";

export const BANK_CIRCLE_EFFECT: DialogueEffectHandler = {
  validate(effect) {
    return typeof effect.corpo === "string"
      ? []
      : ["bank-circle requires a string 'corpo'"];
  },
  async apply({ player, effect }) {
    const key = player.getTemplatePath();
    if (key) await BankingApi.enrollCircle(key, String(effect.corpo));
  },
};
