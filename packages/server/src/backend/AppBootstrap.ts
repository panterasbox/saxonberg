/**
 * AppBootstrap — orchestrates the full app boot sequence so
 * `index.ts` stays a thin entry point.
 *
 * Owns the dependency chain across the backend's prep systems:
 * Mongo connect → the content installer → PM hooks → command-view
 * preload → the boot manifest (the union of every applied pack's
 * `boot:` list) → warm/activate. There is no seeder: every row the
 * world starts with is a content pack's, and the packs' `requires:`
 * blocks are what the registries grant (content-packs wave 3, D6).
 * Each underlying manager keeps its narrow scope (`PackApi` installs,
 * `BootstrapManager` runs the manifest, etc.); this class is just the
 * sequencer.
 *
 * Throws on any step's failure; the entry point catches and exits.
 * Exit-code policy lives at the entry point, not here.
 */

import { PersistenceManager } from './PersistenceManager';
import { TwitchRelayReader } from './TwitchRelayReader';
import { YoutubeRelayReader } from './YoutubeRelayReader';
import { KickRelayReader } from './KickRelayReader';
import { BootstrapManager } from './BootstrapManager';
import { CommandApi } from '../mud/api/command';
import { PackApi } from '../mud/api/pack';
import { WorldClockApi } from '../mud/api/worldclock';
import { AppApi } from '../mud/api/app';
import { AppSettings } from '../mud/lib/config/AppSettings';
import { MixinApi } from '../mud/api/mixin';
import { PersistableApi } from '../mud/api/persistable';
import { DiagnosticApi } from '../mud/api/diagnostics';
import { RecordApi } from '../mud/api/record';
import { CompileWatcher } from './CompileWatcher';
import { fileURLToPath } from 'url';
import { ResidencyApi } from '../mud/api/residency';
import { EmploymentApi } from '../mud/api/employment';
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
   *   2. Install the content packs (`PackApi.install`): every shipped
   *      pack reconciled three-way into `content` / `documents` / the
   *      settings singleton, and its `requires:` granted — groups
   *      ensured, titles claimed. Runs FIRST after connect because
   *      PM.loadHooks below clones the DomainHook template out of
   *      `content`, and the boot manifest names installed rows.
   *
   *   3. Load PM hooks (folder/leaf invariant on Collections.Content,
   *      etc.) — clones the installed hook templates and registers
   *      them with the persistence pipeline. The packs must be
   *      installed before this runs.
   *
   *      Controllers are not pre-loaded; dispatch clones a fresh
   *      one per command via `StuffApi.clone('/platform/idea/cmd/<Name>')`.
   *
   *   4. Preload command YAMLs and resolve each `validators: [...]`
   *      spec into a live function. Validators are inert until this
   *      runs (`runValidators` early-returns on absent
   *      `_resolvedValidators`), so this MUST happen before the
   *      server accepts traffic.
   *
   *   5. Bootstrap runtime instances from the boot manifest — the
   *      union of every applied pack's `boot:` list. All prior steps
   *      must be complete; failures here prevent boot.
   */
  public static async run(config: AppBootstrapConfig): Promise<void> {
    // Framework cross-module wiring (registry-class handoffs, the
    // security/shadow/command/glob seams). Idempotent; `BootstrapManager.run`
    // re-invokes it. Branch registration is NOT here — the five branch
    // classes self-register at their own module load (the hierarchy's
    // root invariant must populate before any construction, including
    // the lazy singletons built during seeding below).
    // ⭐ The world is CLOSED for the length of this sequence. NPC brains
    // wire at their host's `postRegister` (below, in
    // `BootstrapManager.run`) because a host must exist before it can
    // behave — but the schedules they arm are real-time, so without this
    // the cast starts acting minutes before the subsystems it acts
    // through are booted. It is not just a storm of failed beats in the
    // log: those beats starve THIS sequence's own awaited reads, and on
    // the drive that found it the server never reached `listen` at all.
    AppApi.closeWorld();

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

    // Content packs — reconcile every shipped `@saxonberg/content-*` pack
    // into the DB: the platform (pack zero — controllers, registries,
    // vocabularies, the Compact), base-library, species-and-names, the
    // object / arcane / corpo / lounge / wiki packs, and the transitional
    // world-seed (the locality rows). Three-way against each pack's
    // `pack_installs` record; conflicts are reported, never merged. Each
    // pack's `requires:` is granted here too — its groups ensured, its
    // titles claimed (kept where already held) — and its `boot:` list
    // recorded for the manifest below. Writes rows only — nothing is live
    // yet (BootstrapManager clones later), so no re-hydrate at boot. Runs
    // before `loadHooks` because everything (the DomainHook template, the
    // marshallers, the quantity tables) is the packs' content.
    const packResults = await PackApi.install();
    for (const r of packResults) {
      if (r.failure) {
        // Already logged loudly by the installer; the boot continues
        // WITHOUT this pack (a failed pack never bricks the boot).
        continue;
      }
      console.info(
        `PackApi: '${r.packId}' installed — ` +
          `${r.inserted.length} inserted, ${r.updated.length} updated, ` +
          `${r.deleted.length} deleted, ` +
          `${r.kept.length} kept, ${r.merged.length} merged, ${r.archived.length} archived, ` +
          `${r.conflicts.length} conflict(s), ` +
          `${r.pinnedSkipped} pinned (skipped), ` +
          `${r.quantityTables} quantity table(s)` +
          (Object.keys(r.documents).length > 0
            ? ', ' +
              Object.entries(r.documents)
                .map(([k, n]) => `${n} ${k} document(s)`)
                .join(', ')
            : '') +
          `, requires: ${r.requires.groupsCreated.length + r.requires.groupsFound.length} group(s) ` +
          `(${r.requires.groupsCreated.length} created), ` +
          `${r.requires.titlesGranted.length + r.requires.titlesKept.length + r.requires.titleConflicts.length} title(s) ` +
          `(${r.requires.titlesGranted.length} granted, ${r.requires.titlesKept.length} kept, ` +
          `${r.requires.titleConflicts.length} conflict)` +
          (r.requires.skippedSold.length > 0 ? `, ${r.requires.skippedSold.length} row(s) skipped (extent sold)` : '') +
          `, boot: ${r.boot['sync-read']} sync-read + ${r.boot.producer} producer, ` +
          (r.staffed ? 'staffed' : 'UNSTAFFED')
      );
      // A capability pack says where each of its classes resolved — the
      // rung check's evidence, on the boot line (content-packs, D4).
      if (r.rung === 'capability') {
        const own = Object.entries(r.classOrigins).filter(([, o]) => o !== 'kernel');
        console.info(
          `PackApi: '${r.packId}' is a capability pack — ` +
            `${own.length} class(es) resolved into its src/` +
            (own.length > 0 ? `:\n` + own.map(([c, f]) => `    ${c} → ${f}`).join('\n') : '')
        );
      }
    }

    // App settings — warm the synchronous read cache from the
    // `app_settings` row at STEP ZERO of the warm order, immediately after
    // `PackApi.install()` (the `platform` pack merged the defaults above —
    // its `settings` kind is merge-missing, so an operator's `config`
    // value is never clobbered). Nothing between install and here feeds
    // it, and warming FIRST is what lets every boot-manifest
    // `postRegister` — including the self-warming catalogues — read
    // dials (`getCached` throws loudly when unwarmed; the seeded-literal
    // `dial()` fallbacks in the Logics are test-mode discipline only).
    // Warm-only — the values come from the pack's content/settings/*.yaml.
    // Awaits the Document directly — no boot method on AppApi (runtime
    // ops only), and not a manifest entry: it is a Document warm with no
    // template-backed row to ride.
    await AppSettings.warm();

    await PersistenceManager.get().loadHooks();
    // (The starter wiki pages are the `wiki-starter` pack's `wiki` kind,
    // submitted by `PackApi.install` above THROUGH the registry's own
    // create/edit path AS the pack — a page somebody has edited is a
    // compare-and-swap conflict, never a silent revert.)

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

    // The boot-time SPAWN sweep — the world stands at target on a fresh
    // boot, not a game-day later: every producer's floor row (a template
    // with an authored `censusKey` + home `container:`) is drawn until
    // its region declines. Enforce is the platform default; an operator
    // who flips `residency.spawn.mode` to observe gets a report only.
    // A deliberate POST-MANIFEST sequencer line (not a boot entry, P2):
    // it counts the live population the manifest just cloned, and the
    // manifest cannot express "after everything".
    const spawned = await ResidencyApi.spawnNow();
    console.info(
      `ResidencyApi: boot spawn sweep — ${spawned.placed} placed, ` +
        `${spawned.declined} region(s) at target of ${spawned.regions}`,
    );

    // The IMMEDIATE employment roster pass — on-shift state must be
    // correct at boot. A deliberate POST-MANIFEST sequencer line (not a
    // boot entry, P2): the Businesses it walks are other packs' manifest
    // entries, which platform dependsOn edges cannot name without
    // coupling to optional packs. The RECURRING tick is the
    // EmploymentEngine singleton's (manifest-booted).
    EmploymentApi.tickRoster();

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

    // ⭐ …and the world opens HERE, with every subsystem above booted, so
    // the first beat any brain runs meets a complete world.
    AppApi.openWorld();
    console.info('AppBootstrap: world open — the cast may act');

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
    // The world's persistable singletons — venue rooms, stock counters —
    // capture at establish and at the residency sweep; a stop between two
    // sweeps would lose everything consigned or placed since (the
    // libations live drive watched a dev restart empty the cash-and-carry
    // counter). Capture each one, best-effort, before the process ends.
    //
    // ⭐ ASKED, not remembered. The hosts are found by a system-mode MQL
    // sweep — the sanctioned "search the world" (mql.md; it is what
    // `lint:world-scan` points a bespoke `getAllObjects()` loop at) —
    // and each says for itself whether it wants a capture. Who wants one
    // is `PersistableMixin`'s knowledge, including the Avatar exclusion;
    // this file only asks.
    //
    // ⚠ This briefly kept a `PersistableRegistry` that hosts enrolled
    // themselves into. It was a third index of Stuff holding no fact the
    // objects did not already hold — and this very loop re-derived every
    // one of them on read (`isPersistable`, a null key, `isDestroyed`),
    // which is the tell that a cache is buying nothing. Maintained on
    // every key-set and every destruct, forever, to save one sweep at
    // process exit.
    // Imported HERE, not at module scope: this file deliberately keeps
    // `api/mql` off its eager chain to avoid the documented
    // `ConnectionApi → ConnectionManager → Interactive → Idea` cycle
    // (see the `installOnlineHoldersProvider` note above). By shutdown
    // everything is long since loaded.
    const { MqlApi } = await import('../mud/api/mql');
    const hosts = MqlApi.resolveMany('world:[mixin.PersistableMixin]', {
      commandGiver: null,
      scope: 'world',
    }).stuff;
    let captured = 0;
    for (const stuff of hosts) {
      if (!MixinApi.isPersistable(stuff)) continue;
      if (!stuff.capturesAtShutdown()) continue;
      try {
        await PersistableApi.capture(stuff);
        captured += 1;
      } catch (err) {
        console.error(
          `AppBootstrap: shutdown capture failed for ${stuff.getTemplatePath() ?? stuff.stuffId}:`,
          err,
        );
      }
    }
    console.info(`AppBootstrap: shutdown captured ${captured} persistable host(s)`);
  }
}
