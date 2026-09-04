/**
 * The two archetype substrate fields (logistics D19 / P6).
 *
 * D19 said "one substrate change". Honest accounting says two, and the
 * second is not optional: without `surveyScope`, five new industry-less
 * archetypes — corridor, depot, haulage-rig, passenger-conveyance,
 * livery — land on **every `survey` in the game**, in every bedroom, for
 * every player.
 *
 * ⭐ The load-bearing assertion is the first one: every shipped
 * archetype is byte-identical with both fields unauthored.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Archetype, SURVEY_SCOPES } from '../Archetype';
import { StuffApi } from '../../../api/stuff';

const BARE = {
  archetypeId: 'test-bare',
  label: 'a bare archetype',
  capabilities: [{ key: 'seat', needs: { seating: 1 } }],
};

describe('Archetype — materializesOnto / surveyScope', () => {
  afterEach(() => vi.restoreAllMocks());

  it('the shipped shape is unchanged with both fields absent (AC15k)', () => {
    const a = Archetype.fromData({ ...BARE });
    expect(a.getMaterializesOnto()).toBe('/platform/location/venue');
    expect(a.getSurveyScope()).toBe('space');
  });

  it('materializesOnto is an authored template path', () => {
    const a = Archetype.fromData({
      ...BARE,
      materializesOnto: '/system/transport/thing/HaulageRig',
    });
    expect(a.getMaterializesOnto()).toBe('/system/transport/thing/HaulageRig');
  });

  it('refuses a materializesOnto that is not a path', () => {
    expect(() =>
      Archetype.fromData({ ...BARE, materializesOnto: 'HaulageRig' }),
    ).toThrow(/template path/);
  });

  it('surveyScope takes the three values and nothing else', () => {
    for (const scope of SURVEY_SCOPES) {
      expect(Archetype.fromData({ ...BARE, surveyScope: scope }).getSurveyScope()).toBe(scope);
    }
    expect(() =>
      Archetype.fromData({ ...BARE, surveyScope: 'everywhere' }),
    ).toThrow(/surveyScope/);
  });

  it('the needs vocabulary is unchanged — no ninth need (AC15m)', () => {
    // A corridor's four slots are all EXISTING needs: shelter is seating,
    // water is a bulk source, crossing is a presence, light is lux. If
    // this build had needed a new need, this would fail at parse.
    const corridor = Archetype.fromData({
      archetypeId: 'corridor',
      label: 'a way',
      surveyScope: 'corridor',
      capabilities: [
        { key: 'shelter', needs: { seating: 1 } },
        { key: 'water', needs: { bulkSource: 'water' } },
        { key: 'crossing', needs: { presence: 'bridge' } },
        { key: 'light', needs: { lightLux: 1 } },
      ],
    });
    expect(corridor.getCapabilities()).toHaveLength(4);
    expect(() =>
      Archetype.fromData({
        ...BARE,
        capabilities: [{ key: 'x', needs: { throughput: 3 } }],
      }),
    ).toThrow(/unknown need/);
  });

  it('materializes onto a NON-LOCATION container (AC15k)', async () => {
    // A `haulage-rig` archetype builds a wagon, not a room. The checker
    // never cared whether the space was a location; the only thing that
    // bound archetypes to rooms was one constant.
    const cloned: string[] = [];
    const fake = { __container: true } as unknown as never;
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      return fake;
    }) as typeof StuffApi.clone);

    const rig = Archetype.fromData({
      ...BARE,
      materializesOnto: '/system/transport/thing/HaulageRig',
      capabilities: [],
    });
    await rig.materialize();
    expect(cloned).toEqual(['/system/transport/thing/HaulageRig']);

    // …and the unauthored case still builds the bare venue row.
    cloned.length = 0;
    await Archetype.fromData({ ...BARE, capabilities: [] }).materialize();
    expect(cloned).toEqual(['/platform/location/venue']);
  });
});
