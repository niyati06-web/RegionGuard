import {
  ActiveFaults,
  MetricSnapshot,
  PromotionPolicy,
  RegionId,
  RegionState,
  ScenarioId,
  SimulationState,
  SimulationStatus,
} from '../types/simulation';
import { EventLogger } from './EventLogger';
import { MetricsCollector } from './MetricsCollector';
import { SimulationClock } from './SimulationClock';
import { HealthMonitor } from './HealthMonitor';
import { QuorumManager } from './QuorumManager';
import { SplitBrainGuard } from './SplitBrainGuard';
import { ReplicationSimulator } from './ReplicationSimulator';
import { DnsSimulator } from './DnsSimulator';
import { FailoverController } from './FailoverController';
import { InvariantChecker } from './InvariantChecker';
import { ScenarioRunner } from './ScenarioRunner';
import { ReportGenerator } from './ReportGenerator';

export type StateUpdateListener = (state: SimulationState) => void;

export class SimulationEngine {
  private clock: SimulationClock;
  private logger: EventLogger;
  private metrics: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private quorumManager: QuorumManager;
  private splitBrainGuard: SplitBrainGuard;
  private replicationSimulator: ReplicationSimulator;
  private dnsSimulator: DnsSimulator;
  private failoverController: FailoverController;
  private invariantChecker: InvariantChecker;
  private scenarioRunner: ScenarioRunner;

  private status: SimulationStatus = 'IDLE';
  private activeScenario: ScenarioId | null = null;
  private stateListeners: StateUpdateListener[] = [];

  private faults: ActiveFaults = {
    regionAFailed: false,
    regionBFailed: false,
    regionADbFailed: false,
    regionBDbFailed: false,
    replicationLinkSevered: false,
    networkPartitionActive: false,
    quorumWitnessIdsFailed: [],
    highReplicationLagInjected: false,
    dnsPropagationDelayed: false,
    healthFlappingActive: false,
  };

  private regions: {
    'region-a': RegionState;
    'region-b': RegionState;
  };

  constructor(tickRateMs: number = 1000) {
    this.logger = new EventLogger();
    this.metrics = new MetricsCollector();
    this.clock = new SimulationClock(tickRateMs);
    this.healthMonitor = new HealthMonitor(this.logger);
    this.quorumManager = new QuorumManager(this.logger);
    this.splitBrainGuard = new SplitBrainGuard(this.logger);
    this.replicationSimulator = new ReplicationSimulator(this.logger);
    this.dnsSimulator = new DnsSimulator(this.logger);
    this.failoverController = new FailoverController(
      this.logger,
      this.splitBrainGuard,
      this.quorumManager,
      this.replicationSimulator,
      this.dnsSimulator
    );
    this.invariantChecker = new InvariantChecker();
    this.scenarioRunner = new ScenarioRunner(this);

    this.regions = {
      'region-a': {
        id: 'region-a',
        name: 'US-East (Primary Region)',
        location: 'Virginia (us-east-1)',
        status: 'HEALTHY',
        isOnline: true,
        appStatus: 'HEALTHY',
        dbStatus: 'HEALTHY',
        monitorStatus: 'HEALTHY',
        role: 'PRIMARY',
        availabilityPercent: 99.99,
        consecutiveFailedChecks: 0,
        lastHealthCheckTime: 0,
        activeConnections: 1420,
        requestsPerSecond: 280,
      },
      'region-b': {
        id: 'region-b',
        name: 'US-West (Secondary Region)',
        location: 'Oregon (us-west-2)',
        status: 'HEALTHY',
        isOnline: true,
        appStatus: 'HEALTHY',
        dbStatus: 'HEALTHY',
        monitorStatus: 'HEALTHY',
        role: 'STANDBY',
        availabilityPercent: 99.99,
        consecutiveFailedChecks: 0,
        lastHealthCheckTime: 0,
        activeConnections: 45,
        requestsPerSecond: 0,
      },
    };

    // Log startup
    this.logger.log({
      simulationTime: 0,
      eventType: 'SIMULATION_INITIALIZED',
      severity: 'INFO',
      component: 'SimulationEngine',
      description: 'RegionGuard simulation engine initialized. Active-passive cluster online.',
    });

    // Wire clock tick
    this.clock.onTick((simTime) => {
      this.tick(simTime);
    });
  }

