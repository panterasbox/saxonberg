/**
 * EvalController — run a code snippet against the avatar (or `--on`
 * target).
 *
 * Two modes:
 *   - `eval <code>` → replace the avatar's eval-singleton with new
 *     code, then run it.
 *   - `eval` (no code, with optional `--on`) → re-run the existing
 *     singleton's most-recent code against the new target.
 *
 * Singleton path: `/home/<playerId>/_eval` (falling back to
 * `/home/<stuffId>/_eval` for givers that aren't player-shaped —
 * e.g. scripted NPCs). Establishes the `/home/` branch of the
 * template tree as the per-player namespace; future variants tag
 * the basename (`_eval.<tag>`) instead of nesting deeper. Each
 * new `eval <code>` destructs the prior singleton and clones a
 * fresh one, then `setCode` + `run`. Singletons do not persist
 * across server restarts.
 *
 * Multi-target dispatch: `--on <expr>` may resolve to many. Without
 * `--all` the controller errors with an ambiguity notice; with
 * `--all` it iterates and streams per-target results.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import type { MqlManyResult } from '../../../api/mql';
import Avatar from '../../Avatar';
import type EvalScript from '../../../lib/script/EvalScript';
import { ScriptApi } from '../../../api/script';
import { SandboxApi } from '../../../api/sandbox';
import { ParcelApi } from '../../../api/parcel';
import { GroupApi } from '../../../api/group';
import { AccessApi } from '../../../api/access';
import { ZoneApi } from '../../../api/zone';
import { ProvenanceApi } from '../../../api/provenance';
import { MudlogApi } from '../../../api/mudlog';

interface EvalModel extends CommandModel {
  expr?: string;
  on?: MqlManyResult;
  all?: boolean;
  parcel?: string;
}

export default class EvalController extends CommandController<EvalModel> {
  async execute(model: EvalModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Wizard axis check is now declarative — see eval.yaml's
    // `validators: requiresWizard`. The dispatcher rejects the
    // command before this controller runs when the giver isn't a
    // wizard. Code-trust gates WHETHER you may run code; the parcel
    // jurisdiction below gates WHERE it reaches — never the reverse.

    // Jurisdiction resolution (sandbox build): NO invocation form runs
    // without a named jurisdiction — the default supplies one (your own
    // circle). One rule, no special cases.
    const playerKey = giver instanceof Avatar ? giver.getPlayerId() : giver.stuffId;
    const parcel = this.normalizeParcel(model.parcel) ?? `/home/${playerKey}`;

    // The gate: authority over the parcel — title-holder / group
    // membership / the core default — via the shipped owner-kind
    // dispatch. Your own self-home passes by the pure rule.
    if (!(await this.holdsAuthority(giver, parcel))) {
      return this.fail(
        context,
        `you hold no authority over ${parcel}`,
        'access-denied',
      );
    }

    // Disposition falls out of the parcel's namespace kind: a WIRE
    // parcel quarantines (circle scope; the four layers contain the
    // run; side-effects discard); a FIELD parcel governs (writes are
    // real, reach bounded to the extent, the act receipted).
    // `resolveEnclosingZoneForPath`, not `resolveZoneForPath`: `/home`
    // and `/studio` are non-SPATIAL zones, so the spatial resolver
    // skips right past them and answers null — which reads as "not
    // wire" and sends quarantined code down the governed path.
    const zone = await ZoneApi.resolveEnclosingZoneForPath(parcel);
    const isWire = (await zone?.lookupField<boolean>('wire')) === true;

    // Singleton mints IN the jurisdiction's namespace — addressable
    // provenance, re-runnable by path.
    const singletonPath = `${parcel}/_eval`;

    // Resolve targets. The matcher already ran MQL on `--on` (it's
    // declared `type: objects` in the yaml), so model.on is an
    // `MqlManyResult`. Empty result is the no-match case; >1 still
    // requires `--all` for safety so a mistyped query doesn't
    // silently apply to many targets.
    let targets: Stuff[];
    if (model.on) {
      const stuff = model.on.stuff;
      if (stuff.length === 0) {
        return this.fail(
          context,
          `no targets matched --on ${model.on.raw ?? ''}`,
        );
      }
      if (stuff.length > 1 && !model.all) {
        return this.fail(
          context,
          `ambiguous --on (matched ${stuff.length}); use --all to apply to each`,
        );
      }
      targets = stuff;
    } else {
      targets = [giver];
    }

    // The scratch's whole life — lookup, destruct-and-replace, run —
    // happens INSIDE the jurisdiction's root, not just the run.
    //
    // A wire jurisdiction makes the scratch circle-scoped, and the
    // boundary check is symmetric: a circle-context caller may not
    // touch a field receiver any more than the reverse. Minting
    // outside and running inside therefore fails on the SECOND
    // `eval <code>` in the same jurisdiction — the field-context
    // destruct of the previous, circle-scoped scratch is denied
    // (found live). Keeping the whole span in one root also means the
    // scratch a wire jurisdiction leaves behind dies with the circle,
    // which is what "quarantined" is supposed to mean.
    const inJurisdiction = <T,>(fn: () => Promise<T>): Promise<T> =>
      isWire
        ? SandboxApi.runScoped(parcel, fn)
        : SandboxApi.runGoverned(parcel, fn);

    // Name the targets and report the results from OUT here, in the
    // caller's own context. Inside a wire root the controller is
    // standing in the circle, and `getPresentation()` / `tell()` on a
    // field target is exactly the cross-boundary dispatch the layers
    // deny — so the plain `eval <expr>` in the field died writing its
    // OWN output line, not running the player's code (found live).
    // Only the player's code belongs inside the jurisdiction.
    const names = targets.map((t) => t.getPresentation());
    const results: Array<{ ok: boolean; value: unknown }> = [];
    let missingPrior = false;

    await inJurisdiction(async () => {
      let evalStuff: EvalScript;
      if (model.expr) {
        // New code → replace the singleton. The mint lives behind
        // `ScriptApi` because the identity stamp it performs
        // (`setTemplatePath`, so MQL's path atom can address the
        // scratch) is `ApiOnly`-gated — a controller doing it itself
        // dies on the gate, which is exactly how `eval <code>` was
        // failing.
        evalStuff = await ScriptApi.mintEvalScratch(
          singletonPath,
          model.expr,
        );
      } else {
        const existing =
          StuffApi.findByTemplatePath<EvalScript>(singletonPath);
        if (!existing) {
          missingPrior = true;
          return;
        }
        evalStuff = existing;
      }

      for (const target of targets) {
        try {
          results.push({ ok: true, value: await evalStuff.run(target) });
        } catch (err) {
          results.push({ ok: false, value: (err as Error).message });
        }
      }
    });

    if (missingPrior) {
      return this.fail(
        context,
        'no prior eval to re-run; provide code first',
      );
    }
    // Formatting is a call on THIS controller, which is field-resident
    // — inside a wire root even `this._formatResult(...)` is a denied
    // cross-boundary dispatch. Nothing but the player's code runs in
    // there.
    results.forEach((r, i) => {
      const name = names[i] ?? '?';
      this.tell(
        context,
        r.ok
          ? `\n${name}: ${this._formatResult(r.value)}\n`
          : `\n${name}: error: ${String(r.value)}\n`,
      );
    });
    if (!isWire) {
      // The governed channel made concrete for code: the act is
      // receipted — addressable provenance for the minted template +
      // an operator-visible line.
      try {
        await ProvenanceApi.recordAuthoring({ path: singletonPath });
      } catch {
        // provenance is best-effort here; the mudlog line still lands
      }
      MudlogApi.info(
        'sandbox.eval.governed',
        Mml.text(
          `governed eval by ${giver.getPresentation()} against ${parcel}`,
        ),
      );
    }
    return;
  }

  /** Normalize a `--parcel` value to a `/`-rooted path, or null. */
  private normalizeParcel(raw: string | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const rooted = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return rooted.endsWith('/') && rooted !== '/'
      ? rooted.slice(0, -1)
      : rooted;
  }

  /**
   * Authority over `parcel` via the shipped owner-kind dispatch:
   * player title (incl. the self-home pure rule), group membership,
   * or the core-default `AccessApi.can` walk.
   */
  private async holdsAuthority(
    giver: Stuff,
    parcel: string,
  ): Promise<boolean> {
    const identityPath = giver.getIdentityPath();
    const identityKey = identityPath?.split('/').filter(Boolean).pop();
    // The self-home rule, applied to the home ROOT as well as paths
    // under it: `ParcelRecord.selfHomeOwnerOf` matches only
    // `/home/<key>/…` (something *inside* your home), but a circle's
    // parcel path IS `/home/<key>` exactly — so without this, nobody
    // owns their own circle and eval refuses you your own sandbox.
    if (identityKey && parcel === `/home/${identityKey}`) return true;
    try {
      const owner = await ParcelApi.ownerOf(parcel);
      if (owner?.kind === 'player') {
        // Mirror `AccessRegistry.subjectOwnsAsPlayer`: a player title
        // is stored EITHER at the avatar's own identity path (a
        // transferred title) or in the self-home form `/home/<key>`
        // (the pure rule, which is how your own circle is yours).
        // Comparing only against the identity path silently refuses
        // every player their own circle — including in the field.
        const identity = giver.getIdentityPath();
        if (!identity) return false;
        if (owner.templatePath === identity) return true;
        const key = identity.split('/').filter(Boolean).pop();
        return key !== undefined && owner.templatePath === `/home/${key}`;
      }
      if (owner?.kind === 'group' && owner.ref) {
        // Groups key on the member PATH (`/obj/Avatar/<id>`), not the
        // bare playerId — the same key `AccessRegistry.memberKeyOf`
        // builds. Passing the raw id silently never matches.
        return identityPath
          ? GroupApi.isMember(identityPath, owner.ref)
          : false;
      }
    } catch {
      // registry offline / no row — fall through to the core dispatch
    }
    const resource = StuffApi.findByTemplatePath(parcel) ?? null;
    return AccessApi.can(giver, 'eval', resource);
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.author')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }

  private _formatResult(v: unknown): string {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return Object.prototype.toString.call(v);
    }
  }
}
