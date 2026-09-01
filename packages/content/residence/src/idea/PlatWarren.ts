/**
 * PlatWarren — **how titled ground becomes a place**: the provisioning
 * half of selling land, REWORKED onto the shared holdings +
 * circulation base (residences wave 5, through the very `@hook` swap
 * seam the smallholding build designed for a provisioning-model
 * change).
 *
 * What changed (D16/D17): a sold lot no longer mints ONE rowless yard —
 * it stands up a keyed, multi-room house through the subdivision's
 * {@link HoldingWarren} row (`programmePath`), every room a keyed
 * instance of a REAL row `(scope = the row, key = <lotExtent>/<leaf>)`.
 * The old `identityFor` mint and the `asIdentityPath` channel are GONE.
 * Circulation comes from the plat plan (D13): the authored lane is the
 * plan's authored segment; reaches beyond it are minted road-segment
 * clones that stand as frontage sells and reap outside-in; the court
 * branch is a road off a segment.
 *
 * {@link PlatBook} is the catalogue half; the sale chokepoint
 * (`TitleController`) calls `provision` + `ensureGate` exactly as
 * before — the designed swap seam, swapped.
 */

import { OuterWarren } from "@saxonberg/server/mud/lib/location/OuterWarren";
import { SingletonMixin } from "@saxonberg/server/mud/lib/stuff/Singleton";
import { PostRegistrationMixin } from "@saxonberg/server/mud/lib/stuff/PostRegistration";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { NavigationApi } from "@saxonberg/server/mud/api/navigation";
import { PersistableApi } from "@saxonberg/server/mud/api/persistable";
import Exit from "@saxonberg/server/mud/lib/boundary/Exit";
import LotGateExit from "./LotGateExit";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Exitable } from "@saxonberg/server/mud/lib/boundary/Exitable";
import type { VetoResult } from "@saxonberg/server/mud/lib/errors";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

const PlatWarrenBase = SingletonMixin(PostRegistrationMixin(OuterWarren));