  public getFullState(): SimulationState {
    const simTime = this.clock.getTime();
    const splitBrainState = this.splitBrainGuard.getState(simTime);
    const quorumState = this.quorumManager.getState();
    const dbState = this.replicationSimulator.getState();
    const dnsState = this.dnsSimulator.getState();
    const failoverState = this.failoverController.getState();

    const state: SimulationState = {
      status: this.status,
      simulationTime: simTime,
      tickRateMs: this.clock.getTickRate(),
      failover: failoverState as any,
      regions: {
        'region-a': { ...this.regions['region-a'] },
        'region-b': { ...this.regions['region-b'] },
      },
      quorum: quorumState,
      splitBrainGuard: splitBrainState,
      database: dbState,
      dns: dnsState,
      network: {
        isPartitioned: this.faults.networkPartitionActive,
        replicationLinkConnected: !this.faults.replicationLinkSevered,
        witnessConnectivity: {
          'witness-1': !this.faults.quorumWitnessIdsFailed.includes('witness-1'),
          'witness-2': !this.faults.quorumWitnessIdsFailed.includes('witness-2'),
          'witness-3': !this.faults.quorumWitnessIdsFailed.includes('witness-3'),
        },
      },
      faults: { ...this.faults },
      activeScenario: this.activeScenario,
      invariants: [],
    };

    state.invariants = this.invariantChecker.evaluateInvariants(state);
    return state;
  }

