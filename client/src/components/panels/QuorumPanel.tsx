import React from 'react';
import { Users, CheckCircle2, XCircle, AlertOctagon, HelpCircle } from 'lucide-react';
import { QuorumState } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface QuorumPanelProps {
  quorum: QuorumState;
}

export const QuorumPanel: React.FC<QuorumPanelProps> = ({ quorum }) => {
  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-y-auto">
      {/* Quorum Summary Banner */}
      <div className={`p-3 rounded-lg border flex items-center justify-between ${
        quorum.hasQuorum
          ? 'bg-navy-950 border-slate-800 text-slate-200'
          : 'bg-rose-950/80 border-rose-800 text-rose-200 animate-pulse'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${quorum.hasQuorum ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-rose-900 text-rose-200'}`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Quorum Status:</span>
              <StatusBadge status={quorum.hasQuorum ? 'HEALTHY' : 'FAILED'} size="sm" />
              <span className="font-mono text-xs text-slate-300">
                (Votes: A={quorum.votesForA}, B={quorum.votesForB}, Abstain={quorum.abstentions} &bull; Threshold: {quorum.quorumThreshold}/3)
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">{quorum.decisionReason}</p>
          </div>
        </div>
      </div>

      {/* Witnesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {quorum.witnesses.map((w, idx) => {
          const isVotingA = w.vote === 'region-a' || (w.vote as string) === 'REGION_A';
          const isVotingB = w.vote === 'region-b' || (w.vote as string) === 'REGION_B';

          return (
            <div key={w.id} className="bg-navy-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs">Witness #{idx + 1}</span>
                <StatusBadge status={w.isAlive ? 'ONLINE' : 'FAILED'} size="sm" />
              </div>

              <div className="text-slate-300 font-semibold text-xs">{w.name}</div>
              <div className="text-slate-400 text-[10.5px]">{w.location}</div>

              <div className="bg-navy-900 p-2 rounded border border-slate-800 text-[11px] font-mono space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Current Vote:</span>
                  <span className={`font-bold ${isVotingA ? 'text-blue-400' : isVotingB ? 'text-purple-400' : 'text-slate-400'}`}>
                    {String(w.vote).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Ping Latency:</span>
                  <span className="text-slate-200">{w.heartbeatLatencyMs} ms</span>
                </div>
              </div>

              <div className="text-[10.5px] text-slate-400 italic bg-navy-900/60 p-2 rounded border border-slate-800/80">
                "{w.lastVoteReason}"
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
