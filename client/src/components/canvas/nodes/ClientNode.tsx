import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Globe } from 'lucide-react';

interface ClientNodeProps {
  data: {
    label: string;
    rps: number;
    effectiveTarget: string;
  };
}

export const ClientNode: React.FC<ClientNodeProps> = ({ data }) => {
  return (
    <div className="bg-navy-900 border-2 border-blue-500/80 rounded-xl p-3 shadow-xl shadow-blue-500/10 min-w-[200px] text-slate-100">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-950 border border-blue-700 text-blue-400 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs">Global Clients</span>
        </div>
        <span className="text-[10px] bg-blue-950 border border-blue-800 text-blue-300 font-mono px-1.5 py-0.5 rounded">
          ANYCAST
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px]">
        <div className="flex justify-between items-center text-slate-400">
          <span>Traffic Volume:</span>
          <span className="text-slate-100 font-bold">{data.rps} req/s</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Target Region:</span>
          <span className="text-emerald-400 font-bold uppercase">{data.effectiveTarget}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-navy-950"
      />
    </div>
  );
};