  public tick(simTime: number): void {
    // 1. Health monitoring update for both regions
    this.healthMonitor.updateRegionHealth({
      regionState: this.regions['region-a'],
      simTime,
      forceAppDown: this.faults.regionAFailed,
      forceDbDown: this.faults.regionAFailed || this.faults.regionADbFailed,
      isFlapping: this.faults.healthFlappingActive,
    });

    this.healthMonitor.updateRegionHealth({
      regionState: this.regions['region-b'],
      simTime,
      forceAppDown: this.faults.regionBFailed,
      forceDbDown: this.faults.regionBFailed || this.faults.regionBDbFailed,
      isFlapping: false,
    });

    // 2. Quorum witness evaluation
    this.quorumManager.evaluateVotes({
      simTime,
      regionAHealthy: this.regions['region-a'].appStatus === 'HEALTHY',
      regionBHealthy: this.regions['region-b'].appStatus === 'HEALTHY',
      regionADbHealthy: this.regions['region-a'].dbStatus === 'HEALTHY',
      regionBDbHealthy: this.regions['region-b'].dbStatus === 'HEALTHY',
      isNetworkPartitioned: this.faults.networkPartitionActive,
      failedWitnessIds: this.faults.quorumWitnessIdsFailed,
      witnessConnectivity: {
        'witness-1': !this.faults.quorumWitnessIdsFailed.includes('witness-1'),
        'witness-2': !this.faults.quorumWitnessIdsFailed.includes('witness-2'),
        'witness-3': !this.faults.quorumWitnessIdsFailed.includes('witness-3'),
      },
    });

    // 3. Database replication tick
    this.replicationSimulator.tickReplication({
      simTime,
      isReplicationSevered: this.faults.replicationLinkSevered || this.faults.networkPartitionActive,
      isHighLagInjected: this.faults.highReplicationLagInjected,
      primaryDbHealthy:
        this.splitBrainGuard.getCurrentLeaseHolder(simTime) === 'region-a'
          ? this.regions['region-a'].dbStatus === 'HEALTHY'
          : this.regions['region-b'].dbStatus === 'HEALTHY',
      replicaDbHealthy:
        this.splitBrainGuard.getCurrentLeaseHolder(simTime) === 'region-a'
          ? this.regions['region-b'].dbStatus === 'HEALTHY'
          : this.regions['region-a'].dbStatus === 'HEALTHY',
    });

    // 4. DNS propagation tick
    this.dnsSimulator.tickPropagation(simTime);

    // 5. Failover controller state machine progression
    this.failoverController.tickStateMachine({
      simTime,
      regionA: this.regions['region-a'],
      regionB: this.regions['region-b'],
    });

    // 6. Update traffic distribution and connections
    const currentWriter = this.splitBrainGuard.getCurrentLeaseHolder(simTime);
    if (currentWriter === 'region-a') {
      this.regions['region-a'].role = 'PRIMARY';
      this.regions['region-b'].role = this.regions['region-b'].role === 'FENCED' ? 'FENCED' : 'STANDBY';
      this.regions['region-a'].requestsPerSecond = this.regions['region-a'].appStatus === 'HEALTHY' ? 280 : 0;
      this.regions['region-b'].requestsPerSecond = 0;
    } else if (currentWriter === 'region-b') {
      this.regions['region-b'].role = 'PRIMARY';
      this.regions['region-a'].role = this.regions['region-a'].role === 'FENCED' ? 'FENCED' : 'STANDBY';
      this.regions['region-b'].requestsPerSecond = this.regions['region-b'].appStatus === 'HEALTHY' ? 280 : 0;
      this.regions['region-a'].requestsPerSecond = 0;
    }

    // 7. Update overall status
    const failoverCurr = this.failoverController.getState().currentState;
    if (failoverCurr === 'SECONDARY_ACTIVE' || failoverCurr === 'PRIMARY_ACTIVE') {
      this.status = this.clock.isActive() ? 'RUNNING' : 'PAUSED';
    } else if (failoverCurr.includes('DEGRADED')) {
      this.status = 'DEGRADED';
    } else if (failoverCurr.includes('FAILBACK') || failoverCurr.includes('RECOVERY')) {
      this.status = 'RECOVERING';
    } else {
      this.status = 'FAILING_OVER';
    }

    // 8. Capture metric snapshot
    const fullState = this.getFullState();
    const snapshot: MetricSnapshot = {
      simulationTime: simTime,
      timestamp: Date.now(),
      regionAHealth: this.regions['region-a'].availabilityPercent,
      regionBHealth: this.regions['region-b'].availabilityPercent,
      requestsPerSecond: fullState.regions[fullState.dns.currentRecordTarget].requestsPerSecond,
      requestSuccessRate:
        fullState.regions[fullState.dns.currentRecordTarget].appStatus === 'HEALTHY' ? 99.8 : 0,
      replicationLagMs: fullState.database.replicationLagMs,
      quorumAvailability: fullState.quorum.hasQuorum ? 100 : 33,
      dnsTrafficA: fullState.dns.clientTrafficDistribution.regionA,
      dnsTrafficB: fullState.dns.clientTrafficDistribution.regionB,
      acceptedWrites: fullState.database.totalWritesAccepted,
      rejectedWrites: fullState.database.totalWritesRejected,
    };
    this.metrics.recordSnapshot(snapshot);

    // 9. Notify listeners
    this.notifyStateListeners(fullState);
  }

