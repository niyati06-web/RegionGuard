import { ScenarioDefinition, ScenarioId } from '../types/simulation';
import { SimulationEngine } from './SimulationEngine';

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'NORMAL_OPERATION',
    title: 'Scenario 1: Normal Operation (Steady State)',
    category: 'Baseline',
    shortDescription: 'All components healthy, Region A is primary, Region B is standby with active replication.',
    expectedBehavior: 'Active writers: 1 (Region A). Quorum 3/3 healthy. Low replication lag. DNS points to Region A.',
    tags: ['baseline', 'healthy', 'quorum'],
  },
  {
    id: 'PRIMARY_REGION_FAILURE',
    title: 'Scenario 2: Primary Region Outage (Safe Automated Failover)',
    category: 'Failover',
    shortDescription: 'Total power / fiber failure in Region A. Probes fail repeatedly.',
    expectedBehavior: 'Health monitor suspects failure -> Quorum votes for Region B -> Old primary fenced -> Region B promoted under new epoch -> DNS updated.',
    tags: ['failover', 'automated', 'fencing'],
  },
  {
    id: 'PRIMARY_DATABASE_FAILURE',
    title: 'Scenario 3: Primary Database Crash (App Survives)',
    category: 'Failover',
    shortDescription: 'Region A application web tier is alive, but its primary PostgreSQL/MySQL instance crashes.',
    expectedBehavior: 'Monitor distinguishes DB failure from app failure. Controller blocks writes to Region A, promotes Region B replica.',
    tags: ['database', 'selective-failover'],
  },
  {
    id: 'NETWORK_PARTITION',
    title: 'Scenario 4: Cross-Region Network Partition (Split-Brain Test)',
    category: 'Split-Brain',
    shortDescription: 'WAN connection severed between regions. Both regions are running internally.',
    expectedBehavior: 'Split-Brain Guard enforces lease expiry & witness majority. Isolated region cannot renew lease. Never 2 writers!',
    tags: ['split-brain', 'partition', 'safety'],
  },
  {
    id: 'QUORUM_LOSS',
    title: 'Scenario 5: Loss of Witness Quorum (Fail-Closed Safety)',
    category: 'Consensus',
    shortDescription: '2 of the 3 witness nodes crash or become unreachable.',
    expectedBehavior: 'Quorum lost (1/3 votes). Controller fails closed. Rejects any leadership promotion until quorum is restored.',
    tags: ['quorum', 'fail-closed', 'safety'],
  },
  {
    id: 'REPLICATION_LAG',
    title: 'Scenario 6: High Replication Lag & Consistency Trade-Off',
    category: 'Database',
    shortDescription: 'Cross-region network congestion injects 4000ms+ lag and replication backlog.',
    expectedBehavior: 'Under Safety-First policy, promotion is blocked to avoid data loss. Under Availability-First, data loss window is calculated.',
    tags: ['replication', 'lag', 'data-loss'],
  },
  {
    id: 'DNS_PROPAGATION_DELAY',
    title: 'Scenario 7: DNS TTL & Cache Propagation Delay',
    category: 'Networking',
    shortDescription: 'Demonstrates why DNS failover is not instantaneous. Client resolvers cache responses.',
    expectedBehavior: 'Record updates immediately, but client traffic migration curve shows gradual cutover as TTL expires.',
    tags: ['dns', 'ttl', 'caching'],
  },
  {
    id: 'FALSE_HEALTH_CHECK_FLAPPING',
    title: 'Scenario 8: Flapping & Intermittent Health Check Failures',
    category: 'Resilience',
    shortDescription: 'Temporary transient packet drops cause intermittent probe failures (flapping).',
    expectedBehavior: 'Consecutive failure threshold prevents erratic, premature failover triggers.',
    tags: ['flapping', 'thresholds', 'anti-hysteresis'],
  },
  {
    id: 'SECONDARY_REGION_FAILURE',
    title: 'Scenario 9: Passive Secondary Region Outage',
    category: 'Resilience',
    shortDescription: 'Region B goes down while Region A is primary.',
    expectedBehavior: 'Primary Region A continues serving traffic uninterrupted; replication paused with alert.',
    tags: ['standby', 'unaffected-primary'],
  },
  {
    id: 'RECOVERY_AND_FAILBACK',
    title: 'Scenario 10: Controlled Recovery & Planned Failback',
    category: 'Failback',
    shortDescription: 'Region A recovers after failover. System stabilizes and prepares safe return.',
    expectedBehavior: 'No abrupt auto-failback. Controller verifies Region A synchronization before coordinated lease handover.',
    tags: ['failback', 'recovery', 'handover'],
  },
];

export class ScenarioRunner {
  private engine: SimulationEngine;

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  public getScenarios(): ScenarioDefinition[] {
    return SCENARIO_DEFINITIONS;
  }

  public runScenario(id: ScenarioId): { success: boolean; scenario: ScenarioDefinition } {
    const scenario = SCENARIO_DEFINITIONS.find(s => s.id === id);
    if (!scenario) {
      throw new Error(`Scenario ${id} not found.`);
    }

    // Reset simulation to clean baseline before applying scenario faults
    this.engine.reset();
    this.engine.setActiveScenario(id);

    switch (id) {
      case 'NORMAL_OPERATION': {
        // Clear all faults, clean steady state
        this.engine.clearFaults();
        break;
      }

      case 'PRIMARY_REGION_FAILURE': {
        this.engine.clearFaults();
        this.engine.setFault('regionAFailed', true);
        break;
      }

      case 'PRIMARY_DATABASE_FAILURE': {
        this.engine.clearFaults();
        this.engine.setFault('regionADbFailed', true);
        break;
      }

      case 'NETWORK_PARTITION': {
        this.engine.clearFaults();
        this.engine.setFault('networkPartitionActive', true);
        this.engine.setFault('replicationLinkSevered', true);
        break;
      }

      case 'QUORUM_LOSS': {
        this.engine.clearFaults();
        this.engine.setFault('quorumWitnessIdsFailed', ['witness-1', 'witness-2']);
        break;
      }

      case 'REPLICATION_LAG': {
        this.engine.clearFaults();
        this.engine.setFault('highReplicationLagInjected', true);
        break;
      }

      case 'DNS_PROPAGATION_DELAY': {
        this.engine.clearFaults();
        this.engine.setFault('dnsPropagationDelayed', true);
        this.engine.getDnsSimulator().setTtl(15);
        this.engine.getDnsSimulator().setPropagationDelay(10);
        // Also trigger failover to demonstrate DNS curve
        this.engine.setFault('regionAFailed', true);
        break;
      }

      case 'FALSE_HEALTH_CHECK_FLAPPING': {
        this.engine.clearFaults();
        this.engine.setFault('healthFlappingActive', true);
        break;
      }

      case 'SECONDARY_REGION_FAILURE': {
        this.engine.clearFaults();
        this.engine.setFault('regionBFailed', true);
        break;
      }

      case 'RECOVERY_AND_FAILBACK': {
        // First put cluster in Region B active state, then restore Region A
        this.engine.clearFaults();
        this.engine.setFault('regionAFailed', true);
        // The user will step through failover then click recover/failback
        break;
      }
    }

    return { success: true, scenario };
  }
}
