import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from '../simulation/SimulationEngine';

describe('Quorum Manager & Majority Consensus', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  it('starts with all 3 witnesses online and favoring Region A', () => {
    const quorum = engine.getQuorumManager().getState();
    expect(quorum.witnesses.length).toBe(3);
    expect(quorum.hasQuorum).toBe(true);
    expect(quorum.votesForA).toBe(3);
    expect(quorum.decision).toBe('FAVOR_REGION_A');
  });

  it('reaches majority (2/3) when 1 witness fails', () => {
    // 1 witness fails
    engine.setFault('quorumWitnessIdsFailed', ['witness-1']);
    engine.step();

    const quorum = engine.getQuorumManager().getState();
    expect(quorum.hasQuorum).toBe(true);
    expect(quorum.votesForA).toBe(2);
    expect(quorum.decision).toBe('FAVOR_REGION_A');
  });

  it('FAILS CLOSED when 2 witnesses fail (loss of quorum)', () => {
    // 2 witnesses fail (1 remains online)
    engine.setFault('quorumWitnessIdsFailed', ['witness-1', 'witness-2']);
    engine.step();

    const quorum = engine.getQuorumManager().getState();
    expect(quorum.hasQuorum).toBe(false);
    expect(quorum.decision).toBe('SPLIT_NO_QUORUM');
    expect(quorum.decisionReason).toContain('Quorum LOST');
  });

  it('switches quorum vote to Region B when Region A fails', () => {
    engine.setFault('regionAFailed', true);
    // Step through enough ticks for probes
    engine.step();
    engine.step();

    const quorum = engine.getQuorumManager().getState();
    expect(quorum.hasQuorum).toBe(true);
    expect(quorum.votesForB).toBeGreaterThanOrEqual(2);
    expect(quorum.decision).toBe('FAVOR_REGION_B');
  });
});
