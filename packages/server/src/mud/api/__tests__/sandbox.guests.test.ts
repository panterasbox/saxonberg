/**
 * Wave 6 — guests and the group cell: a guest crosses into the HOST's
 * session with their own wire body (shared scope — Decision A); reaping
 * a guest touches only their vessel; the studio scope behaves
 * identically. Plus the palette assertion: this build ships ZERO new
 * verbs (`mud/cmd/` gains no sandbox-named file).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SandboxApi } from '../sandbox';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';
import { Stuff } from '../../lib/stuff/Stuff';
import { ExecutionContextApi } from '../execution-context';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';

const HOST = 'guest-host';
const GUEST = 'guest-visitor';
const HOST_SCOPE = `/home/${HOST}`;
const STUDIO_SCOPE = '/studio/test-collective';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

let sockSeq = 500;
async function makePlayer(playerId: string): Promise<Avatar> {
  const avatar = await StuffApi.create(() => new Avatar(), { playerId });
  Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(playerId));
  const interactive = await StuffApi.create(
    () =>
      new Interactive(`sock-g${++sockSeq}`, `sess-g${sockSeq}`, {
        _id: 'u1',
      } as never)
  );
  ConnectionApi.transfer(interactive, avatar);
  return avatar;
}

describe('guests and the group cell (Wave 6)', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    await bootRegistry();
  });

  afterEach(async () => {
    for (const scope of [HOST_SCOPE, STUDIO_SCOPE]) {
      if (SandboxApi.sessionForScope(scope)) {
        await SandboxApi.closeSession(scope);
      }
    }
    ExecutionContextApi._clearForTesting();
  });

  it('a guest crosses into the HOST session with their own vessel (shared scope)', async () => {
    const host = await makePlayer(HOST);
    const guest = await makePlayer(GUEST);

    await SandboxApi.enter(host);
    await SandboxApi.enter(guest, HOST_SCOPE);

    const session = SandboxApi.sessionForScope(HOST_SCOPE)!;
    expect(session.occupants.size).toBe(2);
    // one session, one scope, two vessels — co-presence dispatch works
    // because host and guest SHARE the boundary (Decision A)
    const hostBody = SandboxApi.activeBodyFor(HOST)!;
    const guestBody = SandboxApi.activeBodyFor(GUEST)!;
    expect(hostBody.getCircleScope()).toBe(HOST_SCOPE);
    expect(guestBody.getCircleScope()).toBe(HOST_SCOPE);
    expect(guestBody.getIdentityPath()).toBe(Avatar.getTemplatePath(GUEST));
  });

  it('reaping a guest touches only their vessel; the host session lives on', async () => {
    const host = await makePlayer(HOST);
    const guest = await makePlayer(GUEST);
    await SandboxApi.enter(host);
    await SandboxApi.enter(guest, HOST_SCOPE);
    const guestBody = SandboxApi.activeBodyFor(GUEST)!;

    // The revoke-while-inside seam calls exactly this: exit the guest.
    await SandboxApi.exit(guestBody);

    expect(guest.isParked()).toBe(false);
    expect(guest.isConnected()).toBe(true);
    // host untouched, session alive
    expect(SandboxApi.sessionForScope(HOST_SCOPE)).not.toBeNull();
    expect(SandboxApi.activeBodyFor(HOST)).not.toBeNull();

    // last one out closes the cell
    await SandboxApi.exit(SandboxApi.activeBodyFor(HOST)!);
    expect(SandboxApi.sessionForScope(HOST_SCOPE)).toBeNull();
  });

  it('a studio scope behaves identically (same containment, shared session)', async () => {
    const a = await makePlayer(HOST);
    const b = await makePlayer(GUEST);
    await SandboxApi.enter(a, STUDIO_SCOPE);
    await SandboxApi.enter(b, STUDIO_SCOPE);
    const session = SandboxApi.sessionForScope(STUDIO_SCOPE)!;
    expect(session.occupants.size).toBe(2);
    expect(SandboxApi.activeBodyFor(HOST)!.getCircleScope()).toBe(
      STUDIO_SCOPE
    );
  });
});

describe('the palette assertion (zero new verbs)', () => {
  it('mud/cmd gains no sandbox-named command file', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const cmdDir = join(here, '../../cmd');
    const files: Array<{ name: string; rel: string }> = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.yaml')) {
          files.push({
            name: entry,
            rel: p.slice(cmdDir.length + 1).replace(/\\/g, '/'),
          });
        }
      }
    };
    walk(cmdDir);
    const forbidden = /^(sandbox|conjure|holodeck|studio|wardrobe|circle)\.yaml$/;
    /*
     * ⚠ `author/studio.yaml` is the CMS **composer**, not the
     * sandbox's shared `/studio/<collective>` scope — two concepts
     * that happen to share a word, and the composer is the one the
     * shipped subsystem doc is named after.
     *
     * The guard says *the sandbox build ships no verbs*, not *the word
     * `studio` is reserved forever*, so the exemption is by PATH: a
     * sandbox verb would land in `cmd/system` or a sandbox category,
     * never under `author/`. Narrowing it here rather than deleting
     * the name from the list keeps the sandbox half of the guard live.
     */
    const offenders = files
      .filter(({ name }) => forbidden.test(name))
      .filter(({ rel }) => rel !== 'author/studio.yaml')
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});
