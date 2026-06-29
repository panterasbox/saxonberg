/**
 * AppBootstrap — orchestrates the full app boot sequence so
 * `index.ts` stays a thin entry point.
 *
 * Owns the dependency chain across the backend's prep systems:
 * Mongo connect → seeders → PM hooks → command YAML preload →
 * runtime-instance manifest. Each underlying manager keeps its
 * narrow scope (`SeederManager` seeds, `BootstrapManager` runs the
 * manifest, etc.); this class is just the sequencer.
 *
 * Throws on any step's failure; the entry point catches and exits.
 * Exit-code policy lives at the entry point, not here.
 */

import { PersistenceManager } from './PersistenceManager';
import { SeederManager } from './SeederManager';
import { EmoteSeeder } from './EmoteSeeder';
import { RecipeSeeder } from './RecipeSeeder';
import { ScriptSeeder } from './ScriptSeeder';
import { ChannelSeeder } from './ChannelSeeder';
import { TwitchRelayReader } from './TwitchRelayReader';
import { Application } from './Application';
import { AppSettingsSeeder } from './AppSettingsSeeder';
import { BootstrapManager } from './BootstrapManager';
import { CommandApi } from '../mud/api/command';
import { PackApi } from '../mud/api/pack';
import { WorldClockApi } from '../mud/api/worldclock';
import { AppSettings } from '../mud/lib/config/AppSettings';
import { RenownApi } from '../mud/api/renown';
import RenownStanding from '../mud/lib/standing/RenownStanding';
import { ConsumerApi } from '../mud/api/consumer';
import ParticipationStanding from '../mud/lib/standing/ParticipationStanding';
import { ProducerApi } from '../mud/api/producer';
import ProducerStanding from '../mud/lib/standing/ProducerStanding';
import { BankingApi } from '../mud/api/banking';
import { SocialApi } from '../mud/api/social';
import AccountBalance from '../mud/lib/banking/AccountBalance';
import SupplyAggregate from '../mud/lib/banking/SupplyAggregate';
import { Document } from '../mud/lib/persistence/Document';
import { StuffApi } from '../mud/api/stuff';
import type { Marshaller } from '../mud/lib/persistence/Marshaller';
// Side-effecting import: registers the live `online`/`world` provider
// so MQL queries against admin-tier seeds reflect connected
// interactives. Pulled in here (off the eager command/MqlApi chain)
// to avoid the `ConnectionApi → ConnectionManager → Interactive →
// Idea` load-time cycle. This is the one sanctioned reach into the
// mql/ pipeline from outside the facade: routing it through api/mql.ts
// would drag in the resolver chain and reintroduce that very cycle.
// eslint-disable-next-line no-restricted-imports -- documented cycle-avoidance; side-effecting provider registration that must bypass the facade's eager load chain
import '../mud/api/mql/online-wire';

export interface AppBootstrapConfig {
  /** Mongo connection URI. */
  mongoUri: string;
  /** Database name within the Mongo cluster. */
  dbName: string;
}

