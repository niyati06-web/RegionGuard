import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, GitBranch, RefreshCw } from 'lucide-react';
import { FailoverState } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';

interface ControllerNodeProps {
  data: {
    currentState: FailoverState;
    transitionReason: string;
    failoverCount: number;
    durationMs: number | null;
  };
}

export const ControllerNode: React.FC<ControllerNodeProps> = ({ data }) => {
  return (
    <div className="bg-navy-900 border-2 border-purple-500/80 rounded-xl p-3 shadow-xl shadow-purple-500/10 min-w-[260px] text-slate-100">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-emerald-500 border-2 border-navy-950"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-950 border border-purple-700 text-purple-400 rounded-lg">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Failover Controller</div>
            <div className="text-[10px] text-slate-400 font-mono">15-State Machine</div>
          </div>
        </div>
        <StatusBadge status={data.currentState} size="sm" />
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between items-center text-slate-400">
          <span>Failovers Executed:</span>
          <span className="text-slate-100 font-bold">{data.failoverCount}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Last Duration:</span>
          <span className="text-emerald-400 font-bold">
            {data.durationMs ? `${data.durationMs} ms` : 'N/A'}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 italic truncate" title={data.transitionReason}>
          {data.transitionReason}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500 border-2 border-navy-950"
      />
    </div>
  );
};
