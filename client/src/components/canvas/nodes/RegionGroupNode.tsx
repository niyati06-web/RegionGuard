import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server, Database, Activity, Lock, ShieldCheck, Flame, Radio } from 'lucide-react';
import { RegionState } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';

interface RegionGroupNodeProps {
  data: {
    region: RegionState;
    dbRole: string;
    dbStatus: string;
    isPrimaryWriter: boolean;
    isFenced: boolean;
    replicationLag: number;
    unreplicatedTxCount: number;
    hasLease: boolean;
    side: 'left' | 'right';
  };
}

export const RegionGroupNode: React.FC<RegionGroupNodeProps> = ({ data }) => {
  const { region, dbRole, dbStatus, isPrimaryWriter, isFenced, replicationLag, unreplicatedTxCount, hasLease, side } = data;

  const isFailed = region.status === 'FAILED';
  const borderColor = isFenced
    ? 'border-zinc-600'
    : isFailed
    ? 'border-rose-600'
    : isPrimaryWriter
    ? 'border-blue-500'
    : 'border-purple-500';

  return (
    <div
      className={`bg-navy-900/95 border-2 ${borderColor} rounded-2xl p-4 shadow-2xl min-w-[320px] text-slate-100 transition-colors`}
    >
      {/* Top Handle for Inbound DNS Traffic */}
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3.5 h-3.5 ${side === 'left' ? 'bg-blue-500' : 'bg-purple-500'} border-2 border-navy-950`}
      />

      {/* Region Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-100">{region.name}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
              isPrimaryWriter ? 'bg-blue-950 text-blue-300 border border-blue-700' : 'bg-purple-950 text-purple-300 border border-purple-700'
            }`}>
              {region.role}
            </span>
          </div>
          <div className="text-[10.5px] text-slate-400 font-mono">{region.location}</div>
        </div>
        <StatusBadge status={region.status} size="sm" />
      </div>

      {/* Inner Sub-Components Grid */}
      <div className="space-y-2.5">
        {/* Tier 1: Application Web Service */}
        <div className="bg-navy-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className={`w-4 h-4 ${region.appStatus === 'HEALTHY' ? 'text-blue-400' : 'text-rose-400'}`} />
            <div>
              <div className="font-semibold text-xs text-slate-200">App Web Cluster</div>
              <div className="text-[10px] text-slate-400 font-mono">{region.requestsPerSecond} req/s inbound</div>
            </div>
          </div>
          <StatusBadge status={region.appStatus} size="sm" />
        </div>

        {/* Tier 2: Database Tier */}
        <div className="bg-navy-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${isPrimaryWriter ? 'text-emerald-400' : 'text-blue-400'}`} />
              <span className="font-semibold text-xs text-slate-200">
                {isPrimaryWriter ? 'Primary Database (Writer)' : 'Read Replica (Standby)'}
              </span>
            </div>
            <StatusBadge status={dbStatus} size="sm" />
          </div>

          <div className="flex justify-between items-center text-[10.5px] font-mono text-slate-400 pt-0.5">
            <span>{isPrimaryWriter ? 'Replication pipeline:' : 'Replica lag:'}</span>
            <span className={replicationLag > 500 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
              {isPrimaryWriter ? 'Transmitting' : `${replicationLag} ms lag`}
            </span>
          </div>
        </div>

        {/* Tier 3: Health Monitor & Lease Status */}
        <div className="bg-navy-950/80 p-2 rounded-lg border border-slate-800 grid grid-cols-2 gap-2 text-[10.5px] font-mono">
          <div>
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <Activity className="w-3 h-3 text-teal-400" />
              <span>Probe Misses:</span>
            </div>
            <div className={`font-bold mt-0.5 ${region.consecutiveFailedChecks > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {region.consecutiveFailedChecks} / 3 checks
            </div>
          </div>

          <div>
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <Lock className="w-3 h-3 text-purple-400" />
              <span>Write Lease:</span>
            </div>
            <div className={`font-bold mt-0.5 ${hasLease ? 'text-emerald-400' : isFenced ? 'text-zinc-400' : 'text-slate-400'}`}>
              {isFenced ? 'FENCED' : hasLease ? 'VALID LEASE' : 'NO LEASE'}
            </div>
          </div>
        </div>
      </div>

      {/* Side Handle for Replication Link */}
      <Handle
        id={side === 'left' ? 'db-rep-out' : 'db-rep-in'}
        type={side === 'left' ? 'source' : 'target'}
        position={side === 'left' ? Position.Right : Position.Left}
        style={{ top: '65%' }}
        className="w-3.5 h-3.5 bg-amber-500 border-2 border-navy-950"
      />

      {/* Bottom Handle for Health Probes & Quorum/Fencing Control */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3.5 h-3.5 bg-teal-500 border-2 border-navy-950"
      />
    </div>
  );
};
