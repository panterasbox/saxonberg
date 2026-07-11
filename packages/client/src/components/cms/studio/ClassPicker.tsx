/**
 * ClassPicker — browses the blueprint catalogue (derived skeleton + curated
 * overlay) and drives `studioDescribe(blueprint.classPath)` on selection.
 *
 * Blueprints are grouped by their `parent` hierarchy; blessed (curated)
 * blueprints surface first within each group. A blueprint that carries a
 * `classPath` (every derived + concrete + classPath-backed composition) is
 * describable now; a pure composition with no backing class yet is shown
 * disabled (it becomes describable once scaffolded — P4).
 *
 * REST-only over `studioClient.listBlueprints`; no WebSocket. The picker owns
 * ZERO command semantics — selecting merely asks the server to describe.
 */

import React from "react";
import styled from "styled-components";
import type { BlueprintSummary } from "@saxonberg/types";
import { studioClient, StudioClientError } from "../studioClient";
import { useStore } from "../../../store/index";
import { tokens } from "../../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md};
  overflow: auto;
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const GroupLabel = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${tokens.color.fgMuted};
  margin-top: ${tokens.space.sm};
`;

const Row = styled.button<{ $blessed: boolean }>`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  text-align: left;
  width: 100%;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid
    ${(p) => (p.$blessed ? tokens.color.primary : tokens.color.border)};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  cursor: pointer;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
  &:hover:not(:disabled) {
    border-color: ${tokens.color.primary};
  }
`;

const Name = styled.span`
  font-weight: 600;
`;

const Meta = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Star = styled.span`
  color: ${tokens.color.primary};
`;

const Status = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.md};
`;

/** Group blueprints by `parent`, blessed-first within each group. */
function groupByParent(
  blueprints: BlueprintSummary[],
): Array<[string, BlueprintSummary[]]> {
  const groups = new Map<string, BlueprintSummary[]>();
  for (const bp of blueprints) {
    const key = bp.parent || "ungrouped";
    const list = groups.get(key) ?? [];
    list.push(bp);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      if (a.blessed !== b.blessed) return a.blessed ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * The class picker. `contextPath` (optional) scopes effective-value
 * resolution when describing the chosen class.
 */
export const ClassPicker: React.FC<{ contextPath?: string }> = ({
  contextPath,
}) => {
  const studioDescribe = useStore((s) => s.studioDescribe);
  const [blueprints, setBlueprints] = React.useState<BlueprintSummary[] | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    studioClient
      .listBlueprints()
      .then((list) => {
        if (live) setBlueprints(list);
      })
      .catch((e: unknown) => {
        if (live) {
          setError(
            e instanceof StudioClientError || e instanceof Error
              ? e.message
              : "failed to load blueprints",
          );
        }
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) return <Status>Could not load blueprints: {error}</Status>;
  if (blueprints === null) return <Status>Loading blueprints…</Status>;
  if (blueprints.length === 0) return <Status>No blueprints catalogued.</Status>;

  const groups = groupByParent(blueprints);

  return (
    <Wrap>
      {groups.map(([parent, list]) => (
        <Group key={parent}>
          <GroupLabel>{parent}</GroupLabel>
          {list.map((bp) => (
            <Row
              key={bp.blueprintId}
              $blessed={bp.blessed}
              disabled={!bp.classPath}
              title={
                bp.classPath
                  ? `Describe ${bp.classPath}`
                  : "compose to create a backing class (P4)"
              }
              onClick={() => {
                if (bp.classPath) void studioDescribe(bp.classPath, contextPath);
              }}
            >
              {bp.blessed && <Star>★</Star>}
              <Name>{bp.name}</Name>
              <Meta>
                {bp.kind === "concrete" ? bp.classPath : bp.baseClass}
                {bp.mixinNames.length > 0
                  ? ` · ${bp.mixinNames.join(", ")}`
                  : ""}
              </Meta>
            </Row>
          ))}
        </Group>
      ))}
    </Wrap>
  );
};
