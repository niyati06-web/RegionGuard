import { FailoverState, RegionId, RegionState } from '../types/simulation';
import { EventLogger } from './EventLogger';
import { SplitBrainGuard } from './SplitBrainGuard';
import { QuorumManager } from './QuorumManager';
import { ReplicationSimulator } from './ReplicationSimulator';
import { DnsSimulator } from './DnsSimulator';

export class FailoverController {
  private currentState: FailoverState = 'PRIMARY_ACTIVE';
  private transitionReason: string = 'Cluster initialized. Region A active, Region B standby.';
  private lastTransitionTime: number = 0;
  private failoverStartTime: number | null = null;
  private lastFailoverDurationMs: number | null = null;
  private failoverCount: number = 0;
  private autoFailbackEnabled: boolean = false;

  private logger: EventLogger;
  private splitBrainGuard: SplitBrainGuard;
  private quorumManager: QuorumManager;
  private replicationSimulator: ReplicationSimulator;
  private dnsSimulator: DnsSimulator;

  constructor(
    logger: EventLogger,
    splitBrainGuard: SplitBrainGuard,
    quorumManager: QuorumManager,
    replicationSimulator: ReplicationSimulator,
    dnsSimulator: DnsSimulator
  ) {
    this.logger = logger;
    this.splitBrainGuard = splitBrainGuard;
    this.quorumManager = quorumManager;
    this.replicationSimulator = replicationSimulator;
    this.dnsSimulator = dnsSimulator;
  }

  public getState() {
    return {
      currentState: this.currentState,
      transitionReason: this.transitionReason,
      lastTransitionTime: this.lastTransitionTime,
      failoverStartTime: this.failoverStartTime,
      lastFailoverDurationMs: this.lastFailoverDurationMs,
      failoverCount: this.failoverCount,
      autoFailbackEnabled: this.autoFailbackEnabled,
    };
  }

  public setAutoFailback(enabled: boolean): void {
    this.autoFailbackEnabled = enabled;
  }

