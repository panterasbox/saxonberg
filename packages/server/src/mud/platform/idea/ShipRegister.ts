/**
 * ShipRegister — ⭐ **a government's book of ships** (harbors P14): whose a
 * ship is, in sixty-fourths, and under whose flag.
 *
 * A government keeps one **if it chooses to** (`Government.register`): the
 * row names this register, and a ship entered here flies that polity's
 * flag. An unregistered ship is stateless. Only Terminus City keeps one
 * this build; a second register is a row and a `register:` line.
 *
 * ## ⭐⭐ You file; you do not hold the pen
 *
 * The herd's rule ([Register.ts](../../lib/document/Register.ts)): every
 * entry lives under the GOVERNMENT's branch
 * (`/platform/ships/<government key>/<name slug>`), written only by this
 * register through `DocumentApi.saveToRegister`. A shipowner reads her
 * entry and cannot rewrite it — a register a shipowner could edit would be
 * the lemons fraud with the engine supplying the pen, exactly as a
 * herdbook would.
 *
 * ## ⭐ The slug is the uniqueness
 *
 * A real register refuses a second ship of a name (lens 1). Here the path
 * IS the name — `slugOf('Kittiwake II') = 'kittiwake-ii'` — so the refusal
 * is a path being taken, never a scan; the same name under another flag is
 * another prefix and is another ship.
 *
 * ## Shares
 *
 * A ship's title is **64 shares**, held by players and organizations. The
 * **managing owner** is derived on read, never stored: the holder of more
 * than 32, else the largest holding, ties to the earliest entered (P12).
 * Shares change hands only through {@link ShipRegister.transferShares},
 * which refuses a `from` that does not hold them — nobody but a holder can
 * sell.
 *
 * ## ⭐ Reached by reference, never searched
 *
 * Nothing walks every register (review 1 — the retired `ShipRegisterApi`
 * did, and that was the reverse question). A **ship** names the register
 * she is entered in and the name she is entered under (`Ship.shipRegister`,
 * `Ship.registeredName`), so her owners and her flag are one keyed read
 * of her own entry; a **government** names the register it keeps
 * (`Government.shipRegister`), which is how a yard enters a new ship, a
 * desk book reads its pages, and the `transfer` verb finds the ship whose
 * shares change hands. Where a ship LIES is not the register's business:
 * a landing keeps that (`FrameSited.noteAlongside`).
 *
 * ⚠ The writes are narrow-entry, each naming its one legitimate caller:
 * `enter` — the ship herself, about herself, as she is commissioned;
 * `transferShares` — the `transfer` verb's controller, which takes the
 * seller's consent and the buyer's money in the same act.
 *
 * ⚠ Read-side verification is mandatory (the herd's reason): a `kind: 'ship'`
 * tag is something anyone who can write a document can apply, so every read
 * re-checks the path lies under this register's prefix.
 *
 * See [docs/subsystems/ship.md] (B6).
 */

