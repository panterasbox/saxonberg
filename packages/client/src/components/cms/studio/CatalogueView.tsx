/**
 * CatalogueView — the content author's home and the headliner of the Studio
 * "Kinds" tab. A search box filters the blueprint catalogue by name / mixin;
 * compact cards are grouped by hierarchy (`parent`), blessed (★) first. Each
 * card shows JUST the name + a kind badge (composition/concrete) + ★; a
 * chevron expands the mixin lineage in place (never inline by default).
 * Selecting a card routes to the blueprint detail view; a prominent
 * "＋ Author a new kind" button routes to the composer.
 *
 * REST-only over `studioListBlueprints`; the picker owns ZERO command
 * semantics — selecting merely navigates. All filtering is local.
 */

import React from "react";
import styled from "styled-components";
import type { BlueprintSummary } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { tokens } from "../../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const Search = styled.input`
  flex: 1;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

const NewButton = styled.button`
  flex: none;
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.primaryHover};
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${tokens.space.md};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
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

const Card = styled.div<{ $blessed: boolean }>`
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surfaceSunken};
  border: 1px solid
    ${(p) => (p.$blessed ? tokens.color.primary : tokens.color.border)};
  border-radius: ${tokens.radius.md};
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
`;

const Chevron = styled.button<{ $open: boolean }>`
  flex: none;
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  font-size: ${tokens.font.small};
  padding: 0 2px;
  transform: rotate(${(p) => (p.$open ? "90deg" : "0deg")});
  transition: transform 0.12s ease;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

const NameButton = styled.button`
  flex: 1;
  text-align: left;
  background: transparent;
  border: none;
  color: ${tokens.color.fg};
  cursor: pointer;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-weight: 600;
  padding: 0;

  &:hover {
    color: ${tokens.color.primary};
  }
`;

const Star = styled.span`
  color: ${tokens.color.primary};
  flex: none;
`;

const Badge = styled.span<{ $concrete: boolean }>`
  flex: none;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px ${tokens.space.xs};
  border-radius: ${tokens.radius.sm};
  color: ${(p) => (p.$concrete ? tokens.color.accent : tokens.color.fgMuted)};
  border: 1px solid
    ${(p) => (p.$concrete ? tokens.color.accent : tokens.color.border)};
`;

const Lineage = styled.div`
  padding: 0 ${tokens.space.sm} ${tokens.space.sm} 26px;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  word-break: break-word;
`;

const Status = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.md};
`;

/** Local search predicate: match on name or any mixin name (case-insensitive). */
export function matchesSearch(bp: BlueprintSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  if (bp.name.toLowerCase().includes(q)) return true;
  if (bp.baseClass.toLowerCase().includes(q)) return true;
  return bp.mixinNames.some((m) => m.toLowerCase().includes(q));
}

/** Group blueprints by `parent`, blessed-first within each group. */
export function groupByParent(
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

const CatalogueCard: React.FC<{ bp: BlueprintSummary }> = ({ bp }) => {
  const [open, setOpen] = React.useState(false);
  const select = useStore((s) => s.studioSelectBlueprint);
  return (
    <Card $blessed={bp.blessed}>
      <CardHead>
        <Chevron
          type="button"
          $open={open}
          aria-expanded={open}
          title={open ? "Hide mixin lineage" : "Show mixin lineage"}
          onClick={() => setOpen((o) => !o)}
        >
          ▶
        </Chevron>
        {bp.blessed && <Star title="Blessed (curated)">★</Star>}
        <NameButton
          type="button"
          title={`Open ${bp.name} · ${bp.classPath ?? bp.baseClass}`}
          onClick={() => select(bp)}
        >
          {bp.name}
        </NameButton>
        <Badge $concrete={bp.kind === "concrete"}>{bp.kind}</Badge>
      </CardHead>
      {open && (
        <Lineage>
          {bp.baseClass}
          {bp.mixinNames.length > 0 ? ` · ${bp.mixinNames.join(", ")}` : ""}
        </Lineage>
      )}
    </Card>
  );
};

export const CatalogueView: React.FC = () => {
  const blueprints = useStore((s) => s.studio.blueprints);
  const error = useStore((s) => s.studio.blueprintsError);
  const search = useStore((s) => s.studio.search);
  const setSearch = useStore((s) => s.studioSetSearch);
  const listBlueprints = useStore((s) => s.studioListBlueprints);
  const beginComposer = useStore((s) => s.studioBeginComposer);

  React.useEffect(() => {
    if (blueprints === null) void listBlueprints();
  }, [blueprints, listBlueprints]);

  const filtered = (blueprints ?? []).filter((bp) => matchesSearch(bp, search));
  const groups = groupByParent(filtered);

  return (
    <Wrap>
      <TopBar>
        <Search
          value={search}
          placeholder="Search kinds by name or mixin…"
          spellCheck={false}
          aria-label="Search blueprints"
          onChange={(e) => setSearch(e.target.value)}
        />
        <NewButton
          type="button"
          title="Author a new kind (compose a new backing class)"
          onClick={() => beginComposer()}
        >
          ＋ Author a new kind
        </NewButton>
      </TopBar>
      <Body>
        {error && <Status>Could not load blueprints: {error}</Status>}
        {!error && blueprints === null && <Status>Loading kinds…</Status>}
        {!error && blueprints !== null && filtered.length === 0 && (
          <Status>
            {search.trim() === ""
              ? "No kinds catalogued."
              : `No kinds match “${search}”.`}
          </Status>
        )}
        {groups.map(([parent, list]) => (
          <Group key={parent}>
            <GroupLabel>{parent}</GroupLabel>
            {list.map((bp) => (
              <CatalogueCard key={bp.blueprintId} bp={bp} />
            ))}
          </Group>
        ))}
      </Body>
    </Wrap>
  );
};
