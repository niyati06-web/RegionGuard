import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const CanvasLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div className="absolute top-4 right-4 z-10 bg-navy-900/90 border border-slate-800 backdrop-blur rounded-lg shadow-xl text-xs select-none max-w-xs transition">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 flex items-center justify-between text-slate-300 font-semibold hover:text-white"
      >
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] uppercase tracking-wider">Canvas Architecture Legend</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="p-3 pt-0 border-t border-slate-800/80 space-y-2.5 text-[10.5px]">
          {/* Status colors */}
          <div>
            <div className="font-semibold text-slate-400 uppercase tracking-wide mb-1 text-[10px]">
              Component Statuses
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Healthy / Primary</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-slate-300">Standby Replica</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-300">Degraded / Lagging</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-300">Failed / Outage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-slate-300">Recovering / Cutover</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-slate-300">Fenced (Isolated)</span>
              </div>
            </div>
          </div>

          {/* Connection types */}
          <div>
            <div className="font-semibold text-slate-400 uppercase tracking-wide mb-1 text-[10px]">
              Connection Signals
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-blue-500 inline-block" />
                <span className="text-slate-300">Ingress DNS Route (Clients &rarr; App)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-amber-500 inline-block border-b border-dashed border-amber-300" />
                <span className="text-slate-300">Database Async Replication (Cross-Region)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-teal-500 inline-block" />
                <span className="text-slate-300">Health Probes & Quorum Voting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-purple-500 inline-block" />
                <span className="text-slate-300">Failover Control & Fencing Tokens</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
