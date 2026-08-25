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
import { ConditionApi } from '../mud/api/condition';
import { MaterialApi } from '../mud/api/material';
import { EmoteSeeder } from './EmoteSeeder';
import { RecipeSeeder } from './RecipeSeeder';
import { BlueprintSeeder } from './BlueprintSeeder';
import { ScriptSeeder } from './ScriptSeeder';
import { ChannelSeeder } from './ChannelSeeder';
import { GroupSeeder } from './GroupSeeder';
import { ParcelSeeder } from './ParcelSeeder';
import { WikiSeeder } from './WikiSeeder';
import { TwitchRelayReader } from './TwitchRelayReader';
import { YoutubeRelayReader } from './YoutubeRelayReader';
import { KickRelayReader } from './KickRelayReader';
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
// Loaded for its side effect: registers banking's `bank-circle` dialogue
// effect into the generic DialogueEffectRegistry (consumer → substrate).
import { DiagnosticApi } from '../mud/api/diagnostics';
import { RecordApi } from '../mud/api/record';
import { CompileWatcher } from './CompileWatcher';
import { fileURLToPath } from 'url';
import { ResidencyApi } from '../mud/api/residency';
import { CardApi } from '../mud/api/card';
import { SandboxApi } from '../mud/api/sandbox';
import { EmploymentApi } from '../mud/api/employment';
import { AttendantApi } from '../mud/api/attendant';
import { SocialApi } from '../mud/api/social';
import { PartyApi } from '../mud/api/party';
import { PressApi } from '../mud/api/press';
import AccountBalance from '../mud/lib/banking/AccountBalance';
import SupplyAggregate from '../mud/lib/banking/SupplyAggregate';
import { Document } from '../mud/lib/persistence/Document';
import { StuffApi } from '../mud/api/stuff';
import type { Marshaller } from '../mud/lib/persistence/Marshaller';
// Registers the live `online`/`world` provider so MQL queries against
// admin-tier seeds reflect connected interactives. Imported here (off
// the eager command/MqlApi chain) to avoid the `ConnectionApi →
// ConnectionManager → Interactive → Idea` load-time cycle, and CALLED
// explicitly from `run()` (the no-module-scope-statements rule — the
// module declares; the boot lifecycle installs). This is the one
// sanctioned reach into the mql/ pipeline from outside the facade:
// routing it through api/mql.ts would drag in the resolver chain and
// reintroduce that very cycle.
// eslint-disable-next-line no-restricted-imports -- documented cycle-avoidance; provider registration that must bypass the facade's eager load chain
import { installOnlineHoldersProvider } from '../mud/api/mql/online-wire';

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
   *   3. Load PM hooks (folder/leaf invariant on Collections.Content,
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
    // Framework cross-module wiring (registry-class handoffs, the
    // security/shadow/command/glob seams). Idempotent; `BootstrapManager.run`
    // re-invokes it. Branch registration is NOT here — the five branch
    // classes self-register at their own module load (the hierarchy's
    // root invariant must populate before any construction, including
    // the lazy singletons built during seeding below).
    BootstrapManager.installFrameworkWiring();

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
    await BlueprintSeeder.run();
    await ScriptSeeder.run();
    await ChannelSeeder.run();
    await AppSettingsSeeder.run();
    // Groups before parcels: a parcel's owner group (`duncan-hall`) is
    // authored here with its staff members, so the owner-ref resolution the
    // parcel/provisioning path does later converges on the seeded group.
    await GroupSeeder.run();
    await ParcelSeeder.run();
    // Wiki AFTER parcels: a seeded page's namespace resolves its access
    // through the /wiki parcel row, so the title has to exist first.
    // Insert-only — a seeded page somebody has edited is never
    // re-asserted, which would silently revert their work on a boot.
    await WikiSeeder.run();

    const cmd = await CommandApi.preloadAll();
    if (cmd.failed.length > 0) {
      throw new Error(
        `CommandApi.preloadAll: ${cmd.failed.length} command(s) failed: ` +
          cmd.failed.join(', ')
      );
    }
    console.info(`CommandApi: ${cmd.loaded} command YAML(s) preloaded`);

    installOnlineHoldersProvider();
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

    // Materials — stand the authored roster up as live singletons so the
    // sync resolve-on-read seams (getMaterial / bulk slots / autoignition)
    // hit from the first frame (nothing else stands materials up live).
    await MaterialApi.boot();

    // Conditions — the same gap one subsystem over: seeds are template
    // rows and nothing cloned them into Ideas, so every condition read
    // null in a running world and authored `toxinBehavior` / signs /
    // progression were inert. Silent, because the one hot reader skips
    // on null rather than throwing. After materials: a condition's
    // signs can name tissue materials.
    await ConditionApi.boot();

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

    // Residency (self-eviction) — install the real-time cold-tail sweep.
    // No warm step (nothing materialized); it reads AppSettings each sweep
    // and enumerates the live registry (populated by the manifest clones
    // above). Ships in observe mode, so booting culls nothing until an
    // operator flips `residency.mode` to `enforce`.
    ResidencyApi.boot();

    // The card surface — install the relevance-window sweep. ONE
    // recurring callback for the whole card set, never a timer per card:
    // a card's lifetime is a fact about time, and there is exactly one
    // clock for it (the client's own husk interval is gone).
    CardApi.boot();

    // Sandbox (the holodeck) — install the orphan sweeper. Sessions are
    // runtime state, so after a restart every circle scope is
    // sessionless and the first sweep discards all scoped rows (the
    // discard doctrine). Ordered after PM connect (above) and before
    // players can enter (the WS listener starts after bootstrap).
    SandboxApi.boot();

    // Banking (the monetary substrate) — warm the account-balance read cache
    // and the single-row supply headline from their materialized rows, then
    // boot the logic singleton (the stable activation seam). Warm before boot
    // so the first `balanceOf` / `moneySupply` reads are populated; the
    // CentralBank singleton is cloned by the bootstrap manifest above.
    await AccountBalance.warm();
    await SupplyAggregate.warm();
    await BankingApi.boot();

    // Employment engine — run one immediate roster pass (so on-shift state
    // is correct at boot) then self-register the recurring game-time tick
    // that maintains each assignee's shift status and settles shift-end
    // wages. Booted AFTER banking (the wage settlement calls BankingApi) and
    // after the bootstrap manifest stood up the Business + cast.
    EmploymentApi.boot();

    // Attendant — install the storefront-attention anti-grief guards: the
    // real-time lease idle-eviction sweep + the linkdead release. Booted after
    // employment (server resolution reads on-shift state). Activation = the
    // AttendantLogic singleton's presence; the sweep no-ops until a venue
    // grants a lease.
    AttendantApi.boot();

    // Social graph (Wave 3) — install the presence relay: the net-new
    // consumer that fans the four in-world-gated presence transitions
    // (login / reconnect / disconnect / logout) out to online viewers
    // whose first-matching rule for the acting player is non-silent.
    // In-memory, nothing persisted; no warm step (the rule store rides
    // each Avatar's own persistence).
    // SocialApi.boot() installs BOTH the notify-gated presence relay and
    // the presence-PUBLIC roster-delta tap (feeding the "Who's Online"
    // card) — same four presence events, two consumers. In-memory.
    SocialApi.boot();

    // Party operational core — register the `party:` grouping provider with
    // the (already-warmed) GroupRegistry and re-materialize durable parties
    // from their `parties` records into live Party Ideas. After SocialApi so
    // the grouping facade is fully warmed.
    await PartyApi.boot();

    // Press (news ticker) — a thin warm/activation seam. The board warms
    // via its manifest postRegister; the staff→player feed fan-out is inline
    // in PressLogic (Phase 3), so there is no event tap. Kept here for
    // call-site symmetry with the other *Api.boot() seams.
    PressApi.boot();

    // Twitch relay — install the outbound DI port + wire the presence-gated
    // EventSub reader. Inert until a channel is seeded AND a player tunes
    // in (and a reader token is configured); safe to boot unconditionally.
    TwitchRelayReader.get().boot();
    // YouTube read-only relay reader — presence-gated per-liveChatId. Inert
    // until a player tunes a live YouTube channel (and the env reader
    // account is configured); safe to boot unconditionally.
    YoutubeRelayReader.get().boot();
    // Kick read-only relay reader — webhook-subscription presence-gated.
    // Inert until a player tunes a Kick channel (and KICK_* env is
    // configured); safe to boot unconditionally.
    KickRelayReader.get().boot();

    // Author diagnostics — register the single idempotent author-push
    // listener (a runtime diagnostic notifies the content's author). Safe
    // and cheap in every environment; nothing fires it if no producer runs.
    DiagnosticApi.startRouter();

    // The nightly reset — ⚠⚠ destructive, and OFF unless the operator
    // armed it. `world.reset.mode` absent means nothing is installed at
    // all; `dry-run` logs what it would remove; only `enforce` deletes.
    // It also refuses to arm enforcing while `world.resetPolicy` is
    // unset, because a server that wipes without printing the notice is
    // a server whose front page lies. Booted last: it must see every
    // registry it may have to re-seed afterwards.
    RecordApi.boot();

    // Author diagnostics Producer 3 — the TS compile watcher. Dev-only:
    // production runs compiled JS with no TS source to watch. Best-effort:
    // a missing tsconfig / watcher failure logs and continues (diagnostics
    // must never block boot).
    if (process.env.NODE_ENV !== 'production') {
      try {
        const tsconfig = fileURLToPath(
          new URL('../../tsconfig.json', import.meta.url)
        );
        CompileWatcher.get().start(tsconfig);
        console.info('CompileWatcher: watching for TypeScript diagnostics');
      } catch (err) {
        console.warn(
          `CompileWatcher: not started — ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
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
      CompileWatcher.get().stop();
    } catch (err) {
      console.error('AppBootstrap: compile-watcher stop failed:', err);
    }
    try {
      await WorldClockApi.shutdown();
    } catch (err) {
      console.error('AppBootstrap: world-clock shutdown failed:', err);
    }
    try {
      // Drain the record layer's write buffer. It is deliberately
      // async-batched — the frame write is the highest-volume one in the
      // system and must never sit on the render hot path — so a clean
      // shutdown is the one moment the last interval's worth of
      // scrollback can be saved rather than dropped.
      await RecordApi.flush();
    } catch (err) {
      console.error('AppBootstrap: record-layer flush failed:', err);
    }
  }
}
