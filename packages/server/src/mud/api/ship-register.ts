/**
 * ShipRegisterApi — ⭐ the gated surface over the ship registers the
 * governments keep (harbors P14): whose a ship is, in sixty-fourths, and
 * under whose flag.
 *
 * Every read takes a ship's **durable handle** (`<kind>#<serial>`, or an
 * authored ship's own row) or a path — never a ship object: a register is
 * a book, and a ship asleep is still in it. A ship that is in no register
 * is stateless, and every read says so with `null`/`[]`.
 *
 * ⚠ The writes are narrow-entry, and each names its one legitimate caller:
 *   - `enter`, `noteLies` — the ship herself, about herself (a voyaging
 *     caller whose handle is the one entered / noted): she is entered as
 *     she is commissioned and tells her register where she lies as she
 *     makes fast and casts off;
 *   - `transferShares` — the `transfer` verb's controller, which takes the
 *     seller's consent and the buyer's money in the same act.
 * The register itself holds the pen (`ShipRegister`, `DocumentApi.saveToRegister`).
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link ShipRegisterLogic} singleton at `/platform/idea/api/ship-register`.
 */

import { fileURLToPath } from 'url';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { ShipRegisterLogic } from '../platform/idea/api/ShipRegisterLogic';
import { Mixins } from '../lib/mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  ShareHolder,
  ShareHolding,
  ShareTransferResult,
  ShipEntry,
  ShipLies,
} from '../platform/idea/ShipRegister';

export type { ShareHolder, ShareHolding, ShareTransferResult, ShipEntry, ShipLies };

const LOGIC_PATH = '/platform/idea/api/ship-register';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ShipRegisterLogic', import.meta.url),
);

/** Resolve the HMR-able ShipRegisterLogic singleton (sync). */
function logic(): ShipRegisterLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ShipRegisterLogic',
      ) as typeof ShipRegisterLogic | null) ?? ShipRegisterLogic)(),
  );
}

/**
 * The ship herself, and only about HERSELF — a participant contract: a
 * voyaging caller whose durable handle is the one being entered
 * (`enter`'s entry) or whose lies are noted (`noteLies`' first argument).
 */
const FromTheShipItself = SecurityPolicies.FromMixin(Mixins.Voyaging, {
  where: (caller, _target, method, args) => {
    const mine = (caller as Stuff).getDurableHandle();
    if (mine === null) return false;
    if (method === 'enter') return (args[1] as { key?: unknown } | undefined)?.key === mine;
    return args[0] === mine;
  },
});

/** The `transfer` verb — consent and money in one act (P15). */
const FromTheTransfer = SecurityPolicies.FromModule('/platform/idea/cmd/system/TransferController');

export class ShipRegisterApi {
  /** ⭐ The entry for the ship whose durable handle is `handle`, or `null` (stateless). */
  public static entryOf(handle: string): Promise<ShipEntry | null> {
    return logic().entryOf(handle);
  }

  /** Every entry under `name`, one per register that has one (the same name may sail under two flags). */
  public static entriesNamed(name: string): Promise<ShipEntry[]> {
    return logic().entriesNamed(name);
  }

  /** Every entry in the register government `governmentKey` keeps (`[]` — it keeps none). */
  public static entriesIn(governmentKey: string): Promise<ShipEntry[]> {
    return logic().entriesIn(governmentKey);
  }

  /** ⭐ Her managing owner (P12) — more than half her shares, else the largest holding, ties to the earliest. */
  public static managingOwnerOf(handle: string): Promise<ShareHolder | null> {
    return logic().managingOwnerOf(handle);
  }

  /** Everyone who holds any of her shares, in the order they were entered. */
  public static holdersOf(handle: string): Promise<ShareHolder[]> {
    return logic().holdersOf(handle);
  }

  /** ⭐ Her flag state — the government key of the register she is entered in, or `null` (stateless). */
  public static flagOf(handle: string): Promise<string | null> {
    return logic().flagOf(handle);
  }

  /** ⭐ The handles of the ships her register says lie made fast at `landingPath` (Risk 6). */
  public static lyingAt(landingPath: string): Promise<string[]> {
    return logic().lyingAt(landingPath);
  }

  /** Does government `governmentKey` keep a register of ships? */
  public static keepsRegister(governmentKey: string): Promise<boolean> {
    return logic().keepsRegister(governmentKey);
  }

  /**
   * Is `name` taken in government `governmentKey`'s register? (A name with
   * no letters is never available.)
   *
   * @throws when that government keeps no register.
   */
  public static isNameTaken(governmentKey: string, name: string): Promise<boolean> {
    return logic().isNameTaken(governmentKey, name);
  }

  /** Enter a ship in `governmentKey`'s register — a refusal in words, or `null`. The ship herself calls it. */
  @CallSecurity(FromTheShipItself)
  public static enter(
    governmentKey: string,
    entry: Omit<ShipEntry, 'flag' | 'registeredAtS'>,
  ): Promise<string | null> {
    return logic().enter(governmentKey, entry);
  }

  /** ⭐ Move `n` of her shares from `from` to `to` — refused in words when `from` does not hold them (P15). */
  @CallSecurity(FromTheTransfer)
  public static transferShares(
    handle: string,
    from: ShareHolder,
    to: ShareHolder,
    n: number,
  ): Promise<ShareTransferResult> {
    return logic().transferShares(handle, from, to, n);
  }

  /** Where she lies made fast now (`null`: she is not) — the ship herself says so. */
  @CallSecurity(FromTheShipItself)
  public static noteLies(handle: string, lies: ShipLies | null): Promise<boolean> {
    return logic().noteLies(handle, lies);
  }
}

SecurityApi.decorateApiClass(ShipRegisterApi);