  public subscribe(listener: StateUpdateListener): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  private notifyStateListeners(state: SimulationState): void {
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in state update listener:', err);
      }
    }
  }

  // Simulation controls
  public start(): void {
    this.status = 'RUNNING';
    this.clock.start();
    this.logger.log({
      simulationTime: this.clock.getTime(),
      eventType: 'SIMULATION_STARTED',
      severity: 'INFO',
      component: 'SimulationEngine',
      description: 'Simulation execution resumed.',
    });
    this.notifyStateListeners(this.getFullState());
  }

  public pause(): void {
    this.status = 'PAUSED';
    this.clock.pause();
    this.logger.log({
      simulationTime: this.clock.getTime(),
      eventType: 'SIMULATION_PAUSED',
      severity: 'INFO',
      component: 'SimulationEngine',
      description: 'Simulation execution paused.',
    });
    this.notifyStateListeners(this.getFullState());
  }

  public step(): void {
    this.clock.step();
  }

  public reset(): void {
    this.clock.reset();
    this.status = 'IDLE';
    this.activeScenario = null;
    this.clearFaults();
    this.splitBrainGuard.reset();
    this.quorumManager.reset();
    this.replicationSimulator.reset();
    this.dnsSimulator.reset();
    this.failoverController.reset();
    this.invariantChecker.reset();
    this.metrics.clear();

    this.regions['region-a'] = {
      id: 'region-a',
      name: 'US-East (Primary Region)',
      location: 'Virginia (us-east-1)',
      status: 'HEALTHY',
      isOnline: true,
      appStatus: 'HEALTHY',
      dbStatus: 'HEALTHY',
      monitorStatus: 'HEALTHY',
      role: 'PRIMARY',
      availabilityPercent: 99.99,
      consecutiveFailedChecks: 0,
      lastHealthCheckTime: 0,
      activeConnections: 1420,
      requestsPerSecond: 280,
    };

    this.regions['region-b'] = {
      id: 'region-b',
      name: 'US-West (Secondary Region)',
      location: 'Oregon (us-west-2)',
      status: 'HEALTHY',
      isOnline: true,
      appStatus: 'HEALTHY',
      dbStatus: 'HEALTHY',
      monitorStatus: 'HEALTHY',
      role: 'STANDBY',
      availabilityPercent: 99.99,
      consecutiveFailedChecks: 0,
      lastHealthCheckTime: 0,
      activeConnections: 45,
      requestsPerSecond: 0,
    };

    this.logger.log({
      simulationTime: 0,
      eventType: 'SIMULATION_RESET',
      severity: 'INFO',
      component: 'SimulationEngine',
      description: 'Simulation environment completely reset to pristine baseline.',
    });

    this.notifyStateListeners(this.getFullState());
  }

  // Fault management
  public setFault<K extends keyof ActiveFaults>(key: K, value: ActiveFaults[K]): void {
    this.faults[key] = value;
    this.logger.log({
      simulationTime: this.clock.getTime(),
      eventType: 'FAULT_INJECTED',
      severity: 'WARN',
      component: 'FaultInjectionSystem',
      description: `Injected fault [${key}]: ${JSON.stringify(value)}`,
    });
    this.notifyStateListeners(this.getFullState());
  }

  public clearFaults(): void {
    this.faults = {
      regionAFailed: false,
      regionBFailed: false,
      regionADbFailed: false,
      regionBDbFailed: false,
      replicationLinkSevered: false,
      networkPartitionActive: false,
      quorumWitnessIdsFailed: [],
      highReplicationLagInjected: false,
      dnsPropagationDelayed: false,
      healthFlappingActive: false,
    };
    this.logger.log({
      simulationTime: this.clock.getTime(),
      eventType: 'FAULTS_CLEARED',
      severity: 'INFO',
      component: 'FaultInjectionSystem',
      description: 'All active failure injections cleared.',
    });
    this.notifyStateListeners(this.getFullState());
  }

  // Database write operation
  public submitWrite(params: {
    originRegion: RegionId;
    type: 'STUDENT_ATTENDANCE' | 'ORDER' | 'SYSTEM_TRANSACTION';
    description: string;
    requestEpoch?: number;
  }): { accepted: boolean; record?: any; reason: string } {
    const simTime = this.clock.getTime();
    const validation = this.splitBrainGuard.validateWriteRequest(params.originRegion, simTime, params.requestEpoch);

    const result = this.replicationSimulator.submitWrite({
      originRegion: params.originRegion,
      type: params.type,
      description: params.description,
      epoch: validation.epoch,
      simTime,
      isAuthorized: validation.accepted,
      rejectionReason: validation.reason,
    });

    this.notifyStateListeners(this.getFullState());
    return {
      accepted: result.accepted,
      record: result.record,
      reason: validation.reason,
    };
  }

  // Getters
  public getLogger() { return this.logger; }
  public getMetrics() { return this.metrics; }
  public getDnsSimulator() { return this.dnsSimulator; }
  public getReplicationSimulator() { return this.replicationSimulator; }
  public getSplitBrainGuard() { return this.splitBrainGuard; }
  public getQuorumManager() { return this.quorumManager; }
  public getFailoverController() { return this.failoverController; }
  public getScenarioRunner() { return this.scenarioRunner; }
  public setActiveScenario(scenario: ScenarioId | null) { this.activeScenario = scenario; }
}
