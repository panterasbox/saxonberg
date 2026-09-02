// CardLogic — the hot-reloadable logic singleton behind CardApi. (Doc
// comment lives on the class declaration below so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type Interactive from '../Interactive';
import { StuffApi } from '../../../api/stuff';
import { ShellApi } from '../../../api/shell';
import { CommandLineApi } from '../../../api/command-line';
import type CardRegistry from '../CardRegistry';
import type { CardOpenOptions } from '../CardRegistry';
import type { CardCloseReason, CardId } from '@saxonberg/types';
import type { CommandContext } from '../../../api/command';
import { CARDS } from '../../../lib/connection/Cards';

const CardApiCallers = SecurityPolicies.FromModule('/api/card#CardApi');
/** The Interactive card surface (Phase E) calls in as the proxied instance. */
const CardCallers = SecurityPolicies.AnyOf(
  CardApiCallers,
  SecurityPolicies.FromModule('/platform/idea/Interactive'),
);

/* ─────────────────────── registry resolution ─────────────────────── */
// Module-level so it survives the logic singleton's destruct/recreate
// across HMR. `findByTemplatePath` is O(1), so no cache is needed.

const REGISTRY_PATH = '/platform/idea/CardRegistry';

let registryClass: (new () => CardRegistry) | null = null;

/**
 * Called from `obj/CardRegistry.ts`'s registration seam so this file
 * doesn't have to value-import the Registry class (cycle avoidance —
 * the `MqlSubscriptionLogic` rationale).
 * @internal
 */
export function registerCardRegistryClass(cls: new () => CardRegistry): void {
  registryClass = cls;
}

/** Non-lazy registry lookup (returns `null` when none seeded). */
function lookupRegistry(): CardRegistry | null {
  return StuffApi.findByTemplatePath<CardRegistry>(REGISTRY_PATH) ?? null;
}

/**
 * Resolve the Registry, lazy-creating a transient in-memory instance if
 * `BootstrapManager.run()` hasn't seeded one yet. Production hits the
 * manifest path; tests fall through here.
 */
function resolveRegistry(): CardRegistry {
  const existing = lookupRegistry();
  if (existing) return existing;
  if (!registryClass) {
    throw new Error(
      'CardLogic: CardRegistry not bootstrapped and its class is not ' +
        'registered. Either run BootstrapManager.run() or import ' +
        "'../CardRegistry' so its module-load side effect registers the class.",
    );
  }
  const reg = StuffApi.createSync<CardRegistry>(
    () => new registryClass!(),
    // The manifest clone is the production path (postRegister = the
    // sweep install). A lazily-built harness registry starts with no
    // sweep; the test that needs one drives postRegister().
    { deferPostRegister: true },
  );
  reg.setTemplatePath(REGISTRY_PATH);
  return reg;
}

/**
 * CardLogic — the hot-reloadable logic singleton behind {@link CardApi}.
 *
 * Lives at `/platform/idea/api/card` (a stateless `Stuff` singleton, no backing
 * `Template`); the statics on `CardApi` forward here via
 * `StuffApi.singletonSync`. All card state lives on the `CardRegistry`
 * at `/platform/idea/CardRegistry`, resolved via the module-level
 * `resolveRegistry()` — which survives this singleton's
 * destruct/recreate across HMR, so `dest /platform/idea/api/card` reloads the
 * logic without closing anybody's cards.
 *
 * @internal
 */
@Unshadowable
export class CardLogic extends ApiLogic {
  /**
   * ⭐⭐ **The dedup key: the normalized command.**
   *
   * Three rungs, and all three are needed:
   *
   * 1. `expandAliases` — the player's own aliases, so a personal `l`
   *    for `look` does not mint a second card.
   * 2. ⚠ **Canonicalise the verb to `command.verbs[0]`.** `examine` is
   *    a verb SYNONYM, not an alias — `look.yaml` declares
   *    `verbs: [look, l, examine, exa]`, so `expandAliases` never sees
   *    it. Without this rung `examine a` and `look a` are two cards and
   *    acceptance criterion 3 fails.
   * 3. `CommandLineApi.format()` — the canonical round-trip, which is
   *    what makes `look   lamp` and `look lamp` the same key.
   *
   * ⚠ Dedup on the normalized command means `look lamp` and `look brass
   * lamp` are two cards about one thing. That is decision 6 read
   * literally and it is the right trade — identity is what you typed —
   * but it is a knowing cost rather than a defect.
   */
  @CallSecurity(CardApiCallers)
  public normalizeKey(context: CommandContext): string {
    const canonical = context.command?.verbs[0] ?? context.verb;
    const parsed = CommandLineApi.parsePipeline(
      context.commandText,
    ).commands[0];
    if (!parsed) return canonical;

    const giver = context.commandGiver as unknown as Parameters<
      typeof ShellApi.expandAliases
    >[1];
    const expanded = ShellApi.expandAliases(parsed, giver).parsed;
    const formatted = CommandLineApi.format(expanded);

    // Swap the typed verb for the canonical one, leaving the rest of the
    // formatted line untouched. Split on the FIRST space only: the
    // operand may itself contain spaces (`look brass lamp`).
    const space = formatted.indexOf(' ');
    return space === -1 ? canonical : `${canonical}${formatted.slice(space)}`;
  }

