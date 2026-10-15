import { QuorumState, RegionId, WitnessNode } from '../types/simulation';
import { EventLogger } from './EventLogger';

export class QuorumManager {
  private witnesses: WitnessNode[] = [
    {
      id: 'witness-1',
      name: 'Neutral Witness Alpha',
      location: 'us-central-1 (GCP Chicago)',
      isAlive: true,
      vote: 'REGION_A' as any,
      lastVoteReason: 'Region A is responding with valid HTTP 200 and healthy DB heartbeats.',
      heartbeatLatencyMs: 14,
    },
    {
      id: 'witness-2',
      name: 'Third-AZ Arbitrator',
      location: 'us-east-2 (AWS Ohio AZ-3)',
      isAlive: true,
      vote: 'REGION_A' as any,
      lastVoteReason: 'Regional lease and database health checks optimal.',
      heartbeatLatencyMs: 18,
    },
    {
      id: 'witness-3',
      name: 'Edge Backbone Monitor',
      location: 'global-anycast (Cloudflare Edge)',
      isAlive: true,
      vote: 'REGION_A' as any,
      lastVoteReason: 'Edge synthetic probes confirm Region A ingress reachable.',
      heartbeatLatencyMs: 8,
    },
  ];

  private quorumThreshold: number = 2; // 2 of 3
  private logger: EventLogger;
  private lastQuorumDecision: 'FAVOR_REGION_A' | 'FAVOR_REGION_B' | 'SPLIT_NO_QUORUM' | 'UNDECIDED' = 'FAVOR_REGION_A';

  constructor(logger: EventLogger) {
    this.logger = logger;
  }

  public getState(): QuorumState {
    let votesForA = 0;
    let votesForB = 0;
    let abstentions = 0;

    for (const w of this.witnesses) {
      if (!w.isAlive) {
        abstentions++;
      } else if (w.vote === 'region-a' || (w.vote as string) === 'REGION_A') {
        votesForA++;
      } else if (w.vote === 'region-b' || (w.vote as string) === 'REGION_B') {
        votesForB++;
      } else {
        abstentions++;
      }
    }

    const aliveCount = this.witnesses.filter(w => w.isAlive).length;
    const hasQuorum = aliveCount >= this.quorumThreshold;

    let decision: 'FAVOR_REGION_A' | 'FAVOR_REGION_B' | 'SPLIT_NO_QUORUM' | 'UNDECIDED' = 'UNDECIDED';
    let decisionReason = '';

    if (!hasQuorum) {
      decision = 'SPLIT_NO_QUORUM';
      decisionReason = `Quorum LOST: Only ${aliveCount} of 3 witnesses online (Threshold: ${this.quorumThreshold}). Cluster fails closed.`;
    } else if (votesForA >= this.quorumThreshold) {
      decision = 'FAVOR_REGION_A';
      decisionReason = `Quorum ACHIEVED for Region A (${votesForA}/${this.witnesses.length} votes). Region A authorized for active primary role.`;
    } else if (votesForB >= this.quorumThreshold) {
      decision = 'FAVOR_REGION_B';
      decisionReason = `Quorum ACHIEVED for Region B (${votesForB}/${this.witnesses.length} votes). Region B authorized for active primary role.`;
    } else {
      decision = 'SPLIT_NO_QUORUM';
      decisionReason = `Split Quorum: Votes are fragmented (A: ${votesForA}, B: ${votesForB}, Abstain: ${abstentions}). No majority reached.`;
    }

    return {
      witnesses: this.witnesses.map(w => ({ ...w })),
      quorumThreshold: this.quorumThreshold,
      votesForA,
      votesForB,
      abstentions,
      hasQuorum,
      decision,
      decisionReason,
    };
  }

