import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { MetricSnapshot } from '../../types';
import * as api from '../../services/api';

interface MetricsChartsProps {
  simulationTime: number;
}

export const MetricsCharts: React.FC<MetricsChartsProps> = ({ simulationTime }) => {
  const [data, setData] = useState<MetricSnapshot[]>([]);

  useEffect(() => {
    api.fetchMetrics(60).then(setData).catch(console.error);
  }, [simulationTime]);

  const formattedData = data.map((d) => ({
    time: `t=${d.simulationTime}s`,
    regionAHealth: d.regionAHealth,
    regionBHealth: d.regionBHealth,
    dnsA: d.dnsTrafficA,
    dnsB: d.dnsTrafficB,
    lag: d.replicationLagMs,
    accepted: d.acceptedWrites,
    rejected: d.rejectedWrites,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full p-2 text-xs">
      {/* Chart 1: Regional Health Availability */}
      <div className="bg-navy-950 p-3 rounded-lg border border-slate-800 flex flex-col">
        <span className="font-semibold text-slate-300 text-[11px] mb-2 uppercase tracking-wider">
          Regional Availability (%)
        </span>
        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1527', borderColor: '#334155' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="regionAHealth" name="Region A" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="regionBHealth" name="Region B" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Global DNS Traffic Distribution */}
      <div className="bg-navy-950 p-3 rounded-lg border border-slate-800 flex flex-col">
        <span className="font-semibold text-slate-300 text-[11px] mb-2 uppercase tracking-wider">
          DNS Traffic Migration (%)
        </span>
        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1527', borderColor: '#334155' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="dnsA" name="Traffic to Region A" stackId="1" stroke="#3b82f6" fill="#1e3a8a" />
              <Area type="monotone" dataKey="dnsB" name="Traffic to Region B" stackId="1" stroke="#a855f7" fill="#581c87" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Database Replication Lag */}
      <div className="bg-navy-950 p-3 rounded-lg border border-slate-800 flex flex-col">
        <span className="font-semibold text-slate-300 text-[11px] mb-2 uppercase tracking-wider">
          Database Replication Lag (ms)
        </span>
        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1527', borderColor: '#334155' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="lag" name="Replication Lag (ms)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
