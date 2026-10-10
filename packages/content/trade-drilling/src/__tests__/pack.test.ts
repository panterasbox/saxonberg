/**
 * ⭐ **The manifest is the one part of a pack that fails closed and
 * silent.** A root that no class path is under resolves every class into
 * the KERNEL tree instead (`StuffApi.resolveClassFile` matches by longest
 * prefix), and a missing title claim is a `lint:untitled` failure whose
 * message names a path rather than a pack. Both are cheap to assert and
 * neither is visible from any other test in this pack.
 *
 * ⚠ This file is deliberately about the MANIFEST and the pack's own
 * shape, not about anything it ships. Everything it ships has its own
 * test beside its own code.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const PACK = fileURLToPath(new URL('../../', import.meta.url));

interface Manifest {
  id: string;
  root: string;
  description?: string;
  requires?: {
    title?: Array<{
      extent: string;
      holder: { organization?: string; group?: string };
    }>;
  };
}

const manifest = YAML.parse(
  readFileSync(`${PACK}pack.yaml`, 'utf8'),
) as Manifest;

describe('the trade-drilling manifest', () => {
  it('holds a namespace root of its own', () => {
    // Structural, not stylistic: a capability pack MUST hold a root, or
    // `classFileOf` resolves its classes into the kernel's `src/`.
    expect(manifest.id).toBe('trade-drilling');
    expect(manifest.root).toBe('/trade/drilling');
  });

  it('claims title to its own extent, held by the Ministry of Trade', () => {
    // A trade is PLACELESS — its mechanism is held by a seat, and its
    // premises (if it ever has any) sit in the world under a locality's
    // committee. Same shape as every other trade pack.
    const claim = manifest.requires?.title?.find(
      (t) => t.extent === '/trade/drilling',
    );
    expect(claim).toBeDefined();
    expect(claim!.holder.organization).toBe('/compact/trade');
  });

  it('states the premise its own content has to keep', () => {
    // The description is the pack's contract with its venue: the column
    // and the bodies on it are the REALM's, so a second well town is
    // rows. If this sentence goes, the falsifiable line goes with it.
    expect(manifest.description).toMatch(/ZERO pack code/);
  });
});

describe('the pack graph', () => {
  it('depends on the ground pack, because a bore needs a column', () => {
    const pkg = JSON.parse(readFileSync(`${PACK}package.json`, 'utf8')) as {
      name: string;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe('@saxonberg/content-trade-drilling');
    expect(pkg.dependencies['@saxonberg/content-ground']).toBe('workspace:*');
  });

  it('⛔ depends on NEITHER trade-mining nor trade-quarrying', () => {
    // The venue's claims counter is mining's and the salt pan is
    // quarrying's, but this pack's CODE never imports either: a bore site
    // is one more `surfaceWorkings` entry, and the brine meets the pan by
    // TAG. A dependency here would be the tell that something was reached
    // for in code that should have been met in content.
    const pkg = JSON.parse(readFileSync(`${PACK}package.json`, 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@saxonberg/content-trade-mining']).toBeUndefined();
    expect(
      pkg.dependencies['@saxonberg/content-trade-quarrying'],
    ).toBeUndefined();
  });

  it('is listed in the deployment manifest', () => {
    // The root `package.json` dependency list IS the deployment manifest
    // — a pack absent from it is absent from a deploy, silently.
    const root = JSON.parse(
      readFileSync(`${PACK}../../../package.json`, 'utf8'),
    ) as { dependencies: Record<string, string> };
    expect(root.dependencies['@saxonberg/content-trade-drilling']).toBe(
      'workspace:*',
    );
  });

  it('ships a content tree, and (this wave) no classes yet', () => {
    expect(existsSync(`${PACK}content/trade/drilling`)).toBe(true);
  });
});
