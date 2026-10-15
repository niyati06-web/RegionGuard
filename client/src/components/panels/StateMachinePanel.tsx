import React from 'react';
import { GitCommit, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { FailoverState } from '../../types';

interface StateMachinePanelProps {
  currentState: FailoverState;
  transitionReason: string;
}

const ALL_STATES: { state: FailoverState; label: string; desc: string; type: 'normal' | 'failover' | 'failback' | 'degraded' }[] = [
  { state: 'PRIMARY_ACTIVE', label: '1. PRIMARY ACTIVE', desc: 'Region A active writer, Region B standby', type: 'normal' },
  { state: 'PRIMARY_SUSPECTED', label: '2. PRIMARY SUSPECTED', desc: 'Missed 2 consecutive probes', type: 'failover' },
  { state: 'FAILOVER_EVALUATION', label: '3. FAILOVER EVALUATION', desc: '3 missed checks; testing secondary readiness', type: 'failover' },
  { state: 'QUORUM_CHECK', label: '4. QUORUM CHECK', desc: 'Polling 3 independent witness nodes', type: 'failover' },
  { state: 'FENCING_OLD_PRIMARY', label: '5. FENCING OLD PRIMARY', desc: 'Revoking write capabilities on Region A', type: 'failover' },
  { state: 'PROMOTION_AUTHORIZED', label: '6. PROMOTION AUTHORIZED', desc: 'New leadership epoch and fencing token granted', type: 'failover' },
  { state: 'SECONDARY_PROMOTED', label: '7. SECONDARY PROMOTED', desc: 'Region B DB & App promoted to writer role', type: 'failover' },
  { state: 'DNS_UPDATING', label: '8. DNS UPDATING', desc: 'Redirecting A-record with TTL countdown', type: 'failover' },
  { state: 'SECONDARY_ACTIVE', label: '9. SECONDARY ACTIVE', desc: 'Failover complete; 100% traffic on Region B', type: 'normal' },
  { state: 'RECOVERY_DETECTED', label: '10. RECOVERY DETECTED', desc: 'Region A health checks stabilized', type: 'failback' },
  { state: 'FAILBACK_EVALUATION', label: '11. FAILBACK EVALUATION', desc: 'Validating replica catch-up', type: 'failback' },
  { state: 'FAILBACK_IN_PROGRESS', label: '12. FAILBACK IN PROGRESS', desc: 'Fencing Region B & authorizing Region A', type: 'failback' },
  { state: 'PRIMARY_RESTORED', label: '13. PRIMARY RESTORED', desc: 'Region A active again', type: 'normal' },
  { state: 'DEGRADED_NO_QUORUM', label: 'SAFETY: NO QUORUM', desc: 'Witness majority lost; failing closed', type: 'degraded' },
  { state: 'DEGRADED_NO_SAFE_WRITER', label: 'SAFETY: NO SAFE WRITER', desc: 'Replica lag too high or both regions down', type: 'degraded' },
];

export const StateMachinePanel: React.FC<StateMachinePanelProps> = ({
  currentState,
  transitionReason,
}) => {
  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-y-auto">
      {/* Current State Indicator */}
      <div className="p-3 bg-navy-950 rounded-lg border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-300 uppercase text-[11px]">Current Active State:</span>
          <span className="font-mono font-bold text-emerald-300 text-sm bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
            {currentState}
          </span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono">
          Reason: <span className="text-slate-200">{transitionReason}</span>
        </div>
      </div>

      {/* State Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {ALL_STATES.map((s) => {
          const isActive = s.state === currentState;
          let border = 'border-slate-800/80 bg-navy-950/70 text-slate-400';

          if (isActive) {
            border = s.type === 'degraded'
              ? 'border-rose-500 bg-rose-950 text-rose-200 shadow-lg shadow-rose-950/50 animate-pulse'
              : 'border-emerald-500 bg-emerald-950 text-emerald-200 shadow-lg shadow-emerald-950/50 animate-pulse';
          } else if (s.type === 'degraded') {
            border = 'border-rose-900/40 bg-navy-950 text-rose-400/80';
          }

          return (
            <div
              key={s.state}
              className={`p-2.5 rounded-lg border transition ${border} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[10.5px] tracking-tight">{s.label}</span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[10px] leading-snug opacity-90">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
