/**
 * ⭐⭐⭐ **The forcing function** — `consigns` and `restocks` stop
 * teleporting.
 *
 * This is the build's last deliverable and its highest-risk change: the
 * venues that depend on those two brains are shipped, live content, and
 * *"the shipped brains stop teleporting"* was the whole reason the road
 * had to exist at all.
 *
 * ⚠ The resolution is **not** that the NPCs walk. Two shipped facts and
 * one of the requirements' own non-goals rule that out — every producer
 * floor was an exitless island, and `restocks`' host is the Saxonberg
 * Lounge bar, which *"Saxonberg and the Lounge joining the map"* keeps
 * off the road. So:
 *
 * > **`restocks` became a poster and a receiver. `consigns` became a
 * > poster and a shipper. Neither NPC ever leaves its own floor again.**
 * > The goods move because a hauler — a player, or the `hauls` brain —
 * > carries them.
 *
 * ⭐ Which is the honest route rather than the literal one: not *"the
 * keeper walks four rooms"* but *"the keeper does not travel, because
 * carriage is somebody's job"* — the entire point of the build.
 *
 * The assertions here are **structural** (AC15's first half): no
 * `teleport` in either brain's source, the acts they do drive are
 * literal verbs, and the content that makes the loop closeable is in
 * place. The behavioural half — a long unattended run at a compressed
 * clock — is the live drive's, because a fixture cannot prove that a bar
 * stays stocked.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const CONSIGNS = fileURLToPath(
  new URL('../../lib/behavior/consigns.ts', import.meta.url),
);
const RESTOCKS = fileURLToPath(
  new URL('../../lib/behavior/restocks.ts', import.meta.url),
);
const CONTENT = fileURLToPath(new URL('../../../../../content/', import.meta.url));

/** A brain's source with its comments stripped — the CODE, not the prose. */
function codeOf(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '');
}

function yamlAt(rel: string): Record<string, unknown> {
  const full = `${CONTENT}${rel}`;
  expect(existsSync(full), `${rel} is not shipped`).toBe(true);
  return (parse(readFileSync(full, 'utf8')) ?? {}) as Record<string, unknown>;
}

