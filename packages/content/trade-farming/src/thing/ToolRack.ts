/**
 * ToolRack — ⭐⭐ **the farm's tools live here, and they come back.**
 *
 * A yard that hands you a spade once is a yard that works for exactly one
 * person. The campus farm shipped its spade, kit, scythe and plough as
 * `props:` — *initial furnishing*, laid down once at the room's birth and
 * deliberately never topped up, because the same mechanism fills a crate
 * with grapefruits and *"a content edit is not a faucet."* So the first
 * player to pocket the four tools owned the college's entire tool set and
 * nobody else could farm. Found by driving it twice.
 *
 * ## ⭐ It RECLAIMS; it does not mint to par
 *
 * `Stock.reset()` — the only other consumer of the repop sweep — tops
 * each line back to par by cloning, and that is right for a shop because
 * a shop is gated by money. A farmyard is not, so minting to par would be
 * a free-spade faucet with a two-minute cycle.
 *
 * The rule here is the one the fiction already has: **the college owns
 * four tools, and they end up back in the yard.**
 *
 *  1. a tracked tool lying loose in a room goes back on the rack —
 *     somebody left it in the field;
 *  2. a tracked tool **in somebody's hands is left alone**, because they
 *     are using it and a rack that snatches a scythe mid-swathe is worse
 *     than no rack;
 *  3. a tool is replaced **only when its instance no longer exists** —
 *     destroyed, or carried off by a character who is gone.
 *
 * ⚠ Rule 2 is what makes this not a faucet: a carried tool is still
 * tracked and still alive, so nothing is minted to replace it. The one
 * way to get a second spade out of the college is to make the first one
 * cease to exist, which is not an exploit, it is a purchase the college
 * made because somebody lost its spade.
 *
 * ⭐ And a fixture, so the rack itself cannot be pocketed — which would
 * otherwise be the obvious way around all of this.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { FixtureMixin } from '@saxonberg/server/mud/lib/stuff/Fixture';
import { ResettableMixin } from '@saxonberg/server/mud/lib/residency/Resettable';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const ToolRackBase = PostRegistrationMixin(
  ResettableMixin(FixtureMixin(DetailedMixin(Thing))),
);

export default class ToolRack extends ToolRackBase {
  static fieldMeta: FieldMeta = {
    toolRows: { persistent: true, authorable: true },
    _lent: { persistent: true, runtimeState: true },
  };

  /** The template paths of the tools this rack is responsible for. */
  protected toolRows: string[] = [];

  /**
   * Ids of the tools this rack has put into the world — **its own** and
   * nobody else's.
   *
   * ⚠ Scoping by id rather than by template path is load-bearing: a
   * second farm ships its own rack and its own spade off the same row,
   * and a rack that reclaimed *"any live `/trade/farming/thing/spade`"*
   * would teleport the neighbour's spade out of their field.
   */
  public _lent: string[] = [];

  public getToolRows(): readonly string[] { return this.toolRows; }
  public setToolRows(value: string[]): void {
    this.toolRows = Array.isArray(value) ? value.filter((r) => !!r) : [];
  }

  /**
   * Hang the tools the first time the yard comes up, then let the repop
   * sweep maintain them — the `Stock` shape (*boot-stock to par, then the
   * sweep keeps it there*), with this rack's reclaim rule in place of
   * par.
   *
   * @hook
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    await this.reset();
  }

  /**
   * ⚠ Never while somebody is standing there. Tools sliding back onto a
   * rack in front of a player reads as the room correcting them; the
   * sweep's default (skip a watched room) is the right manners here, and
   * the farm is empty often enough for it to catch up.
   */
  public override resetsWhilePresent(): boolean {
    return false;
  }

  /** @hook Invoked by the game-time reset sweep. See the class docstring. */
  public override async reset(): Promise<void> {
    const self = this as unknown as Stuff & { getContainer(): Stuff | null };
    const yard = self.getContainer();
    if (!yard || !MixinApi.isContainer(yard)) return;

    const liveRows = new Set<string>();
    const stillLent: string[] = [];

    for (const id of this._lent) {
      const tool = StuffApi.findById(id);
      if (!tool) continue; // gone: it will be replaced below
      stillLent.push(id);
      liveRows.add(tool.getTemplatePath() ?? '');
      if (!MixinApi.isContainable(tool)) continue;
      const holder = tool.getContainer();
      // In the yard already, or in somebody's hands — leave it.
      if (holder === (yard as unknown as Stuff)) continue;
      if (holder !== null && MixinApi.isOrganism(holder)) continue;
      ContainmentApi.move(tool, yard as Stuff & Container);
    }

    // ⭐⭐ **Adopt before minting.** The yard's `props:` still lay the
    // tools down at its birth — that is exactly what initial furnishing
    // is for, and it is the only thing that works at that moment: a prop
    // is cloned BEFORE it is moved, so this rack has no container yet
    // when its own `postRegister` runs and has nowhere to hang anything.
    //
    // So the rack takes responsibility for what it finds beside it. A
    // tool of a declared row lying in the yard and tracked by nobody is
    // this rack's tool from now on. It also means an already-running
    // world adopts its tools on the first sweep rather than minting a
    // second set beside them.
    const tracked = new Set(stillLent);
    for (const item of yard.getContents()) {
      const row = (item as unknown as Stuff).getTemplatePath() ?? '';
      if (!this.toolRows.includes(row)) continue;
      if (liveRows.has(row)) continue;
      const id = (item as unknown as Stuff).stuffId;
      if (tracked.has(id)) continue;
      stillLent.push(id);
      tracked.add(id);
      liveRows.add(row);
    }

    for (const row of this.toolRows) {
      if (liveRows.has(row)) continue;
      try {
        const tool = await StuffApi.clone<Stuff & Containable>(row);
        ContainmentApi.move(tool, yard as Stuff & Container);
        stillLent.push((tool as unknown as Stuff).stuffId);
      } catch {
        // ⚠ A row that names nothing is an authoring mistake for
        // `lint:census` to catch, not a reason to abandon the sweep.
      }
    }

    this._lent = stillLent;
  }
}
