import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldCheck, ShieldAlert, Lock, Zap } from 'lucide-react';
import { StatusBadge } from '../../common/StatusBadge';

interface SplitBrainNodeProps {
  data: {
    invariantSatisfied: boolean;
    activeWriterCount: number;
    currentLeader: string | null;
    epoch: number;
    fencingToken: number;
    blockedCount: number;
    fencedRegions: string[];
  };
}

export const SplitBrainNode: React.FC<SplitBrainNodeProps> = ({ data }) => {
  return (
    <div className={`bg-navy-900 border-2 ${
      data.invariantSatisfied ? 'border-amber-500/80 shadow-amber-500/10' : 'border-rose-500 shadow-rose-500/20'
    } rounded-xl p-3 shadow-xl min-w-[270px] text-slate-100`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500 border-2 border-navy-950"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-950 border border-amber-700 text-amber-400 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Split-Brain Guard</div>
            <div className="text-[10px] text-slate-400 font-mono">Single-Writer Enforcement</div>
          </div>
        </div>
        <StatusBadge status={data.invariantSatisfied ? '0 OR 1 WRITER' : 'VIOLATION'} size="sm" />
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between items-center text-slate-400">
          <span>Leadership Epoch:</span>
          <span className="text-blue-400 font-bold">#{data.epoch}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Fencing Token:</span>
          <span className="text-purple-400 font-bold">{data.fencingToken}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Prevented Split-Brains:</span>
          <span className="text-emerald-400 font-bold">{data.blockedCount}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-amber-500 border-2 border-navy-950"
      />
    </div>
  );
};