import { Idea } from '../../lib/stuff/Idea';
import { RegistrarMixin, type Registrar } from '../../lib/document/Register';
import { DocumentApi } from '../../api/document';
import { WorldClockApi } from '../../api/worldclock';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Mixins } from '../../lib/mixin';
import type { Stuff, EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';
import type { FieldMeta } from '../../lib/mixin';

/** How many shares a ship's title is divided into — sixty-fourths. */
export const SHARES_PER_SHIP = 64;

/** The document kind a ship register writes (`DocumentKinds.ship`). */
export const SHIP_ENTRY_KIND = 'ship';

/** Who holds shares: a player (identity path) or an organization (its path). */
export interface ShareHolder {
  kind: 'player' | 'organization';
  path: string;
  /** The holder's name as entered — what the register's page reads (a person may be offline). */
  name?: string;
}

/** One line of a ship's title. */
export interface ShareHolding {
  holder: ShareHolder;
  shares: number;
}

/**
 * ⭐ A ship's register entry — the whole of what her register knows about
 * her. Holdings are listed in the order they were entered (the managing
 * owner's tie-break).
 */
export interface ShipEntry {
  /** Her name as entered ("Kittiwake II"), unique in this register. */
  name: string;
  /** The row she was built from — her kind (`/stuff/idea/Ship/smack`), or her own row. */
  kind: string;
  /** Her handle — her identity (minted `<kind>/<serial>`, or her own row for an authored ship). */
  key: string;
  /** The flag state — the register's government key. */
  flag: string;
  /** Her owners, by shares; the shares sum to {@link SHARES_PER_SHIP}. */
  shares: ShareHolding[];
  /** Game-seconds she was entered. */
  registeredAtS: number;
  /** Her company — the Business that mans her (`''` when none). */
  house: string;
}

/** What a share transfer answers: a refusal in words, or the entry as it now stands. */
export type ShareTransferResult = { ok: true; entry: ShipEntry } | { ok: false; reason: string };

/**
 * The ship herself, and only about HERSELF — a participant contract: a
 * voyaging caller whose durable handle is the one being entered. (A
 * mixin name, not `FromClass(Ship)`: the class import would close a cycle
 * through the ship back to her register.)
 */
const FromTheShipItself = SecurityPolicies.FromMixin(Mixins.Voyaging, {
  where: (caller, _target, _method, args) => {
    const mine = (caller as Stuff).getDurableHandle();
    return mine !== null && (args[0] as { key?: unknown } | undefined)?.key === mine;
  },
});

/** The `transfer` verb — consent and money in one act (P15). */
const FromTheTransfer = SecurityPolicies.FromModule('/platform/idea/cmd/system/TransferController');

export default class ShipRegister extends RegistrarMixin(Idea) {
  static fieldMeta: FieldMeta = {
    government: { persistent: true, authorable: true },
  };

  /** ⭐ The polity whose register this is — the flag its ships fly. */
  protected government = '';

  public getGovernmentKey(): string {
    return this.government;
  }
  public setGovernment(value: string): void {
    this.government = typeof value === 'string' ? value : '';
  }

  /** A register is the book itself; nothing here is cached, so eviction only costs a re-resolve — vetoed as the herdbook's is. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'a ship register is the register itself' };
  }

  /* ───────────── names and paths ───────────── */

  /** ⭐ The slug a name is filed under — what makes it unique here. `''` for a name with no letters. */
  public slugOf(name: string): string {
    return String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/^the\s+/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** The document path a name is filed at, or `''` for an unfileable name. */
  public pathOf(name: string): string {
    const slug = this.slugOf(name);
    return slug === '' ? '' : `${this.getRegisterPrefix()}/${slug}`;
  }

  /** Is `path` inside this register's own branch? (the boundary every read checks) */
  private isOwnPath(path: string): boolean {
    const prefix = this.getRegisterPrefix();
    return prefix !== '' && path.startsWith(`${prefix}/`);
  }

  /* ───────────── reads ───────────── */

  /** Every entry in this register. Rows outside its branch, or of another kind, are dropped. */
  public async entries(): Promise<ShipEntry[]> {
    const prefix = this.getRegisterPrefix();
    if (prefix === '') return [];
    const out: ShipEntry[] = [];
    for (const doc of await DocumentApi.list(prefix)) {
      if (!this.isOwnPath(doc.getPath()) || doc.getKind() !== SHIP_ENTRY_KIND) continue;
      const entry = this.parseEntry(doc.getData());
      if (entry !== null) out.push(entry);
    }
    return out;
  }

  /** The entry filed under `name`, or `null`. */
  public async entryNamed(name: string): Promise<ShipEntry | null> {
    const path = this.pathOf(name);
    if (path === '') return null;
    const doc = await DocumentApi.read(path);
    if (doc === null || !this.isOwnPath(doc.getPath()) || doc.getKind() !== SHIP_ENTRY_KIND) return null;
    return this.parseEntry(doc.getData());
  }

  /** Is `name` already taken in this register? (a name with no letters is never available) */
  public async isNameTaken(name: string): Promise<boolean> {
    if (this.slugOf(name) === '') return true;
    return (await this.entryNamed(name)) !== null;
  }

  /**
   * ⭐ The managing owner (P12), derived: the holder of more than half the
   * shares, else the largest holding, ties to the earliest entered. `null`
   * for an entry nobody holds.
   */
  public managingOwnerOf(entry: ShipEntry): ShareHolder | null {
    let best: ShareHolding | null = null;
    for (const h of entry.shares) {
      if (h.shares <= 0) continue;
      if (h.shares > SHARES_PER_SHIP / 2) return { ...h.holder };
      if (best === null || h.shares > best.shares) best = h;
    }
    return best === null ? null : { ...best.holder };
  }

  /* ───────────── filing ───────────── */

  /**
   * ⭐ Enter a ship (P14): refused in words when the name is taken here or
   * files nowhere. The ship herself calls it, about herself — and she
   * knows whether she is in a register already (her own `shipRegister`),
   * so this book never searches itself for her handle.
   *
   * @throws when the entry is malformed (the shares do not come to
   *   sixty-four) — an authoring or caller error, never a refusal.
   */
  @CallSecurity(FromTheShipItself)
  public async enter(entry: Omit<ShipEntry, 'flag' | 'registeredAtS'> & Partial<Pick<ShipEntry, 'registeredAtS'>>): Promise<string | null> {
    if (!entry.key || !entry.kind) throw new Error(`ShipRegister.enter: an entry names her kind and her handle (got ${JSON.stringify(entry)})`);
    const total = entry.shares.reduce((n, h) => n + h.shares, 0);
    if (total !== SHARES_PER_SHIP || entry.shares.some((h) => !(h.shares > 0) || !h.holder?.path)) {
      throw new Error(`ShipRegister.enter: her shares come to ${total}, not ${SHARES_PER_SHIP}, or name nobody`);
    }
    const path = this.pathOf(entry.name);
    if (path === '') return 'A ship is entered under a name with letters in it.';
    if (await this.isNameTaken(entry.name)) return `There is a ship named ${entry.name.trim()} in the register already.`;
    const filed: ShipEntry = {
      name: entry.name.trim(),
      kind: entry.kind,
      key: entry.key,
      flag: this.government,
      shares: entry.shares.map((h) => ({ holder: { ...h.holder }, shares: h.shares })),
      registeredAtS: entry.registeredAtS ?? WorldClockApi.getNow().rawValue(),
      house: entry.house ?? '',
    };
    await this.write(filed);
    return null;
  }

  /**
   * ⭐ Move `n` shares of the ship entered as `name` from `from` to `to`
   * (P15) — refused in words when `from` does not hold that many. The
   * register is written once, whole; a holding that falls to nothing
   * comes off. Only the `transfer` verb calls it.
   */
  @CallSecurity(FromTheTransfer)
  public async transferShares(name: string, from: ShareHolder, to: ShareHolder, n: number): Promise<ShareTransferResult> {
    const entry = await this.entryNamed(name);
    if (entry === null) return { ok: false, reason: 'She is not in this register.' };
    if (!Number.isInteger(n) || n <= 0 || n > SHARES_PER_SHIP) {
      return { ok: false, reason: `A share is a sixty-fourth: name a whole number from 1 to ${SHARES_PER_SHIP}.` };
    }
    if (from.path === to.path && from.kind === to.kind) return { ok: false, reason: 'Shares cannot change hands with their own holder.' };
    const held = entry.shares.find((h) => this.sameHolder(h.holder, from));
    if (!held || held.shares < n) {
      return {
        ok: false,
        reason: held ? `Only ${held.shares} of her shares stand in that name.` : 'That name holds none of her shares.',
      };
    }
    held.shares -= n;
    const into = entry.shares.find((h) => this.sameHolder(h.holder, to));
    if (into) into.shares += n;
    else entry.shares.push({ holder: { ...to }, shares: n });
    entry.shares = entry.shares.filter((h) => h.shares > 0);
    await this.write(entry);
    return { ok: true, entry };
  }

  /** Write an entry at its path — through the register transport, as this register. */
  private async write(entry: ShipEntry): Promise<void> {
    const path = this.pathOf(entry.name);
    if (path === '') throw new Error(`ShipRegister: '${entry.name}' files nowhere`);
    await DocumentApi.saveToRegister(this as unknown as Stuff & Registrar, path, { ...entry } as unknown as Record<string, unknown>);
  }

  /** Two share-holders are the same holder. */
  private sameHolder(a: ShareHolder, b: ShareHolder): boolean {
    return a.kind === b.kind && a.path === b.path;
  }

  /** Parse a stored payload into an entry, or `null` when it is not one. */
  private parseEntry(data: unknown): ShipEntry | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    if (typeof d.name !== 'string' || d.name === '' || typeof d.key !== 'string' || d.key === '') return null;
    const shares: ShareHolding[] = [];
    if (Array.isArray(d.shares)) {
      for (const raw of d.shares as Array<Record<string, unknown>>) {
        const h = raw?.holder as Record<string, unknown> | undefined;
        const n = Number(raw?.shares);
        if (!h || (h.kind !== 'player' && h.kind !== 'organization') || typeof h.path !== 'string' || !(n > 0)) continue;
        shares.push({
          holder: { kind: h.kind, path: h.path, ...(typeof h.name === 'string' && h.name !== '' ? { name: h.name } : {}) },
          shares: n,
        });
      }
    }
    return {
      name: d.name,
      kind: typeof d.kind === 'string' ? d.kind : d.key,
      key: d.key,
      flag: typeof d.flag === 'string' ? d.flag : '',
      shares,
      registeredAtS: typeof d.registeredAtS === 'number' ? d.registeredAtS : 0,
      house: typeof d.house === 'string' ? d.house : '',
    };
  }
}
