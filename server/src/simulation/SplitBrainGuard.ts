import { RegionId, SplitBrainGuardState } from '../types/simulation';
import { EventLogger } from './EventLogger';

export interface WriteValidationResult {
  accepted: boolean;
  reason: string;
  epoch: number;
}

export class SplitBrainGuard {
  private currentLeaseHolder: RegionId | null = 'region-a';
  private leaseExpiresAt: number = 10; // seconds
  private leaseDurationSeconds: number = 8;
  private leadershipEpoch: number = 1;
  private fencingToken: number = 100;
  private fencedRegions: Set<RegionId> = new Set();
  private staleWritesBlockedCount: number = 0;
  private splitBrainAttemptsPreventedCount: number = 0;
  private lastBlockedReason: string | null = null;
  private logger: EventLogger;

  constructor(logger: EventLogger) {
    this.logger = logger;
  }

  public getState(simTime: number): SplitBrainGuardState {
    const activeWriters = this.getActiveWriterCount(simTime);
    return {
      invariantSatisfied: activeWriters <= 1,
      activeWriterCount: activeWriters,
      currentLeaseHolder: this.isLeaseValid(simTime) ? this.currentLeaseHolder : null,
      leaseExpiresAt: this.leaseExpiresAt,
      leaseDurationSeconds: this.leaseDurationSeconds,
      leadershipEpoch: this.leadershipEpoch,
      fencingToken: this.fencingToken,
      fencedRegions: Array.from(this.fencedRegions),
      staleWritesBlockedCount: this.staleWritesBlockedCount,
      splitBrainAttemptsPreventedCount: this.splitBrainAttemptsPreventedCount,
      lastBlockedReason: this.lastBlockedReason,
    };
  }

  public isLeaseValid(simTime: number): boolean {
    return this.currentLeaseHolder !== null && simTime < this.leaseExpiresAt;
  }

  public getCurrentLeaseHolder(simTime: number): RegionId | null {
    if (this.isLeaseValid(simTime)) {
      return this.currentLeaseHolder;
    }
    return null;
  }

  public getActiveWriterCount(simTime: number): number {
    const holder = this.getCurrentLeaseHolder(simTime);
    if (!holder) return 0;
    if (this.fencedRegions.has(holder)) return 0;
    return 1;
  }

  public renewLease(region: RegionId, simTime: number, hasQuorum: boolean): boolean {
    // Only current lease holder can renew if not fenced and has quorum
    if (this.fencedRegions.has(region)) {
      return false;
    }
    if (this.currentLeaseHolder !== region) {
      return false;
    }
    if (!hasQuorum) {
      // Lease cannot be renewed without quorum backing
      return false;
    }

    this.leaseExpiresAt = simTime + this.leaseDurationSeconds;
    return true;
  }

  public fenceRegion(region: RegionId, simTime: number, reason: string): void {
    if (!this.fencedRegions.has(region)) {
      this.fencedRegions.add(region);
      if (this.currentLeaseHolder === region) {
        // Expire lease immediately on fencing
        this.leaseExpiresAt = simTime;
      }
      this.logger.log({
        simulationTime: simTime,
        eventType: 'OLD_PRIMARY_FENCED',
        severity: 'WARN',
        component: 'SplitBrainGuard',
        description: `Region [${region.toUpperCase()}] has been securely FENCED. Write capabilities revoked.`,
        decisionReason: reason,
      });
    }
  }

  public unfenceRegion(region: RegionId, simTime: number): void {
    if (this.fencedRegions.has(region)) {
      this.fencedRegions.delete(region);
      this.logger.log({
        simulationTime: simTime,
        eventType: 'REGION_UNFENCED',
        severity: 'INFO',
        component: 'SplitBrainGuard',
        description: `Fencing removed from [${region.toUpperCase()}]. Region can participate as standby.`,
      });
    }
  }

