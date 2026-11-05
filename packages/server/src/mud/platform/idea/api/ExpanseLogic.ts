// ExpanseLogic — the hot-reloadable logic singleton behind ExpanseApi.

import { NavigationApi } from '../../../api/navigation';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Positioned } from '../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../lib/expanse/Voyaging';
import { PersistableApi } from '../../../api/persistable';
import { Expanse } from '../../../lib/expanse/Expanse';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../../lib/stuff/Template';
import type { ClimateLean } from '../../../lib/weather/WeatherType';

const ExpanseApiCallers = SecurityPolicies.FromModule('/api/expanse#ExpanseApi');

/**
 * The one live thing filed at exactly `path` — a row's lone instance or a
 * minted identity — or `null` (none, or a row with several instances,
 * which names none of them). Never a keyed handle: `row#key` is a room's
 * name, and a room is asked through its warren.
 */
function filedAt(path: string): Stuff | null {
  if (path.includes('#')) {
    throw new TypeError(`ExpanseApi: '${path}' is a keyed room's handle — ask the place (Place.craftHere())`);
  }
  const live = StuffApi.findByIdentityPath<Stuff>(path).filter((o) => !o.isDestroyed());
  return live.length === 1 ? live[0]! : null;
}

/**
 * ⭐ A ship of a kind asleep, or after a restart: her
 * identity is `<kind row>/<serial>` (minted at `buy`, the
 * `Business/ship-company/<serial>` scheme), so her kind is the identity's
 * folder and her record is `(identity, serial)`. Cloned under her identity
 * and restored from it; `null` — nothing minted — when there is no record.
 */
async function standUpMinted(identity: string): Promise<Stuff | null> {
  const slash = identity.lastIndexOf('/');
  if (slash <= 0) return null;
  const kind = identity.slice(0, slash);
  const serial = identity.slice(slash + 1);
  if (!(await PersistableApi.hasRecord(identity, serial))) {
    console.warn(`ExpanseApi.standUpCraft('${identity}'): no row and no record — she names nothing`);
    return null;
  }
  // identity-keyed-by: own-record — her `holder_snapshots` record is filed
  // under it, and her register entry's `key` names it (the mint is `buy`'s).
  const ship = await StuffApi.clone<Stuff>(kind, undefined, { asIdentityPath: identity });
  await PersistableApi.materialize(ship, serial);
  return ship;
}

/**
 * ExpanseLogic — resolves a place to the craft it is part of, and an
 * expanse path to its live frame. Holds no state: the craft registry is
 * the Expanse's own, and a Structure's position is the Structure's.
 *
 * Lives at `/platform/idea/api/expanse`. Each public method carries the
 * `FromModule` gate; internals are module-private.
 *
 * @internal
 */
export class ExpanseLogic extends ApiLogic {
  /** See {@link ExpanseApi.craftAt}. */
  @CallSecurity(ExpanseApiCallers)
  public async craftAt(placePath: string): Promise<(Stuff & Positioned) | null> {
    if (!placePath) return null;
    const here = filedAt(placePath);
    if (here && MixinApi.isPositioned(here) && here.getExpansePosition() !== null) {
      return here;
    }
    // The structure attached to the place in the location graph's record
    // — never a catalogue of every structure.
    const s = await NavigationApi.structureAt(placePath);
    return s && MixinApi.isPositioned(s) && s.getExpansePosition() !== null ? s : null;
  }

  /** See {@link ExpanseApi.leanAtSync}. */
  @CallSecurity(ExpanseApiCallers)
  public leanAtSync(placePath: string): ClimateLean | null {
    if (!placePath) return null;
    let craft: Stuff | null = filedAt(placePath);
    if (!craft || !MixinApi.isPositioned(craft) || craft.getExpansePosition() === null) {
      // The structure this place is a member of — attached to it in the
      // location graph's record, and standing whenever the place is.
      craft = NavigationApi.structureAtNow(placePath);
    }
    if (!craft || !MixinApi.isVoyaging(craft)) return null;
    const pos = craft.getExpansePosition();
    const sea = StuffApi.findByTemplatePath<Stuff>(craft.getExpanse() ?? '');
    if (pos === null || !(sea instanceof Expanse)) return null;
    return sea.peekNarrowestAt(pos)?.getWeatherLean() ?? null;
  }

  /** See {@link ExpanseApi.standUpCraft}. */
  @CallSecurity(ExpanseApiCallers)
  public async standUpCraft(handle: string): Promise<(Stuff & Positioned & Voyaging) | null> {
    if (!handle) return null;
    let s: Stuff | null = filedAt(handle);
    if (s === null) {
      try {
        s = (await Template.findByPath(handle)) !== null
          ? await StuffApi.singleton<Stuff>(handle)
          : await standUpMinted(handle);
      } catch (err) {
        console.warn(`ExpanseApi.standUpCraft('${handle}'): she did not stand up:`, err);
        return null;
      }
    }
    return s !== null && !s.isDestroyed() && MixinApi.isPositioned(s) && MixinApi.isVoyaging(s) ? s : null;
  }

  /** See {@link ExpanseApi.expanse}. */
  @CallSecurity(ExpanseApiCallers)
  public async expanse(expansePath: string): Promise<Expanse | null> {
    if (!expansePath) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(expansePath);
      return s instanceof Expanse ? s : null;
    } catch {
      return null;
    }
  }
}
