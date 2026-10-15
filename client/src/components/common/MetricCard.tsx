import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral' | 'good' | 'bad';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, trend, icon }) => {
  let valueColor = 'text-slate-100';
  if (trend === 'good') valueColor = 'text-emerald-400';
  if (trend === 'bad') valueColor = 'text-rose-400';

  return (
    <div className="bg-navy-900/90 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition shadow-sm">
      <div className="flex items-center justify-between text-slate-400 mb-1">
        <span className="text-xs font-semibold tracking-wider uppercase">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className={`text-xl font-bold font-mono ${valueColor}`}>{value}</div>
      {subtext && <div className="text-[11px] text-slate-400 mt-1 truncate">{subtext}</div>}
    </div>
  );
};
