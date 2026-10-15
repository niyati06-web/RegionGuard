import React, { useState } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import { SimulationEvent } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { getExportCsvUrl, getExportJsonUrl } from '../../services/api';

interface EventTimelineProps {
  events: SimulationEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = events.filter((e) => {
    if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.component.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Filter and Export Toolbar */}
      <div className="p-2.5 bg-navy-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-navy-900 border border-slate-700 rounded pl-8 pr-3 py-1 text-slate-200 placeholder-slate-500 text-xs w-48"
            />
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-navy-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getExportJsonUrl()}
            target="_blank"
            rel="noreferrer"
            download
            className="flex items-center gap-1 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded transition text-[11px] font-semibold"
          >
            <Download className="w-3 h-3 text-blue-400" />
            <span>Export JSON</span>
          </a>
          <a
            href={getExportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            download
            className="flex items-center gap-1 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded transition text-[11px] font-semibold"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Events Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left font-mono text-[11px]">
          <thead className="bg-navy-950/90 text-slate-400 sticky top-0 border-b border-slate-800">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Severity</th>
              <th className="py-2 px-3">Component</th>
              <th className="py-2 px-3">Event Type</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Decision Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                  No matching events logged yet.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-navy-850/50 transition">
                  <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap">t={evt.simulationTime}s</td>
                  <td className="py-1.5 px-3">
                    <StatusBadge status={evt.severity} size="sm" />
                  </td>
                  <td className="py-1.5 px-3 font-semibold text-slate-200 whitespace-nowrap">{evt.component}</td>
                  <td className="py-1.5 px-3 text-blue-400 whitespace-nowrap">{evt.eventType}</td>
                  <td className="py-1.5 px-3 text-slate-200 font-sans">{evt.description}</td>
                  <td className="py-1.5 px-3 text-slate-400 font-sans text-[10.5px]">
                    {evt.decisionReason || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
