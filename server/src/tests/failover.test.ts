import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from '../simulation/SimulationEngine';

describe('Automated Failover & Failback State Machine', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  it('progresses from PRIMARY_ACTIVE to PRIMARY_SUSPECTED then to SECONDARY_ACTIVE during outage', () => {
    expect(engine.getFullState().failover.currentState).toBe('PRIMARY_ACTIVE');
    expect(engine.getFullState().splitBrainGuard.currentLeaseHolder).toBe('region-a');

    // Inject Region A failure
    engine.setFault('regionAFailed', true);

    // Step 1: Health check fails, counter = 1
    engine.step();
    // Step 2: Consecutive failures = 2 -> PRIMARY_SUSPECTED
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('PRIMARY_SUSPECTED');

    // Step 3: Hits failover confirmation threshold (3) -> FAILOVER_EVALUATION
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('FAILOVER_EVALUATION');

    // Step 4: Secondary readiness verified -> QUORUM_CHECK
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('QUORUM_CHECK');

    // Step 5: Quorum majority achieved -> FENCING_OLD_PRIMARY
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('FENCING_OLD_PRIMARY');

    // Step 6: Old primary fenced -> PROMOTION_AUTHORIZED
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('PROMOTION_AUTHORIZED');

    // Step 7: Promotion authorized -> SECONDARY_PROMOTED
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('SECONDARY_PROMOTED');

    // Step 8: Secondary promoted -> DNS_UPDATING
    engine.step();
    expect(engine.getFullState().failover.currentState).toBe('DNS_UPDATING');
    expect(engine.getFullState().dns.currentRecordTarget).toBe('region-b');

    // Step through DNS TTL propagation until SECONDARY_ACTIVE
    for (let i = 0; i < 20; i++) {
      engine.step();
      if (engine.getFullState().failover.currentState === 'SECONDARY_ACTIVE') break;
    }

    expect(engine.getFullState().failover.currentState).toBe('SECONDARY_ACTIVE');
    expect(engine.getFullState().splitBrainGuard.currentLeaseHolder).toBe('region-b');
    expect(engine.getFullState().splitBrainGuard.activeWriterCount).toBe(1);

    // Verify Region B can now accept writes!
    const writeResult = engine.submitWrite({
      originRegion: 'region-b',
      type: 'ORDER',
      description: 'Transaction processed after successful failover',
    });
    expect(writeResult.accepted).toBe(true);
  });

  it('rejects promotion when replication lag is high under SAFETY_FIRST policy', () => {
    engine.getReplicationSimulator().setPromotionPolicy('SAFETY_FIRST');
    engine.setFault('highReplicationLagInjected', true);
    engine.setFault('regionAFailed', true);

    // Step 1: counter = 1
    engine.step();
    // Step 2: PRIMARY_SUSPECTED
    engine.step();
    // Step 3: FAILOVER_EVALUATION
    engine.step();
    // Step 4: Evaluation evaluates replica lag -> rejects -> DEGRADED_NO_SAFE_WRITER
    engine.step();

    const state = engine.getFullState();
    expect(state.failover.currentState).toBe('DEGRADED_NO_SAFE_WRITER');
    expect(state.failover.transitionReason).toContain('Safety-First Policy');
  });

  it('allows promotion with explicit data loss tracking under AVAILABILITY_FIRST policy', () => {
    engine.getReplicationSimulator().setPromotionPolicy('AVAILABILITY_FIRST');
    engine.setFault('highReplicationLagInjected', true);
    engine.setFault('regionAFailed', true);

    // Step through to failover completion
    for (let i = 0; i < 30; i++) {
      engine.step();
      if (engine.getFullState().failover.currentState === 'SECONDARY_ACTIVE') break;
    }

    expect(engine.getFullState().failover.currentState).toBe('SECONDARY_ACTIVE');
    expect(engine.getFullState().splitBrainGuard.currentLeaseHolder).toBe('region-b');
  });

  it('prevents premature failover during temporary health check flapping', () => {
    engine.setFault('healthFlappingActive', true);

    // Step several times
    for (let i = 0; i < 8; i++) {
      engine.step();
    }

    const state = engine.getFullState();
    expect(state.failover.currentState).not.toBe('SECONDARY_PROMOTED');
    expect(state.failover.currentState).not.toBe('SECONDARY_ACTIVE');
  });

  it('executes controlled failback back to Region A after restoration', () => {
    // 1. Move to Region B active
    engine.setFault('regionAFailed', true);
    for (let i = 0; i < 30; i++) {
      engine.step();
      if (engine.getFullState().failover.currentState === 'SECONDARY_ACTIVE') break;
    }
    expect(engine.getFullState().failover.currentState).toBe('SECONDARY_ACTIVE');

    // 2. Restore Region A
    engine.setFault('regionAFailed', false);
    // Step enough times so Region A's health recovers
    engine.step();
    engine.step();
    engine.step();

    // 3. Initiate failback
    const failbackResult = engine.getFailoverController().initiateManualFailback(engine.getFullState().simulationTime);
    expect(failbackResult.success).toBe(true);

    // Step through failback transitions
    for (let i = 0; i < 15; i++) {
      engine.step();
      if (engine.getFullState().failover.currentState === 'PRIMARY_ACTIVE') break;
    }

    expect(engine.getFullState().failover.currentState).toBe('PRIMARY_ACTIVE');
    expect(engine.getFullState().splitBrainGuard.currentLeaseHolder).toBe('region-a');
  });
});
