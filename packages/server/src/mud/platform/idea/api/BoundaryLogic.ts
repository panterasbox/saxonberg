// BoundaryLogic — the hot-reloadable logic singleton behind BoundaryApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Boundary } from '../../../lib/boundary/Boundary';
import type { Adornable } from '../../../lib/boundary/Adornable';
import { BoundaryAnchor } from '../../../lib/boundary/BoundaryAnchor';
import { StuffApi } from '../../../api/stuff';
import { MqlApi } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { TemplatePaths } from '../../../lib/paths';
import { Lock, type LockType } from '../../../lib/lock/Lock';
import type { CommandGiver } from '../../../lib/command/CommandGiver';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { CredentialWallet } from '../../../lib/credential/CredentialWallet';
import type {
  AttachExistingBoundaryOptions,
  CreateBoundaryOptions,
} from '../../../api/boundary';

const BoundaryApiCallers = SecurityPolicies.FromModule('/api/boundary#BoundaryApi'
);

/**
 * BoundaryLogic — the hot-reloadable logic singleton behind
 * {@link BoundaryApi}.
 *
 * Lives at `/platform/idea/api/boundary` (a stateless `Stuff` singleton, no
 * backing `Template`); `BoundaryApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). The
 * install-on-two-hosts body shared by `attachExistingBoundary` and
 * `create` lives in the module-private `installBoundary` free function
 * (off-class, ungated, un-callable from outside), so the async `create`
 * doesn't make an intra-singleton `this.attachExistingBoundary()`
 * self-call that the gate would deny.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class BoundaryLogic extends ApiLogic {
  /** See {@link BoundaryApi.attachExistingBoundary}. */
  @CallSecurity(BoundaryApiCallers)
  public attachExistingBoundary<T extends Boundary>(
    opts: AttachExistingBoundaryOptions<T>
  ): T {
    return installBoundary(opts.boundary, opts.hostA, opts.hostB);
  }

  /** See {@link BoundaryApi.create}. */
  @CallSecurity(BoundaryApiCallers)
  public async create<T extends Boundary>(
    opts: CreateBoundaryOptions<T>
  ): Promise<T> {
    const { factory, hostA, hostB } = opts;
    const boundary = await StuffApi.create(factory);
    return installBoundary(boundary, hostA, hostB);
  }

  /** See {@link BoundaryApi.destruct}. */
  @CallSecurity(BoundaryApiCallers)
  /**
   * Issue a bearer key for `keyway`+`technology` to `holder`: an entry in
   * their implant keychain (if any) AND a physical `Key` Thing in their
   * inventory. Either opens the lock; the physical key is the durable
   * form.
   *
   * ⭐ An Api mandate, not a value-class static. Three objects move —
   * the holder, whatever reachable wallet carries their implant, and a
   * freshly cloned `Key` — which is cross-object orchestration, and the
   * holder is not itself a wallet so no instance method reaches it.
   * ⚠ Ungated by design: issuers span kernel + pack controllers (title,
   * lease, dorm provisioning), a set no kernel gate can enumerate.
   */
  public async issueKey(
    holder: Stuff,
    keyway: string,
    technology: LockType,
  ): Promise<void> {
    addToKeychain(holder, keyway, technology, false);
    await mintPhysical(holder, keyway, technology, false);
  }

  /**
   * Issue a **master** key for a whole lock technology (a super's ring) to
   * `holder` — keychain master (if any) + a physical master `Key`. Opens
   * every lock of that technology.
   */
  public async issueMasterKey(
    holder: Stuff,
    technology: LockType,
  ): Promise<void> {
    addToKeychain(holder, '', technology, true);
    await mintPhysical(holder, '', technology, true);
  }

  public destruct(boundary: Boundary): void {
    StuffApi.destruct(boundary as unknown as Stuff);
  }
}

/**
 * Install an already-constructed Boundary on two hosts: create the two
 * `BoundaryAnchor`s, wire `boundary.anchorA`/`anchorB`, and call each
 * host's `addFixture(anchor)`. Returns the boundary for fluent
 * chaining.
 *
 * Rejects when the boundary already has anchors wired (use `destruct`
 * first to migrate). Rejects `hostA === hostB` (a Boundary connecting a
 * room to itself has no use case in v1 and would confuse the
 * `getOtherHost` walk).
 */
function installBoundary<T extends Boundary>(
  boundary: T,
  hostA: Stuff & Adornable,
  hostB: Stuff & Adornable
): T {
  if (hostA === hostB) {
    throw new Error(
      'BoundaryApi.attachExistingBoundary: hostA and hostB must differ.'
    );
  }
  if (boundary.getAnchorA() || boundary.getAnchorB()) {
    throw new Error(
      'BoundaryApi.attachExistingBoundary: boundary already has anchors; ' +
        'destruct or detach the boundary first.'
    );
  }

  const anchorA = StuffApi.createSync(() => new BoundaryAnchor('A'));
  const anchorB = StuffApi.createSync(() => new BoundaryAnchor('B'));

  anchorA._setBoundary(boundary);
  anchorB._setBoundary(boundary);
  boundary._setAnchors(anchorA, anchorB);

  hostA.addFixture(anchorA);
  hostB.addFixture(anchorB);

  return boundary;
}

/** Add an entry to the holder's implant keychain (the first reachable wallet
 *  — the implant, before any physical key exists). No-op if they have none
 *  (e.g. an NPC without an implant — the physical key carries their access). */
function addToKeychain(
  holder: Stuff,
  keyway: string,
  technology: LockType,
  master: boolean,
): void {
  const wallet =
    MqlApi.resolveMany("person", {
      // Key holders are Characters (CommandGivers); the static type
      // at this seam is only `Stuff`.
      commandGiver: holder as Stuff & CommandGiver,
      scope: "person",
    }).stuff.find(
      (s): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && s.hasCredential("key"),
    ) ?? null;
  if (!wallet) return;
  const cred = wallet.ensureCredential("key");
  if (master) cred.addMaster(technology);
  else cred.addKey(keyway, technology);
}

/** Clone a physical `Key` Thing carrying the entry into the holder's
 *  inventory, its prose set from the technology. */
async function mintPhysical(
  holder: Stuff,
  keyway: string,
  technology: LockType,
  master: boolean,
): Promise<void> {
  if (!MixinApi.isContainer(holder)) return;
  const key = await StuffApi.clone<Stuff & CredentialWallet>(
    TemplatePaths.key,
  );
  const cred = key.ensureCredential("key");
  if (master) cred.addMaster(technology);
  else cred.addKey(keyway, technology);
  const named = key as unknown as {
    setShortDescription(s: string): void;
    setKeywords(k: string[]): void;
  };
  named.setShortDescription(Lock.keyDescription(technology, master));
  // ⚠ Authored keywords. A minted key has no content row to write them
  // in, and the pool stopped deriving them from the prose — without this
  // `look key` would not resolve the key you were just handed.
  named.setKeywords(
    technology === "keycard"
      ? ["keycard", "card", ...(master ? ["master"] : [])]
      : ["key", ...(master ? ["keys", "ring", "master"] : ["brass"])],
  );
  ContainmentApi.move(
    key as unknown as Stuff & Containable,
    holder as Stuff & Container,
  );
}
