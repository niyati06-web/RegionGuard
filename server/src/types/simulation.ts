export type RegionId = 'region-a' | 'region-b';
export type SimulationStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FAILING_OVER' | 'RECOVERING' | 'DEGRADED';

export type ComponentHealth = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'RECOVERING' | 'FENCED';
export type DatabaseRole = 'PRIMARY' | 'STANDBY' | 'FENCED' | 'DISCONNECTED';
export type ReplicationStatus = 'HEALTHY' | 'LAGGING' | 'DISCONNECTED' | 'PAUSED';
export type PromotionPolicy = 'SAFETY_FIRST' | 'AVAILABILITY_FIRST';

export type FailoverState =
  | 'PRIMARY_ACTIVE'
  | 'PRIMARY_SUSPECTED'
  | 'FAILOVER_EVALUATION'
  | 'QUORUM_CHECK'
  | 'FENCING_OLD_PRIMARY'
  | 'PROMOTION_AUTHORIZED'
  | 'SECONDARY_PROMOTED'
  | 'DNS_UPDATING'
  | 'SECONDARY_ACTIVE'
  | 'RECOVERY_DETECTED'
  | 'FAILBACK_EVALUATION'
  | 'FAILBACK_IN_PROGRESS'
  | 'PRIMARY_RESTORED'
  | 'DEGRADED_NO_QUORUM'
  | 'DEGRADED_NO_SAFE_WRITER';

export interface DatabaseRecord {
  id: string;
  sequenceNumber: number;
  type: 'STUDENT_ATTENDANCE' | 'ORDER' | 'SYSTEM_TRANSACTION';
  description: string;
  originRegion: RegionId;
  epoch: number;
  timestamp: number;
  replicated: boolean;
  replicatedAt?: number;
}

export interface RegionState {
  id: RegionId;
  name: string;
  location: string;
  status: ComponentHealth;
  isOnline: boolean;
  appStatus: ComponentHealth;
  dbStatus: ComponentHealth;
  monitorStatus: ComponentHealth;
  role: DatabaseRole;
  availabilityPercent: number;
  consecutiveFailedChecks: number;
  lastHealthCheckTime: number;
  activeConnections: number;
  requestsPerSecond: number;
}

export interface WitnessNode {
  id: string;
  name: string;
  location: string;
  isAlive: boolean;
  vote: RegionId | 'ABSTAIN' | 'NONE';
  lastVoteReason: string;
  heartbeatLatencyMs: number;
}

export interface QuorumState {
  witnesses: WitnessNode[];
  quorumThreshold: number; // e.g. 2 of 3
  votesForA: number;
  votesForB: number;
  abstentions: number;
  hasQuorum: boolean;
  decision: 'FAVOR_REGION_A' | 'FAVOR_REGION_B' | 'SPLIT_NO_QUORUM' | 'UNDECIDED';
  decisionReason: string;
}

export interface SplitBrainGuardState {
  invariantSatisfied: boolean;
  activeWriterCount: number;
  currentLeaseHolder: RegionId | null;
  leaseExpiresAt: number;
  leaseDurationSeconds: number;
  leadershipEpoch: number;
  fencingToken: number;
  fencedRegions: RegionId[];
  staleWritesBlockedCount: number;
  splitBrainAttemptsPreventedCount: number;
  lastBlockedReason: string | null;
}

export interface DatabaseState {
  activeWriter: RegionId | null;
  readReplica: RegionId | null;
  replicationStatus: ReplicationStatus;
  replicationLagMs: number;
  replicationQueueSize: number;
  lastReplicatedTxId: number;
  totalWritesSubmitted: number;
  totalWritesAccepted: number;
  totalWritesRejected: number;
  unreplicatedTxCount: number;
  dataLossExposureCount: number;
  promotionPolicy: PromotionPolicy;
  maxAllowableLagForPromotionMs: number;
  records: DatabaseRecord[];
}

export interface DnsState {
  providerType: 'simulated' | 'route53' | 'clouddns';
  recordName: string;
  currentRecordTarget: RegionId;
  effectiveTarget: RegionId;
  dnsTtlSeconds: number;
  propagationDelaySeconds: number;
  propagationProgressPercent: number;
  isPropagating: boolean;
  clientTrafficDistribution: {
    regionA: number;
    regionB: number;
  };
  endpoints: {
    'region-a': string;
    'region-b': string;
  };
  lastRecordUpdateTimestamp: number;
}

export interface NetworkState {
  isPartitioned: boolean;
  replicationLinkConnected: boolean;
  witnessConnectivity: { [witnessId: string]: boolean };
}

export interface SimulationEvent {
  id: string;
  simulationTime: number;
  wallClockTimestamp: number;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'CRITICAL';
  component: string;
  description: string;
  previousState?: string;
  newState?: string;
  decisionReason?: string;
}

export interface MetricSnapshot {
  simulationTime: number;
  timestamp: number;
  regionAHealth: number;
  regionBHealth: number;
  requestsPerSecond: number;
  requestSuccessRate: number;
  replicationLagMs: number;
  quorumAvailability: number;
  dnsTrafficA: number;
  dnsTrafficB: number;
  acceptedWrites: number;
  rejectedWrites: number;
}

export interface InvariantCheckResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  details: string;
}

export interface ActiveFaults {
  regionAFailed: boolean;
  regionBFailed: boolean;
  regionADbFailed: boolean;
  regionBDbFailed: boolean;
  replicationLinkSevered: boolean;
  networkPartitionActive: boolean;
  quorumWitnessIdsFailed: string[];
  highReplicationLagInjected: boolean;
  dnsPropagationDelayed: boolean;
  healthFlappingActive: boolean;
}

export type ScenarioId =
  | 'NORMAL_OPERATION'
  | 'PRIMARY_REGION_FAILURE'
  | 'PRIMARY_DATABASE_FAILURE'
  | 'NETWORK_PARTITION'
  | 'QUORUM_LOSS'
  | 'REPLICATION_LAG'
  | 'DNS_PROPAGATION_DELAY'
  | 'FALSE_HEALTH_CHECK_FLAPPING'
  | 'SECONDARY_REGION_FAILURE'
  | 'RECOVERY_AND_FAILBACK';

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  category: string;
  shortDescription: string;
  expectedBehavior: string;
  tags: string[];
}

export interface SimulationState {
  status: SimulationStatus;
  simulationTime: number; // in seconds
  tickRateMs: number;
  failover: {
    currentState: FailoverState;
    transitionReason: string;
    lastTransitionTime: number;
    failoverStartTime: number | null;
    lastFailoverDurationMs: number | null;
    failoverCount: number;
  };
  regions: {
    'region-a': RegionState;
    'region-b': RegionState;
  };
  quorum: QuorumState;
  splitBrainGuard: SplitBrainGuardState;
  database: DatabaseState;
  dns: DnsState;
  network: NetworkState;
  faults: ActiveFaults;
  activeScenario: ScenarioId | null;
  invariants: InvariantCheckResult[];
}
