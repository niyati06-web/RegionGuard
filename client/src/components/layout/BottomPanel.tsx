import React, { useState } from 'react';
import {
  LineChart,
  ListFilter,
  Database,
  Users,
  Globe,
  GitCommit,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { SimulationEvent, SimulationState } from '../../types';
import { MetricsCharts } from '../panels/MetricsCharts';
import { EventTimeline } from '../panels/EventTimeline';
import { DatabaseReplicationPanel } from '../panels/DatabaseReplicationPanel';
import { QuorumPanel } from '../panels/QuorumPanel';
import { DnsPanel } from '../panels/DnsPanel';
import { StateMachinePanel } from '../panels/StateMachinePanel';

interface BottomPanelProps {
  state: SimulationState | null;
  events: SimulationEvent[];
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ state, events }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'events' | 'database' | 'quorum' | 'dns' | 'states'>('metrics');

  if (!state) return null;

  return (
    <div
      className={`bg-navy-900 border-t border-slate-800 transition-all duration-200 flex flex-col shrink-0 select-none ${
        isCollapsed ? 'h-9' : 'h-72'
      }`}
    >
      {/* Tab Navigation Header */}
      <div className="h-9 bg-navy-950 border-b border-slate-800 flex items-center justify-between px-3 text-xs font-semibold">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setActiveTab('metrics'); setIsCollapsed(false); }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'metrics' && !isCollapsed
                ? 'bg-navy-850 text-blue-400 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Live Metrics</span>
          </button>

          <button
            onClick={() => { setActiveTab('events'); setIsCollapsed(false); }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'events' && !isCollapsed
                ? 'bg-navy-850 text-emerald-400 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Event Audit Log</span>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 rounded-full font-mono">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('database'); setIsCollapsed(false); }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'database' && !isCollapsed
                ? 'bg-navy-850 text-amber-400 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Replication</span>
            {state.database.replicationQueueSize > 0 && (
              <span className="bg-amber-950 text-amber-300 text-[10px] px-1.5 rounded-full font-mono border border-amber-800">
                {state.database.replicationQueueSize}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('quorum'); setIsCollapsed(false); }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'quorum' && !isCollapsed
                ? 'bg-navy-850 text-purple-400 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Quorum Decisions</span>
          </button>

          <button
            onClick={() => { setActiveTab('dns'); setIsCollapsed(false); }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'dns' && !isCollapsed
                ? 'bg-navy-850 text-teal-400 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>DNS & TTL</span>
          </button>

          <button
            onClick={() => { setActiveTab('states'); setIsCollapsed(false); }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'states' && !isCollapsed
                ? 'bg-navy-850 text-slate-200 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>State Machine</span>
          </button>
        </div>

        {/* Collapse / Expand Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition"
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Tab Body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden bg-navy-900">
          {activeTab === 'metrics' && <MetricsCharts simulationTime={state.simulationTime} />}
          {activeTab === 'events' && <EventTimeline events={events} />}
          {activeTab === 'database' && <DatabaseReplicationPanel database={state.database} />}
          {activeTab === 'quorum' && <QuorumPanel quorum={state.quorum} />}
          {activeTab === 'dns' && <DnsPanel dns={state.dns} />}
          {activeTab === 'states' && (
            <StateMachinePanel
              currentState={state.failover.currentState}
              transitionReason={state.failover.transitionReason}
            />
          )}
        </div>
      )}
    </div>
  );
};
