/**
 * The Duncan Hall `provision` verb — a domain-local command loaded by
 * its `world/`-prefixed key, beside its content.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandApi } from '../../../../api/command';

describe('the domain-local provision verb', () => {
  beforeEach(() => CommandApi.clearCache());

  it('loads a domain-local command by its domain-prefixed key', () => {
    // Domain-local verbs live with their content under
    // `world/<sphere>/<locality>/cmd/`, keyed by their `world/`-prefixed
    // path (`getCommand` resolves that against MUD_ROOT, not `cmd/`). The
    // Duncan Hall dorm `provision` verb is an exemplar.
    const cmd = CommandApi.getCommand(
      'world/eternal/duncan-hall/cmd/provision.yaml'
    );
    expect(cmd, 'domain-local provision.yaml must load').not.toBeNull();
    expect(cmd!.verbs).toContain('provision');
    // Its resolved controller is the content-namespace template path
    // (dispatch clones it directly).
    expect(cmd!.resolvedController).toBe(
      '/world/eternal/duncan-hall/idea/cmd/ProvisionController'
    );
  });
});