export default class PlatWarren extends PlatWarrenBase {
  static fieldMeta: FieldMeta = {
    ...OuterWarren.fieldMeta,
    programmePath: { persistent: true, authorable: true, authorPicker: 'Template' },
    roadTemplate: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /**
   * The {@link HoldingWarren} row a sold lot's house is a keyed
   * instance of — the floorplan, the tenure term, the shell clock.
   */
  public programmePath: string = "";

  /**
   * The road-segment row a MINTED circulation reach clones from ("the
   * road peters out into stakes and grass"). The plan's authored
   * segments (the lane) resolve their own singletons instead.
   */
  public roadTemplate: string = "";

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  public getProgrammePath(): string {
    return this.programmePath;
  }

  public setProgrammePath(value: string): void {
    this.programmePath = value;
  }

  public getRoadTemplate(): string {
    return this.roadTemplate;
  }

  public setRoadTemplate(value: string): void {
    this.roadTemplate = value;
  }

  /**
   * Re-hang a gate for every lot that has already sold (the boot
   * re-hang, now node-aware: an authored-lane lot's gate hangs on the
   * lane; a farther lot's road reach stands first). Failures are
   * logged, never thrown — a subdivision that will not wire must not
   * take the locality down with it.
   *
   * @hook
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    if (!this.getParentExtent()) return;
    try {
      await this.refreshProvisioned();
      for (const key of await this.provisionedKeys()) {
        await this.ensureGate(key);
      }
    } catch (err) {
      console.warn(
        `PlatWarren(${this.getTemplatePath()}): boot gate re-hang failed:`,
        err,
      );
    }
  }

  /** The provisioned lot keys, off the durable slot set (sync cache). */
  private async provisionedKeys(): Promise<string[]> {
    const { ParcelApi } = await import("@saxonberg/server/mud/api/parcel");
    const children = await ParcelApi.childParcelsOf(this.getParentExtent());
    return children.map((c) => c.getExtent());
  }

  /** The next free slot leaf under the plan (the book's listing read). */
  public nextFreeLeaf(taken: ReadonlySet<string>): string | null {
    return this.getPlatPlan().nextFreeSlot(taken, this.capacity());
  }

  /**
   * The live house for `lotExtent`, stood up if needed, plus whether
   * this was a FIRST provisioning (`true`) or a re-entry to ground
   * already worked.
   *
   * The override point for a different provisioning model — the
   * designed `@hook` — now standing up the keyed programme (D16).
   * Refuses over the operator's capacity (D10), reason named.
   *
   * @hook
   */
  public async provision(
    lotExtent: string,
  ): Promise<{ room: Stuff; firstTime: boolean }> {
    await this.refreshProvisioned();
    const live = this.holdingFor(lotExtent);
    if (!live) {
      const cap = this.assertBelowCap();
      // A lot that is already PROVISIONED (its parcel row exists) may
      // always re-enter; the cap gates NEW ground only.
      if (!cap.ok && !(await this.isProvisioned(lotExtent))) {
        throw new Error(`PlatWarren.provision refused — ${cap.reason}`);
      }
    }
    const firstTime = !(await PersistableApi.hasRecord(
      this.programmePath,
      lotExtent,
    ));
    const room = await this.admit(lotExtent);
    return { room, firstTime };
  }

  private async isProvisioned(lotExtent: string): Promise<boolean> {
    return (await this.provisionedKeys()).includes(lotExtent);
  }

  /**
   * Hang this lot's gate on its circulation node (idempotent). The
   * node's road reach stands first (authored lane → its singleton;
   * beyond → minted road-segment clones back to the entrance). A
   * no-op when the plan does not place the lot.
   */
  public async ensureGate(lotExtent: string): Promise<void> {
    const leaf = leafOf(lotExtent);
    const node = this.getPlatPlan().nodeOfSlot(leaf);
    if (!node) return;
    // Losing the way in is a smaller failure than losing the title: a
    // street that will not stand or wire is logged, never thrown into
    // the sale (the shipped PlatWarren doctrine, kept).
    try {
      await this.ensureNode(node);
      await this.ensureEntry(lotExtent);
    } catch (err) {
      console.warn(
        `PlatWarren(${this.getTemplatePath()}): gate for ${lotExtent} ` +
          `could not hang:`,
        err,
      );
    }
  }

  /** The live house's entry room for a lot (if standing), or null. */
  public liveRoomFor(lotExtent: string): Stuff | null {
    const holding = this.holdingFor(lotExtent);
    return holding ? this.entryRoomOf(holding) : null;
  }

  // ─────────────── OuterWarren policy hooks ─────────────────────

  /** Stand one house up whole: the keyed programme, woken (D16). */
  protected async standUpHolding(key: string): Promise<MemberStuff> {
    if (!this.programmePath) {
      throw new Error(
        `PlatWarren(${this.getTemplatePath()}): no programmePath authored`,
      );
    }
    const programme = await StuffApi.clone<MemberStuff>(this.programmePath);
    this.addMember(programme);
    await PersistableApi.restoreOrSeed(programme, key);
    await (programme as unknown as { wake(): Promise<void> }).wake();
    return programme;
  }

  /** A minted road reach clones the road-segment row. */
  protected circulationTemplateFor(): string | null {
    return this.roadTemplate || null;
  }

  /**
   * Wire a MINTED road reach to its predecessor on the route: along a
   * road the reaches run in line (`west` onward, `east` back toward the
   * entrance); at a FORK the onward direction is the plat's authored
   * `branchesFrom.direction` and the way back is its inverse.
   *
   * ⚠ It used to use the branch ROAD'S KEY as the onward direction —
   * `hinkley-court`, which is not a direction. A CartesianLocation
   * refuses a non-cardinal exit into its own zone, and both reaches
   * clone the same road row, so they resolve to the same zone: the first
   * lot sold on a branch road threw as its reach was wired. Nothing
   * caught it because the kernel warren tests stub
   * `wireCirculationNode`, the pack tests build their street on plain
   * `Location` (no grid, no rule), and a branch is only reached once
   * every frontage before it has sold — the ninth lot at Hinkley.
   */
  protected async wireCirculationNode(
    nodeId: string,
    room: MemberStuff,
  ): Promise<void> {
    const plan = this.getPlatPlan();
    const pred = plan.predecessorOf(nodeId);
    if (!pred) return;
    const predRoom = await this.ensureNode(pred);
    if (!predRoom || !MixinApi.isExitable(predRoom)) return;
    if (!MixinApi.isExitable(room)) return;
    const onward = plan.onwardDirectionOf(nodeId);
    const back = NavigationApi.invertDirection(onward);
    if (!back) return;
    if ((predRoom as ExitableContainer).getExit(onward)) return;
    await (room as ExitableContainer).addBidirectionalExit(
      predRoom as ExitableContainer,
      back,
      { opposite: onward, keepLiveDestination: true },
    );
  }

  /** The lot's gate — a deferred `LotGateExit`, directioned by its
   *  leaf, eager on the programme's ENTRY ROW (D17: a real row). */
  protected async entryEdgeFor(
    key: string,
    circulation: ExitableContainer,
  ): Promise<Exit | null> {
    const direction = leafOf(key);
    const existing = circulation.getExit(direction);
    if (existing) return existing as unknown as Exit;
    const entryRow = await this.entryRowPath();
    const gate = StuffApi.createSync(
      () => new LotGateExit(circulation, this, key, direction, entryRow),
    );
    await circulation.addExit(gate);
    return gate as unknown as Exit;
  }

  /** The programme's entry-room ROW (the gate's eager face), cached. */
  private _entryRow: string | null = null;

  public async entryRowPath(): Promise<string> {
    if (this._entryRow) return this._entryRow;
    const { default: HoldingWarren } = await import('./HoldingWarren');
    this._entryRow = await HoldingWarren.entryRowOf(this.programmePath);
    return this._entryRow;
  }

  /** Wire the house's way OUT: the entry room's `south` back onto its
   *  lot's circulation node (the yard opens on the lane). */
  protected override async wireHubExit(holding: MemberStuff): Promise<void> {
    const entry = this.entryRoomOf(holding);
    const key = (
      holding as unknown as { getPersistenceKey(): string | null }
    ).getPersistenceKey?.();
    if (!key || !MixinApi.isExitable(entry)) return;
    const node = this.getPlatPlan().nodeOfSlot(leafOf(key));
    if (!node) return;
    let nodeRoom: MemberStuff | null = null;
    try {
      nodeRoom = await this.ensureNode(node);
    } catch (err) {
      console.warn(
        `PlatWarren(${this.getTemplatePath()}): way out for ${key} ` +
          `could not wire:`,
        err,
      );
      return;
    }
    if (!nodeRoom) return;
    const entryEx = entry as ExitableContainer;
    if (entryEx.getExit("south")) return;
    const out = StuffApi.createSync(
      () =>
        new Exit({
          direction: "south",
          source: entry,
          destination: nodeRoom as ExitableContainer,
          keepLiveDestination: true,
          oneWay: true,
        }),
    );
    await entryEx.addExit(out);
  }

  // ─────────────── Warren policy hooks ────────────────────────────

  protected async createMember(): Promise<MemberStuff> {
    throw new Error("PlatWarren stands holdings up via provision/admit");
  }

  public async admitArrival(): Promise<void> {
    /* lots don't population-bud */
  }

  protected attachmentFor(): { direction: string } {
    return { direction: "out" };
  }

  protected async wireHostFixtures(): Promise<void> {
    /* no host */
  }

  protected async unwireHostFixtures(): Promise<void> {
    /* no-op */
  }
}

function leafOf(extent: string): string {
  return extent.slice(extent.lastIndexOf("/") + 1);
}
