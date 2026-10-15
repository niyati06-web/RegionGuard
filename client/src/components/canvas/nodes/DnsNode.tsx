import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, Clock, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../../common/StatusBadge';

interface DnsNodeProps {
  data: {
    recordName: string;
    target: string;
    ttl: number;
    isPropagating: boolean;
    provider: string;
    trafficA: number;
    trafficB: number;
  };
}

export const DnsNode: React.FC<DnsNodeProps> = ({ data }) => {
  return (
    <div className="bg-navy-900 border-2 border-teal-500/80 rounded-xl p-3 shadow-xl shadow-teal-500/10 min-w-[240px] text-slate-100">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-navy-950"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-950 border border-teal-700 text-teal-400 rounded-lg">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">DNS / Traffic Router</div>
            <div className="text-[10px] text-slate-400 font-mono">{data.recordName}</div>
          </div>
        </div>
        <StatusBadge status={data.target.toUpperCase()} size="sm" />
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between items-center text-slate-400">
          <span>TTL Window:</span>
          <span className="text-emerald-400 font-bold">{data.ttl}s</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Traffic Split:</span>
          <span className="text-slate-200">
            A: <strong className="text-blue-400">{data.trafficA}%</strong> | B: <strong className="text-purple-400">{data.trafficB}%</strong>
          </span>
        </div>
        {data.isPropagating && (
          <div className="text-[10px] text-amber-400 flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" />
            <span>Resolver caches expiring...</span>
          </div>
        )}
      </div>

      {/* Outgoing to Region A (Bottom Left) */}
      <Handle
        id="dns-to-a"
        type="source"
        position={Position.Bottom}
        style={{ left: '25%' }}
        className="w-3 h-3 bg-blue-500 border-2 border-navy-950"
      />

      {/* Outgoing to Region B (Bottom Right) */}
      <Handle
        id="dns-to-b"
        type="source"
        position={Position.Bottom}
        style={{ left: '75%' }}
        className="w-3 h-3 bg-purple-500 border-2 border-navy-950"
      />
    </div>
  );
};