  /* ─── forwards ─── */

  /** See {@link CardApi.open}. */
  @CallSecurity(CardCallers)
  public open(
    interactive: Interactive,
    cardId: CardId,
    opts?: CardOpenOptions,
  ): string | null {
    return resolveRegistry().open(interactive, cardId, opts);
  }

  /** See {@link Interactive.touchCard}. */
  @CallSecurity(CardCallers)
  public touchCard(
    interactive: Interactive,
    key: string,
    opts?: CardOpenOptions,
  ): boolean {
    return resolveRegistry().touchCard(interactive, key, opts);
  }

  /** See {@link Interactive.setCardPinned}. */
  @CallSecurity(CardCallers)
  public setPinned(
    interactive: Interactive,
    cardRef: string,
    pinned: boolean | null,
  ): boolean {
    return resolveRegistry().setPinned(interactive, cardRef, pinned);
  }

  /** See {@link Interactive.closeCard}. */
  @CallSecurity(CardCallers)
  public close(
    interactive: Interactive,
    instanceId: string,
    reason: CardCloseReason,
  ): boolean {
    return resolveRegistry().close(interactive, instanceId, reason);
  }

  /** See {@link Interactive.listCards}. */
  @CallSecurity(CardCallers)
  public list(interactive: Interactive): {
    instanceId: string;
    cardId: CardId;
    key: string;
    pinned: boolean;
    live: boolean;
  }[] {
    return resolveRegistry().list(interactive);
  }

  /** See {@link Interactive.applyCardArrangement}. */
  @CallSecurity(CardCallers)
  public applyArrangement(
    interactive: Interactive,
    cards: readonly CardId[],
  ): { opened: number; closed: number } {
    return resolveRegistry().applyArrangement(interactive, cards);
  }

  /** See {@link Interactive.notifyPromptSettled}. */
  @CallSecurity(CardCallers)
  public notifyPromptSettled(
    interactive: Interactive,
    promptId: string,
  ): void {
    resolveRegistry().notifyPromptSettled(interactive, promptId);
  }

  /** See {@link Interactive.cancelAllCards}. */
  @CallSecurity(CardCallers)
  public cancelAllForInteractive(interactive: Interactive): void {
    const reg = lookupRegistry();
    if (reg) reg.cancelAllForInteractive(interactive);
  }

  /* ─── test seams ─── */

  /**
   * Run one sweep. The Api's scheduled callback re-plants this singleton
   * as the principal and calls straight in, so the policy admits
   * `SelfOnly` alongside the Api face (the registry self-sweeps since the boot() retirement).
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(CardApiCallers, SecurityPolicies.SelfOnly),
  )
  public sweepNow(windowMs: number, now?: number): number {
    return resolveRegistry().sweep(windowMs, now);
  }

  /** See {@link CardApi._getSizeForTesting}. */
  @CallSecurity(CardApiCallers)
  public _getSize(): number {
    const reg = lookupRegistry();
    return reg ? reg._getSize() : 0;
  }

  /** See {@link CardApi._clearAllForTesting}. */
  @CallSecurity(CardApiCallers)
  public _clearAll(): void {
    const reg = lookupRegistry();
    if (reg) reg._clearAll();
  }

  /** The catalogue's own liveness answer, for the verb's report. */
  @CallSecurity(CardApiCallers)
  public isLive(cardId: CardId): boolean {
    return CARDS[cardId].live;
  }
}
