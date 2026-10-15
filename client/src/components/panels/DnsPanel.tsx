import React from 'react';
import { Globe, ArrowRight, ShieldCheck, Clock, Zap } from 'lucide-react';
import { DnsState } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface DnsPanelProps {
  dns: DnsState;
}

export const DnsPanel: React.FC<DnsPanelProps> = ({ dns }) => {
  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-y-auto">
      {/* Route 53 Banner */}
      <div className="bg-navy-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950 border border-blue-800 text-blue-400 rounded-lg">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">Global DNS Route Target:</span>
              <StatusBadge status={dns.currentRecordTarget.toUpperCase()} size="sm" />
              <span className="font-mono text-slate-300 text-xs">({dns.recordName})</span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Provider Scaffold: <strong className="text-slate-300 uppercase">{dns.providerType}</strong> &bull; TTL: <strong className="text-emerald-400">{dns.dnsTtlSeconds}s</strong> &bull; Propagation Delay: <strong className="text-blue-400">{dns.propagationDelaySeconds}s</strong>
            </p>
          </div>
        </div>

        {dns.isPropagating && (
          <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-800 text-amber-300 px-3 py-1 rounded text-xs font-mono font-semibold animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>PROPAGATING CACHES ({dns.propagationProgressPercent}%)</span>
          </div>
        )}
      </div>

      {/* Traffic Migration Progress Bar */}
      <div className="bg-navy-950 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-blue-400 font-mono">Region A (US-East): {dns.clientTrafficDistribution.regionA}%</span>
          <span className="text-slate-400 uppercase text-[10.5px]">Client Resolver Cache Distribution</span>
          <span className="text-purple-400 font-mono">Region B (US-West): {dns.clientTrafficDistribution.regionB}%</span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-3 flex overflow-hidden border border-slate-800">
          <div
            className="bg-blue-600 transition-all duration-500"
            style={{ width: `${dns.clientTrafficDistribution.regionA}%` }}
          />
          <div
            className="bg-purple-600 transition-all duration-500"
            style={{ width: `${dns.clientTrafficDistribution.regionB}%` }}
          />
        </div>
      </div>

      {/* Endpoints Mappings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-navy-950 p-3 rounded border border-slate-800 space-y-1.5 font-mono">
          <div className="text-slate-400 text-[10.5px] uppercase font-semibold">Primary Endpoint Target</div>
          <div className="font-bold text-blue-300 text-xs">{dns.endpoints['region-a']}</div>
          <div className="text-[10px] text-slate-400">AWS US-East-1 Ingress Application Load Balancer</div>
        </div>

        <div className="bg-navy-950 p-3 rounded border border-slate-800 space-y-1.5 font-mono">
          <div className="text-slate-400 text-[10.5px] uppercase font-semibold">Secondary Endpoint Target</div>
          <div className="font-bold text-purple-300 text-xs">{dns.endpoints['region-b']}</div>
          <div className="text-[10px] text-slate-400">AWS US-West-2 Ingress Application Load Balancer</div>
        </div>
      </div>
    </div>
  );
};
