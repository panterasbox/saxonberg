/**
 * CardApi — the card surface's one gated face.
 *
 * ⭐⭐ **One birth path.** A card exists because a **command** caused the
 * server to push it. The client no longer infers a card from a changed
 * query result, and it cannot open one at the wire level either —
 * `MqlSubscribeMessage` has no field that would name a card, only the
 * one `chrome: 'self'` shelf subscription.
 *
 * ⭐ **Two independent axes.** *Pinned* is the whole lifetime rule
 * (unpinned cards age out of a relevance window; pinned cards stay until
 * dismissed). *Live* is orthogonal and opt-in — a card is static by
 * default, resolved once and stamped with when. All four combinations
 * are meaningful, and neither implies the other.
 *
 * The state lives on the `CardRegistry` singleton at `/platform/idea/CardRegistry`;
 * the orchestration lives in the hot-reloadable {@link CardLogic}
 * singleton at `/platform/idea/api/card`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/card` reloads the logic
 * without closing anybody's cards.
 *
 * See [card-surface.md](../../../../docs/subsystems/card-surface.md).
 */

import type { CardCloseReason, CardId } from '@saxonberg/types';
import type Interactive from '../platform/idea/Interactive';
import type CardRegistry from '../platform/idea/CardRegistry';
import type { CardOpenOptions } from '../platform/idea/CardRegistry';
import type { CommandContext } from './command';
import { SecurityApi } from './security';
import { MixinApi } from './mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import { ScheduleApi, type ScheduleHandle } from './schedule';
import { ExecutionContextApi } from './execution-context';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { CardLogic } from '../platform/idea/api/CardLogic';
import { CARDS, CARDS_BY_NAME } from '../lib/connection/Cards';
import type { CardDefinition, CardSource } from '../lib/connection/Cards';
import { fileURLToPath } from 'url';

export type { CardOpenOptions };
export type { CardDefinition, CardSource };
export { CARDS, CARDS_BY_NAME };

// DI seam: re-exported so `CardRegistry` registers its class through this
// facade rather than importing the logic singleton directly (the
// no-import-from-*Logic rule). Pure pass-through re-export.
export { registerCardRegistryClass } from '../platform/idea/api/CardLogic';

const LOGIC_PATH = '/platform/idea/api/card';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/CardLogic', import.meta.url),
);

/** The registry, when the manifest (or a lazy card op) has stood it up. */
function registryOrNull(): CardRegistry | null {
  return (
    StuffApi.findByTemplatePath<CardRegistry>('/platform/idea/CardRegistry') ??
    null
  );
}

/** Resolve the HMR-able CardLogic singleton (sync). */
function logic(): CardLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CardLogic',
      ) as typeof CardLogic | null) ?? CardLogic)(),
  );
}

export class CardApi {
  private constructor() {}

  /**
   * ⭐⭐ **Open a card from a running command, or touch the one that
   * already carries its key.**
   *
   * Called **from the controller**, because only the controller knows
   * the resolved operand (`look`'s target, `wiki`'s slug, `help`'s
   * topic) and the prose it just emitted. The YAML `opens_card:`
   * declaration is the **gate**, not decoration: this throws when the
   * running command's view did not declare the card — so the vocabulary
   * stays declarative and greppable while the call site stays where the
   * subject is known.
   *
   * Returns the card's instance id, or `null` when there is no viewer.
   */
  public static open(
    context: CommandContext,
    cardId: CardId,
    opts: Omit<CardOpenOptions, 'key'> & { key?: string } = {},
  ): string | null {
    /*
     * ⚠⚠ **A forced command carries no `interactive`, and arrival is a
     * forced command.**
     *
     * `context.interactive` is *the connection that originated the
     * command*, and it is genuinely optional: `Mobile.autoSenseOnArrival`
     * forces a `sense` from inside the traverse, so nothing originated it
     * from a socket. Read literally, that made every room card born of
     * WALKING return `null` — silently, because a null open is how a
     * card politely declines. Every room card came from the arrangement
     * or a typed `look`, and walking around simply mutated the one.
     *
     * A card belongs to the PLAYER, not to the keystroke, so fall back
     * to the giver's own connections. A giver with several (multiplexed
     * sessions) gets the card on each, which is the same thing every
     * other push does.
     */
    const interactive =
      context.interactive ?? CardApi.#interactiveFor(context.commandGiver);
    if (!interactive) return null;
    const declared = context.command?.opensCards ?? [];
    if (!declared.includes(cardId)) {
      throw new Error(
        `CardApi.open: '${context.verb}' did not declare opens_card: ` +
          `${cardId}` +
          (declared.length
            ? ` (it declares ${declared.join(', ')})`
            : ' (it declares none)'),
      );
    }
    const key = opts.key ?? CardApi.keyFor(context, cardId);
    return logic().open(interactive, cardId, { ...opts, key });
  }

  /**
   * The giver's own connection, for a command nobody typed.
   *
   * ⚠ First of the set: a multiplexed player has several, and the card
   * substrate is per-Interactive. Pushing to one is the shape every
   * other single-connection surface already has; fanning out is a
   * separate decision from making arrival work at all.
   */
  static #interactiveFor(giver: Stuff | null): Interactive | null {
    if (!giver || !MixinApi.isHasInteractive(giver)) return null;
    for (const i of giver.getInteractives()) return i;
    return null;
  }

  /**
   * The normalized command this context would key a card on — the dedup
   * identity. Exposed so a controller can compute the key once and reuse
   * it (`touch` takes a key, not a context).
   */
  public static keyFor(context: CommandContext, cardId: CardId): string {
    const normalized = logic().normalizeKey(context);
    return normalized || CARDS[cardId].command;
  }

  /** Whether the catalogue declares this card live. */
  public static isLive(cardId: CardId): boolean {
    return logic().isLive(cardId);
  }

  /* ─── test seams ─── */

  public static _sweepNowForTesting(windowMs: number, now?: number): number {
    SecurityApi.assertTestOnly('_sweepNowForTesting');
    return logic().sweepNow(windowMs, now);
  }

  public static _getSizeForTesting(): number {
    SecurityApi.assertTestOnly('_getSizeForTesting');
    return logic()._getSize();
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    logic()._clearAll();
  }

  /**
   * The AC-8 seam: how many recurring handles the sweep owns. One for
   * the whole set, or none — never one per card. (The handle lives on
   * the CardRegistry since the boot() retirement; a not-yet-seeded
   * registry owns none.)
   */
  public static _sweepHandleCountForTesting(): number {
    SecurityApi.assertTestOnly('_sweepHandleCountForTesting');
    return registryOrNull()?._sweepHandleCountForTesting() ?? 0;
  }

  /** Drop the sweep handle so a test can assert the install path again. */
  public static _resetSweepForTesting(): void {
    SecurityApi.assertTestOnly('_resetSweepForTesting');
    registryOrNull()?._resetSweepForTesting();
  }
}

SecurityApi.decorateApiClass(CardApi);
