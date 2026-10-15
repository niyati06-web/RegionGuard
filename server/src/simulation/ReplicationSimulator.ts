import { DatabaseRecord, DatabaseState, PromotionPolicy, RegionId, ReplicationStatus } from '../types/simulation';
import { EventLogger } from './EventLogger';

export class ReplicationSimulator {
  private activeWriter: RegionId | null = 'region-a';
  private readReplica: RegionId | null = 'region-b';
  private replicationStatus: ReplicationStatus = 'HEALTHY';
  private replicationLagMs: number = 42;
  private lastHealthyLagMs: number = 42;
  private maxAllowableLagForPromotionMs: number = 500;
  private promotionPolicy: PromotionPolicy = 'SAFETY_FIRST';
  private records: DatabaseRecord[] = [];
  private sequenceCounter: number = 1000;
  private replicationQueue: DatabaseRecord[] = [];
  private totalWritesSubmitted: number = 0;
  private totalWritesAccepted: number = 0;
  private totalWritesRejected: number = 0;
  private dataLossExposureCount: number = 0;
  private logger: EventLogger;

  constructor(logger: EventLogger) {
    this.logger = logger;
    this.seedInitialRecords();
  }

  private seedInitialRecords(): void {
    const initialSeed = [
      { type: 'STUDENT_ATTENDANCE', desc: 'CS-401 Lab: Student #1042 check-in verified' },
      { type: 'ORDER', desc: 'Order #ORD-8821: Payment captured ($149.00)' },
      { type: 'SYSTEM_TRANSACTION', desc: 'Auth token session refreshed for user admin@regionguard.internal' },
      { type: 'STUDENT_ATTENDANCE', desc: 'CS-401 Lab: Student #1089 check-in verified' },
      { type: 'ORDER', desc: 'Order #ORD-8822: Cloud storage reservation confirmed' },
    ];

    for (const s of initialSeed) {
      this.sequenceCounter++;
      this.records.push({
        id: `tx-${this.sequenceCounter}`,
        sequenceNumber: this.sequenceCounter,
        type: s.type as any,
        description: s.desc,
        originRegion: 'region-a',
        epoch: 1,
        timestamp: Date.now() - (6 - this.records.length) * 10000,
        replicated: true,
        replicatedAt: Date.now() - (6 - this.records.length) * 9950,
      });
      this.totalWritesSubmitted++;
      this.totalWritesAccepted++;
    }
  }

  public getState(): DatabaseState {
    const unreplicated = this.replicationQueue.length;
    return {
      activeWriter: this.activeWriter,
      readReplica: this.readReplica,
      replicationStatus: this.replicationStatus,
      replicationLagMs: this.replicationLagMs,
      replicationQueueSize: unreplicated,
      lastReplicatedTxId: this.records.filter(r => r.replicated).slice(-1)[0]?.sequenceNumber || 0,
      totalWritesSubmitted: this.totalWritesSubmitted,
      totalWritesAccepted: this.totalWritesAccepted,
      totalWritesRejected: this.totalWritesRejected,
      unreplicatedTxCount: unreplicated,
      dataLossExposureCount: this.dataLossExposureCount,
      promotionPolicy: this.promotionPolicy,
      maxAllowableLagForPromotionMs: this.maxAllowableLagForPromotionMs,
      records: this.records.slice(-50),
    };
  }

  public setPromotionPolicy(policy: PromotionPolicy): void {
    this.promotionPolicy = policy;
  }

  public submitWrite(params: {
    originRegion: RegionId;
    type: 'STUDENT_ATTENDANCE' | 'ORDER' | 'SYSTEM_TRANSACTION';
    description: string;
    epoch: number;
    simTime: number;
    isAuthorized: boolean;
    rejectionReason?: string;
  }): { accepted: boolean; record?: DatabaseRecord; reason?: string } {
    this.totalWritesSubmitted++;

    if (!params.isAuthorized) {
      this.totalWritesRejected++;
      return {
        accepted: false,
        reason: params.rejectionReason || 'Write unauthorized by single-writer invariant.',
      };
    }

    this.sequenceCounter++;
    const record: DatabaseRecord = {
      id: `tx-${this.sequenceCounter}`,
      sequenceNumber: this.sequenceCounter,
      type: params.type,
      description: params.description,
      originRegion: params.originRegion,
      epoch: params.epoch,
      timestamp: Date.now(),
      replicated: false,
    };

    this.records.push(record);
    this.replicationQueue.push(record);
    this.totalWritesAccepted++;

    this.logger.log({
      simulationTime: params.simTime,
      eventType: 'DATABASE_WRITE_ACCEPTED',
      severity: 'SUCCESS',
      component: `Database (${params.originRegion.toUpperCase()})`,
      description: `Committed Tx #${record.sequenceNumber} [${record.type}]: "${record.description}" under Epoch ${record.epoch}.`,
      newState: `Replication backlog: ${this.replicationQueue.length} tx`,
    });

    return { accepted: true, record };
  }

