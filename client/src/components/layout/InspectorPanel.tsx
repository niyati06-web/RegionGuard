import React, { useState } from 'react';
import {
  Server,
  Database,
  Globe,
  Users,
  ShieldAlert,
  Radio,
  Sliders,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { PromotionPolicy, SimulationState } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import * as api from '../../services/api';

interface InspectorPanelProps {
  selectedNodeId: string | null;
  state: SimulationState | null;
  onClose: () => void;
  onRefreshState: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNodeId,
  state,
  onClose,
  onRefreshState,
}) => {
  const [ttlInput, setTtlInput] = useState<number>(5);
  const [policyInput, setPolicyInput] = useState<PromotionPolicy>('SAFETY_FIRST');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!selectedNodeId || !state) {
    return null;
  }

  const handleUpdateDns = async () => {
    try {
      await api.updateDnsConfig({ ttlSeconds: Number(ttlInput) });
      setSaveMessage('DNS TTL updated successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
      onRefreshState();
    } catch (e: any) {
      setSaveMessage(`Error: ${e.message}`);
    }
  };

  const handleUpdatePolicy = async (newPolicy: PromotionPolicy) => {
    try {
      setPolicyInput(newPolicy);
      await api.updatePromotionPolicy(newPolicy);
      setSaveMessage(`Promotion policy set to ${newPolicy}`);
      setTimeout(() => setSaveMessage(null), 3000);
      onRefreshState();
    } catch (e: any) {
      setSaveMessage(`Error: ${e.message}`);
    }
  };

  return (
    <div className="w-84 h-full bg-navy-900 border-l border-slate-800 flex flex-col shrink-0 text-xs overflow-hidden select-none">
      {/* Inspector Header */}
      <div className="p-3 bg-navy-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
            Component Inspector
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {saveMessage && (
          <div className="p-2 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded font-mono text-[11px]">
            {saveMessage}
          </div>
        )}

        {/* 1. DNS ROUTER INSPECTION */}
        {selectedNodeId === 'router-dns' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>DNS Traffic Router</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Global traffic routing layer simulating AWS Route 53 / Anycast DNS failover policies.
            </p>

            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">DNS Record:</span>
                <span className="font-mono font-bold text-slate-200">{state.dns.recordName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Routing Target:</span>
                <StatusBadge status={state.dns.currentRecordTarget.toUpperCase()} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">TTL (Time-To-Live):</span>
                <span className="font-mono text-emerald-400 font-bold">{state.dns.dnsTtlSeconds} seconds</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Propagation Progress:</span>
                <span className="font-mono text-blue-400 font-bold">{state.dns.propagationProgressPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Traffic Migration:</span>
                <span className="font-mono text-slate-200">
                  A: {state.dns.clientTrafficDistribution.regionA}% &bull; B: {state.dns.clientTrafficDistribution.regionB}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Provider Scaffold:</span>
                <span className="font-mono text-slate-300 text-[10px]">{state.dns.providerType.toUpperCase()}</span>
              </div>
            </div>

            {/* Config Controls */}
            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                Adjust DNS TTL
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={ttlInput}
                  onChange={(e) => setTtlInput(Number(e.target.value))}
                  className="w-20 bg-navy-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                />
                <button
                  onClick={handleUpdateDns}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 rounded transition text-xs"
                >
                  Apply TTL
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400">
                Lower TTL reduces failover delay but increases DNS query traffic. Higher TTL prolongs client caching.
              </p>
            </div>
          </div>
        )}

        {/* 2. REGION A INSPECTION */}
        {selectedNodeId === 'region-a' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <Server className="w-4 h-4 text-blue-400" />
                <span>Region A (US-East)</span>
              </div>
              <StatusBadge status={state.regions['region-a'].status} size="sm" />
            </div>

            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role:</span>
                <span className="font-mono font-bold text-slate-200">{state.regions['region-a'].role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">App Web Tier:</span>
                <StatusBadge status={state.regions['region-a'].appStatus} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database Tier:</span>
                <StatusBadge status={state.regions['region-a'].dbStatus} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Consecutive Failed Probes:</span>
                <span className={`font-mono font-bold ${state.regions['region-a'].consecutiveFailedChecks > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {state.regions['region-a'].consecutiveFailedChecks}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Availability:</span>
                <span className="font-mono text-emerald-400 font-bold">{state.regions['region-a'].availabilityPercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Inbound RPS:</span>
                <span className="font-mono text-slate-200">{state.regions['region-a'].requestsPerSecond} req/s</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. REGION B INSPECTION */}
        {selectedNodeId === 'region-b' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <Server className="w-4 h-4 text-purple-400" />
                <span>Region B (US-West)</span>
              </div>
              <StatusBadge status={state.regions['region-b'].status} size="sm" />
            </div>

            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role:</span>
                <span className="font-mono font-bold text-slate-200">{state.regions['region-b'].role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">App Web Tier:</span>
                <StatusBadge status={state.regions['region-b'].appStatus} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database Tier:</span>
                <StatusBadge status={state.regions['region-b'].dbStatus} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Consecutive Failed Probes:</span>
                <span className={`font-mono font-bold ${state.regions['region-b'].consecutiveFailedChecks > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {state.regions['region-b'].consecutiveFailedChecks}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Availability:</span>
                <span className="font-mono text-emerald-400 font-bold">{state.regions['region-b'].availabilityPercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Inbound RPS:</span>
                <span className="font-mono text-slate-200">{state.regions['region-b'].requestsPerSecond} req/s</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. DATABASE REPLICATION INSPECTION */}
        {selectedNodeId === 'database-plane' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Cross-Region Database</span>
              </div>
              <StatusBadge status={state.database.replicationStatus} size="sm" />
            </div>

            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Primary Writer:</span>
                <span className="font-mono font-bold text-emerald-400">{state.database.activeWriter?.toUpperCase() || 'NONE'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Read Replica:</span>
                <span className="font-mono font-bold text-blue-400">{state.database.readReplica?.toUpperCase() || 'NONE'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Replication Lag:</span>
                <span className={`font-mono font-bold ${state.database.replicationLagMs > 500 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {state.database.replicationLagMs} ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Replication Queue Backlog:</span>
                <span className="font-mono text-slate-200">{state.database.replicationQueueSize} tx</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Data-Loss Exposure:</span>
                <span className={`font-mono font-bold ${state.database.dataLossExposureCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {state.database.dataLossExposureCount} transactions
                </span>
              </div>
            </div>

            {/* Promotion Policy Selector */}
            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                Promotion Consistency Policy
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdatePolicy('SAFETY_FIRST')}
                  className={`py-1.5 px-2 rounded border font-semibold text-center transition ${
                    state.database.promotionPolicy === 'SAFETY_FIRST'
                      ? 'bg-blue-900/60 border-blue-500 text-blue-200'
                      : 'bg-navy-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Safety-First
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdatePolicy('AVAILABILITY_FIRST')}
                  className={`py-1.5 px-2 rounded border font-semibold text-center transition ${
                    state.database.promotionPolicy === 'AVAILABILITY_FIRST'
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                      : 'bg-navy-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Availability-First
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                <strong>Safety-First:</strong> Blocks failover if replica lag is high (avoids data loss).<br />
                <strong>Availability-First:</strong> Promotes immediately and tracks potential lost transactions.
              </p>
            </div>
          </div>
        )}

        {/* 5. SPLIT-BRAIN GUARD INSPECTION */}
        {selectedNodeId === 'split-brain-plane' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Split-Brain Prevention Agent</span>
              </div>
              <StatusBadge status={state.splitBrainGuard.invariantSatisfied ? 'HEALTHY' : 'CRITICAL'} size="sm" />
            </div>

            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Writers:</span>
                <span className="font-mono font-bold text-emerald-400">{state.splitBrainGuard.activeWriterCount} (Max: 1)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Lease Holder:</span>
                <span className="font-mono font-bold text-slate-200">{state.splitBrainGuard.currentLeaseHolder?.toUpperCase() || 'NONE'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Leadership Epoch:</span>
                <span className="font-mono font-bold text-blue-400">{state.splitBrainGuard.leadershipEpoch}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fencing Token:</span>
                <span className="font-mono font-bold text-purple-400">{state.splitBrainGuard.fencingToken}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fenced Regions:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {state.splitBrainGuard.fencedRegions.length > 0
                    ? state.splitBrainGuard.fencedRegions.join(', ').toUpperCase()
                    : 'None'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Split-Brains Prevented:</span>
                <span className="font-mono font-bold text-amber-400">{state.splitBrainGuard.splitBrainAttemptsPreventedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Stale Writes Blocked:</span>
                <span className="font-mono font-bold text-rose-400">{state.splitBrainGuard.staleWritesBlockedCount}</span>
              </div>
            </div>

            {state.splitBrainGuard.lastBlockedReason && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded text-[11px] font-mono text-rose-300">
                <div className="font-bold text-rose-200 mb-1">Last Blocked Unsafe Action:</div>
                <div>{state.splitBrainGuard.lastBlockedReason}</div>
              </div>
            )}
          </div>
        )}

        {/* 6. QUORUM INSPECTION */}
        {selectedNodeId === 'quorum-plane' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Quorum & Witness Nodes</span>
              </div>
              <StatusBadge status={state.quorum.decision} size="sm" />
            </div>

            <div className="bg-navy-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Threshold:</span>
                <span className="font-mono font-bold text-slate-200">{state.quorum.quorumThreshold} of 3 Majority</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Votes for Region A:</span>
                <span className="font-mono font-bold text-blue-400">{state.quorum.votesForA}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Votes for Region B:</span>
                <span className="font-mono font-bold text-purple-400">{state.quorum.votesForB}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Abstentions / Offline:</span>
                <span className="font-mono font-bold text-rose-400">{state.quorum.abstentions}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                Independent Witnesses
              </span>
              {state.quorum.witnesses.map((w) => (
                <div key={w.id} className="bg-navy-850 p-2.5 rounded border border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-200">{w.name}</span>
                    <StatusBadge status={w.isAlive ? 'ONLINE' : 'FAILED'} size="sm" />
                  </div>
                  <div className="text-slate-400 text-[10.5px]">{w.location}</div>
                  <div className="flex justify-between items-center font-mono text-[10.5px]">
                    <span className="text-slate-400">Vote: <strong className="text-emerald-400">{String(w.vote).toUpperCase()}</strong></span>
                    <span className="text-slate-400">{w.heartbeatLatencyMs}ms ping</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">"{w.lastVoteReason}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