  public tickStateMachine(params: {
    simTime: number;
    regionA: RegionState;
    regionB: RegionState;
  }): void {
    const { simTime, regionA, regionB } = params;
    const quorumState = this.quorumManager.getState();
    const isPrimaryHealthy = regionA.appStatus === 'HEALTHY' && regionA.dbStatus === 'HEALTHY';
    const isSecondaryHealthy = regionB.appStatus === 'HEALTHY' && regionB.dbStatus === 'HEALTHY';

    switch (this.currentState) {
      case 'PRIMARY_ACTIVE': {
        // If primary starts showing consecutive failures
        if (regionA.consecutiveFailedChecks >= 2) {
          this.transitionTo('PRIMARY_SUSPECTED', simTime, 'Primary Region A missed 2 consecutive health checks.');
        } else {
          // Renew write lease for primary Region A
          this.splitBrainGuard.renewLease('region-a', simTime, quorumState.hasQuorum);
        }
        break;
      }

      case 'PRIMARY_SUSPECTED': {
        if (isPrimaryHealthy && regionA.consecutiveFailedChecks === 0) {
          this.transitionTo('PRIMARY_ACTIVE', simTime, 'Primary Region A recovered; health checks normalized.');
        } else if (regionA.consecutiveFailedChecks >= 3) {
          this.failoverStartTime = Date.now();
          this.transitionTo('FAILOVER_EVALUATION', simTime, 'Primary failure confirmed (3 consecutive missed checks). Initiating failover workflow.');
        }
        break;
      }

      case 'FAILOVER_EVALUATION': {
        // Check secondary health
        if (!isSecondaryHealthy) {
          this.transitionTo(
            'DEGRADED_NO_SAFE_WRITER',
            simTime,
            `Cannot failover: Secondary Region B is also unhealthy (App: ${regionB.appStatus}, DB: ${regionB.dbStatus}).`
          );
          return;
        }

        // Check replication eligibility
        const eligibility = this.replicationSimulator.checkReplicaEligibility();
        if (!eligibility.eligible) {
          this.transitionTo('DEGRADED_NO_SAFE_WRITER', simTime, eligibility.reason);
          return;
        }

        this.transitionTo('QUORUM_CHECK', simTime, 'Secondary readiness verified. Polling witness quorum for failover authorization.');
        break;
      }

      case 'QUORUM_CHECK': {
        if (!quorumState.hasQuorum) {
          this.transitionTo(
            'DEGRADED_NO_QUORUM',
            simTime,
            `Failover HALTED: Quorum lost (${quorumState.votesForB} votes for B, threshold is ${quorumState.quorumThreshold}). Cluster fails closed to prevent split-brain.`
          );
          return;
        }

        if (quorumState.decision === 'FAVOR_REGION_B') {
          this.transitionTo('FENCING_OLD_PRIMARY', simTime, 'Quorum majority achieved (2/3 votes for Region B). Proceeding to fence old primary.');
        } else {
          this.transitionTo('DEGRADED_NO_QUORUM', simTime, 'Quorum votes did not reach majority for Region B.');
        }
        break;
      }

      case 'FENCING_OLD_PRIMARY': {
        // Fence Region A
        this.splitBrainGuard.fenceRegion('region-a', simTime, 'Failover in progress: Revoking write capabilities from Region A.');
        regionA.role = 'FENCED';
        regionA.status = 'FENCED';

        this.transitionTo('PROMOTION_AUTHORIZED', simTime, 'Old primary successfully fenced. Authorizing promotion token.');
        break;
      }

      case 'PROMOTION_AUTHORIZED': {
        // Split-brain guard authorizes promotion with epoch increment
        const auth = this.splitBrainGuard.authorizePromotion(
          'region-b',
          simTime,
          quorumState.hasQuorum,
          true,
          'Quorum majority approved failover and old primary is securely fenced.'
        );

        if (auth.authorized) {
          this.transitionTo('SECONDARY_PROMOTED', simTime, auth.reason);
        } else {
          this.transitionTo('DEGRADED_NO_SAFE_WRITER', simTime, auth.reason);
        }
        break;
      }

      case 'SECONDARY_PROMOTED': {
        // Promote database and region role
        this.splitBrainGuard.renewLease('region-b', simTime, quorumState.hasQuorum);
        this.replicationSimulator.promoteReplica('region-b', simTime);
        regionB.role = 'PRIMARY';

        // Initiate DNS update
        this.transitionTo('DNS_UPDATING', simTime, 'Secondary promoted to primary writer. Instructing DNS traffic cutover.');
        this.dnsSimulator.updateTarget('region-b', simTime);
        break;
      }

      case 'DNS_UPDATING': {
        this.splitBrainGuard.renewLease('region-b', simTime, quorumState.hasQuorum);
        // Wait until DNS propagation completes or reaches critical mass
        const dnsState = this.dnsSimulator.getState();
        if (dnsState.clientTrafficDistribution.regionB >= 90 || !dnsState.isPropagating) {
          if (this.failoverStartTime) {
            this.lastFailoverDurationMs = Date.now() - this.failoverStartTime;
            this.failoverStartTime = null;
          }
          this.failoverCount++;
          this.transitionTo('SECONDARY_ACTIVE', simTime, 'Traffic successfully cut over to Region B. Failover complete.');
        }
        break;
      }

      case 'SECONDARY_ACTIVE': {
        // Continuously renew lease for Region B as long as it has quorum and is healthy
        this.splitBrainGuard.renewLease('region-b', simTime, quorumState.hasQuorum);

        // Check if Region A has recovered
        if (isPrimaryHealthy && regionA.consecutiveFailedChecks === 0) {
          // If auto failback is enabled or user triggers failback evaluation
          if (this.autoFailbackEnabled) {
            this.transitionTo('RECOVERY_DETECTED', simTime, 'Primary Region A recovery detected. Evaluating failback safety.');
          }
        }
        break;
      }

      case 'RECOVERY_DETECTED': {
        this.transitionTo('FAILBACK_EVALUATION', simTime, 'Verifying Region A replica synchronization before failback.');
        break;
      }

      case 'FAILBACK_EVALUATION': {
        // Verify Region A is healthy and can take traffic back safely
        if (!isPrimaryHealthy) {
          this.transitionTo('SECONDARY_ACTIVE', simTime, 'Failback aborted: Region A destabilized again.');
          return;
        }

        this.transitionTo('FAILBACK_IN_PROGRESS', simTime, 'Authorizing controlled failback sequence to restore Region A.');
        break;
      }

      case 'FAILBACK_IN_PROGRESS': {
        // Step 1: Fence Region B
        this.splitBrainGuard.fenceRegion('region-b', simTime, 'Failback sequence: Revoking Region B write lease.');
        regionB.role = 'STANDBY';

        // Step 2: Unfence Region A
        this.splitBrainGuard.unfenceRegion('region-a', simTime);

        // Step 3: Authorize Region A promotion
        const auth = this.splitBrainGuard.authorizePromotion(
          'region-a',
          simTime,
          quorumState.hasQuorum,
          true,
          'Controlled failback authorized to restore primary region.'
        );

        if (auth.authorized) {
          this.replicationSimulator.promoteReplica('region-a', simTime);
          regionA.role = 'PRIMARY';
          regionA.status = 'HEALTHY';
          this.dnsSimulator.updateTarget('region-a', simTime);
          this.transitionTo('PRIMARY_RESTORED', simTime, 'Controlled failback completed: Region A restored as primary writer.');
        } else {
          this.transitionTo('DEGRADED_NO_SAFE_WRITER', simTime, auth.reason);
        }
        break;
      }

      case 'PRIMARY_RESTORED': {
        this.splitBrainGuard.unfenceRegion('region-b', simTime);
        regionB.role = 'STANDBY';
        regionB.status = 'HEALTHY';
        this.transitionTo('PRIMARY_ACTIVE', simTime, 'Steady state restored. Region A active, Region B standby.');
        break;
      }

      case 'DEGRADED_NO_QUORUM': {
        // Check if quorum has been restored
        if (quorumState.hasQuorum) {
          this.logger.log({
            simulationTime: simTime,
            eventType: 'QUORUM_RECOVERED',
            severity: 'INFO',
            component: 'FailoverController',
            description: 'Witness quorum restored. Re-evaluating failover state machine.',
          });
          if (regionA.role === 'PRIMARY' && isPrimaryHealthy) {
            this.transitionTo('PRIMARY_ACTIVE', simTime, 'Quorum restored while Region A remains operational.');
          } else {
            this.transitionTo('FAILOVER_EVALUATION', simTime, 'Quorum restored; resuming failover evaluation.');
          }
        }
        break;
      }

      case 'DEGRADED_NO_SAFE_WRITER': {
        // Degraded: Check if either region has become safe
        if (isPrimaryHealthy && regionA.role === 'PRIMARY') {
          this.transitionTo('PRIMARY_ACTIVE', simTime, 'Region A returned to healthy state.');
        } else if (isSecondaryHealthy && quorumState.hasQuorum) {
          this.transitionTo('FAILOVER_EVALUATION', simTime, 'Secondary region recovered; re-evaluating failover.');
        }
        break;
      }
    }
  }

