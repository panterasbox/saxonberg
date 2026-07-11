/**
 * MixinPalette — the "compose a new backing class" surface: pick a base class
 * + a mixin set + a name, then Scaffold. The scaffold POST returns a generated
 * TS `source` (`class <Name> extends <Mixin>(<Base>) {}`) which the parent
 * `StudioPanel` opens in a Monaco (source-backend) editor for the wizard to
 * edit + commit.
 *
 * The palette owns ZERO command/authorization semantics — it only asks the
 * server to generate inert text (scaffolding is author-tier + open to all);
 * publishing is re-gated server-side at commit. Every control previews its
 * action via a `title` hint (the CMS surface convention — there is no in-world
 * command bar here).
 */

import React from "react";
import styled from "styled-components";
import type { MixinPaletteEntry } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { tokens } from "../../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md};
  min-height: 0;
  overflow: auto;
`;

const SectionLabel = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${tokens.color.sectionLabel};
`;

const NameInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const MixinList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const Chip = styled.button<{ $on: boolean }>`
  background: ${(p) =>
    p.$on ? tokens.color.primary : tokens.color.surfaceSunken};
  color: ${(p) => (p.$on ? tokens.color.fg : tokens.color.fgMuted)};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.primary : tokens.color.border)};
  border-radius: ${tokens.radius.md};
  padding: 2px ${tokens.space.sm};
  cursor: pointer;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};

  &:hover {
    border-color: ${tokens.color.primary};
  }
`;

const Preview = styled.pre`
  margin: 0;
  padding: ${tokens.space.sm};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  white-space: pre-wrap;
  word-break: break-word;
`;

const ScaffoldButton = styled.button`
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  cursor: pointer;
  align-self: flex-start;

  &:disabled {
    background: ${tokens.color.actionBg};
    color: ${tokens.color.fgMuted};
    cursor: default;
  }
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

/** The `extends` clause a given base + ordered mixin set will produce. */
function extendsClause(base: string, mixins: string[]): string {
  let composed = base || "Base";
  for (let i = mixins.length - 1; i >= 0; i--) {
    composed = `${mixins[i]}(${composed})`;
  }
  return composed;
}

export const MixinPalette: React.FC = () => {
  const mixins = useStore((s) => s.studio.mixins);
  const busy = useStore((s) => s.studio.busy);
  const csrf = useStore((s) => s.cms.csrf);
  const studioListMixins = useStore((s) => s.studioListMixins);
  const studioScaffold = useStore((s) => s.studioScaffold);

  const [name, setName] = React.useState("");
  const [base, setBase] = React.useState("Idea");
  const [picked, setPicked] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (mixins === null) void studioListMixins();
  }, [mixins, studioListMixins]);

  const bases = (mixins ?? []).filter(
    (m: MixinPaletteEntry) => m.kind === "base",
  );
  const mixinEntries = (mixins ?? []).filter(
    (m: MixinPaletteEntry) => m.kind === "mixin",
  );

  const toggle = (n: string): void =>
    setPicked((cur) =>
      cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n],
    );

  const validName = /^[A-Z][A-Za-z0-9_]*$/.test(name);
  const clause = extendsClause(base, picked);

  const doScaffold = (): void => {
    if (!validName || !csrf) return;
    void studioScaffold(
      { name, baseClass: base, mixinNames: picked },
      csrf,
    );
  };

  return (
    <Wrap>
      <SectionLabel>Compose a new class</SectionLabel>

      <Row>
        <SectionLabel>Name</SectionLabel>
        <NameInput
          value={name}
          placeholder="PascalCaseName"
          spellCheck={false}
          title="The new backing class name (PascalCase)"
          onChange={(e) => setName(e.target.value)}
        />
      </Row>

      <Row>
        <SectionLabel>Base class</SectionLabel>
        <Select
          value={base}
          title="The base class the mixins are applied over"
          onChange={(e) => setBase(e.target.value)}
        >
          {bases.length === 0 && <option value={base}>{base}</option>}
          {bases.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </Select>
      </Row>

      <Row>
        <SectionLabel>Mixins ({picked.length})</SectionLabel>
        <MixinList>
          {mixinEntries.map((m) => (
            <Chip
              key={m.name}
              type="button"
              $on={picked.includes(m.name)}
              title={
                picked.includes(m.name)
                  ? `Remove ${m.name} from the composition`
                  : `Add ${m.name} to the composition`
              }
              onClick={() => toggle(m.name)}
            >
              {m.name}
            </Chip>
          ))}
        </MixinList>
      </Row>

      <Row>
        <SectionLabel>Preview</SectionLabel>
        <Preview>{`class ${name || "Name"} extends ${clause} {}`}</Preview>
      </Row>

      <ScaffoldButton
        type="button"
        disabled={!validName || !csrf || busy}
        title={
          validName
            ? `Scaffold class ${name} extends ${clause}`
            : "Enter a PascalCase class name"
        }
        onClick={doScaffold}
      >
        {busy ? "Scaffolding…" : "Scaffold →"}
      </ScaffoldButton>
    </Wrap>
  );
};
