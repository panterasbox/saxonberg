/**
 * AetherHostMixin — **this thing hosts aether software**: the apps it
 * runs, and the list of what is installed on it.
 *
 * Split out of `AetherMixin` (aether-devices D2): perceiving the aether
 * and hosting software on it are two facts about two different things. A
 * person perceives (`AetherMixin`, the gated ESP sense) AND hosts (their
 * wallet, calendar and forums); a phone or an implant hosts (Messages)
 * and perceives nothing — it confers perceiving on whoever bears it.
 *
 * **Two halves, one concept.**
 *
 * - The **live** half: the hosted set of app `Idea`s (`AetherHosted`),
 *   each with a back-reference to this host, bound to it for life. The
 *   sealed chokepoints `hostApp` / `unhostApp` are the only mutators and
 *   this collection — not the per-app back-ref — is the source of truth
 *   for membership. Not persisted: an app instance is re-cloned.
 * - The **durable** half: `installedApps`, the persisted list of app row
 *   paths. It is what survives a restart; the live set is stood up from
 *   it (`setInstalledApps` reconciles — the template phase at birth and
 *   the restore phase after a reboot both write through it).
 *
 * `installApp(path)` is the ONE way software gets onto any host: it
 * clones the row, hosts it and records it — the default loadout uses it
 * too. What `apps install` offers is the ONE app store (stream arrival
 * D21: every published `App` row, `TemplateApi.appStore()`) — not a list
 * on each device; a person's own wallet, calendar and forums are never in
 * it. `manifestsAs` is how what
 * arrives through this host shows: `known` (straight to the mind — an
 * implant, a born-tuned body) or `read` (off a screen — a phone, D9).
 *
 * Finding an app is not a bespoke method: it rides the MQL `reachable`
 * seed (self + own hosted apps + carried hosts). Identity-bound reads
 * scan `getHostedApps()` directly.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CommandApi, type CommandContributions } from '../../api/command';
import { StuffApi } from '../../api/stuff';
import { Final, Unshadowable } from '../security/decorators';
import type { AetherHosted } from './AetherHosted';

/** How what arrives through a host shows to its bearer (D9). */
export type AetherManifestation = 'known' | 'read';

/** The public shape of an aether host. */
export interface AetherHost {
  /** The apps currently running on this host (live-ref). */
  getHostedApps(): readonly (Stuff & AetherHosted)[];
  /**
   * Plug an app instance into this host. The single consistency
   * chokepoint: pushes onto the collection, sets the app's back-ref, and
   * notifies command routing. Idempotent. Sealed.
   */
  hostApp(app: Stuff & AetherHosted): void;
  /**
   * Remove an app from this host. Retires its command contributions and
   * — enforcing the must-be-hosted invariant — destroys it. Returns
   * whether it was hosted. Sealed.
   */
  unhostApp(app: Stuff & AetherHosted): boolean;
  /** Is `app` in this host's hosted set? */
  hostsApp(app: Stuff): boolean;
  /**
   * Raw removal used only by an app's `cleanupOnDestruct` when it is
   * destructed directly while still hosted: splice it out and retire its
   * contributions, with NO destruct (the app is already dying).
   * @internal
   */
  _dropHostedApp(app: Stuff): void;

  /** The installed list — the app row paths this host runs. */
  getInstalledApps(): readonly string[];
  /**
   * Replace the installed list and reconcile the live set to it: rows
   * listed and not running are cloned and hosted, running apps no longer
   * listed are removed. The template and restore phases write through
   * here, so a host stands up its apps at birth and after a reboot.
   */
  setInstalledApps(paths: readonly string[]): Promise<void>;
  /**
   * Install the app at `path`: clone the row, host it, record it.
   * Idempotent by path — an app already installed is returned as it is.
   * Throws when no row stands at `path` (P3: a content defect, loudly).
   */
  installApp(path: string): Promise<Stuff & AetherHosted>;
  /** Uninstall the app whose key is `key`. Returns whether it was installed. */
  uninstallApp(key: string): boolean;
  /** Is the app keyed `key` installed? (Reads the record.) */
  hasApp(key: string): boolean;
  /** The store's app row paths this host does not yet run (D21). */
  availableApps(): Promise<readonly string[]>;
  /** How what arrives through this host shows to its bearer. */
  getManifestsAs(): AetherManifestation;
  /**
   * Install the store's app whose key is `key` (`apps install <key>`).
   * An unknown or unpublished key answers with what the store offers; a
   * key two packs publish answers `collision`, naming both; an app already
   * installed answers `already`.
   */
  installByKey(key: string): Promise<AppInstallResult>;
}

/** What `installByKey` did. */
export type AppInstallResult =
  | { ok: true; app: Stuff & AetherHosted; already: boolean }
  | { ok: false; offered: readonly string[]; collision?: readonly string[] };

/** An app's key is the last segment of its row path (`…/app/messages`). */
function appKeyOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

