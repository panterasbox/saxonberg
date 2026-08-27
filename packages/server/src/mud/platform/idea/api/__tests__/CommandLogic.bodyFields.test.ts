/**
 * Body side-channel (`CommandApi.overlayBodyFields`) — Wave 3.
 *
 * The structural narrowness: `fields` overlays ONLY the command's
 * `payload:`-block fields + the designated body field (a greedy `string`
 * positional). It can never reach a non-greedy positional selector, an
 * option/flag, or an object selector. A malformed value is dropped (the
 * model is left for downstream validation to reject), never coerced into
 * the wrong shape.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandApi } from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { StuffApi } from '../../../../api/stuff';
import type { CommandModel } from '../../../../api/command';

const YAML = `
verbs: [demo]
controller: social/Demo
description: "demo verb for the body side-channel test"
subcommands:
  post:
    options:
      flag:
        type: boolean
        field: flag
        description: "a flag the side-channel must NOT be able to set"
    args:
      - name: board
        type: string
        required: true
      - name: body
        type: string
        required: true
        greedy: true
payload:
  meta:
    type: string
    field: meta
    description: "a payload-block field the side-channel MAY fill"
`;

function def(): CommandDefinition {
  return CommandDefinition.fromYaml(YAML, '<demo>');
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('CommandApi.overlayBodyFields', () => {
  it('fills the greedy body field + the payload field', () => {
    const command = def();
    const model: CommandModel = { subcommand: 'post', board: 'gossip', body: 'inline' };
    CommandApi.overlayBodyFields(model, { body: 'from-gui', meta: 'm1' }, command);
    expect(model.body).toBe('from-gui'); // fields wins over inline-greedy.
    expect(model.meta).toBe('m1');
  });

  it('cannot reach a non-greedy positional selector', () => {
    const command = def();
    const model: CommandModel = { subcommand: 'post', board: 'gossip', body: 'inline' };
    CommandApi.overlayBodyFields(model, { board: 'hijacked' }, command);
    expect(model.board).toBe('gossip'); // selector untouched.
  });

  it('cannot reach an option/flag', () => {
    const command = def();
    const model: CommandModel = { subcommand: 'post', board: 'gossip', body: 'inline' };
    CommandApi.overlayBodyFields(model, { flag: true }, command);
    expect(model.flag).toBeUndefined(); // flag unreachable.
  });

  it('drops a malformed payload value (no coercion into the wrong shape)', () => {
    const command = def();
    const model: CommandModel = { subcommand: 'post', board: 'gossip', body: 'inline' };
    // `meta` is a string field; an object is not coercible → dropped.
    CommandApi.overlayBodyFields(model, { meta: { not: 'a string' } }, command);
    expect(model.meta).toBeUndefined();
  });

  it('a body-bearing verb is identical whether body is inline or via fields', () => {
    const inline: CommandModel = { subcommand: 'post', board: 'gossip', body: 'hello world' };
    CommandApi.overlayBodyFields(inline, {}, def());

    const viaFields: CommandModel = { subcommand: 'post', board: 'gossip', body: '' };
    CommandApi.overlayBodyFields(viaFields, { body: 'hello world' }, def());

    expect(viaFields.body).toBe(inline.body);
    expect(viaFields.board).toBe(inline.board);
  });
});
