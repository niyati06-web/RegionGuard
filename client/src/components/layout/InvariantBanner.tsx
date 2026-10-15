import React from 'react';
import { ShieldCheck, ShieldAlert, WifiOff, Lock, Zap } from 'lucide-react';
import { SplitBrainGuardState } from '../../types';

interface InvariantBannerProps {
  splitBrainGuard?: SplitBrainGuardState;
  isConnected: boolean;
  simulationTime: number;
}

export const InvariantBanner: React.FC<InvariantBannerProps> = ({
  splitBrainGuard,
  isConnected,
  simulationTime,
}) => {
  if (!isConnected) {
    return (
      <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 font-semibold">
          <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>BACKEND DISCONNECTED — LIVE SOCKET RECONNECTING... (Data is not fabricated)</span>
        </div>
        <div className="text-rose-400">Targeting http://localhost:4000</div>
      </div>
    );
  }

  const isSatisfied = splitBrainGuard ? splitBrainGuard.invariantSatisfied : true;
  const activeWriters = splitBrainGuard?.activeWriterCount ?? 1;
  const currentLeader = splitBrainGuard?.currentLeaseHolder?.toUpperCase() || 'NONE';
  const epoch = splitBrainGuard?.leadershipEpoch ?? 1;
  const fencingToken = splitBrainGuard?.fencingToken ?? 100;
  const blockedAttempts = splitBrainGuard?.splitBrainAttemptsPreventedCount ?? 0;

  return (
    <div className={`border-b text-xs px-4 py-2 flex items-center justify-between transition-colors ${
      isSatisfied
        ? 'bg-navy-900 border-slate-800/80 text-slate-200'
        : 'bg-rose-950 border-rose-700 text-rose-100 animate-pulse'
    }`}>
      {/* Primary Invariant Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-wide">
          {isSatisfied ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-slate-300">SAFETY INVARIANT:</span>
          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
            isSatisfied ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-900 text-rose-100 border border-rose-600'
          }`}>
            ACTIVE WRITERS: {activeWriters} (0 OR 1 — NEVER 2)
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-slate-400">
          <span>&bull;</span>
          <span>Authorized Writer:</span>
          <span className="font-mono font-semibold text-emerald-400">{currentLeader}</span>
        </div>
      </div>

      {/* Distributed Consensus Tokens */}
      <div className="flex items-center gap-4 font-mono text-[11px]">
        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Epoch:</span>
          <span className="text-blue-300 font-bold">{epoch}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>Fencing Token:</span>
          <span className="text-purple-300 font-bold">{fencingToken}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
          <span className="text-slate-400">Split-Brains Blocked:</span>
          <span className="text-amber-400 font-bold">{blockedAttempts}</span>
        </div>

        <div className="text-slate-400">
          Sim Clock: <span className="text-slate-100 font-bold">t={simulationTime}s</span>
        </div>
      </div>
    </div>
  );
};