describe('⭐ AC15 — the brains stop teleporting', () => {
  it('⭐ `consigns` WALKS to the counter — the literal reading, now possible', () => {
    // ⚠ The plan expected it to post the work instead, because every
    // producer floor was an exitless island and walking was impossible.
    // THIS BUILD REMOVED THAT REASON: the floors have doors. With the
    // island gone, the plain answer is the honest one — and it is the
    // one that keeps paying the producer, because consignment is
    // sale-or-return and no shipped mechanism lets a carrier list goods
    // on somebody else's behalf.
    const code = codeOf(CONSIGNS);
    expect(code).toMatch(/forceCommand\(`go \$\{/);
    expect(code).toMatch(/planRoute/);
  });

  it('⭐⭐ NEITHER brain calls `teleport`, anywhere, at all', () => {
    for (const [name, path] of [
      ['consigns', CONSIGNS],
      ['restocks', RESTOCKS],
    ] as const) {
      // Comments still discuss the teleport that used to be here — that
      // is the record of what changed, and it must not be mistaken for
      // the thing itself.
      expect(codeOf(path), `${name} still teleports`).not.toMatch(/teleport/);
    }
  });

  it('every act either brain drives is still a LITERAL verb', () => {
    // ⭐ The standing claim: nothing a brain does is unavailable to a
    // player. Both brains reach the world through `forceCommand` and
    // nothing else, so an NPC is subject to exactly the gates a typed
    // line is.
    for (const path of [CONSIGNS, RESTOCKS]) {
      const code = codeOf(path);
      const verbs = [...code.matchAll(/forceCommand\(`([a-z][\w -]*)/g)].map(
        (m) => m[1]!.split(' ')[0],
      );
      expect(verbs.length).toBeGreaterThan(0);
      for (const verb of verbs) {
        expect(
          ['get', 'put', 'pour', 'wash', 'wallet', 'job', 'consign', 'drop', 'go'],
          `unexpected verb '${verb}'`,
        ).toContain(verb);
      }
    }
  });

  it('⚠ the loops are still BOUNDED — no unbounded walk over a floor', () => {
    for (const path of [CONSIGNS, RESTOCKS]) {
      const code = codeOf(path);
      // ⚠⚠ `get 1 <kw>`, never a bare `get <kw>`: `get` binds GREEDILY,
      // and a floor holding many goods under one keyword would empty
      // itself in one call, making every `batch` cap meaningless. A live
      // drive found this the expensive way.
      const bareGet = /forceCommand\(`get \$\{/.test(code);
      expect(bareGet, 'a bare `get <kw>` binds greedily').toBe(false);
      expect(code).toMatch(/get 1 \$\{/);
    }
  });
});

describe('the content the switchover needed', () => {
  it('⭐ every producer floor has a DOOR — a hauler has to reach the crate', () => {
    // They shipped as exitless islands, each with the comment "No exits:
    // the hand teleports". The hands still never travel; the doors are
    // for the people who come to collect.
    const floors = [
      'trade-bottling/content/trade/bottling/location/bottling-floor.yaml',
      'trade-cooking/content/trade/cooking/location/pantry-floor.yaml',
      'trade-distilling/content/trade/distilling/location/crowsfoot-floor.yaml',
      'trade-distilling/content/trade/distilling/location/hollis-floor.yaml',
      'trade-distilling/content/trade/distilling/location/veshko-yard/location/distillery.yaml',
      'trade-farming/content/trade/farming/location/farm.yaml',
    ];
    for (const rel of floors) {
      const data = (yamlAt(rel).data ?? {}) as Record<string, unknown>;
      const exits = (data.exits ?? {}) as Record<string, { destination?: string }>;
      const outs = Object.values(exits).map((e) => e.destination);
      expect(outs, `${rel} is still an island`).toContain(
        '/world/terminus/goods-yards/yard',
      );
    }
  });

  it('every producer floor has a WORKS BOARD, so the hand posts without stepping outside', () => {
    const floors = [
      'trade-bottling/content/trade/bottling/location/bottling-floor.yaml',
      'trade-cooking/content/trade/cooking/location/pantry-floor.yaml',
      'trade-distilling/content/trade/distilling/location/crowsfoot-floor.yaml',
      'trade-distilling/content/trade/distilling/location/hollis-floor.yaml',
      'trade-distilling/content/trade/distilling/location/veshko-yard/location/distillery.yaml',
      'trade-farming/content/trade/farming/location/farm.yaml',
    ];
    for (const rel of floors) {
      const data = (yamlAt(rel).data ?? {}) as Record<string, unknown>;
      expect(data.props, rel).toContain('/trade/haulage/thing/works-board');
    }
  });

  it('⭐ the LOUNGE stays off the road and is served over the TPA lane', () => {
    // The one venue a stated non-goal keeps off the map. Its leg rides
    // the Authority's network — D2's own limit case, a lane with no
    // intermediate stops and no duration — which is not a loophole but
    // that mechanism doing exactly the work D2 says it does.
    const bar = yamlAt('saxonberg-lounge/content/world/lounge/location/bar.yaml');
    const data = (bar.data ?? {}) as Record<string, unknown>;
    expect(data.exits ?? {}).not.toHaveProperty('goods-yards');
    expect(data.props).toContain('/trade/haulage/thing/works-board');
    expect(data.props).toContain('/trade/haulage/thing/receiving-bench');

    const tpa = yamlAt('world-seed/content/stuff/idea/Lane/tpa.yaml');
    const lane = (tpa.data ?? {}) as { edges?: Array<{ to?: string }> };
    expect((lane.edges ?? []).map((e) => e.to)).toContain(
      '/world/lounge/location/bar',
    );
  });

  it('⚠ the par sheet was RETUNED, as part of the decision', () => {
    // A bar that cannot restock because the road is slower than the
    // drinking is a regression, not a lesson — so every supplied level
    // doubled when the road took over. And the ordering point matters
    // mechanically: an order can only be posted while a unit of the line
    // is still on the shelf, so a par that runs to zero between beats
    // could never be re-ordered.
    const biz = yamlAt('saxonberg-lounge/content/world/lounge/idea/business.yaml');
    const data = (biz.data ?? {}) as {
      parLines?: Array<{ category: string; level: number; supplier?: string }>;
    };
    const gin = (data.parLines ?? []).find((l) => l.category === 'gin');
    expect(gin!.level).toBe(6);
    const ale = (data.parLines ?? []).find((l) => l.category === 'ale');
    expect(ale!.level).toBe(60);
    // The glassware lines are nobody's delivery and were left alone.
    const coupe = (data.parLines ?? []).find((l) => l.category === 'coupe');
    expect(coupe!.level).toBe(12);
    expect(coupe!.supplier).toBeUndefined();
  });

  it('⭐⭐ the carter is the RESERVE SUPPLY, and his rate is authored data', () => {
    const carter = yamlAt('trade-haulage/content/trade/haulage/agent/carter.yaml');
    const data = (carter.data ?? {}) as {
      behaviors?: Array<{ brain: string; config?: Record<string, unknown> }>;
    };
    const hauls = (data.behaviors ?? []).find(
      (b) => b.brain === '/trade/haulage/behavior/hauls',
    );
    expect(hauls, 'the carter does not haul').toBeDefined();
    // ⚠ ONE gig a beat: a haul is a long act, and a carter doing four at
    // once would be teleporting in all but name.
    expect(hauls!.config!.batch).toBe(1);

    // ⭐⭐ The rate is a DIAL with its reasoning beside it, never a
    // constant somebody picked: the NPC is the reserve supply, so a
    // player cannot charge more than he costs and need not accept less.
    const settings = yamlAt('trade-haulage/content/settings/haulage.yaml') as {
      settings?: Array<{ key: string; value: string }>;
    };
    const keys = (settings.settings ?? []).map((s) => s.key);
    expect(keys).toContain('haulage.npcRatePerKgMinor');
    expect(keys).toContain('haulage.gigWindowGameHours');
  });
});