  public tickReplication(params: {
    simTime: number;
    isReplicationSevered: boolean;
    isHighLagInjected: boolean;
    primaryDbHealthy: boolean;
    replicaDbHealthy: boolean;
  }): void {
    const { simTime, isReplicationSevered, isHighLagInjected, primaryDbHealthy, replicaDbHealthy } = params;

    if (isHighLagInjected) {
      this.replicationStatus = 'LAGGING';
      this.replicationLagMs = 3800 + Math.floor(Math.random() * 400);
      this.lastHealthyLagMs = this.replicationLagMs;
      // Do not process queue to simulate lag backlog
      return;
    }

    if (isReplicationSevered || !primaryDbHealthy || !replicaDbHealthy) {
      this.replicationStatus = isReplicationSevered ? 'DISCONNECTED' : 'PAUSED';
      this.replicationLagMs = isReplicationSevered ? 9999 : this.replicationLagMs + 1000;
      return;
    }

    this.replicationStatus = this.replicationQueue.length > 5 ? 'LAGGING' : 'HEALTHY';
    this.replicationLagMs = 35 + Math.floor(Math.random() * 25) + this.replicationQueue.length * 15;
    this.lastHealthyLagMs = this.replicationLagMs;

    // Process queued replication transactions (simulate async transmission)
    if (this.replicationQueue.length > 0) {
      const itemsToReplicate = Math.min(this.replicationQueue.length, 3);
      for (let i = 0; i < itemsToReplicate; i++) {
        const tx = this.replicationQueue.shift();
        if (tx) {
          tx.replicated = true;
          tx.replicatedAt = Date.now();
        }
      }
    }
  }

  public checkReplicaEligibility(): { eligible: boolean; reason: string; potentialLossCount: number } {
    const effectiveLag = this.replicationStatus === 'LAGGING' || this.replicationStatus === 'DISCONNECTED'
      ? this.replicationLagMs
      : this.lastHealthyLagMs;
    const queuedLoss = this.replicationQueue.length;

    if (this.promotionPolicy === 'SAFETY_FIRST') {
      if (effectiveLag > this.maxAllowableLagForPromotionMs || queuedLoss > 0) {
        return {
          eligible: false,
          reason: `Safety-First Policy: Replica lag (${effectiveLag}ms) exceeds limit (${this.maxAllowableLagForPromotionMs}ms) or ${queuedLoss} unreplicated transactions would be lost.`,
          potentialLossCount: queuedLoss,
        };
      }
      return {
        eligible: true,
        reason: 'Safety-First Policy: Replica is fully synchronized (0 unreplicated transactions).',
        potentialLossCount: 0,
      };
    } else {
      // Availability first
      return {
        eligible: true,
        reason: `Availability-First Policy: Promotion accepted with ${queuedLoss} potential lost transactions (${effectiveLag}ms lag window).`,
        potentialLossCount: queuedLoss,
      };
    }
  }

  public promoteReplica(newPrimary: RegionId, simTime: number): void {
    const prevPrimary = this.activeWriter;
    const lossWindow = this.replicationQueue.length;

    if (lossWindow > 0) {
      this.dataLossExposureCount += lossWindow;
      this.logger.log({
        simulationTime: simTime,
        eventType: 'REPLICATION_DATA_LOSS_EXPOSURE',
        severity: 'CRITICAL',
        component: 'DatabaseReplication',
        description: `Potential data loss: ${lossWindow} transactions that did not reach [${newPrimary}] replica prior to failover!`,
        decisionReason: 'Asynchronous replication window cutoff during abrupt primary outage.',
      });
      this.replicationQueue = [];
    }

    this.activeWriter = newPrimary;
    this.readReplica = newPrimary === 'region-a' ? 'region-b' : 'region-a';
    this.replicationLagMs = 40;
    this.lastHealthyLagMs = 40;
    this.replicationStatus = 'HEALTHY';

    this.logger.log({
      simulationTime: simTime,
      eventType: 'DATABASE_ROLE_CHANGED',
      severity: 'SUCCESS',
      component: 'Database',
      description: `Database role promoted: [${newPrimary.toUpperCase()}] is now ACTIVE WRITER. [${prevPrimary?.toUpperCase() || 'None'}] relegated.`,
      previousState: prevPrimary || 'none',
      newState: newPrimary,
    });
  }

  public reset(): void {
    this.activeWriter = 'region-a';
    this.readReplica = 'region-b';
    this.replicationStatus = 'HEALTHY';
    this.replicationLagMs = 42;
    this.lastHealthyLagMs = 42;
    this.records = [];
    this.replicationQueue = [];
    this.sequenceCounter = 1000;
    this.totalWritesSubmitted = 0;
    this.totalWritesAccepted = 0;
    this.totalWritesRejected = 0;
    this.dataLossExposureCount = 0;
    this.seedInitialRecords();
  }
}
