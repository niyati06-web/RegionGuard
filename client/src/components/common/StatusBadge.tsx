import React from 'react';
import { ComponentHealth, DatabaseRole, FailoverState } from '../../types';

interface StatusBadgeProps {
  status: ComponentHealth | DatabaseRole | FailoverState | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', showDot = true }) => {
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let dot = 'bg-slate-400';

  const s = String(status).toUpperCase();

  if (s === 'HEALTHY' || s === 'PRIMARY' || s === 'PRIMARY_ACTIVE' || s === 'SECONDARY_ACTIVE' || s === 'SUCCESS' || s === 'ONLINE') {
    bg = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
    dot = 'bg-emerald-400 animate-pulse';
  } else if (s === 'DEGRADED' || s === 'PRIMARY_SUSPECTED' || s === 'FAILOVER_EVALUATION' || s === 'LAGGING' || s === 'WARN') {
    bg = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
    dot = 'bg-amber-400 animate-pulse';
  } else if (s === 'FAILED' || s.includes('DEGRADED_NO') || s === 'CRITICAL' || s === 'ERROR' || s === 'DISCONNECTED') {
    bg = 'bg-rose-950/80 text-rose-300 border-rose-800/80';
    dot = 'bg-rose-400 animate-pulse';
  } else if (s === 'RECOVERING' || s.includes('FAILBACK') || s === 'DNS_UPDATING' || s === 'PROMOTION_AUTHORIZED' || s === 'SECONDARY_PROMOTED') {
    bg = 'bg-purple-950/80 text-purple-300 border-purple-800/80';
    dot = 'bg-purple-400 animate-pulse';
  } else if (s === 'FENCED') {
    bg = 'bg-zinc-900 text-zinc-400 border-zinc-700';
    dot = 'bg-zinc-500';
  } else if (s === 'STANDBY') {
    bg = 'bg-blue-950/80 text-blue-300 border-blue-800/80';
    dot = 'bg-blue-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-medium',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono ${sizeClasses[size]} ${bg}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      <span>{status}</span>
    </span>
  );
};
