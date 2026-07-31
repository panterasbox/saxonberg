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
import EvalScript from '../../../lib/script/EvalScript';
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
    if (!(await this.holdsAuthority(giver, parcel, playerKey))) {
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
    const zone = await ZoneApi.resolveZoneForPath(parcel);
    const isWire = (await zone?.lookupField<boolean>('wire')) === true;

    // Singleton mints IN the jurisdiction's namespace — addressable
    // provenance, re-runnable by path.
    const singletonPath = `${parcel}/_eval`;
    const existing = StuffApi.findByTemplatePath<EvalScript>(singletonPath);

    let evalStuff: EvalScript;
    if (model.expr) {
      // New code → replace singleton. `create` (not clone): the eval
      // scratch is a per-player dynamic unique (identity path
      // `/home/<key>/_eval`, destruct-and-replace on each new code
      // body) — the Party-Idea shape, not authorable content.
      if (existing) StuffApi.destruct(existing);
      evalStuff = await StuffApi.create(() => new EvalScript());
      // Stamp templatePath so MQL path-atom can address it. The
      // setter on Stuff (ApiOnly-gated) updates byTemplatePath
      // for us; no need to re-key by hand.
      evalStuff.setTemplatePath(singletonPath);
      evalStuff.setCode(model.expr);
    } else {
      if (!existing) {
        return this.fail(
          context,
          'no prior eval to re-run; provide code first',
        );
      }
      evalStuff = existing;
    }

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

    // Iterate — each run inside its jurisdiction's root: wire →
    // quarantined circle scope; field → governed jurisdiction bound
    // with the act receipted (authorship + mudlog).
    for (const t of targets) {
      try {
        const result = isWire
          ? await SandboxApi.runScoped(parcel, () => evalStuff.run(t))
          : await SandboxApi.runGoverned(parcel, () => evalStuff.run(t));
        const repr = this._formatResult(result);
        const name = t.getPresentation();
        this.tell(context, `\n${name}: ${repr}\n`);
      } catch (err) {
        const name = t.getPresentation();
        this.tell(
          context,
          `\n${name}: error: ${(err as Error).message}\n`,
        );
      }
    }
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
    playerKey: string,
  ): Promise<boolean> {
    try {
      const owner = await ParcelApi.ownerOf(parcel);
      if (owner?.kind === 'player') {
        return owner.templatePath === giver.getTemplatePath();
      }
      if (owner?.kind === 'group' && owner.ref) {
        return GroupApi.isMember(playerKey, owner.ref);
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
