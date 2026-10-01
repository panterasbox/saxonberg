/**
 * LineAccess — ⭐ **where a person reaches the line**: a pole (overhead) or a
 * manhole (buried).
 *
 * A row only where content wants the line reachable — most of a feeder runs
 * where nobody stands (the forestry four-representations rule). It cites the
 * feeder `nodeRef` it stands on, affords `sever`/`splice` there, and — if it is
 * **overhead** — answers a storm by rolling `energy.stormFaultRate` and cutting
 * its node. A **buried** manhole answers a storm with nothing: storm-safe by
 * construction, and dig-to-reach is its cost.
 *
 * ⚠ `fixedInPlace` — a pole is not carried off. `_materialPath` is stated on the
 * row (lint:mass); the whole thing is one piece of iron or timber.
 *
 * See [docs/subsystems/energy.md].
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { StormExposed } from '@saxonberg/server/mud/lib/weather/WeatherType';
import type {
  SupplyReport,
  SupplyReporting,
} from '@saxonberg/server/mud/lib/supply/SupplyState';
import { SUPPLY_STATE_GLOSS } from '@saxonberg/server/mud/lib/supply/SupplyState';
import GridCatalogue, { GRID_CATALOGUE_PATH } from '../idea/GridCatalogue';

/** The verbs a pole affords, environment + peers (the `CharcoalPit` shape). */
const LINE_VERBS = [
  'system/energy/cmd/energy/sever.yaml',
  'system/energy/cmd/energy/splice.yaml',
];

const LineAccessBase = PostRegistrationMixin(Thing);

export default class LineAccess
  extends LineAccessBase
  implements StormExposed, SupplyReporting
{
  static commandContributions: CommandContributions = {
    environment: LINE_VERBS,
    peers: LINE_VERBS,
  };

  static fieldMeta: FieldMeta = {
    nodeRef: { persistent: true, authorable: true },
    buried: { persistent: true, authorable: true },
  };

  /** The feeder node this access point sits on (`terminus-main:avenue`). */
  public nodeRef: string = '';

  /** Buried (a manhole) vs overhead (a pole, the default). */
  public buried: boolean = false;

  private _catalogue: GridCatalogue | null = null;

  public constructor() {
    super();
    this.fixedInPlace = true;
  }

  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    try {
      // Cache the ref only — do NOT warm the compile here. A pole is propped in
      // a feeder-node street the compile stands up; warming during that street's
      // boot hydration compiles before the exits are ready and caches a broken
      // grid. The compile runs lazily, post-install, on the first real read.
      this._catalogue = (await StuffApi.singleton(
        GRID_CATALOGUE_PATH,
      )) as unknown as GridCatalogue;
    } catch {
      this._catalogue = null;
    }
  }

  public getNodeRef(): string {
    return this.nodeRef;
  }

  private catalogue(): GridCatalogue | null {
    if (this._catalogue !== null) return this._catalogue;
    const cat = StuffApi.findByTemplatePath(GRID_CATALOGUE_PATH) as
      | GridCatalogue
      | null;
    this._catalogue = cat;
    return cat;
  }

  /** Cut the line here — the lineman's `sever` and the storm's fault. */
  public sever(): void {
    if (this.nodeRef) this.catalogue()?.sever(this.nodeRef);
  }

  /** Splice the line here back together — the lineman's `splice`. */
  public splice(): void {
    if (this.nodeRef) this.catalogue()?.splice(this.nodeRef);
  }

  /** Is this access point's node currently cut? */
  public isCut(): boolean {
    return this.nodeRef !== '' && (this.catalogue()?.isCut(this.nodeRef) ?? false);
  }

  // ── StormExposed ──

  /**
   * A storm over the scope this stands in. An overhead pole rolls
   * `energy.stormFaultRate` and severs on a hit; a buried manhole answers
   * nothing. Presence-gated by the fan-out (`WeatherLogic.runStormFanout`).
   */
  public onStormExposure(_nowS: number): void {
    if (this.buried || this.nodeRef === '') return;
    if (Math.random() < faultRate()) this.sever();
  }

  // ── SupplyReporting ──

  public async supplyReport(_nowS: number): Promise<SupplyReport> {
    const cat = this.catalogue();
    const state = cat && this.nodeRef ? await cat.supplyStateAt(this.nodeRef) : null;
    return {
      label: this.buried ? 'the buried line here' : 'the overhead line here',
      state,
      lines: [
        state === null
          ? 'The line is live.'
          : `The line is down: ${SUPPLY_STATE_GLOSS[state]}.`,
      ],
    };
  }

  // ── detail ──

  /**
   * ⭐ The line's live/cut state, appended to the pole's `look` description via
   * a `markupAugmenter` (the Floor/Weapon shape) — the hook that reaches the
   * OBJECT's card. A `getDetail` override does NOT: it only answers a
   * `look <pole>.<sub-detail>`, which a top-level `look pole` never takes, so
   * the state never rendered. (The ElectricLight twin of this, both found by
   * the live browser drive.)
   */
  static markupAugmenters: MarkupAugmenter[] = [lineAccessStateAugmenter];

  /** The live state sentence, read off the host. */
  public stateLine(): string {
    return this.isCut()
      ? 'The line here is cut — the wire hangs dead.'
      : 'The line here is live.';
  }
}

/** Append the line's live/cut state to a pole/manhole's `look` description. */
function lineAccessStateAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!(host instanceof LineAccess)) return text;
  const line = host.stateLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** The storm fault rate for an overhead line, from the dial (0 = never). */
function faultRate(): number {
  try {
    const raw = Number(AppApi.setting(AppSettingKeys.energyStormFaultRate));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}
