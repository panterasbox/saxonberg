/**
 * ⭐ `help <word>` merges the shapes of a word whose views are several
 * (controller-liquidity W1). The topics map is keyed by verb, so before W1
 * the last `throw` view registered won and `throw … at` / `throw … to`
 * were never shown.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import HelpCatalogue from "../idea/HelpCatalogue";
import { StuffApi } from "../../api/stuff";
import { makeStuff } from "../../lib/security/__tests__/test-setup";
import { CommandDefinition } from "../../lib/command/CommandDefinition";

const view = (yaml: string): CommandDefinition => CommandDefinition.fromYaml(yaml, "<test>");

const THROW = view(`
verbs: [throwish]
controller: C
description: "Throw something away"
help: "Pitch it."
defaultAliases: [{ name: tw }]
examples: [{ cmd: throwish rock }]
args:
  - { name: item, type: object, required: true, requires: any }
`);
const THROW_AT = view(`
verbs: [throwish]
controller: C
description: "Throw something at something"
help: "Meant to hit."
examples: [{ cmd: throwish flask at wolf }]
args:
  - { name: item, type: object, required: true, requires: any }
  - { name: target, type: object, required: true, requires: any, prepositions: [at], prepositionRequired: true }
`);
const THROW_TO = view(`
verbs: [throwish]
controller: C
description: "Toss something to someone"
args:
  - { name: item, type: object, required: true, requires: any }
  - { name: recipient, type: string, required: true, prepositions: [to], prepositionRequired: true }
`);

describe("HelpCatalogue — a word's shapes, merged", () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it("⭐ one topic lists every shape, every view's prose and every example", async () => {
    const cat = makeStuff(() => new HelpCatalogue());
    await cat.warm({ commandDefs: [THROW, THROW_AT, THROW_TO], surface: null, schema: [] });
    const body = cat.findCommandTopic("throwish")!.body;
    expect(body).toContain("throwish &lt;item&gt;");
    expect(body).toContain("throwish &lt;item&gt; at &lt;target&gt;");
    expect(body).toContain("throwish &lt;item&gt; to &lt;recipient&gt;");
    expect(body).toContain("Toss something to someone");
    expect(body).toContain("Pitch it.");
    expect(body).toContain("Meant to hit.");
    expect(body).toContain("throwish flask at wolf");
    expect(cat.findCommandTopic("throwish")!.keywords).toContain("tw");
  });

  it("a word with one view keeps getHelpText() verbatim", () => {
    expect(THROW.getHelpText([])).toBe(THROW.getHelpText());
    expect(THROW.getHelpText()).not.toContain("Toss");
  });
});
