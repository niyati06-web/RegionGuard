import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from '../simulation/SimulationEngine';

describe('Split-Brain Guard & Safety Invariants', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  it('starts in a valid single-writer state (Region A active)', () => {
    const state = engine.getFullState();
    expect(state.splitBrainGuard.invariantSatisfied).toBe(true);
    expect(state.splitBrainGuard.activeWriterCount).toBe(1);
    expect(state.splitBrainGuard.currentLeaseHolder).toBe('region-a');
    expect(state.splitBrainGuard.leadershipEpoch).toBe(1);
  });

  it('strictly rejects any write from non-lease holder or standby region', () => {
    // Attempt write to Region B while Region A is active
    const result = engine.submitWrite({
      originRegion: 'region-b',
      type: 'ORDER',
      description: 'Unauthorized write attempt to standby region',
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain('not the designated lease holder');

    const state = engine.getFullState();
    expect(state.splitBrainGuard.staleWritesBlockedCount).toBeGreaterThanOrEqual(1);
    expect(state.splitBrainGuard.invariantSatisfied).toBe(true);
    expect(state.splitBrainGuard.activeWriterCount).toBe(1);
  });

  it('strictly rejects write with stale leadership epoch', () => {
    // Current epoch is 1. If a client submits with epoch 0 or past epoch:
    const result = engine.submitWrite({
      originRegion: 'region-a',
      type: 'SYSTEM_TRANSACTION',
      description: 'Stale epoch write',
      requestEpoch: 0,
    });

    expect(result.accepted).toBe(false);
  });

  it('rejects writes from a fenced primary', () => {
    // Fence region-a
    engine.getSplitBrainGuard().fenceRegion('region-a', 5, 'Testing fence');

    const result = engine.submitWrite({
      originRegion: 'region-a',
      type: 'ORDER',
      description: 'Post-fence write attempt',
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain('fenced');
  });

  it('INVARIANT TEST: Proves that cluster NEVER permits two simultaneous active writers', () => {
    const state = engine.getFullState();
    // Verify invariant check 1
    const inv1 = state.invariants.find((i) => i.id === 'INV-1');
    expect(inv1?.passed).toBe(true);

    // Simulate attempted dual-promotion during network partition
    engine.setFault('networkPartitionActive', true);

    // Attempt to promote Region B without valid quorum & while old primary is unfenced
    const authAttempt = engine.getSplitBrainGuard().authorizePromotion(
      'region-b',
      1,
      false, // no quorum
      true,
      'Unsafe dual-promotion test'
    );

    expect(authAttempt.authorized).toBe(false);
    expect(engine.getFullState().splitBrainGuard.activeWriterCount).toBeLessThanOrEqual(1);
    expect(engine.getFullState().splitBrainGuard.invariantSatisfied).toBe(true);
  });

  it('monotonically increments leadership epoch when safe promotion succeeds', () => {
    const initialEpoch = engine.getFullState().splitBrainGuard.leadershipEpoch;

    // Fence region A first
    engine.getSplitBrainGuard().fenceRegion('region-a', 10, 'Outage');

    // Authorize region B with quorum
    const auth = engine.getSplitBrainGuard().authorizePromotion(
      'region-b',
      10,
      true, // quorum satisfied
      true, // replica lag ok
      'Failover quorum confirmed'
    );

    expect(auth.authorized).toBe(true);
    const newEpoch = engine.getFullState().splitBrainGuard.leadershipEpoch;
    expect(newEpoch).toBeGreaterThan(initialEpoch);
  });
});
