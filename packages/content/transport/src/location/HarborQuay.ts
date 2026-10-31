/**
 * HarborQuay — ⭐ **a quay the harbor keeps a book for** (harbors P7): a
 * public waterfront (`Quay`) where a ship comes alongside only at the
 * berth the harbormaster gave her, and is in the harbor's book while she
 * lies there.
 *
 * It answers the kernel's `BerthKeeper` protocol — the only way the ship
 * reaches the harbor — by asking its `Harbor` (`harbor:`, the port's
 * row): `admit` before her course is laid, `madeFast` as her lines go
 * ashore, `clearance` before she leaves, `release` as she casts off.
 * Every quay a ship can be left at owes dues to some book: a river's
 * public landing that does not compose this keeps first-come.
 */

import Quay from '@saxonberg/server/mud/platform/location/Quay';
import { BerthKeeperMixin } from '@saxonberg/server/mud/lib/expanse/BerthKeeper';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Harbor from '../idea/Harbor';

export default class HarborQuay extends BerthKeeperMixin(Quay) {
  static fieldMeta: FieldMeta = {
    harbor: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** The port whose book this quay is in, by row path. */
  protected harbor: string | null = null;

  public getHarbor(): string | null { return this.harbor; }
  public setHarbor(v: string | null): void { this.harbor = typeof v === 'string' && v !== '' ? v : null; }

  /** Its harbor, loaded — the book is kept there. */
  public async liveHarbor(): Promise<Harbor | null> {
    if (this.harbor === null) return null;
    const h = await StuffApi.singleton<Stuff>(this.harbor).catch(() => null);
    return h instanceof Harbor ? h : null;
  }

  private place(): string {
    return this.getTemplatePath() ?? '';
  }

  public override async admit(ship: Stuff, nowS: number): Promise<string | null> {
    const harbor = await this.liveHarbor();
    return harbor === null ? 'Nobody keeps this quay; she cannot be given a berth here.' : harbor.admit(ship, this.place(), nowS);
  }

  public override async madeFast(ship: Stuff, nowS: number): Promise<void> {
    (await this.liveHarbor())?.madeFast(ship, this.place(), nowS);
  }

  public override async clearance(ship: Stuff, nowS: number): Promise<string | null> {
    const harbor = await this.liveHarbor();
    return harbor === null ? null : harbor.clearance(ship, nowS);
  }

  public override async release(ship: Stuff, nowS: number): Promise<void> {
    (await this.liveHarbor())?.release(ship, nowS);
  }

  /** ⭐ A hail for this quay is answered at its harbor's office (A3). */
  public override async hailedAt(): Promise<string | null> {
    return (await this.liveHarbor())?.getOffice() ?? null;
  }

  /** ⭐ The berth's depth is the harbor's posted fact (P20) — read while the book is loaded. */
  public override berthDepthM(): number | null {
    if (this.harbor === null) return null;
    const h = StuffApi.findByTemplatePath<Stuff>(this.harbor);
    return h instanceof Harbor ? h.berthDepthOf(this.place()) : null;
  }
}