  public initiateManualFailback(simTime: number): { success: boolean; message: string } {
    if (this.currentState !== 'SECONDARY_ACTIVE') {
      return {
        success: false,
        message: `Cannot initiate failback: Current state is [${this.currentState}], expected [SECONDARY_ACTIVE].`,
      };
    }

    this.transitionTo('RECOVERY_DETECTED', simTime, 'Manual failback initiated by operator.');
    return {
      success: true,
      message: 'Failback sequence initiated. Evaluating Region A replica synchronization and quorum.',
    };
  }

  private transitionTo(newState: FailoverState, simTime: number, reason: string): void {
    const prevState = this.currentState;
    this.currentState = newState;
    this.transitionReason = reason;
    this.lastTransitionTime = simTime;

    this.logger.log({
      simulationTime: simTime,
      eventType: 'FAILOVER_STATE_TRANSITION',
      severity:
        newState === 'SECONDARY_ACTIVE' || newState === 'PRIMARY_RESTORED'
          ? 'SUCCESS'
          : newState.startsWith('DEGRADED')
          ? 'CRITICAL'
          : 'INFO',
      component: 'FailoverController',
      description: `State changed: [${prevState}] -> [${newState}]`,
      previousState: prevState,
      newState: newState,
      decisionReason: reason,
    });
  }

  public reset(): void {
    this.currentState = 'PRIMARY_ACTIVE';
    this.transitionReason = 'Cluster initialized. Region A active, Region B standby.';
    this.lastTransitionTime = 0;
    this.failoverStartTime = null;
    this.lastFailoverDurationMs = null;
    this.failoverCount = 0;
    this.autoFailbackEnabled = false;
  }
}
