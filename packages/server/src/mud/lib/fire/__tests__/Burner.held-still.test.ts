/**
 * ⭐ A read never writes (crowded-rooms): while a walk holds the world still
 * — the light walk asks every source for its flux — a burner reads its fuel
 * as it stands and leaves the burn to the next ordinary read. Found by the
 * test-world-lifecycle drive: a lit lamp turned `analyze light` and the
 * target binder's light read into a `bulkAmount` write, which the hold
 * refuses in a test world.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import { ThermalMixin } from '../../thermal/Thermal';
import { BurnerMixin } from '../Burner';
import { StuffApi } from '../../../api/stuff';
import { ExecutionContextApi } from '../../../api/execution-context';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestLamp extends BurnerMixin(ThermalMixin(Good)) {
  static _mixinName = 'TestLamp';
  public override burnTemperatureK = 900;
  public override maxBurnPowerW = 50;
}

describe('a burner under a held-still walk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ does not reconcile (nor even read the clock) while the world is held still', () => {
    const lamp = makeStuff(() => new TestLamp());
    const clock = vi.spyOn(StuffApi, 'findByTemplatePath');
    const release = ExecutionContextApi.holdWorldStill('light walk');
    try {
      lamp.reconcileBurnerFuel();
      lamp.getEmittedFlux();
    } finally {
      release();
    }
    expect(clock).not.toHaveBeenCalled();
  });

  it('reconciles as usual outside a hold', () => {
    const lamp = makeStuff(() => new TestLamp());
    const clock = vi.spyOn(StuffApi, 'findByTemplatePath');
    lamp.reconcileBurnerFuel();
    expect(clock).toHaveBeenCalled();
  });
});
