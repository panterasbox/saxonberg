/**
 * BuildingWarren — **the generic elastic apartment building** (residences
 * D3/D12): the shared holdings + circulation base one cardinality up
 * from the dorm — a Warren whose member is a multi-room UNIT (a keyed
 * {@link HoldingWarren} instance), fully data-driven: the lobby, the
 * corridor row, the unit programme, the linear plan and the capacity
 * dial are all authored fields, so a second building anywhere — or the
 * future SHOP unit under a `commercial` land use — is a row, never a
 * class. Nothing here keys on `residential`.
 *
 * Circulation = corridors stacked off the lobby (the dorm shape); unit
 * doors = {@link FrontDoorExit} (`unit-<pos>` off the corridor, keyway
 * off the durable parcel row); the slot grammar is `f<floor>-u<pos>` (a
 * distinct `u` leaf so dorm tooling never misreads a unit extent).
 */

import { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import FrontDoorExit from './FrontDoorExit';
import UpstairsExit from './UpstairsExit';
import HoldingWarren from './HoldingWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

const BuildingWarrenBase = SingletonMixin(PostRegistrationMixin(OuterWarren));

export default class BuildingWarren extends BuildingWarrenBase {
  static fieldMeta: FieldMeta = {
    ...OuterWarren.fieldMeta,
    programmePath: { persistent: true, authorable: true, authorPicker: 'Template' },
    corridorTemplate: { persistent: true, authorable: true, authorPicker: 'Template' },
    lobbyPath: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /** The unit programme row every leased unit is a keyed instance of. */
  public programmePath: string = '';

  /** The corridor row every minted floor clones from. */
  public corridorTemplate: string = '';

  /** The building's authored ground-floor landing. */
  public lobbyPath: string = '';

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public getProgrammePath(): string {
    return this.programmePath;
  }

  public setProgrammePath(value: string): void {
    this.programmePath = value;
  }

  public getCorridorTemplate(): string {
    return this.corridorTemplate;
  }

  public setCorridorTemplate(value: string): void {
    this.corridorTemplate = value;
  }

  public getLobbyPath(): string {
    return this.lobbyPath;
  }

  public setLobbyPath(value: string): void {
    this.lobbyPath = value;
  }

  /**
   * On warm: rebuild the caches from the durable slot set and install
   * the lobby's `up` stair, so the building reconstitutes from just the
   * parcel rows.
   *
   * @hook
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister?.(context);
    try {
      await this.refreshProvisioned();
      await this.installLobbyUpExit();
    } catch (err) {
      console.warn(
        `BuildingWarren(${this.getTemplatePath()}): warm failed:`,
        err,
      );
    }
  }

  // ─────────────── OuterWarren policy hooks ─────────────────────

  /** Stand one unit up whole: the keyed programme, woken (D16). */
  protected async standUpHolding(key: string): Promise<MemberStuff> {
    if (!this.programmePath) {
      throw new Error(
        `BuildingWarren(${this.getTemplatePath()}): no programmePath authored`,
      );
    }
    const programme = await StuffApi.clone<MemberStuff>(this.programmePath);
    this.addMember(programme);
    await PersistableApi.restoreOrSeed(programme, key);
    await (programme as unknown as { wake(): Promise<void> }).wake();
    return programme;
  }

  /** Every minted floor is a corridor clone. */
  protected circulationTemplateFor(): string | null {
    return this.corridorTemplate || null;
  }

  /** Wire a fresh corridor into the stairwell: `down` to the floor
   *  below (the lobby for f1), and this floor's `up` stair. */
  protected async wireCirculationNode(
    nodeId: string,
    corridor: MemberStuff,
  ): Promise<void> {
    const n = Number(nodeId.slice(nodeId.lastIndexOf(':') + 1));
    if (!MixinApi.isExitable(corridor)) return;
    const corrEx = corridor as ExitableContainer;

    const below = n === 1 ? await this.lobby() : await this.ensureNode(`main:${n - 1}`);
    if (below && MixinApi.isExitable(below) && !corrEx.getExit('down')) {
      const down = StuffApi.createSync(
        () =>
          new Exit({
            direction: 'down',
            source: corridor,
            destination: below as ExitableContainer,
            keepLiveDestination: true,
            oneWay: true,
          }),
      );
      await corrEx.addExit(down);
    }
    if (!corrEx.getExit('up')) {
      const up = StuffApi.createSync(
        () =>
          new UpstairsExit(
            corridor,
            this,
            `main:${n + 1}`,
            this.corridorTemplate,
          ),
      );
      await corrEx.addExit(up);
    }
  }

  /** The unit's locked front door — `unit-<pos>` off its corridor,
   *  eager on the programme's entry ROW (D17). */
  protected async entryEdgeFor(
    key: string,
    corridor: ExitableContainer,
  ): Promise<Exit | null> {
    const m = /f(\d+)-u(\d+)$/.exec(key);
    if (!m) return null;
    const dir = `unit-${m[2]}`;
    const existing = corridor.getExit(dir);
    if (existing) return existing as unknown as Exit;
    const entryRow = await HoldingWarren.entryRowOf(this.programmePath);
    const door = StuffApi.createSync(
      () => new FrontDoorExit(corridor, this, key, dir, entryRow),
    );
    await corridor.addExit(door);
    return door as unknown as Exit;
  }

  /** Wire the unit's way OUT: the entry room's `out` back to its
   *  floor's corridor. */
  protected override async wireHubExit(holding: MemberStuff): Promise<void> {
    const entry = this.entryRoomOf(holding);
    const key = (
      holding as unknown as { getPersistenceKey(): string | null }
    ).getPersistenceKey?.();
    if (!key || !MixinApi.isExitable(entry)) return;
    const node = this.getPlatPlan().nodeOfSlot(key.slice(key.lastIndexOf('/') + 1));
    if (!node) return;
    const corridor = await this.ensureNode(node);
    if (!corridor) return;
    const entryEx = entry as ExitableContainer;
    if (entryEx.getExit('out')) return;
    const out = StuffApi.createSync(
      () =>
        new Exit({
          direction: 'out',
          source: entry,
          destination: corridor as ExitableContainer,
          keepLiveDestination: true,
          oneWay: true,
        }),
    );
    await entryEx.addExit(out);
  }

  // ─────────────── Warren policy hooks ────────────────────────────

  protected async createMember(): Promise<MemberStuff> {
    throw new Error('BuildingWarren stands holdings up via admit');
  }

  public async admitArrival(): Promise<void> {
    /* buildings don't population-bud */
  }

  protected attachmentFor(): { direction: string } {
    return { direction: 'out' };
  }

  protected async wireHostFixtures(): Promise<void> {
    /* the lobby is authored, not a host */
  }

  protected async unwireHostFixtures(): Promise<void> {
    /* no-op */
  }

  // ─────────────────── private helpers ────────────────────────────

  private async lobby(): Promise<ExitableContainer | null> {
    if (!this.lobbyPath) return null;
    const lobby = await StuffApi.singleton<Stuff>(this.lobbyPath);
    return MixinApi.isExitable(lobby) && MixinApi.isContainer(lobby)
      ? (lobby as ExitableContainer)
      : null;
  }

  private async installLobbyUpExit(): Promise<void> {
    const lobby = await this.lobby();
    if (!lobby || lobby.getExit('up')) return;
    const up = StuffApi.createSync(
      () => new UpstairsExit(lobby, this, 'main:1', this.corridorTemplate),
    );
    await lobby.addExit(up);
  }
}