export class AppBootstrap {
  /**
   * Run the boot sequence in dependency order. Every step must
   * complete before the next begins; any failure throws and stops
   * boot.
   *
   * Sequence:
   *
   *   1. Mongo connect — every later step touches PM.
   *
   *   2. Seed templates from disk into `domain` (idempotent —
   *      existing docs are left alone). Runs FIRST after connect
   *      because PM.loadHooks below clones the DomainHook template
   *      out of `domain`, and the bootstrap manifest may reference
   *      other seeded templates too.
   *
   *   3. Load PM hooks (folder/leaf invariant on Collections.Domain,
   *      etc.) — clones the seeded hook templates and registers
   *      them with the persistence pipeline. Seeds must exist
   *      before this runs.
   *
   *      Controllers are not pre-loaded; dispatch clones a fresh
   *      one per command via `StuffApi.clone('/obj/command/<Name>')`.
   *
   *   4. Preload command YAMLs and resolve each `validators: [...]`
   *      spec into a live function. Validators are inert until this
   *      runs (`runValidators` early-returns on absent
   *      `_resolvedValidators`), so this MUST happen before the
   *      server accepts traffic.
   *
   *   5. Bootstrap runtime instances from the engine manifest.
   *      All prior steps must be complete; failures here prevent
   *      boot.
   */
  public static async run(config: AppBootstrapConfig): Promise<void> {
    // Wire the Document marshaller-resolution seam before any save/clone
    // path can run. Marshallers remain Idea-rooted Stuff (resolved via the
    // registry / singleton lazy-clone); Document stays free of a StuffApi
    // import and reaches them only through this seam.
    Document.setMarshallerResolver(
      (path) => StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(path),
      (path) => StuffApi.singleton<Marshaller<unknown, unknown>>(path)
    );

    console.info(`Connecting to MongoDB database '${config.dbName}'...`);
    await PersistenceManager.get().connect(config.mongoUri, config.dbName);
    console.info('MongoDB connection successful');

    await SeederManager.run();

    // Content packs — reconcile every shipped `@saxonberg/content-*` pack
    // into the DB (base-library: materials, biomes, quantity units;
    // species-and-names: the species/clade tree + char-gen name banks).
    // The installer is the
    // source-of-truth-is-the-file replacement for seeding the migrated
    // trees, AND folds in the former standalone `QuantityApi.loadTagTables`
    // call (the quantity content-kind). Writes rows only — nothing is live
    // yet (BootstrapManager clones later), so no re-hydrate at boot.
    //
    // Coexists with SeederManager (above): the installer only touches
    // `sourcePack`-stamped (or adopts-then-stamps) rows for paths its packs
    // ship; SeederManager is insert-only on the shrunken `seeds/` tree —
    // disjoint sets. Runs before `loadHooks` because the migrated content
    // (domain templates + quantity tables) is all pre-hooks content the
    // marshaller/`tag()` consumers and the DomainHook clone depend on.
    const packResults = await PackApi.install();
    for (const r of packResults) {
      console.info(
        `PackApi: '${r.packId}' installed — ` +
          `${r.inserted.length} inserted, ${r.updated.length} updated, ` +
          `${r.adopted.length} adopted, ${r.deleted.length} deleted, ` +
          `${r.quantityTables} quantity table(s), ${r.nameBanks} name bank(s)`
      );
    }

    await PersistenceManager.get().loadHooks();

    // Per-collection seeders. Insert-only / idempotent — match the
    // SeederManager pattern but target their own collections from a
    // single YAML each. Run after PM hooks (they touch the collection
    // chokepoint indirectly via Document.save) and before the
    // BootstrapManager runs the catalogue singletons that warm their
    // caches from these collections.
    await EmoteSeeder.run();
    await RecipeSeeder.run();
    await ScriptSeeder.run();
    await ChannelSeeder.run();
    await AppSettingsSeeder.run();

    const cmd = await CommandApi.preloadAll();
    if (cmd.failed.length > 0) {
      throw new Error(
        `CommandApi.preloadAll: ${cmd.failed.length} command(s) failed: ` +
          cmd.failed.join(', ')
      );
    }
    console.info(`CommandApi: ${cmd.loaded} command YAML(s) preloaded`);

    await BootstrapManager.run();

    // App settings — warm the synchronous read cache from the seeded
    // `app_settings` row (AppSettingsSeeder ran in the seeder block above)
    // before any consumer reads a setting; the evac path in
    // Container.cleanupOnDestruct cannot await. Warm-only (no seeding here)
    // — the values come from app-settings.yaml via the seeder. Awaits the
    // Document directly — no boot method on AppApi (runtime ops only).
    await AppSettings.warm();

    // World clock — restore the persisted game-time anchor (or seed a
    // zero clock on a fresh DB) and start its backstop. A sequencer
    // step like the others, with the lifecycle owned by the Api.
    // (It can't live inside BootstrapManager: that manager clones
    // Stuff from the manifest, and the clock state is a Document, not
    // a clonable template.)
    await WorldClockApi.boot();

    // Renown — warm the standing read-cache from the materialized
    // aggregate, then install the reaction ingestion tap + self-register
    // the real-time recompute schedule. Warm before boot so the first
    // `renownOf` reads are populated. Activation = the singleton's
    // presence; no consumer is wired this build.
    await RenownStanding.warm();
    RenownApi.boot();

    // Participation (the consumer-influence quantity faucet) — warm the
    // standing read-cache from the materialized aggregate, then install the
    // command-dispatch tap + self-register the recompute schedule. Warm
    // before boot so the first `participationOf` / consumer-standing reads
    // are populated. Reads renown (already booted above) for the projection.
    await ParticipationStanding.warm();
    ConsumerApi.boot();

    // Producer (the make faucet — the third influence stock) — warm the
    // standing read-cache, then install the command-dispatch engagement tap
    // (it reuses the consumer's signal; both taps assert the same
    // consumer+producer restrictSubscribe allowlist) + self-register the
    // recompute schedule. Engagement-only (reads no renown). Booted AFTER the
    // consumer so the shared signal's allowlist is asserted in a stable order.
    await ProducerStanding.warm();
    ProducerApi.boot();

    // Banking (the monetary substrate) — warm the account-balance read cache
    // and the single-row supply headline from their materialized rows, then
    // boot the logic singleton (the stable activation seam). Warm before boot
    // so the first `balanceOf` / `moneySupply` reads are populated; the
    // CentralBank singleton is cloned by the bootstrap manifest above.
    await AccountBalance.warm();
    await SupplyAggregate.warm();
    BankingApi.boot();

    // Social graph (Wave 3) — install the presence relay: the net-new
    // consumer that fans the four in-world-gated presence transitions
    // (login / reconnect / disconnect / logout) out to online viewers
    // whose first-matching rule for the acting player is non-silent.
    // In-memory, nothing persisted; no warm step (the rule store rides
    // each Avatar's own persistence).
    SocialApi.boot();

    // Twitch relay — install the outbound DI port + wire the presence-gated
    // EventSub reader. Inert until a channel is seeded AND a player tunes
    // in (and a reader token is configured); safe to boot unconditionally.
    TwitchRelayReader.get().boot();

    // Livestream-viewer broadcast sources — wire the live push now that the
    // EventRegistry is bootstrapped (the listener can't register in
    // Application.initialize(), which runs pre-bootstrap in the Server
    // constructor).
    Application.get().wireBroadcastSourcesPush();
  }

  /**
   * Graceful-shutdown counterpart to `run()`. Owns the backend-layer
   * teardown that must run before the process exits — currently the
   * world-clock snapshot so the next boot resumes continuously.
   * Invoked from `Server.stop()`; kept here (not in `services/`) so
   * transport code stays free of engine concerns.
   */
  public static async shutdown(): Promise<void> {
    try {
      await WorldClockApi.shutdown();
    } catch (err) {
      console.error('AppBootstrap: world-clock shutdown failed:', err);
    }
  }
}