  public authorizePromotion(
    targetRegion: RegionId,
    simTime: number,
    quorumAuthorized: boolean,
    replicaLagOk: boolean,
    explanation: string
  ): { authorized: boolean; reason: string } {
    // Check 1: Quorum authorization is mandatory
    if (!quorumAuthorized) {
      this.splitBrainAttemptsPreventedCount++;
      this.lastBlockedReason = `Split-Brain Guard blocked promotion of ${targetRegion}: Quorum majority not achieved.`;
      this.logger.log({
        simulationTime: simTime,
        eventType: 'SPLIT_BRAIN_ATTEMPT_BLOCKED',
        severity: 'CRITICAL',
        component: 'SplitBrainGuard',
        description: `BLOCKED unsafe promotion of [${targetRegion.toUpperCase()}]. Quorum majority was lacking.`,
        decisionReason: 'Loss of witness quorum. Failing closed to prevent dual writers.',
      });
      return { authorized: false, reason: this.lastBlockedReason };
    }

    // Check 2: Target must not be fenced
    if (this.fencedRegions.has(targetRegion)) {
      this.splitBrainAttemptsPreventedCount++;
      this.lastBlockedReason = `Split-Brain Guard blocked promotion: Target region ${targetRegion} is currently fenced.`;
      return { authorized: false, reason: this.lastBlockedReason };
    }

    // Check 3: Old lease must be safely expired or old leader fenced
    const oldLeader = this.currentLeaseHolder;
    if (oldLeader && oldLeader !== targetRegion) {
      const isOldLeaderFenced = this.fencedRegions.has(oldLeader);
      const isOldLeaseExpired = simTime >= this.leaseExpiresAt;

      if (!isOldLeaderFenced && !isOldLeaseExpired) {
        this.splitBrainAttemptsPreventedCount++;
        this.lastBlockedReason = `Split-Brain Guard blocked promotion: Old primary ${oldLeader} still holds an unexpired lease (expires at t=${this.leaseExpiresAt}s). Fencing required.`;
        this.logger.log({
          simulationTime: simTime,
          eventType: 'SPLIT_BRAIN_ATTEMPT_BLOCKED',
          severity: 'CRITICAL',
          component: 'SplitBrainGuard',
          description: `Promotion halted! Old lease held by [${oldLeader}] is unexpired and node is not yet fenced.`,
          decisionReason: this.lastBlockedReason,
        });
        return { authorized: false, reason: this.lastBlockedReason };
      }
    }

    // Check 4: Replica lag safety check
    if (!replicaLagOk) {
      this.lastBlockedReason = `Promotion rejected by replication safety policy: Replica lag exceeds threshold.`;
      return { authorized: false, reason: this.lastBlockedReason };
    }

    // All safety preconditions satisfied: Monotonically increment epoch and fencing token!
    this.leadershipEpoch += 1;
    this.fencingToken += 10;
    this.currentLeaseHolder = targetRegion;
    this.leaseExpiresAt = simTime + this.leaseDurationSeconds;

    this.logger.log({
      simulationTime: simTime,
      eventType: 'PROMOTION_AUTHORIZED',
      severity: 'SUCCESS',
      component: 'SplitBrainGuard',
      description: `Single-writer promotion authorized for [${targetRegion.toUpperCase()}]. New Leadership Epoch: ${this.leadershipEpoch}, Fencing Token: ${this.fencingToken}.`,
      decisionReason: explanation,
    });

    return {
      authorized: true,
      reason: `Promotion authorized under Epoch ${this.leadershipEpoch} with Fencing Token ${this.fencingToken}.`,
    };
  }

  public validateWriteRequest(
    originRegion: RegionId,
    simTime: number,
    requestEpoch?: number
  ): WriteValidationResult {
    // 1. Is this region fenced?
    if (this.fencedRegions.has(originRegion)) {
      this.staleWritesBlockedCount++;
      const reason = `Write REJECTED: Region [${originRegion}] is fenced off from the cluster.`;
      this.logger.log({
        simulationTime: simTime,
        eventType: 'STALE_WRITE_REJECTED',
        severity: 'WARN',
        component: 'SplitBrainGuard',
        description: reason,
        decisionReason: 'Node is fenced. Discarding transaction to prevent split-brain mutation.',
      });
      return { accepted: false, reason, epoch: this.leadershipEpoch };
    }

    // 2. Is this region the current lease holder?
    if (this.currentLeaseHolder !== originRegion) {
      this.staleWritesBlockedCount++;
      const reason = `Write REJECTED: Region [${originRegion}] is not the designated lease holder (Current: ${this.currentLeaseHolder || 'None'}).`;
      this.logger.log({
        simulationTime: simTime,
        eventType: 'STALE_WRITE_REJECTED',
        severity: 'WARN',
        component: 'SplitBrainGuard',
        description: reason,
        decisionReason: 'Unauthorized writer attempted database mutation.',
      });
      return { accepted: false, reason, epoch: this.leadershipEpoch };
    }

    // 3. Has the lease expired?
    if (simTime >= this.leaseExpiresAt) {
      this.staleWritesBlockedCount++;
      const reason = `Write REJECTED: Lease for Region [${originRegion}] has expired at t=${this.leaseExpiresAt}s (current: t=${simTime}s).`;
      this.logger.log({
        simulationTime: simTime,
        eventType: 'STALE_WRITE_REJECTED',
        severity: 'WARN',
        component: 'SplitBrainGuard',
        description: reason,
        decisionReason: 'Write lease expired without renewal.',
      });
      return { accepted: false, reason, epoch: this.leadershipEpoch };
    }

    // 4. If epoch is passed, does it match current leadership epoch?
    if (requestEpoch !== undefined && requestEpoch < this.leadershipEpoch) {
      this.staleWritesBlockedCount++;
      const reason = `Write REJECTED: Request epoch ${requestEpoch} is stale (Current cluster epoch: ${this.leadershipEpoch}).`;
      this.logger.log({
        simulationTime: simTime,
        eventType: 'STALE_WRITE_REJECTED',
        severity: 'CRITICAL',
        component: 'SplitBrainGuard',
        description: reason,
        decisionReason: 'Fencing token validation failed: Outdated epoch submitted.',
      });
      return { accepted: false, reason, epoch: this.leadershipEpoch };
    }

    // Accepted!
    return {
      accepted: true,
      reason: `Write ACCEPTED under Epoch ${this.leadershipEpoch} (Fencing Token: ${this.fencingToken}).`,
      epoch: this.leadershipEpoch,
    };
  }

  public reset(): void {
    this.currentLeaseHolder = 'region-a';
    this.leaseExpiresAt = 10;
    this.leadershipEpoch = 1;
    this.fencingToken = 100;
    this.fencedRegions.clear();
    this.staleWritesBlockedCount = 0;
    this.splitBrainAttemptsPreventedCount = 0;
    this.lastBlockedReason = null;
  }
}