  public evaluateVotes(params: {
    simTime: number;
    regionAHealthy: boolean;
    regionBHealthy: boolean;
    regionADbHealthy: boolean;
    regionBDbHealthy: boolean;
    isNetworkPartitioned: boolean;
    failedWitnessIds: string[];
    witnessConnectivity: { [witnessId: string]: boolean };
  }): QuorumState {
    const {
      simTime,
      regionAHealthy,
      regionBHealthy,
      regionADbHealthy,
      regionBDbHealthy,
      isNetworkPartitioned,
      failedWitnessIds,
      witnessConnectivity,
    } = params;

    for (const witness of this.witnesses) {
      // 1. Is the witness node itself alive and connected?
      const isFailed = failedWitnessIds.includes(witness.id);
      const isConnected = witnessConnectivity[witness.id] !== false;

      if (isFailed || !isConnected) {
        witness.isAlive = false;
        witness.vote = 'ABSTAIN';
        witness.lastVoteReason = isFailed
          ? 'Witness node offline / crashed.'
          : 'Witness isolated due to network link failure.';
        witness.heartbeatLatencyMs = 999;
        continue;
      }

      witness.isAlive = true;
      witness.heartbeatLatencyMs = Math.floor(8 + Math.random() * 12);

      // 2. Witness probe evaluation
      if (isNetworkPartitioned) {
        // In a partition, witness 1 & 2 are grouped near Region B or A
        if (witness.id === 'witness-1') {
          // Witness 1 can only reach Region B during partition
          if (regionBHealthy && regionBDbHealthy) {
            witness.vote = 'region-b';
            witness.lastVoteReason = 'Partition detected: Region A unreachable; Region B healthy and responsive.';
          } else {
            witness.vote = 'ABSTAIN';
            witness.lastVoteReason = 'Partition detected: Reachable region B is degraded.';
          }
        } else if (witness.id === 'witness-2') {
          // Witness 2 is isolated or in minority partition
          witness.vote = 'ABSTAIN';
          witness.lastVoteReason = 'Partition detected: Flapping or isolated from majority partition.';
        } else {
          // Witness 3 is neutral edge
          if (regionBHealthy && regionBDbHealthy) {
            witness.vote = 'region-b';
            witness.lastVoteReason = 'Edge probe confirmed Region A dropped traffic; routing to Region B.';
          } else {
            witness.vote = 'ABSTAIN';
            witness.lastVoteReason = 'Edge probe sees neither region fully healthy.';
          }
        }
      } else {
        // Normal non-partitioned evaluation
        const aFullyHealthy = regionAHealthy && regionADbHealthy;
        const bFullyHealthy = regionBHealthy && regionBDbHealthy;

        if (aFullyHealthy) {
          witness.vote = 'region-a';
          witness.lastVoteReason = 'Primary Region A verified healthy (App & Database heartbeats OK).';
        } else if (bFullyHealthy) {
          witness.vote = 'region-b';
          witness.lastVoteReason = !regionAHealthy
            ? 'Region A Application failed. Recommending failover to healthy Region B.'
            : 'Region A Database crashed. Recommending failover to healthy replica in Region B.';
        } else {
          witness.vote = 'ABSTAIN';
          witness.lastVoteReason = 'Both regions are reporting critical errors. Abstaining from voting.';
        }
      }
    }

    const state = this.getState();

    // Log decision transitions
    if (state.decision !== this.lastQuorumDecision) {
      const prev = this.lastQuorumDecision;
      this.lastQuorumDecision = state.decision;

      this.logger.log({
        simulationTime: simTime,
        eventType: state.decision === 'SPLIT_NO_QUORUM' ? 'QUORUM_LOST' : 'QUORUM_REACHED',
        severity: state.decision === 'SPLIT_NO_QUORUM' ? 'ERROR' : 'INFO',
        component: 'QuorumManager',
        description: state.decisionReason,
        previousState: prev,
        newState: state.decision,
        decisionReason: `Votes tally -> Region A: ${state.votesForA}, Region B: ${state.votesForB}, Abstain: ${state.abstentions}`,
      });
    }

    return state;
  }

  public reset(): void {
    for (const w of this.witnesses) {
      w.isAlive = true;
      w.vote = 'region-a';
      w.lastVoteReason = 'Initialized. Primary Region A verified healthy.';
      w.heartbeatLatencyMs = 15;
    }
    this.lastQuorumDecision = 'FAVOR_REGION_A';
  }
}