export function AetherHostMixin<TBase extends MixinConstructor>(Base: TBase) {
  class AetherHostMixin extends Base implements AetherHost {
    static _mixinName = 'AetherHostMixin';

    /**
     * A device hands `apps` outward to whoever bears it (the `environment`
     * bucket reaches the carrier at any depth). A person's own host is
     * never in its own container chain, so `apps` never lists or removes
     * the person's wallet, calendar or forums (aether-devices D3).
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: [],
      environment: ['platform/cmd/device/apps.yaml'],
    };

    static fieldMeta: FieldMeta = {
      // An app cannot exist unhosted (see `unhostApp`, which destructs on
      // removal), so the host owns its apps — the destruct cascade (slot
      // 2.5) takes them with it.
      _hostedApps: { ref: 'instance', lifetime: 'owned' },
      installedApps: { persistent: true },
      // ⚠ Authored fields must be declared to be APPLIED: the template
      // phase writes only declared persistent fields (the drive found
      // every authored host field silently unset).
      manifestsAs: { persistent: true },
    };

    private _hostedApps: (Stuff & AetherHosted)[] = [];

    /** Persisted: the app row paths installed on this host. */
    installedApps: string[] = [];

    /** Authored: how what arrives through this host shows (D9). */
    manifestsAs: AetherManifestation = 'known';

    getHostedApps(): readonly (Stuff & AetherHosted)[] {
      return this._hostedApps;
    }

    hostsApp(app: Stuff): boolean {
      return this._hostedApps.some((u) => u === app);
    }

    @Final
    @Unshadowable
    hostApp(app: Stuff & AetherHosted): void {
      if (this._hostedApps.includes(app)) return;
      this._hostedApps.push(app);
      app.setHost(this as unknown as Stuff & AetherHost);
      // Surface the app's command contributions on the host's recency
      // stack (gain-post-spawn).
      CommandApi.applyHostedAppDelta(this as unknown as Stuff, app, 'host');
    }

    @Final
    @Unshadowable
    unhostApp(app: Stuff & AetherHosted): boolean {
      const i = this._hostedApps.indexOf(app);
      if (i < 0) return false;
      this._hostedApps.splice(i, 1);
      app.setHost(null);
      CommandApi.applyHostedAppDelta(this as unknown as Stuff, app, 'unhost');
      // Must-be-hosted invariant: an app hosted nowhere cannot persist or
      // exist. We cleared its back-ref above, so the app's own cleanup
      // no-ops (no re-entry into this host).
      StuffApi.destruct(app);
      return true;
    }

    /** @internal — see {@link AetherHost._dropHostedApp}. */
    _dropHostedApp(app: Stuff): void {
      const i = this._hostedApps.findIndex((u) => u === app);
      if (i < 0) return;
      this._hostedApps.splice(i, 1);
      CommandApi.applyHostedAppDelta(this as unknown as Stuff, app, 'unhost');
    }

    getInstalledApps(): readonly string[] {
      return this.installedApps;
    }

    async setInstalledApps(paths: readonly string[]): Promise<void> {
      const wanted = [...new Set(paths)];
      // Remove what is running and no longer listed…
      for (const app of [...this._hostedApps]) {
        const at = app.getTemplatePath();
        if (at && !wanted.includes(at)) this.unhostApp(app);
      }
      this.installedApps = [];
      // …and stand up what is listed and not running.
      for (const path of wanted) await this.installApp(path);
    }

    async installApp(path: string): Promise<Stuff & AetherHosted> {
      const running = this._hostedApps.find((u) => u.getTemplatePath() === path);
      if (!this.installedApps.includes(path)) this.installedApps.push(path);
      if (running) return running;
      const app = await StuffApi.clone<Stuff & AetherHosted>(path);
      this.hostApp(app);
      return app;
    }

    uninstallApp(key: string): boolean {
      const path = this.installedApps.find(
        (p) => appKeyOf(p) === key,
      );
      if (path === undefined) return false;
      this.installedApps = this.installedApps.filter((p) => p !== path);
      for (const app of [...this._hostedApps]) {
        if (app.getTemplatePath() === path) this.unhostApp(app);
      }
      return true;
    }

    hasApp(key: string): boolean {
      return this.installedApps.some((p) => appKeyOf(p) === key);
    }

    async availableApps(): Promise<readonly string[]> {
      const { TemplateApi } = await import('../../api/template');
      const store = await TemplateApi.appStore().published();
      return store.map((a) => a.path).filter((p) => !this.installedApps.includes(p));
    }

    getManifestsAs(): AetherManifestation {
      return this.manifestsAs;
    }

    async installByKey(key: string): Promise<AppInstallResult> {
      const k = key.trim().toLowerCase();
      const { TemplateApi } = await import('../../api/template');
      const found = await TemplateApi.appStore().lookup(k);
      if ('found' in found) {
        const already = this.installedApps.includes(found.found.path);
        return { ok: true, app: await this.installApp(found.found.path), already };
      }
      // Something this host already runs that the store does not list.
      const installed = this.installedApps.find((p) => appKeyOf(p) === k);
      if (installed !== undefined) {
        return { ok: true, app: await this.installApp(installed), already: true };
      }
      const offered = (await this.availableApps()).map(appKeyOf);
      return 'collision' in found
        ? { ok: false, offered, collision: found.collision }
        : { ok: false, offered };
    }
  }
  return AetherHostMixin;
}
