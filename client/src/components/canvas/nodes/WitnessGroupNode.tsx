import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Radio } from 'lucide-react';
import { WitnessNode } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';

interface WitnessGroupNodeProps {
  data: {
    witnesses: WitnessNode[];
    hasQuorum: boolean;
    decision: string;
    threshold: number;
  };
}

export const WitnessGroupNode: React.FC<WitnessGroupNodeProps> = ({ data }) => {
  return (
    <div className="bg-navy-900 border-2 border-emerald-500/80 rounded-xl p-3 shadow-xl shadow-emerald-500/10 min-w-[280px] text-slate-100">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-teal-500 border-2 border-navy-950"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-950 border border-emerald-700 text-emerald-400 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Quorum / Witness Plane</div>
            <div className="text-[10px] text-slate-400 font-mono">3 Independent Observers</div>
          </div>
        </div>
        <StatusBadge status={data.hasQuorum ? 'MAJORITY' : 'NO QUORUM'} size="sm" />
      </div>

      {/* Witnesses List */}
      <div className="space-y-1.5 text-[10.5px] font-mono">
        {data.witnesses.map((w, idx) => (
          <div
            key={w.id}
            className="flex items-center justify-between bg-navy-950 p-1.5 rounded border border-slate-800"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${w.isAlive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="truncate text-slate-300">W{idx + 1} ({w.name.split(' ')[0]})</span>
            </div>
            <span className="font-bold text-slate-100 uppercase bg-slate-800/80 px-1 rounded">
              {String(w.vote)}
            </span>
          </div>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-emerald-500 border-2 border-navy-950"
      />
    </div>
  );
};
