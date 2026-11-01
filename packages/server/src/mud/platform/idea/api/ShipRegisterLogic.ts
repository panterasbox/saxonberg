// ShipRegisterLogic — the hot-reloadable logic singleton behind ShipRegisterApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { GovernmentApi } from '../../../api/government';
import ShipRegister from '../ShipRegister';
import type {
  ShareHolder,
  ShareTransferResult,
  ShipEntry,
  ShipLies,
} from '../ShipRegister';

const ShipRegisterApiCallers = SecurityPolicies.FromModule('/api/ship-register#ShipRegisterApi');

/**
 * Every register some government keeps, stood up — in the catalogue's
 * order. ⭐ Bounded by the number of governments that CHOOSE to keep one;
 * nothing is searched beyond the rows they name.
 */
async function registers(): Promise<ShipRegister[]> {
  const out: ShipRegister[] = [];
  for (const g of GovernmentApi.listGovernments()) {
    if (!g.shipRegister) continue;
    const reg = await StuffApi.singleton(g.shipRegister).catch((err) => {
      console.warn(`ShipRegisterLogic: ${g.key}'s register '${g.shipRegister}' did not stand up:`, err);
      return null;
    });
    if (reg instanceof ShipRegister) out.push(reg);
    else if (reg !== null) console.warn(`ShipRegisterLogic: '${g.shipRegister}' (${g.key}) is not a ShipRegister`);
  }
  return out;
}

/** The register a government keeps, or `null` when it keeps none. */
async function registerOf(governmentKey: string): Promise<ShipRegister | null> {
  for (const reg of await registers()) if (reg.getGovernmentKey() === governmentKey) return reg;
  return null;
}

/** The register a ship is entered in, with her entry — `null` when she is stateless. */
async function findEntry(handle: string): Promise<{ reg: ShipRegister; entry: ShipEntry } | null> {
  if (!handle) return null;
  for (const reg of await registers()) {
    const entry = await reg.entryFor(handle);
    if (entry !== null) return { reg, entry };
  }
  return null;
}

/**
 * @internal ⭐ The logic behind {@link ShipRegisterApi} (harbors P14): it
 * finds the register a ship is entered in by walking the registers the
 * governments name, and asks the register itself — every write is the
 * register's own (`ShipRegister.enter`/`transferShares`/`setLies`), so the
 * pen stays with the register.
 */
@Unshadowable
export class ShipRegisterLogic extends ApiLogic {
  @CallSecurity(ShipRegisterApiCallers)
  public async entryOf(handle: string): Promise<ShipEntry | null> {
    return (await findEntry(handle))?.entry ?? null;
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async entriesNamed(name: string): Promise<ShipEntry[]> {
    const out: ShipEntry[] = [];
    for (const reg of await registers()) {
      const entry = await reg.entryNamed(name);
      if (entry !== null) out.push(entry);
    }
    return out;
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async entriesIn(governmentKey: string): Promise<ShipEntry[]> {
    return (await (await registerOf(governmentKey))?.entries()) ?? [];
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async managingOwnerOf(handle: string): Promise<ShareHolder | null> {
    const found = await findEntry(handle);
    return found === null ? null : found.reg.managingOwnerOf(found.entry);
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async holdersOf(handle: string): Promise<ShareHolder[]> {
    return ((await findEntry(handle))?.entry.shares ?? []).map((h) => ({ ...h.holder }));
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async flagOf(handle: string): Promise<string | null> {
    const found = await findEntry(handle);
    return found === null ? null : found.entry.flag || found.reg.getGovernmentKey();
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async lyingAt(landingPath: string): Promise<string[]> {
    if (!landingPath) return [];
    const out: string[] = [];
    for (const reg of await registers()) {
      for (const e of await reg.entries()) if (e.lies?.landing === landingPath) out.push(e.key);
    }
    return out;
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async keepsRegister(governmentKey: string): Promise<boolean> {
    return (await registerOf(governmentKey)) !== null;
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async isNameTaken(governmentKey: string, name: string): Promise<boolean> {
    const reg = await registerOf(governmentKey);
    if (reg === null) throw new Error(`ShipRegisterApi: ${governmentKey} keeps no ship register`);
    return reg.isNameTaken(name);
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async enter(
    governmentKey: string,
    entry: Omit<ShipEntry, 'flag' | 'registeredAtS'>,
  ): Promise<string | null> {
    const reg = await registerOf(governmentKey);
    if (reg === null) return `${GovernmentApi.getGovernment(governmentKey)?.name ?? governmentKey} keeps no register of ships.`;
    return reg.enter(entry);
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async transferShares(
    handle: string,
    from: ShareHolder,
    to: ShareHolder,
    n: number,
  ): Promise<ShareTransferResult> {
    const found = await findEntry(handle);
    if (found === null) return { ok: false, reason: 'She is in no register; she has no shares to sell.' };
    return found.reg.transferShares(handle, from, to, n);
  }

  @CallSecurity(ShipRegisterApiCallers)
  public async noteLies(handle: string, lies: ShipLies | null): Promise<boolean> {
    const found = await findEntry(handle);
    return found === null ? false : found.reg.setLies(handle, lies);
  }
}
